import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { db, storage } from '../lib/firebase';
import { collection, query, where, limit, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, SkipForward, Loader, Globe, Mic, Square, Check } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import { useToast } from '../context/ToastContext';
import '../styles/glass.css';

const BATCH_SIZE = 5;
const COOLDOWN_MINUTES = 2;
const MAX_SKIPS = 3;

export default function GuidedContributionWidget() {
    const { user, userProfile } = useAuth();
    const { language } = useLanguage();
    const { addToast } = useToast();

    const {
        isRecording,
        stream,
        audioBlob,
        startRecording,
        stopRecording,
        clearRecording
    } = useAudioRecorder();

    const [wordPool, setWordPool] = useState([]);
    const [currentBatch, setCurrentBatch] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [contributedCount, setContributedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);
    const [cooldownTime, setCooldownTime] = useState(null);

    const defaultDialect = userProfile?.dialect || 'Shughni';

    // Cooldown Timer
    useEffect(() => {
        if (!cooldownTime) return;
        const interval = setInterval(() => {
            if (Date.now() >= cooldownTime) {
                setCooldownTime(null);
                setSkippedCount(0);
                setContributedCount(0);
                fetchWords();
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

    const fetchWords = async () => {
        if (isFetching || cooldownTime) return;
        try {
            setIsFetching(true);
            const q = query(
                collection(db, 'entries'),
                where('status', '==', 'needs_translation'),
                limit(15)
            );
            const snapshot = await getDocs(q);
            const words = [];
            snapshot.forEach(d => {
                words.push({ id: d.id, ...d.data() });
            });

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

    const handleNextContribution = async () => {
        setInputValue('');
        clearRecording(); // Reset audio on next word
        setIsSubmitting(false);

        const nextIndex = currentIndex + 1;
        if (nextIndex < currentBatch.length) {
            setCurrentIndex(nextIndex);
        } else {
            if (skippedCount > MAX_SKIPS) {
                setCooldownTime(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
                setCurrentBatch([]);
            } else {
                const remainingPool = wordPool.filter(w => !currentBatch.find(cb => cb.id === w.id));
                if (remainingPool.length >= BATCH_SIZE) {
                    const newBatch = remainingPool.slice(0, BATCH_SIZE);
                    setWordPool(remainingPool);
                    setCurrentBatch(newBatch);
                    setCurrentIndex(0);
                    setContributedCount(0);
                    setSkippedCount(0);
                } else {
                    await fetchWords();
                }
            }
        }
    };

    const handleSkip = () => {
        setSkippedCount(prev => prev + 1);
        handleNextContribution();
    };

    const handleRecordToggle = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            clearRecording();
            await startRecording();
        }
    };

    const handleSubmitContribution = async () => {
        if ((!inputValue.trim() && !audioBlob) || isSubmitting) return;
        const targetDoc = currentBatch[currentIndex];
        setIsSubmitting(true);

        try {
            // Real-time check to see if someone already translated this
            const docRef = doc(db, 'entries', targetDoc.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().status !== 'needs_translation') {
                setIsSubmitting(false); // Reset submitting state
                addToast('Ah! Someone beat you to this word. Loading next...', 'info');
                handleNextContribution();
                return; // Stop submission
            }

            const updatePayload = {
                word: inputValue.trim().toLowerCase(),
                status: 'pending',
                dialect: defaultDialect,
                contributorId: user.uid,
                timestamp: serverTimestamp(),
                upvotes: 0,
                downvotes: 0,
                voters: []
            };

            // If we have an audio blob, we need to use the full submitContribution logic to upload it,
            // but since Guided Contribution edits an EXISTING document (needs_translation -> pending),
            // we should technically upload the audio to Firebase Storage first.
            // For MVP, we will rely on the firebaseService `submitContribution` if we need audio, OR manually upload.
            // Because `submitContribution` creates a NEW doc, we must write custom upload logic here,
            // or simply just skip audio for Guided Contribution. Wait, the user requested audio here. Let's import the specific storage logic.

            let finalAudioUrl = null;
            if (audioBlob) {
                const audioRef = ref(storage, `audio/${targetDoc.id}.m4a`);
                await uploadBytes(audioRef, audioBlob);
                finalAudioUrl = await getDownloadURL(audioRef);
                updatePayload.audioURL = finalAudioUrl;
            }

            await updateDoc(docRef, updatePayload);

            addToast('Translation saved. +1 Karma pending!', 'success');
            setContributedCount(prev => prev + 1);
            handleNextContribution();
        } catch (error) {
            console.error("Submit failed", error);
            addToast('Failed to save translation.', 'error');
            setIsSubmitting(false);
        }
    };

    if (cooldownTime) {
        const secondsLeft = Math.ceil((cooldownTime - Date.now()) / 1000);
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center', background: 'rgba(255, 82, 82, 0.05)', border: '1px solid rgba(255, 82, 82, 0.2)' }}>
                <div style={{ color: '#ff5252', marginBottom: '12px' }}><Loader className="spin" size={32} /></div>
                <h3 className="serif" style={{ color: 'var(--color-text)', marginBottom: '8px' }}>Breather Time</h3>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', marginBottom: '16px' }}>You've skipped a few! Take a breather.</p>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                    {mins}:{secs.toString().padStart(2, '0')}
                </div>
            </motion.div>
        );
    }

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

    const defObj = currentItem.definitions || {};
    const defEn = defObj.en || currentItem.en;
    const defRu = defObj.ru || currentItem.ru;
    const promptWord = language === 'ru' && defRu ? defRu : (defEn || defRu || currentItem.meaning || 'Missing Definition');

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
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Guided Contribution</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>{currentIndex + 1} / {BATCH_SIZE}</span>
                    </div>

                    <div>
                        <p style={{ color: 'var(--color-text)', fontSize: '1.1rem', margin: 0 }}>
                            How do you say <strong style={{ color: 'var(--color-primary)', fontSize: '1.3rem' }}>{promptWord}</strong> in <strong style={{ color: 'var(--color-text-light)' }}>{defaultDialect}</strong>?
                        </p>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                className="glass-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type translation..."
                                disabled={isSubmitting}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitContribution(); }}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    outline: 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            />

                            <button
                                type="button"
                                onClick={handleRecordToggle}
                                className={`record-btn ${isRecording ? 'recording glass-glow' : 'glass-panel'}`}
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '16px',
                                    border: isRecording ? '1px solid rgba(255,82,82,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                    background: isRecording ? 'rgba(255,82,82,0.15)' : 'rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    color: isRecording ? '#ff5252' : 'var(--color-primary-light)'
                                }}
                            >
                                {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                            </button>
                        </div>

                        {/* Audio Waveform visualization */}
                        {(stream || audioBlob) && (
                            <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
                                <AudioWaveform
                                    stream={isRecording ? stream : null}
                                    audioUrl={audioBlob ? URL.createObjectURL(audioBlob) : null}
                                />
                                {audioBlob && !isRecording && <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Check size={12} /> Audio Ready</div>}
                            </div>
                        )}

                        {/* Submit Button */}
                        <AnimatePresence>
                            {(inputValue.trim().length > 0 || audioBlob) && (
                                <motion.button
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: '8px' }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    onClick={handleSubmitContribution}
                                    disabled={isSubmitting}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        borderRadius: '16px',
                                        border: 'none',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        display: 'flex',
                                        fontWeight: 'bold',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: isSubmitting ? 'wait' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(0,137,123,0.3)',
                                        gap: '8px'
                                    }}
                                >
                                    {isSubmitting ? <Loader className="spin" size={18} /> : <><Send size={18} /> Send & Save</>}
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
                        }}
                    >
                        <SkipForward size={16} /> I don't know (Skip)
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
