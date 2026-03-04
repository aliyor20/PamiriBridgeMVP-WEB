import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as idb from '../lib/idb';
import { useAuth } from '../context/AuthContext';
import { updateUserPoints } from '../lib/firebaseService';
import '../styles/glass.css';

export default function QuizWidget() {
    const { user } = useAuth();
    const [entries, setEntries] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionKey, setQuestionKey] = useState(0); // For forcing exit animations
    const [localPoints, setLocalPoints] = useState(parseInt(localStorage.getItem('pb_local_points') || '0', 10));

    // Interaction States
    const [selectedId, setSelectedId] = useState(null);
    const [reveal, setReveal] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        // Load words on mount
        const loadWords = async () => {
            const all = await idb.getAllEntries();
            const lang = localStorage.getItem('pb_app_language') || 'en';

            // Filter words: must have a short definition (<= 3 words)
            const valid = all.filter(entry => {
                let defText = '';
                if (entry.definitions && entry.definitions[lang]) {
                    defText = entry.definitions[lang];
                } else if (entry.meaning) {
                    defText = entry.meaning;
                }

                if (!defText) return false;

                // Count words strictly
                const wordCount = defText.trim().split(/\s+/).length;
                return wordCount > 0 && wordCount <= 3;
            });

            setEntries(valid);
            generateQuestion(valid);
        };
        loadWords();
    }, []);

    const generateQuestion = (pool = entries) => {
        if (!pool || pool.length < 4) return;

        // Pick 4 unique random indices
        const indices = new Set();
        while (indices.size < 4) {
            indices.add(Math.floor(Math.random() * pool.length));
        }

        const selectedEntries = Array.from(indices).map(i => pool[i]);
        const target = selectedEntries[0]; // Target is always the first one, then we shuffle

        // Shuffle the 4 options
        const shuffled = [...selectedEntries].sort(() => Math.random() - 0.5);

        setCurrentQuestion({
            target,
            options: shuffled
        });

        setSelectedId(null);
        setReveal(false);
        setIsTransitioning(false);
        setQuestionKey(prev => prev + 1);
    };

    const handleAnswer = async (optionId) => {
        if (selectedId || isTransitioning) return; // Prevent double taps

        setSelectedId(optionId);
        setIsTransitioning(true);

        const isCorrect = optionId === currentQuestion.target.id;

        // Wait 400ms before haptic feedback and reveal
        await new Promise(r => setTimeout(r, 400));

        // Haptic feedback (Continuous + boom)
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 200]);
        }

        setReveal(true);

        if (isCorrect) {
            // Correct workflow
            const newPoints = localPoints + 1;
            setLocalPoints(newPoints);
            localStorage.setItem('pb_local_points', newPoints.toString());

            // Check if we reached 5 for the batch upload
            if (newPoints >= 5 && user) {
                try {
                    await updateUserPoints(user.uid, newPoints);
                    setLocalPoints(0);
                    localStorage.setItem('pb_local_points', '0');
                } catch (e) {
                    console.error("Failed to sync points", e);
                    // Keep them locally if failed
                }
            }

            // Wait brief moment, then slide away
            await new Promise(r => setTimeout(r, 800));
            generateQuestion();
        } else {
            // Incorrect workflow (Slower read time, blur wrong ones)
            await new Promise(r => setTimeout(r, 2000));
            generateQuestion();
        }
    };

    // Helper to get exactly the text we need based on language preference
    const getDefinitionText = (entry) => {
        const lang = localStorage.getItem('pb_app_language') || 'en';
        if (entry.definitions && entry.definitions[lang]) return entry.definitions[lang];
        return entry.meaning;
    };

    if (!currentQuestion) return null;

    return (
        <div className="quiz-widget glass-panel">
            <div className="quiz-header">
                <span className="quiz-title serif">Daily Practice</span>
                <span className="quiz-score mono">+{localPoints}</span>
            </div>

            <div className="quiz-overflow-container">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={questionKey}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }}
                        exit={{ x: -100, opacity: 0, transition: { ease: "easeInOut", duration: 0.3 } }}
                        className="quiz-content"
                    >
                        <div className="quiz-question-box">
                            <span className="quiz-label">Select the Pamiri word for:</span>
                            <h3 className="quiz-target-word">{getDefinitionText(currentQuestion.target)}</h3>
                        </div>

                        <div className="quiz-grid">
                            {currentQuestion.options.map((opt) => {
                                const isSelected = selectedId === opt.id;
                                const isTarget = opt.id === currentQuestion.target.id;

                                let pillClass = 'quiz-pill';
                                if (reveal) {
                                    if (isTarget) {
                                        pillClass += ' correct';
                                    } else if (isSelected) {
                                        pillClass += ' incorrect';
                                    } else {
                                        pillClass += ' blur-out'; // Blur out unselected wrong answers
                                    }
                                } else if (isSelected) {
                                    pillClass += ' selected';
                                }

                                return (
                                    <button
                                        key={opt.id}
                                        className={pillClass}
                                        onClick={() => handleAnswer(opt.id)}
                                        disabled={isTransitioning}
                                    >
                                        <span className="quiz-word serif">{opt.word}</span>
                                        <span className="quiz-dialect">{opt.dialect || 'General'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <style>{`
                .quiz-widget {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border-radius: 24px;
                }
                .quiz-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.2rem;
                }
                .quiz-title {
                    font-size: 1.1rem;
                    color: var(--color-text);
                }
                .quiz-score {
                    background: var(--color-primary);
                    color: #fff;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    font-weight: bold;
                }
                .quiz-overflow-container {
                    position: relative;
                }
                .quiz-content {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .quiz-question-box {
                    text-align: center;
                    margin-bottom: 0.5rem;
                }
                .quiz-label {
                    font-size: 0.85rem;
                    color: var(--color-text-light);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .quiz-target-word {
                    font-size: 1.6rem;
                    margin: 8px 0 0 0;
                    color: var(--color-text);
                    font-weight: 600;
                }
                .quiz-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .quiz-pill {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    padding: 16px 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
                    outline: none;
                    text-align: center;
                    min-height: 80px;
                }
                .quiz-pill:active {
                    transform: scale(0.95);
                }
                .quiz-pill.selected {
                    background: var(--color-background);
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 2px var(--color-primary);
                }
                
                /* Reveal animations */
                .quiz-pill.correct {
                    background: rgba(34, 197, 94, 0.15); /* Green glow */
                    border-color: #22c55e;
                    color: #166534;
                    box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
                }
                body.dark-mode .quiz-pill.correct {
                    color: #4ade80;
                }
                
                .quiz-pill.incorrect {
                    background: rgba(239, 68, 68, 0.15); /* Red glow */
                    border-color: #ef4444;
                    color: #991b1b;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);
                }
                body.dark-mode .quiz-pill.incorrect {
                    color: #f87171;
                }
                
                .quiz-pill.blur-out {
                    opacity: 0.3;
                    filter: blur(2px);
                    transform: scale(0.95);
                }

                .quiz-word {
                    font-size: 1.1rem;
                    font-weight: bold;
                    color: var(--color-text);
                }
                .quiz-dialect {
                    font-size: 0.75rem;
                    color: var(--color-text-light);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
            `}</style>
        </div>
    );
}
