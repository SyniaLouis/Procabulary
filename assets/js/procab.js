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

export async function saveFinalProgress(currentLessonId, wordsCount, currentUserData, lessonsDb) {
    let score = currentUserData.cumulative_progress[currentLessonId] || 0;
    const target = lessonsDb[currentLessonId].num * 5;
    currentUserData.cumulative_progress[currentLessonId] = Math.min(score + wordsCount, target);
    const user = auth.currentUser;
    if (user) {
        await setDoc(doc(db, "users", user.uid), currentUserData, { merge: true });
    }
}

export async function saveCustomLesson(lessonData) {
    const user = auth.currentUser;
    if (!user) return;
    const colRef = collection(db, "users", user.uid, "custom_lessons");
    return await addDoc(colRef, { ...lessonData, createdAt: Date.now() });
}

export async function deleteCustomLesson(lessonId) {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "custom_lessons", lessonId));
}

export async function getCustomLessons() {
    const user = auth.currentUser;
    if (!user) return [];
    const colRef = collection(db, "users", user.uid, "custom_lessons");
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data(), isCustom: true }));
}
