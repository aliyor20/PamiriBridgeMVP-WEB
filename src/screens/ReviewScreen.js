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
import ActionModal from '../components/ActionModal';
import { fetchPendingEditProposals, voteEditProposal } from '../services/EditProposals';

export default function ReviewScreen({ embedded = false }) {
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

    // ... (rest of logic)

    const Container = embedded ? View : SafeAreaView;
    const containerProps = embedded ? { style: styles.container } : { style: [styles.container, { backgroundColor: colors.background }], edges: ['top'] };


    // --- MODAL STATE ---
    const [modal, setModal] = useState({
        visible: false,
        type: 'info',
        title: '',
        message: '',
        primaryActionLabel: '',
        onPrimaryAction: () => { },
        secondaryActionLabel: '',
        onSecondaryAction: () => { }
    });

    const showModal = (config) => {
        setModal({ ...config, visible: true });
    };

    const hideModal = () => {
        setModal(prev => ({ ...prev, visible: false }));
    };

    const checkEligibility = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.data();

                // 1. Check if Admin (always allowed)
                if (userData?.isAdmin || userData?.role === 'admin') {
                    setIsReviewer(true);
                    setLoading(false);
                    return;
                }

                // 2. Check if already a Guide or Elder
                if (userData?.status === 'Guide' || userData?.status === 'Elder' || userData?.role === 'guide' || userData?.role === 'elder') {
                    setIsReviewer(true);
                    // Still fetch stats for display
                    countVerifiedWords(user.uid);
                    setLoading(false);
                    return;
                }

                // 3. Check qualification for upgrade
                const verifiedCount = await countVerifiedWords(user.uid);

                if (verifiedCount >= 20) {
                    // UPGRADE TO ELDER
                    if (userData?.status !== 'Elder') {
                        await updateDoc(userDocRef, {
                            status: 'Elder'
                        });
                        showModal({
                            type: 'success',
                            title: 'Status Upgraded: ELDER',
                            message: "You have reached 20+ verified words! You are now an Elder. You can suggest edits to existing words.",
                            onPrimaryAction: hideModal
                        });
                    }
                    setIsReviewer(true);
                } else if (verifiedCount >= 10) {
                    // UPGRADE USER TO GUIDE
                    if (userData?.status !== 'Guide' && userData?.status !== 'Elder') {
                        await updateDoc(userDocRef, {
                            status: 'Guide'
                        });
                        showModal({
                            type: 'success',
                            title: 'Status Upgraded: GUIDE',
                            message: "You've been promoted to a Guide! You can now review other contributions.",
                            onPrimaryAction: hideModal
                        });
                    }
                    setIsReviewer(true);
                }
            } catch (err) {
                console.error("Eligibility check failed", err);
            }
        }
        setLoading(false);
    };

    const countVerifiedWords = async (uid) => {
        try {
            const q = query(
                collection(db, 'entries'),
                where('contributorId', '==', uid),
                where('status', '==', 'verified')
            );
            const snapshot = await getDocs(q);
            const count = snapshot.size;
            setUserStats({ verifiedCount: count });
            return count;
        } catch (e) {
            console.error(e);
            return 0;
        }
    };

    const fetchPendingEntries = async () => {
        try {
            const user = auth.currentUser;

            // 1. Fetch Key Entries (Pending New Words)
            const entriesQ = query(
                collection(db, 'entries'),
                where('status', '==', 'pending'),
                limit(10)
            );

            // 2. Fetch Edit Proposals (Pending Edits)
            // Note: We'll filter client-side for now or rely on the service

            let entriesSnap = { forEach: () => { } };
            let proposalsData = [];

            try {
                entriesSnap = await getDocs(entriesQ);
            } catch (e) {
                console.error("Failed to fetch entries", e);
                // If entries fail, throw so we show error state? Or just continue empty
                throw e;
            }

            try {
                proposalsData = await fetchPendingEditProposals();
            } catch (e) {
                console.warn("Failed to fetch edit proposals (check rules deployment):", e);
                // Continue with empty proposals to avoid blocking the UI
            }

            const list = [];

            // Process Entries
            entriesSnap.forEach((doc) => {
                const data = doc.data();
                if (data.contributorId !== user.uid && !data.votes?.includes(user.uid)) {
                    list.push({ type: 'entry', id: doc.id, ...data });
                }
            });

            // Process Proposals
            // Filter out ones I created or already voted on (if we tracked individual votes in arrays, 
            // but the schema only has counts. We strictly might need subcollections for votes to prevent double voting 
            // or just rely on local state/optimism for MVP if schema prevents exact tracking. 
            // The current schema: votes_for (number). 
            // For MVP, we will show them. Real app needs 'voters' array in proposal.)
            proposalsData.forEach(p => {
                // TEMPORARY FOR TESTING: Allow reviewing own proposals
                // if (p.suggesterId !== user.uid) {
                list.push({ type: 'proposal', ...p });
                // }
            });

            // random shuffle or sort by date? 
            // Let's sort by date descending
            list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

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

                const data = sfDoc.data();

                // Strict validation: Check if already voted (in either array)
                const hasVoted = data.votes?.includes(user.uid);
                const hasRejected = data.rejections?.includes(user.uid);

                if (hasVoted || hasRejected) {
                    throw "You have already voted on this entry.";
                }

                const currentVotes = data.vote_count || 0;
                const newVoteCount = currentVotes + 1;

                // Prepare positive vote update
                const updateData = {
                    votes: arrayUnion(user.uid),
                    vote_count: newVoteCount
                };

                // Automatic verification if positive threshold reached (7)
                if (newVoteCount >= 7) {
                    updateData.status = 'verified';
                    updateData.timestamp = serverTimestamp();
                }

                transaction.update(entryRef, updateData);
            });

            showModal({
                type: 'success',
                title: 'Vote Submitted',
                message: 'Thank you for verifying this entry.',
                onPrimaryAction: hideModal
            });
            setEntries(prev => prev.filter(e => e.id !== id));

        } catch (error) {
            console.error("Vote failed", error);
            const msg = typeof error === 'string' ? error : "Could not submit vote.";
            showModal({
                type: 'error',
                title: 'Vote Failed',
                message: msg,
                onPrimaryAction: hideModal
            });
        }
    };

    const handleRejectVote = async (id) => {
        const user = auth.currentUser;
        if (!user) return;

        showModal({
            type: 'confirm',
            title: 'Reject Entry?',
            message: 'Are you sure this word is incorrect? This will count as a rejection vote.',
            primaryActionLabel: 'Yes, Reject',
            onPrimaryAction: () => confirmReject(id),
            secondaryActionLabel: 'Cancel',
            onSecondaryAction: hideModal
        });
    };

    const confirmReject = async (id) => {
        hideModal();
        const user = auth.currentUser;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const entryRef = doc(db, 'entries', id);

            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(entryRef);
                if (!sfDoc.exists()) throw "Document does not exist!";

                const data = sfDoc.data();

                // Check if already voted
                const hasVoted = data.votes?.includes(user.uid);
                const hasRejected = data.rejections?.includes(user.uid);

                if (hasVoted || hasRejected) {
                    throw "You have already voted on this entry.";
                }

                const currentRejections = data.rejection_count || 0;
                const newRejectionCount = currentRejections + 1;

                const updateData = {
                    rejections: arrayUnion(user.uid),
                    rejection_count: newRejectionCount
                };

                // Reject threshold (3)
                if (newRejectionCount >= 3) {
                    updateData.status = 'rejected';
                    updateData.timestamp = serverTimestamp();
                }

                transaction.update(entryRef, updateData);
            });

            // Brief success feedback could be nice, but simple removal is often enough for lists
            // showModal({ type: 'success', title: 'Voted', message: 'Rejection vote submitted.', onPrimaryAction: hideModal });
            setEntries(prev => prev.filter(e => e.id !== id));

        } catch (error) {
            console.error("Reject vote failed", error);
            const msg = typeof error === 'string' ? error : "Could not submit vote.";
            showModal({
                type: 'error',
                title: 'Vote Failed',
                message: msg,
                onPrimaryAction: hideModal
            });
        }
    };

    const handleProposalVote = async (proposalId, isApprove) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await voteEditProposal(proposalId, isApprove);

            showModal({
                type: 'success',
                title: isApprove ? 'Approved' : 'Discarded',
                message: isApprove ? 'You voted to approve this edit.' : 'You voted to discard this edit.',
                onPrimaryAction: hideModal
            });

            // Remove from list locally
            setEntries(prev => prev.filter(e => e.id !== proposalId));

        } catch (error) {
            console.error("Proposal vote failed", error);
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Could not submit vote.',
                onPrimaryAction: hideModal
            });
        }
    };

    async function playSound(audioURL, id) {
        if (!audioURL) {
            showModal({
                type: 'info',
                title: 'No Audio',
                message: 'This entry does not have an audio recording.',
                onPrimaryAction: hideModal
            });
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
            showModal({
                type: 'success',
                title: 'Updated',
                message: 'Entry updated successfully.',
                onPrimaryAction: hideModal
            });
        } catch (e) {
            showModal({
                type: 'error',
                title: 'Error',
                message: 'Could not save edits.',
                onPrimaryAction: hideModal
            });
        }
    };

    const renderItem = ({ item }) => {
        if (item.type === 'proposal') {
            return renderProposalCard(item);
        }

        // --- STANDARD ENTRY CARD ---
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
                            <View>
                                {/* Tag for New Entry */}
                                <View style={[styles.typeTag, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.typeTagText, { color: colors.primary }]}>NEW WORD</Text>
                                </View>
                                <Text style={[styles.word, { color: colors.text }]}>{item.word}</Text>
                                <Text style={[styles.meaning, { color: colors.textLight, marginTop: 4 }]}>{item.meaning}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <View style={styles.badgeRow}>
                                    <Text style={[styles.dialect, { color: colors.textLight, backgroundColor: colors.inputBg }]}>{item.dialect}</Text>
                                    {hasAudio && (
                                        <View style={[styles.audioBadge, { backgroundColor: colors.primary + '20' }]}>
                                            <Ionicons name="mic" size={10} color={colors.primary} />
                                        </View>
                                    )}
                                </View>
                                <View style={[styles.voteProgressBadge, { backgroundColor: colors.primary + '15' }]}>
                                    <Text style={[styles.voteProgressBadgeText, { color: colors.primary }]}>
                                        {item.vote_count || 0}/7
                                    </Text>
                                </View>
                            </View>
                        </View>
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
                    <View>
                        <View style={styles.actionRow}>
                            <View style={styles.mainActions}>
                                <Button
                                    title="Reject"
                                    onPress={() => handleRejectVote(item.id)}
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
                            {/* Reviewers shouldn't necessarily edit NEW submissions directly, but if they are an admin/guide they might. 
                                keeping it for now. */}
                            <TouchableOpacity onPress={() => startEdit(item)} style={styles.editBtn}>
                                <Ionicons name="pencil" size={20} color={colors.textLight} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Card>
        );
    };

    const renderProposalCard = (item) => {
        // --- EDIT PROPOSAL CARD ---
        const diffWord = item.originalWord !== item.suggestedWord;
        const diffMeaning = item.originalMeaning !== item.suggestedMeaning;

        return (
            <Card style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.info, borderWidth: 1 }]}>
                <View style={[styles.cardHeader, { marginBottom: 12 }]}>
                    <View style={[styles.typeTag, { backgroundColor: colors.info + '20' }]}>
                        <Text style={[styles.typeTagText, { color: colors.info }]}>EDIT PROPOSAL</Text>
                    </View>
                    <View style={[styles.voteProgressBadge, { backgroundColor: colors.info + '15' }]}>
                        <Text style={[styles.voteProgressBadgeText, { color: colors.info }]}>
                            {item.votes_for || 0}/5
                        </Text>
                    </View>
                </View>

                {/* Diff View */}
                <View style={styles.diffContainer}>
                    {/* Word Comparison */}
                    <View style={styles.diffRow}>
                        <Text style={[styles.diffLabel, { color: colors.textLight }]}>Word:</Text>
                        <View style={styles.diffValues}>
                            <Text style={[styles.diffOriginal, { color: colors.textLight, textDecorationLine: diffWord ? 'line-through' : 'none' }]}>
                                {item.originalWord}
                            </Text>
                            {diffWord && (
                                <View style={styles.arrowContainer}>
                                    <Ionicons name="arrow-forward" size={14} color={colors.textLight} />
                                    <Text style={[styles.diffNew, { color: colors.text }]}>{item.suggestedWord}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Meaning comparison */}
                    <View style={[styles.diffRow, { marginTop: 8 }]}>
                        <Text style={[styles.diffLabel, { color: colors.textLight }]}>Meaning:</Text>
                        <View style={styles.diffValues}>
                            <Text style={[styles.diffOriginal, { color: colors.textLight, textDecorationLine: diffMeaning ? 'line-through' : 'none' }]}>
                                {item.originalMeaning}
                            </Text>
                            {diffMeaning && (
                                <View style={styles.arrowContainer}>
                                    <Ionicons name="arrow-forward" size={14} color={colors.textLight} />
                                    <Text style={[styles.diffNew, { color: colors.text }]}>{item.suggestedMeaning}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={[styles.actionRow, { marginTop: 16 }]}>
                    <Button
                        title="Discard"
                        onPress={() => handleProposalVote(item.id, false)}
                        variant="ghost"
                        size="small"
                        textColor={colors.error}
                        style={{ flex: 1, marginRight: 8, borderColor: colors.error, borderWidth: 1 }}
                    />
                    <Button
                        title="Approve Edit"
                        onPress={() => handleProposalVote(item.id, true)}
                        variant="filled" // Assuming 'filled' or default is primary
                        size="small"
                        style={{ flex: 1, backgroundColor: colors.info }}
                    />
                </View>
            </Card>
        );
    };

    if (!isReviewer && !loading) {
        return (
            <Container {...containerProps} style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: SPACING.l }]}>
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

                {!embedded && (
                    <Button
                        title="Contribute More Words"
                        onPress={() => navigation.navigate('Contribute')}
                        style={{ marginTop: SPACING.xl }}
                    />
                )}
            </Container>
        );
    }

    return (
        <Container {...containerProps} style={[styles.container, { backgroundColor: colors.background }]}>
            {!embedded && (
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.primary }]}>Review Queue</Text>
                    <Text style={[styles.subtitle, { color: colors.textLight }]}>{entries.length} Pending Entries</Text>
                </View>
            )}

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

            <ActionModal
                visible={modal.visible}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                primaryActionLabel={modal.primaryActionLabel}
                onPrimaryAction={modal.onPrimaryAction}
                secondaryActionLabel={modal.secondaryActionLabel}
                onSecondaryAction={modal.onSecondaryAction}
            />
        </Container>
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
    },
    voteProgressBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 6,
    },
    voteProgressBadgeText: {
        fontSize: 16,
        fontWeight: '700',
    },
    typeTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    typeTagText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    diffContainer: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: 12,
        borderRadius: 8,
    },
    diffRow: {
        marginBottom: 4,
    },
    diffLabel: {
        fontSize: 12,
        marginBottom: 2,
        fontWeight: '600',
    },
    diffValues: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    diffOriginal: {
        fontSize: 16,
        marginRight: 8,
    },
    arrowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    diffNew: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 4,
        backgroundColor: 'rgba(34, 197, 94, 0.1)', // Light green
        paddingHorizontal: 4,
        borderRadius: 4,
    }
});

