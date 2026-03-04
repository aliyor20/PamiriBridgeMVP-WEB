import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, X } from 'lucide-react';
import '../styles/glass.css';

// Themes mapping matching themes.css
const themes = [
    { id: 'pamiri', name: 'Pamiri Gold', color: '#00897B' }, // Teal/Gold
    { id: 'badakhshan', name: 'Badakhshan', color: '#D32F2F' }, // Red
    { id: 'wakhan', name: 'Wakhan', color: '#5D4037' }, // Brown/Mountain
    { id: 'bartang', name: 'Bartang', color: '#1976D2' }, // Blue/River
    { id: 'oled', name: 'OLED', color: '#000000' }, // Black
    { id: 'print', name: 'Print', color: '#F5F5F5' }, // White/Paper
    { id: 'retro', name: 'Retro', color: '#FFB74D' }, // Orange/Sepia
];

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const togglePanel = () => {
        setIsOpen(!isOpen);
    };

    const handleThemeSelect = (themeId) => {
        setTheme(themeId);
        // Optional: haptic feedback here if we passed it in, 
        // but keeping this component simple for now.
    };

    return (
        <div className="theme-toggle-wrapper" style={{ position: 'relative' }}>
            <button
                className="theme-pill-btn glass-panel"
                onClick={togglePanel}
                aria-label="Change Theme"
                style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50px',
                    height: '44px' // Matches the auth buttons' approximate height
                }}
            >
                <Palette size={20} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop to close on click outside */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Theme Palette Popover */}
                    <div
                        className="glass-panel"
                        style={{
                            position: 'absolute',
                            top: '120%',
                            right: 0,
                            width: '240px',
                            padding: '16px',
                            zIndex: 101,
                            borderRadius: '16px',
                            animation: 'fadeIn 0.2s ease-out'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span className="serif" style={{ fontWeight: 'bold' }}>Select Theme</span>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleThemeSelect(t.id)}
                                    className={`theme-btn-mini ${theme === t.id ? 'active' : ''}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px',
                                        border: theme === t.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        background: 'rgba(var(--color-surface-rgb), 0.5)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            background: t.color,
                                            border: '1px solid rgba(0,0,0,0.1)'
                                        }}
                                    />
                                    <span>{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
