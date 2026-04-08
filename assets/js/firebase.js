import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCaw0glUY4-Cv9e9JbL09Cfgcmc6vMxaak",
    authDomain: "procabulary-engine.firebaseapp.com",
    projectId: "procabulary-engine",
    storageBucket: "procabulary-engine.firebasestorage.app",
    messagingSenderId: "271617165131",
    appId: "1:271617165131:web:c3b3f8f88b2b39c4410ace",
    measurementId: "G-NCL1PT38MN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
