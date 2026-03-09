import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWindowSize } from 'react-use';
import { useDictionary } from '../context/DictionaryContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BentoSkeleton from '../components/BentoSkeleton';
import { Search } from 'lucide-react';
import { InstallPromptBanner } from '../components/InstallPrompts';
import AudioWaveform from '../components/AudioWaveform';
import QuizWidget from '../components/QuizWidget';
import ActionWidget from '../components/ActionWidget';
import GuidedContributionWidget from '../components/GuidedContributionWidget';
import '../styles/global.css';

export default function Home() {
    const { user, userProfile } = useAuth();
    const { search, stats } = useDictionary();
    const [term, setTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const { width } = useWindowSize();
    const isDesktop = width >= 768;

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
        <div style={{ paddingBottom: '2rem' }}>
            {user ? (
                <div className="container-large">
                    <HomeUser
                        user={user}
                        profile={userProfile}
                        term={term}
                        setTerm={setTerm}
                        results={results}
                        isSearching={isSearching}
                        isDesktop={isDesktop}
                    />
                </div>
            ) : (
                <HomePublic
                    stats={stats}
                    term={term}
                    setTerm={setTerm}
                    results={results}
                    isSearching={isSearching}
                />
            )}
        </div>
    );
}

function SearchSection({ term, setTerm, results, isSearching }) {
    const { t } = useLanguage();
    const [isFocused, setIsFocused] = useState(false);

    // Typewriter State
    const placeholderWords = ["Shirchoy", "Cat", "Khorog", "Kulcha", "Rain", "Maska", "Pesh", "Dastorkhon"];
    const [placeholderText, setPlaceholderText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

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

    return (
        <div className="search-section">
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
                    style={{ padding: '16px 24px 16px 54px', fontSize: '1.2rem', height: '60px', width: '100%' }}
                />
            </div>

            {isSearching && (
                <div className="results" style={{ marginTop: '2rem' }}>
                    <BentoSkeleton style={{ marginBottom: '1rem' }} />
                    <BentoSkeleton style={{ marginBottom: '1rem', opacity: 0.7 }} />
                </div>
            )}

            {!isSearching && results.length > 0 && (
                <div className="results" style={{ marginTop: '2rem' }}>
                    {results.map((entry, index) => (
                        <Link
                            key={entry.id}
                            to={`/word/${entry.id}`}
                            style={{ textDecoration: 'none', '--delay': index }}
                            className="bento-card animate-enter"
                        >
                            <div className="result-card">
                                <h3 className="result-word serif">{entry.word}</h3>
                                <span className="result-dialect">{entry.dialect}</span>
                                <p style={{ color: 'var(--color-text)', marginBottom: entry.audioUrl ? '12px' : '0' }}>{entry.meaning}</p>
                                {entry.audioUrl && (
                                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                        <AudioWaveform audioUrl={entry.audioUrl} />
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
            {!isSearching && term.length >= 2 && results.length === 0 && (
                <div className="results" style={{ marginTop: '2rem' }}>
                    <p style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>No results found.</p>
                </div>
            )}
        </div>
    );
}

function HomePublic({ stats, term, setTerm, results, isSearching }) {
    const [hookText, setHookText] = useState("The High Mountains");

    // Typewriter Effect Logic
    useEffect(() => {
        const phrases = ["The High Mountains", "The Secret Codes", "The Seven Valleys", "The Pamirs"];
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % phrases.length;
            setHookText(phrases[index]);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <section className="hero-section atmosphere">
                <div className="hero-content container">
                    <h1 className="hero-title serif">Saving the Language of...</h1>
                    <div className="hero-typewriter serif">{hookText}</div>

                    <div className="hero-omnibar">
                        <SearchSection term={term} setTerm={setTerm} results={results} isSearching={isSearching} />
                    </div>
                </div>
            </section>

            {/* Only show Mosaic if NOT searching */}
            {!term && results.length === 0 && (
                <section className="mosaic-section container-large">
                    <BentoGrid />
                    {/* Global banner handles installs now */}
                </section>
            )}
        </>
    );
}

function HomeUser({ user, profile, term, setTerm, results, isSearching, isDesktop }) {
    const { t } = useLanguage();
    const hour = new Date().getHours();
    let greeting = t('home.morning');
    if (hour >= 12 && hour < 18) greeting = t('home.afternoon');
    if (hour >= 18) greeting = t('home.evening');

    const firstName = profile?.displayName?.split(' ')[0] || 'User';

    return (
        <div style={{ paddingTop: '2rem' }}>
            <div className="dashboard-grid">
                <div className="main-col">
                    <h2 className="serif" style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
                        {greeting}, {firstName}
                    </h2>

                    <SearchSection term={term} setTerm={setTerm} results={results} isSearching={isSearching} />
                </div>

                {(isDesktop || (results.length === 0 && !term)) && (
                    <div className="sidebar-col">
                        <GuidedContributionWidget />
                        <div style={{ height: '16px' }}></div>
                        <ActionWidget />

                        <QuizWidget />

                        <div className="dashboard-card glass-panel" style={{ marginTop: '1rem' }}>
                            <h3 className="serif" style={{ fontSize: '1.2rem', margin: '0 0 1rem 0' }}>{t('home.your_impact')}</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--color-text-light)' }}>{t('home.contributions')}</span>
                                <strong className="mono">{profile?.points || 0}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-text-light)' }}>{t('profile.badges')}</span>
                                <strong className="mono">{profile?.badges?.length || 0}</strong>
                            </div>
                            <Link to="/profile" style={{ display: 'block', marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
                                View Passport &rarr;
                            </Link>
                        </div>

                        {/* Global banner handles installs now */}
                    </div>
                )}
            </div>
        </div>
    );
}
