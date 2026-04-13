import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { SHEET_CSV_URL, ENCOURAGEMENTS, SOFT_COLORS } from "./dtb.js";
import { getSmartFeedback } from "./smafed.js";
import { updateProcabScore, saveFinalProgress } from "./procab.js";

export const State = {
    currentUserData: { procab_scores: {}, cumulative_progress: {} },
    LESSONS_DATABASE: {},
    sessionWords: [],
    currentLessonId: "",
    currentIdx: 0,
    attemptsPerWord: 0,
    audioConfig: { lang: localStorage.getItem('audio-lang') || 'en-US', rate: parseFloat(localStorage.getItem('audio-rate')) || 1.0 }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) State.currentUserData = docSnap.data();
        updateUIForUser(user);
        updateDashboard();
    } else if (!['/index.html', '/'].includes(window.location.pathname)) {
        window.location.href = '/index.html';
    }
});

function updateUIForUser(user) {
    const avatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    if (avatar) avatar.src = user.photoURL || 'https://via.placeholder.com/35';
    if (userName) userName.innerText = user.displayName;
}

window.addEventListener('load', async () => {
    if (localStorage.getItem('dark-mode') === 'true') document.body.classList.add('dark-mode');
    await fetchFlashcardsFromSheets();
    updateDashboard();
});

async function fetchFlashcardsFromSheets() {
    try {
        const res = await fetch(SHEET_CSV_URL);
        const text = await res.text();
        const rows = parseCSV(text);
        State.LESSONS_DATABASE = {};
        rows.slice(1).forEach(cols => {
            if (cols.length >= 4) {
                if (window.CATEGORY_FILTER && window.CATEGORY_FILTER !== (cols[4] || '').trim()) return;
                const words = [];
                const parts = cols[2].split(',');
                for (let i = 0; i < parts.length; i += 3) {
                    if (parts[i] && parts[i+1] && parts[i+2]) 
                        words.push({ word: parts[i].trim(), ipa: parts[i+1].trim(), meaning: parts[i+2].trim(), originalIndex: i/3 });
                }
                State.LESSONS_DATABASE[cols[0]] = { title: cols[1], words: words, num: parseInt(cols[3]) };
            }
        });
    } catch (e) { console.error("Lỗi fetch dữ liệu:", e); }
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

export function updateDashboard() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const progress = State.currentUserData.cumulative_progress || {};
    Object.keys(State.LESSONS_DATABASE).forEach(id => {
        const d = State.LESSONS_DATABASE[id];
        const count = progress[id] || 0;
        const target = d.num * 5;
        const p = Math.min(Math.floor((count / target) * 100), 100);
        const card = document.createElement('div');
        card.className = `lesson-card ${p >= 100 ? 'done' : ''}`;
        card.onclick = () => window.showSelectionModal(id);
        card.innerHTML = `<h3>${d.title}</h3><div class="progress-text">${count}/${target}</div><div class="progress-container"><div class="progress-fill" style="width:${p}%"></div></div>`;
        grid.appendChild(card);
    });
}

export function renderFlashcard() {
    State.attemptsPerWord = 0;
    const item = State.sessionWords[State.currentIdx];
    const container = document.getElementById('lesson-content');
    
    if (item.type === 'special') {
        const q = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
        const c = SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
        container.innerHTML = `<div class="flashcard special-card"><div class="card-face" style="background:${c}">${q}</div></div>`;
        setTimeout(() => { State.currentIdx++; if (State.currentIdx < State.sessionWords.length) renderFlashcard(); else finish(); }, 2500);
    } else {
        container.innerHTML = `
            <div class="flashcard" id="fc" onclick="window.toggleFlip()">
                <div class="flashcard-inner">
                    <div class="card-face"><div class="word-text">${item.word}</div><div class="ipa-text">/${item.ipa}/</div></div>
                    <div class="card-face card-back" onclick="event.stopPropagation()">
                        <p>${item.meaning}</p>
                        <input type="text" id="fc-input" placeholder="Gõ từ..." onkeydown="window.handleEnter(event)" autocomplete="off">
                        <div id="fc-error" style="margin-top:12px; min-height: 24px;"></div>
                    </div>
                </div>
            </div>`;
        window.speakWord(item.word);
        setTimeout(() => document.getElementById('fc-input')?.focus(), 300);
    }
}

export function verify() {
    const input = document.getElementById('fc-input');
    const errorDiv = document.getElementById('fc-error');
    const target = State.sessionWords[State.currentIdx];
    const correct = target.word.toLowerCase();
    const val = input.value.trim().toLowerCase();

    if (val === correct) {
        updateProcabScore(true, State.currentLessonId, target.originalIndex, State.currentUserData);
        State.currentIdx++;
        if (State.currentIdx < State.sessionWords.length) renderFlashcard(); else finish();
    } else {
        State.attemptsPerWord++;
        updateProcabScore(false, State.currentLessonId, target.originalIndex, State.currentUserData);
        
        input.style.borderColor = "var(--error)";
        const feedback = getSmartFeedback(correct, val);
        
        renderVisualFeedback(feedback.diffMap, errorDiv);

        if (State.attemptsPerWord >= 2) {
            const accuracyInfo = document.createElement('div');
            accuracyInfo.style.cssText = "color: var(--text-muted); font-size: 0.75rem; margin-top: 5px;";
            accuracyInfo.innerText = `Độ chính xác: ${feedback.accuracy}% rồi, cố lên em !`;
            errorDiv.appendChild(accuracyInfo);
        }

        setTimeout(() => {
            input.style.borderColor = "var(--border)";
            document.getElementById('fc').classList.remove('flipped');
            input.value = "";
            window.speakWord(target.word);
        }, 2000);
    }
}

function renderVisualFeedback(diffMap, targetEl) {
    targetEl.innerHTML = '';
    diffMap.forEach(item => {
        const span = document.createElement('span');
        span.className = `diff-char diff-${item.type}`;
        span.innerText = item.char;
        span.setAttribute('data-label', item.label);
        targetEl.appendChild(span);
    });
}

export async function finish() {
    const count = State.sessionWords.filter(w => w.type === 'normal').length;
    await saveFinalProgress(State.currentLessonId, count, State.currentUserData, State.LESSONS_DATABASE);
    document.getElementById('lesson-content').innerHTML = `
        <div style="text-align:center; padding: 40px;">
            <h2 style="font-size: 2rem;">🎉 Hoàn thành!</h2>
            <p>Em đã hoàn thành xuất sắc bài học này.</p>
            <button onclick="window.backToDashboard()" class="back-btn">QUAY LẠI DASHBOARD</button>
        </div>`;
}

export function backToDashboard() {
    document.getElementById('view-lesson').classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');
    updateDashboard();
}
