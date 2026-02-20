import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)       // participant team data
    const [token, setToken] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [adminToken, setAdminToken] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const savedToken = localStorage.getItem('contestToken')
        const savedUser = localStorage.getItem('contestUser')
        const savedAdminToken = localStorage.getItem('adminToken')

        if (savedAdminToken) {
            setAdminToken(savedAdminToken)
            setIsAdmin(true)
        } else if (savedToken && savedUser) {
            setToken(savedToken)
            setUser(JSON.parse(savedUser))
        }
        setLoading(false)
    }, [])

    const loginParticipant = (team, tok) => {
        setUser(team)
        setToken(tok)
        localStorage.setItem('contestToken', tok)
        localStorage.setItem('contestUser', JSON.stringify(team))
    }

    const loginAdmin = (tok) => {
        setAdminToken(tok)
        setIsAdmin(true)
        localStorage.setItem('adminToken', tok)
    }

    const logout = () => {
        setUser(null); setToken(null); setIsAdmin(false); setAdminToken(null)
        localStorage.removeItem('contestToken')
        localStorage.removeItem('contestUser')
        localStorage.removeItem('adminToken')
    }

    return (
        <AuthContext.Provider value={{ user, token, isAdmin, adminToken, loading, loginParticipant, loginAdmin, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
