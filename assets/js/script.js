const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9kQM31fO6UhoRJtlaPR4H8mzk03jekDbsu8Td6T3fQMi7dnVZ3KgY3-B7lMzObcS0QonY8fEi84d1/pub?gid=0&single=true&output=csv';

const ENCOURAGEMENTS = [
    "Mỗi từ vựng mới là một bước gần hơn đến giấc mơ của em. Cố lên nhé! 🧸🍭",
    "Sự kiên trì của em hôm nay chính là chìa khóa thành công ngày mai! 🐱🌈",
    "Em đang làm rất tốt, hãy giữ vững năng lượng tích cực này nha! 🐥💖",
    "Đừng lo lắng về tốc độ, quan trọng là em đã không dừng lại! 🐢💨",
    "Kỹ năng của em đang hoàn thiện hơn sau mỗi thẻ ghi nhớ đấy! 🛠️✨",
    "Em có tư duy ngôn ngữ rất tuyệt vời, tiếp tục phát huy nhé! 🧠🦄",
    "Chinh phục tiếng Anh không khó khi có sự quyết tâm của em! 🎯🧸",
    "Một bước tiến nhỏ mỗi ngày sẽ tạo nên những thay đổi lớn lao! 👣🍀",
    "Sự nỗ lực bền bỉ luôn mang lại thành quả xứng đáng! 🕯️🐰",
    "Hãy tự hào về bản thân vì đã luôn không ngừng học hỏi nhé! 🎖️🐱",
    "Tiếng Anh là cánh cửa, và em đang cầm chiếc chìa khóa trong tay! 🔓🌸",
    "Cách em tập trung học tập thật sự rất chuyên nghiệp và đáng khen! 📋🍡",
    "Chỉ còn vài bước nữa thôi là hoàn thành mục tiêu hôm nay rồi! 🏁🎈",
    "Sự tập trung của em hôm nay chính là sức mạnh lớn nhất! 💪🌈",
    "Hoàn thành xuất sắc! Em xứng đáng nhận điểm 10 cho sự nỗ lực! 💯🧁"
];

const SOFT_COLORS = ['#e8f4fd', '#f0f9eb', '#fff9db', '#fff0f0', '#f3f0ff', '#e6fffb', '#fff2e8'];

let LESSONS_DATABASE = {};
let sessionWords = [];
let currentLessonId = "";
let currentIdx = 0;
let isSpeakingLocked = false;
let attemptsPerWord = 0; 

let audioConfig = {
    lang: localStorage.getItem('audio-lang') || 'en-US',
    rate: parseFloat(localStorage.getItem('audio-rate')) || 1.0
};

window.onload = async () => {
    if (localStorage.getItem('dark-mode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-btn').innerText = '☀️';
    }
    syncAudioButtons();
    await fetchFlashcardsFromSheets();
    updateDashboard();
};

window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (document.activeElement.tagName !== 'INPUT') {
            const fc = document.getElementById('fc');
            if (fc && !fc.classList.contains('hidden')) {
                e.preventDefault();
                toggleFlip();
            }
        }
    }
});

function toggleVoice() {
    audioConfig.lang = (audioConfig.lang === 'en-US') ? 'en-GB' : 'en-US';
    localStorage.setItem('audio-lang', audioConfig.lang);
    syncAudioButtons();
}

function toggleSpeed() {
    audioConfig.rate = (audioConfig.rate === 1.0) ? 0.5 : 1.0;
    localStorage.setItem('audio-rate', audioConfig.rate);
    syncAudioButtons();
}

function syncAudioButtons() {
    document.getElementById('voice-btn').innerText = (audioConfig.lang === 'en-US') ? 'US' : 'UK';
    document.getElementById('speed-btn').innerText = audioConfig.rate.toFixed(1) + 'x';
}

function speakWord(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = audioConfig.lang;
    utterance.rate = audioConfig.rate;
    window.speechSynthesis.speak(utterance);
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('dark-mode', isDark);
    document.getElementById('theme-btn').innerText = isDark ? '☀️' : '🌙';
}

async function fetchFlashcardsFromSheets() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let insideQuotes = false;
        
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i+1];
            if (char === '"' && insideQuotes && nextChar === '"') { currentCell += '"'; i++; }
            else if (char === '"') { insideQuotes = !insideQuotes; }
            else if (char === ',' && !insideQuotes) { currentRow.push(currentCell.trim()); currentCell = ''; }
            else if ((char === '\n' || char === '\r') && !insideQuotes) {
                if (currentRow.length > 0 || currentCell !== '') { currentRow.push(currentCell.trim()); rows.push(currentRow); currentRow = []; currentCell = ''; }
            } else { currentCell += char; }
        }
        if (currentRow.length > 0 || currentCell !== '') { currentRow.push(currentCell.trim()); rows.push(currentRow); }
        
        LESSONS_DATABASE = {};
        rows.slice(1).forEach(cols => {
            if (cols.length >= 4) {
                const id = cols[0];
                
                // Logic lọc dữ liệu theo môn học (Giả định cột thứ 5 - index 4 là Category)
                const category = cols[4] ? cols[4].trim() : '';
                if (window.CATEGORY_FILTER && window.CATEGORY_FILTER !== category) {
                    return; // Bỏ qua nếu không đúng môn đang chọn
                }

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
    } catch (error) { console.error("Lỗi dữ liệu: ", error); }
}

function updateDashboard() {
    document.getElementById('dynamic-title').innerText = window.CATEGORY_FILTER ? `Từ vựng ${window.CATEGORY_FILTER}` : "Hệ thống thẻ ghi nhớ";
    const grid = document.getElementById('dashboard-grid');
    grid.innerHTML = '';
    const progressData = JSON.parse(localStorage.getItem('fc_cumulative_progress')) || {};
    Object.keys(LESSONS_DATABASE).forEach(id => {
        const data = LESSONS_DATABASE[id];
        const currentCount = progressData[id] || 0;
        const targetCount = data.num * 5; 
        const percent = Math.min(Math.floor((currentCount / targetCount) * 100), 100);
        const isDone = percent >= 100;
        const card = document.createElement('div');
        card.className = `lesson-card ${isDone ? 'done' : ''}`;
        card.onclick = () => showSelectionModal(id);
        card.innerHTML = `
            <h3 style="margin: 0 0 10px 0; font-size: 1.1rem;">${data.title}</h3>
            <div class="progress-text">Tiến độ: ${currentCount} / ${targetCount}</div>
            <div class="progress-container"><div class="progress-fill" style="width: ${percent}%"></div></div>
            <div class="status-badge ${isDone ? 'status-done' : 'status-pending'}">${isDone ? 'Hoàn thành' : 'Đang thực hiện'}</div>
        `;
        grid.appendChild(card);
    });
}

function showSelectionModal(id) {
    currentLessonId = id;
    const maxNum = LESSONS_DATABASE[id].num;
    const container = document.getElementById('selection-options');
    container.innerHTML = '';
    for (let i = 5; i <= maxNum; i += 5) {
        const btn = document.createElement('div'); btn.className = 'btn-option'; btn.innerText = `${i} từ`;
        btn.onclick = () => initSession(i); container.appendChild(btn);
    }
    if (maxNum % 5 !== 0 || maxNum < 5) {
        const btnAll = document.createElement('div'); btnAll.className = 'btn-option'; btnAll.innerText = `Tất cả (${maxNum})`;
        btnAll.onclick = () => initSession(maxNum); container.appendChild(btnAll);
    }
    document.getElementById('selection-modal').classList.remove('hidden');
}

function closeSelectionModal() { document.getElementById('selection-modal').classList.add('hidden'); }

function initSession(count) {
    closeSelectionModal();
    const allWords = [...LESSONS_DATABASE[currentLessonId].words];
    let procabData = JSON.parse(localStorage.getItem('fc_procab_scores')) || {};
    let lessonScores = procabData[currentLessonId] || {};
    let wordsWithScores = allWords.map((word, idx) => ({
        ...word,
        originalIndex: idx,
        mistakes: lessonScores[idx] || 0
    }));
    wordsWithScores.sort((a, b) => {
        if (b.mistakes !== a.mistakes) return b.mistakes - a.mistakes;
        return Math.random() - 0.5;
    });
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

function findLongestErrorSegment(correctWord, lastInput) {
    let correct = correctWord.toLowerCase();
    let input = lastInput.toLowerCase();
    let matched = new Array(correct.length).fill(false);
    let cIdx = 0;
    for (let i = 0; i < input.length; i++) {
        for (let j = cIdx; j < correct.length; j++) {
            if (correct[j] === input[i]) {
                matched[j] = true;
                cIdx = j + 1;
                break;
            }
        }
    }
    let longestError = "";
    let currentError = "";
    for (let i = 0; i < correct.length; i++) {
        if (!matched[i]) { currentError += correct[i]; } 
        else {
            if (currentError.length > longestError.length) longestError = currentError;
            currentError = "";
        }
    }
    if (currentError.length > longestError.length) longestError = currentError;
    return longestError;
}

function renderFlashcard() {
    attemptsPerWord = 0; 
    const item = sessionWords[currentIdx];
    const container = document.getElementById('lesson-content');
    const titleEl = document.getElementById('dynamic-title');
    titleEl.innerText = LESSONS_DATABASE[currentLessonId].title;

    if (item.type === 'special') {
        const randomQuote = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
        const randomColor = SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
        container.innerHTML = `<div class="flashcard special-card"><div class="card-face" style="background-color: ${randomColor}">${randomQuote}</div></div>`;
        setTimeout(() => { currentIdx++; if (currentIdx < sessionWords.length) renderFlashcard(); else finish(); }, 2500);
    } else {
        container.innerHTML = `
            <p style="text-align:center; color:#636e72; margin: 0 0 10px 0; font-size: 0.9rem;">Luyện tập từ vựng</p>
            <div class="flashcard" id="fc" onclick="toggleFlip()">
                <div class="flashcard-inner">
                    <div class="card-face">
                        <div class="word-text">${item.word}</div>
                        <div class="ipa-text">/${item.ipa}/</div>
                    </div>
                    <div class="card-face card-back" onclick="event.stopPropagation()">
                        <p style="font-size:0.8rem; margin-bottom:5px; opacity: 0.9;">Nghĩa:</p>
                        <p style="margin-bottom:15px; font-size: 1.1rem;">${item.meaning}</p>
                        <input type="text" id="fc-input" placeholder="Gõ từ tiếng Anh..." onkeydown="handleEnter(event)" autocomplete="off" autocapitalize="none">
                        <div id="fc-error" style="color: #ff7675; font-size: 0.8rem; margin-top: 8px; height: 15px; font-weight: bold;"></div>
                    </div>
                </div>
            </div>
            <div style="text-align:center; margin-top:20px;"><button class="back-btn" onclick="openConfirmModal()">NGƯNG LUYỆN TẬP</button></div>
        `;
        isSpeakingLocked = true;
        speakWord(item.word);
        setTimeout(() => { isSpeakingLocked = false; }, 800);
        setTimeout(() => document.getElementById('fc-input')?.focus(), 300);
    }
}

function toggleFlip() {
    const fc = document.getElementById('fc');
    if (isSpeakingLocked) return;
    if (fc && !fc.classList.contains('special-card')) {
        fc.classList.toggle('flipped');
        if(fc.classList.contains('flipped')) {
            speakWord(sessionWords[currentIdx].word);
            setTimeout(() => document.getElementById('fc-input')?.focus(), 300);
        }
    }
}

function handleEnter(e) { if (e.key === "Enter") verify(); }

function updateProcabScore(isCorrect) {
    let wordItem = sessionWords[currentIdx];
    let procabData = JSON.parse(localStorage.getItem('fc_procab_scores')) || {};
    if (!procabData[currentLessonId]) procabData[currentLessonId] = {};
    if (isCorrect) {
        procabData[currentLessonId][wordItem.originalIndex] = 0;
    } else {
        let currentMistakes = procabData[currentLessonId][wordItem.originalIndex] || 0;
        procabData[currentLessonId][wordItem.originalIndex] = currentMistakes + 1;
    }
    localStorage.setItem('fc_procab_scores', JSON.stringify(procabData));
}

function verify() {
    const inputEl = document.getElementById('fc-input');
    const inputVal = inputEl.value.trim().toLowerCase();
    const correct = sessionWords[currentIdx].word.toLowerCase();
    const err = document.getElementById('fc-error');

    if (inputVal === correct) {
        updateProcabScore(true);
        currentIdx++;
        if (currentIdx < sessionWords.length) renderFlashcard();
        else finish();
    } else {
        attemptsPerWord++; 
        updateProcabScore(false);
        inputEl.style.borderColor = "var(--error)";
        
        let missingSegment = findLongestErrorSegment(correct, inputVal);
        let errorMsg = "Chưa chính xác rồi em ơi!";
        
        if (inputVal.length === correct.length) {
            let typoChar = "";
            for (let i = 0; i < inputVal.length; i++) {
                if (inputVal[i] !== correct[i]) { typoChar = inputVal[i]; break; }
            }
            errorMsg = `Cẩn thận chữ cái "${typoChar.toUpperCase()}" bị nhầm nhé! 🍡`;
        } else {
            if (attemptsPerWord >= 2 && missingSegment !== "") {
                errorMsg = `Gợi ý: Chú ý chữ cái "${missingSegment.toUpperCase()}" nha! ✨`;
            } else {
                errorMsg = "Chưa đúng rồi, em thử nhớ lại xem! 🧠";
            }
        }

        err.innerText = errorMsg;
        setTimeout(() => {
            err.innerText = "";
            inputEl.style.borderColor = "var(--border)";
            document.getElementById('fc').classList.remove('flipped');
            inputEl.value = "";
            speakWord(sessionWords[currentIdx].word);
        }, 1500);
    }
}

function finish() {
    document.getElementById('dynamic-title').innerText = "Kết quả phiên học";
    let cumulativeProgress = JSON.parse(localStorage.getItem('fc_cumulative_progress')) || {};
    const wordsInSession = sessionWords.filter(w => w.type === 'normal').length;
    let currentScore = cumulativeProgress[currentLessonId] || 0;
    const targetScore = LESSONS_DATABASE[currentLessonId].num * 5; 
    cumulativeProgress[currentLessonId] = Math.min(currentScore + wordsInSession, targetScore);
    localStorage.setItem('fc_cumulative_progress', JSON.stringify(cumulativeProgress));
    document.getElementById('lesson-content').innerHTML = `
        <div style="text-align:center; padding: 20px 0;">
            <div style="font-size: 4rem;">🎉</div>
            <h2>Hoàn thành phiên học!</h2>
            <p>Hệ thống đã ghi nhận +${wordsInSession} điểm vào tiến độ của em.</p>
            <button onclick="backToDashboard()">QUAY LẠI DANH SÁCH</button>
        </div>
    `;
}

function backToDashboard() {
    document.getElementById('view-lesson').classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');
    updateDashboard();
}

function openConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('hidden');
    const exitBtn = document.getElementById('exit-btn');
    exitBtn.onclick = () => { closeConfirmModal(); backToDashboard(); };
}
function closeConfirmModal() { document.getElementById('confirm-modal').classList.add('hidden'); }
