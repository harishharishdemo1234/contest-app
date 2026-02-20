import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { io } from 'socket.io-client'

export default function AdminDashboard() {
    const { adminToken } = useAuth()
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)
    const [settings, setSettings] = useState(null)
    const [announcement, setAnnouncement] = useState('')
    const [duration, setDuration] = useState(60)
    const [scheduledStart, setScheduledStart] = useState('')
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState(null)
    const [recentAnn, setRecentAnn] = useState([])
    const headers = { Authorization: `Bearer ${adminToken}` }

    const flash = (text, type = 'success') => {
        setMsg({ text, type })
        setTimeout(() => setMsg(null), 4000)
    }

    const loadStats = async () => {
        try {
            const { data } = await axios.get('/api/admin/stats', { headers })
            setStats(data)
            setDuration(data.duration || 60)
        } catch (_) { }
    }

    const loadAnnouncements = async () => {
        try {
            const { data } = await axios.get('/api/contest/status')
            setRecentAnn(data.announcements || [])
        } catch (_) { }
    }

    useEffect(() => {
        loadStats()
        loadAnnouncements()
        const interval = setInterval(loadStats, 15000)
        return () => clearInterval(interval)
    }, [])

    // Socket for live events
    useEffect(() => {
        const socket = io('/', { transports: ['websocket'] })
        socket.on('score_update', () => loadStats())
        socket.on('announcement', (a) => setRecentAnn(prev => [...prev.slice(-4), a]))
        return () => socket.disconnect()
    }, [])

    const handleStart = async () => {
        setLoading(true)
        try {
            await axios.post('/api/admin/contest/start', { duration, scheduledStart: scheduledStart || undefined }, { headers })
            flash('Contest started!')
            loadStats()
        } catch (err) { flash(err.response?.data?.message || 'Error', 'error') }
        setLoading(false)
    }

    const handleStop = async () => {
        if (!window.confirm('Stop the contest? This will disable all submissions.')) return
        setLoading(true)
        try {
            await axios.post('/api/admin/contest/stop', {}, { headers })
            flash('Contest stopped.')
            loadStats()
        } catch (err) { flash(err.response?.data?.message || 'Error', 'error') }
        setLoading(false)
    }

    const handleAnnounce = async () => {
        if (!announcement.trim()) return
        try {
            await axios.post('/api/admin/announce', { message: announcement }, { headers })
            flash('Announcement sent!')
            setAnnouncement('')
            loadAnnouncements()
        } catch (err) { flash(err.response?.data?.message || 'Error', 'error') }
    }

    return (
        <div className="page-content">
            {/* Flash message */}
            {msg && (
                <div className={`toast ${msg.type}`} style={{ position: 'fixed', top: 80, right: 24, zIndex: 999 }}>
                    {msg.type === 'success' ? '✅' : '❌'} {msg.text}
                </div>
            )}

            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Contest control & management panel</p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
                {[
                    { label: 'Total Teams', value: stats?.total ?? '—', color: 'var(--blue)' },
                    { label: 'Submitted', value: stats?.submitted ?? '—', color: 'var(--green)' },
                    { label: 'Disqualified', value: stats?.disqualified ?? '—', color: 'var(--red)' },
                    { label: 'Duration', value: stats?.duration ? `${stats.duration}m` : '—', color: 'var(--yellow)' },
                ].map((s, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-value" style={{ background: `linear-gradient(135deg, ${s.color}, #fff5)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Contest Control */}
                <div className="card">
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                        Contest Control
                        <span className={`badge ml-2 ${stats?.isActive ? 'badge-green' : 'badge-red'}`} style={{ marginLeft: 12 }}>
                            {stats?.isActive ? '● LIVE' : '○ INACTIVE'}
                        </span>
                    </h2>

                    <div className="form-group">
                        <label className="input-label">Duration (minutes)</label>
                        <input className="input" type="number" value={duration} min={5} max={360}
                            onChange={e => setDuration(Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                        <label className="input-label">Scheduled Start (optional)</label>
                        <input className="input" type="datetime-local" value={scheduledStart}
                            onChange={e => setScheduledStart(e.target.value)} />
                    </div>

                    {stats?.startedAt && (
                        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            Started: {new Date(stats.startedAt).toLocaleString()}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-success" onClick={handleStart} disabled={loading || stats?.isActive}>
                            ▶ Start Contest
                        </button>
                        <button className="btn btn-danger" onClick={handleStop} disabled={loading || !stats?.isActive}>
                            ■ Stop Contest
                        </button>
                    </div>
                </div>

                {/* Announcements */}
                <div className="card">
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📢 Announcements</h2>
                    <div className="form-group">
                        <label className="input-label">Broadcast Message</label>
                        <textarea
                            className="input" rows={3}
                            value={announcement}
                            onChange={e => setAnnouncement(e.target.value)}
                            placeholder="Type your announcement..."
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleAnnounce} disabled={!announcement.trim()}>
                        Send to All Participants
                    </button>

                    {recentAnn.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.06em' }}>Recent</div>
                            {recentAnn.slice().reverse().slice(0, 3).map((a, i) => (
                                <div key={i} className="announcement-banner" style={{ padding: '10px 12px', marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, color: 'var(--yellow)' }}>{a.message}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {a.createdAt ? new Date(a.createdAt).toLocaleTimeString() : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Links */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => navigate('/admin/teams')}>👥 Manage Teams</button>
                <button className="btn btn-secondary" onClick={() => navigate('/admin/leaderboard')}>🏆 Leaderboard</button>
                <a className="btn btn-secondary" href="/api/admin/export" download>📊 Export Results (Excel)</a>
            </div>
        </div>
    )
}
