import { useState, useEffect } from 'react'
import { PackageSearch, Search, X, ChevronLeft, ChevronRight, Loader2, CheckCircle, Clock, XCircle, Send, User, MapPin, AlertCircle } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'

const STATUSES = [
    { id: 'all',       label: 'Toate',       color: 'slate' },
    { id: 'pending',   label: 'În Așteptare',color: 'amber' },
    { id: 'approved',  label: 'Aprobate',    color: 'blue' },
    { id: 'rejected',  label: 'Respinse',    color: 'rose' },
    { id: 'delivered', label: 'Predate',     color: 'emerald' },
    { id: 'completed', label: 'Semnate',     color: 'emerald' },
    { id: 'disputed',  label: 'Refuzate',    color: 'rose' },
]

const STATUS_CONFIG = {
    pending:   { label: 'În Așteptare', icon: Clock,         cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    approved:  { label: 'Aprobată',     icon: CheckCircle,   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    rejected:  { label: 'Respinsă',     icon: XCircle,       cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
    delivered: { label: 'Predată',      icon: PackageSearch, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    completed: { label: 'Semnată',      icon: CheckCircle,   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    disputed:  { label: 'Refuzată',     icon: AlertCircle,   cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
}

export default function AdminMaterialRequests() {
    const { showToast } = useUIStore()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [selectedIds, setSelectedIds] = useState([])

    const [detailReq, setDetailReq] = useState(null)
    const [responseText, setResponseText] = useState('')
    const [responseStatus, setResponseStatus] = useState('approved')
    const [submitting, setSubmitting] = useState(false)

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

    const [warehouseItems, setWarehouseItems] = useState([])
    const [linkedItems, setLinkedItems] = useState([])

    useEffect(() => { 
        fetchRequests() 
        fetchWarehouse()
    }, [statusFilter])

    const fetchWarehouse = async () => {
        try {
            const res = await api.get('/warehouse/items')
            setWarehouseItems(res.data)
        } catch {}
    }

    const fetchRequests = async () => {
        setLoading(true)
        try {
            const params = statusFilter !== 'all' ? { status_filter: statusFilter } : {}
            const res = await api.get('/admin/material-requests/', { params })
            setRequests(res.data)
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
            await api.put(`/admin/material-requests/${detailReq.id}/status`, {
                response: responseText.trim() ? responseText : null,
                status: responseStatus,
                linked_items_json: linkedItems.length > 0 ? JSON.stringify(linkedItems) : null
            })
            showToast('Actualizat cu succes', 'success')
            setDetailReq(null)
            fetchRequests()
        } catch {
            showToast('Eroare la actualizare', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Cerere',
            message: 'Sigur doriți să ștergeți această cerere de materiale?',
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/material-requests/${id}`)
                    showToast('Cerere ștearsă', 'success')
                    fetchRequests()
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

    const filtered = requests.filter(c =>
        c.items_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.site_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <>
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                            <PackageSearch className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Necesar Materiale</h1>
                            <p className="text-xs text-slate-400 mt-0.5">{requests.filter(c => c.status === 'pending').length} în așteptare · {requests.length} total</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                        <div className="relative group flex items-center w-full sm:w-auto">
                            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Caută material, angajat, șantier..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                className="w-full sm:w-72 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                            />
                            {searchQuery && (
                                <div className="absolute right-1.5 flex items-center gap-1 bg-orange-600 px-2 py-1 rounded-full shadow-sm">
                                    <span className="text-[10px] font-bold text-white">
                                        {filtered.length}/{requests.length}
                                    </span>
                                    <button
                                        onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="p-0.5 hover:bg-orange-700 rounded-full transition-colors ml-0.5 cursor-pointer"
                                    >
                                        <X className="w-3 h-3 text-white/80 hover:text-white" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full shadow-inner shrink-0 overflow-x-auto">
                            {STATUSES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => { setStatusFilter(s.id); setCurrentPage(1) }}
                                    className={`flex items-center justify-center gap-1.5 px-4 h-8 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                                        statusFilter === s.id
                                            ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white shadow-sm ring-1 ring-slate-900/5'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Removed bulk delete action bar */}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 w-24">ID</th>
                                    <th className="px-6 py-4">Angajat</th>
                                    <th className="px-6 py-4">Șantier</th>
                                    <th className="px-6 py-4">Materiale</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Nu există cereri.</td></tr>
                                ) : paginated.map(c => {
                                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending
                                    const StatusIcon = sc.icon
                                    return (
                                        <tr key={c.id}
                                            onClick={() => { 
                                                setDetailReq(c); 
                                                setResponseText(c.admin_response || ''); 
                                                setResponseStatus(c.status === 'pending' ? 'approved' : c.status);
                                                setLinkedItems([]); 
                                            }}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500">#{c.id.substring(0, 6).toUpperCase()}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{c.user_name}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {c.site_name}</div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm text-slate-900 dark:text-white truncate">{c.items_text}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.cls}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />{sc.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">
                                                {new Date(c.created_at).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin' })}
                                            </td>
                                            <td className="px-6 py-4 text-right"></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* PAGINATION CONTROLS */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500 dark:text-slate-400">Rânduri pe pagină:</span>
                            <select 
                                value={itemsPerPage} 
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        
                        {totalPages > 0 && (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    Pagina <span className="font-semibold text-slate-700 dark:text-slate-200">{currentPage}</span> din <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPages}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                    >
                                        Următor
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {detailReq && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailReq(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Detalii Cerere Materiale</h2>
                            <button onClick={() => setDetailReq(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Materiale Solicitate</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{detailReq.items_text}</p>
                                {detailReq.notes && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notițe angajat</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">{detailReq.notes}</p>
                                    </div>
                                )}
                                
                                {/* WAREHOUSE LINKER */}
                                {['pending', 'approved'].includes(detailReq.status) && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <PackageSearch className="w-3.5 h-3.5" /> Adaugă Scule din Magazie
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sculele selectate aici vor fi tăiate automat din stoc atunci când muncitorul confirmă primirea pe telefon.</p>
                                        
                                        <div className="flex gap-2 mb-3">
                                            <select
                                                id="warehouseSelect"
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                                            >
                                                <option value="">-- Alege o sculă / material --</option>
                                                {warehouseItems.map(item => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} {item.inventory_code ? `(Cod: ${item.inventory_code})` : ''} - Stoc: {item.total_quantity} {item.unit}
                                                    </option>
                                                ))}
                                            </select>
                                            <input 
                                                type="number" 
                                                id="warehouseQty" 
                                                placeholder="Cant" 
                                                defaultValue={1}
                                                min={1}
                                                className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                                            />
                                            <button
                                                onClick={() => {
                                                    const select = document.getElementById('warehouseSelect');
                                                    const qtyInput = document.getElementById('warehouseQty');
                                                    const itemId = select.value;
                                                    const qty = parseFloat(qtyInput.value);
                                                    if (!itemId || isNaN(qty) || qty <= 0) return;
                                                    
                                                    const item = warehouseItems.find(i => i.id === itemId);
                                                    if (!item) return;

                                                    if (qty > item.total_quantity) {
                                                        showToast(`Stoc insuficient. Maxim disponibil: ${item.total_quantity}`, 'error');
                                                        return;
                                                    }

                                                    if (item.inventory_code && qty > 1) {
                                                        showToast('Sculele unice se pot adăuga doar bucată cu bucată!', 'error');
                                                        return;
                                                    }

                                                    if (linkedItems.some(li => li.id === itemId)) {
                                                        showToast('Acest articol este deja pe listă!', 'error');
                                                        return;
                                                    }

                                                    setLinkedItems(prev => [...prev, {
                                                        id: item.id,
                                                        name: item.name,
                                                        qty: qty,
                                                        unit: item.unit,
                                                        inventory_code: item.inventory_code,
                                                        type: "warehouse"
                                                    }]);
                                                    
                                                    select.value = '';
                                                    qtyInput.value = 1;
                                                }}
                                                className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                                            >
                                                Adaugă
                                            </button>
                                        </div>

                                        {linkedItems.length > 0 && (
                                            <div className="space-y-2 mb-2 mt-3">
                                                {linkedItems.map((li, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-full border border-indigo-100 dark:border-indigo-800/30">
                                                        <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">
                                                            {li.qty} {li.unit} x {li.name} {li.inventory_code ? `(${li.inventory_code})` : ''}
                                                        </span>
                                                        <button 
                                                            onClick={() => setLinkedItems(prev => prev.filter(x => x.id !== li.id))}
                                                            className="text-indigo-400 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* TIMELINE COMPLET */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Timeline Complet
                                </p>
                                <div className="relative pl-6">
                                    {/* Linia verticală */}
                                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-600" />

                                    {/* Eveniment 1: Solicitare */}
                                    <div className="relative mb-4">
                                        <div className="absolute -left-4 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800 shadow" />
                                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Solicitat</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{detailReq.user_name || 'Muncitor'}</p>
                                            {detailReq.site_name && <p className="text-xs text-slate-500 dark:text-slate-400">Santier: {detailReq.site_name}</p>}
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">{new Date(detailReq.created_at).toLocaleString('ro-RO')}</p>
                                        </div>
                                    </div>

                                    {/* Eveniment 2: Raspuns Admin */}
                                    {detailReq.responded_at && (
                                        <div className="relative mb-4">
                                            <div className={`absolute -left-4 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow ${detailReq.status === 'rejected' || detailReq.status === 'disputed' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                            <div className={`border rounded-xl p-3 ${detailReq.status === 'rejected' || detailReq.status === 'disputed' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'}`}>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${detailReq.status === 'rejected' || detailReq.status === 'disputed' ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {detailReq.status === 'rejected' ? 'Respins' : 'Aprobat'}
                                                </p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{detailReq.responder_name || 'Administrator'}</p>
                                                {detailReq.admin_response && !detailReq.admin_response.startsWith('[Predat prin:') && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">"{detailReq.admin_response.replace(/\[Predat prin:[^\]]+\]\s*/g, '').trim()}"</p>
                                                )}
                                                <p className={`text-xs mt-1 font-medium ${detailReq.status === 'rejected' || detailReq.status === 'disputed' ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {new Date(detailReq.responded_at).toLocaleString('ro-RO')}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Eveniment 3: Livrat */}
                                    {(detailReq.status === 'delivered' || detailReq.status === 'completed') && detailReq.responded_at && (
                                        <div className="relative mb-4">
                                            <div className="absolute -left-4 w-4 h-4 rounded-full bg-orange-500 border-2 border-white dark:border-slate-800 shadow" />
                                            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">🚚 Predat pe Șantier</p>
                                                {detailReq.admin_response && detailReq.admin_response.includes('[Predat prin:') && (
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                        {detailReq.admin_response.match(/\[Predat prin: ([^\]]+)\]/)?.[1] || ''}
                                                    </p>
                                                )}
                                                <p className="text-xs text-orange-600 mt-1 font-medium">{new Date(detailReq.responded_at).toLocaleString('ro-RO')}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Eveniment 4: Confirmat Muncitor */}
                                    {detailReq.status === 'completed' && (
                                        <div className="relative">
                                            <div className="absolute -left-4 w-4 h-4 rounded-full bg-purple-500 border-2 border-white dark:border-slate-800 shadow" />
                                            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
                                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">✍️ Confirmat de Muncitor</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{detailReq.user_name || 'Muncitor'}</p>
                                                <p className="text-xs text-purple-500 mt-1 font-medium">Semnat digital ✓</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status curent */}
                                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center">
                                        <span className="text-xs text-slate-400">Status curent:</span>
                                        <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_CONFIG[detailReq.status]?.cls}`}>
                                            {STATUS_CONFIG[detailReq.status]?.label?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* QUICK ACTION: DELIVER */}
                            {detailReq.status === 'approved' && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col items-center text-center">
                                    <PackageSearch className="w-8 h-8 text-emerald-600 mb-2" />
                                    <h3 className="text-emerald-800 dark:text-emerald-400 font-bold mb-1">Materialele pleacă din stoc?</h3>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-4">Marchează cererea ca predată. Muncitorul va trebui să confirme primirea în aplicație pentru a finaliza transferul.</p>
                                    
                                    <input 
                                        type="text"
                                        id="carrierNameInput"
                                        placeholder="Prin cine le trimiți? (Opțional, ex: Șoferul Radu)"
                                        className="w-full mb-4 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-200 placeholder-slate-400"
                                    />

                                    <button 
                                        onClick={async () => {
                                            try {
                                                setSubmitting(true);
                                                const carrier = document.getElementById('carrierNameInput')?.value?.trim();
                                                let finalResponse = responseText.trim();
                                                if (carrier) {
                                                    finalResponse = `[Predat prin: ${carrier}] ${finalResponse}`.trim();
                                                }

                                                await api.put(`/admin/material-requests/${detailReq.id}/status`, {
                                                    response: finalResponse ? finalResponse : null,
                                                    status: 'delivered',
                                                    carrier: carrier || null,
                                                    linked_items_json: linkedItems.length > 0 ? JSON.stringify(linkedItems) : null
                                                });
                                                showToast('Cerere trimisă spre semnare pe șantier!', 'success');
                                                setDetailReq(null);
                                                fetchRequests();
                                            } catch {
                                                showToast('Eroare la livrare', 'error');
                                            } finally {
                                                setSubmitting(false);
                                            }
                                        }}
                                        disabled={submitting}
                                        className="w-full py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Trimite spre Semnare Muncitorului"}
                                    </button>
                                </div>
                            )}

                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Acțiuni Forțate</p>
                                <select value={responseStatus} onChange={e => setResponseStatus(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 mb-4 transition-all"
                                >
                                    <option value="pending">În așteptare (Revenire)</option>
                                    <option value="approved">Aprobă cererea (Selecție stoc necesară separat)</option>
                                    <option value="rejected">Respinge cererea</option>
                                    <option value="delivered">Predă pe șantier (Așteaptă Semnătură Angajat)</option>
                                    <option value="completed">Finalizează forțat (Transferă stocul fără semnătură)</option>
                                </select>

                                <textarea
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                    placeholder="Adaugă un comentariu (opțional)..."
                                    rows={3}
                                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-slate-900 outline-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setDetailReq(null)} className="px-5 h-10 rounded-full text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700">Anulează</button>
                            <button onClick={handleRespond} disabled={submitting} className="flex items-center gap-2 px-5 h-10 rounded-full text-sm font-bold text-white bg-orange-600 hover:bg-orange-700">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Salvează
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* REMOVED CONFIRM MODAL */}
        </>
    )
}
