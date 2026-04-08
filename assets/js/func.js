import { audioConfig, syncAudioButtons, backToDashboard, verify, toggleFlip, initSession, showSelectionModal, closeSelectionModal, openConfirmModal, closeConfirmModal, handleEnter } from "./script.js";

// 1. Điều khiển âm thanh và giọng đọc
export function toggleVoice() {
    audioConfig.lang = audioConfig.lang === 'en-US' ? 'en-GB' : 'en-US';
    localStorage.setItem('audio-lang', audioConfig.lang);
    syncAudioButtons();
}

export function toggleSpeed() {
    audioConfig.rate = audioConfig.rate === 1.0 ? 0.5 : 1.0;
    localStorage.setItem('audio-rate', audioConfig.rate);
    syncAudioButtons();
}

export function speakWord(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = audioConfig.lang;
    utterance.rate = audioConfig.rate;
    window.speechSynthesis.speak(utterance);
}

// 2. Chế độ tối (Dark Mode)
export function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('dark-mode', isDark);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.innerText = isDark ? '☀️' : '🌙';
}

// 3. Xuất ra window để HTML gọi được (Global Exports)
window.toggleDarkMode = toggleDarkMode;
window.toggleVoice = toggleVoice;
window.toggleSpeed = toggleSpeed;
window.toggleFlip = toggleFlip;
window.backToDashboard = backToDashboard;
window.openConfirmModal = openConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.initSession = initSession;
window.showSelectionModal = showSelectionModal;
window.closeSelectionModal = closeSelectionModal;
window.handleEnter = handleEnter;
