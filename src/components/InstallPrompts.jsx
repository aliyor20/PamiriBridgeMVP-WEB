import React, { useState } from 'react';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { Share, PlusSquare, Download } from 'lucide-react';
import '../styles/glass.css';

export function GlobalInstallBanner() {
    const { isIOS, isAndroid, isStandalone } = useDeviceDetect();
    const [showIOSModal, setShowIOSModal] = useState(false);

    if (isStandalone || (!isIOS && !isAndroid)) return null;

    return (
        <>
            {showIOSModal && (
                <div className="onboarding-overlay" style={{ zIndex: 100000 }}>
                    <div className="onboarding-card glass-panel" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '400px', width: '90%' }}>
                        <h2 className="serif" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Install Pamiri Bridge</h2>
                        <p style={{ color: 'var(--color-text)', marginBottom: '1.5rem', fontSize: '1rem', lineHeight: '1.5', textAlign: 'center' }}>
                            Add Pamiri Bridge to your Home Screen for essential database persistence and a faster, native experience.
                        </p>

                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', width: '100%', marginBottom: '2rem', textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <Share size={20} color="var(--color-primary)" style={{ marginRight: '12px' }} />
                                <span style={{ fontSize: '0.95rem' }}>1. Tap the Share button below.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <PlusSquare size={20} color="var(--color-primary)" style={{ marginRight: '12px' }} />
                                <span style={{ fontSize: '0.95rem' }}>2. Tap <strong>Add to Home Screen</strong>.</span>
                            </div>
                        </div>
                        <button onClick={() => setShowIOSModal(false)} className="btn-primary" style={{ padding: '12px 24px', width: '100%', borderRadius: '50px' }}>Got it</button>
                    </div>
                </div>
            )}

            <div style={{
                width: '100%',
                background: 'linear-gradient(90deg, var(--color-primary) 0%, #005f56 100%)',
                color: 'white',
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 9999
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '12px' }}>
                    <span className="serif" style={{ fontSize: '1.05rem', fontWeight: 'bold', lineHeight: '1.2' }}>Pamiri Bridge App</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>Faster native experience</span>
                </div>
                {isIOS ? (
                    <button style={{
                        background: 'white', color: 'var(--color-primary)', border: 'none',
                        padding: '8px 16px', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.85rem',
                        cursor: 'pointer', flexShrink: 0
                    }} onClick={() => setShowIOSModal(true)}>
                        Add iOS App
                    </button>
                ) : (
                    <button style={{
                        background: 'white', color: 'var(--color-primary)', border: 'none',
                        padding: '8px 16px', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.85rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0
                    }} onClick={() => window.location.href = "https://github.com/aliyor20/PamiriBridgeAndorid/releases/download/v.1.1.0/PamiriBridge1.1.0.apk"}>
                        <Download size={16} style={{ marginRight: '6px' }} />
                        Download
                    </button>
                )}
            </div>
        </>
    );
}

// Deprecated exports to prevent crash in currently importing files
export function InstallPromptModal() { return null; }
export function InstallPromptBanner() { return null; }
