import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function VerificationQueue() {
    const { user, userProfile } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchQueue() {
            if (!user) return;
            try {
                setLoading(true);
                // Query "verification_queue" collection for pending items
                // Note: This collection needs to be populated by the mobile app or other sources.
                // If empty, we just show "No pending items".
                const q = query(collection(db, 'verification_queue'), where('status', '==', 'pending'));
                const querySnapshot = await getDocs(q);

                const queueItems = [];
                querySnapshot.forEach((doc) => {
                    queueItems.push({ id: doc.id, ...doc.data() });
                });

                setItems(queueItems);
            } catch (error) {
                console.error("Error fetching queue:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchQueue();
    }, [user]);

    const handleVote = async (itemId, voteType) => {
        try {
            const itemRef = doc(db, 'verification_queue', itemId);

            // Add vote to the 'votes' array or update a counter
            // Simplified: We assume a 'votes' array of objects { uid, vote, timestamp }
            await updateDoc(itemRef, {
                votes: arrayUnion({
                    uid: user.uid,
                    vote: voteType, // 'approve' or 'reject'
                    timestamp: new Date().toISOString()
                })
            });

            // Optimistically remove from list if user has voted (or just show "Voted")
            // For now, let's just mark it in local state
            setItems(items.map(i => i.id === itemId ? { ...i, userVoted: true } : i));

        } catch (error) {
            console.error("Error voting:", error);
            alert("Failed to submit vote.");
        }
    };

    if (!user) return <div className="container" style={{ paddingTop: '2rem' }}>Please log in.</div>;

    // Simple role check (allow everyone for now to test, or restrict to elders)
    // if (userProfile?.role !== 'elder' && userProfile?.role !== 'admin') {
    //   return <div className="container" style={{paddingTop: '2rem'}}>Access Restricted.</div>;
    // }

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <h1 style={{ color: 'var(--color-primary)' }}>Verification Queue</h1>
            <Link to="/profile" style={{ marginBottom: '1rem', display: 'inline-block' }}>&larr; Back to Profile</Link>

            {loading ? (
                <p>Loading queue...</p>
            ) : items.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    <p>No pending items to review.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {items.map(item => (
                        <div key={item.id} style={{
                            backgroundColor: 'var(--color-surface)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <strong>Entry ID: {item.entryId}</strong>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>By: {item.author || 'Unknown'}</span>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <p><strong>Proposed Change:</strong></p>
                                <pre style={{ backgroundColor: '#eee', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>
                                    {JSON.stringify(item.proposedChange || item, null, 2)}
                                </pre>
                            </div>

                            {item.userVoted ? (
                                <span style={{ color: 'green', fontWeight: 'bold' }}>Vote Submitted</span>
                            ) : (
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={() => handleVote(item.id, 'approve')} style={{
                                        backgroundColor: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', flex: 1
                                    }}>
                                        Approve
                                    </button>
                                    <button onClick={() => handleVote(item.id, 'reject')} style={{
                                        backgroundColor: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', flex: 1
                                    }}>
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
