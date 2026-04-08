import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { SHEET_CSV_URL, ENCOURAGEMENTS, SOFT_COLORS } from "./dtb.js";
import { findLongestErrorSegment } from "./smafed.js";
import { updateProcabScore } from "./procab.js";
import { speakWord } from "./func.js";

export let currentUserData = { procab_scores: {}, cumulative_progress: {} };
export let LESSONS_DATABASE = {};
export let sessionWords = [];
export let currentLessonId = "";
export let currentIdx = 0;
export let attemptsPerWord = 0;

export let audioConfig = {
    lang: localStorage.getItem('audio-lang') || 'en-US',
    rate: parseFloat(localStorage.getItem('audio-rate')) || 1.0
};

// 1. Firebase Auth Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) currentUserData = docSnap.data();
        else await setDoc(userRef, currentUserData);
        updateUIForUser(user);
        updateDashboard();
    } else if (!['/index.html', '/'].includes(window.location.pathname)) {
        window.location.href = '/index.html';
    }
});

function updateUIForUser(user) {
    const userSlot = document.getElementById('user-profile-slot');
    if (userSlot) userSlot.innerHTML = `<img src="${user.photoURL}" style="border-radius:50%; width:32px; border:2px solid #fff;">`;
}

// 2. Fetch & Render Logic
window.addEventListener('load', async () => {
    if (localStorage.getItem('dark-mode') === 'true') document.body.classList.add('dark-mode');
    syncAudioButtons();
    await fetchFlashcardsFromSheets();
    updateDashboard();
});

async function fetchFlashcardsFromSheets() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = parseCSV(csvText);
        LESSONS_DATABASE = {};
        rows.slice(1).forEach(cols => {
            if (cols.length >= 4) {
                const id = cols[0];
                if (window.CATEGORY_FILTER && window.CATEGORY_FILTER !== (cols[4] || '').trim()) return;
                const vocabParts = cols[2].split(',');
                const wordsArray = [];
                for (let i = 0; i < vocabParts.length; i += 3) {
                    if (vocabParts[i] && vocabParts[i+1] && vocabParts[i+2]) {
                        wordsArray.push({ word: vocabParts[i].trim(), ipa: vocabParts[i+1].trim(), meaning: vocabParts[i+2].trim() });
                    }
                }
                LESSONS_DATABASE[id] = { title: cols[1], words: wordsArray, num: parseInt(cols[3]) };
            }
        });
    } catch (e) { console.error(e); }
}

function parseCSV(text) {
    const rows = []; let currentRow = []; let currentCell = ''; let insideQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"' && insideQuotes && text[i+1] === '"') { currentCell += '"'; i++; }
        else if (char === '"') insideQuotes = !insideQuotes;
        else if (char === ',' && !insideQuotes) { currentRow.push(currentCell.trim()); currentCell = ''; }
        else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (currentRow.length > 0 || currentCell !== '') { currentRow.push(currentCell.trim()); rows.push(currentRow); currentRow = []; currentCell = ''; }
        } else currentCell += char;
    }
    if (currentRow.length > 0 || currentCell !== '') { currentRow.push(currentCell.trim()); rows.push(currentRow); }
    return rows;
}

export function updateDashboard() {
    const titleEl = document.getElementById('dynamic-title');
    if (titleEl) titleEl.innerText = window.CATEGORY_FILTER ? `Từ vựng ${window.CATEGORY_FILTER}` : "Hệ thống thẻ ghi nhớ";
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const progressData = currentUserData.cumulative_progress || {};
    Object.keys(LESSONS_DATABASE).forEach(id => {
        const data = LESSONS_DATABASE[id];
        const currentCount = progressData[id] || 0;
        const targetCount = data.num * 5;
        const percent = Math.min(Math.floor((currentCount / targetCount) * 100), 100);
        const card = document.createElement('div');
        card.className = `lesson-card ${percent >= 100 ? 'done' : ''}`;
        card.onclick = () => showSelectionModal(id);
        card.innerHTML = `<h3>${data.title}</h3><div class="progress-text">${currentCount}/${targetCount}</div>
            <div class="progress-container"><div class="progress-fill" style="width:${percent}%"></div></div>`;
        grid.appendChild(card);
    });
}

export function showSelectionModal(id) {
    currentLessonId = id;
    const container = document.getElementById('selection-options');
    container.innerHTML = '';
    for (let i = 5; i <= LESSONS_DATABASE[id].num; i += 5) {
        const btn = document.createElement('div'); btn.className = 'btn-option'; btn.innerText = `${i} từ`;
        btn.onclick = () => initSession(i); container.appendChild(btn);
    }
    document.getElementById('selection-modal').classList.remove('hidden');
}

export function initSession(count) {
    document.getElementById('selection-modal').classList.add('hidden');
    const allWords = [...LESSONS_DATABASE[currentLessonId].words];
    const lessonScores = currentUserData.procab_scores[currentLessonId] || {};
    let wordsWithScores = allWords.map((word, idx) => ({ ...word, originalIndex: idx, mistakes: lessonScores[idx] || 0 }));
    wordsWithScores.sort((a, b) => b.mistakes - a.mistakes || Math.random() - 0.5);
    const selected = wordsWithScores.slice(0, count);
    sessionWords = [];
    selected.forEach((item, index) => {
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
        const quote = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
        const color = SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
        container.innerHTML = `<div class="flashcard special-card"><div class="card-face" style="background:${color}">${quote}</div></div>`;
        setTimeout(() => { currentIdx++; if (currentIdx < sessionWords.length) renderFlashcard(); else finish(); }, 2500);
    } else {
        container.innerHTML = `<div class="flashcard" id="fc" onclick="toggleFlip()">
            <div class="flashcard-inner">
                <div class="card-face"><div class="word-text">${item.word}</div><div class="ipa-text">/${item.ipa}/</div></div>
                <div class="card-face card-back" onclick="event.stopPropagation()">
                    <p>${item.meaning}</p>
                    <input type="text" id="fc-input" placeholder="Gõ từ..." onkeydown="handleEnter(event)" autocomplete="off">
                    <div id="fc-error" style="color:#ff7675; font-size:0.8rem; margin-top:8px; font-weight:bold;"></div>
                </div>
            </div>
        </div>`;
        speakWord(item.word);
        setTimeout(() => document.getElementById('fc-input')?.focus(), 300);
    }
}

function verify() {
    const inputEl = document.getElementById('fc-input');
    const correct = sessionWords[currentIdx].word.toLowerCase();
    const inputVal = inputEl.value.trim().toLowerCase();
    if (inputVal === correct) {
        updateProcabScore(true, currentLessonId, sessionWords[currentIdx].originalIndex, currentUserData);
        currentIdx++;
        if (currentIdx < sessionWords.length) renderFlashcard(); else finish();
    } else {
        attemptsPerWord++;
        updateProcabScore(false, currentLessonId, sessionWords[currentIdx].originalIndex, currentUserData);
        inputEl.style.borderColor = "var(--error)";
        let segment = findLongestErrorSegment(correct, inputVal);
        document.getElementById('fc-error').innerText = attemptsPerWord >= 2 ? `Gợi ý: Chú ý chữ "${segment.toUpperCase()}"` : "Chưa chính xác!";
        setTimeout(() => {
            inputEl.style.borderColor = "var(--border)";
            document.getElementById('fc').classList.remove('flipped');
            inputEl.value = "";
            speakWord(sessionWords[currentIdx].word);
        }, 1500);
    }
}

async function finish() {
    const wordsInSession = sessionWords.filter(w => w.type === 'normal').length;
    let score = currentUserData.cumulative
