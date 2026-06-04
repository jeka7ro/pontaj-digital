import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    ClipboardList, Plus, Send, Eye, Pencil, Trash2,
    CheckCircle2, Clock, CircleDot, XCircle, Copy,
    ExternalLink, ChevronDown, Filter, Pen, X, Timer, User, Package, Trash,
    FileText, CheckCircle, Play, Ban, MapPin
} from 'lucide-react'
import api from '../../lib/api'
import KPICard from '../../components/KPICard'
import DataTable from '../../components/DataTable'

const STATUS_CONFIG = {
    draft:       { label: 'Nouă',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
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
    const [sigModal, setSigModal] = useState(null)           // { name, sig }
    const [sessionsModal, setSessionsModal] = useState(null)  // { woId, title, data }
    const [sessionsLoading, setSessionsLoading] = useState(false)
    const [matModal, setMatModal] = useState(null)            // { woId, title, rows }
    const [matSaving, setMatSaving] = useState(false)

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const params = filterStatus ? `?status=${filterStatus}` : ''
            const res = await api.get(`/admin/work-orders${params}`)
            const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
            setWorkOrders(data)
        } catch { /* silently fail */ }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchOrders() }, [filterStatus])

    const handleSend = async (wo) => {
        setSendingId(wo.id)
        try {
            const res = await api.post(`/admin/work-orders/${wo.id}/send`)
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
            await api.delete(`/admin/work-orders/${wo.id}`)
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

    const columns = [
        {
            key: 'title', label: 'Titlu', sortable: true,
            render: (wo) => (
                <div>
                    {wo.assigned_team_name && (
                        <div className="mb-1">
                            <span 
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" 
                                style={{ 
                                    backgroundColor: `${wo.assigned_team_color}15`, 
                                    color: wo.assigned_team_color, 
                                    border: `1px solid ${wo.assigned_team_color}30` 
                                }}
                            >
                                <User className="w-3 h-3" />
                                {wo.assigned_team_name}
                            </span>
                        </div>
                    )}
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {wo.title}
                    </div>
                    {wo.site_name && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">📍 {wo.site_name}</div>
                    )}
                    {wo.site_address && !wo.site_name && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[200px]" title={wo.site_address}>{wo.site_address}</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'client_name', label: 'Client', sortable: true,
            render: (wo) => (
                <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{wo.client_name || '—'}</div>
                    {wo.client_email && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{wo.client_email}</div>
                    )}
                </div>
            )
        },
        {
            key: 'deadline_date', label: 'Deadline', sortable: true,
            render: (wo) => (
                <div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">{formatDate(wo.deadline_date)}</div>
                    {wo.confirmed_at && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmat {formatDate(wo.confirmed_at)}
                            {wo.status === 'confirmed' && wo.client_signature && (
                                <button
                                    onClick={() => setSigModal({ name: wo.confirmed_by_name, sig: wo.client_signature })}
                                    title="Vezi semnătura digitală"
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors text-slate-500 hover:text-violet-600"
                                >
                                    <Pen className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'summary', label: 'Sumar', sortable: false,
            render: (wo) => (
                <div className="flex flex-col gap-1.5 max-w-[200px]">
                    {wo.volumes && wo.volumes.length > 0 && (
                        <div className="flex items-start gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Vol:</span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate" title={wo.volumes.map(v => `${v.label} (${v.quantity} ${v.unit})`).join(', ')}>
                                {wo.volumes.map(v => `${v.label} ${v.quantity ? `(${v.quantity} ${v.unit})` : ''}`).join(', ')}
                            </span>
                        </div>
                    )}
                    {wo.materials && wo.materials.length > 0 && (
                        <div className="flex items-start gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Mat:</span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate" title={wo.materials.map(m => `${m.name} (${m.quantity} ${m.unit})`).join(', ')}>
                                {wo.materials.map(m => `${m.name} ${m.quantity ? `(${m.quantity} ${m.unit})` : ''}`).join(', ')}
                            </span>
                        </div>
                    )}
                    {(!wo.volumes?.length && !wo.materials?.length) && (
                        <span className="text-xs text-slate-400">—</span>
                    )}
                </div>
            )
        },
        {
            key: 'status', label: 'Status', sortable: true,
            render: (wo) => {
                const cfg = STATUS_CONFIG[wo.status] || STATUS_CONFIG.draft
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </span>
                )
            }
        },
        {
            key: 'actions', label: 'Acțiuni', sortable: false,
            render: (wo) => {
                const link = getLink(wo)
                return (
                    <div className="flex items-center gap-1">
                        {wo.status !== 'draft' && (
                            <button
                                onClick={() => copyLink(link, wo.id)}
                                title="Copiază link confirmare"
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 hover:text-blue-600"
                            >
                                {copiedId === wo.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        )}
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
                        {['confirmed', 'in_progress', 'completed'].includes(wo.status) && (
                            <button
                                onClick={async () => {
                                    setSessionsLoading(true)
                                    setSessionsModal({ woId: wo.id, title: wo.title, data: null })
                                    try {
                                        const res = await api.get(`/admin/work-orders/${wo.id}/sessions`)
                                        setSessionsModal({ woId: wo.id, title: wo.title, data: res.data })
                                    } catch { setSessionsModal({ woId: wo.id, title: wo.title, data: { error: true } }) }
                                    finally { setSessionsLoading(false) }
                                }}
                                title="Ore lucrate pe comandă"
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-slate-500 hover:text-blue-600"
                            >
                                <Timer className="w-4 h-4" />
                            </button>
                        )}
                        {['confirmed', 'in_progress', 'completed'].includes(wo.status) && (
                            <button
                                onClick={() => setMatModal({
                                    woId: wo.id,
                                    title: wo.title,
                                    rows: wo.materials_consumed?.length
                                        ? wo.materials_consumed.map(m => ({ ...m }))
                                        : [{ name: '', quantity: '', unit: '', note: '' }]
                                })}
                                title="Materiale consumate"
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-slate-500 hover:text-emerald-600"
                            >
                                <Package className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => navigate(`/admin/work-orders/${wo.id}/edit`)}
                            title="Editează"
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 hover:text-blue-600"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
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
                )
            }
        }
    ]

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
                    const kpiThemes = {
                        draft: 'slate', sent: 'orange', confirmed: 'green',
                        in_progress: 'blue', completed: 'purple', cancelled: 'slate'
                    }
                    const kpiIcons = {
                        draft: FileText, sent: Send, confirmed: CheckCircle2,
                        in_progress: Play, completed: CheckCircle, cancelled: Ban
                    }
                    return (
                        <KPICard
                            key={key}
                            label={cfg.label}
                            value={count}
                            icon={kpiIcons[key] || CircleDot}
                            colorTheme={kpiThemes[key] || 'blue'}
                            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                            active={filterStatus === key}
                        />
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
                <DataTable
                    columns={columns}
                    data={workOrders}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder="Caută comandă..."
                    emptyText={filterStatus ? `Nicio comandă cu statusul "${STATUS_CONFIG[filterStatus]?.label}"` : 'Nicio comandă de lucru'}
                    rowStyle={(wo) => wo.assigned_team_color ? {
                        backgroundColor: `${wo.assigned_team_color}08`,
                        boxShadow: `inset 4px 0 0 ${wo.assigned_team_color}`
                    } : undefined}
                    onRowClick={(wo) => navigate(`/admin/work-orders/${wo.id}`)}
                />
            </div>

            {/* Materials Consumed Modal */}
            {matModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setMatModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-emerald-500" />
                                    <h3 className="font-extrabold text-slate-900 dark:text-white">Materiale Consumate</h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">{matModal.title}</p>
                            </div>
                            <button onClick={() => setMatModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Înregistrează materialele folosite efectiv pe această comandă. Salvarea înlocuiește lista existentă.</p>
                            {matModal.rows.map((row, i) => (
                                <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-2">
                                    <input
                                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-400 outline-none"
                                        placeholder="Denumire material *"
                                        value={row.name}
                                        onChange={e => {
                                            const rows = matModal.rows.map((r, j) => j === i ? { ...r, name: e.target.value } : r)
                                            setMatModal(m => ({ ...m, rows }))
                                        }}
                                    />
                                    <input
                                        className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-400 outline-none text-center"
                                        placeholder="Cant."
                                        value={row.quantity}
                                        onChange={e => {
                                            const rows = matModal.rows.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r)
                                            setMatModal(m => ({ ...m, rows }))
                                        }}
                                    />
                                    <input
                                        className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-400 outline-none text-center"
                                        placeholder="UM"
                                        value={row.unit}
                                        onChange={e => {
                                            const rows = matModal.rows.map((r, j) => j === i ? { ...r, unit: e.target.value } : r)
                                            setMatModal(m => ({ ...m, rows }))
                                        }}
                                    />
                                    <input
                                        className="w-36 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-400 outline-none"
                                        placeholder="Notă..."
                                        value={row.note}
                                        onChange={e => {
                                            const rows = matModal.rows.map((r, j) => j === i ? { ...r, note: e.target.value } : r)
                                            setMatModal(m => ({ ...m, rows }))
                                        }}
                                    />
                                    <button
                                        onClick={() => setMatModal(m => ({ ...m, rows: m.rows.filter((_, j) => j !== i) }))}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => setMatModal(m => ({ ...m, rows: [...m.rows, { name: '', quantity: '', unit: '', note: '' }] }))}
                                className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 hover:text-emerald-600 hover:border-emerald-400 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Adaugă rând
                            </button>
                        </div>
                        {/* Footer */}
                        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
                            <button onClick={() => setMatModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                Anulează
                            </button>
                            <button
                                disabled={matSaving}
                                onClick={async () => {
                                    setMatSaving(true)
                                    try {
                                        await api.patch(`/admin/work-orders/${matModal.woId}/materials-consumed`, { materials_consumed: matModal.rows })
                                        await fetchOrders()
                                        setMatModal(null)
                                    } catch { /* ignore */ }
                                    finally { setMatSaving(false) }
                                }}
                                className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md shadow-emerald-500/30 transition-all disabled:opacity-50"
                            >
                                {matSaving ? 'Se salvează...' : '✓ Salvează'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sessions Modal — Ore lucrate pe comandă */}
            {sessionsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSessionsModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-blue-500" />
                                    <h3 className="font-extrabold text-slate-900 dark:text-white">Pontaj pe Comandă</h3>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">{sessionsModal.title}</p>
                            </div>
                            <button onClick={() => setSessionsModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto">
                            {sessionsLoading || !sessionsModal.data ? (
                                <div className="flex items-center justify-center py-10 text-slate-400">
                                    <Clock className="w-6 h-6 animate-spin mr-2" /> Se încarcă...
                                </div>
                            ) : sessionsModal.data.error ? (
                                <div className="text-center py-8 text-red-500 text-sm">Eroare la încărcare.</div>
                            ) : (
                                <>
                                    {/* Total */}
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow-lg">
                                        <div>
                                            <div className="text-xs opacity-80 font-medium">Total ore lucrate</div>
                                            <div className="text-3xl font-black">{sessionsModal.data.total_hours}h</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs opacity-80">Sesiuni</div>
                                            <div className="text-2xl font-bold">{sessionsModal.data.sessions_count}</div>
                                        </div>
                                    </div>

                                    {sessionsModal.data.sessions.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400 text-sm">
                                            <Timer className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            Niciun angajat nu a pontajat pe această comandă încă.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {sessionsModal.data.sessions.map((s, i) => (
                                                <div key={i} className="py-3 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                        <User className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-white">{s.user_name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            {s.date} · {s.check_in ? new Date(s.check_in).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                            {s.check_out ? ` → ${new Date(s.check_out).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}` : ' → activ'}
                                                        </div>
                                                    </div>
                                                    <div className={`text-sm font-bold ${s.active ? 'text-blue-500' : 'text-slate-700 dark:text-white'}`}>
                                                        {s.active ? '⏱ activ' : `${s.hours}h`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {sigModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSigModal(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-white">Semnătură Digitală</h3>
                                {sigModal.name && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confirmată de: <strong>{sigModal.name}</strong></p>}
                            </div>
                            <button onClick={() => setSigModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-center">
                                <img src={sigModal.sig} alt="Semnătură" className="max-h-40 max-w-full object-contain" />
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs text-slate-500 dark:text-slate-400">Semnătură digitală autentică — stocată securizat</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
