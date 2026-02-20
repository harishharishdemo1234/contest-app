import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
    const navigate = useNavigate()
    const [hovered, setHovered] = useState(null)

    return (
        <div className="landing-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '80px 24px 40px' }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-light)', marginBottom: 16, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    🏆 College C Programming Contest
                </div>
                <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
                    Welcome to<br />
                    <span style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        &lt;C/Contest&gt;
                    </span>
                </h1>
                <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto' }}>
                    A secure, automated C programming contest platform. Choose your role to continue.
                </p>
            </div>

            {/* Role Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 700, width: '100%' }}>
                {/* Participant */}
                <div
                    className="role-card"
                    onClick={() => navigate('/login')}
                    onMouseEnter={() => setHovered('participant')}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                >
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <span className="role-icon">💻</span>
                        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Participant</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24 }}>
                            Register your team and enter the contest. Solve 20 C programming challenges.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 24 }}>
                            {['MCQ Questions', 'Code Debugging', 'Fill Missing Code', 'Full Problem Solving'].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                    <span style={{ color: 'var(--green)', fontSize: 12 }}>✓</span> {item}
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }}>Enter as Participant →</button>
                    </div>
                </div>

                {/* Admin */}
                <div
                    className="role-card"
                    onClick={() => navigate('/admin/login')}
                    onMouseEnter={() => setHovered('admin')}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                >
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <span className="role-icon">👑</span>
                        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Administrator</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24 }}>
                            Manage the contest, view results, leaderboard and control the competition.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 24 }}>
                            {['Start/Stop Contest', 'Live Leaderboard', 'Team Management', 'Export Results'].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                    <span style={{ color: 'var(--blue)', fontSize: 12 }}>✓</span> {item}
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-secondary" style={{ width: '100%' }}>Enter as Admin →</button>
                    </div>
                </div>
            </div>

            {/* Footer note */}
            <p style={{ marginTop: 48, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                Secure · Automated Evaluation · Real-time Monitoring
            </p>
        </div>
    )
}
