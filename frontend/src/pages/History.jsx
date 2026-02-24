import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import {
    ArrowLeft, Calendar, ChevronLeft, ChevronRight, Building2,
    Loader2, Clock, Coffee, MapPinOff
} from 'lucide-react'

function formatHoursMinutes(hours) {
    if (!hours || hours <= 0) return '0min'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return `${m}min`
    return `${h}h ${m}min`
}

export default function History() {
    const navigate = useNavigate()
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0])
    const [historyData, setHistoryData] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(true)
    const [historyDates, setHistoryDates] = useState([])

    const fetchHistory = useCallback(async (d) => {
        try {
            setHistoryLoading(true)
            const res = await api.get('/timesheets/my-history', { params: { target_date: d } })
            setHistoryData(res.data)
        } catch (e) { console.error(e) }
        finally { setHistoryLoading(false) }
    }, [])

    const fetchHistoryDates = useCallback(async () => {
        try {
            const res = await api.get('/timesheets/my-history-dates')
            setHistoryDates(res.data?.dates || [])
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => {
        fetchHistory(historyDate)
        fetchHistoryDates()
    }, [])

    const changeDate = (delta) => {
        const d = new Date(historyDate)
        d.setDate(d.getDate() + delta)
        const today = new Date()
        if (delta > 0 && d > today) return
        const newDate = d.toISOString().split('T')[0]
        setHistoryDate(newDate)
        fetchHistory(newDate)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="max-w-md mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold">Istoricul Meu</h1>
                            <p className="text-xs text-blue-100">Ore, pauze și activități</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-md mx-auto px-4 py-4 space-y-4">
                {/* Date Picker */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => changeDate(-1)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-500" />
                        </button>
                        <input
                            type="date"
                            value={historyDate}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                                setHistoryDate(e.target.value)
                                fetchHistory(e.target.value)
                            }}
                            className="flex-1 text-center px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                        <button
                            onClick={() => changeDate(1)}
                            disabled={historyDate >= new Date().toISOString().split('T')[0]}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                    {/* Weekday label */}
                    <div className="text-center text-xs text-slate-500 mt-2">
                        {new Date(historyDate + 'T12:00:00').toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {/* Quick date pills */}
                    {historyDates.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
                            {historyDates.slice(0, 14).map(d => (
                                <button
                                    key={d}
                                    onClick={() => { setHistoryDate(d); fetchHistory(d) }}
                                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${d === historyDate
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {new Date(d + 'T12:00:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* History Content */}
                {historyLoading ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    </div>
                ) : !historyData?.found ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Calendar className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">Niciun pontaj</p>
                        <p className="text-xs text-slate-400 mt-1">Nu ai lucrat în această zi</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-blue-100">
                                <Clock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                                <div className="text-xl font-bold text-blue-600">{formatHoursMinutes(historyData.total_worked)}</div>
                                <div className="text-xs text-slate-500 mt-0.5">Ore lucrate</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-orange-100">
                                <Coffee className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                                <div className="text-xl font-bold text-orange-600">{formatHoursMinutes(historyData.total_break)}</div>
                                <div className="text-xs text-slate-500 mt-0.5">Pauză</div>
                            </div>
                        </div>

                        {/* Segments */}
                        <div className="space-y-3">
                            {historyData.segments.filter(s => s.worked_hours > 0 || s.is_active).map((seg, i) => (
                                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-bold text-slate-800">{seg.site_name}</span>
                                        </div>
                                        {seg.is_active ? (
                                            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">● Activ</span>
                                        ) : (
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">Terminat</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-600">
                                        <span>🕐 {new Date(seg.check_in).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                                        {seg.check_out && (
                                            <span>→ {new Date(seg.check_out).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                                        )}
                                        <span className="font-bold text-blue-600">{formatHoursMinutes(seg.worked_hours)}</span>
                                    </div>
                                    {seg.break_hours > 0 && (
                                        <div className="text-xs text-orange-600">☕ Pauză: {formatHoursMinutes(seg.break_hours)}</div>
                                    )}
                                    {seg.geofence_pause_hours > 0 && (
                                        <div className="text-xs text-red-500 flex items-center gap-1">
                                            <MapPinOff className="w-3 h-3" /> Afara din zonă: {formatHoursMinutes(seg.geofence_pause_hours)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Activities */}
                        {historyData.activities?.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-4">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Activități</div>
                                <div className="space-y-2">
                                    {historyData.activities.map((act, i) => (
                                        <div key={i} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                                            <span className="text-sm text-slate-700">{act.name}</span>
                                            <span className="text-sm font-bold text-blue-600">
                                                {act.quantity} <span className="text-xs text-slate-400 font-normal">{act.unit_type}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
