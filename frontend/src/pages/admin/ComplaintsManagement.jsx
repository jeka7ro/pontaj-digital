import { useState, useEffect } from 'react'
import { MessageSquareWarning, Search, X, ChevronLeft, ChevronRight, Loader2, CheckCircle, Clock, AlertCircle, XCircle, Send, User } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'

const STATUSES = [
    { id: 'all',       label: 'Toate',       color: 'slate' },
    { id: 'open',      label: 'Deschise',    color: 'blue' },
    { id: 'in_review', label: 'În Analiză',  color: 'amber' },
    { id: 'resolved',  label: 'Rezolvate',   color: 'emerald' },
    { id: 'closed',    label: 'Închise',     color: 'slate' },
]

const STATUS_CONFIG = {
    open:      { label: 'Deschisă',   icon: AlertCircle,   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    in_review: { label: 'În Analiză', icon: Clock,         cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    resolved:  { label: 'Rezolvată',  icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    closed:    { label: 'Închisă',    icon: XCircle,       cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

export default function ComplaintsManagement() {
    const { showToast } = useUIStore()
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [selectedIds, setSelectedIds] = useState([])

    // Detail / respond modal
    const [detailComplaint, setDetailComplaint] = useState(null)
    const [responseText, setResponseText] = useState('')
    const [responseStatus, setResponseStatus] = useState('resolved')
    const [submitting, setSubmitting] = useState(false)

    // Confirm modal
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

    useEffect(() => { fetchComplaints() }, [statusFilter])

    const fetchComplaints = async () => {
        setLoading(true)
        try {
            const params = statusFilter !== 'all' ? { status_filter: statusFilter } : {}
            const res = await api.get('/admin/complaints/', { params })
            setComplaints(res.data)
            setSelectedIds([])
            setCurrentPage(1)
        } catch {
            showToast('Eroare la încărcare', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleRespond = async () => {
        if (!responseText.trim()) { showToast('Scrie un răspuns', 'error'); return }
        setSubmitting(true)
        try {
            await api.put(`/admin/complaints/${detailComplaint.id}/respond`, {
                admin_response: responseText,
                status: responseStatus,
            })
            showToast('Răspuns trimis', 'success')
            setDetailComplaint(null)
            fetchComplaints()
        } catch {
            showToast('Eroare la trimiterea răspunsului', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleStatusChange = async (id, newStatus) => {
        try {
            await api.put(`/admin/complaints/${id}/status`, { status: newStatus })
            showToast('Status actualizat', 'success')
            fetchComplaints()
            if (detailComplaint?.id === id) setDetailComplaint(prev => ({ ...prev, status: newStatus }))
        } catch {
            showToast('Eroare', 'error')
        }
    }

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Sesizare',
            message: 'Sigur doriți să ștergeți această sesizare?',
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/complaints/${id}`)
                    showToast('Sesizare ștearsă', 'success')
                    fetchComplaints()
                    if (detailComplaint?.id === id) setDetailComplaint(null)
                } catch { showToast('Eroare la ștergere', 'error') }
            }
        })
    }

    const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    const toggleAll = () => {
        const pageIds = paginated.map(c => c.id)
        setSelectedIds(pageIds.every(id => selectedIds.includes(id)) ? selectedIds.filter(id => !pageIds.includes(id)) : [...new Set([...selectedIds, ...pageIds])])
    }

    const filtered = complaints.filter(c =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.content?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <>
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                            <MessageSquareWarning className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sesizări și Reclamații</h1>
                            <p className="text-xs text-slate-400 mt-0.5">{complaints.filter(c => c.status === 'open').length} deschise · {complaints.length} total</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    {/* Toolbar */}
                    <div className="p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                        {/* Search */}
                        <div className="relative group flex items-center w-full sm:w-auto">
                            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Caută sesizare, angajat..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                className="w-full sm:w-72 h-10 pl-10 pr-10 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                            {searchQuery && (
                                <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                    <span className="text-[10px] font-bold text-white">{filtered.length}/{complaints.length}</span>
                                    <button onClick={() => { setSearchQuery(''); setCurrentPage(1) }} className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5">
                                        <X className="w-3 h-3 text-white/80 hover:text-white" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Status filter tabs */}
                        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full shadow-inner shrink-0">
                            {STATUSES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setStatusFilter(s.id); setCurrentPage(1) }}
                                    className={`flex items-center justify-center gap-1.5 px-4 h-8 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                                        statusFilter === s.id
                                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-slate-900/5'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Batch action bar */}
                    {selectedIds.length > 0 && (
                        <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 flex items-center justify-between dark:bg-rose-900/20 dark:border-rose-900/50">
                            <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">{selectedIds.length} selectate</span>
                            <button
                                onClick={() => setConfirmModal({
                                    isOpen: true,
                                    title: 'Ștergere multiplă',
                                    message: `Ștergi ${selectedIds.length} sesizări?`,
                                    onConfirm: async () => {
                                        for (const id of selectedIds) await api.delete(`/admin/complaints/${id}`)
                                        showToast('Sesizări șterse', 'success')
                                        fetchComplaints()
                                    }
                                })}
                                className="text-sm px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium transition-colors"
                            >Șterge Selectatele</button>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-4 w-10 text-center">
                                        <input type="checkbox"
                                            checked={paginated.length > 0 && paginated.every(c => selectedIds.includes(c.id))}
                                            onChange={toggleAll}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4">Angajat</th>
                                    <th className="px-6 py-4">Titlu</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Nu există sesizări{statusFilter !== 'all' ? ' cu statusul selectat' : ''}.</td></tr>
                                ) : paginated.map(c => {
                                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.open
                                    const StatusIcon = sc.icon
                                    return (
                                        <tr key={c.id}
                                            onClick={() => { setDetailComplaint(c); setResponseText(c.admin_response || ''); setResponseStatus(c.status === 'open' || c.status === 'in_review' ? 'resolved' : c.status) }}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${selectedIds.includes(c.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-200 shrink-0">
                                                        {c.user_name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{c.user_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="font-semibold text-slate-900 dark:text-white truncate">{c.title}</p>
                                                <p className="text-xs text-slate-400 truncate max-w-[200px]">{c.content}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.cls}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                                                {new Date(c.created_at).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin' })}
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors ml-auto"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Pagination */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="uppercase tracking-wide">Afișează</span>
                            <select
                                value={itemsPerPage}
                                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span>· Total: <strong className="text-slate-700 dark:text-slate-200">{filtered.length}</strong></span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Pagina {currentPage} din {Math.max(1, totalPages)}</span>
                            <div className="flex gap-1">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── DETAIL / RESPOND MODAL ─── */}
            {detailComplaint && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailComplaint(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                    <MessageSquareWarning className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">{detailComplaint.title}</h2>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                        <User className="w-3 h-3" /> {detailComplaint.user_name} · {new Date(detailComplaint.created_at).toLocaleString('ro-RO')}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setDetailComplaint(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            {/* Continut sesizare */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conținut Sesizare</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{detailComplaint.content}</p>
                            </div>

                            {/* Status change */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Schimbă Status</p>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(STATUS_CONFIG).map(([key, val]) => {
                                        const Icon = val.icon
                                        return (
                                            <button key={key} onClick={() => handleStatusChange(detailComplaint.id, key)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                                    detailComplaint.status === key
                                                        ? 'ring-2 ring-offset-1 ring-blue-500 ' + val.cls
                                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />{val.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Raspuns admin */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Răspuns Admin</p>
                                <textarea
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                    placeholder="Scrie răspunsul tău..."
                                    rows={4}
                                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all resize-none"
                                />
                                <div className="mt-2">
                                    <label className="text-xs text-slate-400 mr-2">Status după răspuns:</label>
                                    <select value={responseStatus} onChange={e => setResponseStatus(e.target.value)}
                                        className="text-xs border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="in_review">În Analiză</option>
                                        <option value="resolved">Rezolvată</option>
                                        <option value="closed">Închisă</option>
                                    </select>
                                </div>
                            </div>

                            {detailComplaint.admin_response && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/40">
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Răspuns anterior</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{detailComplaint.admin_response}</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setDetailComplaint(null)} className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                                Anulează
                            </button>
                            <button onClick={handleRespond} disabled={submitting || !responseText.trim()}
                                className="flex items-center gap-2 px-5 h-10 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Trimite Răspuns
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <X className="w-8 h-8 text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                                    Anulează
                                </button>
                                <button onClick={() => { if (confirmModal.onConfirm) confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }) }}
                                    className="px-5 h-10 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all">
                                    Da, Șterge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
