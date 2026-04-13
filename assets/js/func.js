import { State, renderFlashcard, verify, updateDashboard, backToDashboard } from "./script.js";
import { saveCustomLesson, deleteCustomLesson } from "./procab.js";
let targetIdToDelete = null;

window.toggleFlip = () => {
    const fc = document.getElementById('fc'); 
    if (!fc) return;

    fc.classList.toggle('flipped');
    
    if (fc.classList.contains('flipped')) {
        setTimeout(() => {
            const input = document.getElementById('fc-input');
            if (input) {
                input.value = "";
                input.focus();
            }
        }, 300); 
    }
};

window.handleEnter = (e) => {
    if (e.key === 'Enter') {
        const fc = document.getElementById('fc');
        if (fc && fc.classList.contains('flipped')) {
            verify();
        }
    }
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

    const lessonScores = State.currentUserData.procab_scores[State.currentLessonId] || {};

    const scoredWords = lesson.words.map(w => ({
        ...w,
        mistakes: lessonScores[w.originalIndex] || 0
    }));

    const sortedWords = scoredWords.sort((a, b) => b.mistakes - a.mistakes);

    let pool = sortedWords.slice(0, count);
    
    pool = pool.sort(() => Math.random() - 0.5);

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
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => v.lang === State.audioConfig.lang) || 
                        voices.find(v => v.lang.startsWith('en'));
    if (selectedVoice) {
        msg.voice = selectedVoice;
    }
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
    const speeds = [0.8, 1.0, 1.2, 1.5];
    let currentIdx = speeds.indexOf(State.audioConfig.rate);
    let nextIdx = (currentIdx + 1) % speeds.length;
    let nextSpeed = speeds[nextIdx];

    State.audioConfig.rate = nextSpeed;
    localStorage.setItem('audio-rate', nextSpeed);

    const btn = document.getElementById('speed-btn');
    if (btn) btn.innerText = nextSpeed + 'x';
};

window.toggleVoice = () => {
    const voices = [
        { lang: 'en-US', label: 'US' },
        { lang: 'en-GB', label: 'UK' },
        { lang: 'en-AU', label: 'AU' }
    ];
    let currentIdx = voices.findIndex(v => v.lang === State.audioConfig.lang);
    let nextIdx = (currentIdx + 1) % voices.length;
    let nextVoice = voices[nextIdx];

    State.audioConfig.lang = nextVoice.lang;
    localStorage.setItem('audio-lang', nextVoice.lang);

    const btn = document.getElementById('voice-btn');
    if (btn) btn.innerText = nextVoice.label;
};

window.closeConfirmModal = () => {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    const exitBtn = document.getElementById('exit-btn');
    if (exitBtn) {
        exitBtn.onclick = () => {
            window.backToDashboard(); 
            window.closeConfirmModal();
        };
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const fc = document.getElementById('fc');
        const viewLesson = document.getElementById('view-lesson');
        const isLessonActive = viewLesson && !viewLesson.classList.contains('hidden');
        if (isLessonActive && fc && !fc.classList.contains('flipped')) {
            window.toggleFlip();
        }
    }
});

window.openCreateModal = () => {
    const m = document.getElementById('modal-create-lesson');
    if(m) m.style.display = 'flex';
};

window.closeCreateModal = () => {
    const m = document.getElementById('modal-create-lesson');
    if(m) m.style.display = 'none';
};

window.saveNewLesson = async () => {
    const titleInput = document.getElementById('custom-title');
    const dataInput = document.getElementById('custom-data');
    const errorDiv = document.getElementById('create-error'); 
    
    if (!titleInput || !dataInput || !errorDiv) return;

    const title = titleInput.value.trim();
    const rawData = dataInput.value.replace(/[\n\r]+/g, ',').trim();

    const showError = (message) => {
        errorDiv.innerText = message;
        setTimeout(() => { errorDiv.innerText = ""; }, 2000); 
    };

    if (!title || !rawData) {
        showError("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    const parts = rawData.split(',').map(p => p.trim()).filter(p => p !== "");
    const words = [];
    for (let i = 0; i < parts.length; i += 3) {
        if (parts[i] && parts[i+1] && parts[i+2]) {
            words.push({ 
                word: parts[i], 
                ipa: parts[i+1], 
                meaning: parts[i+2], 
                originalIndex: words.length 
            });
        }
    }

    if (words.length === 0) {
        showError("Định dạng dữ liệu không hợp lệ (Cần: Từ, IPA, Nghĩa)!");
        return;
    }
    if (words.length > 50) {
        showError("Mỗi bộ từ chỉ được tối đa 50 từ!");
        return;
    }

    try {
        await saveCustomLesson({ title, words, num: words.length, isCustom: true});
        titleInput.value = "";
        dataInput.value = "";
        window.closeCreateModal();
        location.reload(); 
    } catch (error) {
        showError("Lỗi hệ thống, vui lòng thử lại sau!");
        console.error(error);
    }
};

window.handleDeleteLesson = async (e, id) => {
    e.stopPropagation();
   targetIdToDelete = id;
    const modal = document.getElementById('delete-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeDeleteModal = () => {
    const modal = document.getElementById('delete-modal');
    if (modal) modal.style.display = 'none';
    targetIdToDelete = null;
};
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirm-delete-btn');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            if (targetIdToDelete) {
                try {
                    await deleteCustomLesson(targetIdToDelete);
                    location.reload();
                } catch (error) {
                    console.error("Error deleting lesson:", error);
                }
            }
        };
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const fc = document.getElementById('fc');
        const viewLesson = document.getElementById('view-lesson');
        const isLessonActive = viewLesson && !viewLesson.classList.contains('hidden');

        if (isLessonActive && fc && !fc.classList.contains('flipped')) {
            window.toggleFlip();
            e.preventDefault(); 
            e.stopPropagation();
        }
    }
});
