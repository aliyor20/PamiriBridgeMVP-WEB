import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    LayoutAnimation,
    UIManager,
    Dimensions,
    useWindowDimensions
} from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { startRecording, stopRecording } from '../services/AudioService';
import { db, storage, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, runTransaction, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useNavigation } from '@react-navigation/native';

import { SPACING, TYPOGRAPHY, LAYOUT } from '../constants/theme';
import { usePreferences } from '../context/PreferencesContext';
import { useContribute } from '../context/ContributeContext';
import Button from '../components/Button';
import Input from '../components/Input';
import DialectChip from '../components/DialectChip';
import ReviewScreen from './ReviewScreen';
import ActionModal from '../components/ActionModal';

import { DIALECTS } from '../constants/dataConfig';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export default function AddWordScreen({ route }) {
    const navigation = useNavigation();
    const { colors } = usePreferences();
    const { initialWord, initialDialect } = route?.params || {};
    const layout = useWindowDimensions();

    // Global Mode Context
    const { mode, setMode } = useContribute();

    // Tab View State
    const [index, setIndex] = useState(mode === 'contribute' ? 0 : 1);
    const [routes] = useState([
        { key: 'contribute', title: 'Contribute' },
        { key: 'verify', title: 'Verify' },
    ]);

    // --- CONTRIBUTE FORM STATE ---
    const [word, setWord] = useState(initialWord || '');
    const [meaning, setMeaning] = useState('');
    const contributionDialects = DIALECTS.filter(d => d !== 'All');
    const [selectedDialect, setSelectedDialect] = useState(initialDialect || contributionDialects[0]);

    const [recording, setRecording] = useState(null);
    const [recordUri, setRecordUri] = useState(null);
    const [sound, setSound] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        return () => {
            if (recording) stopRecording(recording);
            if (sound) sound.unloadAsync();
        };
    }, []);

    // Sync TabView index with Context Mode
    useEffect(() => {
        const newIndex = mode === 'contribute' ? 0 : 1;
        if (newIndex !== index) {
            setIndex(newIndex);
        }
    }, [mode]);

    // Sync Context Mode with TabView index
    const handleIndexChange = (newIndex) => {
        setIndex(newIndex);
        const newMode = newIndex === 0 ? 'contribute' : 'verify';
        if (newMode !== mode) {
            setMode(newMode);
        }
    };

    // --- AUDIO LOGIC ---
    async function handleStartRecording() {
        try {
            const newRecording = await startRecording();
            setRecording(newRecording);
            setIsRecording(true);
            setRecordUri(null);
        } catch (err) {
            Alert.alert("Error", "Failed to start recording. Check permissions.");
        }
    }

    async function handleStopRecording() {
        setIsRecording(false);
        if (!recording) return;

        const uri = await stopRecording(recording);
        setRecordUri(uri);
        setRecording(null);
    }

    async function playPreview() {
        if (!recordUri) return;
        try {
            if (sound) await sound.unloadAsync();
            const { sound: newSound } = await Audio.Sound.createAsync({ uri: recordUri });
            setSound(newSound);
            await newSound.playAsync();
        } catch (error) {
            Alert.alert("Error", "Could not play preview.");
        }
    }

    // --- MODAL STATE ---
    const [modal, setModal] = useState({
        visible: false,
        type: 'success',
        title: '',
        message: '',
        onAction: () => { },
        points: 0
    });

    const showModal = (config) => {
        setModal({ ...config, visible: true });
    };

    const hideModal = () => {
        setModal(prev => ({ ...prev, visible: false }));
    };

    // --- SUBMIT LOGIC ---
    const handleSubmit = async () => {
        if (!word.trim()) {
            showModal({
                type: 'error',
                title: 'Missing Word',
                message: 'Please enter a word to contribute.',
                onAction: hideModal
            });
            return;
        }

        setUploading(true);
        let storageRef = null;

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");

            // 1. Prepare Entry Data & ID (Client-side ID)
            const newEntryRef = doc(collection(db, 'entries'));

            const entryData = {
                word: word.trim().toLowerCase(),
                meaning: meaning.trim(),
                dialect: selectedDialect,
                contributorId: user.uid,
                status: 'pending',
                timestamp: serverTimestamp(),
            };

            // 2. Upload Audio (if provided)
            let downloadURL = null;
            if (recordUri) {
                const blob = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onload = function () { resolve(xhr.response); };
                    xhr.onerror = function (e) { reject(new TypeError('Network request failed')); };
                    xhr.responseType = 'blob';
                    xhr.open('GET', recordUri, true);
                    xhr.send(null);
                });

                storageRef = ref(storage, `audio/${newEntryRef.id}.m4a`);
                await uploadBytes(storageRef, blob);
                downloadURL = await getDownloadURL(storageRef);
            }

            // 3. Execute Transaction
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists()) throw new Error("User profile not found");

                const finalEntryData = {
                    ...entryData,
                    ...(downloadURL && { audioURL: downloadURL })  // Only add audioURL if it exists
                };

                transaction.set(newEntryRef, finalEntryData);

                const newPoints = (userDoc.data().points || 0) + 1;
                transaction.update(userRef, { points: newPoints });
            });

            // 4. Calculate Daily Count
            // In a real app, this might be a separate query or counter document.
            // For MVP, we'll do a quick client-side query for today's entries.
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const q = query(
                collection(db, 'entries'),
                where('contributorId', '==', user.uid)
                // Removed timestamp query to avoid index creation requirement for now
            );
            const snapshot = await getDocs(q);

            // Client-side filtering for today's count
            // This is safer for MVP as it works without custom indexes
            const dailyCount = snapshot.docs.filter(doc => {
                const data = doc.data();
                if (!data.timestamp) return false;
                const docDate = data.timestamp.toDate(); // Firestore timestamp to JS Date
                return docDate >= today;
            }).length;

            // SUCCESS! Show refined popup
            showModal({
                type: 'success',
                title: 'Sent for Verification',
                message: 'Your word is waiting for verification.',
                points: 1,
                word: word.trim(),           // Pass word for emphasis
                dialect: selectedDialect,    // Pass dialect
                dailyCount: dailyCount,      // Pass today's count
                primaryActionLabel: 'Continue',
                onPrimaryAction: () => {
                    setWord('');
                    setMeaning('');
                    setRecordUri(null);
                    hideModal();
                }
            });

        } catch (error) {
            console.error("Submission failed:", error);
            if (storageRef) {
                try { await deleteObject(storageRef); } catch (e) { }
            }
            showModal({
                type: 'error',
                title: 'Submission Failed',
                message: 'Could not submit your contribution. Please try again.',
                onAction: hideModal
            });
        } finally {
            setUploading(false);
        }
    };

    // --- RENDER HELPERS ---

    // Animated slider position
    const sliderStyle = useAnimatedStyle(() => {
        const containerWidth = layout.width - SPACING.l * 2 - 8; // Account for container padding
        const sliderWidth = (containerWidth - 4) / 2; // Half width minus padding
        return {
            transform: [
                {
                    translateX: withTiming(index === 0 ? 0 : sliderWidth + 4, {
                        duration: 200,
                    })
                }
            ]
        };
    });

    const renderToggle = () => (
        <View style={[styles.toggleContainer, { backgroundColor: colors.inputBg }]}>
            <Animated.View style={[styles.slider, { backgroundColor: colors.surface }, sliderStyle]} />
            <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => handleIndexChange(0)}
                activeOpacity={0.8}
            >
                <Ionicons
                    name="add-circle"
                    size={18}
                    color={index === 0 ? colors.primary : colors.textLight}
                    style={{ marginRight: 6 }}
                />
                <Text style={[
                    styles.toggleText,
                    { color: index === 0 ? colors.primary : colors.textLight, fontWeight: index === 0 ? '600' : '500' }
                ]}>Contribute</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => handleIndexChange(1)}
                activeOpacity={0.8}
            >
                <Ionicons
                    name="shield-checkmark"
                    size={18}
                    color={index === 1 ? colors.primary : colors.textLight}
                    style={{ marginRight: 6 }}
                />
                <Text style={[
                    styles.toggleText,
                    { color: index === 1 ? colors.primary : colors.textLight, fontWeight: index === 1 ? '600' : '500' }
                ]}>Verify</Text>
            </TouchableOpacity>
        </View>
    );

    const renderScene = ({ route }) => {
        switch (route.key) {
            case 'contribute':
                return (
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                    >
                        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add New Word</Text>
                            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
                                Help preserve the language by adding new vocabulary.
                            </Text>

                            <Text style={[styles.label, { color: colors.text }]}>Select Dialect</Text>
                            <View style={styles.chipContainer}>
                                {contributionDialects.map((d) => (
                                    <DialectChip
                                        key={d}
                                        label={d}
                                        selected={selectedDialect === d}
                                        onPress={() => setSelectedDialect(d)}
                                    />
                                ))}
                            </View>

                            <Input
                                label="Word (Latin Script)"
                                placeholder="e.g. kitob"
                                value={word}
                                onChangeText={setWord}
                                style={{ marginTop: SPACING.m }}
                            />

                            <Input
                                label="Meaning in English (Optional)"
                                placeholder="e.g. Book"
                                value={meaning}
                                onChangeText={setMeaning}
                            />

                            <Text style={[styles.label, { color: colors.text }]}>Pronunciation (Optional)</Text>
                            <View style={[
                                styles.recorderCard,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                isRecording && { borderColor: colors.error, backgroundColor: '#FEF2F2' }
                            ]}>
                                {isRecording ? (
                                    <View style={styles.recordingState}>
                                        <View style={styles.recordingIndicator}>
                                            <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
                                            <Text style={[styles.recordingText, { color: colors.error }]}>Recording...</Text>
                                        </View>
                                        <Button
                                            title="Stop Recording"
                                            onPress={handleStopRecording}
                                            variant="danger"
                                            icon="stop"
                                            size="small"
                                            style={{ width: '100%' }}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.recordingState}>
                                        {recordUri ? (
                                            <View style={styles.previewContainer}>
                                                <TouchableOpacity onPress={playPreview} style={[styles.playPreviewBtn, { backgroundColor: colors.primary + '15' }]}>
                                                    <Ionicons name="play" size={24} color={colors.primary} />
                                                    <Text style={[styles.previewText, { color: colors.primary }]}>Play Preview</Text>
                                                </TouchableOpacity>

                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <TouchableOpacity onPress={handleStartRecording} style={[styles.redoBtn, { backgroundColor: colors.inputBg }]}>
                                                        <Ionicons name="refresh" size={20} color={colors.textLight} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => setRecordUri(null)} style={[styles.redoBtn, { backgroundColor: colors.error + '15' }]}>
                                                        <Ionicons name="trash" size={20} color={colors.error} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={styles.startRecordContainer}>
                                                <TouchableOpacity
                                                    style={[styles.bigMicBtn, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
                                                    onPress={handleStartRecording}
                                                >
                                                    <Ionicons name="mic" size={32} color={colors.primary} />
                                                </TouchableOpacity>
                                                <Text style={[styles.micHint, { color: colors.textLight }]}>Tap to record pronunciation</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            <Button
                                title="Submit Contribution"
                                onPress={handleSubmit}
                                loading={uploading}
                                disabled={!word}
                                style={{ marginTop: SPACING.xl, marginBottom: SPACING.xl }}
                                variant="primary"
                                icon="cloud-upload"
                            />
                        </ScrollView>
                    </KeyboardAvoidingView>
                );
            case 'verify':
                return <ReviewScreen embedded={true} />;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.headerContainer}>
                {renderToggle()}
            </View>

            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={handleIndexChange}
                initialLayout={{ width: layout.width }}
                swipeEnabled={true}
                renderTabBar={() => null}
                keyboardDismissMode="none"
            />

            <ActionModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                points={modal.points}
                primaryActionLabel={modal.primaryActionLabel}
                onPrimaryAction={modal.onAction}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.s,
        paddingBottom: SPACING.s,
    },
    toggleContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: LAYOUT.borderRadius.l,
        position: 'relative',
    },
    slider: {
        position: 'absolute',
        top: 4,
        left: 4,
        bottom: 4,
        width: '50%',
        borderRadius: LAYOUT.borderRadius.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: LAYOUT.borderRadius.m,
        zIndex: 1,
    },
    toggleText: {
        fontSize: 14,
    },
    mainContent: {
        flex: 1,
    },
    content: {
        padding: SPACING.l,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        marginBottom: SPACING.l,
        opacity: 0.7,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 8,
    },
    recorderCard: {
        borderRadius: LAYOUT.borderRadius.l,
        padding: SPACING.l,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: SPACING.xs,
        minHeight: 140,
        justifyContent: 'center',
    },
    recordingState: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    recordingText: {
        fontWeight: '600',
        fontSize: 16,
    },
    startRecordContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bigMicBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: 12,
    },
    micHint: {
        fontSize: 14,
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    playPreviewBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: LAYOUT.borderRadius.m,
        marginRight: 12,
    },
    previewText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    redoBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
