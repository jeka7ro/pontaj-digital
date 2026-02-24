import { useState, useEffect, useCallback } from 'react'
import { useAdminStore } from '../../store/adminStore'
import {
    Users, Plus, Search, Trash2, Edit3, Building2,
    Loader2, UserPlus, X, Check, ChevronDown, Shield
} from 'lucide-react'

export default function TeamsManagement() {
    const { token } = useAdminStore()
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState([])
    const [showCreate, setShowCreate] = useState(false)
    const [editTeam, setEditTeam] = useState(null)
    const [expandedTeam, setExpandedTeam] = useState(null)

    // Create form
    const [newName, setNewName] = useState('')
    const [newLeader, setNewLeader] = useState('')
    const [newMembers, setNewMembers] = useState([])
    const [searchQ, setSearchQ] = useState('')
    const [saving, setSaving] = useState(false)

    const api = useCallback((url, opts = {}) => {
        return fetch(`/api${url}`, {
            ...opts,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
        }).then(r => r.json())
    }, [token])

    const fetchTeams = useCallback(async () => {
        try {
            setLoading(true)
            const data = await api('/admin/teams/')
            setTeams(data.teams || [])
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [api])

    const fetchUsers = useCallback(async () => {
        try {
            const data = await api('/admin/teams/available-users')
            setUsers(data.users || [])
        } catch (e) { console.error(e) }
    }, [api])

    useEffect(() => {
        fetchTeams()
        fetchUsers()
    }, [fetchTeams, fetchUsers])

    const handleCreate = async () => {
        if (!newName.trim() || !newLeader) return
        setSaving(true)
        try {
            await api('/admin/teams/', {
                method: 'POST',
                body: JSON.stringify({ name: newName, team_leader_id: newLeader, member_ids: newMembers })
            })
            setShowCreate(false)
            setNewName('')
            setNewLeader('')
            setNewMembers([])
            fetchTeams()
        } catch (e) { console.error(e) }
        finally { setSaving(false) }
    }

    const handleUpdate = async (teamId, updates) => {
        try {
            await api(`/admin/teams/${teamId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            })
            setEditTeam(null)
            fetchTeams()
        } catch (e) { console.error(e) }
    }

    const handleDelete = async (teamId) => {
        if (!confirm('Sigur vrei să ștergi această echipă?')) return
        try {
            await api(`/admin/teams/${teamId}`, { method: 'DELETE' })
            fetchTeams()
        } catch (e) { console.error(e) }
    }

    const handleSetMembers = async (teamId, memberIds) => {
        try {
            await api(`/admin/teams/${teamId}/members`, {
                method: 'PUT',
                body: JSON.stringify(memberIds)
            })
            fetchTeams()
        } catch (e) { console.error(e) }
    }

    const leaders = users.filter(u => ['TEAM_LEAD', 'SITE_MANAGER'].includes(u.role_code))
    const workers = users.filter(u => {
        if (searchQ) {
            const q = searchQ.toLowerCase()
            return u.full_name.toLowerCase().includes(q) || u.employee_code.toLowerCase().includes(q)
        }
        return true
    })

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        Echipe
                        <span className="text-base font-normal text-slate-400">({teams.length})</span>
                    </h1>
                </div>
                <button
                    onClick={() => { setShowCreate(true); setNewName(''); setNewLeader(''); setNewMembers([]) }}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Echipă Nouă
                </button>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Echipă Nouă</h2>
                            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nume echipă</label>
                                <input
                                    type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                    placeholder="ex: Echipa electricieni"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Șef Echipă</label>
                                <select
                                    value={newLeader} onChange={e => setNewLeader(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                >
                                    <option value="">Alege șef echipă...</option>
                                    {leaders.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name} ({u.role_name})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Membri ({newMembers.length})</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text" placeholder="Caută muncitor..." value={searchQ}
                                        onChange={e => setSearchQ(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                                    {workers.map(w => (
                                        <label key={w.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                            <input
                                                type="checkbox"
                                                checked={newMembers.includes(w.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setNewMembers(m => [...m, w.id])
                                                    else setNewMembers(m => m.filter(id => id !== w.id))
                                                }}
                                                className="w-4 h-4 text-blue-500 rounded"
                                            />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-slate-900">{w.full_name}</div>
                                                <div className="text-xs text-slate-500">{w.employee_code} · {w.role_name}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
                                >Anulează</button>
                                <button onClick={handleCreate}
                                    disabled={!newName.trim() || !newLeader || saving}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 transition-all"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Creează'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Teams List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : teams.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-slate-600">Nicio echipă</p>
                    <p className="text-sm text-slate-400 mt-1">Creează prima echipă.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {teams.map(team => (
                        <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Team Header */}
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        {editTeam === team.id ? (
                                            <input
                                                type="text"
                                                defaultValue={team.name}
                                                onClick={e => e.stopPropagation()}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleUpdate(team.id, { name: e.target.value })
                                                    if (e.key === 'Escape') setEditTeam(null)
                                                }}
                                                className="px-3 py-1 border border-blue-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                autoFocus
                                            />
                                        ) : (
                                            <h3 className="font-bold text-slate-900">{team.name}</h3>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Shield className="w-3 h-3" />
                                                {team.team_leader_name}
                                            </span>
                                            <span>{team.member_count} membri</span>
                                            {team.site_name && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" />
                                                    {team.site_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${team.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {team.is_active ? 'Activă' : 'Inactivă'}
                                    </span>
                                    <button
                                        onClick={e => { e.stopPropagation(); setEditTeam(team.id) }}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4 text-slate-400" />
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(team.id) }}
                                        className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedTeam === team.id ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {/* Expanded - Members */}
                            {expandedTeam === team.id && (
                                <div className="border-t border-slate-100 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold text-slate-700">Membri ({team.member_count})</h4>
                                        <AddMemberButton
                                            team={team}
                                            users={users}
                                            onAdd={(userId) => {
                                                const ids = [...team.members.map(m => m.user_id), userId]
                                                handleSetMembers(team.id, ids)
                                            }}
                                        />
                                    </div>
                                    {team.members.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-4">Niciun membru</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {team.members.map(m => (
                                                <div key={m.user_id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{m.full_name}</div>
                                                        <div className="text-xs text-slate-500">{m.employee_code} · {m.role_name}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const ids = team.members.filter(x => x.user_id !== m.user_id).map(x => x.user_id)
                                                            handleSetMembers(team.id, ids)
                                                        }}
                                                        className="p-1.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// Inline add-member dropdown
function AddMemberButton({ team, users, onAdd }) {
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState('')
    const existingIds = team.members.map(m => m.user_id)
    const available = users.filter(u =>
        !existingIds.includes(u.id) &&
        (u.full_name.toLowerCase().includes(q.toLowerCase()) || u.employee_code.toLowerCase().includes(q.toLowerCase()))
    )

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
                <UserPlus className="w-3.5 h-3.5" />
                Adaugă
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-10 overflow-hidden">
                    <div className="p-2">
                        <input
                            type="text" value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Caută..." autoFocus
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {available.map(u => (
                            <button
                                key={u.id}
                                onClick={() => { onAdd(u.id); setOpen(false); setQ('') }}
                                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                            >
                                <div>
                                    <div className="text-sm font-medium text-slate-900">{u.full_name}</div>
                                    <div className="text-xs text-slate-500">{u.employee_code}</div>
                                </div>
                                <Plus className="w-4 h-4 text-blue-500" />
                            </button>
                        ))}
                        {available.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-3">Niciun muncitor disponibil</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
