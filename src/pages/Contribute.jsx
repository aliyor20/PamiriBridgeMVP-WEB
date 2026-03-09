import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import ContributeForm from '../components/ContributeForm';
import GuidedContributionWidget from '../components/GuidedContributionWidget';
import ActionWidget from '../components/ActionWidget';
import '../styles/glass.css';

export default function Contribute() {
    const { user, userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('contribute');

    // Protect route naturally
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const isElderOrHigher = !!userProfile; // Open verification to everyone

    return (
        <div className="page-container">
            <div className="container" style={{ paddingBottom: '120px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 className="serif" style={{ fontSize: '2rem', color: 'var(--color-primary)', margin: 0 }}>Contribute</h1>
                </div>

                {/* Header / Tabs */}
                {isElderOrHigher && (
                    <div style={{ display: 'flex', marginBottom: '32px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '16px' }}>
                        <button
                            onClick={() => setActiveTab('contribute')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: activeTab === 'contribute' ? 'var(--color-surface)' : 'transparent',
                                border: 'none',
                                borderRadius: '12px',
                                color: activeTab === 'contribute' ? 'var(--color-primary)' : 'var(--color-text-light)',
                                fontWeight: activeTab === 'contribute' ? 'bold' : 'normal',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Contribute
                        </button>
                        <button
                            onClick={() => setActiveTab('verify')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: activeTab === 'verify' ? 'var(--color-surface)' : 'transparent',
                                border: 'none',
                                borderRadius: '12px',
                                color: activeTab === 'verify' ? 'var(--color-primary)' : 'var(--color-text-light)',
                                fontWeight: activeTab === 'verify' ? 'bold' : 'normal',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '1rem'
                            }}
                        >
                            Verify
                        </button>
                    </div>
                )}

                {activeTab === 'contribute' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Guided Contribution Widget */}
                        <section>
                            <h2 className="serif" style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: '16px' }}>Help Translate</h2>
                            <GuidedContributionWidget />
                        </section>

                        {/* Custom Word Submission */}
                        <section>
                            <h2 className="serif" style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: '16px' }}>Add a Missing Word</h2>
                            <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px' }}>
                                <ContributeForm />
                            </div>
                        </section>
                    </div>
                ) : (
                    <section>
                        <ActionWidget />
                    </section>
                )}
            </div>
        </div>
    );
}
