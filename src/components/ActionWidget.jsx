import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../lib/firebase';
import { collection, query, where, limit, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { voteOnEntry } from '../lib/firebaseService';
import { Send, SkipForward, Check, X, Loader, Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import '../styles/glass.css';

const BATCH_SIZE = 5;
const COOLDOWN_MINUTES = 2;
const MAX_SKIPS = 3;

export default function ActionWidget() {
    const { user, userProfile } = useAuth();
    const { t, language } = useLanguage();

    const [activeTab, setActiveTab] = useState('contribute'); // 'contribute' or 'verify'

    // Guided Contribution State
    const [wordPool, setWordPool] = useState([]);
    const [currentBatch, setCurrentBatch] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isFetching, setIsFetching] = useState(false);

    const [contributedCount, setContributedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);
    const [cooldownTime, setCooldownTime] = useState(null);

    // Verification State
    const [pendingEntries, setPendingEntries] = useState([]);
    const [verifyingIndex, setVerifyingIndex] = useState(0);
    const [isFetchingVerify, setIsFetchingVerify] = useState(false);
    const [votingId, setVotingId] = useState(null);

    const isElderOrHigher = userProfile && ['elder', 'guide', 'pioneer'].includes(userProfile.role);
    const defaultDialect = userProfile?.dialect || 'Shughni';

    // Cooldown Timer Logic
    useEffect(() => {
        if (!cooldownTime) return;
        const interval = setInterval(() => {
            if (Date.now() >= cooldownTime) {
                setCooldownTime(null);
                setSkippedCount(0);
                setContributedCount(0);
                fetchWords(); // Auto-fetch when cooldown ends
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldownTime]);


    // Initial Fetch
    useEffect(() => {
        if (user && !cooldownTime) {
            fetchWords();
        }
    }, [user]);

    useEffect(() => {
        if (isElderOrHigher) {
            fetchVerificationQueue();
        }
    }, [isElderOrHigher]);


    const fetchWords = async () => {
        if (isFetching || cooldownTime) return;
        try {
            setIsFetching(true);
            const q = query(
                collection(db, 'entries'),
                where('status', '==', 'needs_translation'),
                limit(15) // Fetch 15 to have a buffer
            );
            const snapshot = await getDocs(q);
            const words = [];
            snapshot.forEach(doc => {
                words.push({ id: doc.id, ...doc.data() });
            });

            // Randomize slightly so different users don't see exact same order if picking from top 15
            words.sort(() => 0.5 - Math.random());

            setWordPool(words);

            if (words.length > 0) {
                setCurrentBatch(words.slice(0, BATCH_SIZE));
                setCurrentIndex(0);
                setContributedCount(0);
                setSkippedCount(0);
            } else {
                setCurrentBatch([]);
            }
        } catch (error) {
            console.error("Error fetching needs_translation:", error);
        } finally {
            setIsFetching(false);
        }
    };

    const fetchVerificationQueue = async () => {
        try {
            setIsFetchingVerify(true);
            const q = query(
                collection(db, 'entries'),
                where('status', '==', 'pending'),
                limit(10)
            );
            const snapshot = await getDocs(q);
            const words = [];
            snapshot.forEach(d => {
                const data = d.data();
                if (data.contributorId !== user?.uid && (!data.voters || !data.voters.includes(user?.uid))) {
                    words.push({ id: d.id, ...data });
                }
            });
            setPendingEntries(words);
            setVerifyingIndex(0);
        } catch (error) {
            console.error(error);
        } finally {
            setIsFetchingVerify(false);
        }
    };

    const handleNextContribution = async () => {
        setInputValue('');

        const nextIndex = currentIndex + 1;
        if (nextIndex < currentBatch.length) {
            setCurrentIndex(nextIndex);
        } else {
            // Batch Finished
            if (skippedCount > MAX_SKIPS) {
                // Trigger Cooldown
                setCooldownTime(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
                setCurrentBatch([]);
            } else {
                // Refill from pool
                const remainingPool = wordPool.filter(w => !currentBatch.find(cb => cb.id === w.id));
                if (remainingPool.length >= BATCH_SIZE) {
                    const newBatch = remainingPool.slice(0, BATCH_SIZE);
                    setWordPool(remainingPool);
                    setCurrentBatch(newBatch);
                    setCurrentIndex(0);
                    setContributedCount(0);
                    setSkippedCount(0);
                } else {
                    // Need to fetch fresh
                    await fetchWords();
                }
            }
        }
    };

    const handleSkip = () => {
        setSkippedCount(prev => prev + 1);
        handleNextContribution();
    };

    const handleSubmitContribution = async () => {
        if (!inputValue.trim()) return;
        const targetDoc = currentBatch[currentIndex];

        try {
            const docRef = doc(db, 'entries', targetDoc.id);
            await updateDoc(docRef, {
                word: inputValue.trim().toLowerCase(),
                status: 'pending',
                dialect: defaultDialect,
                contributorId: user.uid,
                updatedAt: serverTimestamp()
            });

            setContributedCount(prev => prev + 1);
            handleNextContribution();
        } catch (error) {
            console.error("Submit failed", error);
        }
    };

    const handleVoteNext = async (isApproved) => {
        const targetDoc = pendingEntries[verifyingIndex];
        setVotingId(targetDoc.id);
        try {
            await voteOnEntry(targetDoc.id, user.uid, isApproved);
            // Move to next
            const nextIdx = verifyingIndex + 1;
            if (nextIdx < pendingEntries.length) {
                setVerifyingIndex(nextIdx);
            } else {
                fetchVerificationQueue(); // Refill
            }
        } catch (error) {
            console.error("Vote failed", error);
        } finally {
            setVotingId(null);
        }
    };


    const renderCooldown = () => {
        if (!cooldownTime) return null;
        const secondsLeft = Math.ceil((cooldownTime - Date.now()) / 1000);
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel"
                style={{
                    padding: '24px',
                    borderRadius: '24px',
                    textAlign: 'center',
                    background: 'rgba(255, 82, 82, 0.05)',
                    border: '1px solid rgba(255, 82, 82, 0.2)'
                }}
            >
                <div style={{ color: '#ff5252', marginBottom: '12px' }}>
                    <Loader className="spin" size={32} />
                </div>
                <h3 className="serif" style={{ color: 'var(--color-text)', marginBottom: '8px' }}>Breather Time</h3>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    You've skipped a few! Take a short breather before tackling the next batch formatting.
                </p>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                    {mins}:{secs.toString().padStart(2, '0')}
                </div>
            </motion.div>
        );
    };

    const renderContributionView = () => {
        if (cooldownTime) return renderCooldown();
        if (isFetching) return <div style={{ textAlign: 'center', padding: '2rem' }}><Loader className="spin" color="var(--color-primary)" /></div>;

        const currentItem = currentBatch[currentIndex];

        if (!currentItem) {
            return (
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
                    <Globe size={32} color="var(--color-primary-light)" style={{ marginBottom: '12px' }} />
                    <h3 className="serif" style={{ color: 'var(--color-text)' }}>All Caught Up!</h3>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>We don't have any pending words needing translation right now. Check back later!</p>
                </div>
            );
        }

        // Determine which language to prompt with based on AppLanguage
        const promptWord = language === 'ru' && currentItem.ru ? currentItem.ru : (currentItem.en || currentItem.ru);

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
                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Guided Contribution
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                {currentIndex + 1} / {BATCH_SIZE}
                            </span>
                        </div>

                        <div>
                            <p style={{ color: 'var(--color-text)', fontSize: '1.1rem', margin: 0 }}>
                                How do you say <strong style={{ color: 'var(--color-primary)', fontSize: '1.3rem' }}>{promptWord}</strong> in <strong style={{ color: 'var(--color-text-light)' }}>{defaultDialect}</strong>?
                            </p>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type translation..."
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitContribution(); }}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    outline: 'none',
                                    paddingRight: inputValue.length > 0 ? '60px' : '16px',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                            <AnimatePresence>
                                {inputValue.trim().length > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.5, right: '0px' }}
                                        animate={{ opacity: 1, scale: 1, right: '8px' }}
                                        exit={{ opacity: 0, scale: 0.5, right: '0px' }}
                                        onClick={handleSubmitContribution}
                                        style={{
                                            position: 'absolute',
                                            top: '8px',
                                            bottom: '8px',
                                            width: '40px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--color-primary)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(0,137,123,0.3)'
                                        }}
                                    >
                                        <Send size={18} />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={handleSkip}
                            className="glass-panel"
                            style={{
                                padding: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                background: 'transparent',
                                color: 'var(--color-text-light)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <SkipForward size={16} /> I don't know (Skip)
                        </button>
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    };

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

        // Target the strict definition first, fallback to root properties, finally fallback to meaning.
        const defEng = currentItem.definitions?.en || currentItem.en || '';
        const defRu = currentItem.definitions?.ru || currentItem.ru || '';
        const promptTarget = defEng || defRu || currentItem.meaning || "<Missing translation info>";

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
                            <span style={{ fontSize: '0.8rem', color: '#4DB6AC', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Verification
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                {verifyingIndex + 1} / {pendingEntries.length}
                            </span>
                        </div>

                        <div>
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
            {/* Header / Tabs */}
            {isElderOrHigher && (
                <div style={{ display: 'flex', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '16px' }}>
                    <button
                        onClick={() => setActiveTab('contribute')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: activeTab === 'contribute' ? 'var(--color-surface)' : 'transparent',
                            border: 'none',
                            borderRadius: '12px',
                            color: activeTab === 'contribute' ? 'var(--color-primary)' : 'var(--color-text-light)',
                            fontWeight: activeTab === 'contribute' ? 'bold' : 'normal',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                    >
                        Contribute
                    </button>
                    <button
                        onClick={() => setActiveTab('verify')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: activeTab === 'verify' ? 'var(--color-surface)' : 'transparent',
                            border: 'none',
                            borderRadius: '12px',
                            color: activeTab === 'verify' ? 'var(--color-primary)' : 'var(--color-text-light)',
                            fontWeight: activeTab === 'verify' ? 'bold' : 'normal',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        Verify {pendingEntries.length > 0 && <span style={{ background: 'var(--color-primary)', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>{pendingEntries.length}</span>}
                    </button>
                </div>
            )}

            {/* Content Area */}
            {activeTab === 'contribute' ? renderContributionView() : renderVerificationView()}
        </div>
    );
}
