import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    ClipboardList, Plus, Send, Eye, Pencil, Trash2,
    CheckCircle2, Clock, CircleDot, XCircle, Copy,
    ExternalLink, ChevronDown, Filter
} from 'lucide-react'
import api from '../../lib/api'

const STATUS_CONFIG = {
    draft:       { label: 'Draft',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
    sent:        { label: 'Trimisă',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
    confirmed:   { label: 'Confirmată',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
    in_progress: { label: 'În Execuție', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
    completed:   { label: 'Finalizată',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500' },
    cancelled:   { label: 'Anulată',     color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function WorkOrders() {
    const navigate = useNavigate()
    const [workOrders, setWorkOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('')
    const [copiedId, setCopiedId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [sendingId, setSendingId] = useState(null)
    const [sendResult, setSendResult] = useState(null)

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const params = filterStatus ? `?status=${filterStatus}` : ''
            const res = await api.get(`/work-orders${params}`)
            setWorkOrders(res.data)
        } catch { /* silently fail */ }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchOrders() }, [filterStatus])

    const handleSend = async (wo) => {
        setSendingId(wo.id)
        try {
            const res = await api.post(`/work-orders/${wo.id}/send`)
            setWorkOrders(prev => prev.map(w => w.id === wo.id ? res.data : w))
            setSendResult({ id: wo.id, url: res.data.confirm_url })
        } catch (e) {
            alert(e.response?.data?.detail || 'Eroare la trimitere.')
        } finally {
            setSendingId(null)
        }
    }

    const handleDelete = async (wo) => {
        if (!confirm(`Ștergi comanda "${wo.title}"?`)) return
        setDeletingId(wo.id)
        try {
            await api.delete(`/work-orders/${wo.id}`)
            setWorkOrders(prev => prev.filter(w => w.id !== wo.id))
        } catch (e) {
            alert(e.response?.data?.detail || 'Eroare la ștergere.')
        } finally {
            setDeletingId(null)
        }
    }

    const copyLink = async (url, id) => {
        try {
            await navigator.clipboard.writeText(url)
            setCopiedId(id)
            setTimeout(() => setCopiedId(null), 2000)
        } catch {}
    }

    const getLink = (wo) => {
        return `${window.location.origin}/confirm/${wo.token}`
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
                        <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Comenzi de Lucru</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Gestionare comenzi B2B cu clienții</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/admin/work-orders/new')}
                    className="flex items-center gap-2 px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-500/20 transition-all hover:scale-105"
                >
                    <Plus className="w-4 h-4" />
                    Comandă Nouă
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = workOrders.filter(w => w.status === key).length
                    return (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                            className={`p-3 rounded-2xl border text-left transition-all hover:scale-[1.02] ${
                                filterStatus === key
                                    ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 shadow-md'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{cfg.label}</span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white">{count}</div>
                        </button>
                    )
                })}
            </div>

            {/* Send Result Banner */}
            {sendResult && (
                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Comanda a fost marcată ca trimisă!</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-500 truncate">{sendResult.url}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => copyLink(sendResult.url, 'banner')} className="flex items-center gap-1.5 px-3 h-8 bg-emerald-600 text-white text-xs font-bold rounded-full hover:bg-emerald-700 transition-colors">
                            <Copy className="w-3 h-3" />
                            {copiedId === 'banner' ? 'Copiat!' : 'Copiază'}
                        </button>
                        <button onClick={() => setSendResult(null)} className="px-3 h-8 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">✕</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : workOrders.length === 0 ? (
                    <div className="text-center py-20">
                        <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-lg font-bold text-slate-500 dark:text-slate-400">Nicio comandă</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                            {filterStatus ? `Nicio comandă cu statusul "${STATUS_CONFIG[filterStatus]?.label}"` : 'Creează prima comandă de lucru'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">Titlu</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400 hidden sm:table-cell">Client</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400 hidden md:table-cell">Deadline</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-5 py-3.5 text-right text-[11px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {workOrders.map(wo => {
                                    const cfg = STATUS_CONFIG[wo.status] || STATUS_CONFIG.draft
                                    const link = getLink(wo)
                                    return (
                                        <tr key={wo.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{wo.title}</div>
                                                {wo.site_name && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">📍 {wo.site_name}</div>
                                                )}
                                                {wo.site_address && !wo.site_name && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">📍 {wo.site_address}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 hidden sm:table-cell">
                                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{wo.client_name || '—'}</div>
                                                {wo.client_email && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{wo.client_email}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 hidden md:table-cell">
                                                <div className="text-sm text-slate-700 dark:text-slate-300">{formatDate(wo.deadline_date)}</div>
                                                {wo.confirmed_at && (
                                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Confirmat {formatDate(wo.confirmed_at)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Copy link */}
                                                    {wo.status !== 'draft' && (
                                                        <button
                                                            onClick={() => copyLink(link, wo.id)}
                                                            title="Copiază link confirmare"
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 hover:text-blue-600"
                                                        >
                                                            {copiedId === wo.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {/* Open public page */}
                                                    {wo.status !== 'draft' && (
                                                        <a
                                                            href={link}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title="Deschide pagina client"
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 hover:text-blue-600"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    {/* Send */}
                                                    {wo.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleSend(wo)}
                                                            disabled={sendingId === wo.id}
                                                            title="Marchează ca trimisă"
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-slate-500 hover:text-amber-600"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {/* Edit */}
                                                    {wo.status !== 'confirmed' && (
                                                        <button
                                                            onClick={() => navigate(`/admin/work-orders/${wo.id}/edit`)}
                                                            title="Editează"
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 hover:text-blue-600"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {/* Delete */}
                                                    {['draft', 'cancelled'].includes(wo.status) && (
                                                        <button
                                                            onClick={() => handleDelete(wo)}
                                                            disabled={deletingId === wo.id}
                                                            title="Șterge"
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-slate-500 hover:text-red-500"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
