import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { io } from 'socket.io-client'

const MEDAL = ['🥇', '🥈', '🥉']

export default function AdminLeaderboard() {
    const { adminToken } = useAuth()
    const [leaderboard, setLeaderboard] = useState([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)
    const headers = { Authorization: `Bearer ${adminToken}` }

    const load = async () => {
        try {
            const { data } = await axios.get('/api/admin/leaderboard', { headers })
            setLeaderboard(data.leaderboard)
            setLastUpdated(new Date())
        } catch (_) { }
        setLoading(false)
    }

    useEffect(() => {
        load()
        const interval = setInterval(load, 30000)
        return () => clearInterval(interval)
    }, [])

    // Socket for live score updates
    useEffect(() => {
        const socket = io('/', { transports: ['websocket'] })
        socket.on('score_update', () => load())
        return () => socket.disconnect()
    }, [])

    const maxScore = Math.max(...leaderboard.map(t => t.score), 1)

    return (
        <div className="page-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>🏆 Live Leaderboard</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {leaderboard.length} submitted teams
                        {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
                    <a className="btn btn-secondary btn-sm" href="/api/admin/export" download>📊 Export Excel</a>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                    No submissions yet. The leaderboard will appear once teams start submitting.
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>Rank</th>
                                <th>Team Name</th>
                                <th>Leader</th>
                                <th>Team ID</th>
                                <th>Score</th>
                                <th>Score Bar</th>
                                <th>Submitted At</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((t, i) => (
                                <tr key={t.teamID} style={t.disqualified ? { opacity: 0.5 } : {}}>
                                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 18 }}>
                                        {i < 3 ? MEDAL[i] : <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>}
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{t.teamName}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{t.leaderName}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{t.teamID}</td>
                                    <td>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 20, color: t.disqualified ? 'var(--red)' : 'var(--green)' }}>
                                            {t.score}
                                        </span>
                                    </td>
                                    <td style={{ width: 180 }}>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{
                                                width: `${(t.score / maxScore) * 100}%`,
                                                background: t.disqualified ? 'var(--red)' : undefined
                                            }} />
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {t.endTime ? new Date(t.endTime).toLocaleTimeString() : '—'}
                                    </td>
                                    <td>
                                        {t.disqualified
                                            ? <span className="badge badge-red">DQ</span>
                                            : <span className="badge badge-green">✓ Submitted</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
