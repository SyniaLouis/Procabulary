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
