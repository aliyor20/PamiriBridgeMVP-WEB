import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useHaptic } from '../hooks/useHaptic';
import Joyride, { STATUS } from 'react-joyride';
import ThemeToggle from './ThemeToggle';
import { Search, Home as HomeIcon, BarChart2, ShieldCheck, User, Plus, Settings } from 'lucide-react';
import { InstallPromptModal, GlobalInstallBanner } from './InstallPrompts';
import AnimatedBackground from './AnimatedBackground';
import '../styles/global.css';

export default function Layout() {
    const { user, userProfile, loginWithGoogle } = useAuth();
    const { t } = useLanguage();
    const [runTour, setRunTour] = useState(false);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const lastScrollY = useRef(0);
    const haptic = useHaptic();
    const location = useLocation();
    const isElderOrHigher = userProfile && ['elder', 'guide', 'pioneer'].includes(userProfile.role);

    useEffect(() => {
        if (localStorage.getItem('pb_start_tour') === 'true') {
            localStorage.removeItem('pb_start_tour');
            setTimeout(() => setRunTour(true), 500);
        }
    }, [location.pathname]);

    // Keyboard detection logic for mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                // If height shrinks significantly (e.g. >25%), keyboard is likely open
                const isShrunk = window.visualViewport.height < window.innerHeight * 0.75;
                setIsKeyboardOpen(isShrunk);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            // Initial check
            handleResize();
            return () => window.visualViewport.removeEventListener('resize', handleResize);
        }
    }, []);

    useEffect(() => {
        if (localStorage.getItem('pb_start_tour') === 'true') {
            localStorage.removeItem('pb_start_tour');
            setTimeout(() => setRunTour(true), 500);
        }
    }, [location.pathname]);

    const tourSteps = [
        {
            target: '.tour-search',
            content: (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                    <h3 className="serif" style={{ fontSize: '1.4rem', marginBottom: '12px', color: 'var(--color-primary)' }}>Welcome to Pamiri Bridge</h3>
                    <p style={{ fontSize: '1rem', color: 'var(--color-text-light)', lineHeight: '1.5' }}>
                        Our mission is to build a digital home for the Pamiri languages. Prepare to track your impact, earn Karma, and help preserve our heritage.
                    </p>
                </div>
            ),
            disableBeacon: true,
        },
        {
            target: '.tour-nav-contribute',
            content: 'Help us build the bridge by submitting new words into the Verification Queue. (Coming Soon)',
        },
        {
            target: '.tour-nav-stats',
            content: 'Track your impact, earn Karma points, and rise through the ranks! (Coming Soon)',
        }
    ];

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTour(false);
        }
    };

    // Scroll logic removed so nav stays visible

    const isExploreView = location.pathname === '/explore' || (location.pathname === '/' && !user && localStorage.getItem('pb_explore_mode') === 'true');

    return (
        <div className="layout">
            <GlobalInstallBanner />
            <AnimatedBackground />
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous={true}
                showSkipButton={true}
                showProgress={true}
                callback={handleJoyrideCallback}
                floaterProps={{
                    styles: {
                        floater: {
                            filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.5))',
                        }
                    }
                }}
                styles={{
                    options: {
                        primaryColor: '#00897b',
                        backgroundColor: 'transparent',
                        textColor: '#fff',
                        arrowColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    tooltipContainer: {
                        textAlign: 'left'
                    },
                    tooltip: {
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        padding: '24px',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        color: 'var(--color-text)'
                    },
                    buttonNext: {
                        backgroundColor: 'var(--color-primary)',
                        borderRadius: '50px',
                        padding: '10px 20px',
                        fontWeight: 'bold',
                        color: '#fff'
                    },
                    buttonBack: {
                        color: 'var(--color-text-light)',
                        marginRight: 10
                    },
                    buttonSkip: {
                        color: 'var(--color-text-light)',
                    }
                }}
            />

            {/* Mobile Top Bar (Simplified - Text Removed based on feedback) */}
            <header className="mobile-header" style={{ height: 'env(safe-area-inset-top, 20px)' }}>
            </header>

            {/* Desktop Header */}
            {!isExploreView && (
                <header className="desktop-header glass-panel">
                    <div className="container-large header-content">
                        <Link to="/" className="logo">
                            Pamiri Bridge
                        </Link>

                        <nav className="desktop-nav" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <NavLink
                                to="/"
                                className={({ isActive }) => `theme-pill-btn glass-panel ${isActive ? "active" : ""}`}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.8)',
                                    padding: '10px 16px',
                                    borderRadius: '50px',
                                    height: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <HomeIcon size={18} /> {t('nav.home')}
                            </NavLink>
                            <NavLink
                                to="/stats"
                                className={({ isActive }) => `theme-pill-btn glass-panel ${isActive ? "active" : ""}`}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.8)',
                                    padding: '10px 16px',
                                    borderRadius: '50px',
                                    height: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <BarChart2 size={18} /> Stats
                            </NavLink>
                            {isElderOrHigher && (
                                <NavLink
                                    to="/verification"
                                    className={({ isActive }) => `theme-pill-btn glass-panel ${isActive ? "active" : ""}`}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.8)',
                                        padding: '10px 16px',
                                        borderRadius: '50px',
                                        height: '44px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <ShieldCheck size={18} /> Verification
                                </NavLink>
                            )}

                            <div style={{ marginLeft: '8px', marginRight: '8px' }}>
                                <ThemeToggle />
                            </div>

                            {user ? (
                                <>
                                    <NavLink
                                        to="/settings"
                                        className={({ isActive }) => `theme-pill-btn glass-panel ${isActive ? "active" : ""}`}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'rgba(255,255,255,0.8)',
                                            padding: '10px 16px',
                                            borderRadius: '50px',
                                            height: '44px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            textDecoration: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        <Settings size={18} /> Settings
                                    </NavLink>
                                    <Link to="/profile" className="profile-link">
                                        <img
                                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || user.email)}&background=random`}
                                            alt="Profile"
                                            className="avatar-small"
                                        />
                                    </Link>
                                </>
                            ) : (
                                <Link to="/login" className="login-btn" style={{ textDecoration: 'none' }}>
                                    Log In
                                </Link>
                            )}
                        </nav>
                    </div>
                </header>
            )}

            <main className="main-content">
                <Outlet />
            </main>

            {/* Floating Dock (Mobile) ONLY if User is logged in */}
            {
                user && (
                    <nav
                        className="mobile-nav glass-panel"
                        role="navigation"
                        style={{
                            transform: isKeyboardOpen ? 'translateY(150%)' : 'translateY(0)',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: isKeyboardOpen ? 0 : 1,
                            pointerEvents: isKeyboardOpen ? 'none' : 'auto'
                        }}
                    >
                        <MobileNavItem to="/" icon={<HomeIcon size={24} />} label={t('nav.home')} haptic={haptic} className="tour-nav-home" />
                        <MobileNavItem to="/stats" icon={<BarChart2 size={24} />} label="Stats" haptic={haptic} className="tour-nav-stats" />

                        {/* Contribute Button (Center) */}
                        <div className="nav-item-center tour-nav-contribute" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-12px' }}>
                            <Link
                                to="/contribute"
                                onClick={() => haptic && haptic('medium')}
                                className="glass-panel"
                                style={{
                                    width: '46px',
                                    height: '46px',
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid rgba(0, 137, 123, 0.4)', // subtle primary border
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '16px',
                                    color: 'var(--color-primary-light)',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                    marginBottom: '4px',
                                    textDecoration: 'none'
                                }}
                            >
                                <Plus size={24} />
                            </Link>
                            <span style={{ fontSize: '10px', color: 'var(--color-primary-light)', fontWeight: '600' }}>Contribute</span>
                        </div>

                        <MobileNavItem to="/settings" icon={<Settings size={24} />} label="Settings" haptic={haptic} />
                        <MobileNavItem to="/profile" icon={<User size={24} />} label={t('nav.profile')} haptic={haptic} />
                    </nav>
                )
            }
        </div >
    );
}

function MobileNavItem({ to, icon, label, haptic, className = "" }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `nav-link ${className} ${isActive ? 'active' : ''}`}
            onClick={() => haptic && haptic('light')}
            style={{ textDecoration: 'none' }}
        >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
        </NavLink>
    );
}
