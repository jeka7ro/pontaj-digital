import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { ChevronLeft, Truck, CheckCircle, Loader2, AlertTriangle, Droplet } from 'lucide-react'

// Generic Modal Shell
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

export default function EmployeeFleet() {
    const navigate = useNavigate()
    const [fleet, setFleet] = useState([])
    const [loading, setLoading] = useState(true)
    const [successMsg, setSuccessMsg] = useState('')

    // Modals
    const [logModal, setLogModal] = useState(null) // { vehicle }
    const [isUsed, setIsUsed] = useState(false)
    const [refueled, setRefueled] = useState(false)
    const [liters, setLiters] = useState('')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const fetchFleet = async () => {
        setLoading(true)
        try {
            const res = await api.get('/user/fleet')
            setFleet(res.data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFleet()
    }, [])

    const flash = (msg) => { 
        setSuccessMsg(msg); 
        setTimeout(() => setSuccessMsg(''), 5000) 
    }

    const handleLogSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            await api.post('/user/fleet/equipment-logs', {
                vehicle_id: logModal.id,
                is_used: isUsed,
                refueled: refueled,
                refuel_liters: refueled ? parseFloat(liters) : null,
                notes: notes
            })
            flash(`Jurnal adăugat cu succes pentru ${logModal.name}`)
            setLogModal(null)
            fetchFleet()
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const openLogModal = (vehicle) => {
        setLogModal(vehicle)
        setIsUsed(false)
        setRefueled(false)
        setLiters('')
        setNotes('')
    }

    return (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg sticky top-0 z-10">
                <div className="flex items-center gap-3 max-w-md mx-auto">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-white/80" />
                        <h1 className="font-bold text-lg">Parc Auto / Utilaje</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {successMsg && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 text-sm font-medium shadow-sm">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                        {successMsg}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : fleet.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Truck className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Niciun utilaj</h3>
                        <p className="text-sm text-slate-500">Nu există mașini sau utilaje active înregistrate.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-slate-500" />
                                <h3 className="font-bold text-slate-800">Toate Utilajele</h3>
                                <span className="ml-auto bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{fleet.length}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {fleet.map(vehicle => (
                                    <div key={vehicle.id} className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-bold text-slate-800">{vehicle.name}</p>
                                                <p className="text-xs font-mono text-slate-500 mt-0.5 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                                                    {vehicle.plate_number || vehicle.chassis_number || vehicle.type}
                                                </p>
                                            </div>
                                            {vehicle.status === 'in_use' ? (
                                                <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-1 rounded-full">În Teren</span>
                                            ) : vehicle.status === 'maintenance' ? (
                                                <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-1 rounded-full">În Service</span>
                                            ) : (
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-full">Disponibil</span>
                                            )}
                                        </div>
                                        
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => openLogModal(vehicle)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-[0.97]"
                                            >
                                                <Droplet className="w-3.5 h-3.5" />
                                                Adaugă Log / Alimentare
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: Add Log */}
            {logModal && (
                <Modal onClose={() => setLogModal(null)}>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Activitate Utilaj</h3>
                    <p className="text-sm text-slate-500">{logModal.name}</p>
                    
                    <form onSubmit={handleLogSubmit} className="space-y-4 mt-4">
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                                type="checkbox"
                                checked={isUsed}
                                onChange={e => setIsUsed(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">A fost utilizat azi?</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 rounded-xl border border-orange-200 bg-orange-50/50 cursor-pointer hover:bg-orange-50 transition-colors">
                            <input
                                type="checkbox"
                                checked={refueled}
                                onChange={e => setRefueled(e.target.checked)}
                                className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-orange-900">A fost alimentat?</span>
                            </div>
                        </label>

                        {refueled && (
                            <div className="pl-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cantitate (Litri)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={liters}
                                    onChange={e => setLiters(e.target.value)}
                                    className="w-full px-4 h-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 bg-white text-lg font-bold text-slate-900 outline-none"
                                    placeholder="0.00"
                                    required={refueled}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notițe (Opțional)</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Observații, defecte constatate..."
                                rows={2}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white text-sm text-slate-900 outline-none resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setLogModal(null)}
                                className="flex-1 h-11 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                Anulează
                            </button>
                            <button type="submit" disabled={submitting || (refueled && !liters)}
                                className="flex-1 h-11 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvează'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
