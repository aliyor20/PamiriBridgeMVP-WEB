import React, { useState } from 'react';
import { Search, PenTool, ShieldCheck, Award, Map } from 'lucide-react';

export default function Onboarding({ onComplete }) {
    const [slide, setSlide] = useState(0);

    const handleNext = () => setSlide(s => s + 1);

    const handleComplete = () => {
        // Mark as seen so we don't auto-show again if implemented
        localStorage.setItem('pb_seen_onboarding', 'true');
        onComplete();
    };

    const slides = [
        {
            title: "Word Lookup",
            icon: <Search size={48} color="var(--color-primary)" style={{ marginBottom: '1rem' }} />,
            content: (
                <>
                    <p className="onboarding-text">
                        Find translations across all <strong>7 Pamiri dialects</strong> instantly.
                    </p>
                    <p className="onboarding-subtext">
                        Our fuzzy search understands informal chat script, making it easy to find exactly what you're looking for.
                    </p>
                </>
            )
        },
        {
            title: "Contribution & Verification",
            icon: <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
                <PenTool size={40} color="var(--color-secondary)" />
                <ShieldCheck size={40} color="var(--color-primary)" />
            </div>,
            content: (
                <>
                    <p className="onboarding-text">
                        Help us build the bridge by submitting new words.
                    </p>
                    <p className="onboarding-subtext">
                        Every submission enters the <strong>Verification Queue</strong>. It takes 3 trusted Guides to approve a word before it becomes an official part of the dictionary.
                    </p>
                </>
            )
        },
        {
            title: "Walkthrough",
            icon: <Map size={48} color="#FFD700" style={{ marginBottom: '1rem' }} />,
            content: (
                <>
                    <p className="onboarding-text">
                        Track your impact and earn recognition.
                    </p>
                    <p className="onboarding-subtext">
                        Earn <strong>Karma points</strong>, unlock badges, and rise through the ranks from Traveler to Elder as you actively contribute and verify entries.
                    </p>
                </>
            )
        }
    ];

    const currentSlide = slides[slide];

    return (
        <div className="onboarding-overlay" style={{ zIndex: 10000 }}>
            <div className="onboarding-card glass-panel" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {currentSlide.icon}
                <h2 className="onboarding-title serif">{currentSlide.title}</h2>

                <div className="onboarding-body" style={{ margin: '1.5rem 0' }}>
                    {currentSlide.content}
                </div>

                <div className="onboarding-footer" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                    <div className="dots" style={{ display: 'flex', gap: '8px' }}>
                        {slides.map((_, i) => (
                            <span
                                key={i}
                                className={`dot ${i === slide ? 'active' : ''}`}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: i === slide ? 'var(--color-primary)' : 'var(--color-border)',
                                    transition: 'background 0.3s'
                                }}
                            />
                        ))}
                    </div>

                    {slide < slides.length - 1 ? (
                        <button className="btn-primary" onClick={handleNext} style={{ width: '100%', padding: '12px' }}>
                            Next
                        </button>
                    ) : (
                        <button className="btn-primary" onClick={handleComplete} style={{ width: '100%', padding: '12px' }}>
                            Start Exploring
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
