import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, LAYOUT } from '../constants/theme';
import { usePreferences } from '../context/PreferencesContext';

const { width } = Dimensions.get('window');

// Recording settings optimized for voice (compressed AAC)
// ~32kbps equivalent compression for Firebase Spark Plan
const RECORDING_OPTIONS = {
    android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 22050,
        numberOfChannels: 1,
        bitRate: 32000,
    },
    ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.MEDIUM,
        sampleRate: 22050,
        numberOfChannels: 1,
        bitRate: 32000,
    },
    web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 32000,
    },
};

export default function AudioRecorder({ onRecordingComplete, initialUri = null }) {
    const { colors } = usePreferences();

    const [recording, setRecording] = useState(null);
    const [sound, setSound] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordedUri, setRecordedUri] = useState(initialUri);
    const [durationMs, setDurationMs] = useState(0);
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);

    const durationInterval = useRef(null);

    // Request permissions on mount
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Audio.requestPermissionsAsync();
                if (status !== 'granted') {
                    alert("Microphone access is required to contribute audio.");
                }

                // Set audio mode for recording
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
            } catch (error) {
                console.error("Permission error:", error);
            }
        })();

        return () => {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
            if (sound) sound.unloadAsync();
            if (recording) recording.stopAndUnloadAsync();
        };
    }, []);

    // Cleanup sound on unmount
    useEffect(() => {
        if (sound) {
            return () => sound.unloadAsync();
        }
    }, [sound]);

    const startRecording = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Ensure audio mode is set for recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                RECORDING_OPTIONS
            );

            setRecording(newRecording);
            setIsRecording(true);
            setRecordedUri(null);
            setDurationMs(0);

            // Track duration
            durationInterval.current = setInterval(() => {
                setDurationMs(prev => prev + 100);
            }, 100);

        } catch (error) {
            console.error("Failed to start recording:", error);
            alert("Could not start recording. Please check microphone permissions.");
        }
    };

    const stopRecording = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }

            if (!recording) return;

            setIsRecording(false);
            await recording.stopAndUnloadAsync();

            const uri = recording.getURI();
            const status = await recording.getStatusAsync();

            setRecording(null);
            setRecordedUri(uri);
            setDurationMs(status.durationMillis || durationMs);

            if (onRecordingComplete && uri) {
                onRecordingComplete(uri, status.durationMillis || durationMs);
            }

            // Reset audio mode for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

        } catch (error) {
            console.error("Failed to stop recording:", error);
        }
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const playSound = async () => {
        if (!recordedUri) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (sound) await sound.unloadAsync();

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: recordedUri },
                { shouldPlay: true },
                (status) => {
                    if (status.isLoaded) {
                        setPlaybackDuration(status.durationMillis || 0);
                        setPlaybackPosition(status.positionMillis || 0);
                        setIsPlaying(status.isPlaying);
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                            setPlaybackPosition(0);
                        }
                    }
                }
            );
            setSound(newSound);
            setIsPlaying(true);
        } catch (error) {
            console.error("Playback error:", error);
        }
    };

    const pauseSound = async () => {
        if (sound) {
            await sound.pauseAsync();
            setIsPlaying(false);
        }
    };

    const clearRecording = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRecordedUri(null);
        setDurationMs(0);
        if (onRecordingComplete) {
            onRecordingComplete(null, 0);
        }
    };

    const formatDuration = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const tenths = Math.floor((ms % 1000) / 100);
        return `${seconds}.${tenths}s`;
    };

    const Visualizer = () => {
        if (isRecording) {
            return (
                <View style={styles.waveformContainer}>
                    <View style={styles.recordingIndicator}>
                        <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
                        <Text style={[styles.recordingText, { color: colors.error }]}>Recording...</Text>
                    </View>
                </View>
            );
        }

        if (recordedUri && !isRecording) {
            return (
                <View style={[styles.waveformContainer, { justifyContent: 'center' }]}>
                    <View style={[styles.trackLine, { backgroundColor: colors.border }]}>
                        <View style={[styles.trackProgress, {
                            width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%`,
                            backgroundColor: colors.primary
                        }]} />
                    </View>
                </View>
            );
        }

        return (
            <Text style={[styles.placeholderText, { color: colors.textLight }]}>
                Tap mic to record
            </Text>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.visualizerArea, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Visualizer />
                {(isRecording || recordedUri) && (
                    <Text style={[styles.timerText, { color: isRecording ? colors.error : colors.textLight }]}>
                        {formatDuration(isRecording ? durationMs : playbackDuration)}
                    </Text>
                )}
            </View>

            <View style={styles.controls}>
                {recordedUri && !isRecording ? (
                    <View style={styles.playbackControls}>
                        <TouchableOpacity
                            onPress={isPlaying ? pauseSound : playSound}
                            style={[styles.smallFab, { backgroundColor: colors.inputBg }]}
                        >
                            <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={clearRecording} style={styles.textBtn}>
                            <Text style={[styles.textBtnLabel, { color: colors.textLight }]}>Retake</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={handleToggleRecording}
                        activeOpacity={0.8}
                    >
                        <View style={[
                            styles.recordFab,
                            { backgroundColor: colors.primary, shadowColor: colors.primary },
                            isRecording && { backgroundColor: colors.error, shadowColor: colors.error }
                        ]}>
                            <Ionicons
                                name={isRecording ? "stop" : "mic"}
                                size={32}
                                color="#fff"
                            />
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={[styles.techSpecText, { color: colors.textLight }]}>
                Audio: AAC 32kbps (optimized for storage)
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: SPACING.m,
    },
    visualizerArea: {
        height: 80,
        width: '100%',
        borderRadius: LAYOUT.borderRadius.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
        borderWidth: 1,
        overflow: 'hidden',
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: '100%',
        width: '100%',
        paddingHorizontal: SPACING.m,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    trackLine: {
        height: 4,
        width: '80%',
        borderRadius: 2,
        overflow: 'hidden',
    },
    trackProgress: {
        height: '100%',
    },
    placeholderText: {
        fontSize: 14,
    },
    recordingText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordFab: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.l,
    },
    smallFab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textBtn: {
        padding: SPACING.s,
    },
    textBtnLabel: {
        fontWeight: '600',
    },
    timerText: {
        position: 'absolute',
        bottom: 4,
        right: 8,
        fontSize: 12,
        fontWeight: 'bold',
    },
    techSpecText: {
        marginTop: SPACING.m,
        fontSize: 10,
        opacity: 0.7
    }
});
