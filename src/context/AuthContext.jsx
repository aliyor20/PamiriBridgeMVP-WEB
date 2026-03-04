import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Fetch User Profile from Firestore
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setUserProfile(userSnap.data());
                } else {
                    // It will be created by the sign-up methods
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        try {
            const res = await signInWithPopup(auth, googleProvider);
            // Check if profile exists, if not create it
            const userRef = doc(db, 'users', res.user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                const newProfile = {
                    email: res.user.email,
                    displayName: res.user.displayName || '',
                    photoURL: res.user.photoURL || '',
                    role: 'user',
                    badges: [],
                    points: 0,
                    createdAt: new Date().toISOString()
                };
                await setDoc(userRef, newProfile);
                setUserProfile(newProfile);
            } else {
                setUserProfile(userSnap.data());
            }
        } catch (error) {
            console.error("Login Failed", error);
            throw error;
        }
    };

    const signUpWithEmail = async (email, password, displayName, dialect) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });

        // Write the custom dialect and role to Firestore
        const userRef = doc(db, 'users', userCredential.user.uid);
        const profileData = {
            email: email,
            displayName: displayName,
            role: 'user',
            dialect: dialect,
            points: 0,
            badges: [],
            createdAt: new Date().toISOString()
        };
        await setDoc(userRef, profileData, { merge: true });
        setUserProfile((prev) => ({ ...prev, ...profileData }));
        return userCredential;
    };

    const loginWithEmail = async (email, password) => {
        return await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, loginWithGoogle, signUpWithEmail, loginWithEmail, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
