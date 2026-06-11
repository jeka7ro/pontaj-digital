import { useState, useEffect } from 'react'
import { PackageSearch, Plus, ChevronLeft, Send, Loader2, CheckCircle, Clock, XCircle, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

const STATUS_CONFIG = {
    pending:   { label: 'În Așteptare',  icon: Clock,        cls: 'bg-amber-100 text-amber-700' },
    approved:  { label: 'Aprobată',      icon: CheckCircle,  cls: 'bg-blue-100 text-blue-700' },
    rejected:  { label: 'Respinsă',      icon: XCircle,      cls: 'bg-rose-100 text-rose-700' },
    delivered: { label: 'De Confirmat',  icon: PackageSearch,cls: 'bg-indigo-100 text-indigo-700' },
    completed: { label: 'Semnată',       icon: CheckCircle,  cls: 'bg-emerald-100 text-emerald-700' },
    disputed:  { label: 'Refuzată',      icon: XCircle,      cls: 'bg-rose-100 text-rose-700' },
}

export default function EmployeeMaterialRequests() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [requests, setRequests] = useState([])
    const [inventory, setInventory] = useState([])
    const [sites, setSites] = useState([])
    const [selectedSiteId, setSelectedSiteId] = useState('')
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [itemsText, setItemsText] = useState('')
    const [notes, setNotes] = useState('')
    const [selectedItems, setSelectedItems] = useState({}) // { itemId: quantity }
    const [submitting, setSubmitting] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => { 
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        fetchData() 
        const interval = setInterval(fetchSilent, 300000)
        return () => clearInterval(interval)
    }, [])

    const fetchSilent = async () => {
        try {
            const reqRes = await api.get('/user/material-requests')
            setRequests(prev => {
                const prevDelivered = prev.filter(r => r.status === 'delivered').map(r => r.id);
                const currentDelivered = reqRes.data.filter(r => r.status === 'delivered').map(r => r.id);
                
                const hasNew = currentDelivered.some(id => !prevDelivered.includes(id));
                if (hasNew && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification('📦 Semnătură Digitală Necesară', {
                        body: 'Administratorul ți-a predat materiale noi. Intră în aplicație pentru a confirma primirea!',
                        icon: '/vite.svg'
                    });
                }
                return reqRes.data;
            })
        } catch { /* silent */ }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const [reqRes, invRes, sitesRes] = await Promise.all([
                api.get('/user/material-requests'),
                api.get('/user/warehouse/inventory').catch(() => ({ data: [] })),
                api.get('/sites').catch(() => ({ data: [] }))
            ])
            setRequests(reqRes.data)
            setInventory(invRes.data)
            setSites(sitesRes.data || [])
        } catch { /* silent */ }
        finally { setLoading(false) }
    }

    const handleQuantityChange = (itemId, change, maxStock) => {
        setSelectedItems(prev => {
            const current = prev[itemId] || 0
            const next = Math.max(0, Math.min(current + change, maxStock))
            const updated = { ...prev }
            if (next === 0) {
                delete updated[itemId]
            } else {
                updated[itemId] = next
            }
            return updated
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        // Build the requested items text
        let finalItemsText = itemsText.trim()
        
        let itemsJsonArray = []
        
        const selectedList = Object.entries(selectedItems)
            .map(([id, qty]) => {
                const item = inventory.find(i => i.id === id)
                if (item) {
                    itemsJsonArray.push({
                        id: item.id,
                        name: item.name,
                        qty: qty,
                        unit: item.unit,
                        inventory_code: item.inventory_code,
                        type: "warehouse"
                    })
                    return `${qty} ${item.unit} x ${item.name}`
                }
                return null
            })
            .filter(Boolean)
            
        if (selectedList.length > 0) {
            const listText = "Materiale din stoc:\n- " + selectedList.join("\n- ")
            finalItemsText = finalItemsText ? `${listText}\n\nAlte materiale/notițe:\n${finalItemsText}` : listText
        }
        
        // Also add site transfer requests to json
        if (finalItemsText.includes("Solicit preluarea pe numele meu:")) {
            // Find which items were requested based on the text
            siteItems.forEach(item => {
                if (finalItemsText.includes(item.name)) {
                    itemsJsonArray.push({
                        id: item.id,
                        name: item.name,
                        qty: 1,
                        unit: item.unit,
                        inventory_code: item.inventory_code,
                        type: "site_transfer"
                    })
                }
            })
        }

        if (!finalItemsText) return

        setSubmitting(true)
        try {
            await api.post('/user/material-requests', { 
                items_text: finalItemsText, 
                items_json: JSON.stringify(itemsJsonArray),
                site_id: selectedSiteId || null,
                notes 
            })
            setItemsText('')
            setNotes('')
            setSelectedSiteId('')
            setSelectedItems({})
            setShowForm(false)
            setSuccessMsg('Necesarul a fost trimis cu succes!')
            setTimeout(() => setSuccessMsg(''), 4000)
            fetchData()
        } catch { /* silent */ }
        finally { setSubmitting(false) }
    }

    const handleRequestSiteItem = (item) => {
        setItemsText(prev => {
            const prefix = prev ? prev + '\n' : ''
            return prefix + `Solicit preluarea pe numele: ${user?.full_name || 'meu'} -> ${item.name}` + (item.inventory_code ? ` (Cod: ${item.inventory_code})` : '')
        })
        setShowForm(true)
    }

    // Categories
    const siteItems = inventory.filter(i => i.site_stock > 0)
    const availableItems = inventory.filter(i => i.central_stock > 0)

    const handleConfirm = async (id, action, reason = null) => {
        try {
            await api.put(`/user/material-requests/${id}/confirm`, { action, reason })
            setSuccessMsg(action === 'confirm' ? 'Preluare semnată cu succes!' : 'Refuz trimis adminului.')
            setTimeout(() => setSuccessMsg(''), 4000)
            fetchData()
        } catch {
            alert('A apărut o eroare la confirmare.')
        }
    }

    const unconfirmedReq = requests.find(r => r.status === 'delivered')
    
    // Group available items
    const groupedItems = availableItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
    }, {})

    return (
        <div className="bg-gradient-to-br from-slate-50 to-orange-50/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 shadow-lg sticky top-0 z-10">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <PackageSearch className="w-5 h-5 text-white/80" />
                            <h1 className="font-bold text-lg">Necesar Materiale</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        title="Cerere nouă"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* Success banner */}
                {successMsg && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-medium">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        {successMsg}
                    </div>
                )}

                {/* Atașate Șantierului - Inventory View */}
                {!loading && !showForm && siteItems.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-slate-500" />
                            <h3 className="font-bold text-slate-800">Scule pe acest șantier</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {siteItems.map(item => (
                                <div key={item.id} className="p-3 hover:bg-slate-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                                            <p className="text-xs text-slate-500">{item.category} {item.model ? `• ${item.model}` : ''}</p>
                                        </div>
                                        <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-bold border border-slate-200 shadow-sm">
                                            {item.site_stock} {item.unit}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRequestSiteItem(item)}
                                        className="w-full mt-1 py-2 bg-white border border-orange-200 text-orange-600 rounded-full text-xs font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-1 shadow-sm active:scale-[0.98]"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Solicită Preluarea
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                            <PackageSearch className="w-5 h-5 text-orange-500" />
                            <span className="font-bold text-slate-800">Cerere Nouă</span>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-0">
                            
                            {/* Warehouse Selection List */}
                            {Object.keys(groupedItems).length > 0 && (
                                <div className="px-5 pt-4 pb-2 border-b border-slate-100">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Selectează din Magazie</label>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                        {Object.entries(groupedItems).map(([category, items]) => (
                                            <div key={category}>
                                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{category}</h4>
                                                <div className="space-y-2">
                                                    {items.map(item => {
                                                        const isSelected = selectedItems[item.id] > 0
                                                        const qty = selectedItems[item.id] || 0
                                                        return (
                                                            <div key={item.id} className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${isSelected ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 hover:border-orange-200'}`}>
                                                                <div className="flex-1 min-w-0 pr-2">
                                                                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                                                    <p className="text-[11px] font-medium text-slate-500">Stoc: {item.central_stock} {item.unit}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1 bg-white rounded-full border border-slate-200 p-0.5 shadow-sm shrink-0">
                                                                    <button type="button" onClick={() => handleQuantityChange(item.id, -1, item.central_stock)} className="w-8 h-8 flex items-center justify-center rounded bg-slate-50 text-slate-600 hover:bg-orange-100 hover:text-orange-600 transition-colors font-bold text-lg leading-none active:scale-95">-</button>
                                                                    <span className="w-8 text-center text-sm font-bold text-slate-800">{qty}</span>
                                                                    <button type="button" onClick={() => handleQuantityChange(item.id, 1, item.central_stock)} className="w-8 h-8 flex items-center justify-center rounded bg-slate-50 text-slate-600 hover:bg-orange-100 hover:text-orange-600 transition-colors font-bold text-lg leading-none active:scale-95">+</button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-5 space-y-4 bg-slate-50/50">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Șantier Destinație (Dacă nu ești pontat)</label>
                                    <select
                                        value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)}
                                        className="w-full px-4 h-11 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 bg-white text-slate-900 outline-none transition-all shadow-sm"
                                    >
                                        <option value="">(Șantierul curent automat)</option>
                                        {sites.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alte Materiale (Opțional)</label>
                                    <textarea
                                        value={itemsText} onChange={e => setItemsText(e.target.value)}
                                        placeholder="Dacă nu ai găsit materialele în listă, scrie-le aici..."
                                        rows={3}
                                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 bg-white text-slate-900 outline-none transition-all resize-none shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notițe (Opțional)</label>
                                    <input
                                        value={notes} onChange={e => setNotes(e.target.value)}
                                        placeholder="Detalii suplimentare pentru administrator..."
                                        className="w-full px-4 h-11 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 bg-white text-slate-900 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowForm(false)}
                                        className="flex-1 h-11 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                        Anulează
                                    </button>
                                    <button type="submit" disabled={submitting || (!itemsText.trim() && Object.keys(selectedItems).length === 0)}
                                        className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]">
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Trimite
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* List */}
                {!showForm && (
                    <>
                        {unconfirmedReq && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <PackageSearch className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 text-center mb-2">Semnează Primirea</h2>
                                    <p className="text-sm text-slate-500 text-center mb-6">
                                        Administratorul a predat următoarea solicitare către șantier. Te rugăm să confirmi că ai intrat în posesia ei.
                                    </p>
                                    <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Materiale Vizate</p>
                                        <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{unconfirmedReq.items_text}</p>
                                    </div>
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => handleConfirm(unconfirmedReq.id, 'confirm')}
                                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98]"
                                        >
                                            Confirm Primirea
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const reason = prompt('Motivul refuzului (opțional, ex. lipsă produse):');
                                                if (reason !== null) {
                                                    handleConfirm(unconfirmedReq.id, 'reject', reason);
                                                }
                                            }}
                                            className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                                        >
                                            Refuz (Nu am primit)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4 px-1">Istoric Cereri</h3>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
                                <PackageSearch className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium text-sm">Nu ai trimis cereri de materiale.</p>
                                <button onClick={() => setShowForm(true)} className="mt-4 px-5 h-10 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2 mx-auto active:scale-95">
                                    <Plus className="w-4 h-4" /> Prima cerere
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {requests.map(c => {
                                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending
                                    const StatusIcon = sc.icon
                                    return (
                                        <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                            <div className="p-4">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${sc.cls}`}>
                                                        <StatusIcon className="w-3 h-3" />{sc.label}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400">
                                                        {new Date(c.created_at).toLocaleString('ro-RO')}
                                                    </p>
                                                </div>
                                                <p className="text-slate-700 text-sm font-medium whitespace-pre-wrap leading-relaxed">{c.items_text}</p>
                                                {c.notes && (
                                                    <p className="text-slate-500 text-xs mt-2 italic border-l-2 border-slate-200 pl-2">{c.notes}</p>
                                                )}
                                            </div>

                                            {/* Admin response */}
                                            {c.admin_response && (
                                                <div className="bg-orange-50 border-t border-orange-100 px-4 py-3">
                                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Răspuns
                                                    </p>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{c.admin_response}</p>
                                                    {c.responded_at && (
                                                        <p className="text-[10px] text-slate-400 mt-1">{new Date(c.responded_at).toLocaleString('ro-RO')}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
