import React from 'react';
import '../styles/glass.css';

const BentoGrid = () => {
    return (
        <div className="bento-grid">
            {/* Card 1: Shughni (The Big Card) */}
            <div className="bento-card shughni glass-panel interactive">
                <div className="card-content">
                    <h3 className="card-title serif">The Lingua Franca</h3>
                    <h2 className="card-lang">Shughni</h2>
                    <p className="card-subtext">Spoken by 95,000+ across Khorog and the Gunt Valley</p>
                </div>
                <div className="card-visual ruby-glow"></div>
            </div>

            {/* Card 2: Rushani (Grammar) */}
            <div className="bento-card rushani glass-panel interactive">
                <div className="card-content">
                    <h3 className="card-title serif">Grammar of Ancients</h3>
                    <h2 className="card-lang">Rushani</h2>
                    <p className="card-subtext">Home of the unique 'Double-Oblique' sentence structure</p>
                </div>
                <div className="card-visual emerald-glow"></div>
            </div>

            {/* Card 3: Wakhi (Archaic) */}
            <div className="bento-card wakhi glass-panel interactive">
                <div className="card-content">
                    <h3 className="card-title serif">The Roof's Edge</h3>
                    <h2 className="card-lang">Wakhi</h2>
                    <p className="card-subtext">Preserving the sounds of the ancient Saka warriors</p>
                </div>
                <div className="card-visual slate-glow"></div>
            </div>

            {/* Card 4: Yazghulami (Secret Code) */}
            <div className="bento-card yazghulami glass-panel interactive">
                <div className="card-content">
                    <h3 className="card-title serif">The Secret Code</h3>
                    <h2 className="card-lang">Yazghulami</h2>
                    <p className="card-subtext">A language historically used to hide secrets from invaders</p>
                </div>
                <div className="card-visual gold-glow"></div>
            </div>

            {/* Card 5: Ishkashimi (Taboo) */}
            <div className="bento-card ishkashimi glass-panel interactive">
                <div className="card-content">
                    <h3 className="card-title serif">The Hunting Language</h3>
                    <h2 className="card-lang">Ishkashimi</h2>
                    <p className="card-subtext">Words changed to avoid alerting the spirits of the hunt</p>
                </div>
                <div className="card-visual mystic-glow"></div>
            </div>
        </div>
    );
};

export default BentoGrid;
