import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: 'pamiri', name: 'Pamiri', primary: '#00897B', background: '#F5F5F5' },
        { id: 'oled', name: 'OLED', primary: '#76FF03', background: '#000000' },
        { id: 'emerald', name: 'Emerald', primary: '#2E7D32', background: '#F1F8E9' },
        { id: 'midnight', name: 'Midnight', primary: '#448AFF', background: '#0D47A1' },
        { id: 'sunset', name: 'Sunset', primary: '#E65100', background: '#FFF3E0' },
        { id: 'lavender', name: 'Lavender', primary: '#7B1FA2', background: '#F3E5F5' },
        { id: 'slate', name: 'Slate', primary: '#607D8B', background: '#263238' },
    ];

    return (
        <div
            className="theme-selector-container"
            role="group"
            aria-label="Theme Selection"
        >
            {themes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                    aria-pressed={theme === t.id}
                    aria-label={`Select ${t.name} theme`}
                    title={t.name}
                    style={{
                        background: `linear-gradient(90deg, ${t.primary} 50%, ${t.background} 50%)`
                    }}
                />
            ))}
        </div>
    );
}
