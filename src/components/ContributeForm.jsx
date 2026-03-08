import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { submitContribution } from '../lib/firebaseService';
import { Mic, Square, Loader } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import { DIALECTS } from '../lib/api';

export default function ContributeForm() {
    const { user, userProfile } = useAuth();
    const { addToast } = useToast();
    const {
        isRecording,
        stream,
        audioBlob,
        startRecording,
        stopRecording,
        clearRecording
    } = useAudioRecorder();

    const defaultDialect = (userProfile?.primaryDialect && userProfile.primaryDialect !== 'All') ? userProfile.primaryDialect : 'Shughni';

    const [word, setWord] = useState('');
    const [meaningEN, setMeaningEN] = useState('');
    const [meaningRU, setMeaningRU] = useState('');
    const [example, setExample] = useState('');
    const [dialect, setDialect] = useState(defaultDialect);
    const [submitting, setSubmitting] = useState(false);

    // Remove 'All' from contribution options
    const contributionDialects = DIALECTS.filter(d => d !== 'All');

    const handleRecordToggle = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            clearRecording(); // start fresh
            await startRecording();
        }
    };

    const getAlphabet = (str) => {
        const cyrillicPattern = /[\u0400-\u04FF]/;
        const latinPattern = /[a-zA-Z]/;
        let cyrCount = 0;
        let latCount = 0;
        for (let i = 0; i < str.length; i++) {
            if (cyrillicPattern.test(str[i])) cyrCount++;
            else if (latinPattern.test(str[i])) latCount++;
        }
        if (cyrCount > latCount) return 'Cyrillic';
        if (latCount > 0) return 'Latin';
        return '';
    };

    const detectedAlphabet = getAlphabet(word);
    const displayAlphabet = detectedAlphabet === 'Cyrillic' ? 'Russian' : detectedAlphabet === 'Latin' ? 'English' : '';

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!word.trim() || (!meaningEN.trim() && !meaningRU.trim())) {
            addToast('Please provide the word and at least one meaning (English or Russian).', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await submitContribution({
                word,
                meaning: meaningEN.trim() || meaningRU.trim(), // Force backward-compatibility
                definitions: {
                    ...(meaningEN.trim() && { en: meaningEN.trim() }),
                    ...(meaningRU.trim() && { ru: meaningRU.trim() })
                },
                alphabet: getAlphabet(word),
                dialect,
                example,
                contributorId: user.uid,
                audioBlob
            });

            addToast('Contribution submitted successfully! +1 Karma pending.', 'success');

            // Reset form
            setWord('');
            setMeaningEN('');
            setMeaningRU('');
            setExample('');
            clearRecording();

        } catch (error) {
            console.error("Contribution error:", error);
            addToast('Failed to submit contribution.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="contribute-form-container">
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <div className="input-group">
                    <label style={{ color: 'var(--color-primary)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Word (in Pamiri)</span>
                        {displayAlphabet && <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'normal' }}>{displayAlphabet} letters</span>}
                    </label>
                    <input
                        type="text"
                        className="glass-input"
                        value={word}
                        onChange={e => setWord(e.target.value)}
                        placeholder="e.g. Chid"
                        required
                        style={{ fontSize: '1.2rem', padding: '16px' }}
                    />
                </div>

                <div className="input-group">
                    <label style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>English Meaning</label>
                    <input
                        type="text"
                        className="glass-input"
                        value={meaningEN}
                        onChange={e => setMeaningEN(e.target.value)}
                        placeholder="e.g. Traditional Pamiri House"
                    />
                </div>

                <div className="input-group">
                    <label style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Russian Meaning</label>
                    <input
                        type="text"
                        className="glass-input"
                        value={meaningRU}
                        onChange={e => setMeaningRU(e.target.value)}
                        placeholder="e.g. Традиционный памирский дом"
                    />
                    <small style={{ color: 'var(--color-text-light)', marginTop: '6px', display: 'block' }}>Provide at least one meaning (English or Russian).</small>
                </div>

                <div className="input-group">
                    <label style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Example Sentence (Optional)</label>
                    <textarea
                        className="glass-input"
                        value={example}
                        onChange={e => setExample(e.target.value)}
                        placeholder="How is it used in a sentence?"
                        rows="2"
                    />
                </div>

                <div className="input-group">
                    <label style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Dialect</label>
                    <select
                        className="glass-input"
                        value={dialect}
                        onChange={e => setDialect(e.target.value)}
                    >
                        {contributionDialects.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                {/* Audio Recording Section */}
                <div className="audio-recording-section" style={{ marginTop: '8px' }}>
                    <label style={{ color: 'var(--color-primary)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                        Pronunciation <span style={{ color: 'var(--color-text-light)', fontSize: '0.8rem', fontWeight: 'normal' }}>(Optional)</span>
                    </label>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={handleRecordToggle}
                            className={`record-btn ${isRecording ? 'recording' : ''}`}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                background: isRecording ? '#ff5252' : 'var(--color-surface)',
                                boxShadow: isRecording ? '0 0 20px rgba(255, 82, 82, 0.6)' : '0 4px 12px rgba(0,0,0,0.2)',
                            }}
                        >
                            {isRecording ? <Square fill="white" size={24} /> : <Mic fill="white" size={24} />}
                        </button>

                        <div style={{ flex: 1 }}>
                            {/* Pass the stream directly to AudioWaveform for the visualizer effect */}
                            <AudioWaveform
                                stream={isRecording ? stream : null}
                                audioUrl={audioBlob ? URL.createObjectURL(audioBlob) : null}
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting || !word || (!meaningEN && !meaningRU) || isRecording}
                    className="submit-btn"
                    style={{
                        padding: '16px',
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        marginTop: '12px',
                        cursor: (submitting || !word || (!meaningEN && !meaningRU) || isRecording) ? 'not-allowed' : 'pointer',
                        opacity: (submitting || !word || (!meaningEN && !meaningRU) || isRecording) ? 0.6 : 1,
                        boxShadow: '0 8px 16px rgba(0,137,123,0.3)',
                    }}
                >
                    {submitting ? <Loader className="spin" size={24} style={{ margin: '0 auto' }} /> : 'Submit for Verification'}
                </button>
            </div>
        </form>
    );
}
