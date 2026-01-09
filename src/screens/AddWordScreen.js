import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    SafeAreaView
} from 'react-native';
import { Audio } from 'expo-av';
import { db, storage, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, TYPOGRAPHY, LAYOUT } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import DialectChip from '../components/DialectChip';

const DIALECTS = ["Shughni", "Rushani", "Wakhi", "Yazghulami", "Sarikoli", "Bartangi", "Ishkashimi"];

export default function AddWordScreen() {
    const navigation = useNavigation();

    const [word, setWord] = useState('');
    const [meaning, setMeaning] = useState('');
    const [selectedDialect, setSelectedDialect] = useState(DIALECTS[0]);

    const [recording, setRecording] = useState(null);
    const [recordUri, setRecordUri] = useState(null);
    const [sound, setSound] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        return () => {
            if (recording) recording.stopAndUnloadAsync();
            if (sound) sound.unloadAsync();
        };
    }, [recording, sound]);

    async function startRecording() {
        try {
            if (permissionResponse?.status !== 'granted') {
                await requestPermission();
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setRecordUri(null);
        } catch (err) {
            Alert.alert("Error", "Failed to start recording.");
        }
    }

    async function stopRecording() {
        setIsRecording(false);
        if (!recording) return;

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
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

    const handleSubmit = async () => {
        if (!word.trim()) return Alert.alert("Missing Field", "Please enter a word.");
        if (!recordUri) return Alert.alert("Missing Audio", "Please record the pronunciation.");

        setUploading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");

            const entryData = {
                word: word.trim().toLowerCase(),
                meaning: meaning.trim(),
                dialect: selectedDialect,
                contributorId: user.uid,
                status: 'pending',
                timestamp: serverTimestamp(),
                audioURL: ""
            };

            const docRef = await addDoc(collection(db, 'entries'), entryData);

            const blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function () { resolve(xhr.response); };
                xhr.onerror = function (e) { reject(new TypeError('Network request failed')); };
                xhr.responseType = 'blob';
                xhr.open('GET', recordUri, true);
                xhr.send(null);
            });

            const storageRef = ref(storage, `audio/${docRef.id}.m4a`);
            await uploadBytes(storageRef, blob);

            const downloadURL = await getDownloadURL(storageRef);
            await updateDoc(docRef, { audioURL: downloadURL });

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                points: increment(1),
            });

            Alert.alert(
                "Success!",
                "Contribution submitted. (+1 Point)",
                [{
                    text: "Done",
                    onPress: () => {
                        setWord('');
                        setMeaning('');
                        setRecordUri(null);
                        navigation.navigate('Dictionary');
                    }
                }, {
                    text: "Add Another",
                    onPress: () => {
                        setWord('');
                        setMeaning('');
                        setRecordUri(null);
                    }
                }]
            );

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Submission failed.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.header}>Contribute</Text>

                    <Text style={styles.label}>Select Dialect</Text>
                    <View style={styles.chipContainer}>
                        {DIALECTS.map((d) => (
                            <DialectChip
                                key={d}
                                label={d}
                                selected={selectedDialect === d}
                                onPress={() => setSelectedDialect(d)}
                            />
                        ))}
                    </View>

                    <Input
                        label="Word"
                        placeholder="e.g. kitob"
                        value={word}
                        onChangeText={setWord}
                        style={{ marginTop: SPACING.m }}
                    />

                    <Input
                        label="Meaning (Optional)"
                        placeholder="e.g. Book"
                        value={meaning}
                        onChangeText={setMeaning}
                    />

                    <Text style={styles.label}>Pronunciation</Text>
                    <View style={[styles.recorderCard, isRecording && styles.recordingActive]}>
                        {isRecording ? (
                            <View style={styles.recordingState}>
                                <Text style={styles.recordingText}>Recording...</Text>
                                <Button
                                    title="Stop"
                                    onPress={stopRecording}
                                    variant="danger"
                                    icon="stop"
                                    size="small"
                                />
                            </View>
                        ) : (
                            <View style={styles.recordingState}>
                                {recordUri ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Button
                                            title="Play Preview"
                                            onPress={playPreview}
                                            variant="secondary"
                                            icon="play"
                                            size="small"
                                            style={{ marginRight: SPACING.s }}
                                        />
                                        <Button
                                            title="Redo"
                                            onPress={startRecording}
                                            variant="ghost"
                                            size="small"
                                        />
                                    </View>
                                ) : (
                                    <Button
                                        title="Start Recording"
                                        onPress={startRecording}
                                        icon="mic"
                                    />
                                )}
                            </View>
                        )}
                    </View>

                    <Button
                        title="Submit Contribution"
                        onPress={handleSubmit}
                        loading={uploading}
                        disabled={!word || !recordUri}
                        style={{ marginTop: SPACING.xl }}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.l,
    },
    header: {
        ...TYPOGRAPHY.header,
        marginBottom: SPACING.l,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.s,
        marginTop: SPACING.s,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 8,
    },
    recorderCard: {
        backgroundColor: COLORS.surface,
        borderRadius: LAYOUT.borderRadius.m,
        padding: SPACING.l,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    recordingActive: {
        borderColor: COLORS.error,
        backgroundColor: '#FEF2F2', // Light red
    },
    recordingState: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingText: {
        color: COLORS.error,
        fontWeight: '600',
        marginBottom: SPACING.s,
    }
});
