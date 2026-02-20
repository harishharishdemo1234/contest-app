import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

export default function AdminTeams() {
    const { adminToken } = useAuth()
    const navigate = useNavigate()
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterDQ, setFilterDQ] = useState('all')
    const [msg, setMsg] = useState(null)
    const headers = { Authorization: `Bearer ${adminToken}` }

    const flash = (text, type = 'success') => {
        setMsg({ text, type })
        setTimeout(() => setMsg(null), 4000)
    }

    const loadTeams = async () => {
        setLoading(true)
        try {
            const params = {}
            if (search) params.search = search
            if (filterDQ !== 'all') params.disqualified = filterDQ === 'dq' ? 'true' : 'false'
            const { data } = await axios.get('/api/admin/teams', { headers, params })
            setTeams(data.teams)
        } catch (_) { }
        setLoading(false)
    }

    useEffect(() => { loadTeams() }, [search, filterDQ])

    const handleDisqualify = async (team) => {
        const reason = window.prompt(`Disqualify "${team.teamName}"?\nEnter reason (or cancel):`)
        if (!reason) return
        try {
            await axios.post(`/api/admin/disqualify/${team.teamID}`, { reason }, { headers })
            flash(`${team.teamName} disqualified.`)
            loadTeams()
        } catch (err) { flash(err.response?.data?.message || 'Error', 'error') }
    }

    return (
        <div className="page-content">
            {msg && (
                <div className={`toast ${msg.type}`} style={{ position: 'fixed', top: 80, right: 24, zIndex: 999 }}>
                    {msg.type === 'success' ? '✅' : '❌'} {msg.text}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Team Management</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{teams.length} teams found</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        className="input" style={{ width: 220 }}
                        placeholder="Search name, email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select className="input" style={{ width: 160 }} value={filterDQ} onChange={e => setFilterDQ(e.target.value)}>
                        <option value="all">All Teams</option>
                        <option value="active">Active Only</option>
                        <option value="dq">Disqualified</option>
                    </select>
                    <a className="btn btn-secondary btn-sm" href="/api/admin/export" download>📊 Export</a>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Team</th>
                            <th>Leader</th>
                            <th>Email</th>
                            <th>Team ID</th>
                            <th>Score</th>
                            <th>Violations</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                        ) : teams.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No teams found</td></tr>
                        ) : teams.map((t, i) => (
                            <tr key={t.teamID} style={t.disqualified ? { opacity: 0.6 } : {}}>
                                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 13 }}>{i + 1}</td>
                                <td>{t.teamName}</td>
                                <td>{t.leaderName}</td>
                                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.email}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{t.teamID}</td>
                                <td>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)', fontSize: 16 }}>{t.score}</span>
                                </td>
                                <td>
                                    {t.violations > 0 ? (
                                        <span className="badge badge-red">{t.violations}</span>
                                    ) : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                                </td>
                                <td>
                                    {t.disqualified
                                        ? <span className="badge badge-red">DQ</span>
                                        : t.submitted
                                            ? <span className="badge badge-green">Submitted</span>
                                            : <span className="badge badge-blue">Active</span>}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => navigate(`/admin/submissions/${t.teamID}`)}
                                        >View</button>
                                        {!t.disqualified && (
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDisqualify(t)}
                                            >DQ</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
