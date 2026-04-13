export function getSmartFeedback(correctWord, lastInput) {
    const correct = correctWord.toLowerCase();
    const input = lastInput.toLowerCase();
    let diffMap = [];
    let i = 0, j = 0;

    while (i < correct.length || j < input.length) {
        if (i < correct.length && j < input.length && correct[i] === input[j]) {
            diffMap.push({ char: correct[i], expected: correct[i], type: 'correct', label: 'Đúng' });
            i++; j++;
        } 
        else if (i + 1 < correct.length && j + 1 < input.length && correct[i] === input[j+1] && correct[i+1] === input[j]) {
            diffMap.push({ char: input[j], expected: correct[i], type: 'transposed', label: 'Lộn thứ tự' });
            diffMap.push({ char: input[j+1], expected: correct[i+1], type: 'transposed', label: 'Lộn thứ tự' });
            i += 2; j += 2;
        }
        else {
            if (i < correct.length && j < input.length) {
                // SAI: Lưu ký tự em gõ (char) và ký tự lẽ ra phải đúng (expected)
                diffMap.push({ char: input[j], expected: correct[i], type: 'wrong', label: 'Sai chữ' });
                i++; j++;
            } else if (i < correct.length) {
                diffMap.push({ char: '', expected: correct[i], type: 'missing', label: 'Thiếu' });
                i++;
            } else {
                diffMap.push({ char: input[j], expected: '', type: 'extra', label: 'Thừa' });
                j++;
            }
        }
    }

    const distance = computeLevenshtein(correct, input);
    const accuracy = Math.max(0, Math.round(((correct.length - distance) / correct.length) * 100));

    return { accuracy, diffMap };
}

function computeLevenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // xóa
                matrix[i][j - 1] + 1,      // thêm
                matrix[i - 1][j - 1] + cost // thay thế
            );
        }
    }
    return matrix[a.length][b.length];
}
