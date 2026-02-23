import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import { Users, Plus, Search, Coffee, MapPin, Clock, CheckCircle, XCircle, Loader2, UserPlus, Trash2, Building2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

export default function TeamLeaderPanel() {
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newTeamName, setNewTeamName] = useState('')
    const [creating, setCreating] = useState(false)

    // Members management
    const [availableWorkers, setAvailableWorkers] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddMembers, setShowAddMembers] = useState(false)
    const [selectedWorkers, setSelectedWorkers] = useState([])

    // Team status
    const [teamStatus, setTeamStatus] = useState(null)
    const [statusLoading, setStatusLoading] = useState(false)
    const [notifications, setNotifications] = useState([])
    const prevStatusRef = useRef({})
    const [expandedWorkers, setExpandedWorkers] = useState({})

    const refreshTimer = useRef(null)

    // Live clock — ticks every second
    const [now, setNow] = useState(Date.now())
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(t)
    }, [])

    const getLiveHours = (m) => {
        if (m.status === 'finished' || m.status === 'absent' || !m.check_in_time) return m.worked_hours || 0
        const checkin = new Date(m.check_in_time).getTime()
        let elapsed = (now - checkin) / 3600000
        let breakH = 0
        if (m.break_start_time) {
            const bStart = new Date(m.break_start_time).getTime()
            if (m.break_end_time) {
                breakH = (new Date(m.break_end_time).getTime() - bStart) / 3600000
            } else {
                breakH = (now - bStart) / 3600000
            }
        }
        return Math.max(0, elapsed - breakH)
    }

    useEffect(() => {
        fetchTeams()

        return () => {
            if (refreshTimer.current) clearInterval(refreshTimer.current)
        }
    }, [])

    const fetchTeams = async () => {
        try {
            setLoading(true)
            const response = await api.get('/teams/')
            setTeams(response.data || [])

            // Auto-fetch status for first team
            if (response.data && response.data.length > 0) {
                fetchTeamStatus(response.data[0].id)

                // Auto-refresh every 30 seconds
                if (refreshTimer.current) clearInterval(refreshTimer.current)
                refreshTimer.current = setInterval(() => {
                    fetchTeamStatus(response.data[0].id)
                }, 30000)
            }
        } catch (error) {
            console.error('Error fetching teams:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchTeamStatus = async (teamId) => {
        try {
            setStatusLoading(true)
            const response = await api.get(`/teams/${teamId}/status`)
            const newStatus = response.data

            // Check for newly finished workers → notifications
            if (prevStatusRef.current.members) {
                for (const member of newStatus.members) {
                    const prev = prevStatusRef.current.members.find(m => m.user_id === member.user_id)
                    if (prev && prev.status !== 'finished' && member.status === 'finished') {
                        setNotifications(n => [{
                            id: Date.now() + member.user_id,
                            name: member.full_name,
                            hours: member.worked_hours,
                            time: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                        }, ...n].slice(0, 10))
                    }
                }
            }
            prevStatusRef.current = newStatus

            setTeamStatus(newStatus)
        } catch (error) {
            console.error('Error fetching team status:', error)
        } finally {
            setStatusLoading(false)
        }
    }

    const fetchAvailableWorkers = async () => {
        try {
            const response = await api.get('/teams/available-workers')
            setAvailableWorkers(response.data.workers || [])
        } catch (error) {
            console.error('Error fetching workers:', error)
        }
    }

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return
        try {
            setCreating(true)
            await api.post('/teams/', {
                name: newTeamName.trim(),
                member_ids: selectedWorkers
            })
            setNewTeamName('')
            setSelectedWorkers([])
            setShowCreateForm(false)
            fetchTeams()
        } catch (error) {
            alert(error.response?.data?.detail || 'Eroare la creare echipă')
        } finally {
            setCreating(false)
        }
    }

    const handleAddMemberToTeam = async (teamId, userId) => {
        const team = teams.find(t => t.id === teamId)
        if (!team) return
        const currentIds = team.members.map(m => m.user_id)
        try {
            await api.put(`/teams/${teamId}/members`, [...currentIds, userId])
            fetchTeams()
            if (teamStatus) fetchTeamStatus(teamId)
        } catch (error) {
            console.error('Error adding member:', error)
        }
    }

    const handleRemoveMember = async (teamId, userId) => {
        const team = teams.find(t => t.id === teamId)
        if (!team) return
        const newIds = team.members.filter(m => m.user_id !== userId).map(m => m.user_id)
        try {
            await api.put(`/teams/${teamId}/members`, newIds)
            fetchTeams()
            if (teamStatus) fetchTeamStatus(teamId)
        } catch (error) {
            console.error('Error removing member:', error)
        }
    }

    const filteredWorkers = availableWorkers.filter(w => {
        const q = searchQuery.toLowerCase()
        const alreadyInTeam = teams.length > 0 && teams[0].members?.some(m => m.user_id === w.id)
        return !alreadyInTeam && (
            w.full_name.toLowerCase().includes(q) ||
            w.employee_code.toLowerCase().includes(q)
        )
    })

    const getStatusBadge = (status) => {
        switch (status) {
            case 'working':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Lucrează
                    </span>
                )
            case 'on_break':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                        <Coffee className="w-3 h-3" />
                        În pauză
                    </span>
                )
            case 'finished':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        <CheckCircle className="w-3 h-3" />
                        Terminat
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                        <XCircle className="w-3 h-3" />
                        Absent
                    </span>
                )
        }
    }

    const formatHours = (h) => {
        const hours = Math.floor(h)
        const mins = Math.floor((h - hours) * 60)
        return `${hours}h ${String(mins).padStart(2, '0')}m`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    // No team yet — show create form
    if (teams.length === 0) {
        return (
            <div className="p-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center">
                    <Users className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Nu ai nicio echipă</h2>
                    <p className="text-slate-600 text-sm mb-6">Creează o echipă și adaugă muncitorii tăi</p>

                    {!showCreateForm ? (
                        <button
                            onClick={() => { setShowCreateForm(true); fetchAvailableWorkers() }}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            <Plus className="w-5 h-5 inline mr-2" />
                            Creează Echipă
                        </button>
                    ) : (
                        <div className="bg-white rounded-xl p-6 max-w-md mx-auto text-left shadow-lg">
                            <h3 className="font-bold text-slate-900 mb-4">Echipă Nouă</h3>
                            <input
                                type="text"
                                placeholder="Numele echipei..."
                                value={newTeamName}
                                onChange={e => setNewTeamName(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />

                            {/* Search & select workers */}
                            <div className="mb-4">
                                <label className="text-sm font-semibold text-slate-700 block mb-2">Adaugă muncitori:</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Caută după nume..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                                    {filteredWorkers.map(w => (
                                        <label key={w.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedWorkers.includes(w.id)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setSelectedWorkers(s => [...s, w.id])
                                                    } else {
                                                        setSelectedWorkers(s => s.filter(id => id !== w.id))
                                                    }
                                                }}
                                                className="w-4 h-4 text-blue-500 rounded"
                                            />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-slate-900">{w.full_name}</div>
                                                <div className="text-xs text-slate-500">{w.employee_code} · {w.role_name}</div>
                                            </div>
                                        </label>
                                    ))}
                                    {filteredWorkers.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-3">Niciun muncitor disponibil</p>
                                    )}
                                </div>
                                {selectedWorkers.length > 0 && (
                                    <p className="text-xs text-blue-600 mt-2 font-medium">{selectedWorkers.length} muncitor(i) selectat(i)</p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowCreateForm(false); setSelectedWorkers([]) }}
                                    className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
                                >
                                    Anulează
                                </button>
                                <button
                                    onClick={handleCreateTeam}
                                    disabled={!newTeamName.trim() || creating}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
                                >
                                    {creating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Creează'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const team = teams[0]

    return (
        <div className="p-4 space-y-4">
            {/* Team Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold">{team.name}</h2>
                        <p className="text-blue-100 text-sm">{team.member_count} membri</p>
                    </div>
                    <button
                        onClick={() => { setShowAddMembers(!showAddMembers); if (!showAddMembers) fetchAvailableWorkers() }}
                        className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                        title="Adaugă membri"
                    >
                        <UserPlus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-700">🔔 Notificări</h3>
                    {notifications.slice(0, 3).map(n => (
                        <div key={n.id} className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">{n.name} a încheiat tura</p>
                                <p className="text-xs text-slate-500">{formatHours(n.hours)} lucrate · la {n.time}</p>
                            </div>
                            <button onClick={() => setNotifications(nots => nots.filter(x => x.id !== n.id))} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Members Panel */}
            {showAddMembers && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg">
                    <h3 className="font-bold text-slate-900 mb-3">Adaugă muncitori</h3>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Caută după nume sau cod..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredWorkers.map(w => (
                            <div key={w.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                                <div>
                                    <div className="text-sm font-medium text-slate-900">{w.full_name}</div>
                                    <div className="text-xs text-slate-500">{w.employee_code} · {w.role_name}</div>
                                </div>
                                <button
                                    onClick={() => handleAddMemberToTeam(team.id, w.id)}
                                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                    <Plus className="w-3 h-3 inline mr-1" />
                                    Adaugă
                                </button>
                            </div>
                        ))}
                        {filteredWorkers.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-3">Niciun muncitor disponibil</p>
                        )}
                    </div>
                </div>
            )}

            {/* Live Status */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                        Status Live
                    </h3>
                    <button
                        onClick={() => teamStatus && fetchTeamStatus(team.id)}
                        disabled={statusLoading}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${statusLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search members */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Caută rapid un muncitor..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                {teamStatus && teamStatus.members ? (
                    <div className="space-y-2">
                        {teamStatus.members
                            .filter(m => {
                                const q = searchQuery.toLowerCase()
                                return m.full_name.toLowerCase().includes(q) || m.employee_code.toLowerCase().includes(q)
                            })
                            .sort((a, b) => {
                                const order = { working: 0, on_break: 1, finished: 2, absent: 3 }
                                return (order[a.status] ?? 4) - (order[b.status] ?? 4)
                            })
                            .map(m => {
                                const isExpanded = expandedWorkers[m.user_id]
                                return (
                                    <div key={m.user_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                        {/* Compact Header — always visible */}
                                        <div
                                            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => setExpandedWorkers(prev => ({ ...prev, [m.user_id]: !prev[m.user_id] }))}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {m.avatar_path ? (
                                                    <img src={m.avatar_path} alt="" className="w-9 h-9 rounded-full object-cover object-top flex-shrink-0" onError={e => { e.target.style.display = 'none' }} />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                                                        {m.full_name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-slate-900 text-sm truncate">{m.full_name}</div>
                                                    <div className="text-xs text-slate-500">{m.employee_code}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {m.status !== 'absent' && m.check_in_time && (
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(m.check_in_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                                {m.status !== 'absent' && (
                                                    <span className="font-bold text-blue-600 text-sm tabular-nums">
                                                        {formatHours(getLiveHours(m))}
                                                        {m.status !== 'finished' && m.status !== 'absent' && (
                                                            <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse align-middle" />
                                                        )}
                                                    </span>
                                                )}
                                                {getStatusBadge(m.status)}
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && m.status !== 'absent' && (
                                            <div className="px-4 pb-3 border-t border-slate-100">
                                                {/* Break & site info */}
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-2">
                                                    {(m.break_hours > 0 || m.break_start_time) && (
                                                        <span className="text-orange-500 flex items-center gap-1">
                                                            <Coffee className="w-3 h-3" />
                                                            {m.break_start_time ? (
                                                                <>
                                                                    {new Date(m.break_start_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                                                    {m.break_end_time ? (
                                                                        <> → {new Date(m.break_end_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })} ({formatHours(m.break_hours)})</>
                                                                    ) : (
                                                                        <> — în curs...</>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>pauză: {formatHours(m.break_hours)}</>
                                                            )}
                                                        </span>
                                                    )}
                                                    {m.site_name && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="w-3 h-3" />
                                                            {m.site_name}
                                                        </span>
                                                    )}
                                                    {m.status === 'finished' && m.worked_hours > 0 && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200">
                                                            <CheckCircle className="w-2.5 h-2.5" /> Aprobat
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Total shift formula */}
                                                {m.check_in_time && (() => {
                                                    const liveWorked = getLiveHours(m)
                                                    const breakH = Math.max(0, m.break_hours || 0)
                                                    const totalOnSite = liveWorked + breakH
                                                    const dateStr = new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })
                                                    return (
                                                        <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                                            <span className="font-medium">Timp șantier</span> ({formatHours(totalOnSite)})
                                                            {breakH > 0 && <> − <span className="font-medium text-orange-500">Pauză</span> ({formatHours(breakH)})</>}
                                                            {' '}= <span className="font-bold text-slate-900">Total tură {dateStr} = {formatHours(liveWorked)}</span>
                                                        </div>
                                                    )
                                                })()}

                                                {/* Activities */}
                                                {m.activities && m.activities.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-xs font-semibold text-slate-600">📋 Activități:</p>
                                                            {m.status === 'finished' && (
                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200">
                                                                    <CheckCircle className="w-2.5 h-2.5" /> Aprobat
                                                                </span>
                                                            )}
                                                        </div>
                                                        {m.activities.map((a, i) => (
                                                            <span key={i} className="inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-1 mb-1">
                                                                {a.name}: {a.quantity} {a.unit_type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-xl p-6 text-center">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Adaugă membri în echipă pentru a vedea statusul lor</p>
                    </div>
                )}
            </div>

            {/* Team Members Management */}
            {team.members && team.members.length > 0 && (
                <div>
                    <h3 className="font-bold text-slate-900 mb-3">👥 Membri Echipă ({team.members.length})</h3>
                    <div className="space-y-1">
                        {team.members.map(m => (
                            <div key={m.user_id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                                <div>
                                    <div className="text-sm font-medium text-slate-900">{m.full_name}</div>
                                    <div className="text-xs text-slate-500">{m.employee_code} · {m.role_name}</div>
                                </div>
                                <button
                                    onClick={() => handleRemoveMember(team.id, m.user_id)}
                                    className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                    title="Elimină din echipă"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
