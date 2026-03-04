import React from 'react';
import { useDictionary } from '../context/DictionaryContext';

export default function Stats() {
    const { stats } = useDictionary();

    // Mock data for dialects if not yet in stats.json
    const dialects = [
        { name: 'Shughni', count: stats?.dialects?.shughni || 0 },
        { name: 'Rushani', count: stats?.dialects?.rushani || 0 },
        { name: 'Bartangi', count: stats?.dialects?.bartangi || 0 },
        { name: 'Yazgulyami', count: stats?.dialects?.yazgulyami || 0 },
        { name: 'Ishkashimi', count: stats?.dialects?.ishkashimi || 0 },
        { name: 'Wakhi', count: stats?.dialects?.wakhi || 0 },
        { name: 'Sarykoli', count: stats?.dialects?.sarykoli || 0 },
    ];

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
            <h1 style={{
                fontSize: '2.5rem',
                marginBottom: '2rem',
                color: 'var(--color-primary)',
                textAlign: 'center'
            }}>
                Project Statistics
            </h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                <div className="stat-card" style={statCardStyle}>
                    <span style={statNumberStyle}>{stats.count || 0}</span>
                    <span style={statLabelStyle}>Words Preserved</span>
                </div>
                <div className="stat-card" style={statCardStyle}>
                    <span style={statNumberStyle}>{stats.contributors || 0}</span>
                    <span style={statLabelStyle}>Community Contributors</span>
                </div>
                <div className="stat-card" style={statCardStyle}>
                    <span style={statNumberStyle}>7</span>
                    <span style={statLabelStyle}>Living Dialects</span>
                </div>
            </div>

            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-text)' }}>Dialect Distribution</h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1rem'
            }}>
                {dialects.map(d => (
                    <div key={d.name} style={{
                        backgroundColor: 'var(--color-surface)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        textAlign: 'center'
                    }}>
                        <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                            {d.count}
                        </strong>
                        <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const statCardStyle = {
    backgroundColor: 'var(--color-surface)',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
};

const statNumberStyle = {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: 'var(--color-primary)',
    marginBottom: '0.5rem',
    lineHeight: 1
};

const statLabelStyle = {
    color: 'var(--color-text-light)',
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};
