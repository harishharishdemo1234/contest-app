import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

const TYPE_LABELS = { mcq: 'MCQ', debug: 'Debug', fill: 'Fill Code', coding: 'Coding' }
const TYPE_COLORS = { mcq: 'var(--blue)', debug: 'var(--yellow)', fill: 'var(--accent-light)', coding: 'var(--green)' }

export default function AdminSubmissions() {
    const { teamID } = useParams()
    const { adminToken } = useAuth()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [expandedQ, setExpandedQ] = useState(null)
    const headers = { Authorization: `Bearer ${adminToken}` }

    useEffect(() => {
        async function load() {
            try {
                const { data: res } = await axios.get(`/api/admin/team/${teamID}/submissions`, { headers })
                setData(res)
            } catch (_) { }
            setLoading(false)
        }
        load()
    }, [teamID])

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}><div className="spinner" /></div>
    if (!data) return <div className="page-content"><p style={{ color: 'var(--red)' }}>Team not found.</p></div>

    const { team, submissions, questions } = data
    const totalMarks = submissions.reduce((a, s) => a + (s.marks || 0), 0)
    const totalMax = submissions.reduce((a, s) => a + (s.maxMarks || 0), 0)

    return (
        <div className="page-content">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/teams')} style={{ marginBottom: 24 }}>
                ← Back to Teams
            </button>

            {/* Team header */}
            <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Team</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{team.teamName}</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Leader</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{team.leaderName}</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Email</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{team.email}</div>
                </div>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Score</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 900, color: 'var(--green)' }}>
                        {totalMarks}
                        <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/{totalMax}</span>
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                    {team.disqualified && <span className="badge badge-red">🚫 Disqualified</span>}
                    {team.submitted && <span className="badge badge-green">✓ Submitted</span>}
                    {team.violations > 0 && <span className="badge badge-yellow">⚠ {team.violations} Violation{team.violations > 1 ? 's' : ''}</span>}
                </div>
            </div>

            {/* Submissions list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {questions.map(q => {
                    const sub = submissions.find(s => s.questionID === q.questionID)
                    const isExpanded = expandedQ === q.questionID
                    const marksColor = !sub ? 'var(--text-muted)' : sub.marks === sub.maxMarks ? 'var(--green)' : sub.marks > 0 ? 'var(--yellow)' : 'var(--red)'

                    return (
                        <div key={q.questionID} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Question row */}
                            <div
                                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
                                onClick={() => setExpandedQ(isExpanded ? null : q.questionID)}
                            >
                                <span className="badge" style={{ color: TYPE_COLORS[q.type], background: `${TYPE_COLORS[q.type]}20`, border: `1px solid ${TYPE_COLORS[q.type]}40`, flexShrink: 0 }}>
                                    {TYPE_LABELS[q.type]}
                                </span>
                                <span style={{ fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {q.questionID}: {q.questionText.slice(0, 80)}{q.questionText.length > 80 ? '...' : ''}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: marksColor, flexShrink: 0, fontSize: 15 }}>
                                    {sub ? sub.marks : '—'}/{q.marks}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-secondary)' }}>
                                    {!sub ? (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No submission for this question.</p>
                                    ) : (
                                        <>
                                            {/* MCQ answer */}
                                            {q.type === 'mcq' && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Selected Option</div>
                                                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                                        Index: {sub.selectedOption || '(none)'}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Code answer */}
                                            {(q.type === 'debug' || q.type === 'fill' || q.type === 'coding') && (
                                                <>
                                                    <div style={{ marginBottom: 12 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Submitted Code</div>
                                                        <pre style={{
                                                            background: '#0d1117', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                                            padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e6edf3',
                                                            overflowX: 'auto', maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap'
                                                        }}>
                                                            {sub.code || '(no code submitted)'}
                                                        </pre>
                                                    </div>

                                                    {/* Test results */}
                                                    {sub.testResults && sub.testResults.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Test Results</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                {sub.testResults.map((r, i) => (
                                                                    <div key={i} style={{
                                                                        padding: '8px 12px', borderRadius: 'var(--radius)',
                                                                        background: r.passed ? 'var(--green-soft)' : 'var(--red-soft)',
                                                                        border: `1px solid ${r.passed ? 'var(--green)' : 'var(--red)'}`,
                                                                        fontSize: 12, fontFamily: 'var(--font-mono)'
                                                                    }}>
                                                                        <span style={{ color: r.passed ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                                                                            TC{i + 1}: {r.passed ? 'PASS' : 'FAIL'}
                                                                        </span>
                                                                        {!r.passed && (
                                                                            <span style={{ color: 'var(--text-muted)', marginLeft: 12 }}>
                                                                                Expected: "{r.expected}" · Got: "{r.got || (r.error ? `[${r.error}]` : 'N/A')}"
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
