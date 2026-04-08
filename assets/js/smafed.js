export function findLongestErrorSegment(correctWord, lastInput) {
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
        if (!matched[i]) currentError += correct[i];
        else {
            if (currentError.length > longestError.length) longestError = currentError;
            currentError = "";
        }
    }
    if (currentError.length > longestError.length) longestError = currentError;
    return longestError;
}
