import * as Core from "./script.js";

window.toggleDarkMode = () => {
    const d = document.body.classList.toggle('dark-mode');
    localStorage.setItem('dark-mode', d);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.innerText = d ? '☀️' : '🌙';
};

window.toggleVoice = () => {
    Core.audioConfig.lang = Core.audioConfig.lang === 'en-US' ? 'en-GB' : 'en-US';
    localStorage.setItem('audio-lang', Core.audioConfig.lang);
    window.syncAudioButtons();
};

window.toggleSpeed = () => {
    Core.audioConfig.rate = Core.audioConfig.rate === 1.0 ? 0.5 : 1.0;
    localStorage.setItem('audio-rate', Core.audioConfig.rate);
    window.syncAudioButtons();
};

window.syncAudioButtons = () => {
    const vBtn = document.getElementById('voice-btn');
    const sBtn = document.getElementById('speed-btn');
    if (vBtn) vBtn.innerText = Core.audioConfig.lang === 'en-US' ? 'US' : 'UK';
    if (sBtn) sBtn.innerText = Core.audioConfig.rate.toFixed(1) + 'x';
};

window.speakWord = (t) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = Core.audioConfig.lang;
    u.rate = Core.audioConfig.rate;
    window.speechSynthesis.speak(u);
};

window.toggleFlip = () => document.getElementById('fc')?.classList.toggle('flipped');

window.handleEnter = (e) => { if (e.key === "Enter") Core.verify(); };

window.showSelectionModal = (id) => {
    Core.currentLessonId = id;
    const container = document.getElementById('selection-options');
    container.innerHTML = '';
    const lesson = Core.LESSONS_DATABASE[id];
    for (let i = 5; i <= lesson.num; i += 5) {
        const btn = document.createElement('div');
        btn.className = 'btn-option';
        btn.innerText = `${i} từ`;
        btn.onclick = () => window.initSession(i);
        container.appendChild(btn);
    }
    document.getElementById('selection-modal').classList.remove('hidden');
};

window.initSession = (count) => {
    document.getElementById('selection-modal').classList.add('hidden');
    const words = [...Core.LESSONS_DATABASE[Core.currentLessonId].words];
    const scores = Core.currentUserData.procab_scores[Core.currentLessonId] || {};
    let mapped = words.map((w, idx) => ({ ...w, originalIndex: idx, mistakes: scores[idx] || 0 }));
    mapped.sort((a, b) => b.mistakes - a.mistakes || Math.random() - 0.5);
    Core.sessionWords.length = 0;
    mapped.slice(0, count).forEach((item, index) => {
        Core.sessionWords.push({ ...item, type: 'normal' });
        if ((index + 1) % 5 === 0 && (index + 1) < count) Core.sessionWords.push({ type: 'special' });
    });
    Core.currentIdx = 0;
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-lesson').classList.remove('hidden');
    Core.renderFlashcard();
};

window.backToDashboard = () => {
    document.getElementById('view-lesson').classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');
    Core.updateDashboard();
};

window.closeSelectionModal = () => document.getElementById('selection-modal').classList.add('hidden');
window.openConfirmModal = () => document.getElementById('confirm-modal').classList.remove('hidden');
window.closeConfirmModal = () => document.getElementById('confirm-modal').classList.add('hidden');

document.getElementById('exit-btn')?.addEventListener('click', () => {
    window.closeConfirmModal();
    window.backToDashboard();
});
