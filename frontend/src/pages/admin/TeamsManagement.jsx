import { useState, useEffect, useCallback } from 'react'
import { useAdminStore } from '../../store/adminStore'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'
import DataTable from '../../components/DataTable'
import {
    Users, Plus, Search, Trash2, Edit3, Building2,
    Loader2, UserPlus, X, Check, ChevronDown, Shield
} from 'lucide-react'

export default function TeamsManagement() {
    const { t } = useTranslation()
    const { token } = useAdminStore()
    const { openDialog } = useUIStore()
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState([])
    const [sites, setSites] = useState([])
    
    // Create / Edit form
    const [showModal, setShowModal] = useState(false)
    const [editingTeamId, setEditingTeamId] = useState(null)
    const [newName, setNewName] = useState('')
    const [newLeader, setNewLeader] = useState('')
    const [newSite, setNewSite] = useState('')
    const [newColor, setNewColor] = useState('#94a3b8')
    const [newMembers, setNewMembers] = useState([])
    const [searchQ, setSearchQ] = useState('')
    const [globalSearch, setGlobalSearch] = useState('')
    const [saving, setSaving] = useState(false)
    const [expandedTeam, setExpandedTeam] = useState(null)

    const api = useCallback(async (url, opts = {}) => {
        const r = await fetch(`/api${url}`, {
            ...opts,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
        })
        if (!r.ok) {
            const text = await r.text()
            try { throw new Error(JSON.parse(text).detail || 'Eroare') }
            catch (e) { throw new Error(text || 'Eroare') }
        }
        return r.json()
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

    const fetchSites = useCallback(async () => {
        try {
            const data = await api('/admin/sites/')
            setSites(data.sites || [])
        } catch (e) { console.error(e) }
    }, [api])

    useEffect(() => {
        fetchTeams()
        fetchUsers()
        fetchSites()
    }, [fetchTeams, fetchUsers, fetchSites])

    const handleSave = async () => {
        if (!newName.trim() || !newLeader) return
        setSaving(true)
        try {
            const payload = { name: newName, team_leader_id: newLeader, site_id: newSite || null, color: newColor, member_ids: newMembers }
            if (editingTeamId) {
                await api(`/admin/teams/${editingTeamId}`, { method: 'PUT', body: JSON.stringify(payload) })
            } else {
                await api('/admin/teams/', { method: 'POST', body: JSON.stringify(payload) })
            }
            setShowModal(false)
            setEditingTeamId(null)
            setNewName('')
            setNewLeader('')
            setNewSite('')
            setNewColor('#94a3b8')
            setNewMembers([])
            fetchTeams()
        } catch (e) {
            console.error(e)
            openDialog({ type: 'danger', title: 'Eroare', message: e.message || 'A apărut o eroare la salvarea echipei', confirmText: 'OK', cancelText: null })
        } finally { setSaving(false) }
    }

    const handleUpdate = async (teamId, data) => {
        try {
            await api(`/admin/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify(data) })
            fetchTeams()
        } catch (e) { console.error(e) }
    }

    const openEditModal = (team) => {
        setEditingTeamId(team.id)
        setNewName(team.name || '')
        setNewLeader(team.team_leader_id || '')
        setNewSite(team.site_id || '')
        setNewColor(team.color || '#94a3b8')
        setNewMembers([])
        setShowModal(true)
    }

    const handleDelete = async (teamId) => {
        openDialog({
            type: 'danger',
            title: t('teams.delete.title'),
            message: t('teams.delete.message'),
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await api(`/admin/teams/${teamId}`, { method: 'DELETE' })
                    fetchTeams()
                } catch (e) { console.error(e) }
            }
        })
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

    const leaders = users // Allow any employee to be a team leader
    const workers = users.filter(u => {
        if (searchQ) {
            const q = searchQ.toLowerCase()
            return u.full_name.toLowerCase().includes(q) || u.employee_code.toLowerCase().includes(q)
        }
        return true
    })

    const columns = [
        {
            key: 'name', label: t('teams.team_name'), sortable: true,
            render: (team) => (
                <div className="flex items-center gap-3">
                    <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center border shadow-sm"
                        style={{ backgroundColor: team.color || '#94a3b8', borderColor: team.color || '#94a3b8' }}
                    >
                        <Users className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{team.name}</span>
                </div>
            )
        },
        {
            key: 'team_leader_name', label: t('teams.team_leader_label'), sortable: true,
            render: (team) => (
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>{team.team_leader_name}</span>
                </div>
            )
        },
        {
            key: 'site_name', label: 'Șantier', sortable: true,
            render: (team) => (
                team.site_name ? (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{team.site_name}</span>
                    </div>
                ) : <span className="text-slate-400">—</span>
            )
        },
        {
            key: 'member_count', label: t('teams.members'), sortable: true,
            render: (team) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {team.member_count}
                </span>
            )
        },
        {
            key: 'actions', label: t('common.actions'),
            render: (team) => (
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(team) }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full transition-colors">
                        <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(team.id) }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ]

    const filteredTeams = teams.filter(t => !globalSearch || t.name.toLowerCase().includes(globalSearch.toLowerCase()) || (t.team_leader_name && t.team_leader_name.toLowerCase().includes(globalSearch.toLowerCase())))

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        {t('teams.title')}
                    </h1>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-3xl">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
                    <div className="relative group flex items-center w-full sm:w-auto">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={globalSearch}
                            onChange={e => setGlobalSearch(e.target.value)}
                            placeholder="Caută echipă..."
                            className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                        {globalSearch && (
                            <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {filteredTeams.length}/{teams.length}
                                </span>
                                <button onClick={() => setGlobalSearch('')} className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5">
                                    <X className="w-3 h-3 text-white/80 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={() => { setEditingTeamId(null); setNewName(''); setNewLeader(''); setNewSite(''); setNewColor('#94a3b8'); setNewMembers([]); setShowModal(true) }}
                        className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        {t('teams.new_team')}
                    </button>
                </div>

                <DataTable columns={columns} data={filteredTeams} loading={loading} />
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">{editingTeamId ? 'Editare Echipă' : t('teams.new_team')}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('teams.team_name')}</label>
                                <input
                                    type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                    placeholder={t('teams.placeholders.name')}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('teams.team_leader_label')}</label>
                                <select
                                    value={newLeader} onChange={e => setNewLeader(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                >
                                    <option value="">{t('teams.choose_leader')}</option>
                                    {leaders.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name} ({u.role_name})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Șantier (Opțional)</label>
                                <select
                                    value={newSite} onChange={e => setNewSite(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                >
                                    <option value="">Fără șantier alocat</option>
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Culoare Alocată pe Calendar</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                                        className="w-12 h-12 p-1 border border-slate-200 rounded-xl cursor-pointer bg-white"
                                    />
                                    <span className="text-sm text-slate-500 uppercase font-bold">{newColor}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('teams.members')} ({newMembers.length})</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text" placeholder={t('teams.search_worker')} value={searchQ}
                                        onChange={e => setSearchQ(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:border-blue-400 outline-none"
                                    />
                                </div>
                                <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                                    {users.filter(u => u.id !== newLeader).map(u => {
                                        if (searchQ && !u.full_name.toLowerCase().includes(searchQ.toLowerCase())) return null
                                        const isSel = newMembers.includes(u.id)
                                        return (
                                            <label key={u.id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-50/50 transition-colors ${isSel ? 'bg-blue-50' : ''}`}>
                                                <input type="checkbox" checked={isSel} onChange={e => {
                                                    if (e.target.checked) setNewMembers(prev => [...prev, u.id])
                                                    else setNewMembers(prev => prev.filter(id => id !== u.id))
                                                }} className="hidden" />
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${isSel ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                                    {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{u.full_name}</p>
                                                    <p className="text-[11px] text-slate-500">{u.role_name} • {u.employee_code}</p>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editingTeamId ? 'Salvează' : t('teams.create'))}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
