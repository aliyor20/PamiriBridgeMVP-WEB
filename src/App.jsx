import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DictionaryProvider } from './context/DictionaryContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext'; // Added LanguageProvider import
import Layout from './components/Layout';
import Home from './pages/Home';
import Stats from './pages/Stats';
import WordDetail from './pages/WordDetail';
import Profile from './pages/Profile';
import VerificationQueue from './pages/VerificationQueue';
import Welcome from './pages/Welcome';
import Explore from './pages/Explore';
import Settings from './pages/Settings';
import SignUp from './pages/SignUp';
import LogIn from './pages/LogIn';
import Contribute from './pages/Contribute';
import { useAuth } from './context/AuthContext';
import './styles/global.css';
import './styles/themes.css';

function ConditionalLayout() {
    const { user, loading } = useAuth();
    const location = useLocation();
    const exploreMode = localStorage.getItem('pb_explore_mode') === 'true';

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-background)' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const isWelcomeScreen = location.pathname === '/' && !user && !exploreMode;

    if (isWelcomeScreen) {
        return <Outlet />;
    }

    return <Layout />;
}

// A helper wrapper to resolve the root path based on user state
function RootResolver() {
    const { user } = useAuth();
    const exploreMode = localStorage.getItem('pb_explore_mode') === 'true';

    if (!user) {
        if (exploreMode) {
            return <Explore />;
        }
        return <Welcome />;
    }

    return <Home />;
}

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <LanguageProvider>
                    <ToastProvider>
                        <DictionaryProvider>
                            <Router>
                                <Routes>
                                    <Route path="/signup" element={<SignUp />} />
                                    <Route path="/login" element={<LogIn />} />
                                    <Route element={<ConditionalLayout />}>
                                        <Route path="/" element={<RootResolver />} />
                                        <Route path="explore" element={<Explore />} />
                                        <Route path="stats" element={<Stats />} />
                                        <Route path="word/:id" element={<WordDetail />} />
                                        <Route path="profile" element={<Profile />} />
                                        <Route path="contribute" element={<Contribute />} />
                                        <Route path="verification" element={<VerificationQueue />} />
                                        <Route path="settings" element={<Settings />} />
                                    </Route>
                                </Routes>
                            </Router>
                        </DictionaryProvider>
                    </ToastProvider>
                </LanguageProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
