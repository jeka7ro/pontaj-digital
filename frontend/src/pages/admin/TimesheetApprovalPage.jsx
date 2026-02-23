import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import { Calendar, Clock, Users, Coffee, Building2, Activity, RefreshCw, CheckCircle, Loader2, Timer, Image, X, ChevronLeft, ChevronRight, Phone, Mail, MapPin, FileText, ArrowLeft } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

// Date helpers
function toISO(d) { return d.toISOString().split('T')[0] }
function startOfWeek(d) {
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.getFullYear(), d.getMonth(), diff)
}

const PERIOD_PRESETS = [
    { key: 'today', label: 'Azi', get: () => { const t = new Date(); return { from: toISO(t), to: toISO(t) } } },
    { key: 'yesterday', label: 'Ieri', get: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { from: toISO(d), to: toISO(d) } } },
    { key: 'week', label: 'Săpt. curentă', get: () => { const now = new Date(); return { from: toISO(startOfWeek(now)), to: toISO(now) } } },
    { key: 'month', label: 'Luna curentă', get: () => { const now = new Date(); return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(now) } } },
    { key: 'year', label: 'Anul curent', get: () => { const now = new Date(); return { from: `${now.getFullYear()}-01-01`, to: toISO(now) } } },
    { key: 'lastyear', label: 'Anul trecut', get: () => { const y = new Date().getFullYear() - 1; return { from: `${y}-01-01`, to: `${y}-12-31` } } },
]

export default function TimesheetApprovalPage() {
    const [workers, setWorkers] = useState([])
    const [loading, setLoading] = useState(true)
    const today = new Date().toISOString().split('T')[0]
    const [dateFrom, setDateFrom] = useState(today)
    const [dateTo, setDateTo] = useState(today)
    const [activePeriod, setActivePeriod] = useState('today')
    const [lastRefresh, setLastRefresh] = useState(null)
    const refreshTimer = useRef(null)
    const isRange = dateFrom !== dateTo

    // Worker detail drawer
    const [selectedWorker, setSelectedWorker] = useState(null)
    const [workerDetail, setWorkerDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)

    // Activity detail popup
    const [activityPopup, setActivityPopup] = useState(null) // { worker, anchorRect }

    // Photos
    const [photos, setPhotos] = useState([])
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState(null)

    // Live clock
    const [now, setNow] = useState(Date.now())
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        fetchWorkers()
        fetchPhotos()
        refreshTimer.current = setInterval(fetchWorkers, 30000)
        return () => clearInterval(refreshTimer.current)
    }, [dateFrom, dateTo])

    const fetchWorkers = async () => {
        try {
            setLoading(true)
            if (!isRange) {
                const response = await api.get('/admin/timesheets/active-workers', {
                    params: { target_date: dateFrom }
                })
                setWorkers(response.data.active_workers || [])
            } else {
                // Multi-day: fetch each day, then AGGREGATE per worker
                const start = new Date(dateFrom)
                const end = new Date(dateTo)
                const maxDays = Math.min(31, Math.ceil((end - start) / 86400000) + 1)
                const dates = []
                for (let i = 0; i < maxDays; i++) {
                    const d = new Date(start)
                    d.setDate(d.getDate() + i)
                    if (d > end) break
                    dates.push(toISO(d))
                }
                const results = await Promise.all(
                    dates.map(d => api.get('/admin/timesheets/active-workers', { params: { target_date: d } }).catch(() => ({ data: { active_workers: [] } })))
                )

                // Aggregate per worker_id
                const workerMap = {}
                results.forEach((res) => {
                    (res.data.active_workers || []).forEach(w => {
                        if (!workerMap[w.worker_id]) {
                            workerMap[w.worker_id] = {
                                worker_id: w.worker_id,
                                worker_name: w.worker_name,
                                employee_code: w.employee_code,
                                avatar_path: w.avatar_path,
                                site_name: w.site_name,
                                worked_hours: 0,
                                break_hours: 0,
                                days_count: 0,
                                activities: {},
                                sites: new Set(),
                                // keep last status
                                status: 'terminat',
                                check_in_time: null,
                                check_out_time: null,
                                is_on_break: false,
                            }
                        }
                        const agg = workerMap[w.worker_id]
                        agg.worked_hours += (w.worked_hours || 0)
                        agg.break_hours += (w.break_hours || 0)
                        agg.days_count += 1
                        if (w.site_name) agg.sites.add(w.site_name)
                        // Last active status wins
                        if (w.status === 'activ') { agg.status = 'activ'; agg.is_on_break = false }
                        else if (w.status === 'pauză' && agg.status !== 'activ') { agg.status = 'pauză'; agg.is_on_break = true }
                        // Merge activities
                        ; (w.activities || []).forEach(a => {
                            const key = `${a.name}|${a.unit_type}`
                            if (!agg.activities[key]) agg.activities[key] = { name: a.name, quantity: 0, unit_type: a.unit_type }
                            agg.activities[key].quantity += a.quantity
                        })
                    })
                })

                // Convert to array
                const aggregated = Object.values(workerMap).map(w => ({
                    ...w,
                    site_name: [...w.sites].join(', '),
                    activities: Object.values(w.activities),
                }))
                setWorkers(aggregated)
            }
            setLastRefresh(new Date())
        } catch (error) {
            console.error('Error fetching workers:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchPhotos = async () => {
        try {
            const res = await api.get('/site-photos/admin', { params: { target_date: dateFrom } })
            setPhotos(res.data?.photos || [])
        } catch (e) { console.error('Photos fetch error:', e) }
    }

    const openWorkerDetail = async (worker) => {
        setSelectedWorker(worker)
        setDetailLoading(true)
        try {
            const res = await api.get(`/admin/timesheets/worker/${worker.worker_id}/history`)
            setWorkerDetail(res.data)
        } catch (e) {
            console.error('Error fetching worker detail:', e)
            setWorkerDetail(null)
        } finally {
            setDetailLoading(false)
        }
    }

    const closeWorkerDetail = () => { setSelectedWorker(null); setWorkerDetail(null) }

    const formatHours = (hours) => {
        if (!hours || hours <= 0) return '0h 00m'
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${h}h ${String(m).padStart(2, '0')}m`
    }

    const getLiveHours = (w) => {
        if (isRange) {
            // For ranges, hours are pre-aggregated
            return { worked: w.worked_hours || 0, onSite: (w.worked_hours || 0) + (w.break_hours || 0), breakH: w.break_hours || 0 }
        }
        if (w.status === 'terminat' || !w.check_in_time) {
            return { worked: w.worked_hours || 0, onSite: (w.worked_hours || 0) + (w.break_hours || 0), breakH: w.break_hours || 0 }
        }
        const checkin = new Date(w.check_in_time).getTime()
        let elapsed = (now - checkin) / 3600000
        let breakH = w.break_hours || 0
        const worked = Math.max(0, elapsed - breakH)
        return { worked, onSite: elapsed, breakH }
    }

    const isToday = dateFrom === today && dateTo === today

    const handlePreset = (preset) => {
        const range = preset.get()
        setDateFrom(range.from)
        setDateTo(range.to)
        setActivePeriod(preset.key)
    }

    const activeCount = workers.filter(w => w.status === 'activ').length
    const breakCount = workers.filter(w => w.status === 'pauză').length
    const finishedCount = workers.filter(w => w.status === 'terminat').length
    const totalWorked = workers.reduce((sum, w) => sum + getLiveHours(w).worked, 0)
    const totalBreak = workers.reduce((sum, w) => sum + (w.break_hours || 0), 0)

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">📋 Pontaje</h1>
                    <p className="text-sm text-slate-600">Monitorizare live ture și activități</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchWorkers} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    {lastRefresh && (
                        <span className="text-xs text-slate-400">{lastRefresh.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    )}
                </div>
            </div>

            {/* Period Selector */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                        {PERIOD_PRESETS.map(preset => (
                            <button
                                key={preset.key}
                                onClick={() => handlePreset(preset)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activePeriod === preset.key ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >{preset.label}</button>
                        ))}
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-1" />
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-medium">De la:</label>
                        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setActivePeriod('custom') }}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                        <label className="text-xs text-slate-500 font-medium">Până la:</label>
                        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setActivePeriod('custom') }}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <KPICard label="Total Muncitori" value={workers.length} icon={Users} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                <KPICard label="Activi Acum" value={activeCount} icon={Timer} color="bg-gradient-to-br from-green-500 to-green-600" pulse={activeCount > 0} />
                <KPICard label="În Pauză" value={breakCount} icon={Coffee} color="bg-gradient-to-br from-orange-400 to-orange-500" />
                <KPICard label="Terminat" value={finishedCount} icon={CheckCircle} color="bg-gradient-to-br from-slate-400 to-slate-500" />
                <KPICard label="Ore Lucrate" value={formatHours(totalWorked)} icon={Clock} color="bg-gradient-to-br from-indigo-500 to-indigo-600" isText />
                <KPICard label="Ore Pauză" value={formatHours(totalBreak)} icon={Coffee} color="bg-gradient-to-br from-amber-400 to-amber-500" isText />
            </div>

            {/* Site Photos */}
            {photos.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Image className="w-4 h-4 text-blue-500" />
                        Poze Șantier ({photos.length})
                    </h3>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {photos.map(photo => (
                            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => { setSelectedPhoto(photo); setShowPhotoModal(true) }}>
                                <img src={`${API_BASE}${photo.url}`} alt={photo.description || 'Poză'} className="w-full h-full object-cover" loading="lazy"
                                    onError={(e) => { e.target.style.display = 'none' }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                                        <p className="text-white text-[10px] font-medium truncate">{photo.uploaded_by_name}</p>
                                        <p className="text-white/70 text-[9px]">{photo.site_name} • {new Date(photo.uploaded_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Photo Modal */}
            {showPhotoModal && selectedPhoto && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
                    <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                        <img src={`${API_BASE}${selectedPhoto.url}`} alt="" className="w-full rounded-2xl max-h-[80vh] object-contain bg-black" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-2xl">
                            <p className="text-white text-base font-medium">{selectedPhoto.uploaded_by_name}</p>
                            <p className="text-white/70 text-sm">{selectedPhoto.site_name} • {new Date(selectedPhoto.uploaded_at).toLocaleString('ro-RO')}</p>
                            {selectedPhoto.description && <p className="text-white/80 text-sm mt-1">{selectedPhoto.description}</p>}
                        </div>
                        <button onClick={() => setShowPhotoModal(false)} className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><X className="w-5 h-5" /></button>
                        {photos.length > 1 && (<>
                            <button onClick={() => { const i = photos.findIndex(p => p.id === selectedPhoto.id); setSelectedPhoto(photos[(i - 1 + photos.length) % photos.length]) }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={() => { const i = photos.findIndex(p => p.id === selectedPhoto.id); setSelectedPhoto(photos[(i + 1) % photos.length]) }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><ChevronRight className="w-5 h-5" /></button>
                        </>)}
                    </div>
                </div>
            )}

            {/* Workers Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden relative">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Angajat</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Șantier</th>
                            {isRange && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Zile</th>}
                            {!isRange && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Check-in</th>}
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Timp Șantier</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Pauză</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Total Tură</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Activități</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && workers.length === 0 ? (
                            <tr><td colSpan={9} className="px-4 py-12 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Se încarcă...</p>
                            </td></tr>
                        ) : workers.length === 0 ? (
                            <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm">Niciun muncitor pentru perioada selectată</p>
                            </td></tr>
                        ) : (
                            workers.map((w, idx) => {
                                const live = getLiveHours(w)
                                return (
                                    <tr key={`${w.worker_id}_${idx}`} className="hover:bg-blue-50/50 transition-colors">
                                        {/* Worker — clickable */}
                                        <td className="px-4 py-3">
                                            <button onClick={() => openWorkerDetail(w)} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity group">
                                                <AvatarImg path={w.avatar_path} name={w.worker_name} size="w-9 h-9" textSize="text-sm" />
                                                <div>
                                                    <p className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 group-hover:underline">{w.worker_name}</p>
                                                    <p className="text-xs text-slate-500">{w.employee_code}</p>
                                                </div>
                                            </button>
                                        </td>

                                        {/* Site */}
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-slate-700 flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                {w.site_name || '—'}
                                            </span>
                                        </td>

                                        {/* Days count (range) or Check-in (single day) */}
                                        {isRange ? (
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-slate-700">{w.days_count || 1}</span>
                                                <span className="text-xs text-slate-400 ml-1">zile</span>
                                            </td>
                                        ) : (
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-slate-700">
                                                    {w.check_in_time ? new Date(w.check_in_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </div>
                                                {w.check_out_time && (
                                                    <div className="text-xs text-slate-400">
                                                        → {new Date(w.check_out_time).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>
                                        )}

                                        {/* On Site */}
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-slate-700">{formatHours(live.onSite)}</span>
                                        </td>

                                        {/* Break */}
                                        <td className="px-4 py-3">
                                            {live.breakH > 0 ? (
                                                <span className="text-sm text-orange-500 font-medium">{formatHours(live.breakH)}</span>
                                            ) : <span className="text-sm text-slate-400">—</span>}
                                        </td>

                                        {/* Total */}
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-bold ${w.status === 'terminat' ? 'text-slate-700' : 'text-blue-600'}`}>
                                                {formatHours(live.worked)}
                                            </span>
                                            {w.status !== 'terminat' && isToday && (
                                                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <StatusBadge status={w.status} is_on_break={w.is_on_break} />
                                        </td>

                                        {/* Activities — clickable */}
                                        <td className="px-4 py-3">
                                            {w.activities && w.activities.length > 0 ? (
                                                <button
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect()
                                                        setActivityPopup(activityPopup?.worker_id === w.worker_id ? null : { ...w, anchorRect: rect })
                                                    }}
                                                    className="flex flex-wrap gap-1 text-left group cursor-pointer"
                                                >
                                                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-medium group-hover:bg-blue-100 transition-colors">
                                                        <Activity className="w-3 h-3" />
                                                        {w.activities.length} activit{w.activities.length === 1 ? 'ate' : 'ăți'}
                                                    </span>
                                                </button>
                                            ) : <span className="text-xs text-slate-400">—</span>}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>

                {/* Activity Detail Popup */}
                {activityPopup && (
                    <>
                        <div className="fixed inset-0 z-30" onClick={() => setActivityPopup(null)} />
                        <div
                            className="fixed z-40 bg-white rounded-xl border border-slate-200 shadow-2xl p-4 min-w-[280px] max-w-[360px]"
                            style={{
                                top: Math.min(activityPopup.anchorRect.bottom + 8, window.innerHeight - 250),
                                left: Math.min(activityPopup.anchorRect.left, window.innerWidth - 380),
                            }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    Activități — {activityPopup.worker_name}
                                </h4>
                                <button onClick={() => setActivityPopup(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {activityPopup.activities.map((a, i) => (
                                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                                        <span className="text-sm text-slate-700 font-medium">{a.name}</span>
                                        <span className="text-sm font-bold text-blue-600">{a.quantity} <span className="text-xs text-slate-400 font-normal">{a.unit_type}</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {workers.length > 0 && (
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                            {workers.length} muncitor{workers.length !== 1 ? 'i' : ''} • {activeCount} activ{activeCount !== 1 ? 'i' : ''} • {finishedCount} terminat{finishedCount !== 1 ? 'e' : ''}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">Total ore lucrate: {formatHours(totalWorked)}</span>
                    </div>
                )}
            </div>

            {/* Worker Detail Drawer */}
            {selectedWorker && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/40" onClick={closeWorkerDetail} />
                    <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                            <button onClick={closeWorkerDetail} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
                                <ArrowLeft className="w-4 h-4" /> Înapoi
                            </button>
                            <button onClick={closeWorkerDetail} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        {detailLoading ? (
                            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                        ) : workerDetail ? (
                            <div className="p-6 space-y-6">
                                {/* Worker Profile */}
                                <div className="flex items-center gap-4">
                                    <AvatarImg path={workerDetail.worker.avatar_path} name={workerDetail.worker.full_name} size="w-16 h-16" textSize="text-xl" rounded="rounded-2xl" />
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{workerDetail.worker.full_name}</h2>
                                        <p className="text-sm text-slate-500">{workerDetail.worker.employee_code} • {workerDetail.worker.role_name}</p>
                                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${workerDetail.worker.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {workerDetail.worker.is_active ? '● Activ' : '● Inactiv'}
                                        </span>
                                    </div>
                                </div>

                                {/* Personal Info */}
                                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informații Personale</h3>
                                    {workerDetail.worker.phone && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            <a href={`tel:${workerDetail.worker.phone}`} className="text-blue-600 hover:underline">{workerDetail.worker.phone}</a>
                                        </div>
                                    )}
                                    {workerDetail.worker.email && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            <a href={`mailto:${workerDetail.worker.email}`} className="text-blue-600 hover:underline">{workerDetail.worker.email}</a>
                                        </div>
                                    )}
                                    {workerDetail.worker.address && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-700">{workerDetail.worker.address}</span>
                                        </div>
                                    )}
                                    {workerDetail.worker.birth_date && workerDetail.worker.birth_date !== 'None' && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-700">Naștere: {new Date(workerDetail.worker.birth_date).toLocaleDateString('ro-RO')}</span>
                                        </div>
                                    )}
                                    {workerDetail.worker.cnp && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-700">CNP: {workerDetail.worker.cnp}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-blue-600">{workerDetail.summary.total_days}</div>
                                        <div className="text-xs text-blue-500 mt-1">Zile lucrate</div>
                                    </div>
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-indigo-600">{formatHours(workerDetail.summary.total_hours)}</div>
                                        <div className="text-xs text-indigo-500 mt-1">Total ore</div>
                                    </div>
                                </div>

                                {/* Timesheet History */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Istoric Pontaje</h3>
                                    {workerDetail.history.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-4">Niciun pontaj găsit</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {workerDetail.history.map((entry, i) => (
                                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-slate-900">
                                                                {new Date(entry.date).toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                            </span>
                                                            <StatusBadge status={entry.status} />
                                                        </div>
                                                        <span className="text-sm font-bold text-blue-600">{formatHours(entry.worked_hours)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {entry.site_name}</span>
                                                        {entry.check_in && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(entry.check_in).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                                                {entry.check_out && ` - ${new Date(entry.check_out).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`}
                                                            </span>
                                                        )}
                                                        {entry.break_hours > 0 && <span className="text-orange-500">☕ {formatHours(entry.break_hours)}</span>}
                                                    </div>
                                                    {entry.activities.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {entry.activities.map((a, j) => (
                                                                <span key={j} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                                                    {a.name}: {a.quantity} {a.unit_type}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-20 text-slate-400"><p>Eroare la încărcarea datelor</p></div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .animate-slide-in-right { animation: slideInRight 0.25s ease-out; }
            `}</style>
        </div>
    )
}

/* ─── Shared Components ─── */

function AvatarImg({ path, name, size = 'w-9 h-9', textSize = 'text-sm', rounded = 'rounded-full' }) {
    const [showFallback, setShowFallback] = useState(false)
    const initial = name?.charAt(0) || '?'

    if (path && !showFallback) {
        return (
            <img
                src={`${API_BASE}${path}`}
                alt=""
                className={`${size} ${rounded} object-cover object-top`}
                onError={() => setShowFallback(true)}
            />
        )
    }
    return (
        <div className={`${size} ${rounded} bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white ${textSize} font-bold`}>
            {initial}
        </div>
    )
}

function KPICard({ label, value, icon: Icon, color, pulse, isText }) {
    return (
        <div className={`${color} text-white rounded-xl p-4 shadow-lg relative overflow-hidden`}>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 opacity-80" />
                    {pulse && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                </div>
                <div className={`${isText ? 'text-xl' : 'text-3xl'} font-bold`}>{value}</div>
                <div className="text-xs opacity-80 mt-1">{label}</div>
            </div>
            <div className="absolute -right-3 -bottom-3 opacity-10"><Icon className="w-20 h-20" /></div>
        </div>
    )
}

function StatusBadge({ status, is_on_break }) {
    if (status === 'pauză' || is_on_break) {
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200"><Coffee className="w-3 h-3" /> Pauză</span>
    }
    if (status === 'terminat') {
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"><CheckCircle className="w-3 h-3" /> Terminat</span>
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Lucrează</span>
}
