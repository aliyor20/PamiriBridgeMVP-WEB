import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { voteOnEntry, voteOnEditProposal } from '../lib/firebaseService';
import { Check, X, Loader } from 'lucide-react';
import '../styles/glass.css';

export default function ActionWidget() {
    const { user, userProfile } = useAuth();

    // Verification State
    const [pendingEntries, setPendingEntries] = useState([]);
    const [verifyingIndex, setVerifyingIndex] = useState(0);
    const [isFetchingVerify, setIsFetchingVerify] = useState(false);
    const [votingId, setVotingId] = useState(null);

    const isElderOrHigher = !!userProfile; // Open verification to everyone

    const fetchVerificationQueue = async () => {
        setIsFetchingVerify(true);
        try {
            // Fetch a bigger batch to filter client-side since we can't easily query inverse array-contains
            const entriesQ = query(collection(db, 'entries'), where('status', '==', 'pending'), limit(15));
            const entriesSnap = await getDocs(entriesQ);

            const proposalsQ = query(collection(db, 'edit_proposals'), where('status', '==', 'pending'), limit(15));
            const proposalsSnap = await getDocs(proposalsQ);

            const items = [];

            entriesSnap.forEach(doc => {
                const data = doc.data();
                if (data.contributorId !== user?.uid && (!data.voters || !data.voters.includes(user?.uid))) {
                    items.push({ id: doc.id, type: 'new_entry', ...data });
                }
            });

            proposalsSnap.forEach(doc => {
                const data = doc.data();
                if (data.suggesterId !== user?.uid && (!data.voters || !data.voters.includes(user?.uid))) {
                    items.push({ id: doc.id, type: 'edit_proposal', ...data });
                }
            });

            // Randomize and put a small batch in the interactive queue
            setPendingEntries(items.sort(() => Math.random() - 0.5).slice(0, 5));
            setVerifyingIndex(0);
        } catch (e) {
            console.error('Error fetching verification queue:', e);
        } finally {
            setIsFetchingVerify(false);
        }
    };

    useEffect(() => {
        if (isElderOrHigher) {
            fetchVerificationQueue();
        }
    }, [isElderOrHigher]);

    const handleVoteNext = async (isUpvote) => {
        const currentItem = pendingEntries[verifyingIndex];
        if (!currentItem || !user) return;
        setVotingId(currentItem.id);
        try {
            if (currentItem.type === 'edit_proposal') {
                await voteOnEditProposal(currentItem.id, user.uid, isUpvote);
            } else {
                await voteOnEntry(currentItem.id, user.uid, isUpvote);
            }
            if (verifyingIndex < pendingEntries.length - 1) {
                setVerifyingIndex(prev => prev + 1);
            } else {
                fetchVerificationQueue();
            }
        } catch (error) {
            console.error("Error voting:", error);
        } finally {
            setVotingId(null);
        }
    };

    if (!isElderOrHigher) {
        return null;
    }

    const renderVerificationView = () => {
        if (isFetchingVerify) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader className="spin" color="var(--color-primary)" /></div>;

        const currentItem = pendingEntries[verifyingIndex];

        if (!currentItem) {
            return (
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
                    <Check size={32} color="var(--color-primary-light)" style={{ marginBottom: '12px' }} />
                    <h3 className="serif" style={{ color: 'var(--color-text)' }}>Queue is empty</h3>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>No pending words left to verify.</p>
                </div>
            );
        }

        const isEdit = currentItem.type === 'edit_proposal';
        const defEng = currentItem.definitions?.en || currentItem.en || '';
        const defRu = currentItem.definitions?.ru || currentItem.ru || '';
        const promptTarget = defEng || defRu || currentItem.meaning || "<Missing translation info>";
        const votingCount = isEdit ? (currentItem.votes_for || 0) : (currentItem.upvotes || 0);

        return (
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={currentItem.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50, filter: 'blur(5px)' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="glass-panel"
                        style={{
                            padding: '24px',
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            background: 'linear-gradient(145deg, rgba(0, 137, 123, 0.05) 0%, rgba(0, 0, 0, 0.1) 100%)',
                            boxShadow: '0 8px 32px rgba(0,137,123,0.05)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: isEdit ? '#FFA726' : '#4DB6AC', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {isEdit ? 'Edit Proposal' : 'Verification'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: isEdit ? '#FFB74D' : 'var(--color-primary-light)', background: isEdit ? 'rgba(255, 167, 38, 0.1)' : 'rgba(0,137,123,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                                {votingCount} / 3 Votes
                            </span>
                        </div>

                        <div>
                            {isEdit ? (
                                <>
                                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', margin: 0, marginBottom: '8px' }}>
                                        Original Word: <span style={{ textDecoration: 'line-through', marginRight: '8px' }}>{currentItem.originalWord}</span> → <span style={{ color: '#FFA726', fontWeight: 'bold' }}>{currentItem.suggestedWord}</span>
                                    </p>
                                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', margin: 0, marginBottom: '8px' }}>
                                        Original Meaning: <span style={{ textDecoration: 'line-through' }}>{currentItem.originalMeaning}</span>
                                    </p>
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        marginTop: '12px'
                                    }}>
                                        <span style={{ display: 'block', fontSize: '0.8rem', color: '#FFB74D', marginBottom: '4px' }}>
                                            Suggested Meaning:
                                        </span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
                                            {currentItem.suggestedMeaning}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', margin: 0, marginBottom: '4px' }}>
                                        This word translates to:
                                    </p>
                                    <h3 className="serif" style={{ fontSize: '1.4rem', color: 'var(--color-text)', margin: 0, marginBottom: '12px' }}>
                                        {promptTarget}
                                    </h3>

                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-primary-light)', marginBottom: '4px' }}>
                                            {currentItem.dialect} Translation:
                                        </span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                                            {currentItem.word}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button
                                onClick={() => handleVoteNext(false)}
                                disabled={votingId === currentItem.id}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 82, 82, 0.3)',
                                    background: 'rgba(255, 82, 82, 0.1)',
                                    color: '#ff5252',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontWeight: 'bold',
                                    cursor: votingId ? 'wait' : 'pointer'
                                }}
                            >
                                <X size={20} /> Disagree
                            </button>

                            <button
                                onClick={() => handleVoteNext(true)}
                                disabled={votingId === currentItem.id}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: 'none',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontWeight: 'bold',
                                    cursor: votingId ? 'wait' : 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,137,123,0.3)'
                                }}
                            >
                                <Check size={20} /> Agree
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '2rem' }}>
            {renderVerificationView()}
        </div>
    );
}
