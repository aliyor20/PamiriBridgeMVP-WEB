import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import ThemeToggle from '../components/ThemeToggle';
import { LogOut, Palette, Info, Compass, Globe } from 'lucide-react';
import '../styles/glass.css';

export default function Settings() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { t, language, setLanguage } = useLanguage();

    const handleStartTour = () => {
        localStorage.setItem('pb_start_tour', 'true');
        navigate('/');
    };

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
            <h1 className="serif" style={{ color: 'var(--color-primary)', marginBottom: '2rem' }}>{t('settings.title')}</h1>

            <div className="settings-section">
                <div className="settings-header">
                    <h2 className="serif">{t('settings.theme')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>{t('settings.choose_theme')}</h3>
                        <p style={{ color: 'var(--color-text-light)', margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                            {t('settings.theme_desc')}
                        </p>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--color-background)', borderRadius: '50%', border: '1px solid var(--color-border)' }}>
                        <ThemeToggle placement="bottom" />
                    </div>
                </div>
            </div>

            <div className="settings-section" style={{ marginTop: '3rem' }}>
                <div className="settings-header">
                    <Globe size={20} color="var(--color-text)" />
                    <h2 className="serif">{t('settings.app_language')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>{t('settings.native_language')}</h3>
                    <p style={{ color: 'var(--color-text-light)', margin: '0.5rem 0 1rem 0', fontSize: '0.85rem' }}>
                        {t('settings.language_desc')}
                    </p>

                    <div className="pill-selector">
                        <button
                            className={`pill-btn ${language === 'en' ? 'active' : ''}`}
                            onClick={() => handleLanguageChange('en')}
                        >
                            {t('settings.english')}
                        </button>
                        <button
                            className={`pill-btn ${language === 'ru' ? 'active' : ''}`}
                            onClick={() => handleLanguageChange('ru')}
                        >
                            {t('settings.russian')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-section" style={{ marginTop: '3rem' }}>
                <div className="settings-header">
                    <Info size={20} color="var(--color-primary)" />
                    <h2 className="serif">{t('settings.about_title')}</h2>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', marginTop: '1rem' }}>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                        <strong>{t('settings.version')}:</strong> MVP 1.0<br />
                        <strong>{t('settings.mission')}:</strong> {t('settings.mission_desc')}
                    </p>
                    <button
                        className="btn-secondary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={handleStartTour}
                    >
                        <Compass size={18} />
                        {t('settings.view_guide')}
                    </button>
                </div>
            </div>

            <div className="settings-section" style={{ marginTop: '3rem' }}>
                <button
                    onClick={logout}
                    className="btn-danger glass-panel"
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px',
                        color: '#ff4444',
                        background: 'rgba(255, 68, 68, 0.05)',
                        border: '1px solid rgba(255, 68, 68, 0.2)'
                    }}
                >
                    <LogOut size={20} />
                    <span>{t('profile.sign_out')}</span>
                </button>
            </div>

            <style>{`
                .settings-header {
                    display: flex;
                    alignItems: center;
                    gap: 12px;
                    border-bottom: 1px solid var(--color-border);
                    padding-bottom: 0.5rem;
                }
                .settings-header h2 {
                    margin: 0;
                    font-size: 1.2rem;
                }
                .pill-selector {
                    display: flex;
                    background: var(--color-background);
                    border: 1px solid var(--color-border);
                    border-radius: 20px;
                    padding: 4px;
                    gap: 4px;
                }
                .pill-btn {
                    flex: 1;
                    padding: 8px 16px;
                    border-radius: 16px;
                    border: none;
                    background: transparent;
                    color: var(--color-text-light);
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .pill-btn.active {
                    background: var(--color-surface);
                    color: var(--color-primary);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
            `}</style>
        </div>
    );
}
