import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { ChevronLeft, Wrench, Package, Flame, CheckCircle, Loader2, Minus, PackageSearch, RotateCcw, AlertTriangle, X } from 'lucide-react'

// ─── Generic Modal Shell ─────────────────────────────────────────────────────
function Modal({ onClose, children }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    )
}

export default function EmployeeInventory() {
    const navigate = useNavigate()
    const [inventory, setInventory] = useState([])
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [successMsg, setSuccessMsg] = useState('')
    const [actionLoading, setActionLoading] = useState(null)

    // ── Consume modal ────────────────────────────────────────────────────────
    const [showConsumeForm, setShowConsumeForm] = useState(false)
    const [consumeItem, setConsumeItem] = useState(null)
    const [consumeQty, setConsumeQty] = useState('')
    const [consumeNotes, setConsumeNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // ── Return tool confirm modal ────────────────────────────────────────────
    const [returnModal, setReturnModal] = useState(null) // { item }

    // ── Return consumable (qty picker) modal ─────────────────────────────────
    const [returnConsModal, setReturnConsModal] = useState(null) // { item }
    const [returnQty, setReturnQty] = useState('')

    // ── Defective report modal ───────────────────────────────────────────────
    const [defectModal, setDefectModal] = useState(null) // { item }
    const [defectNotes, setDefectNotes] = useState('')

    // ── Reject reason modal ──────────────────────────────────────────────────
    const [rejectModal, setRejectModal] = useState(null) // { reqId }
    const [rejectReason, setRejectReason] = useState('')

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get('/user/warehouse/my-inventory')
            setInventory(res.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        fetchSilent()
        const interval = setInterval(fetchSilent, 300000)
        return () => clearInterval(interval)
    }, [])

    const fetchSilent = async () => {
        try {
            const reqRes = await api.get('/user/material-requests')
            setRequests(reqRes.data)
        } catch {}
    }

    const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000) }

    const handleConfirm = async (id, action, reason = null) => {
        try {
            await api.put(`/user/material-requests/${id}/confirm`, { action, reason })
            flash(action === 'confirm' ? 'Preluare semnată cu succes!' : 'Refuz trimis adminului.')
            fetchData(); fetchSilent()
        } catch {}
    }

    // ── Return tool (unique, full return) ────────────────────────────────────
    const confirmReturn = async () => {
        const item = returnModal.item
        setReturnModal(null)
        setActionLoading(item.id + '_return')
        try {
            await api.post('/user/warehouse/return-tool', { item_id: item.id })
            flash(`"${item.name}" a fost returnată în magazie.`)
            fetchData()
        } catch { flash('Eroare la returnare.') }
        finally { setActionLoading(null) }
    }

    // ── Return consumable (partial qty) ─────────────────────────────────────
    const confirmReturnCons = async () => {
        const item = returnConsModal.item
        const qty = parseFloat(returnQty)
        if (!qty || qty <= 0 || qty > item.quantity) return
        setReturnConsModal(null)
        setActionLoading(item.id + '_return')
        try {
            await api.post('/user/warehouse/return-tool', { item_id: item.id, quantity: qty })
            flash(`${qty} ${item.unit} din "${item.name}" au fost returnate în magazie.`)
            fetchData()
        } catch { flash('Eroare la returnare.') }
        finally { setActionLoading(null) }
    }

    // ── Report defective ────────────────────────────────────────────────────
    const confirmDefective = async () => {
        const item = defectModal.item
        setDefectModal(null)
        setActionLoading(item.id + '_defect')
        try {
            await api.post('/user/warehouse/report-defective', { item_id: item.id, notes: defectNotes })
            flash(`"${item.name}" a fost raportată ca DEFECTĂ și returnată în magazie.`)
            fetchData()
        } catch { flash('Eroare la raportare.') }
        finally { setActionLoading(null); setDefectNotes('') }
    }

    // ── Consume submit ───────────────────────────────────────────────────────
    const handleConsumeSubmit = async (e) => {
        e.preventDefault()
        const qty = parseFloat(consumeQty)
        if (!qty || qty <= 0 || qty > consumeItem.quantity) return
        setSubmitting(true)
        try {
            await api.post('/user/warehouse/consume', { 
                item_id: consumeItem.id, 
                quantity: qty, 
                notes: consumeNotes,
                request_id: consumeItem.request_id
            })
            flash(`Ai raportat consumul pentru ${consumeItem.name}`)
            setShowConsumeForm(false)
            fetchData()
        } catch (error) { console.error(error) }
        finally { setSubmitting(false) }
    }

    const unconfirmedReq = requests.find(r => r.status === 'delivered')
    const tools = inventory.filter(i => i.inventory_code)
    const consumables = inventory.filter(i => !i.inventory_code)

    return (
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 shadow-lg sticky top-0 z-10">
                <div className="flex items-center gap-3 max-w-md mx-auto">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-white/80" />
                        <h1 className="font-bold text-lg">Inventarul Meu</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {successMsg && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-medium shadow-sm">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        {successMsg}
                    </div>
                )}

                {/* ── Confirm Delivery Modal ─────────────────────────────── */}
                {unconfirmedReq && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PackageSearch className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 text-center mb-2">Semnează Primirea</h2>
                            <p className="text-sm text-slate-500 text-center mb-6">
                                Administratorul a predat următoarea solicitare. Confirmă că ai intrat în posesia ei.
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
                                    ✓ Confirm Primirea
                                </button>
                                <button
                                    onClick={() => { setRejectReason(''); setRejectModal({ reqId: unconfirmedReq.id }) }}
                                    className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                                >
                                    Refuz (Nu am primit)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : inventory.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Inventar Gol</h3>
                        <p className="text-sm text-slate-500">Nu ai scule sau materiale atribuite pe numele tău.</p>
                    </div>
                ) : (
                    <>
                        {/* Scule Unice */}
                        {tools.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-slate-500" />
                                    <h3 className="font-bold text-slate-800">Sculele Mele</h3>
                                    <span className="ml-auto bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{tools.length}</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {tools.map(item => (
                                        <div key={item.id} className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-bold text-slate-800">{item.name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {item.inventory_code && <span className="font-mono">{item.inventory_code}</span>}
                                                        {item.model && <span> · {item.model}</span>}
                                                    </p>
                                                </div>
                                                {item.pending_return ? (
                                                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-1 rounded-full animate-pulse">
                                                        ⏳ Așteptare admin
                                                    </span>
                                                ) : item.is_defective ? (
                                                    <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2 py-1 rounded-full">Defect</span>
                                                ) : (
                                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-full">La mine</span>
                                                )}
                                            </div>
                                            {item.pending_return ? (
                                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
                                                    <p className="text-xs font-bold text-amber-700">Predarea a fost trimisă.</p>
                                                    <p className="text-[11px] text-amber-600 mt-0.5">Adminul trebuie să confirme primirea sculei.</p>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setReturnModal({ item })}
                                                        disabled={actionLoading === item.id + '_return'}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
                                                    >
                                                        {actionLoading === item.id + '_return' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                        Returnează
                                                    </button>
                                                    <button
                                                        onClick={() => { setDefectNotes(''); setDefectModal({ item }) }}
                                                        disabled={actionLoading === item.id + '_defect'}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors active:scale-[0.97]"
                                                    >
                                                        {actionLoading === item.id + '_defect' ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                                                        Raportează Defect
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Consumabile */}
                        {consumables.filter(c => c.category !== 'COMBUSTIBIL').length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-orange-500" />
                                    <h3 className="font-bold text-slate-800">Consumabile & Materiale</h3>
                                    <span className="ml-auto bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {consumables.filter(c => c.category !== 'COMBUSTIBIL').length}
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {consumables.filter(c => c.category !== 'COMBUSTIBIL').map(item => (
                                        <div key={item.id} className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-bold text-slate-800">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{item.category}</p>
                                                </div>
                                                <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold border border-orange-200">
                                                    {item.quantity} {item.unit}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setConsumeItem(item); setConsumeQty(''); setConsumeNotes(''); setShowConsumeForm(true) }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors active:scale-[0.97]"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                    Consum
                                                </button>
                                                <button
                                                    onClick={() => { setReturnQty(''); setReturnConsModal({ item }) }}
                                                    disabled={actionLoading === item.id + '_return'}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
                                                >
                                                    {actionLoading === item.id + '_return' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                    Retur
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Combustibil */}
                        {consumables.filter(c => c.category === 'COMBUSTIBIL').length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-red-500" />
                                    <h3 className="font-bold text-slate-800">Combustibil</h3>
                                    <span className="ml-auto bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {consumables.filter(c => c.category === 'COMBUSTIBIL').length}
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {consumables.filter(c => c.category === 'COMBUSTIBIL').map(item => (
                                        <div key={item.id} className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-bold text-slate-800">{item.name}</p>
                                                    <p className="text-xs text-slate-500">{item.category}</p>
                                                </div>
                                                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold border border-red-200">
                                                    {item.quantity} {item.unit}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setConsumeItem(item); setConsumeQty(''); setConsumeNotes(''); setShowConsumeForm(true) }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors active:scale-[0.97]"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                    Consum
                                                </button>
                                                <button
                                                    onClick={() => { setReturnQty(''); setReturnConsModal({ item }) }}
                                                    disabled={actionLoading === item.id + '_return'}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
                                                >
                                                    {actionLoading === item.id + '_return' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                    Retur
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── MODAL: Return Tool Confirm ─────────────────────────────── */}
            {returnModal && (
                <Modal onClose={() => setReturnModal(null)}>
                    <div className="text-center">
                        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <RotateCcw className="w-7 h-7 text-green-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">Returnezi scula?</h3>
                        <p className="text-sm text-slate-500">„<strong>{returnModal.item.name}</strong>" va fi marcată ca returnată în magazie.</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setReturnModal(null)} className="flex-1 h-11 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Anulează
                        </button>
                        <button onClick={confirmReturn} className="flex-1 h-11 rounded-2xl text-sm font-bold text-white bg-green-500 hover:bg-green-600 active:bg-green-700 transition-colors shadow-sm">
                            Da, Returnez
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: Return Consumable (qty picker) ─────────────────── */}
            {returnConsModal && (
                <Modal onClose={() => setReturnConsModal(null)}>
                    <div className="text-center">
                        <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <RotateCcw className="w-7 h-7 text-orange-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">Retur {returnConsModal.item.name}</h3>
                        <p className="text-sm text-slate-500 mb-4">Disponibil: <strong>{returnConsModal.item.quantity} {returnConsModal.item.unit}</strong></p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cantitate de returnat ({returnConsModal.item.unit})</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={returnConsModal.item.quantity}
                            value={returnQty}
                            onChange={e => setReturnQty(e.target.value)}
                            autoFocus
                            className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 bg-white text-lg font-bold text-slate-900 outline-none"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setReturnConsModal(null)} className="flex-1 h-11 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Anulează
                        </button>
                        <button
                            onClick={confirmReturnCons}
                            disabled={!returnQty || parseFloat(returnQty) <= 0 || parseFloat(returnQty) > returnConsModal.item.quantity}
                            className="flex-1 h-11 rounded-2xl text-sm font-bold text-white bg-green-500 hover:bg-green-600 active:bg-green-700 transition-colors shadow-sm disabled:opacity-40"
                        >
                            Confirmă Retur
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: Report Defective ────────────────────────────────── */}
            {defectModal && (
                <Modal onClose={() => setDefectModal(null)}>
                    <div className="text-center">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <AlertTriangle className="w-7 h-7 text-red-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">Raportează Defect</h3>
                        <p className="text-sm text-slate-500 mb-4">„<strong>{defectModal.item.name}</strong>"</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrie defectul (opțional)</label>
                        <textarea
                            value={defectNotes}
                            onChange={e => setDefectNotes(e.target.value)}
                            placeholder="Ex: Nu pornește, cablu rupt..."
                            rows={3}
                            autoFocus
                            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-400 bg-white text-sm text-slate-900 outline-none resize-none"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setDefectModal(null)} className="flex-1 h-11 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Anulează
                        </button>
                        <button onClick={confirmDefective} className="flex-1 h-11 rounded-2xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm">
                            Raportez Defect
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: Reject Reason ──────────────────────────────────── */}
            {rejectModal && (
                <Modal onClose={() => setRejectModal(null)}>
                    <div className="text-center">
                        <h3 className="text-lg font-black text-slate-800 mb-1">Motivul Refuzului</h3>
                        <p className="text-sm text-slate-500 mb-4">Opțional — descrie ce lipsea sau de ce refuzi.</p>
                    </div>
                    <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Ex: Lipseau 3 burghie..."
                        rows={3}
                        autoFocus
                        className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 bg-white text-sm text-slate-900 outline-none resize-none"
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setRejectModal(null)} className="flex-1 h-11 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Înapoi
                        </button>
                        <button
                            onClick={() => { handleConfirm(rejectModal.reqId, 'reject', rejectReason); setRejectModal(null) }}
                            className="flex-1 h-11 rounded-2xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                        >
                            Trimite Refuz
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: Consume ────────────────────────────────────────── */}
            {showConsumeForm && consumeItem && (
                <Modal onClose={() => setShowConsumeForm(false)}>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Raportează Consum</h3>
                    <p className="text-sm text-slate-500">{consumeItem.name}</p>
                    <form onSubmit={handleConsumeSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                Cantitate consumată ({consumeItem.unit})
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={consumeItem.quantity}
                                    value={consumeQty}
                                    onChange={e => setConsumeQty(e.target.value)}
                                    className="w-full pl-4 pr-12 h-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white text-lg font-bold text-slate-900 shadow-sm outline-none"
                                    placeholder="0.00"
                                    required
                                    autoFocus
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                                    {consumeItem.unit}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Disponibil: {consumeItem.quantity} {consumeItem.unit}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notițe (Opțional)</label>
                            <textarea
                                value={consumeNotes}
                                onChange={e => setConsumeNotes(e.target.value)}
                                placeholder="Detalii despre unde a fost folosit..."
                                rows={2}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white text-sm text-slate-900 shadow-sm outline-none resize-none"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowConsumeForm(false)}
                                className="flex-1 h-11 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                Anulează
                            </button>
                            <button type="submit" disabled={submitting || !consumeQty}
                                className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmă'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
