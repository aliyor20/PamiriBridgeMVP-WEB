import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import '../styles/glass.css';
import '../styles/global.css';

export default function LogIn() {
    const { loginWithEmail, loginWithGoogle } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            addToast("Please fill in all fields.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await loginWithEmail(formData.email, formData.password);
            localStorage.removeItem('pb_install_prompt_dismissed_at');
            addToast("Welcome back!", "success");
            navigate('/');
        } catch (error) {
            console.error("Log in error:", error);
            const message = error.code === 'auth/invalid-credential'
                ? "Invalid email or password."
                : "Failed to log in. Please try again.";
            addToast(message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            localStorage.removeItem('pb_install_prompt_dismissed_at');
            navigate('/');
        } catch (error) {
            console.error("Google logic error:", error);
            addToast("Google Sign In failed.", "error");
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
            position: 'relative'
        }}>
            {/* Ambient Background Glow */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60vw',
                height: '60vw',
                background: 'radial-gradient(circle, rgba(0, 137, 123, 0.15) 0%, transparent 70%)',
                zIndex: -1,
                pointerEvents: 'none'
            }} />

            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem 2rem',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
            }}>

                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <img src="/LogoDarkBlack.svg" alt="Pamiri Bridge" style={{ height: '48px', marginBottom: '1rem', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }} />
                    <h1 className="serif" style={{ color: 'var(--color-primary)', fontSize: '2.5rem', margin: 0 }}>Welcome Back</h1>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div className="input-group" style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--color-text-light)' }} />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={handleChange}
                            className="search-input-glass"
                            style={{ paddingLeft: '44px', height: '52px', fontSize: '1rem' }}
                            required
                        />
                    </div>

                    <div className="input-group" style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--color-text-light)' }} />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            className="search-input-glass"
                            style={{ paddingLeft: '44px', height: '52px', fontSize: '1rem' }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSubmitting}
                        style={{ height: '52px', marginTop: '1rem', fontSize: '1.1rem', letterSpacing: '0.5px' }}
                    >
                        {isSubmitting ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                    <span style={{ padding: '0 12px', fontSize: '0.8rem' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="btn-secondary"
                    style={{
                        height: '52px',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        background: 'rgba(255,255,255,0.05)'
                    }}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                        Don't have an account? <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Sign Up</Link>
                    </p>
                </div>
            </div>

            {/* Back to Explore Escape Hatch */}
            <Link to="/explore" style={{
                position: 'fixed',
                top: 'env(safe-area-inset-top, 20px)',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-text-light)',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '50px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <ArrowLeft size={18} />
                <span>Explore</span>
            </Link>
        </div>
    );
}
