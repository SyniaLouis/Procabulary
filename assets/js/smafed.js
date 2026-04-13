export function getSmartFeedback(correctWord, lastInput) {
    const correct = correctWord.toLowerCase();
    const input = lastInput.toLowerCase();
    const n = correct.length;
    const m = input.length;

    const matrix = Array.from({ length: n + 1 }, (_, i) => [i]);
    for (let j = 1; j <= m; j++) matrix[0][j] = j;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = correct[i - 1] === input[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      
                matrix[i][j - 1] + 1,      
                matrix[i - 1][j - 1] + cost 
            );
        }
    }

    let diffMap = [];
    let i = n, j = m;

    while (i > 0 || j > 0) {
        const current = matrix[i][j];
        if (i > 0 && j > 0 && correct[i - 1] === input[j - 1]) {
            diffMap.unshift({ char: input[j - 1], expected: correct[i - 1], type: 'correct', label: 'Đúng' });
            i--; j--;
        }
        else if (i > 0 && j > 0 && current === matrix[i - 1][j - 1] + 1) {
            diffMap.unshift({ char: input[j - 1], expected: correct[i - 1], type: 'wrong', label: 'Sai chữ' });
            i--; j--;
        }
        else if (i > 0 && (j === 0 || current === matrix[i - 1][j] + 1)) {
            diffMap.unshift({ char: '', expected: correct[i - 1], type: 'missing', label: 'Thiếu' });
            i--;
        }
        else if (j > 0 && (i === 0 || current === matrix[i][j - 1] + 1)) {
            diffMap.unshift({ char: input[j - 1], expected: '', type: 'extra', label: 'Thừa' });
            j--;
        }
    }

    const distance = matrix[n][m];
    const accuracy = Math.max(0, Math.round(((n - distance) / n) * 100));
    return { accuracy, diffMap };
}
