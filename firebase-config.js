// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore,
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    arrayUnion,
    arrayRemove,
    collection, 
    getDocs,
    query,
    orderBy,
    limit,
    where,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBucOCRKF5vsNwtMsCDMapUMpIoGnKlTY0",
    authDomain: "projectgear-b6776.firebaseapp.com",
    projectId: "projectgear-b6776",
    storageBucket: "projectgear-b6776.firebasestorage.app",
    messagingSenderId: "916044026836",
    appId: "1:916044026836:web:3d8f8421e1b63566303c41"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { 
    doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove,
    collection, getDocs, query, orderBy, limit, where, addDoc, serverTimestamp
};