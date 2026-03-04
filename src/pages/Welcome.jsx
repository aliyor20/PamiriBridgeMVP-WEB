import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import '../styles/glass.css';
import '../styles/global.css';

export default function Welcome({ onStart }) {
    const { loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const { t, language, setLanguage } = useLanguage();

    const handleLanguageChange = (e, lang) => {
        e.stopPropagation(); // Prevents triggers the welcome explore handle
        setLanguage(lang);
    };

    const handleExplore = () => {
        localStorage.setItem('pb_explore_mode', 'true');
        window.location.reload();
    };

    return (
        <div
            className="welcome-container"
            onClick={handleExplore}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleExplore() }}
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                cursor: 'pointer',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'var(--color-background)',
                backgroundImage: 'radial-gradient(circle at top, rgba(0, 137, 123, 0.15) 0%, transparent 80%), var(--noise-pattern)',
                zIndex: 9999,
                overflow: 'hidden'
            }}
        >
            {/* Fixed Logo in Background at the very top */}
            <div style={{
                position: 'absolute',
                top: '5vh',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 0
            }}>
                <img
                    src="/LogoDarkBlack.svg"
                    alt=""
                    style={{
                        width: '280px',
                        filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.8))',
                        opacity: 0.8
                    }}
                />
            </div>

            <div className={`glass-panel welcome-card fade-in`} style={{
                padding: '3rem',
                textAlign: 'center',
                maxWidth: '500px',
                width: '90%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2rem',
                zIndex: 1,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            }}>

                {/* Language Toggle */}
                <div className="z-10 mb-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="glass-panel rounded-full p-2 flex items-center shadow-lg border border-white/10 backdrop-blur-xl">
                        <button
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${language === 'en'
                                ? 'bg-white/20 text-white shadow-inner'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            onClick={(e) => handleLanguageChange(e, 'en')}
                        >
                            EN
                        </button>
                        <button
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${language === 'ru'
                                ? 'bg-white/20 text-white shadow-inner'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            onClick={(e) => handleLanguageChange(e, 'ru')}
                        >
                            RU
                        </button>
                    </div>
                </div>

                <h1 className="serif" style={{
                    fontSize: '2.5rem',
                    color: 'var(--color-primary)',
                    margin: 0,
                    lineHeight: 1.2
                }}>
                    {t('settings.title') === 'Settings' ? 'Welcome to Pamiri Lexicon' : 'Добро пожаловать в Pamiri Lexicon'}
                </h1>

                <p style={{ color: 'var(--color-text-light)', animation: 'pulse 2s infinite', marginTop: '1rem', fontWeight: 'bold' }}>
                    {t('settings.title') === 'Settings' ? 'Tap anywhere to begin' : 'Нажмите в любом месте, чтобы начать'}
                </p>

            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
