import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function ParticipantLogin() {
    const [form, setForm] = useState({ teamName: '', leaderName: '', email: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { loginParticipant, token } = useAuth()
    const navigate = useNavigate()

    if (token) { navigate('/contest'); return null }

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!form.teamName.trim() || !form.leaderName.trim() || !form.email.trim()) {
            return setError('All fields are required')
        }
        setLoading(true)
        try {
            const { data } = await axios.post('/api/auth/login', form)
            loginParticipant(data.team, data.token)
            navigate('/contest')
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.1) 0%, transparent 70%), var(--bg-primary)', padding: '80px 24px 40px' }}>
            <div style={{ width: '100%', maxWidth: 460 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💻</div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Team Login</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Register or login to access the C Programming Contest.</p>
                </div>

                <div className="card" style={{ boxShadow: 'var(--shadow)' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="input-label">Team Name *</label>
                            <input className="input" type="text" name="teamName" value={form.teamName} onChange={handleChange} placeholder="e.g. Code Warriors" required autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="input-label">Team Leader Name *</label>
                            <input className="input" type="text" name="leaderName" value={form.leaderName} onChange={handleChange} placeholder="e.g. Harish Kumar" required />
                        </div>
                        <div className="form-group">
                            <label className="input-label">Email ID *</label>
                            <input className="input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="team@college.edu" required />
                        </div>

                        {error && (
                            <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 14 }}>
                                ⚠ {error}
                            </div>
                        )}

                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                            {loading ? 'Registering...' : 'Enter Contest →'}
                        </button>
                    </form>

                    <div style={{ marginTop: 20, padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--yellow)' }}>⚠ Contest Rules:</strong>
                        <ul style={{ marginTop: 8, paddingLeft: 16, lineHeight: 1.8 }}>
                            <li>One device per email — no re-login from different browser</li>
                            <li>1 hour timer starts when the contest begins</li>
                            <li>Tab switching or exiting fullscreen = violation</li>
                            <li>2 violations = auto disqualification</li>
                        </ul>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Back to Home</Link>
                </div>
            </div>
        </div>
    )
}
