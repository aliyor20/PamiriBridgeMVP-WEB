import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Globe } from 'lucide-react';
import '../styles/glass.css';
import '../styles/global.css';

export default function SignUp() {
    const { signUpWithEmail } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        dialect: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dialects = [
        "Shughni",
        "Wakhi",
        "Rushani",
        "Bartangi",
        "Yazghulami",
        "Ishkashimi",
        "Sarikoli",
        "Non-Speaker",
        "Other"
    ];

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSignUp = async (e) => {
        e.preventDefault();

        if (!formData.displayName || !formData.email || !formData.password || !formData.dialect) {
            addToast("Please fill in all fields.", "error");
            return;
        }

        if (formData.password.length < 6) {
            addToast("Password should be at least 6 characters.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await signUpWithEmail(formData.email, formData.password, formData.displayName, formData.dialect);

            // Set flag for automatic navigation tour
            localStorage.setItem('pb_start_tour', 'true');
            localStorage.removeItem('pb_install_prompt_dismissed_at');
            addToast("Account created successfully!", "success");
            navigate('/');
        } catch (error) {
            console.error("Sign up error:", error);
            const message = error.code === 'auth/email-already-in-use'
                ? "This email is already registered."
                : "Failed to create account. Please try again.";
            addToast(message, "error");
        } finally {
            setIsSubmitting(false);
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
                    <h1 className="serif" style={{ color: 'var(--color-primary)', fontSize: '2rem', margin: 0 }}>Join the Bridge</h1>
                    <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>Create an account to contribute</p>
                </div>

                <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div className="input-group" style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--color-text-light)' }} />
                        <input
                            type="text"
                            name="displayName"
                            placeholder="Display Name"
                            value={formData.displayName}
                            onChange={handleChange}
                            className="search-input-glass"
                            style={{ paddingLeft: '44px', height: '52px', fontSize: '1rem' }}
                            required
                        />
                    </div>

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

                    <div className="input-group" style={{ position: 'relative' }}>
                        <Globe size={18} style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--color-text-light)', zIndex: 1 }} />
                        <select
                            name="dialect"
                            value={formData.dialect}
                            onChange={handleChange}
                            className="search-input-glass"
                            style={{
                                paddingLeft: '44px',
                                height: '52px',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                appearance: 'none',
                                color: formData.dialect ? 'var(--color-text)' : 'var(--color-text-light)'
                            }}
                            required
                        >
                            <option value="" disabled>Select your Dialect</option>
                            {dialects.map(d => (
                                <option key={d} value={d} style={{ color: '#000' }}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSubmitting}
                        style={{ height: '52px', marginTop: '1rem', fontSize: '1.1rem', letterSpacing: '0.5px' }}
                    >
                        {isSubmitting ? 'Creating...' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Log In</Link>
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
