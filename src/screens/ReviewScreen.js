import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, LAYOUT } from '../constants/theme';
import Button from '../components/Button';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, limit, getDocs, doc, updateDoc, deleteDoc, getDoc, runTransaction, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Card from '../components/Card';
import { playAudio } from '../services/AudioService';
import { usePreferences } from '../context/PreferencesContext';
import { useNavigation } from '@react-navigation/native';

export default function ReviewScreen() {
    const navigation = useNavigation();
    const { colors } = usePreferences();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sound, setSound] = useState(null);
    const [isReviewer, setIsReviewer] = useState(false);
    const [userStats, setUserStats] = useState({ verifiedCount: 0 });

    useEffect(() => {
        checkEligibility();
    }, []);

    useEffect(() => {
        if (isReviewer) {
            fetchPendingEntries();
        }
    }, [isReviewer]);

    const checkEligibility = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                // 1. Check if Admin (always allowed)
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().isAdmin) {
                    setIsReviewer(true);
                    setLoading(false);
                    return;
                }

                // 2. Check Community Reputation (Must have >10 verified words)
                const q = query(
                    collection(db, 'entries'),
                    where('contributorId', '==', user.uid),
                    where('status', '==', 'verified')
                );
                const snapshot = await getDocs(q);
                const verifiedCount = snapshot.size;

                setUserStats({ verifiedCount });

                if (verifiedCount >= 10) {
                    setIsReviewer(true);
                }
            } catch (err) {
                console.error("Eligibility check failed", err);
            }
        }
        setLoading(false);
    };

    const fetchPendingEntries = async () => {
        try {
            // Fetch entries that are pending AND that I haven't voted on
            const q = query(
                collection(db, 'entries'),
                where('status', '==', 'pending'),
                limit(10)
            );
            const querySnapshot = await getDocs(q);
            const list = [];
            const user = auth.currentUser;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Filter out own entries and already voted entries
                if (data.contributorId !== user.uid && !data.votes?.includes(user.uid)) {
                    list.push({ id: doc.id, ...data });
                }
            });
            setEntries(list);
        } catch (error) {
            console.error("Error fetching pending:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await fetchPendingEntries();
    }, []);

    const handleVote = async (id, isUpvote) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const entryRef = doc(db, 'entries', id);

            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(entryRef);
                if (!sfDoc.exists()) throw "Document does not exist!";

                const currentVotes = sfDoc.data().vote_count || 0;
                const newVoteCount = currentVotes + 1;

                transaction.update(entryRef, {
                    votes: arrayUnion(user.uid),
                    vote_count: newVoteCount
                });

                // COMMUNITY VALIDATION LOGIC
                // If 3 people verify it, it becomes official
                if (newVoteCount >= 3) {
                    transaction.update(entryRef, {
                        status: 'verified',
                        timestamp: serverTimestamp() // Update timestamp so delta sync picks it up
                    });
                }
            });

            Alert.alert("Voted", "Thank you for verifying!");
            setEntries(prev => prev.filter(e => e.id !== id));

        } catch (error) {
            console.error("Vote failed", error);
            Alert.alert("Error", "Could not submit vote.");
        }
    };

    const handleReject = async (id) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const entryRef = doc(db, 'entries', id);
            await updateDoc(entryRef, {
                status: 'deleted',
                timestamp: serverTimestamp()
            });
            Alert.alert("Rejected", "Entry has been removed.");
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch (error) {
            Alert.alert("Error", "Could not reject entry.");
        }
    };

    async function playSound(audioURL, id) {
        if (!audioURL) {
            Alert.alert("No Audio", "This entry does not have an audio recording.");
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await playAudio(audioURL, id);
    }

    // State for the item being edited
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ word: '', meaning: '' });

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ word: item.word, meaning: item.meaning });
    };

    const saveEdit = async () => {
        try {
            await updateDoc(doc(db, 'entries', editingId), {
                word: editForm.word,
                meaning: editForm.meaning
            });
            // Update local state
            setEntries(prev => prev.map(e =>
                e.id === editingId ? { ...e, word: editForm.word, meaning: editForm.meaning } : e
            ));
            setEditingId(null);
            Alert.alert("Updated", "Entry updated.");
        } catch (e) {
            Alert.alert("Error", "Could not save edits.");
        }
    };

    const renderItem = ({ item }) => {
        const isEditing = editingId === item.id;
        const hasAudio = item.audioURL && item.audioURL.trim() !== '';

        return (
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                {isEditing ? (
                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ color: colors.textLight, marginBottom: 5 }}>Word:</Text>
                        <TextInput
                            style={[styles.editInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            value={editForm.word}
                            onChangeText={(t) => setEditForm(prev => ({ ...prev, word: t }))}
                        />
                        <Text style={{ color: colors.textLight, marginBottom: 5, marginTop: 10 }}>Meaning:</Text>
                        <TextInput
                            style={[styles.editInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            value={editForm.meaning}
                            onChangeText={(t) => setEditForm(prev => ({ ...prev, meaning: t }))}
                        />
                        <View style={{ flexDirection: 'row', marginTop: 10 }}>
                            <Button title="Save" onPress={saveEdit} size="small" style={{ marginRight: 8 }} />
                            <Button title="Cancel" onPress={() => setEditingId(null)} variant="ghost" size="small" />
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.word, { color: colors.text }]}>{item.word}</Text>
                            <View style={styles.badgeRow}>
                                <Text style={[styles.dialect, { color: colors.textLight, backgroundColor: colors.inputBg }]}>{item.dialect}</Text>
                                {hasAudio && (
                                    <View style={[styles.audioBadge, { backgroundColor: colors.primary + '20' }]}>
                                        <Ionicons name="mic" size={10} color={colors.primary} />
                                    </View>
                                )}
                            </View>
                        </View>
                        <Text style={[styles.meaning, { color: colors.textLight }]}>{item.meaning}</Text>
                    </>
                )}

                {/* Audio controls - only show if audio exists */}
                {hasAudio ? (
                    <View style={styles.controls}>
                        <TouchableOpacity onPress={() => playSound(item.audioURL, item.id)} style={styles.playBtn}>
                            <Ionicons name="play-circle" size={32} color={colors.primary} />
                            <Text style={{ color: colors.primary, marginLeft: 4 }}>Listen</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.noAudioNotice, { backgroundColor: colors.inputBg }]}>
                        <Ionicons name="text-outline" size={16} color={colors.textLight} />
                        <Text style={[styles.noAudioText, { color: colors.textLight }]}>Text-only entry (no audio)</Text>
                    </View>
                )}

                {!isEditing && (
                    <View style={styles.actionRow}>
                        <View style={styles.mainActions}>
                            <Button
                                title="Reject"
                                onPress={() => handleReject(item.id)}
                                variant="danger"
                                size="small"
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <Button
                                title="Vote Correct"
                                onPress={() => handleVote(item.id, true)}
                                variant="success"
                                style={{ flex: 1, backgroundColor: colors.success }}
                                size="small"
                            />
                        </View>
                        <TouchableOpacity onPress={() => startEdit(item)} style={styles.editBtn}>
                            <Ionicons name="pencil" size={20} color={colors.textLight} />
                        </TouchableOpacity>
                    </View>
                )}
            </Card>
        );
    };

    if (!isReviewer && !loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.l }]}>
                <Ionicons name="shield-checkmark-outline" size={64} color={colors.textLight} />
                <Text style={[styles.accessTitle, { color: colors.text }]}>Community Reviewer Access</Text>

                <View style={styles.progressContainer}>
                    <Text style={[styles.progressText, { color: colors.primary }]}>
                        You have {userStats.verifiedCount} / 10 verified contributions.
                    </Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.inputBg }]}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(userStats.verifiedCount * 10, 100)}%`, backgroundColor: colors.success }]} />
                    </View>
                </View>

                <Text style={[styles.accessDescription, { color: colors.textLight }]}>
                    To ensure quality, you must have at least 10 of your own words verified by the community before you can vote on others.
                </Text>

                <Button
                    title="Contribute More Words"
                    onPress={() => navigation.navigate('Contribute')}
                    style={{ marginTop: SPACING.xl }}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.primary }]}>Review Queue</Text>
                <Text style={[styles.subtitle, { color: colors.textLight }]}>{entries.length} Pending Entries</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} />
            ) : (
                <FlatList
                    data={entries}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                            progressBackgroundColor={colors.surface}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.border} />
                            <Text style={[styles.empty, { color: colors.textLight }]}>No pending entries. Great job!</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: SPACING.l,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    list: {
        padding: SPACING.m,
    },
    card: {
        marginBottom: SPACING.m,
        padding: SPACING.m,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    word: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    dialect: {
        fontSize: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    meaning: {
        fontSize: 16,
        marginBottom: SPACING.m,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    playBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    audioBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noAudioNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.s,
        borderRadius: LAYOUT.borderRadius.s,
        marginBottom: SPACING.m,
        gap: 8,
    },
    noAudioText: {
        fontSize: 12,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mainActions: {
        flex: 1,
        flexDirection: 'row',
    },
    editBtn: {
        padding: 8,
        marginLeft: 4,
    },
    editInput: {
        padding: 8,
        borderRadius: 4,
        fontSize: 16,
        borderWidth: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: SPACING.xxl,
    },
    empty: {
        textAlign: 'center',
        marginTop: SPACING.m,
    },
    accessTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    accessDescription: {
        textAlign: 'center',
        marginTop: 16,
        fontSize: 16,
        lineHeight: 24,
    },
    progressContainer: {
        width: '100%',
        marginTop: SPACING.l,
        alignItems: 'center',
    },
    progressText: {
        marginBottom: 8,
        fontWeight: 'bold',
    },
    progressBarBg: {
        width: '80%',
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
    }
});

