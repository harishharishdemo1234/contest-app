import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { loginAdmin, isAdmin } = useAuth()
    const navigate = useNavigate()

    if (isAdmin) { navigate('/admin'); return null }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data } = await axios.post('/api/auth/admin', { email, password })
            loginAdmin(data.token)
            navigate('/admin')
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.15) 0%, transparent 70%), var(--bg-primary)', padding: '80px 24px 40px' }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>👑</div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Admin Login</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Restricted access. Authorized personnel only.</p>
                </div>

                <div className="card" style={{ boxShadow: 'var(--shadow), var(--shadow-glow)' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="input-label">Email Address</label>
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="input-label">Password</label>
                            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>
                        {error && (
                            <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 14 }}>
                                ⚠ {error}
                            </div>
                        )}
                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                            {loading ? 'Authenticating...' : 'Login as Admin'}
                        </button>
                    </form>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Back to Home</Link>
                </div>
            </div>
        </div>
    )
}
