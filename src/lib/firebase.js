import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCh8xj5oZfFk4NyhKWAuN8joLCFB84QaCM",
    authDomain: "pamirilexicon.firebaseapp.com",
    projectId: "pamirilexicon",
    storageBucket: "pamirilexicon.firebasestorage.app",
    messagingSenderId: "415283491828",
    appId: "1:415283491828:web:7c2c737ac51e7b68fdffa1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
