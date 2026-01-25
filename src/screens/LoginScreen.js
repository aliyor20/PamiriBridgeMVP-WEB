import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
    SafeAreaView
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import ActionModal from '../components/ActionModal';

WebBrowser.maybeCompleteAuthSession();

// Hardcoded for MVP, ideally should be in ENV or constants
const GOOGLE_CLIENT_ID = "415283491828-8j98n4l8jq27om3th0afosu7da7nlrlm.apps.googleusercontent.com";

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_CLIENT_ID,
        androidClientId: GOOGLE_CLIENT_ID,
        iosClientId: GOOGLE_CLIENT_ID,
        redirectUri: "https://auth.expo.io/@anonymous/PamiriLexiconMVP-7c2c737a-c51e-7b68-fdff-a12838128212",
    });

    const [modal, setModal] = useState({
        visible: false,
        type: 'info',
        title: '',
        message: '',
        onAction: () => { },
    });

    const showModal = (config) => {
        setModal({ ...config, visible: true });
    };

    const hideModal = () => {
        setModal(prev => ({ ...prev, visible: false }));
    };

    useEffect(() => {
        if (response?.type === 'success') {
            // Note: In a real app, you'd use GoogleAuthProvider.credential to sign in to Firebase
            // For this MVP snippet, we acknowledge the token but we might need more logic
            showModal({
                type: 'success',
                title: 'Google Sign-In',
                message: 'Google Sign-In successful. (Firebase integration required)',
                onPrimaryAction: hideModal
            });
        }
    }, [response]);

    const createUserProfile = async (user) => {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName || 'Contributor',
                    points: 0,
                    badges: [],
                    isAdmin: false,
                    status: 'Pioneer',  // Default rank for new users
                    joined: serverTimestamp(),
                });
            }
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    };

    const handleAuth = async () => {
        if (!email || !password) {
            showModal({
                type: 'error',
                title: 'Validation Error',
                message: 'Please enter both email and password.',
                onPrimaryAction: hideModal
            });
            return;
        }

        setLoading(true);
        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await createUserProfile(userCredential.user);
            }
        } catch (error) {
            let errorMessage = "An error occurred.";
            if (error.code === 'auth/email-already-in-use') errorMessage = "This email is already registered.";
            else if (error.code === 'auth/weak-password') errorMessage = "Password should be at least 6 characters.";
            else if (error.code === 'auth/invalid-email') errorMessage = "Please enter a valid email address.";
            else if (error.code === 'auth/invalid-credential') errorMessage = "Invalid email or password.";

            showModal({
                type: 'error',
                title: 'Authentication Error',
                message: errorMessage,
                onPrimaryAction: hideModal
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.content}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Pamiri Bridge</Text>
                    <Text style={styles.subtitle}>{isLoginMode ? 'Welcome Back' : 'Create an Account'}</Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Email"
                        placeholder="hello@example.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Input
                        label="Password"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        rightIcon={
                            <Ionicons
                                name={showPassword ? "eye-off" : "eye"}
                                size={20}
                                color={COLORS.textLight}
                                onPress={() => setShowPassword(!showPassword)}
                            />
                        }
                    />

                    <Button
                        title={isLoginMode ? 'Login' : 'Sign Up'}
                        onPress={handleAuth}
                        loading={loading}
                        style={{ marginTop: SPACING.m }}
                    />

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>OR</Text>
                        <View style={styles.line} />
                    </View>

                    <Button
                        title="Sign in with Google"
                        variant="secondary" // Or a dedicated 'google' variant if we added one
                        icon="logo-google"
                        onPress={() => promptAsync()}
                        disabled={!request}
                    />

                    <Button
                        title={isLoginMode ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
                        variant="ghost"
                        onPress={() => setIsLoginMode(!isLoginMode)}
                        style={{ marginTop: SPACING.l }}
                    />
                </View>
            </KeyboardAvoidingView>

            <ActionModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                primaryActionLabel={modal.primaryActionLabel}
                onPrimaryAction={modal.onAction || modal.onPrimaryAction || hideModal}
                onDismiss={hideModal}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.l,
    },
    headerContainer: {
        marginBottom: SPACING.xl,
        alignItems: 'center',
    },
    title: {
        ...TYPOGRAPHY.header,
        color: COLORS.primary,
        marginBottom: SPACING.s,
    },
    subtitle: {
        ...TYPOGRAPHY.subheader,
        color: COLORS.textLight,
        fontSize: 18,
    },
    form: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.l,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    orText: {
        width: 40,
        textAlign: 'center',
        color: COLORS.textLight,
        fontSize: 12,
    },
});
