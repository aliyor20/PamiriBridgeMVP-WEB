import React, { useState } from 'react';
import { useDictionary } from '../context/DictionaryContext';
import { motion } from 'framer-motion';
import StatCounter from '../components/StatCounter';
import leaderboardData from '../data/leaderboard.json';
import { Trophy, TrendingUp, Users, Languages } from 'lucide-react';

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

    // Sort leaderboard by points
    const topContributors = leaderboardData.users
        .filter(u => u.points > 0)
        .sort((a, b) => b.points - a.points);

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    fontSize: '2.5rem',
                    marginBottom: '1rem',
                    color: 'var(--color-primary)',
                    textAlign: 'center',
                    fontWeight: '800'
                }}>
                Project Statistics
            </motion.h1>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ textAlign: 'center', color: 'var(--color-text-light)', marginBottom: '3rem', fontSize: '1.2rem' }}
            >
                Tracking the preservation of the Pamiri linguistic heritage in real-time.
            </motion.p>

            {/* Main Stats Counter */}
            <StatCounter targetCount={stats?.count || 12450} />

            {/* Leaderboard Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                style={{ margin: '4rem 0' }}
            >
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '2rem' }}>
                    <Trophy size={32} color="#FFD700" />
                    Top Contributors
                </h2>
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', borderRadius: '20px' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 100px',
                        padding: '1rem 1.5rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-light)',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        <div style={{ textAlign: 'center' }}>Rank</div>
                        <div>Contributor</div>
                        <div style={{ textAlign: 'right' }}>Points</div>
                    </div>

                    {topContributors.slice(0, 50).map((user, index) => {
                        let rankColor = 'var(--color-text-light)';
                        let rankIcon = null;

                        if (index === 0) {
                            rankColor = '#FFD700'; // Gold
                            rankIcon = <Trophy size={18} color={rankColor} />;
                        } else if (index === 1) {
                            rankColor = '#C0C0C0'; // Silver
                            rankIcon = <Trophy size={18} color={rankColor} />;
                        } else if (index === 2) {
                            rankColor = '#CD7F32'; // Bronze
                            rankIcon = <Trophy size={18} color={rankColor} />;
                        }

                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                key={user.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '60px 1fr 100px',
                                    padding: '1.2rem 1.5rem',
                                    borderBottom: index === topContributors.length - 1 ? 'none' : '1px solid var(--color-border)',
                                    alignItems: 'center',
                                    transition: 'background 0.2s',
                                    background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}
                            >
                                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: rankColor, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                                    {index < 3 ? rankIcon : `#${index + 1}`}
                                </div>
                                <div style={{ fontWeight: '500', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '1.1rem', color: 'var(--color-text)' }}>{user.displayName || "Anonymous User"}</span>
                                    {user.dialect && user.dialect !== "General" && (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', width: 'fit-content' }}>
                                            {user.dialect}
                                        </span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                                    {user.points} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: 'normal' }}>pts</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Dialect Distribution */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                style={{ margin: '4rem 0' }}
            >
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <TrendingUp size={24} color="var(--color-primary)" />
                    Dialect Distribution
                </h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '1rem'
                }}>
                    {dialects.map((d, i) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            key={d.name}
                            className="glass-panel"
                            style={{
                                padding: '1.5rem 1rem',
                                borderRadius: '16px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 0.2s',
                                cursor: 'default'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <strong style={{ display: 'block', fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '0.2rem' }}>
                                {d.count}
                            </strong>
                            <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', fontWeight: '500' }}>{d.name}</span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

const glassCardStyle = {
    padding: '2.5rem 2rem',
    borderRadius: '20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)'
};

const statNumberStyle = {
    fontSize: '3.5rem',
    fontWeight: '800',
    color: 'var(--color-text)',
    marginBottom: '0.5rem',
    lineHeight: 1
};

const statLabelStyle = {
    color: 'var(--color-text-light)',
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '500'
};
