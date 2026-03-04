import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as idb from '../lib/idb';
import AudioWaveform from '../components/AudioWaveform';

export default function WordDetail() {
    const { id } = useParams();
    const [entry, setEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchEntry() {
            try {
                setLoading(true);
                if (!id) throw new Error("No ID provided");

                // Direct IDB lookup - NO network fetch
                const data = await idb.getEntryById(id);

                if (!data) {
                    setError("Word not found in local dictionary.");
                } else {
                    setEntry(data);
                }
            } catch (err) {
                console.error(err);
                setError("Error loading word.");
            } finally {
                setLoading(false);
            }
        }

        fetchEntry();
    }, [id]);

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;
    if (error) return <div className="container" style={{ paddingTop: '2rem', color: 'red' }}>{error} <br /> <Link to="/">Go Home</Link></div>;
    if (!entry) return null;

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem' }}>&larr; Back to Search</Link>

            <article style={{
                backgroundColor: 'var(--color-surface)',
                padding: '2rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="serif" style={{ color: 'var(--color-primary)', marginBottom: '0.5rem', fontSize: '2.5rem' }}>{entry.word}</h1>
                        <span className="mono" style={{
                            backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: 'var(--color-primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontWeight: 'bold'
                        }}>
                            {entry.dialect || 'General'}
                        </span>
                    </div>

                    {/* Verification Status Badge */}
                    {entry.status && (
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            backgroundColor: entry.status === 'verified' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(239, 108, 0, 0.1)',
                            color: entry.status === 'verified' ? '#2E7D32' : '#EF6C00',
                            border: `1px solid ${entry.status === 'verified' ? '#C8E6C9' : '#FFE0B2'}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {entry.status}
                        </span>
                    )}
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <h3 className="serif" style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Meaning</h3>
                    <p style={{ fontSize: '1.4rem', lineHeight: '1.6', fontWeight: '500' }}>{entry.meaning}</p>
                </div>

                {entry.examples && entry.examples.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 className="serif" style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Examples</h3>
                        <ul style={{ paddingLeft: '1.2rem', borderLeft: '3px solid var(--color-primary)', listStyle: 'none' }}>
                            {entry.examples.map((ex, idx) => (
                                <li key={idx} style={{ marginBottom: '1rem', fontStyle: 'italic', color: 'var(--color-text)' }}>
                                    "{ex}"
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Audio Player */}
                {entry.audioUrl && (
                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                        <h3 className="serif" style={{ color: 'var(--color-text-light)', fontSize: '1rem', marginBottom: '0.5rem' }}>Pronunciation</h3>
                        <AudioWaveform audioUrl={entry.audioUrl} />
                    </div>
                )}

                <div className="mono" style={{ marginTop: '2rem', fontSize: '0.7rem', color: 'var(--color-text-light)', textAlign: 'right' }}>
                    ID: {entry.id}
                </div>
            </article>
        </div>
    );
}
