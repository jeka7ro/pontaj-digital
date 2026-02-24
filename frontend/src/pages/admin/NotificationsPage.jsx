import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import {
    Bell, Loader2, RefreshCw, Filter, Calendar, Clock, User,
    LogIn, LogOut, Coffee, RotateCcw, ChevronLeft, ChevronRight,
    Building2, Search
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const EVENT_STYLES = {
    check_in: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Intrare', Icon: LogIn },
    check_out: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Ieșire', Icon: LogOut },
    break_start: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Pauză', Icon: Coffee },
    break_end: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Revenire', Icon: RotateCcw },
}

function AvatarImg({ path, name, size = 'w-9 h-9' }) {
    const [err, setErr] = useState(false)
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    if (!path || err) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                {initials}
            </div>
        )
    }
    const src = path.startsWith('http') ? path : `${API_BASE}${path}`
    return <img src={src} alt={name} className={`${size} rounded-full object-cover shrink-0`} onError={() => setErr(true)} />
}

export default function NotificationsPage() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [typeFilter, setTypeFilter] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true)
            const res = await api.get('/admin/notifications/feed')
            setEvents(res.data.events || [])
            setTotal(res.data.total || 0)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchEvents() }, [fetchEvents])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const t = setInterval(fetchEvents, 30000)
        return () => clearInterval(t)
    }, [fetchEvents])

    const formatTime = (t) => {
        try {
            return new Date(t).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        } catch { return '' }
    }

    const formatDate = (t) => {
        try {
            return new Date(t).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
        } catch { return '' }
    }

    // Filter events
    const filtered = events.filter(evt => {
        if (typeFilter && evt.type !== typeFilter) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            if (!evt.message.toLowerCase().includes(q) && !evt.detail.toLowerCase().includes(q) && !(evt.worker_name || '').toLowerCase().includes(q)) return false
        }
        return true
    })

    // Group events by date
    const today = new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        Notificări
                        <span className="text-base font-normal text-slate-400">({total} evenimente)</span>
                    </h1>
                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizează
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Caută după nume, șantier..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                        </div>
                        {/* Type filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                                <option value="">Toate evenimentele</option>
                                <option value="check_in">🟢 Intrări</option>
                                <option value="check_out">🔴 Ieșiri</option>
                                <option value="break_start">☕ Pauze</option>
                                <option value="break_end">🔄 Reveniri</option>
                            </select>
                        </div>
                        {/* Today date badge */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">{today}</span>
                        </div>
                    </div>
                </div>

                {/* Events */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-600">Niciun eveniment</p>
                        <p className="text-sm text-slate-400 mt-1">{searchQuery || typeFilter ? 'Încearcă alte filtre' : 'Evenimentele de azi vor apărea aici'}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tip</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Muncitor</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Eveniment</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Șantier / Detalii</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ora</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((evt, i) => {
                                    const style = EVENT_STYLES[evt.type] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', label: evt.type, Icon: Bell }
                                    const { Icon } = style
                                    return (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            {/* Type badge */}
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text} ${style.border} border`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {style.label}
                                                </span>
                                            </td>
                                            {/* Worker */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <AvatarImg path={evt.avatar_path} name={evt.worker_name} size="w-8 h-8" />
                                                    <span className="text-sm font-semibold text-slate-800">{evt.worker_name}</span>
                                                </div>
                                            </td>
                                            {/* Message */}
                                            <td className="px-5 py-3.5">
                                                <p className="text-sm text-slate-700">{evt.message}</p>
                                            </td>
                                            {/* Site / detail */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span>{evt.detail}</span>
                                                </div>
                                            </td>
                                            {/* Date */}
                                            <td className="px-5 py-3.5">
                                                <span className="text-sm text-slate-500">{formatDate(evt.time)}</span>
                                            </td>
                                            {/* Time */}
                                            <td className="px-5 py-3.5">
                                                <span className="text-sm font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    {formatTime(evt.time)}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {/* Footer */}
                        <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                            <span>{filtered.length} din {total} evenimente afișate</span>
                            <span className="flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3" /> Se actualizează automat la 30 secunde
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
