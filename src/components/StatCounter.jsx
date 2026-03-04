import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function StatCounter({ targetCount = 12450 }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

    const dialects = [
        "Shughni", "Rushani", "Wakhi", "Bartangi", "Yazghulami", "Ishkashimi", "Sarikoli"
    ];

    const [dialectIndex, setDialectIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDialectIndex((prev) => (prev + 1) % dialects.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isInView) {
            let start = 0;
            const duration = 2000;
            const startTime = performance.now();

            const animateCount = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // easeInOutQuart
                const easeProgress = progress < 0.5
                    ? 8 * progress * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 4) / 2;

                setCount(Math.floor(easeProgress * targetCount));

                if (progress < 1) {
                    requestAnimationFrame(animateCount);
                }
            };

            requestAnimationFrame(animateCount);
        }
    }, [isInView, targetCount]);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="glass-panel"
            style={{
                margin: '2rem 0',
                padding: '3rem 2rem',
                textAlign: 'center',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {/* Background glow */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.15) 0%, transparent 60%)',
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{
                    fontSize: '1.2rem',
                    color: 'var(--color-text-light)',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    marginBottom: '1rem'
                }}>
                    Preserving <motion.span
                        key={dialectIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        style={{ color: 'var(--color-primary)', fontWeight: 'bold', display: 'inline-block' }}
                    >
                        {dialects[dialectIndex]}
                    </motion.span>
                </h3>

                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={isInView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                    className="serif"
                    style={{
                        fontSize: '5rem',
                        fontWeight: '800',
                        background: 'linear-gradient(to right, #fff, var(--color-primary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: '1.1',
                        textShadow: '0 10px 30px rgba(var(--color-primary-rgb), 0.3)'
                    }}
                >
                    {count.toLocaleString()}
                </motion.div>

                <p className="serif" style={{
                    fontSize: '1.4rem',
                    color: 'var(--color-text)',
                    marginTop: '0.5rem',
                    maxWidth: '400px',
                    margin: '1rem auto 0',
                    fontStyle: 'italic',
                    letterSpacing: '0.5px'
                }}>
                    Total Hosted Word entries.
                </p>
            </div>
        </motion.div>
    );
}
