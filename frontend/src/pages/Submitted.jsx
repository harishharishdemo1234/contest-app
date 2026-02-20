import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Submitted() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [show, setShow] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setShow(true), 100)
        return () => clearTimeout(t)
    }, [])

    const score = user?.score ?? 0
    const maxScore = 55  // 5×2 + 5×3 + 5×4 + 5×5 = 70, but seeder has 2+3+4+5=14 per section → 5*(2+3+4+5)=70

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', padding: '80px 24px 40px',
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(16,185,129,0.15) 0%, transparent 70%), var(--bg-primary)'
        }}>
            {/* Particles */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                {[...Array(20)].map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: Math.random() * 8 + 4 + 'px',
                        height: Math.random() * 8 + 4 + 'px',
                        borderRadius: '50%',
                        background: ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b'][i % 4],
                        top: Math.random() * 100 + '%',
                        left: Math.random() * 100 + '%',
                        opacity: 0.4,
                        animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                        animationDelay: Math.random() * 3 + 's'
                    }} />
                ))}
            </div>

            <style>{`
                @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
                @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes fadeUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 500, width: '100%' }}>
                {/* Trophy */}
                <div style={{
                    fontSize: 80, marginBottom: 24,
                    animation: show ? 'scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
                    display: 'inline-block'
                }}>
                    🏆
                </div>

                <div style={{ animation: show ? 'fadeUp 0.6s ease 0.2s both' : 'none' }}>
                    <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800, marginBottom: 12 }}>
                        Successfully Submitted!
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 17, marginBottom: 40 }}>
                        Great work, <strong style={{ color: 'var(--text-primary)' }}>{user?.teamName || 'Team'}</strong>! Your answers have been recorded.
                    </p>

                    {/* Score Card */}
                    <div className="card" style={{ marginBottom: 32, boxShadow: '0 0 40px rgba(16,185,129,0.2), var(--shadow)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Score</div>
                        <div style={{
                            fontSize: 64, fontWeight: 900, fontFamily: 'var(--font-mono)',
                            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            lineHeight: 1
                        }}>
                            {score}
                        </div>
                        <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>points earned</div>

                        {/* Progress bar */}
                        <div className="progress-bar" style={{ marginTop: 20 }}>
                            <div className="progress-fill" style={{ width: `${Math.min((score / 70) * 100, 100)}%` }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24, textAlign: 'left' }}>
                            {[
                                { label: 'Team', value: user?.teamName },
                                { label: 'Leader', value: user?.leaderName || '—' },
                                { label: 'Team ID', value: user?.teamID },
                                { label: 'Status', value: '✅ Submitted' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: item.label === 'Team ID' ? 'var(--font-mono)' : 'inherit', color: 'var(--text-primary)' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
                        Results will be announced when the contest ends. You may now close this window or return home.
                    </p>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/" className="btn btn-secondary" onClick={logout}>← Return to Home</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
