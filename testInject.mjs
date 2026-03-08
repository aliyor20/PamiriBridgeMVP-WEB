import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCh8xj5oZfFk4NyhKWAuN8joLCFB84QaCM",
    authDomain: "pamirilexicon.firebaseapp.com",
    projectId: "pamirilexicon",
    storageBucket: "pamirilexicon.firebasestorage.app",
    messagingSenderId: "415283491828",
    appId: "1:415283491828:web:7c2c737ac51e7b68fdffa1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const dummyWords = [
    { en: "Sky", ru: "Небо", word: "", status: "needs_translation" },
    { en: "Water", ru: "Вода", word: "", status: "needs_translation" },
    { en: "Mountain", ru: "Гора", word: "", status: "needs_translation" },
    { en: "Fire", ru: "Огонь", word: "", status: "needs_translation" },
    { en: "Earth", ru: "Земля", word: "", status: "needs_translation" },
    { en: "Wind", ru: "Ветер", word: "", status: "needs_translation" },
    { en: "Tree", ru: "Дерево", word: "", status: "needs_translation" },
];

async function inject() {
    console.log("Cleaning up old dummy entries...");
    const q1 = query(collection(db, 'entries'), where('status', '==', 'needs_translation'));
    const s1 = await getDocs(q1);
    const deletePromises = [];
    s1.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));

    // Also cleanup pending dummy ones
    const q2 = query(collection(db, 'entries'), where('status', '==', 'pending'));
    const s2 = await getDocs(q2);
    s2.forEach(doc => {
        if (!doc.data().meaning && !doc.data().definitions) {
            deletePromises.push(deleteDoc(doc.ref));
        }
    });

    await Promise.all(deletePromises);
    console.log("Cleanup done.");

    console.log("Injecting new dummies...");
    for (let word of dummyWords) {
        const docRef = await addDoc(collection(db, 'entries'), word);
        console.log(`Added: ${word.en} with ID: ${docRef.id}`);
    }
    console.log("Injection complete.");
    process.exit(0);
}

inject().catch(e => {
    console.error(e);
    process.exit(1);
});
