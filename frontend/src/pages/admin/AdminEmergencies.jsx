import { useState, useEffect } from 'react'
import { AlertTriangle, Search, X, ChevronLeft, ChevronRight, Loader2, CheckCircle, Clock, XCircle, Send, User, MapPin } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'

const STATUSES = [
    { id: 'all',       label: 'Toate',       color: 'slate' },
    { id: 'active',    label: 'Active',      color: 'rose' },
    { id: 'resolved',  label: 'Rezolvate',   color: 'emerald' },
]

const STATUS_CONFIG = {
    active:   { label: 'Activă',    icon: AlertTriangle, cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
    resolved: { label: 'Rezolvată', icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
}

export default function AdminEmergencies() {
    const { showToast } = useUIStore()
    const [emergencies, setEmergencies] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [selectedIds, setSelectedIds] = useState([])

    const [detailReq, setDetailReq] = useState(null)
    const [responseText, setResponseText] = useState('')
    const [responseStatus, setResponseStatus] = useState('resolved')
    const [submitting, setSubmitting] = useState(false)

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

    useEffect(() => { fetchEmergencies() }, [statusFilter])

    const fetchEmergencies = async () => {
        setLoading(true)
        try {
            const params = statusFilter !== 'all' ? { status_filter: statusFilter } : {}
            const res = await api.get('/admin/emergencies/', { params })
            setEmergencies(res.data)
            setSelectedIds([])
            setCurrentPage(1)
        } catch {
            showToast('Eroare la încărcare', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleRespond = async () => {
        setSubmitting(true)
        try {
            await api.put(`/admin/emergencies/${detailReq.id}/status`, {
                admin_response: responseText.trim() ? responseText : null,
                status: responseStatus,
            })
            showToast('Actualizat cu succes', 'success')
            setDetailReq(null)
            fetchEmergencies()
        } catch {
            showToast('Eroare la actualizare', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Urgență',
            message: 'Sigur doriți să ștergeți această urgență?',
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/emergencies/${id}`)
                    showToast('Urgență ștearsă', 'success')
                    fetchEmergencies()
                    if (detailReq?.id === id) setDetailReq(null)
                } catch { showToast('Eroare la ștergere', 'error') }
            }
        })
    }

    const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    const toggleAll = () => {
        const pageIds = paginated.map(c => c.id)
        setSelectedIds(pageIds.every(id => selectedIds.includes(id)) ? selectedIds.filter(id => !pageIds.includes(id)) : [...new Set([...selectedIds, ...pageIds])])
    }

    const filtered = emergencies.filter(c =>
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.site_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <>
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Alerte Urgențe</h1>
                            <p className="text-xs text-slate-400 mt-0.5">{emergencies.filter(c => c.status === 'active').length} active · {emergencies.length} total</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                        <div className="relative group flex items-center w-full sm:w-auto">
                            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Caută..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                className="w-full sm:w-72 h-10 pl-10 pr-10 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
                            />
                        </div>

                        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full shadow-inner shrink-0 overflow-x-auto">
                            {STATUSES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setStatusFilter(s.id); setCurrentPage(1) }}
                                    className={`flex items-center justify-center gap-1.5 px-4 h-8 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                                        statusFilter === s.id
                                            ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-white shadow-sm ring-1 ring-slate-900/5'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 flex items-center justify-between dark:bg-rose-900/20 dark:border-rose-900/50">
                            <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">{selectedIds.length} selectate</span>
                            <button
                                onClick={() => setConfirmModal({
                                    isOpen: true,
                                    title: 'Ștergere multiplă',
                                    message: `Ștergi ${selectedIds.length} urgențe?`,
                                    onConfirm: async () => {
                                        for (const id of selectedIds) await api.delete(`/admin/emergencies/${id}`)
                                        showToast('Urgențe șterse', 'success')
                                        fetchEmergencies()
                                    }
                                })}
                                className="text-sm px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium transition-colors"
                            >Șterge Selectatele</button>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-4 w-10 text-center"><input type="checkbox" onChange={toggleAll} className="rounded" /></th>
                                    <th className="px-6 py-4">Angajat / Șantier</th>
                                    <th className="px-6 py-4">Descriere</th>
                                    <th className="px-6 py-4">Status / Nivel</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Nu există urgențe.</td></tr>
                                ) : paginated.map(c => {
                                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.active
                                    const StatusIcon = sc.icon
                                    return (
                                        <tr key={c.id}
                                            onClick={() => { setDetailReq(c); setResponseText(c.admin_response || ''); setResponseStatus(c.status === 'active' ? 'resolved' : c.status) }}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${c.severity === 'critical' && c.status === 'active' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                                        >
                                            <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{c.user_name}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/> {c.site_name}</p>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm text-slate-900 dark:text-white truncate">{c.description}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.cls}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />{sc.label}
                                                    </span>
                                                    {c.severity === 'critical' && (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                                            CRITIC
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                {new Date(c.created_at).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin' })}
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {detailReq && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailReq(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`px-6 py-5 border-b flex items-center justify-between ${detailReq.severity === 'critical' ? 'bg-red-50 border-red-100' : 'border-slate-100 dark:border-slate-800'}`}>
                            <h2 className={`text-base font-bold ${detailReq.severity === 'critical' ? 'text-red-800' : 'text-slate-900 dark:text-white'}`}>
                                Detalii Urgență {detailReq.severity === 'critical' ? '(CRITIC)' : ''}
                            </h2>
                            <button onClick={() => setDetailReq(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descriere problemă</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{detailReq.description}</p>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rezolvare</p>
                                <select value={responseStatus} onChange={e => setResponseStatus(e.target.value)}
                                    className="w-full mb-3 px-4 h-10 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500">
                                    <option value="active">Rămâne Activă</option>
                                    <option value="resolved">Marchează ca Rezolvată</option>
                                </select>

                                <textarea
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                    placeholder="Detalii despre cum s-a rezolvat (opțional)..."
                                    rows={3}
                                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 outline-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setDetailReq(null)} className="px-5 h-10 rounded-full text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">Anulează</button>
                            <button onClick={handleRespond} disabled={submitting} className="flex items-center gap-2 px-5 h-10 rounded-full text-sm font-bold text-white bg-rose-600 hover:bg-rose-700">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Salvează Modificări
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 text-center shadow-xl">
                        <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
                        <p className="text-slate-500 mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="px-5 h-10 rounded-full bg-slate-100 font-bold">Anulează</button>
                            <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }) }} className="px-5 h-10 rounded-full bg-red-600 text-white font-bold">Șterge</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
