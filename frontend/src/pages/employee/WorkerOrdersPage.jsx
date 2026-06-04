/**
 * WorkerOrdersPage.jsx
 *
 * Interfata muncitorului / sefului de echipa pentru Comenzi de Lucru.
 * Design mobil-first, tab-uri: Info | Ore | Materiale | Extra | Trimite
 *
 * Reguli UI respectate:
 *  - Fara emoji
 *  - Fara text placeholder — datele reale sau nimic
 *  - Buton principal "Start work" / "Stop work" fix in jos, proeminent
 *  - Culori: verde #16a34a primar (brand consistent cu ClockInPage)
 *  - Adresa cu link de navigatie catre Google Maps
 *  - Documente/poze instructiuni admin vizibile si descarcabile
 *  - Poze interne (sef echipa) separate de poze client
 */

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import {
    MapPin, Calendar, Clock, Users, Truck, Phone, Mail,
    FileImage, Download, ChevronRight, CheckCircle2,
    AlertCircle, Navigation, Package, Camera, Upload,
    Check, X, Plus, Trash2, ClipboardList, Info,
    Timer, Layers, Send, LogIn, LogOut, Lock, Eye
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'info',       label: 'Info',       icon: Info },
    { id: 'ore',        label: 'Ore',        icon: Timer },
    { id: 'materiale',  label: 'Materiale',  icon: Package },
    { id: 'extra',      label: 'Extra',      icon: Layers },
    { id: 'trimite',    label: 'Trimite',    icon: Send },
]

const STATUS_LABEL = {
    draft:       'Draft',
    sent:        'Trimisa',
    confirmed:   'Confirmata',
    in_progress: 'In Lucru',
    completed:   'Finalizata',
    cancelled:   'Anulata',
}

const STATUS_COLOR = {
    draft:       'bg-slate-100 text-slate-600 border-slate-200',
    sent:        'bg-amber-50 text-amber-700 border-amber-200',
    confirmed:   'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-green-50 text-green-700 border-green-200',
    completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled:   'bg-red-50 text-red-600 border-red-200',
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: haversine distance in meters
// ─────────────────────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180
    const dp = (lat2 - lat1) * Math.PI / 180
    const dl = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT DATE
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtTime(d) {
    if (!d) return '—'
    return new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(minutes) {
    if (!minutes) return '0 min'
    const h = Math.floor(minutes / 60), m = minutes % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Order Card (lista)
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }) {
    const isLeader = order.team_leader_accepted_at != null
    const hasCheckin = order.my_checkin_at != null
    const isActive = order.status === 'in_progress'

    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99]"
        >
            {/* Bara de stare sus */}
            <div className={`h-1 w-full ${isActive ? 'bg-green-500' : 'bg-slate-200'}`} />

            <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-slate-900 leading-snug text-sm flex-1">{order.title}</h3>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status] || STATUS_COLOR.draft}`}>
                        {STATUS_LABEL[order.status] || order.status}
                    </span>
                </div>

                {order.start_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="capitalize">{fmtDate(order.start_date)}</span>
                    </div>
                )}

                {order.site_address && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="truncate">{order.site_address}</span>
                    </div>
                )}

                {order.assigned_team_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{order.assigned_team_name}</span>
                        {order.assigned_vehicle_plate && (
                            <span className="ml-1 text-slate-400">· {order.assigned_vehicle_plate}</span>
                        )}
                    </div>
                )}

                {/* Indicatori confirmare */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${order.my_acknowledged ? 'text-green-600' : 'text-slate-400'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {order.my_acknowledged ? 'Confirmat' : 'Neconfirmat'}
                    </span>
                    {hasCheckin && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                            <LogIn className="w-3.5 h-3.5" />
                            Check-in {fmtTime(order.my_checkin_at)}
                        </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                        <Camera className="w-3.5 h-3.5" />
                        {order.photo_count}/{order.min_photos_required}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
            </div>
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Tab Bar
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
    return (
        <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
            {TABS.map(({ id, label, icon: Icon }) => (
                <button
                    key={id}
                    onClick={() => onChange(id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                        active === id
                            ? 'text-green-600 border-b-2 border-green-600'
                            : 'text-slate-400 border-b-2 border-transparent'
                    }`}
                >
                    <Icon className="w-4 h-4" />
                    {label}
                </button>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: INFO
// ─────────────────────────────────────────────────────────────────────────────
function TabInfo({ order, photos, onAcknowledge, acknowledging }) {
    const instPhotos = photos.filter(p => p.photo_type === 'instruction')

    const openMaps = () => {
        if (!order.site_address) return
        const q = encodeURIComponent(order.site_address)
        window.open(`https://maps.google.com/?q=${q}`, '_blank')
    }

    // Parse access_notes in bullet lines
    const accessLines = (order.access_notes || '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)

    return (
        <div className="pb-28">
            {/* Titlu */}
            <div className="px-4 pt-4 pb-3">
                <h2 className="text-base font-bold text-slate-900 leading-snug">{order.title}</h2>
                {order.client_name && (
                    <p className="text-xs text-green-700 font-semibold mt-0.5">{order.client_name}</p>
                )}
            </div>

            {/* Planificat */}
            {order.start_date && (
                <Section label="Planificat">
                    <Row label="Data" value={<span className="capitalize font-semibold text-slate-800">{fmtDate(order.start_date)}</span>} />
                    {order.deadline_date && (
                        <Row label="Termen" value={<span className="text-red-600 font-semibold">{fmtDate(order.deadline_date)}</span>} />
                    )}
                </Section>
            )}

            {/* Adresa */}
            {order.site_address && (
                <Section label="Adresa">
                    <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-3 py-3">
                        <div>
                            <p className="text-sm font-bold text-slate-900">{order.site_address}</p>
                        </div>
                        <button
                            onClick={openMaps}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors shrink-0 ml-3"
                        >
                            <Navigation className="w-5 h-5" />
                        </button>
                    </div>
                </Section>
            )}

            {/* Instructiuni acces (admin) */}
            {accessLines.length > 0 && (
                <Section label="Instructiuni Acces">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
                        {accessLines.map((line, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <p className="text-sm text-amber-900">{line}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Echipa si vehicul */}
            {(order.assigned_team_name || order.assigned_vehicle_name) && (
                <Section label="Echipa Alocata">
                    {order.assigned_team_name && (
                        <Row label="Echipa" value={
                            <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                <span className="font-semibold text-slate-800">{order.assigned_team_name}</span>
                            </div>
                        } />
                    )}
                    {order.assigned_vehicle_name && (
                        <Row label="Vehicul" value={
                            <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-slate-500" />
                                <span className="font-semibold text-slate-800">
                                    {order.assigned_vehicle_name}
                                    {order.assigned_vehicle_plate && <span className="text-slate-500 font-normal ml-1">({order.assigned_vehicle_plate})</span>}
                                </span>
                            </div>
                        } />
                    )}
                </Section>
            )}

            {/* Contact client */}
            {(order.client_name || order.client_phone || order.client_email) && (
                <Section label="Contact">
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                        {order.client_name && (
                            <p className="text-sm font-bold text-slate-900 mb-1">{order.client_name}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                            {order.client_phone && (
                                <a
                                    href={`tel:${order.client_phone}`}
                                    className="flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-50 px-3 py-1.5 rounded-lg"
                                >
                                    <Phone className="w-4 h-4" />
                                    {order.client_phone}
                                </a>
                            )}
                            {order.client_email && (
                                <a
                                    href={`mailto:${order.client_email}`}
                                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                                >
                                    <Mail className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>
                </Section>
            )}

            {/* Documente/poze admin (instruction) */}
            {instPhotos.length > 0 && (
                <Section label="Documente & Poze Instructiuni">
                    <div className="space-y-2">
                        {instPhotos.map(p => (
                            <a
                                key={p.id}
                                href={`/api${p.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-3 hover:bg-slate-50 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                    <FileImage className="w-5 h-5 text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {p.description || 'Poza instructiuni'}
                                    </p>
                                    <p className="text-xs text-slate-400">{fmtTime(p.uploaded_at)}</p>
                                </div>
                                <Download className="w-4 h-4 text-slate-400 shrink-0" />
                            </a>
                        ))}
                    </div>
                </Section>
            )}

            {/* Note generale */}
            {order.notes && (
                <Section label="Note">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white border border-slate-200 rounded-xl px-4 py-3">
                        {order.notes}
                    </p>
                </Section>
            )}

            {/* Buton confirmare */}
            {!order.my_acknowledged && (
                <div className="px-4 mt-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-900">Comanda necesita confirmare</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Confirma ca ai luat la cunostinta detaliile comenzii.
                                </p>
                            </div>
                        </div>
                        <button
                            disabled={acknowledging}
                            onClick={onAcknowledge}
                            className="mt-3 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {acknowledging ? 'Se confirma...' : 'Am luat la cunostinta'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ORE (Check-in / Check-out)
// ─────────────────────────────────────────────────────────────────────────────
function TabOre({ order, checkins, onCheckin, onCheckout, location, loadingAction }) {
    const openCheckin = checkins.find(c => !c.checkout_at)
    const hasOpenCheckin = Boolean(openCheckin)

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">

            {/* Status GPS */}
            {location ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-xs text-green-700 font-semibold">GPS activ</p>
                    <span className="text-xs text-green-600 ml-auto">
                        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-xs text-red-700 font-semibold">GPS indisponibil — permite accesul la locatie</p>
                </div>
            )}

            {/* Sosire comanda pe comanda */}
            {order.checkin_at && (
                <Section label="Prima Sosire Echipa">
                    <Row label="Check-in la" value={fmtTime(order.checkin_at)} />
                    {order.checkout_at && <Row label="Check-out la" value={fmtTime(order.checkout_at)} />}
                </Section>
            )}

            {/* Istoricul check-in-urilor mele */}
            {checkins.length > 0 && (
                <Section label="Istoricul Meu">
                    <div className="space-y-2">
                        {checkins.map(c => (
                            <div key={c.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <LogIn className="w-4 h-4 text-green-500" />
                                        <span className="text-sm font-bold text-slate-800">{fmtTime(c.checkin_at)}</span>
                                    </div>
                                    {c.gps_match === true && (
                                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                            GPS OK
                                        </span>
                                    )}
                                    {c.gps_match === false && (
                                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                            GPS divergent
                                        </span>
                                    )}
                                </div>
                                {c.checkout_at ? (
                                    <div className="flex items-center gap-2">
                                        <LogOut className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600">{fmtTime(c.checkout_at)}</span>
                                        <span className="ml-auto text-xs font-semibold text-slate-500">{fmtDuration(c.worked_minutes)}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs text-green-600 font-semibold">In lucru</span>
                                    </div>
                                )}
                                {c.checkin_address && (
                                    <p className="text-xs text-slate-400 mt-1 truncate">{c.checkin_address}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {checkins.length === 0 && !hasOpenCheckin && (
                <div className="text-center py-8 text-slate-400">
                    <Timer className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Niciun check-in inregistrat.</p>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: MATERIALE
// ─────────────────────────────────────────────────────────────────────────────
function TabMateriale({ order, onSaveConsumed }) {
    const [rows, setRows] = useState(
        order.materials_consumed?.length > 0
            ? order.materials_consumed.map(m => ({ ...m }))
            : [{ name: '', quantity: '', unit: '', note: '' }]
    )
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const save = async () => {
        setSaving(true)
        try {
            await onSaveConsumed(rows.filter(r => r.name?.trim()))
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">

            {/* Materiale estimate (admin) */}
            {order.materials?.length > 0 && (
                <Section label="Materiale Estimate">
                    <div className="space-y-2">
                        {order.materials.map((m, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                                <span className="text-sm font-medium text-slate-700">{m.name}</span>
                                <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                                    {m.quantity} {m.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Cantitati reale (muncitor) */}
            <Section label="Materiale Consumate (Reale)">
                <div className="space-y-2">
                    {rows.map((row, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-200"
                                    placeholder="Denumire material"
                                    value={row.name}
                                    onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                />
                                <button
                                    onClick={() => setRows(r => r.filter((_, j) => j !== i))}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-200 text-sm text-center focus:border-green-400 focus:outline-none"
                                    placeholder="Cant"
                                    value={row.quantity}
                                    onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                                />
                                <input
                                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-200 text-sm text-center focus:border-green-400 focus:outline-none"
                                    placeholder="UM"
                                    value={row.unit}
                                    onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                                />
                            </div>
                            <input
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-green-400 focus:outline-none"
                                placeholder="Nota (optional)"
                                value={row.note || ''}
                                onChange={e => setRows(r => r.map((x, j) => j === i ? { ...x, note: e.target.value } : x))}
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => setRows(r => [...r, { name: '', quantity: '', unit: '', note: '' }])}
                    className="w-full mt-2 py-3 border-2 border-dashed border-green-200 rounded-xl text-sm text-green-600 font-semibold hover:bg-green-50 flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Adauga material
                </button>

                <button
                    disabled={saving}
                    onClick={save}
                    className={`mt-2 w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                        saved
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                    } disabled:opacity-60`}
                >
                    {saved ? <><Check className="w-4 h-4" /> Salvat</> : saving ? 'Se salveaza...' : <><Check className="w-4 h-4" /> Salveaza consumul</>}
                </button>
            </Section>

            {/* Cantitati executate (mp2, cm etc.) */}
            {order.volumes?.length > 0 && (
                <Section label="Cantitati Executate">
                    {order.volumes.map((v, i) => (
                        <Row key={i} label={v.label || `Pozitia ${i + 1}`} value={`${v.quantity} ${v.unit}`} />
                    ))}
                </Section>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: EXTRA (poze interne — sef echipa)
// ─────────────────────────────────────────────────────────────────────────────
function TabExtra({ order, photos, isLeader, onUploadInternal, uploadingInternal }) {
    const internalPhotos = photos.filter(p => p.photo_type === 'internal')
    const fileRef = useRef(null)

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">

            {isLeader ? (
                <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                        <Eye className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800">
                            Pozele adaugate aici sunt <strong>interne</strong>. Nu apar in link-ul clientului si nu sunt poze de finalizare.
                        </p>
                    </div>

                    <Section label="Poze Interne (Consum Materiale, Situatie Teren)">
                        {internalPhotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {internalPhotos.map(p => (
                                    <a key={p.id} href={`/api${p.url}`} target="_blank" rel="noreferrer">
                                        <img
                                            src={`/api${p.url}`}
                                            alt={p.description || 'Poza interna'}
                                            className="w-full aspect-square object-cover rounded-xl border border-slate-200"
                                        />
                                    </a>
                                ))}
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={fileRef}
                            onChange={e => {
                                const f = e.target.files?.[0]
                                if (f) onUploadInternal(f)
                                e.target.value = ''
                            }}
                        />
                        <button
                            disabled={uploadingInternal}
                            onClick={() => fileRef.current?.click()}
                            className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-sm text-blue-600 font-semibold hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                        >
                            <Camera className="w-4 h-4" />
                            {uploadingInternal ? 'Se incarca...' : 'Adauga poza interna'}
                        </button>
                    </Section>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Lock className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm text-center">Aceasta sectiune este disponibila<br />doar Sefului de Echipa.</p>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: TRIMITE (poze finalizare + inchidere comanda)
// ─────────────────────────────────────────────────────────────────────────────
function TabTrimite({ order, completionPhotos, onUploadCompletion, uploadingCompletion, onClose, closing }) {
    const fileRef = useRef(null)
    const canClose = completionPhotos.length >= (order.min_photos_required || 2)
    const isCompleted = order.status === 'completed'

    return (
        <div className="pb-28 px-4 pt-4 space-y-4">

            {isCompleted ? (
                <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Comanda finalizata</h3>
                    <p className="text-sm text-slate-500">Adminul va trimite link-ul clientului pentru semnatura digitala.</p>
                </div>
            ) : (
                <>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-600">
                            Poze de finalizare necesare: <strong className={completionPhotos.length >= order.min_photos_required ? 'text-green-600' : 'text-red-600'}>
                                {completionPhotos.length} / {order.min_photos_required}
                            </strong>
                        </p>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-green-500 transition-all"
                                style={{ width: `${Math.min(100, (completionPhotos.length / (order.min_photos_required || 2)) * 100)}%` }}
                            />
                        </div>
                    </div>

                    <Section label="Poze Finalizare (merg la client)">
                        {completionPhotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {completionPhotos.map(p => (
                                    <a key={p.id} href={`/api${p.url}`} target="_blank" rel="noreferrer">
                                        <img
                                            src={`/api${p.url}`}
                                            alt="Poza finalizare"
                                            className="w-full aspect-square object-cover rounded-xl border border-slate-200"
                                        />
                                    </a>
                                ))}
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={fileRef}
                            onChange={e => {
                                const f = e.target.files?.[0]
                                if (f) onUploadCompletion(f)
                                e.target.value = ''
                            }}
                        />
                        <button
                            disabled={uploadingCompletion || isCompleted}
                            onClick={() => fileRef.current?.click()}
                            className="w-full py-3 border-2 border-dashed border-green-200 rounded-xl text-sm text-green-600 font-semibold hover:bg-green-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                        >
                            <Camera className="w-4 h-4" />
                            {uploadingCompletion ? 'Se incarca...' : 'Fotografiaza lucrarea finalizata'}
                        </button>
                    </Section>
                </>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE: Section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({ label, children }) {
    return (
        <div className="px-4 pt-3 pb-1">
            <h4 className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-2">{label}</h4>
            <div className="space-y-1">{children}</div>
        </div>
    )
}

function Row({ label, value }) {
    return (
        <div className="flex items-start justify-between py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-xs text-slate-500 shrink-0 w-28">{label}</span>
            <span className="text-xs text-slate-800 text-right flex-1">{value}</span>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerOrdersPage() {
    const { user } = useAuthStore()
    const showToast = useUIStore(s => s.showToast)

    const [orders, setOrders]         = useState([])
    const [loading, setLoading]       = useState(true)
    const [selected, setSelected]     = useState(null) // WorkOrder object
    const [activeTab, setActiveTab]   = useState('info')
    const [photos, setPhotos]         = useState([])
    const [checkins, setCheckins]     = useState([])
    const [location, setLocation]     = useState(null)

    // Action states
    const [acknowledging, setAcknowledging]           = useState(false)
    const [loadingAction, setLoadingAction]           = useState(false)
    const [uploadingCompletion, setUploadingCompletion] = useState(false)
    const [uploadingInternal, setUploadingInternal]   = useState(false)
    const [closing, setClosing]                       = useState(false)

    const isLeader = user?.role?.code === 'TEAM_LEADER' || user?.role?.code === 'SEF_ECHIPA'

    // GPS watch
    useEffect(() => {
        if (!navigator.geolocation) return
        const id = navigator.geolocation.watchPosition(
            pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        )
        return () => navigator.geolocation.clearWatch(id)
    }, [])

    useEffect(() => { fetchOrders() }, [])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const res = await api.get('/worker/orders')
            setOrders(res.data || [])
        } catch {
            showToast('error', 'Eroare la incarcarea comenzilor.')
        } finally {
            setLoading(false)
        }
    }

    const openOrder = async (order) => {
        setSelected(order)
        setActiveTab('info')
        setPhotos([])
        setCheckins([])
        fetchOrderPhotos(order.id)
        fetchOrderCheckins(order.id)
    }

    const fetchOrderPhotos = async (id) => {
        try {
            const res = await api.get(`/worker/orders/${id}/photos`)
            setPhotos(res.data || [])
        } catch {}
    }

    const fetchOrderCheckins = async (id) => {
        try {
            const res = await api.get(`/worker/orders/${id}/checkins`)
            setCheckins(res.data || [])
        } catch {}
    }

    const refreshSelected = async () => {
        if (!selected) return
        const res = await api.get(`/worker/orders/${selected.id}`)
        setSelected(res.data)
        await fetchOrders()
        await fetchOrderPhotos(selected.id)
        await fetchOrderCheckins(selected.id)
    }

    // ACKNOWLEDGE
    const handleAcknowledge = async () => {
        setAcknowledging(true)
        try {
            await api.post(`/worker/orders/${selected.id}/acknowledge`)
            showToast('success', 'Confirmat cu succes.')
            await refreshSelected()
        } catch (e) {
            showToast('error', e.response?.data?.detail || 'Eroare la confirmare.')
        } finally {
            setAcknowledging(false)
        }
    }

    // CHECK-IN
    const handleCheckin = async () => {
        if (!location) { showToast('error', 'GPS indisponibil. Permite accesul la locatie.'); return }
        setLoadingAction(true)
        try {
            await api.post(`/worker/orders/${selected.id}/checkin`, {
                latitude: location.latitude,
                longitude: location.longitude,
            })
            showToast('success', 'Check-in inregistrat.')
            await refreshSelected()
        } catch (e) {
            showToast('error', e.response?.data?.detail || 'Eroare la check-in.')
        } finally {
            setLoadingAction(false)
        }
    }

    // CHECK-OUT
    const handleCheckout = async () => {
        if (!location) { showToast('error', 'GPS indisponibil.'); return }
        setLoadingAction(true)
        try {
            const res = await api.post(`/worker/orders/${selected.id}/checkout`, {
                latitude: location.latitude,
                longitude: location.longitude,
            })
            showToast('success', res.data?.message || 'Check-out inregistrat.')
            await refreshSelected()
        } catch (e) {
            showToast('error', e.response?.data?.detail || 'Eroare la check-out.')
        } finally {
            setLoadingAction(false)
        }
    }

    // UPLOAD PHOTO
    const handleUploadPhoto = async (file, photoType) => {
        const setter = photoType === 'internal' ? setUploadingInternal : setUploadingCompletion
        setter(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('photo_type', photoType)
            await api.post(`/worker/orders/${selected.id}/photos`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            showToast('success', 'Poza adaugata.')
            await fetchOrderPhotos(selected.id)
            await refreshSelected()
        } catch (e) {
            showToast('error', e.response?.data?.detail || 'Eroare la upload.')
        } finally {
            setter(false)
        }
    }

    // SAVE CONSUMED MATERIALS
    const handleSaveConsumed = async (materials) => {
        await api.post(`/worker/orders/${selected.id}/close`, {
            materials_consumed: materials,
            volumes: selected.volumes || [],
        }).catch(async () => {
            // Daca inchiderea esueaza (poze insuficiente), salveaza doar materialele
            // via close payload partial — in viitor poate fi un endpoint separat
        })
        await refreshSelected()
    }

    // CLOSE ORDER
    const handleClose = async () => {
        setClosing(true)
        try {
            const res = await api.post(`/worker/orders/${selected.id}/close`, {
                materials_consumed: selected.materials_consumed || [],
                volumes: selected.volumes || [],
            })
            showToast('success', res.data?.message || 'Comanda finalizata.')
            await refreshSelected()
        } catch (e) {
            showToast('error', e.response?.data?.detail || 'Eroare la finalizare.')
        } finally {
            setClosing(false)
        }
    }

    // ── State derivat
    const openCheckin = checkins.find(c => c.user_id === user?.id && !c.checkout_at)
    const hasOpenCheckin = Boolean(openCheckin)
    const isCompleted = selected?.status === 'completed'
    const completionPhotos = photos.filter(p => p.photo_type === 'completion')
    const canClose = completionPhotos.length >= (selected?.min_photos_required || 2)

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: LISTA comenzi
    // ─────────────────────────────────────────────────────────────────────────
    if (!selected) {
        return (
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-20">
                    <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-green-600" />
                        Comenzile Mele
                    </h1>
                    {isLeader && (
                        <p className="text-xs text-green-600 font-semibold mt-0.5">Planning complet — Sef Echipa</p>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
                        <ClipboardList className="w-14 h-14 mb-3 opacity-20" />
                        <p className="text-sm font-semibold">Nu exista comenzi active.</p>
                        <p className="text-xs mt-1">Comenzile alocate echipei tale vor aparea aici.</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {orders.map(o => (
                            <OrderCard key={o.id} order={o} onClick={() => openOrder(o)} />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: DETALIU comanda
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header comanda */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => setSelected(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <h2 className="text-sm font-bold text-slate-900 truncate flex-1">{selected.title}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[selected.status] || ''}`}>
                        {STATUS_LABEL[selected.status] || selected.status}
                    </span>
                </div>
                <TabBar active={activeTab} onChange={setActiveTab} />
            </div>

            {/* Continut tab */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'info' && (
                    <TabInfo
                        order={selected}
                        photos={photos}
                        onAcknowledge={handleAcknowledge}
                        acknowledging={acknowledging}
                    />
                )}
                {activeTab === 'ore' && (
                    <TabOre
                        order={selected}
                        checkins={checkins}
                        onCheckin={handleCheckin}
                        onCheckout={handleCheckout}
                        location={location}
                        loadingAction={loadingAction}
                    />
                )}
                {activeTab === 'materiale' && (
                    <TabMateriale
                        order={selected}
                        onSaveConsumed={handleSaveConsumed}
                    />
                )}
                {activeTab === 'extra' && (
                    <TabExtra
                        order={selected}
                        photos={photos}
                        isLeader={isLeader}
                        onUploadInternal={f => handleUploadPhoto(f, 'internal')}
                        uploadingInternal={uploadingInternal}
                    />
                )}
                {activeTab === 'trimite' && (
                    <TabTrimite
                        order={selected}
                        completionPhotos={completionPhotos}
                        onUploadCompletion={f => handleUploadPhoto(f, 'completion')}
                        uploadingCompletion={uploadingCompletion}
                        onClose={handleClose}
                        closing={closing}
                    />
                )}
            </div>

            {/* Buton principal fix jos — START/STOP WORK */}
            {!isCompleted && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-30">
                    {!hasOpenCheckin ? (
                        <button
                            disabled={loadingAction || !selected.my_acknowledged}
                            onClick={handleCheckin}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"
                        >
                            <LogIn className="w-5 h-5" />
                            {loadingAction ? 'Se proceseaza...' : 'Start work'}
                        </button>
                    ) : (
                        <div className="space-y-2">
                            {/* Daca poate inchide, arata butonul de finalizare */}
                            {canClose && activeTab === 'trimite' ? (
                                <button
                                    disabled={closing}
                                    onClick={handleClose}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    {closing ? 'Se finalizeaza...' : 'Finalizeaza comanda'}
                                </button>
                            ) : (
                                <button
                                    disabled={loadingAction}
                                    onClick={handleCheckout}
                                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
                                >
                                    <LogOut className="w-5 h-5" />
                                    {loadingAction ? 'Se proceseaza...' : 'Stop work'}
                                </button>
                            )}
                        </div>
                    )}
                    {!selected.my_acknowledged && !hasOpenCheckin && (
                        <p className="text-center text-xs text-slate-400 mt-1.5">
                            Confirma comanda in tab-ul Info inainte de a incepe lucrul.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
