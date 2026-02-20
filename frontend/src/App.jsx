import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import AdminLogin from './pages/AdminLogin'
import ParticipantLogin from './pages/ParticipantLogin'
import Contest from './pages/Contest'
import Submitted from './pages/Submitted'
import AdminDashboard from './pages/admin/Dashboard'
import AdminTeams from './pages/admin/Teams'
import AdminLeaderboard from './pages/admin/Leaderboard'
import AdminSubmissions from './pages/admin/Submissions'

function PrivateRoute({ children }) {
    const { token, loading } = useAuth()
    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner"></div></div>
    return token ? children : <Navigate to="/" replace />
}

function AdminRoute({ children }) {
    const { isAdmin, loading } = useAuth()
    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner"></div></div>
    return isAdmin ? children : <Navigate to="/" replace />
}

function AppRoutes() {
    return (
        <>
            <Navbar />
            <div className="page-container">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/login" element={<ParticipantLogin />} />
                    <Route path="/contest" element={<PrivateRoute><Contest /></PrivateRoute>} />
                    <Route path="/submitted" element={<PrivateRoute><Submitted /></PrivateRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/teams" element={<AdminRoute><AdminTeams /></AdminRoute>} />
                    <Route path="/admin/leaderboard" element={<AdminRoute><AdminLeaderboard /></AdminRoute>} />
                    <Route path="/admin/submissions/:teamID" element={<AdminRoute><AdminSubmissions /></AdminRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}
