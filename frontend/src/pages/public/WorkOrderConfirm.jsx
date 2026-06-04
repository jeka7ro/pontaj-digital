import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardList, MapPin, Calendar, User, AlertCircle, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001/api'

export default function WorkOrderConfirm() {
    const { token } = useParams()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [confirmed, setConfirmed] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [checkedTerms, setCheckedTerms] = useState(false)
    const [confirmedByName, setConfirmedByName] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE}/public/work-orders/${token}`)
                if (!res.ok) {
                    const err = await res.json()
                    setError(err.detail || 'Eroare la încărcare.')
                    return
                }
                const data = await res.json()
                setOrder(data)
                if (data.client_name) setConfirmedByName(data.client_name)
                if (data.status === 'confirmed') setConfirmed(true)
            } catch {
                setError('Nu am putut accesa comanda. Verifică conexiunea la internet.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [token])

    const handleConfirm = async () => {
        if (!checkedTerms) return
        setConfirming(true)
        try {
            const res = await fetch(`${API_BASE}/public/work-orders/${token}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmed_by_name: confirmedByName }),
            })
            if (!res.ok) {
                const err = await res.json()
                setError(err.detail || 'Eroare la confirmare.')
                return
            }
            const data = await res.json()
            setOrder(data)
            setConfirmed(true)
        } catch {
            setError('Eroare la confirmare. Încearcă din nou.')
        } finally {
            setConfirming(false)
        }
    }

    const primaryColor = order?.org_primary_color || '#3b82f6'

    const formatDate = (d) => d
        ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
        : null

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Se încarcă comanda...</p>
            </div>
        </div>
    )

    if (error && !order) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-black text-slate-900 mb-2">Comandă negăsită</h1>
                <p className="text-slate-600">{error}</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Header branded */}
            <div className="w-full py-5 px-6 border-b border-slate-200 bg-white shadow-sm">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {order?.org_logo ? (
                            <img src={order.org_logo} alt={order.org_name} className="h-10 object-contain" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md"
                                style={{ backgroundColor: primaryColor }}>
                                {order?.org_name?.charAt(0) || 'C'}
                            </div>
                        )}
                        <div>
                            <p className="font-black text-slate-900 text-lg">{order?.org_name}</p>
                            <p className="text-xs text-slate-500 font-medium">Comandă de Lucru</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">Work Order</span>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
                {/* Already confirmed state */}
                {confirmed && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                        <h2 className="text-xl font-black text-emerald-800 mb-1">Comandă Confirmată!</h2>
                        {order?.confirmed_at && (
                            <p className="text-emerald-600 text-sm">
                                Confirmată de <strong>{order.confirmed_by_name}</strong> pe{' '}
                                {new Date(order.confirmed_at).toLocaleString('ro-RO')}
                            </p>
                        )}
                    </div>
                )}

                {/* Order Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Color top bar */}
                    <div className="h-2" style={{ backgroundColor: primaryColor }} />

                    {/* Title section */}
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 leading-tight mb-2">{order?.title}</h1>
                                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                    {order?.start_date && (
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-blue-500" />
                                            Start: <strong>{formatDate(order.start_date)}</strong>
                                        </span>
                                    )}
                                    {order?.deadline_date && (
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-red-500" />
                                            Deadline: <strong>{formatDate(order.deadline_date)}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {/* Client */}
                        {order?.client_name && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Beneficiar
                                </h3>
                                <p className="font-bold text-slate-900">{order.client_name}</p>
                                {order.client_email && <p className="text-sm text-slate-600 mt-0.5">✉️ {order.client_email}</p>}
                                {order.client_phone && <p className="text-sm text-slate-600 mt-0.5">📞 {order.client_phone}</p>}
                            </div>
                        )}

                        {/* Location */}
                        {(order?.site_name || order?.site_address) && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> Locație Lucrare
                                </h3>
                                {order.site_name && <p className="font-bold text-slate-900">{order.site_name}</p>}
                                {order.site_address && <p className="text-sm text-slate-600 mt-0.5">{order.site_address}</p>}
                            </div>
                        )}

                        {/* Requirements */}
                        {order?.requirements?.length > 0 && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Cerințe de Lucru</h3>
                                <div className="space-y-2">
                                    {order.requirements.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                                    style={{ borderColor: primaryColor }}>
                                                    <span className="text-[9px] font-black" style={{ color: primaryColor }}>{i + 1}</span>
                                                </div>
                                                <span className="text-sm font-semibold text-slate-800">{r.description}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0 ml-3">
                                                {r.category && <span className="px-2 py-0.5 bg-slate-100 rounded-full">{r.category}</span>}
                                                {r.qty && <span className="font-bold text-slate-700">{r.qty}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Volumes */}
                        {order?.volumes?.length > 0 && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Volume Estimate</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {order.volumes.map((v, i) => (
                                        <div key={i} className="p-3 bg-slate-50 rounded-xl">
                                            <p className="text-xs text-slate-500 mb-0.5">{v.label}</p>
                                            <p className="font-black text-slate-900 text-lg">
                                                {v.quantity} <span className="text-sm font-normal text-slate-600">{v.unit}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Materials */}
                        {order?.materials?.length > 0 && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Materiale</h3>
                                <div className="space-y-1.5">
                                    {order.materials.map((m, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                                            <span className="font-semibold text-slate-800">{m.name}</span>
                                            <span className="text-slate-600 font-medium">{m.quantity} {m.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {order?.notes && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">Observații</h3>
                                <p className="text-sm text-slate-700 bg-amber-50 rounded-xl p-3 border border-amber-100 leading-relaxed">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Confirmation section */}
                {!confirmed && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <h3 className="font-extrabold text-slate-900 text-lg">Confirmare Comandă</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Prin confirmarea comenzii, declar că am citit și am înțeles toate cerințele, volumele și condițiile specificate mai sus.
                        </p>

                        <div>
                            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">Confirmat de *</label>
                            <input
                                type="text"
                                value={confirmedByName}
                                onChange={e => setConfirmedByName(e.target.value)}
                                placeholder="Nume și prenume / Companie"
                                className="w-full px-4 h-11 text-sm rounded-full border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all shadow-sm font-medium"
                                style={{ '--tw-ring-color': primaryColor }}
                            />
                        </div>

                        <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${checkedTerms ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                            <div className="relative shrink-0 mt-0.5">
                                <input type="checkbox" className="sr-only" checked={checkedTerms} onChange={e => setCheckedTerms(e.target.checked)} />
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checkedTerms ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                                    {checkedTerms && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 leading-relaxed">
                                Am citit și sunt de acord cu toate cerințele, condițiile și termenele specificate în această comandă de lucru.
                            </span>
                        </label>

                        {error && (
                            <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
                        )}

                        <button
                            onClick={handleConfirm}
                            disabled={!checkedTerms || confirming}
                            className={`w-full h-12 rounded-full text-white font-black text-base shadow-lg transition-all ${
                                checkedTerms && !confirming
                                    ? 'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'
                                    : 'opacity-50 cursor-not-allowed'
                            }`}
                            style={{ backgroundColor: primaryColor }}
                        >
                            {confirming ? '⏳ Se confirmă...' : '✅ Confirm Comanda'}
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center pb-8">
                    <p className="text-xs text-slate-400">
                        Powered by <strong>Smart Timesheet</strong> by GetApp.ro
                    </p>
                </div>
            </div>
        </div>
    )
}
