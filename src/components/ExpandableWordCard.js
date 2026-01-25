import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import Animated, {
    Layout,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SPACING, LAYOUT } from '../constants/theme';
import { getRelatedEntries } from '../services/Database';
import { usePreferences } from '../context/PreferencesContext';
import { createEditProposal } from '../services/EditProposals';
import { auth, db } from '../firebaseConfig';
import { Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import Button from './Button'; // Assuming you have a reusable Button component
import ActionModal from '../components/ActionModal'; // Assuming ActionModal is in this path

// Helper for Fuzzy Highlighting
const HighlightText = ({ text, term, baseStyle, highlightStyle }) => {
    if (!term || !text || term.length < 1) {
        return <Text style={baseStyle}>{text}</Text>;
    }

    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);

    return (
        <Text style={baseStyle}>
            {parts.map((part, i) => (
                regex.test(part) ?
                    <Text key={i} style={highlightStyle}>{part}</Text> :
                    <Text key={i}>{part}</Text>
            ))}
        </Text>
    );
};

const AudioPlayer = ({ audioURL, color }) => {
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // 0 to 1

    useEffect(() => {
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, [sound]);

    const handlePlayPause = async () => {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                // Load new sound
                const { sound: newSound } = await import('expo-av').then(mod => mod.Audio.Sound.createAsync(
                    { uri: audioURL },
                    { shouldPlay: true, isLooping: false },
                    (status) => {
                        if (status.isLoaded) {
                            setIsPlaying(status.isPlaying);
                            if (status.durationMillis) {
                                setProgress(status.positionMillis / status.durationMillis);
                            }
                            if (status.didJustFinish) {
                                setIsPlaying(false);
                                setProgress(1);
                                // STOP explicitly to prevent looping or auto-resume
                                newSound.stopAsync();
                                // Reset for next play
                                newSound.setPositionAsync(0);
                                setTimeout(() => setProgress(0), 500);
                            }
                        }
                    }
                ));
                setSound(newSound);
            }
        } catch (error) {
            console.log("Audio Error:", error);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.audioPlayer, { backgroundColor: color + '10' }]}
            onPress={handlePlayPause}
        >
            <View style={[styles.playIconContainer, { backgroundColor: color }]}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#FFF" />
            </View>
            <View style={[styles.audioTrack, { backgroundColor: color + '30' }]}>
                <View style={[
                    styles.audioWaveform,
                    {
                        backgroundColor: color,
                        width: `${progress * 100}%`
                    }
                ]} />
            </View>
            <Text style={[styles.audioLabel, { color: color }]}>
                {isPlaying ? 'Playing...' : 'Play Audio'}
            </Text>
        </TouchableOpacity>
    );
};

export default function ExpandableWordCard({ item, onPlayAudio, onRelatedPress, searchTerm }) {
    const navigation = useNavigation();
    const { colors } = usePreferences();
    const [expanded, setExpanded] = useState(false);
    const [relatedWords, setRelatedWords] = useState([]);
    const [loadingRelated, setLoadingRelated] = useState(false);
    // Elder role state
    const [userRole, setUserRole] = useState(null);
    // Suggest Edit modal state
    const [suggestModalVisible, setSuggestModalVisible] = useState(false);
    const [suggestedWord, setSuggestedWord] = useState(item.word);
    const [suggestedMeaning, setSuggestedMeaning] = useState(item.meaning);

    // General Action Modal state
    const [modal, setModal] = useState({
        visible: false,
        type: 'info',
        title: '',
        message: '',
        primaryActionLabel: 'OK',
        onPrimaryAction: () => { },
        secondaryActionLabel: '',
        onSecondaryAction: () => { },
    });

    const showModal = useCallback((options) => {
        setModal({ ...modal, visible: true, ...options });
    }, [modal]);

    const hideModal = useCallback(() => {
        setModal((prev) => ({ ...prev, visible: false }));
    }, []);

    // Fetch user role on mount / when auth changes
    useEffect(() => {
        const fetchRole = async () => {
            const user = auth.currentUser;
            if (!user) return;
            const docRef = db.collection('users').doc(user.uid);
            const snap = await docRef.get();
            if (snap.exists) {
                const data = snap.data();
                // Check status field where we store 'Guide'/'Elder'
                setUserRole(data.status || data.role);
            }
        };
        fetchRole();
    }, []);


    const hasAudio = !!item.audioURL;

    const toggleExpand = () => {
        // No LayoutAnimation needed, Reanimated handles layout prop
        setExpanded(!expanded);
    };

    useEffect(() => {
        if (expanded && relatedWords.length === 0) {
            fetchRelated();
        }
    }, [expanded]);

    const fetchRelated = async () => {
        setLoadingRelated(true);
        try {
            // Pass item.word to prioritize alphabetical similarity
            const related = await getRelatedEntries(item.id, item.word, item.dialect, 5);
            setRelatedWords(related);
        } catch (error) {
            console.log("Error fetching related:", error);
        } finally {
            setLoadingRelated(false);
        }
    };

    const handleRecordThis = () => {
        navigation.navigate('Contribute', {
            initialWord: item.word,
            initialDialect: item.dialect
        });
    };



    // --- RENDER MODAL ---
    const renderSuggestModal = () => {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={suggestModalVisible}
                onRequestClose={() => setSuggestModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Suggest Edit</Text>
                            <TouchableOpacity onPress={() => setSuggestModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>
                            proposing changes for: <Text style={{ fontWeight: 'bold' }}>{item.word}</Text>
                        </Text>
                        <View style={styles.separator} />

                        <Text style={[styles.inputLabel, { color: colors.text }]}>Word (Spelling)</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                            value={suggestedWord}
                            onChangeText={setSuggestedWord}
                            placeholder="Correct spelling..."
                            placeholderTextColor={colors.textLight}
                        />

                        <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Meaning</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
                            value={suggestedMeaning}
                            onChangeText={setSuggestedMeaning}
                            placeholder="Correct meaning..."
                            placeholderTextColor={colors.textLight}
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={() => setSuggestModalVisible(false)}
                                variant="ghost"
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <Button
                                title="Submit Proposal"
                                onPress={async () => {
                                    if (!suggestedWord.trim() || !suggestedMeaning.trim()) {
                                        Alert.alert("Error", "Fields cannot be empty");
                                        return;
                                    }
                                    try {
                                        setSuggestModalVisible(false);
                                        await createEditProposal({
                                            originalEntryId: item.id,
                                            originalWord: item.word,
                                            originalMeaning: item.meaning,
                                            suggestedWord: suggestedWord,
                                            suggestedMeaning: suggestedMeaning
                                        });
                                        showModal({
                                            type: 'success',
                                            title: 'Proposal Sent',
                                            message: 'Your edit suggestion has been submitted for community review.', // This matches the user request for +1 logic on frontend implicitly by just creating it
                                            onPrimaryAction: hideModal
                                        });
                                    } catch (e) {
                                        console.error(e);
                                        Alert.alert("Error", "Could not create proposal");
                                    }
                                }}
                                variant="primary"
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
                {/* Re-using ActionModal for success/error feedback inside/over this modal context usually requires global modal or nested handling. 
                    For now valid since ActionModal is at parent level. */}
            </Modal>
        );
    };

    return (
        <>
            <Animated.View
                layout={Layout.springify().damping(50).mass(1)} // High damping = less wiggle
                style={[
                    styles.cardContainer,
                    { backgroundColor: colors.surface, shadowColor: colors.shadow || '#000' },
                    expanded && { borderColor: colors.primary + '30', shadowOpacity: 0.12 }
                ]}
            >
                <TouchableOpacity
                    style={styles.touchableArea}
                    activeOpacity={0.9}
                    onPress={toggleExpand}
                >
                    {/* HEADLINE: Word (Left) & Meaning (Right) always side-by-side */}
                    <View style={styles.headerRow}>

                        {/* LEFT: Word + Dialect + Status */}
                        <View style={styles.wordSection}>
                            <HighlightText
                                text={item.word}
                                term={searchTerm}
                                baseStyle={[
                                    styles.wordText,
                                    { color: colors.text },
                                    expanded && styles.wordTextExpanded
                                ]}
                                highlightStyle={[styles.highlight, { color: colors.primary }]}
                            />

                            {/* Dialect moved here under the word */}
                            <View style={[styles.badge, { backgroundColor: colors.background, alignSelf: 'flex-start' }]}>
                                <Text style={[styles.badgeText, { color: colors.textLight }]}>{item.dialect}</Text>
                            </View>

                            {!expanded && (
                                <Animated.View entering={FadeIn} exiting={FadeOut}>
                                    <View style={[styles.statusPill, { backgroundColor: colors.background }]}>
                                        <View style={[styles.statusDot, { backgroundColor: hasAudio ? colors.success : colors.textLight }]} />
                                        <Text style={[styles.statusText, { color: colors.textLight }]}>
                                            {hasAudio ? 'Audio Available' : 'No Audio'}
                                        </Text>
                                    </View>
                                </Animated.View>
                            )}
                        </View>

                        {/* RIGHT: Meaning (Emphasized) */}
                        <View style={styles.meaningSection}>
                            <HighlightText
                                text={item.meaning}
                                term={searchTerm}
                                baseStyle={expanded
                                    ? [styles.meaningExpanded, { color: colors.text }]
                                    : [styles.meaningCollapsed, { color: colors.text }]
                                }
                                highlightStyle={[styles.highlight, { color: colors.primary }]}
                            />
                        </View>
                    </View>

                    {/* BOTTOM: Expanded Body (Audio + Similar Words) */}
                    {expanded && (
                        <Animated.View
                            entering={FadeIn.delay(100).duration(200)}
                            exiting={FadeOut.duration(150)}
                            style={[styles.expandedBody, { borderTopColor: colors.border + '40' }]}
                        >
                            {/* Audio Section */}
                            {hasAudio ? (
                                <AudioPlayer audioURL={item.audioURL} color={colors.primary} />
                            ) : (
                                <View style={styles.missingAudioContainer}>
                                    <View style={styles.missingContent}>
                                        <Ionicons name="mic-off-outline" size={20} color="#991B1B" />
                                        <Text style={styles.missingTitle}>No pronunciation yet</Text>
                                    </View>

                                    {/* Suggest Edit button for Elders */}
                                    {(userRole === 'Elder' || userRole === 'elder') && (
                                        <TouchableOpacity onPress={() => {
                                            setSuggestedWord(item.word);
                                            setSuggestedMeaning(item.meaning);
                                            setSuggestModalVisible(true);
                                        }} style={styles.editBtn}>
                                            <Ionicons name="create" size={20} color={colors.primary} />
                                        </TouchableOpacity>)}
                                </View>
                            )}

                            {/* Similar Words */}
                            <View style={styles.connectionsContainer}>
                                <Text style={[styles.connectionsTitle, { color: colors.textLight }]}>Similar Words</Text>
                                <View style={styles.chipContainer}>
                                    {loadingRelated ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : relatedWords.map((related) => (
                                        <TouchableOpacity
                                            key={related.id}
                                            style={[styles.relatedChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                                            onPress={() => onRelatedPress(related.word)}
                                        >
                                            <Text style={[styles.relatedChipText, { color: colors.text }]}>{related.word}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    {!loadingRelated && relatedWords.length === 0 && (
                                        <Text style={[styles.noRelatedText, { color: colors.textLight }]}>No similar words found.</Text>
                                    )}
                                </View>
                            </View>
                        </Animated.View>
                    )}
                </TouchableOpacity>
            </Animated.View>

            {renderSuggestModal()}
        </>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: LAYOUT.borderRadius.m,
        marginBottom: SPACING.m,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    touchableArea: {
        padding: SPACING.m,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    wordSection: {
        flex: 1, // Take available space
        paddingRight: 10,
        justifyContent: 'center',
    },
    wordText: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    wordTextExpanded: {
        fontSize: 26, // Even Bigger
        marginBottom: 4,
    },
    highlight: {
        fontWeight: '900',
        textDecorationLine: 'underline',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    meaningSection: {
        flex: 1, // Allow translation to expand
        alignItems: 'flex-end', // Keep right aligned
        paddingTop: 4,
    },
    meaningCollapsed: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'right',
    },
    meaningExpanded: {
        fontSize: 22, // Bigger
        fontWeight: '400',
        fontStyle: 'italic',
        textAlign: 'right',
        marginBottom: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 4,
        marginBottom: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800', // Bolder implementation
        textTransform: 'uppercase',
    },
    expandedBody: {
        paddingTop: SPACING.m, // Reduced padding
        marginTop: SPACING.m,
        borderTopWidth: 1,
        marginBottom: 0, // Removed bottom margin to reduce gap
    },
    audioPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.s,
        borderRadius: LAYOUT.borderRadius.s,
    },
    playIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    audioTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        marginRight: SPACING.sm,
    },
    audioWaveform: {
        width: '60%',
        height: '100%',
        borderRadius: 2,
    },
    audioLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 8, // Added gap
    },
    missingAudioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FEF2F2',
        padding: SPACING.s,
        borderRadius: LAYOUT.borderRadius.s,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    missingContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    missingTitle: {
        marginLeft: 8,
        color: '#991B1B',
        fontWeight: '600',
        fontSize: 13,
    },
    connectionsContainer: {
        marginTop: SPACING.m,
        marginBottom: -8, // Pull up bottom space
    },
    connectionsTitle: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.s,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    relatedChip: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    relatedChipText: {
        fontSize: 13,
    },
    noRelatedText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 12,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: 16,
    },
    separator: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 16,
    },
    inputLabel: {
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    }
});
