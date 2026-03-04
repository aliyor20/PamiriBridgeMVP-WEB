import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { DIALECTS } from '../lib/api';

// We'll extract these to separate components shortly
import ContributeForm from '../components/ContributeForm';
import ReviewQueue from '../components/ReviewQueue';

export default function Contribute() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('contribute'); // 'contribute' or 'verify'

    // Protect route naturally
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="page-container">
            <div className="container" style={{ paddingBottom: '120px' }}>
                <h1 className="serif" style={{ marginBottom: '24px', fontSize: '2rem', color: 'var(--color-primary)' }}>Community</h1>

                {/* Framer Motion Spring Animated Toggle UI */}
                <div className="glass-panel" style={{
                    display: 'flex',
                    position: 'relative',
                    borderRadius: '24px',
                    padding: '6px',
                    marginBottom: '32px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                }}>
                    <motion.div
                        layoutId="activeTabIndicator"
                        style={{
                            position: 'absolute',
                            top: 6,
                            bottom: 6,
                            left: activeTab === 'contribute' ? 6 : '50%',
                            right: activeTab === 'verify' ? 6 : '50%',
                            borderRadius: '18px',
                            background: 'var(--color-surface)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            zIndex: 0
                        }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />

                    <button
                        onClick={() => setActiveTab('contribute')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            zIndex: 1,
                            color: activeTab === 'contribute' ? 'var(--color-text)' : 'var(--color-text-light)',
                            fontWeight: activeTab === 'contribute' ? '600' : '500',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            fontSize: '0.95rem'
                        }}>
                        Contribute Word
                    </button>
                    <button
                        onClick={() => setActiveTab('verify')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            zIndex: 1,
                            color: activeTab === 'verify' ? 'var(--color-text)' : 'var(--color-text-light)',
                            fontWeight: activeTab === 'verify' ? '600' : '500',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            fontSize: '0.95rem'
                        }}>
                        Verify Pending
                    </button>
                </div>

                {activeTab === 'contribute' ? <ContributeForm /> : <ReviewQueue />}
            </div>
        </div>
    );
}
