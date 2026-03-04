import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Apple, CheckCircle2, Copy } from 'lucide-react';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

export default function AppDownloadSection() {
    const { isIOS, isAndroid, isStandalone } = useDeviceDetect();
    const [dismissed, setDismissed] = useState(false);

    const isDesktop = !isIOS && !isAndroid;

    if (dismissed || isStandalone) return null; // Don't show if already installed (standalone) or dismissed

    return (
        <AnimatePresence>
            {!dismissed && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="glass-panel"
                    style={{
                        margin: '4rem 0',
                        padding: '3rem 2rem',
                        position: 'relative',
                        borderRadius: '32px',
                        border: '2px solid rgba(var(--color-primary-rgb), 0.4)',
                        background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.15) 0%, rgba(0,0,0,0.8) 100%)',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Background Graphic */}
                    <div style={{
                        position: 'absolute',
                        right: '-10%',
                        top: '-20%',
                        width: '300px',
                        height: '300px',
                        background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.3) 0%, transparent 70%)',
                        filter: 'blur(50px)',
                        zIndex: 0
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h2 className="serif" style={{ margin: 0, fontSize: '2.5rem', color: '#fff', lineHeight: '1.2' }}>
                                Get the <span style={{ color: 'var(--color-primary)' }}>App</span>
                            </h2>
                            <button
                                onClick={() => setDismissed(true)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-light)'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {isDesktop ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <Apple size={32} color="#fff" />
                                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>iOS Safari</h3>
                                    </div>
                                    <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                                        Open this website on your iPhone/iPad using Safari. Tap the share icon, then tap "Add to Home Screen".
                                    </p>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>Android Native</h3>
                                    </div>
                                    <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                                        Get the full native experience with offline support and contribution tools.
                                    </p>
                                    <a href="https://github.com/aliyor20/PamiriBridgeAndorid/releases/download/v.1.1.0/PamiriBridge1.1.0.apk"
                                        style={{
                                            display: 'inline-block',
                                            background: '#4caf50',
                                            color: '#fff',
                                            textDecoration: 'none',
                                            padding: '12px 24px',
                                            borderRadius: '50px',
                                            fontWeight: 'bold',
                                            fontSize: '1.1rem',
                                            boxShadow: '0 10px 20px rgba(76,175,80,0.3)'
                                        }}>
                                        Download APK
                                    </a>
                                </div>
                            </div>
                        ) : isIOS ? (
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                    <Apple size={32} color="#fff" />
                                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>Get it on HOME Page</h3>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--color-text)', fontSize: '1.1rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>1</div>
                                        Tap the <strong style={{ color: '#fff' }}>Share</strong> button in Safari below.
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--color-text)', fontSize: '1.1rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>2</div>
                                        Scroll down and tap <strong style={{ color: '#fff' }}>Add to Home Screen</strong>.
                                    </li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text)', fontSize: '1.1rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>3</div>
                                        Tap <strong style={{ color: '#fff' }}>Add</strong> in the top right.
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#fff' }}>Download for Android</h3>
                                <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                                    Get the full native experience with offline support and contribution tools.
                                </p>
                                <a href="https://github.com/aliyor20/PamiriBridgeAndorid/releases/download/v.1.1.0/PamiriBridge1.1.0.apk"
                                    style={{
                                        display: 'inline-block',
                                        background: '#4caf50',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        padding: '16px 32px',
                                        borderRadius: '50px',
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem',
                                        boxShadow: '0 10px 20px rgba(76,175,80,0.3)'
                                    }}>
                                    Download APK
                                </a>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button onClick={() => setDismissed(true)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer', fontSize: '1.1rem', textDecoration: 'underline' }}>
                                Do later
                            </button>
                            <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                                Web might not function properly on mobile devices.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
