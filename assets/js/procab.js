
export async function updateProcabScore(isCorrect, currentLessonId, wordIndex, currentUserData) {
    if (!currentUserData.procab_scores[currentLessonId]) {
        currentUserData.procab_scores[currentLessonId] = {};
    }
    
    let currentMistakes = currentUserData.procab_scores[currentLessonId][wordIndex] || 0;

    if (isCorrect) {
        currentUserData.procab_scores[currentLessonId][wordIndex] = Math.max(0, currentMistakes - 1);
    } else {
        currentUserData.procab_scores[currentLessonId][wordIndex] = currentMistakes + 2;
    }
    
    const user = auth.currentUser;
    if (user) {
        await setDoc(doc(db, "users", user.uid), currentUserData, { merge: true });
    }
}
