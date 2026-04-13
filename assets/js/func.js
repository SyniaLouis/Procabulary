import { State, renderFlashcard, verify, updateDashboard, backToDashboard } from "./script.js";

window.toggleFlip = () => {
    const fc = document.getElementById('fc');
    if (fc) fc.classList.toggle('flipped');
};

window.handleEnter = (e) => {
    if (e.key === 'Enter') verify();
};

window.backToDashboard = backToDashboard;

window.showSelectionModal = (lessonId) => {
    State.currentLessonId = lessonId;
    const modal = document.getElementById('modal-selection');
    if (modal) modal.style.display = 'flex';
};

window.closeSelectionModal = () => {
    const modal = document.getElementById('modal-selection');
    if (modal) modal.style.display = 'none';
};

window.startLesson = (count) => {
    const lesson = State.LESSONS_DATABASE[State.currentLessonId];
    if (!lesson) return;

    let pool = [...lesson.words].sort(() => Math.random() - 0.5).slice(0, count);
    
    State.sessionWords = [];
    pool.forEach((w, idx) => {
        State.sessionWords.push({ ...w, type: 'normal' });
        if ((idx + 1) % 5 === 0) State.sessionWords.push({ type: 'special' });
    });

    State.currentIdx = 0;
    window.closeSelectionModal();
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-lesson').classList.remove('hidden');
    renderFlashcard();
};

window.speakWord = (text) => {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = State.audioConfig.lang;
    msg.rate = State.audioConfig.rate;
    window.speechSynthesis.speak(msg);
};

window.handleHomeClick = () => {
    const isLearning = !document.getElementById('view-lesson').classList.contains('hidden');
    
    if (isLearning) {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) confirmModal.style.display = 'flex';
    } else {
        window.location.href = '../index.html';
    }
};
window.toggleDarkMode = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('dark-mode', isDark);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.innerText = isDark ? '☀️' : '🌙';
    }
};

window.toggleSpeed = () => {
    console.log("Tốc độ đọc đã chỉnh!");
};

window.toggleVoice = () => {
    console.log("Giọng đọc đã chỉnh!");
};
window.closeConfirmModal = () => {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) {
        exitBtn.onclick = () => {
            window.location.href = '../index.html';
        };
    }
});
