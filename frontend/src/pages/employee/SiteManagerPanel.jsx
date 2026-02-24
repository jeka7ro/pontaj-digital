import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import { Users, Coffee, Clock, CheckCircle, Building2, RefreshCw, MapPin, ChevronDown, ChevronUp, Camera, X, Image, Loader2, Trash2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function SiteManagerPanel() {
    const [teams, setTeams] = useState([])
    const [teamStatuses, setTeamStatuses] = useState({})
    const [loading, setLoading] = useState(true)
    const [expandedTeams, setExpandedTeams] = useState({})
    const [lastRefresh, setLastRefresh] = useState(null)
    const refreshTimer = useRef(null)
    const [sites, setSites] = useState([])

    // Photos state
    const [photos, setPhotos] = useState([])
    const [uploading, setUploading] = useState(false)
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState(null)
    const [photoDescription, setPhotoDescription] = useState('')
    const fileInputRef = useRef(null)

    // Live clock
    const [now, setNow] = useState(Date.now())
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(t)
    }, [])

    const getLiveHours = (m) => {
        if (!m) return 0
        if (m.check_out_time && !m.is_on_break) {
            const checkin = new Date(m.check_in_time).getTime()
            const checkout = new Date(m.check_out_time).getTime()
            let elapsed = (checkout - checkin) / 3600000
            let breakH = m.total_break_hours || 0
            return Math.max(0, elapsed - breakH)
        }
        if (!m.check_in_time) return 0
        const checkin = new Date(m.check_in_time).getTime()
        let elapsed = (now - checkin) / 3600000
        let breakH = m.total_break_hours || 0
        if (m.is_on_break && m.break_start_time) {
            const breakStart = new Date(m.break_start_time).getTime()
            breakH += (now - breakStart) / 3600000
        }
        return Math.max(0, elapsed - breakH)
    }

    const formatHours = (h) => {
        const hours = Math.floor(h)
        const mins = Math.round((h - hours) * 60)
        if (hours === 0) return `${mins}min`
        if (mins === 0) return `${hours}h`
        return `${hours}h ${String(mins).padStart(2, '0')}m`
    }

    useEffect(() => {
        fetchTeams()
        fetchPhotos()
        fetchSites()
        refreshTimer.current = setInterval(fetchAllStatuses, 30000)
        return () => clearInterval(refreshTimer.current)
    }, [])

    const fetchTeams = async () => {
        try {
            setLoading(true)
            const res = await api.get('/teams/')
            const teamsData = res.data || []
            setTeams(teamsData)

            const expanded = {}
            teamsData.forEach(t => { expanded[t.id] = true })
            setExpandedTeams(expanded)

            const statuses = {}
            await Promise.all(
                teamsData.map(async (team) => {
                    try {
                        const statusRes = await api.get(`/teams/${team.id}/status`)
                        statuses[team.id] = statusRes.data
                    } catch (e) {
                        statuses[team.id] = { members: [], team_name: team.name }
                    }
                })
            )
            setTeamStatuses(statuses)
            setLastRefresh(new Date())
        } catch (error) {
            console.error('Error fetching teams:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchAllStatuses = async () => {
        if (teams.length === 0) return
        const statuses = {}
        await Promise.all(
            teams.map(async (team) => {
                try {
                    const statusRes = await api.get(`/teams/${team.id}/status`)
                    statuses[team.id] = statusRes.data
                } catch (e) {
                    statuses[team.id] = { members: [], team_name: team.name }
                }
            })
        )
        setTeamStatuses(statuses)
        setLastRefresh(new Date())
    }

    const fetchPhotos = async () => {
        try {
            const res = await api.get('/site-photos')
            setPhotos(res.data.photos || [])
        } catch (e) { console.error('Error fetching photos:', e) }
    }

    const fetchSites = async () => {
        try {
            const res = await api.get('/sites/')
            setSites(res.data?.sites || res.data || [])
        } catch (e) { console.error('Error fetching sites:', e) }
    }

    const getSiteIdForUpload = () => {
        // 1. Team with site_id assigned
        const teamWithSite = teams.find(t => t.site_id)
        if (teamWithSite) return teamWithSite.site_id

        // 2. From team member status (someone who worked on a site today)
        for (const [, status] of Object.entries(teamStatuses)) {
            const memberWithSite = status?.members?.find(m => m.site_name)
            if (memberWithSite) {
                const site = sites.find(s => s.name === memberWithSite.site_name)
                if (site) return site.id
            }
        }

        // 3. First available site
        if (sites.length > 0) return sites[0].id

        return null
    }

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const siteId = getSiteIdForUpload()
        if (!siteId) {
            alert('Nu s-a găsit niciun șantier. Contactați administratorul.')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('site_id', siteId)
            formData.append('description', photoDescription || '')

            await api.post('/site-photos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setPhotoDescription('')
            await fetchPhotos()
        } catch (err) {
            console.error('Upload error:', err)
            const detail = err.response?.data?.detail || err.message || 'Eroare necunoscută'
            alert(`Eroare la încărcare: ${detail}`)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDeletePhoto = async (photoId) => {
        if (!confirm('Ștergeți această poză?')) return
        try {
            await api.delete(`/site-photos/${photoId}`)
            fetchPhotos()
        } catch (e) {
            console.error('Delete error:', e)
        }
    }

    const toggleTeam = (teamId) => {
        setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }))
    }

    // Aggregate
    const allWorkers = Object.values(teamStatuses).flatMap(ts => ts?.members || [])
    const activeWorkers = allWorkers.filter(m => m.check_in_time && !m.check_out_time && !m.is_on_break)
    const breakWorkers = allWorkers.filter(m => m.is_on_break)
    const finishedWorkers = allWorkers.filter(m => m.check_out_time && !m.is_on_break)
    const totalHours = allWorkers.reduce((sum, m) => sum + getLiveHours(m), 0)

    const getStatusBadge = (member) => {
        if (member.check_out_time && !member.is_on_break) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                    <CheckCircle className="w-3 h-3" /> Terminat
                </span>
            )
        }
        if (member.is_on_break) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">
                    <Coffee className="w-3 h-3" /> Pauză
                </span>
            )
        }
        if (member.check_in_time) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Activ
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                Nepontat
            </span>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Se încarcă datele șantierului...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Monitorizare Șantier
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{teams.length} echip{teams.length !== 1 ? 'e' : 'ă'} pe șantier</p>
                </div>
                <div className="flex items-center gap-2">
                    {lastRefresh && (
                        <span className="text-xs text-slate-400">
                            {lastRefresh.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button onClick={fetchTeams} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <RefreshCw className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-xl p-3 text-white text-center">
                    <div className="text-xl font-bold">{activeWorkers.length}</div>
                    <div className="text-[10px] opacity-80">Activi</div>
                </div>
                <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-3 text-white text-center">
                    <div className="text-xl font-bold">{breakWorkers.length}</div>
                    <div className="text-[10px] opacity-80">Pauză</div>
                </div>
                <div className="bg-gradient-to-br from-slate-400 to-slate-500 rounded-xl p-3 text-white text-center">
                    <div className="text-xl font-bold">{finishedWorkers.length}</div>
                    <div className="text-[10px] opacity-80">Terminat</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 text-white text-center">
                    <div className="text-xl font-bold">{formatHours(totalHours)}</div>
                    <div className="text-[10px] opacity-80">Total Ore</div>
                </div>
            </div>

            {/* Photo Upload Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-blue-500" />
                            Poze Șantier
                            {photos.length > 0 && <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-semibold">{photos.length}</span>}
                        </h3>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-xs font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                            {uploading ? 'Se încarcă...' : '📸 Adaugă'}
                        </button>
                    </div>

                    {/* Description input - always visible, compact */}
                    <input
                        type="text"
                        placeholder="Descriere poză (opțional)..."
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all mb-3"
                    />

                    {/* Photo Grid */}
                    {photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {photos.map(photo => (
                                <div
                                    key={photo.id}
                                    className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => { setSelectedPhoto(photo); setShowPhotoModal(true) }}
                                >
                                    <img
                                        src={photo.photo_path?.startsWith('http') ? photo.photo_path : `${API_BASE}${photo.photo_path}`}
                                        alt={photo.description || 'Poză șantier'}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                                        <div className="absolute bottom-1.5 left-1.5 right-1.5">
                                            {photo.description && <p className="text-white text-[10px] font-medium truncate">{photo.description}</p>}
                                            <p className="text-white/70 text-[9px]">
                                                {photo.uploader_name} · {new Date(photo.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id) }}
                                        className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-slate-400">
                            <Image className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="text-xs">Nicio poză încărcată azi</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Modal */}
            {showPhotoModal && selectedPhoto && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
                    <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <img
                            src={selectedPhoto.photo_path?.startsWith('http') ? selectedPhoto.photo_path : `${API_BASE}${selectedPhoto.photo_path}`}
                            alt={selectedPhoto.description || 'Poză șantier'}
                            className="w-full rounded-2xl"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-2xl">
                            <p className="text-white text-sm font-medium">{selectedPhoto.uploader_name}</p>
                            <p className="text-white/70 text-xs">
                                {selectedPhoto.site_name} • {new Date(selectedPhoto.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {selectedPhoto.description && (
                                <p className="text-white/80 text-xs mt-1">{selectedPhoto.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setShowPhotoModal(false)}
                            className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Teams */}
            {teams.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-600 font-medium">Nicio echipă pe șantier</p>
                    <p className="text-xs text-slate-400 mt-1">Echipele vor apărea când sunt create</p>
                </div>
            ) : (
                teams.map(team => {
                    const status = teamStatuses[team.id]
                    const members = status?.members || []
                    const teamActive = members.filter(m => m.check_in_time && !m.check_out_time && !m.is_on_break).length
                    const teamBreak = members.filter(m => m.is_on_break).length
                    const teamFinished = members.filter(m => m.check_out_time && !m.is_on_break).length
                    const isExpanded = expandedTeams[team.id]

                    return (
                        <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Team Header */}
                            <button
                                onClick={() => toggleTeam(team.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                        {team.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-900 text-sm">{team.name}</div>
                                        <div className="text-xs text-slate-500">
                                            Șef: {team.team_leader_name} • {members.length} membr{members.length !== 1 ? 'i' : 'u'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {teamActive > 0 && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                            {teamActive} <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                                        </span>
                                    )}
                                    {teamBreak > 0 && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700">
                                            {teamBreak} ☕
                                        </span>
                                    )}
                                    {teamFinished > 0 && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                            {teamFinished} ✓
                                        </span>
                                    )}
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>
                            </button>

                            {/* Team Members */}
                            {isExpanded && (
                                <div className="border-t border-slate-100">
                                    {members.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-400">
                                            Niciun membru în echipă
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {members.map(member => (
                                                <div key={member.user_id} className="flex items-center justify-between p-3 px-4 hover:bg-blue-50/30 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                            {member.full_name?.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-slate-900 truncate">{member.full_name}</div>
                                                            <div className="text-[11px] text-slate-500">{member.employee_code}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        {member.check_in_time && (
                                                            <div className="text-right">
                                                                <div className={`text-sm font-bold ${member.check_out_time ? 'text-slate-600' : 'text-blue-600'}`}>
                                                                    {formatHours(getLiveHours(member))}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">
                                                                    {new Date(member.check_in_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                                                    {member.check_out_time && ` - ${new Date(member.check_out_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {getStatusBadge(member)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {members.length > 0 && (
                                        <div className="bg-slate-50 px-4 py-2 flex items-center justify-between text-xs">
                                            <span className="text-slate-500">
                                                Total ore echipă: <strong className="text-slate-700">
                                                    {formatHours(members.reduce((sum, m) => sum + getLiveHours(m), 0))}
                                                </strong>
                                            </span>
                                            {team.site_name && (
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {team.site_name}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })
            )}
        </div>
    )
}
