import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

export default function Navbar() {
    const { user, isAdmin, token, adminToken, logout } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [announcement, setAnnouncement] = useState(null)
    const isContestPage = location.pathname === '/contest'

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link'

    return (
        <>
            {announcement && (
                <div className="announcement-banner" style={{ position: 'fixed', top: 60, left: 0, right: 0, zIndex: 99, margin: '0 24px', borderRadius: 0, borderLeft: '3px solid var(--yellow)', background: 'rgba(245,158,11,0.1)', backdropFilter: 'blur(8px)' }}>
                    <span style={{ fontSize: 13, color: 'var(--yellow)', fontWeight: 600 }}>📢 {announcement}</span>
                    <button onClick={() => setAnnouncement(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
            )}
            <nav className="navbar">
                <Link to={isAdmin ? '/admin' : token ? '/contest' : '/'} className="navbar-brand">
                    {'<'}C<span>/</span>Contest{'>'}
                </Link>

                <div className="navbar-links">
                    {isAdmin && (
                        <>
                            <Link to="/admin" className={isActive('/admin')}>Dashboard</Link>
                            <Link to="/admin/teams" className={isActive('/admin/teams')}>Teams</Link>
                            <Link to="/admin/leaderboard" className={isActive('/admin/leaderboard')}>Leaderboard</Link>
                        </>
                    )}
                    {token && !isAdmin && !isContestPage && (
                        <Link to="/contest" className={isActive('/contest')}>Contest</Link>
                    )}
                </div>

                <div className="navbar-right">
                    {isAdmin && (
                        <span className="badge badge-accent">👑 Admin</span>
                    )}
                    {user && !isAdmin && (
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            👥 {user.teamName}
                        </span>
                    )}
                    {(token || isAdmin) && (
                        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
                    )}
                </div>
            </nav>
        </>
    )
}
