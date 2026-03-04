import React from 'react';

/**
 * A Bento-style Skeleton loader that shimmers.
 * Can be sized via props or CSS classes.
 */
export default function BentoSkeleton({ className, style }) {
    return (
        <div
            className={`bento-card animate-shimmer ${className || ''}`}
            style={{
                ...style,
                minHeight: '120px', // Default bento height
                border: 'none' // Skeletons don't need borders usually
            }}
        >
            {/* Optional internal structure to mimic content */}
            <div style={{
                height: '24px',
                width: '60%',
                background: 'rgba(150,150,150,0.1)',
                borderRadius: '4px',
                marginBottom: '1rem'
            }} />
            <div style={{
                height: '16px',
                width: '80%',
                background: 'rgba(150,150,150,0.1)',
                borderRadius: '4px'
            }} />
        </div>
    );
}
