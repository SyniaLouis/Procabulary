import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

export async function updateProcabScore(isCorrect, currentLessonId, wordIndex, currentUserData) {
    if (!currentUserData.procab_scores[currentLessonId]) {
        currentUserData.procab_scores[currentLessonId] = {};
    }
    
    if (isCorrect) {
        currentUserData.procab_scores[currentLessonId][wordIndex] = 0;
    } else {
        let currentMistakes = currentUserData.procab_scores[currentLessonId][wordIndex] || 0;
        currentUserData.procab_scores[currentLessonId][wordIndex] = currentMistakes + 1;
    }
    
    const user = auth.currentUser;
    if (user) {
        await setDoc(doc(db, "users", user.uid), currentUserData, { merge: true });
    }
}
