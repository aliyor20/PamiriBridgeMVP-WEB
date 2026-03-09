import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MissionSection() {
    const missions = [
        "Preserve the languages of the Seven Valleys.",
        "Provide a dynamic tool for the diaspora.",
        "Bridge the gap between generations.",
        "Support translation and communication.",
        "Celebrate Pamiri heritage digitally."
    ];

    const [index, setIndex] = useState(0);
    const [text, setText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fullText = missions[index];
        let typingSpeed = isDeleting ? 30 : 80;

        if (!isDeleting && text === fullText) {
            typingSpeed = 3000; // Pause at end of sentence
            setIsDeleting(true);
        } else if (isDeleting && text === "") {
            setIsDeleting(false);
            setIndex((prev) => (prev + 1) % missions.length);
            typingSpeed = 500; // Pause before new sentence
        }

        const timer = setTimeout(() => {
            setText(isDeleting ? fullText.substring(0, text.length - 1) : fullText.substring(0, text.length + 1));
        }, typingSpeed);

        return () => clearTimeout(timer);
    }, [text, isDeleting, index]);

    return (
        <section style={{
            margin: '4rem 0',
            textAlign: 'center',
            position: 'relative'
        }}>
            {/* Background blur orb */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '300px',
                height: '300px',
                background: 'rgba(var(--color-primary-rgb), 0.15)',
                filter: 'blur(100px)',
                borderRadius: '50%',
                zIndex: 0
            }} />

            <div style={{
                padding: '4rem 2rem',
                position: 'relative',
                zIndex: 1,
            }}>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="serif"
                    style={{
                        color: 'var(--color-primary)',
                        fontSize: '1.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        marginBottom: '1rem'
                    }}
                >
                    Our Mission
                </motion.h2>

                <div className="mission-text-container" style={{ position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <h3 className="serif" style={{
                        position: 'absolute',
                        width: '100%',
                        fontSize: '2.5rem',
                        fontWeight: '600',
                        color: '#fff',
                        lineHeight: '1.4',
                        margin: 0,
                        top: '20px'
                    }}>
                        <span style={{ display: 'block', marginBottom: '8px' }}>
                            "Our mission is to
                        </span>
                        <span style={{ display: 'block' }}>
                            <span style={{
                                color: 'var(--color-primary)',
                                borderRight: '3px solid var(--color-primary)',
                                paddingRight: '5px',
                                animation: 'blink 1s step-end infinite'
                            }}>
                                {text}
                            </span>
                            <span style={{ color: '#fff' }}>"</span>
                        </span>
                    </h3>
                </div>
            </div>

            <style>{`
                @keyframes blink {
                    50% { border-color: transparent; }
                }
                @media (max-width: 600px) {
                    h3.serif {
                        font-size: 1.8rem !important;
                    }
                    .mission-text-container {
                        height: 250px !important;
                    }
                }
            `}</style>
        </section>
    );
}
