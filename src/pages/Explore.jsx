import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDictionary } from '../context/DictionaryContext';
import { useLanguage } from '../context/LanguageContext';
import BentoSkeleton from '../components/BentoSkeleton';
import BentoGrid from '../components/BentoGrid';
import { Search, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InstallPromptBanner } from '../components/InstallPrompts';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/glass.css';
import StatCounter from '../components/StatCounter';
import MissionSection from '../components/MissionSection';
import DialectSection from '../components/DialectSection';
import DevsSection from '../components/DevsSection';
import AppDownloadSection from '../components/AppDownloadSection';

export default function Explore() {
    const { search, stats } = useDictionary();
    const { loginWithGoogle } = useAuth();
    const { t } = useLanguage();
    const [term, setTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showMinor, setShowMinor] = useState(false);

    // Typewriter State
    const placeholderWords = ["Shirchoy", "Cat", "Khorog", "Kulcha", "Rain", "Maska", "Pesh", "Dastorkhon"];
    const [placeholderText, setPlaceholderText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // Scroll listener for sticky search compression
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 80) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Typewriter Effect
    useEffect(() => {
        if (isFocused || term) return;

        const currentWord = placeholderWords[wordIndex];
        const fullText = `${t('home.select_word')} ${currentWord}?`;

        let typingSpeed = isDeleting ? 40 : 120;

        if (!isDeleting && placeholderText === fullText) {
            typingSpeed = 2000;
            setIsDeleting(true);
        } else if (isDeleting && placeholderText === `${t('home.select_word')} `) {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % placeholderWords.length);
            typingSpeed = 1000;
        }

        const timer = setTimeout(() => {
            const nextText = isDeleting
                ? fullText.substring(0, placeholderText.length - 1)
                : fullText.substring(0, placeholderText.length + 1);
            setPlaceholderText(nextText);
        }, typingSpeed);

        return () => clearTimeout(timer);
    }, [placeholderText, isDeleting, wordIndex, isFocused, term]);

    // Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (term.length >= 2) {
                setIsSearching(true);
                try {
                    const hits = await search(term);
                    setResults(hits);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [term, search]);

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            {/* Compressing Sticky Header with iPhone Notch safe area */}
            <header
                className={`explore-header glass-panel ${scrolled ? 'scrolled' : ''}`}
                style={{ paddingTop: scrolled ? 'calc(env(safe-area-inset-top, 40px) + 15px)' : 'env(safe-area-inset-top, 10px)' }}
            >
                <div className="container header-inner" style={{ transition: 'all 0.3s ease' }}>
                    <div className="brand-stack explore-brand-stack">
                        <img src="/LogoDarkBlack.svg" alt="Pamiri Bridge" className="header-logo" />
                        <h1 className="serif header-title" style={{ marginLeft: '10px', fontSize: 'clamp(1.2rem, 5vw, 1.8rem)' }}>Pamiri Bridge</h1>
                    </div>

                    <div className="search-container" style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                        <Search className="search-icon" size={20} color="var(--color-text-light)" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
                        <input
                            type="text"
                            className="search-input-glass tour-search"
                            placeholder={isFocused ? "" : placeholderText}
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{ padding: '16px 24px 16px 54px', fontSize: '1.2rem', height: '60px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        />
                    </div>

                    <div className="auth-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <ThemeToggle />
                        <Link to="/signup" className="btn-signup-small glass-panel" style={{ textDecoration: 'none', background: 'rgba(76, 175, 80, 0.2)', borderColor: 'rgba(76, 175, 80, 0.5)' }}>
                            <UserPlus size={20} color="#4caf50" />
                            <span className="login-text" style={{ fontSize: '1.1rem', color: '#4caf50', fontWeight: 'bold' }}>{t('profile.signup_btn')}</span>
                        </Link>
                        <Link to="/login" className="btn-login-small glass-panel" style={{ textDecoration: 'none' }}>
                            <LogIn size={20} />
                            <span className="login-text" style={{ fontSize: '1.1rem' }}>{t('profile.login_btn')}</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container" style={{ marginTop: scrolled ? '140px' : '20px' }}>
                {isSearching && (
                    <div className="results">
                        <BentoSkeleton style={{ marginBottom: '1rem' }} />
                        <BentoSkeleton style={{ marginBottom: '1rem', opacity: 0.7 }} />
                    </div>
                )}

                {!isSearching && results.length > 0 && (
                    <div className="results">
                        {results.map((entry, index) => (
                            <Link
                                key={entry.id}
                                to={`/word/${entry.id}`}
                                style={{ textDecoration: 'none', '--delay': index }}
                                className="bento-card glass-panel animate-enter"
                            >
                                <div className="result-card">
                                    <h3 className="result-word serif">{entry.word}</h3>
                                    <span className="result-dialect">{entry.dialect}</span>
                                    <p style={{ color: 'var(--color-text)' }}>{entry.meaning}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
                {!isSearching && term.length >= 2 && results.length === 0 && (
                    <div className="results" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                        <p>No results found for "{term}".</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Log in to contribute this word to the dictionary.</p>
                    </div>
                )}

                {/* Only show Default Explore Feed if NOT searching */}
                {!term && results.length === 0 && (
                    <section className="explore-feed fade-in">
                        <StatCounter targetCount={stats?.count || 12450} />

                        <MissionSection />

                        <div className="glass-panel" style={{ margin: '4rem 0', padding: '2rem 1rem' }}>
                            <h2 className="serif" style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: '2rem', fontSize: '2rem' }}>The Seven Valleys</h2>

                            <DialectSection
                                title="Shughni"
                                speakers="100,000+"
                                description="The most widely spoken Pamiri language, Shughni is the lingua franca of the Gorno-Badakhshan region. It has a rich oral tradition and is spoken in Khorog, Shughnan, and parts of Afghanistan."
                                facts={["Most spoken Pamiri language", "Lingua franca of Khorog", "Rich in poetry and folklore"]}
                            />

                            <DialectSection
                                title="Rushani"
                                speakers="20,000+"
                                description="Spoken in the Rushan district, this language is closely related to Shughni but maintains distinct grammatical features and vocabulary, especially in the Bartang valley borderlands."
                                facts={["Unique verbal agreement", "Strong presence in Bartang", "Ancient agricultural vocabulary"]}
                            />

                            <DialectSection
                                title="Wakhi"
                                speakers="50,000+"
                                description="Stretching across four countries, Wakhi is a distinct branch of the Pamiri languages. It retains many archaic features from Old Iranian and is spoken at high altitudes."
                                facts={["Spoken in 4 countries", "High-altitude adaptation", "Distinctive archaic features"]}
                            />

                            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                <button
                                    onClick={() => setShowMinor(!showMinor)}
                                    className="glass-panel" style={{
                                        padding: '12px 24px',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'var(--color-primary)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        border: 'none',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}>
                                    {showMinor ? "Collapse Minor Dialects" : "Explore More (Bartangi, Yazghulami, Ishkashimi...)"}
                                </button>

                                <AnimatePresence>
                                    {showMinor && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}
                                        >
                                            <DialectSection
                                                title="Bartangi"
                                                speakers="~3,000"
                                                description="Spoken along the Bartang river valley. Known for its phonological conservatism."
                                                facts={["Deep valley isolation", "Preserved archaic vocabulary"]}
                                            />
                                            <DialectSection
                                                title="Yazghulami"
                                                speakers="~9,000"
                                                description="Spoken in the Yazghulam valley. Very distinct from the Shughni-Rushani group."
                                                facts={["Distinct phylogenetic branch", "Unique numbering system"]}
                                            />
                                            <DialectSection
                                                title="Ishkashimi"
                                                speakers="~2,500"
                                                description="Spoken near Ishkashim border town. Severely endangered."
                                                facts={["Cross-border language", "Highly endangered"]}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <DevsSection />

                        {/* Bold CTA for Unauthenticated Users */}
                        <div className="glass-panel" style={{
                            marginTop: '3rem',
                            padding: '2.5rem 1.5rem',
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, rgba(0, 137, 123, 0.1) 0%, rgba(0,0,0,0.4) 100%)',
                            border: '1px solid var(--color-primary)'
                        }}>
                            <h3 className="serif" style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>{t('profile.signup_title')}</h3>
                            <p style={{ color: 'var(--color-text-light)', marginBottom: '2rem' }}>
                                {t('profile.signup_subtitle')}
                            </p>
                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Link to="/signup" className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.2rem', textDecoration: 'none', background: '#4caf50', borderColor: '#45a049', color: '#fff' }}>
                                    {t('profile.signup_btn')}
                                </Link>
                                <Link to="/login" className="btn-primary glass-panel" style={{ padding: '16px 32px', fontSize: '1.2rem', textDecoration: 'none', background: 'rgba(0,0,0,0.2)', color: 'var(--color-primary)' }}>
                                    {t('profile.login_btn')}
                                </Link>
                            </div>
                        </div>

                        <AppDownloadSection />
                    </section>
                )}
            </main>

            <style>{`
                .explore-header {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    padding: 2rem 1rem;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    border-radius: 0 0 24px 24px;
                    border-top: none;
                    margin-bottom: 2rem;
                }
                
                .explore-header.scrolled {
                    padding: 1rem;
                    border-radius: 0 0 16px 16px;
                    background: rgba(var(--color-background-rgb), 0.9);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                }

                .header-inner {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                    align-items: center;
                    transition: all 0.3s ease;
                }

                .scrolled .header-inner {
                    grid-template-columns: auto 1fr auto;
                    gap: 1rem;
                }

                .brand-stack {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }
                
                .explore-brand-stack {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    transform: scale(1.4);
                    transform-origin: top center;
                    margin-bottom: 1rem;
                    transition: all 0.3s ease;
                }
                
                .scrolled .explore-brand-stack {
                    display: none; /* Hide entirely on mobile when scrolled */
                }

                .scrolled .brand-stack {
                    justify-content: flex-start;
                }

                .header-logo {
                    width: 64px;
                    height: 64px;
                    transition: all 0.3s ease;
                    filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));
                }

                .scrolled .header-logo {
                    width: 40px;
                    height: 40px;
                }

                .header-title {
                    font-size: 2rem;
                    color: var(--color-primary);
                    margin: 0;
                    transition: all 0.3s ease;
                }

                .scrolled .header-title {
                    font-size: 1.2rem;
                    display: none; /* Hide on mobile scroll to save space */
                }

                @media (min-width: 768px) {
                    .explore-header { /* Expand container on desktop for header */
                        padding: 1rem 2rem;
                    }
                    .explore-brand-stack {
                        transform: scale(1); /* No giant logo on desktop */
                        justify-content: flex-start;
                        margin-bottom: 0;
                    }
                    .scrolled .explore-brand-stack {
                        display: flex; /* Keep logo visible on desktop scroll */
                    }
                    .scrolled .header-title {
                        display: block;
                    }
                    .header-inner {
                        grid-template-columns: auto 1fr auto;
                        max-width: 1200px; /* Let header spread out */
                    }
                    .brand-stack {
                        justify-content: flex-start;
                    }
                }

                .btn-login-small {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    border: none;
                    color: var(--color-primary);
                    font-weight: bold;
                    border-radius: 50px;
                    cursor: pointer;
                    justify-content: center;
                }
                
                .btn-signup-small {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    border: 1px solid rgba(76, 175, 80, 0.5);
                    border-radius: 50px;
                    cursor: pointer;
                    justify-content: center;
                }
                
                .scrolled .btn-login-small .login-text,
                .scrolled .btn-signup-small .login-text {
                    display: none;
                }

                @media (min-width: 600px) {
                    .scrolled .btn-login-small .login-text,
                    .scrolled .btn-signup-small .login-text {
                        display: inline;
                    }
                }

                .stats-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 8px 16px;
                    border-radius: 50px;
                    font-size: 0.9rem;
                    color: var(--color-text-light);
                    margin-bottom: 1rem;
                }
                
                .dot {
                    opacity: 0.5;
                }
            `}</style>

            {/* Footer */}
            <footer style={{
                marginTop: '6rem',
                paddingTop: '1.5rem',
                paddingBottom: '2rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.3px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#fff' }}>aliyor</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <a href="https://instagram.com/aliyor724" target="_blank" rel="noopener noreferrer"
                       style={{ color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                        </svg>
                        @aliyor724
                    </a>
                </div>
                <a href="mailto:pamiribridge.app@gmail.com"
                   style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.7rem' }}>
                    pamiribridge.app@gmail.com
                </a>
            </footer>
        </div>
    );
}
