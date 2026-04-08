import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { SHEET_CSV_URL, ENCOURAGEMENTS, SOFT_COLORS } from "./dtb.js";
import { findLongestErrorSegment } from "./smafed.js";
import { updateProcabScore, saveFinalProgress } from "./procab.js";

let currentUserData = { procab_scores: {}, cumulative_progress: {} };
let LESSONS_DATABASE = {};
let sessionWords = [];
let currentLessonId = "";
let currentIdx = 0;
let attemptsPerWord = 0;
let audioConfig = { lang: localStorage.getItem('audio-lang') || 'en-US', rate: parseFloat(localStorage.getItem('audio-rate')) || 1.0 };

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) currentUserData = docSnap.data();
        updateUIForUser(user);
        updateDashboard();
    } else if (!['/index.html', '/'].includes(window.location.pathname)) {
        window.location.href = '/index.html';
    }
});

function updateUIForUser(user) {
    const slot = document.getElementById('user-profile-slot');
    if (slot) slot.innerHTML = `<img src="${user.photoURL}" style="border-radius:50%; width:32px; border:2px solid #fff;">`;
}

window.addEventListener('load', async () => {
    if (localStorage.getItem('dark-mode') === 'true') document.body.classList.add('dark-mode');
    syncAudioButtons();
    await fetchFlashcardsFromSheets();
    updateDashboard();
});

async function fetchFlashcardsFromSheets() {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        const rows = parseCSV(text);
        LESSONS_DATABASE = {};
        rows.slice(1).forEach(cols => {
            if (cols.length >= 4) {
                if (window.CATEGORY_FILTER && window.CATEGORY_FILTER !== (cols[4] || '').trim()) return;
                const words = [];
                const parts = cols[2].split(',');
                for (let i = 0; i < parts.length; i += 3) {
                    if (parts[i] && parts[i+1] && parts[i+2]) words.push({ word: parts[i].trim(), ipa: parts[i+1].trim(), meaning: parts[i+2].trim() });
                }
                LESSONS_DATABASE[cols[0]] = { title: cols[1], words: words, num: parseInt(cols[3]) };
            }
        });
    } catch (e) { console.error(e); }
}

function parseCSV(t) {
    const r = []; let curR = []; let curC = ''; let q = false;
    for (let i = 0; i < t.length; i++) {
        const c = t[i];
        if (c === '"' && q && t[i+1] === '"') { curC += '"'; i++; }
        else if (c === '"') q = !q;
        else if (c === ',' && !q) { curR.push(curC.trim()); curC = ''; }
        else if ((c === '\n' || c === '\r') && !q) {
            if (curR.length > 0 || curC !== '') { curR.push(curC.trim()); r.push(curR); curR = []; curC = ''; }
        } else curC += c;
    }
    if (curR.length > 0 || curC !== '') { curR.push(curC.trim()); r.push(curR); }
    return r;
}

function updateDashboard() {
    const title = document.getElementById('dynamic-title');
    if (title) title.innerText = window.CATEGORY_FILTER ? `Từ vựng ${window.CATEGORY_FILTER}` : "Hệ thống thẻ ghi nhớ";
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const progress = currentUserData.cumulative_progress || {};
    Object.keys(LESSONS_DATABASE).forEach(id => {
        const d = LESSONS_DATABASE[id];
        const count = progress[id] || 0;
        const target = d.num * 5;
        const p = Math.min(Math.floor((count / target) * 100), 100);
        const card = document.createElement('div');
        card.className = `lesson-card ${p >= 100 ? 'done' : ''}`;
        card.onclick = () => showSelectionModal(id);
        card.innerHTML = `<h3>${d.title}</h3><div class="progress-text">${count}/${target}</div><div class="progress-container"><div class="progress-fill" style="width:${p}%"></div></div>`;
        grid.appendChild(card);
    });
}

function showSelectionModal(id) {
    currentLessonId = id;
    const container = document.getElementById('selection-options');
    container.innerHTML = '';
    for (let i = 5; i <= LESSONS_DATABASE[id].num; i += 5) {
        const btn = document.createElement('div'); btn.className = 'btn-option'; btn.innerText = `${i} từ`;
        btn.onclick = () => initSession(i); container.appendChild(btn);
    }
    document.getElementById('selection-modal').classList.remove('hidden');
}

function initSession(count) {
    document.getElementById('selection-modal').classList.add('hidden');
    const words = [...LESSONS_DATABASE[currentLessonId].words];
    const scores = currentUserData.procab_scores[currentLessonId] || {};
    let mapped = words.map((w, idx) => ({ ...w, originalIndex: idx, mistakes: scores[idx] || 0 }));
    mapped.sort((a, b) => b.mistakes - a.mistakes || Math.random() - 0.5);
    sessionWords = [];
    mapped.slice(0, count).forEach((item, index) => {
        sessionWords.push({ ...item, type: 'normal' });
        if ((index + 1) % 5 === 0 && (index + 1) < count) sessionWords.push({ type: 'special' });
    });
    currentIdx = 0;
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-lesson').classList.remove('hidden');
    renderFlashcard();
}

function renderFlashcard() {
    attemptsPerWord = 0;
    const item = sessionWords[currentIdx];
    const container = document.getElementById('lesson-content');
    if (item.type === 'special') {
        const q = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
        const c = SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
        container.innerHTML = `<div class="flashcard special-card"><div class="card-face" style="background:${c}">${q}</div></div>`;
        setTimeout(() => { currentIdx++; if (currentIdx < sessionWords.length) renderFlashcard(); else finish(); }, 2500);
    } else {
        container.innerHTML = `<div class="flashcard" id="fc" onclick="toggleFlip()"><div class="flashcard-inner">
            <div class="card-face"><div class="word-text">${item.word}</div><div class="ipa-text">/${item.ipa}/</div></div>
            <div class="card-face card-back" onclick="event.stopPropagation()"><p>${item.meaning}</p>
            <input type="text" id="fc-input" placeholder="Gõ từ..." onkeydown="handleEnter(event)" autocomplete="off">
            <div id="fc-error" style="color:#ff7675; font-size:0.8rem; margin-top:8px; font-weight:bold;"></div></div></div></div>`;
        speakWord(item.word);
        setTimeout(() => document.getElementById('fc-input')?.focus(), 300);
    }
}

function verify() {
    const input = document.getElementById('fc-input');
    const correct = sessionWords[currentIdx].word.toLowerCase();
    const val = input.value.trim().toLowerCase();
    if (val === correct) {
        updateProcabScore(true, currentLessonId, sessionWords[currentIdx].originalIndex, currentUserData);
        currentIdx++;
        if (currentIdx < sessionWords.length) renderFlashcard(); else finish();
    } else {
        attemptsPerWord++;
        updateProcabScore(false, currentLessonId, sessionWords[currentIdx].originalIndex, currentUserData);
        input.style.borderColor = "var(--error)";
        let seg = findLongestErrorSegment(correct, val);
        document.getElementById('fc-error').innerText = attemptsPerWord >= 2 ? `Gợi ý: Chú ý chữ "${seg.toUpperCase()}"` : "Chưa chính xác!";
        setTimeout(() => { input.style.borderColor = "var(--border)"; document.getElementById('fc').classList.remove('flipped'); input.value = ""; speakWord(sessionWords[currentIdx].word); }, 1500);
    }
}

async function finish() {
    const count = sessionWords.filter(w => w.type === 'normal').length;
    await saveFinalProgress(currentLessonId, count, currentUserData, LESSONS_DATABASE);
    document.getElementById('lesson-content').innerHTML = `<div style="text-align:center"><h2>🎉 Hoàn thành!</h2><button onclick="backToDashboard()">QUAY LẠI</button></div>`;
}

function syncAudioButtons() {
    if (document.getElementById('voice-btn')) document.getElementById('voice-btn').innerText = audioConfig.lang === 'en-US' ? 'US' : 'UK';
    if (document.getElementById('speed-btn')) document.getElementById('speed-btn').innerText = audioConfig.rate.toFixed(1) + 'x';
}

function speakWord(t) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = audioConfig.lang; u.rate = audioConfig.rate; window.speechSynthesis.speak(u); }

window.toggleDarkMode = () => { const d = document.body.classList.toggle('dark-mode'); localStorage.setItem('dark-mode', d); if (document.getElementById('theme-btn')) document.getElementById('theme-btn').innerText = d ? '☀️' : '🌙'; };
window.toggleVoice = () => { audioConfig.lang = audioConfig.lang === 'en-US' ? 'en-GB' : 'en-US'; localStorage.setItem('audio-lang', audioConfig.lang); syncAudioButtons(); };
window.toggleSpeed = () => { audioConfig.rate = audioConfig.rate === 1.0 ? 0.5 : 1.0; localStorage.setItem('audio-rate', audioConfig.rate); syncAudioButtons(); };
window.toggleFlip = () => document.getElementById('fc')?.classList.toggle('flipped');
window.handleEnter = (e) => { if (e.key === "Enter") verify(); };
window.backToDashboard = () => { document.getElementById('view-lesson').classList.add('hidden'); document.getElementById('view-dashboard').classList.remove('hidden'); updateDashboard(); };
window.closeSelectionModal = () => document.getElementById('selection-modal').classList.add('hidden');
window.openConfirmModal = () => { document.getElementById('confirm-modal').classList.remove('hidden'); document.getElementById('exit-btn').onclick = () => { document.getElementById('confirm-modal').classList.add('hidden'); window.backToDashboard(); }};
window.closeConfirmModal = () => document.getElementById('confirm-modal').classList.add('hidden');
