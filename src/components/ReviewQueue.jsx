import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { voteOnEntry } from '../lib/firebaseService';
import { Check, X, Loader, ShieldAlert } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

export default function ReviewQueue() {
    const { user, userProfile } = useAuth();
    const { addToast } = useToast();

    const [pendingEntries, setPendingEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [votingId, setVotingId] = useState(null);

    useEffect(() => {
        fetchPendingQueue();
    }, []);

    const fetchPendingQueue = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'entries'),
                where('status', '==', 'pending'),
                // We'll limit to 20 for performance, ideally we order by timestamp 
                // but requiring a composite index might break immediately if not created.
                limit(20)
            );

            const snapshot = await getDocs(q);
            const words = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Filter out entries the user already voted on OR submitted themselves
                if (data.contributorId !== user.uid && (!data.voters || !data.voters.includes(user.uid))) {
                    words.push({ id: doc.id, ...data });
                }
            });

            // Sort client-side to avoid composite index requirement immediately
            words.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);
            setPendingEntries(words);
        } catch (error) {
            console.error("Error fetching queue:", error);
            addToast("Failed to load review queue.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (id, isApproved) => {
        if (votingId) return;
        setVotingId(id);

        try {
            await voteOnEntry(id, user.uid, isApproved);
            addToast(`Vote cast. +1 Karma!`, 'success');

            // Remove locally
            setPendingEntries(prev => prev.filter(entry => entry.id !== id));
        } catch (error) {
            console.error("Vote failed:", error);
            addToast("Failed to lock in vote.", "error");
        } finally {
            setVotingId(null);
        }
    };



    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Loader className="spin" size={32} color="var(--color-primary)" />
            </div>
        );
    }

    if (pendingEntries.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', textAlign: 'center' }}>
                <h3 className="serif" style={{ color: 'var(--color-text)', marginBottom: '8px' }}>You're all caught up!</h3>
                <p style={{ color: 'var(--color-text-light)' }}>There are no pending words for you to verify right now.</p>
            </div>
        );
    }

    return (
        <div className="review-queue-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--color-text-light)', textAlign: 'right', fontSize: '0.9rem' }}>
                {pendingEntries.length} words to review
            </p>

            {pendingEntries.map(entry => (
                <div key={entry.id} className="glass-panel" style={{
                    padding: '20px',
                    borderRadius: '20px',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                            <h3 className="serif" style={{ fontSize: '1.6rem', color: 'var(--color-text)', margin: 0 }}>
                                {entry.word}
                            </h3>
                            <span style={{
                                display: 'inline-block',
                                background: 'rgba(0,137,123,0.2)',
                                color: 'var(--color-primary-light)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                marginTop: '4px'
                            }}>
                                {entry.dialect}
                            </span>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        {entry.definitions?.en && (
                            <p style={{ fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: '4px' }}>
                                <span style={{ opacity: 0.6, fontSize: '0.8rem', marginRight: '8px', textTransform: 'uppercase' }}>EN</span>
                                {entry.definitions.en}
                            </p>
                        )}
                        {entry.definitions?.ru && (
                            <p style={{ fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: '4px' }}>
                                <span style={{ opacity: 0.6, fontSize: '0.8rem', marginRight: '8px', textTransform: 'uppercase' }}>RU</span>
                                {entry.definitions.ru}
                            </p>
                        )}
                        {/* Fallback for old data structure */}
                        {entry.meaning && !entry.definitions && (
                            <p style={{ fontSize: '1.1rem', color: 'var(--color-text)' }}>{entry.meaning}</p>
                        )}
                        {entry.example && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', fontStyle: 'italic', marginTop: '8px' }}>
                                "{entry.example}"
                            </p>
                        )}
                    </div>

                    {entry.audioURL && (
                        <div style={{ marginBottom: '20px' }}>
                            <AudioWaveform audioUrl={entry.audioURL} />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => handleVote(entry.id, false)}
                            disabled={votingId === entry.id}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 82, 82, 0.4)',
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
                            <X size={20} /> Reject
                        </button>

                        <button
                            onClick={() => handleVote(entry.id, true)}
                            disabled={votingId === entry.id}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
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
                            <Check size={20} /> Approve
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
