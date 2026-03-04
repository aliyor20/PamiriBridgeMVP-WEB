import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function DialectSection({ title, speakers, description, facts }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            layout
            onClick={() => setExpanded(!expanded)}
            className="glass-panel hover-shift"
            style={{
                margin: '1.5rem 0',
                padding: '1.5rem',
                cursor: 'pointer',
                borderRadius: '24px',
                border: expanded ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                background: expanded ? 'rgba(var(--color-primary-rgb), 0.05)' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.3s ease',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <motion.h3
                        layout="position"
                        className="serif"
                        style={{ fontSize: expanded ? '2rem' : '1.5rem', margin: 0, color: 'var(--color-text)' }}
                    >
                        {title}
                    </motion.h3>
                    <span style={{
                        background: 'rgba(var(--color-primary-rgb), 0.2)',
                        color: 'var(--color-primary)',
                        padding: '4px 12px',
                        borderRadius: '50px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                    }}>
                        {speakers} Speakers
                    </span>
                </div>
                <motion.div
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown color="var(--color-text-light)" />
                </motion.div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                        <div style={{ paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <p style={{ color: 'var(--color-text-light)', lineHeight: '1.6', fontSize: '1.1rem', margin: 0 }}>
                                {description}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {facts.map((fact, idx) => (
                                    <div key={idx} style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                                        <span style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>{fact}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
