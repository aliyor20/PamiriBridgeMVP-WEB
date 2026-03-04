import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import { Shield, Flame, BookOpen, Mic, Award, Lock, Info, Search as SearchIcon, Edit2, Check, X, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import '../styles/glass.css';

export default function Profile() {
    const { user, userProfile, logout, loginWithGoogle } = useAuth();
    const { t } = useLanguage();

    // Derived state
    const isGuest = !user;
    const displayName = isGuest ? 'Unverified Traveler' : (userProfile?.displayName || user.displayName);
    const photoURL = isGuest ? null : (userProfile?.photoURL || user.photoURL);
    const role = isGuest ? 'Traveler' : (userProfile?.role || 'User');
    const points = isGuest ? 0 : (userProfile?.points || 0);

    // Mock Badges (In a real app, fetch from DB)
    const badges = [
        { id: 'scout', icon: <BookOpen size={20} />, label: 'The Scout', desc: 'Submit 1 word', unlocked: !isGuest && points > 0 },
        { id: 'scribe', icon: <Mic size={20} />, label: 'The Scribe', desc: 'Transcribe 100 audio files', unlocked: false },
        { id: 'polyglot', icon: <Award size={20} />, label: 'The Polyglot', desc: 'Translations in 3 languages', unlocked: false },
        { id: 'guardian', icon: <Shield size={20} />, label: 'The Guardian', desc: 'Enter 50 rare words', unlocked: false },
    ];

    // Contribution History State
    const [history, setHistory] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('pb_contribution_history') || '[]');
        } catch {
            return [];
        }
    });
    const [historySearch, setHistorySearch] = useState('');
    const [showInfo, setShowInfo] = useState(false);

    const filteredHistory = history.filter(item =>
        item.word.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.meaning.toLowerCase().includes(historySearch.toLowerCase())
    );

    // Profile Editing State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    const [nameError, setNameError] = useState("");

    const handleEditClick = () => {
        setEditNameValue(displayName);
        setIsEditingName(true);
        setNameError("");
    };

    const handleNameSave = async () => {
        if (!editNameValue.trim() || editNameValue.trim().length < 3) {
            setNameError("Name must be at least 3 characters.");
            return;
        }

        if (editNameValue.trim() === displayName) {
            setIsEditingName(false);
            return;
        }

        // Rate limit check
        const now = Date.now();
        const tenMins = 10 * 60 * 1000;
        let editHistory = [];
        try {
            editHistory = JSON.parse(localStorage.getItem('pb_name_edits') || '[]');
        } catch (e) { editHistory = []; }

        // Filter out timestamps older than 10 mins
        editHistory = editHistory.filter(time => now - time < tenMins);

        if (editHistory.length >= 3) {
            setNameError("Rate limit exceeded. Max 3 name changes per 10 minutes.");
            return;
        }

        setIsSavingName(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { displayName: editNameValue.trim() });

            // Record timestamp
            editHistory.push(now);
            localStorage.setItem('pb_name_edits', JSON.stringify(editHistory));

            setIsEditingName(false);
        } catch (error) {
            console.error("Error updating name:", error);
            setNameError("Failed to update name.");
        } finally {
            setIsSavingName(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
            {/* Gamer Card */}
            <div className="glass-panel profile-card fade-in">
                <div className="card-header">
                    <div className="avatar-container">
                        {photoURL ? (
                            <img src={photoURL} alt="Avatar" className="profile-avatar" />
                        ) : (
                            <div className="profile-avatar-placeholder">
                                <UserIcon />
                            </div>
                        )}
                        {!isGuest && (
                            <div className="level-badge" title="Level 1">
                                <span>1</span>
                            </div>
                        )}
                    </div>

                    <div className="identity-stack">
                        {!isEditingName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h1 className="profile-name serif" style={{ margin: 0 }}>{displayName}</h1>
                                {!isGuest && (
                                    <button
                                        onClick={handleEditClick}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                                        title="Edit Username"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={editNameValue}
                                        onChange={(e) => setEditNameValue(e.target.value)}
                                        disabled={isSavingName}
                                        className="profile-name serif"
                                        maxLength={20}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            padding: '4px 12px',
                                            color: 'var(--color-text)',
                                            width: '180px',
                                            outline: 'none',
                                            fontSize: '1.2rem',
                                            margin: 0
                                        }}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleNameSave}
                                        disabled={isSavingName}
                                        style={{ background: 'var(--color-primary)', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', opacity: isSavingName ? 0.7 : 1 }}
                                    >
                                        {isSavingName ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                    </button>
                                    <button
                                        onClick={() => setIsEditingName(false)}
                                        disabled={isSavingName}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--color-text)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                {nameError && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{nameError}</span>}
                            </div>
                        )}
                        <div className="profile-meta" style={{ marginTop: '4px' }}>
                            <span className="role-tag">{role}</span>
                            <span className="join-date">Joined {isGuest ? 'Today' : '2026'}</span>
                        </div>
                    </div>

                    <div className="streak-container">
                        <div className={`flame-icon ${!isGuest ? 'active' : ''}`}>
                            <Flame size={28} fill={!isGuest ? "#FF5722" : "none"} color={!isGuest ? "#FF5722" : "var(--color-text-light)"} />
                        </div>
                        <div className="streak-info">
                            <span className="streak-count">{isGuest ? 0 : 3}</span>
                            <span className="streak-label">Day Streak</span>
                        </div>
                    </div>
                </div>

                <div className="stats-row">
                    <StatItem label={t('home.contributions')} value={points} />
                    <StatItem label={t('home.verified')} value={0} />
                    <StatItem label={t('home.reputation')} value={isGuest ? '—' : 'Rising'} />
                </div>

                {isGuest && (
                    <div className="guest-cta">
                        <p>Your journey has begun. Claim your passport to save your progress.</p>
                        <button onClick={loginWithGoogle} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                            Claim Official Passport
                        </button>
                    </div>
                )}
            </div>

            {/* Badges Shelf */}
            <div className="badges-section" style={{ marginTop: '2rem' }}>
                <h3 className="section-title serif">{t('profile.badges')}</h3>
                <div className="badges-grid">
                    {badges.map((badge) => (
                        <div key={badge.id} className={`badge-card glass-panel ${badge.unlocked ? 'unlocked' : 'locked'}`}>
                            <div className="badge-icon">
                                {badge.unlocked ? badge.icon : <Lock size={20} />}
                            </div>
                            <div className="badge-info">
                                <span className="badge-name">{badge.label}</span>
                                <span className="badge-req">{badge.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Local Contribution History Widget */}
            {!isGuest && (
                <div className="history-widget" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 className="section-title serif" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {t('profile.history')}
                            <button
                                onClick={() => setShowInfo(!showInfo)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer', padding: 0 }}
                            >
                                <Info size={18} />
                            </button>
                        </h3>
                    </div>

                    {showInfo && (
                        <div className="glass-panel" style={{ padding: '12px', marginBottom: '16px', borderRadius: '12px', background: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                            <p style={{ color: '#FF9800', fontSize: '0.9rem', margin: 0 }}>
                                <strong>Note:</strong> iPhone often clears browser cache to save space, which may remove your offline contribution history.
                                {/* TODO: Implement robust database tracking of user-added words in the user document in future backend expansion. */}
                            </p>
                        </div>
                    )}

                    <div className="glass-panel" style={{ padding: '16px', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '12px', marginBottom: '16px' }}>
                            <SearchIcon size={16} color="var(--color-text-light)" />
                            <input
                                type="text"
                                placeholder={t('profile.search_history')}
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', marginLeft: '8px', width: '100%', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                            {filteredHistory.length > 0 ? filteredHistory.map(entry => (
                                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-text)' }}>{entry.word}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>{entry.meaning}</div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        background: entry.status === 'verified' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                                        color: entry.status === 'verified' ? '#4CAF50' : '#FF9800'
                                    }}>
                                        {entry.status}
                                    </div>
                                </div>
                            )) : (
                                <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '20px 0' }}>{t('profile.no_history')}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Logout (Only for Users) */}
            {!isGuest && (
                <button
                    onClick={logout}
                    className="btn-danger"
                    style={{ marginTop: '2rem', width: '100%' }}
                >
                    {t('profile.sign_out')}
                </button>
            )}
        </div>
    );
}

function StatItem({ label, value }) {
    return (
        <div className="stat-item">
            <span className="stat-value mono">{value}</span>
            <span className="stat-label">{label}</span>
        </div>
    );
}

function UserIcon() {
    return (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    )
}
