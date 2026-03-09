import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import ActionWidget from '../components/ActionWidget';

export default function VerificationQueue() {
    const { user, userProfile } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    const isElderOrHigher = !!user; // Open verification to everyone

    if (!isElderOrHigher) {
        return <div className="container" style={{ paddingTop: '2rem' }}>Access Restricted. Only Guides, Elders, and Admins can verify words.</div>;
    }

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 className="serif" style={{ fontSize: '2rem', color: 'var(--color-primary)', margin: 0 }}>Verification Desk</h1>
            </div>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <ActionWidget />
            </div>
            <div style={{ height: '120px' }}></div>
        </div>
    );
}
