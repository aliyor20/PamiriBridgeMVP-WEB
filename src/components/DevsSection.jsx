import React from 'react';
import { motion } from 'framer-motion';

const features = [
    { name: 'Search', role: 'Find words instantly', avatar: '🔍' },
    { name: 'Contribute', role: 'Add missing vocabulary', avatar: '✍️' },
    { name: 'Verify', role: 'Ensure data accuracy', avatar: '✅' },
    { name: 'Listen', role: 'Native pronunciations', avatar: '🔊' },
    { name: 'Learn', role: 'Explore idioms & stories', avatar: '📖' },
    { name: 'Compete', role: 'Climb the leaderboard', avatar: '🏆' },
];

// Duplicate for smooth marquee effect
const marqueeItems = [...features, ...features];

export default function DevsSection() {
    return (
        <section style={{ margin: '5rem 0', position: 'relative', overflow: 'hidden' }}>
            <h2 className="serif" style={{ textAlign: 'center', color: 'var(--color-primary)', fontSize: '2rem', marginBottom: '2rem' }}>
                Platform Features
            </h2>

            {/* Fade edges */}
            <div style={{
                position: 'absolute',
                top: 0, bottom: 0, left: 0,
                width: '100px',
                background: 'linear-gradient(to right, var(--color-background), transparent)',
                zIndex: 2,
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                top: 0, bottom: 0, right: 0,
                width: '100px',
                background: 'linear-gradient(to left, var(--color-background), transparent)',
                zIndex: 2,
                pointerEvents: 'none'
            }} />

            <div className="marquee-container" style={{ display: 'flex', gap: '2rem', padding: '1rem 0' }}>
                <motion.div
                    className="marquee-track"
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{ repeat: Infinity, ease: 'linear', duration: 25 }}
                    style={{ display: 'flex', gap: '2rem' }}
                >
                    {marqueeItems.map((item, i) => (
                        <div key={i} className="glass-panel" style={{
                            minWidth: '220px',
                            minHeight: '220px',
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '24px',
                            border: '1px solid rgba(var(--color-primary-rgb), 0.2)',
                            background: 'rgba(255,255,255,0.03)',
                            transform: 'rotate(-2deg)',
                            transition: 'all 0.3s ease',
                            cursor: 'default'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05) rotate(0deg)';
                                e.currentTarget.style.background = 'rgba(var(--color-primary-rgb), 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1) rotate(-2deg)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            }}
                        >
                            <div style={{
                                fontSize: '4rem',
                                background: 'rgba(255,255,255,0.1)',
                                width: '100px',
                                height: '100px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                marginBottom: '1rem',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                            }}>
                                {item.avatar}
                            </div>
                            <h4 className="serif" style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--color-text)' }}>{item.name}</h4>
                            <p style={{ margin: 0, color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>{item.role}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
            <style>{`
                .marquee-container:hover .marquee-track {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    );
}
