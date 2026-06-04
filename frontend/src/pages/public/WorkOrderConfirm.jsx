import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardList, MapPin, Calendar, User, AlertCircle, Loader2, Pen, RotateCcw } from 'lucide-react'
import api from '../../lib/api'

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ onChange, disabled }) {
    const canvasRef = useRef(null)
    const drawing = useRef(false)
    const hasDrawn = useRef(false)
    const [isEmpty, setIsEmpty] = useState(true)

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        if (e.touches) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            }
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        }
    }

    const startDraw = useCallback((e) => {
        if (disabled) return
        e.preventDefault()
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const pos = getPos(e, canvas)
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        drawing.current = true
    }, [disabled])

    const draw = useCallback((e) => {
        if (!drawing.current || disabled) return
        e.preventDefault()
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const pos = getPos(e, canvas)
        ctx.lineTo(pos.x, pos.y)
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        hasDrawn.current = true
        setIsEmpty(false)
    }, [disabled])

    const stopDraw = useCallback(() => {
        if (!drawing.current) return
        drawing.current = false
        if (hasDrawn.current && onChange) {
            onChange(canvasRef.current.toDataURL('image/png'))
        }
    }, [onChange])

    const clear = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        hasDrawn.current = false
        setIsEmpty(true)
        if (onChange) onChange(null)
    }

    useEffect(() => {
        const canvas = canvasRef.current
        canvas.addEventListener('touchstart', startDraw, { passive: false })
        canvas.addEventListener('touchmove', draw, { passive: false })
        canvas.addEventListener('touchend', stopDraw)
        return () => {
            canvas.removeEventListener('touchstart', startDraw)
            canvas.removeEventListener('touchmove', draw)
            canvas.removeEventListener('touchend', stopDraw)
        }
    }, [startDraw, draw, stopDraw])

    return (
        <div className="space-y-2">
            <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden hover:border-slate-400 transition-colors">
                <canvas
                    ref={canvasRef}
                    width={700}
                    height={200}
                    className="w-full touch-none cursor-crosshair block"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                />
                {isEmpty && !disabled && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                        <Pen className="w-6 h-6 text-slate-300 mb-1.5" />
                        <p className="text-sm text-slate-400 font-medium">Semnați aici cu mouse-ul sau degetul</p>
                    </div>
                )}
            </div>
            {!disabled && (
                <button type="button" onClick={clear}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors font-bold">
                    <RotateCcw className="w-3.5 h-3.5" /> Șterge semnătura
                </button>
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkOrderConfirm() {
    const { token } = useParams()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [confirmed, setConfirmed] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [checkedTerms, setCheckedTerms] = useState(false)
    const [confirmedByName, setConfirmedByName] = useState('')
    const [signature, setSignature] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get(`/public/work-orders/${token}`)
                const data = res.data
                setOrder(data)
                if (data.client_name) setConfirmedByName(data.client_name)
                if (data.status === 'confirmed') setConfirmed(true)
            } catch (err) {
                setError(err.response?.data?.detail || 'Nu am putut accesa comanda. Verificați conexiunea la internet.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [token])

    const handleConfirm = async () => {
        if (!checkedTerms || !signature) return
        setConfirming(true)
        try {
            const res = await api.post(`/public/work-orders/${token}/confirm`, {
                confirmed_by_name: confirmedByName,
                client_signature: signature
            })
            setOrder(res.data)
            setConfirmed(true)
        } catch (err) {
            setError(err.response?.data?.detail || 'Eroare la confirmare. Încearcă din nou.')
        } finally {
            setConfirming(false)
        }
    }

    const primaryColor = order?.org_primary_color || '#3b82f6'
    const canConfirm = checkedTerms && !!signature && !confirming

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
                {/* Confirmed banner */}
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
                        {order?.client_signature && (
                            <div className="mt-4 pt-4 border-t border-emerald-200">
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Semnătură înregistrată</p>
                                <img src={order.client_signature} alt="Semnătură" className="max-h-20 mx-auto opacity-80" />
                            </div>
                        )}
                    </div>
                )}

                {/* Order Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="h-2" style={{ backgroundColor: primaryColor }} />
                    <div className="p-6 border-b border-slate-100">
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
                    <div className="divide-y divide-slate-100">
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
                        {(order?.site_name || order?.site_address) && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> Locație Lucrare
                                </h3>
                                {order.site_name && <p className="font-bold text-slate-900">{order.site_name}</p>}
                                {order.site_address && <p className="text-sm text-slate-600 mt-0.5">{order.site_address}</p>}
                            </div>
                        )}
                        {order?.requirements?.filter(r => r.description)?.length > 0 && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Cerințe de Lucru</h3>
                                <div className="space-y-2">
                                    {order.requirements.filter(r => r.description).map((r, i) => (
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
                        {order?.volumes?.filter(v => v.label)?.length > 0 && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Volume Estimate</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {order.volumes.filter(v => v.label).map((v, i) => (
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
                        {order?.materials?.filter(m => m.name)?.length > 0 && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Materiale</h3>
                                <div className="space-y-1.5">
                                    {order.materials.filter(m => m.name).map((m, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                                            <span className="font-semibold text-slate-800">{m.name}</span>
                                            <span className="text-slate-600 font-medium">{m.quantity} {m.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {order?.notes && (
                            <div className="px-6 py-4">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">Observații</h3>
                                <p className="text-sm text-slate-700 bg-amber-50 rounded-xl p-3 border border-amber-100 leading-relaxed">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Signature + Confirm section */}
                {!confirmed && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                        <div>
                            <h3 className="font-extrabold text-slate-900 text-lg mb-1">Confirmare Comandă</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Completați datele, aplicați semnătura digitală și confirmați.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Confirmat de *
                            </label>
                            <input
                                type="text"
                                value={confirmedByName}
                                onChange={e => setConfirmedByName(e.target.value)}
                                placeholder="Nume și prenume / Companie"
                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white outline-none transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <Pen className="w-3.5 h-3.5" /> Semnătură Digitală *
                            </label>
                            <SignaturePad onChange={setSignature} />
                            {!signature && (
                                <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Semnătura este obligatorie
                                </p>
                            )}
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
                            disabled={!canConfirm}
                            className={`w-full h-12 rounded-full text-white font-black text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
                                canConfirm ? 'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]' : 'opacity-40 cursor-not-allowed'
                            }`}
                            style={{ backgroundColor: primaryColor }}
                        >
                            {confirming
                                ? <><Loader2 className="w-5 h-5 animate-spin" /> Se confirmă...</>
                                : <><CheckCircle2 className="w-5 h-5" /> Confirm și Semnez Comanda</>
                            }
                        </button>
                    </div>
                )}

                <div className="text-center pb-8">
                    <p className="text-xs text-slate-400">Powered by <strong>Smart Timesheet</strong></p>
                </div>
            </div>
        </div>
    )
}
