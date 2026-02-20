import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'

const SECTION_LABELS = { 1: 'MCQ', 2: 'Debugging', 3: 'Fill Code', 4: 'Coding' }
const SECTION_COLORS = { 1: 'var(--blue)', 2: 'var(--yellow)', 3: 'var(--accent-light)', 4: 'var(--green)' }

export default function Contest() {
    const { token, user, setUser, logout } = useAuth()
    const navigate = useNavigate()

    const [questions, setQuestions] = useState([])
    const [drafts, setDrafts] = useState({})
    const [currentIdx, setCurrentIdx] = useState(0)
    const [loading, setLoading] = useState(true)
    const [contestStatus, setContestStatus] = useState(null)
    const [timeLeft, setTimeLeft] = useState(null)
    const [running, setRunning] = useState(false)
    const [runOutput, setRunOutput] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [announcement, setAnnouncement] = useState(null)
    const [disqualified, setDisqualified] = useState(false)
    const [disqualReason, setDisqualReason] = useState('')
    const [showSubmitModal, setShowSubmitModal] = useState(false)
    const [violations, setViolations] = useState(user?.violations || 0)
    const [violationWarning, setViolationWarning] = useState(false)
    const [contestEnded, setContestEnded] = useState(false)
    const [savingDraftFor, setSavingDraftFor] = useState(null)

    const socketRef = useRef(null)
    const timerRef = useRef(null)
    const saveDraftTimer = useRef({})

    const headers = { Authorization: `Bearer ${token}` }

    // — Load data —
    useEffect(() => {
        async function loadAll() {
            try {
                const [statusRes, qRes, draftRes] = await Promise.all([
                    axios.get('/api/contest/status'),
                    axios.get('/api/contest/questions', { headers }),
                    axios.get('/api/contest/drafts', { headers }),
                ])
                setContestStatus(statusRes.data)
                setQuestions(qRes.data.questions)
                setDrafts(draftRes.data.drafts)

                // Compute timer
                if (statusRes.data.isActive && statusRes.data.startedAt) {
                    const start = new Date(statusRes.data.startedAt).getTime()
                    const dur = (statusRes.data.contestDuration || 60) * 60 * 1000
                    const end = start + dur
                    const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
                    setTimeLeft(remaining)
                }
            } catch (err) {
                // Contest not started yet
                setContestStatus({ isActive: false })
            } finally {
                setLoading(false)
            }
        }
        loadAll()
    }, [])

    // Redirect if submitted
    useEffect(() => {
        if (user?.submitted) navigate('/submitted', { replace: true })
        if (user?.disqualified) {
            setDisqualified(true)
            setDisqualReason(user.disqualifiedReason || 'Disqualified by admin')
        }
    }, [user])

    // — Socket.io —
    useEffect(() => {
        const socket = io('/', { transports: ['websocket'] })
        socketRef.current = socket

        if (user?.teamID) socket.emit('register', { teamID: user.teamID })

        socket.on('contest_started', (data) => {
            setContestStatus(s => ({ ...s, isActive: true, startedAt: data.startedAt, contestDuration: data.duration }))
            const start = new Date(data.startedAt).getTime()
            const dur = (data.duration || 60) * 60 * 1000
            const remaining = Math.max(0, Math.floor((start + dur - Date.now()) / 1000))
            setTimeLeft(remaining)
            // reload questions
            axios.get('/api/contest/questions', { headers }).then(r => setQuestions(r.data.questions)).catch(() => { })
        })

        socket.on('contest_stopped', () => { setContestEnded(true) })
        socket.on('announcement', (a) => {
            setAnnouncement(a.message)
            setTimeout(() => setAnnouncement(null), 12000)
        })
        socket.on('disqualified', (data) => {
            setDisqualified(true)
            setDisqualReason(data.reason)
        })

        return () => socket.disconnect()
    }, [])

    // — Timer countdown —
    useEffect(() => {
        if (timeLeft === null) return
        if (timeLeft <= 0) {
            setContestEnded(true)
            return
        }
        timerRef.current = setTimeout(() => setTimeLeft(t => (t > 0 ? t - 1 : 0)), 1000)
        return () => clearTimeout(timerRef.current)
    }, [timeLeft])

    // — Anti-cheat: fullscreen + visibility —
    useEffect(() => {
        if (!contestStatus?.isActive) return

        const handleVisibility = () => {
            if (document.hidden) reportViolation('tab_switch')
        }
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) reportViolation('fullscreen_exit')
        }

        document.addEventListener('visibilitychange', handleVisibility)
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

        // Enter fullscreen on load
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { })
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
        }
    }, [contestStatus?.isActive])

    async function reportViolation(type) {
        try {
            const { data } = await axios.post('/api/contest/violation', { type }, { headers })
            setViolations(data.violations)
            if (data.disqualified) {
                setDisqualified(true)
                setDisqualReason(data.message)
            } else {
                setViolationWarning(true)
                setTimeout(() => setViolationWarning(false), 5000)
            }
        } catch (_) { }
    }

    // — Draft saving (debounced) —
    const saveDraft = useCallback((questionID, code, selectedOption) => {
        if (saveDraftTimer.current[questionID]) clearTimeout(saveDraftTimer.current[questionID])
        setSavingDraftFor(questionID)
        saveDraftTimer.current[questionID] = setTimeout(async () => {
            try {
                await axios.post('/api/contest/save-draft', { questionID, code, selectedOption }, { headers })
            } catch (_) { }
            setSavingDraftFor(null)
        }, 800)
    }, [token])

    const updateDraft = (qid, field, value) => {
        setDrafts(d => {
            const updated = { ...d, [qid]: { ...(d[qid] || {}), [field]: value } }
            if (field === 'selectedOption') saveDraft(qid, updated[qid]?.code || '', value)
            else saveDraft(qid, value, updated[qid]?.selectedOption || '')
            return updated
        })
    }

    // — Run Code —
    async function handleRunCode(q) {
        setRunning(true)
        setRunOutput(o => ({ ...o, [q.questionID]: null }))
        try {
            const code = drafts[q.questionID]?.code || q.starterCode || ''
            const { data } = await axios.post('/api/code/run', { code, input: '' }, { headers })
            setRunOutput(o => ({ ...o, [q.questionID]: data }))
        } catch (err) {
            setRunOutput(o => ({ ...o, [q.questionID]: { success: false, error: 'Server error', output: '' } }))
        }
        setRunning(false)
    }

    // — Final Submit —
    async function handleFinalSubmit() {
        setSubmitting(true)
        try {
            const { data } = await axios.post('/api/contest/submit', {}, { headers })
            setUser(u => ({ ...u, submitted: true, score: data.score }))
            navigate('/submitted')
        } catch (err) {
            alert(err.response?.data?.message || 'Submission failed')
        }
        setSubmitting(false)
    }

    // — Format time —
    const fmtTime = (s) => {
        if (s === null) return '--:--'
        const m = Math.floor(s / 60), sec = s % 60
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }
    const timerClass = timeLeft === null ? '' : timeLeft < 300 ? 'danger' : timeLeft < 600 ? 'warning' : ''

    const q = questions[currentIdx]
    const answered = (qid) => {
        const d = drafts[qid]
        return d && (d.selectedOption !== undefined && d.selectedOption !== '' || d.code?.trim())
    }

    // ============================
    // RENDER STATES
    // ============================

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="spinner" />
        </div>
    )

    if (disqualified) return (
        <div className="overlay">
            <div className="modal" style={{ borderColor: 'var(--red)', boxShadow: '0 0 40px rgba(239,68,68,0.3)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)', marginBottom: 12 }}>Disqualified</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{disqualReason}</p>
                <button className="btn btn-secondary" onClick={() => { logout(); navigate('/') }}>Return to Home</button>
            </div>
        </div>
    )

    if (contestEnded && !user?.submitted) return (
        <div className="overlay">
            <div className="modal">
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Contest Ended</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Time's up! Submitting your answers now...</p>
                <button className="btn btn-primary" onClick={handleFinalSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Now'}
                </button>
            </div>
        </div>
    )

    if (!contestStatus?.isActive) return (
        <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 56 }}>⏳</div>
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>Contest Not Started Yet</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center' }}>
                Please wait for the administrator to start the contest. This page will auto-update.
            </p>
            {contestStatus?.scheduledStart && (
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontSize: 14 }}>
                    Scheduled: {new Date(contestStatus.scheduledStart).toLocaleString()}
                </div>
            )}
            <div className="spinner" style={{ marginTop: 8 }} />
        </div>
    )

    return (
        <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
            {/* Announcement Banner */}
            {announcement && (
                <div style={{
                    position: 'fixed', top: 60, left: 0, right: 0, zIndex: 200,
                    background: 'rgba(245,158,11,0.12)', borderBottom: '2px solid var(--yellow)',
                    padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    backdropFilter: 'blur(8px)'
                }}>
                    <span style={{ color: 'var(--yellow)', fontWeight: 600, fontSize: 14 }}>📢 {announcement}</span>
                    <button onClick={() => setAnnouncement(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
            )}

            {/* Violation warning */}
            {violationWarning && (
                <div style={{
                    position: 'fixed', top: announcement ? 105 : 60, left: 0, right: 0, zIndex: 200,
                    background: 'rgba(239,68,68,0.15)', borderBottom: '2px solid var(--red)',
                    padding: '10px 24px', textAlign: 'center', backdropFilter: 'blur(8px)'
                }}>
                    <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 14 }}>
                        ⚠ VIOLATION #{violations} recorded! {2 - violations} more will auto-disqualify you.
                    </span>
                </div>
            )}

            {/* Submit Confirmation Modal */}
            {showSubmitModal && (
                <div className="overlay">
                    <div className="modal">
                        <div style={{ fontSize: 40, marginBottom: 16 }}>📤</div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Final Submission</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                            You have answered <strong style={{ color: 'var(--text-primary)' }}>
                                {questions.filter(q => answered(q.questionID)).length}
                            </strong> of {questions.length} questions.<br />
                            This cannot be undone. Are you sure?
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                            <button className="btn btn-success" onClick={handleFinalSubmit} disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Yes, Submit!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
                {/* Sidebar */}
                <div style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Timer */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Time Remaining</div>
                        <div className={`timer-display ${timerClass}`} style={{ fontSize: 22, padding: '10px 0', width: '100%', justifyContent: 'center' }}>
                            {fmtTime(timeLeft)}
                        </div>
                    </div>

                    {/* Progress */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                            <span>Progress</span>
                            <span>{questions.filter(q => answered(q.questionID)).length}/{questions.length}</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(questions.filter(q => answered(q.questionID)).length / Math.max(questions.length, 1)) * 100}%` }} />
                        </div>
                    </div>

                    {/* Question nav by section */}
                    {[1, 2, 3, 4].map(sec => {
                        const sqs = questions.filter(q => q.section === sec)
                        if (!sqs.length) return null
                        return (
                            <div key={sec}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: SECTION_COLORS[sec], marginBottom: 8 }}>
                                    Section {sec} · {SECTION_LABELS[sec]}
                                </div>
                                <div className="q-nav">
                                    {sqs.map((sq) => {
                                        const idx = questions.indexOf(sq)
                                        const isAns = answered(sq.questionID)
                                        const isCur = idx === currentIdx
                                        return (
                                            <button
                                                key={sq.questionID}
                                                className={`q-nav-btn ${isCur ? 'active' : isAns ? 'answered' : ''}`}
                                                onClick={() => setCurrentIdx(idx)}
                                                title={`Q${idx + 1}: ${sq.questionText.slice(0, 40)}...`}
                                            >
                                                {idx + 1}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}

                    {/* Legend */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--green-soft)', border: '1px solid var(--green)' }} /> Answered
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }} /> Current
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }} /> Not answered
                        </div>
                    </div>

                    {/* Submit */}
                    <button className="btn btn-success" style={{ width: '100%', marginTop: 'auto' }} onClick={() => setShowSubmitModal(true)}>
                        🚀 Final Submit
                    </button>
                </div>

                {/* Question Panel */}
                <div style={{ overflowY: 'auto', padding: '24px' }}>
                    {q ? <QuestionView
                        q={q}
                        draft={drafts[q.questionID] || {}}
                        runOutput={runOutput[q.questionID]}
                        running={running}
                        savingDraft={savingDraftFor === q.questionID}
                        onCodeChange={(v) => updateDraft(q.questionID, 'code', v)}
                        onOptionChange={(v) => updateDraft(q.questionID, 'selectedOption', v)}
                        onRunCode={() => handleRunCode(q)}
                        onPrev={() => setCurrentIdx(i => Math.max(0, i - 1))}
                        onNext={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                        currentIdx={currentIdx}
                        totalQ={questions.length}
                    /> : <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 80 }}>No questions available</div>}
                </div>
            </div>
        </div>
    )
}

function QuestionView({ q, draft, runOutput, running, savingDraft, onCodeChange, onOptionChange, onRunCode, onPrev, onNext, currentIdx, totalQ }) {
    const typeColors = { mcq: 'var(--blue)', debug: 'var(--yellow)', fill: 'var(--accent-light)', coding: 'var(--green)' }
    const typeIcons = { mcq: '📝', debug: '🐛', fill: '🔍', coding: '💻' }
    const typeLabels = { mcq: 'Multiple Choice', debug: 'Debug the Code', fill: 'Fill the Code', coding: 'Write Code' }

    const code = draft.code !== undefined ? draft.code : (q.starterCode || '')

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span className="badge" style={{ background: `rgba(0,0,0,0.3)`, color: typeColors[q.type], border: `1px solid ${typeColors[q.type]}`, fontSize: 13 }}>
                    {typeIcons[q.type]} {typeLabels[q.type]}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Section {q.section}</span>
                <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
                    {savingDraft ? <span style={{ color: 'var(--yellow)', fontSize: 12 }}>💾 Saving...</span> : ''}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                    {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                </span>
            </div>

            {/* Question number */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Question {currentIdx + 1} of {totalQ}
            </div>

            {/* Question text */}
            <div className="card" style={{ marginBottom: 24, lineHeight: 1.7 }}>
                {q.questionText.split('\n').map((line, i) => {
                    if (line.startsWith('```')) return null
                    if (line.includes('`') && !line.startsWith('**')) {
                        return <p key={i} style={{ marginBottom: 8 }}>{line}</p>
                    }
                    if (line.startsWith('**')) {
                        const clean = line.replace(/\*\*/g, '')
                        return <p key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{clean}</p>
                    }
                    return <p key={i} style={{ marginBottom: 8, color: line === '' ? '' : 'var(--text-primary)' }}>{line}</p>
                })}
            </div>

            {/* MCQ */}
            {q.type === 'mcq' && (
                <div>
                    {q.options.map((opt, i) => (
                        <div
                            key={i}
                            className={`mcq-option ${draft.selectedOption === String(i) ? 'selected' : ''}`}
                            onClick={() => onOptionChange(String(i))}
                        >
                            <input type="radio" name={q.questionID} checked={draft.selectedOption === String(i)} onChange={() => { }} readOnly />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginRight: 6, color: 'var(--text-muted)' }}>
                                {['A', 'B', 'C', 'D'][i]}.
                            </span>
                            <span style={{ fontFamily: opt.includes('#include') || opt.includes('int ') ? 'var(--font-mono)' : 'inherit', fontSize: 14 }}>{opt}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Code Editor (debug, fill, coding) */}
            {(q.type === 'debug' || q.type === 'fill' || q.type === 'coding') && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {q.type === 'debug' ? '🐛 Fix the bug below' : q.type === 'fill' ? '🔍 Fill in the missing code (replace ___)' : '💻 Write your C solution'}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={onRunCode} disabled={running}>
                                {running ? '⏳ Running...' : '▶ Run Code'}
                            </button>
                        </div>
                    </div>
                    <textarea
                        className="code-editor"
                        style={{ minHeight: q.type === 'coding' ? 320 : 260 }}
                        value={code}
                        onChange={e => onCodeChange(e.target.value)}
                        placeholder={q.type === 'coding' ? '#include <stdio.h>\n\nint main() {\n    // Your solution\n    return 0;\n}' : ''}
                        spellCheck={false}
                        onKeyDown={e => {
                            if (e.key === 'Tab') {
                                e.preventDefault()
                                const start = e.target.selectionStart
                                const end = e.target.selectionEnd
                                const val = e.target.value
                                onCodeChange(val.substring(0, start) + '    ' + val.substring(end))
                                setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 4 }, 0)
                            }
                        }}
                    />

                    {/* Output */}
                    {runOutput && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Output</div>
                            <div className={`output-panel ${!runOutput.success ? 'error' : ''}`}>
                                {runOutput.success
                                    ? (runOutput.output || '(no output)')
                                    : `${runOutput.type?.toUpperCase() || 'ERROR'}: ${runOutput.error}`
                                }
                            </div>
                        </div>
                    )}

                    {/* Test case info */}
                    {q.testCasesCount > 0 && (
                        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            📊 {q.testCasesCount} test case{q.testCasesCount > 1 ? 's' : ''} will be evaluated on submit
                        </div>
                    )}
                </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                <button className="btn btn-secondary" onClick={onPrev} disabled={currentIdx === 0}>
                    ← Previous
                </button>
                <button className="btn btn-secondary" onClick={onNext} disabled={currentIdx === totalQ - 1}>
                    Next →
                </button>
            </div>
        </div>
    )
}
