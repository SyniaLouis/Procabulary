import { 
    audioConfig, 
    backToDashboard, 
    verify, 
    renderFlashcard, 
    currentLessonId, 
    LESSONS_DATABASE, 
    currentUserData, 
    sessionWords, 
    currentIdx,
    updateDashboard
} from "./script.js";

window.toggleDarkMode = () => {
    const d = document.body.classList.toggle('dark-mode');
    localStorage.setItem('dark-mode', d);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.innerText = d ? '☀️' : '🌙';
};

window.toggleVoice = () => {
    audioConfig.lang = audioConfig.lang === 'en-US' ? 'en-GB' : 'en-US';
    localStorage.setItem('audio-lang', audioConfig.lang);
    window.syncAudioButtons();
};

window.toggleSpeed = () => {
    audioConfig.rate = audioConfig.rate === 1.0 ? 0.5 : 1.0;
    localStorage.setItem('audio-rate', audioConfig.rate);
    window.syncAudioButtons();
};

window.syncAudioButtons = () => {
    const vBtn = document.getElementById('voice-btn');
    const sBtn = document.getElementById('speed-btn');
    if (vBtn) vBtn.innerText = audioConfig.lang === 'en-US' ? 'US' : 'UK';
    if (sBtn) sBtn.innerText = audioConfig.rate.toFixed(1) + 'x';
};

window.speakWord = (t) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = audioConfig.lang;
    u.rate = audioConfig.rate;
    window.speechSynthesis.speak(u);
};

window.toggleFlip = () => document.getElementById('fc')?.classList.toggle('flipped');

window.handleEnter = (e) => { if (e.key === "Enter") verify(); };

window.showSelectionModal = (id) => {
    // Lưu ID bài học trực tiếp vào script.js thông qua tham chiếu
    const container = document.getElementById('selection-options');
    container.innerHTML = '';
    const lesson = LESSONS_DATABASE[id];
    for (let i = 5; i <= lesson.num; i += 5) {
        const btn = document.createElement('div');
        btn.className = 'btn-option';
        btn.innerText = `${i} từ`;
        btn.onclick = () => window.initSession(id, i);
        container.appendChild(btn);
    }
    document.getElementById('selection-modal').classList.remove('hidden');
};

window.initSession = (id, count) => {

    document.getElementById('selection-modal').classList.add('hidden');

    window.currentLessonId_Setter(id); 
    
    const words = [...LESSONS_DATABASE[id].words];
    const scores = currentUserData.procab_scores[id] || {};
    let mapped = words.map((w, idx) => ({ ...w, originalIndex: idx, mistakes: scores[idx] || 0 }));
    mapped.sort((a, b) => b.mistakes - a.mistakes || Math.random() - 0.5);
    
    sessionWords.length = 0;
    mapped.slice(0, count).forEach((item, index) => {
        sessionWords.push({ ...item, type: 'normal' });
        if ((index + 1) % 5 === 0 && (index + 1) < count) sessionWords.push({ type: 'special' });
    });
    
    window.currentIdx_Setter(0);
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-lesson').classList.remove('hidden');
    renderFlashcard();
};

window.currentLessonId_Setter = (val) => { };

window.backToDashboard = backToDashboard;
window.closeSelectionModal = () => document.getElementById('selection-modal').classList.add('hidden');
window.openConfirmModal = () => document.getElementById('confirm-modal').classList.remove('hidden');
window.closeConfirmModal = () => document.getElementById('confirm-modal').classList.add('hidden');

document.getElementById('exit-btn')?.addEventListener('click', () => {
    window.closeConfirmModal();
    window.backToDashboard();
});
