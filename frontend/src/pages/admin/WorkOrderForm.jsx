import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ChevronLeft, Plus, Trash2, ClipboardList, Check,
    User, MapPin, Calendar, FileText, Loader2,
    Users, Truck, Image, X, Clock, Save, Send
} from 'lucide-react'
import api from '../../lib/api'
import MiniMapSelector from '../../components/MiniMapSelector'
import SearchableSelect from '../../components/SearchableSelect'

const VOLUME_UNITS = ['m²', 'm³', 'm liniar', 'buc', 'ore', 'kg', 'tone', 'saci', 'pal', 'set']

const EMPTY_FORM = {
    title: '',
    // Client
    client_mode: 'existing',
    client_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    // Locatie
    site_mode: 'existing',
    site_id: '',
    site_address: '',
    site_latitude: '',
    site_longitude: '',
    site_geofence_radius: 100,
    // Planificare
    start_date: '',
    start_time: '07:00',
    deadline_date: '',
    // Cantitati
    volumes: [{ label: '', quantity: '', unit: 'm²' }],
    // Materiale
    materials: [{ name: '', quantity: '', unit: '' }],
    // Echipa + vehicul
    assigned_team_id: '',
    assigned_vehicle_id: '',
    // Acces
    access_notes: '',
}

function Section({ icon: Icon, title, children, zIndex }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" style={{ zIndex, position: zIndex ? 'relative' : 'static' }}>
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
            </div>
            <div className="p-3 space-y-3">{children}</div>
        </div>
    )
}

function Field({ label, required, children }) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    )
}

const INPUT = "w-full px-3 h-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
const SELECT = "w-full px-3 h-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"

export default function WorkOrderForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)
    const fileRef = useRef()

    const [form, setForm] = useState(EMPTY_FORM)
    const [clients, setClients] = useState([])
    const [sites, setSites] = useState([])
    const [teams, setTeams] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [activities, setActivities] = useState([])
    const [warehouseItems, setWarehouseItems] = useState([])
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [error, setError] = useState(null)
    const [instructionPhotos, setInstructionPhotos] = useState([]) // { file, preview }
    const [savedId, setSavedId] = useState(null)

    const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

    useEffect(() => {
        const load = async () => {
            try {
                const [cRes, sRes, tRes, vRes, aRes, wRes] = await Promise.all([
                    api.get('/admin/clients'),
                    api.get('/admin/sites'),
                    api.get('/admin/teams/'),
                    api.get('/admin/vehicles').catch(() => ({ data: [] })),
                    api.get('/activities/?is_active=true').catch(() => ({ data: [] })),
                    api.get('/warehouse/items').catch(() => ({ data: [] }))
                ])
                setClients(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || []))
                const sd = sRes.data
                setSites(Array.isArray(sd) ? sd : (sd?.items || sd?.sites || []))
                setTeams(tRes.data?.teams || tRes.data || [])
                setVehicles(Array.isArray(vRes.data) ? vRes.data : (vRes.data?.items || []))
                
                const acts = aRes.data?.activities || (Array.isArray(aRes.data) ? aRes.data.flatMap(c => c.activities || []) : [])
                setActivities(acts)
                
                setWarehouseItems(Array.isArray(wRes.data) ? wRes.data : (wRes.data?.items || []))

                if (!isEdit && acts.length === 1) {
                    setForm(prev => ({
                        ...prev,
                        volumes: [{ label: acts[0].name, quantity: '', unit: 'm²' }]
                    }))
                }
            } catch {}

            if (isEdit) {
                try {
                    const res = await api.get(`/admin/work-orders/${id}`)
                    const wo = res.data
                    setForm(prev => ({
                        ...prev,
                        title: wo.title || '',
                        access_notes: wo.access_notes || '',
                        start_date: wo.start_date || '',
                        start_time: wo.start_time || '07:00',
                        deadline_date: wo.deadline_date || '',
                        client_mode: wo.client_id ? 'existing' : 'new',
                        client_id: wo.client_id || '',
                        client_name: wo.client_name || '',
                        client_email: wo.client_email || '',
                        client_phone: wo.client_phone || '',
                        site_mode: wo.site_id ? 'existing' : 'new',
                        site_id: wo.site_id || '',
                        site_address: wo.site_address || '',
                        site_latitude: wo.site_latitude || '',
                        site_longitude: wo.site_longitude || '',
                        site_geofence_radius: wo.site_geofence_radius || 100,
                        assigned_team_id: wo.assigned_team_id || '',
                        assigned_vehicle_id: wo.assigned_vehicle_id || '',
                        volumes: wo.volumes?.length ? wo.volumes : [{ label: '', quantity: '', unit: 'm²' }],
                        materials: wo.materials?.length ? wo.materials : [{ name: '', quantity: '', unit: '' }],
                    }))
                    setSavedId(wo.id)
                } catch {}
            }
        }
        load()
    }, [id])

    const addRow = (field, empty) => setForm(p => ({ ...p, [field]: [...p[field], empty] }))
    const removeRow = (field, idx) => setForm(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }))
    const updateRow = (field, idx, key, val) => setForm(p => ({
        ...p,
        [field]: p[field].map((row, i) => i === idx ? { ...row, [key]: val } : row)
    }))

    const handleDetectGPS = () => {
        setDetecting(true)
        navigator.geolocation?.getCurrentPosition(
            async pos => {
                const lat = pos.coords.latitude.toFixed(6)
                const lon = pos.coords.longitude.toFixed(6)
                setForm(p => ({ ...p, site_latitude: lat, site_longitude: lon }))
                // Reverse geocoding — populeaza adresa automat
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
                        { headers: { 'Accept-Language': 'ro' } }
                    )
                    const data = await res.json()
                    if (data?.display_name) {
                        const a = data.address || {}
                        const parts = [
                            a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
                            a.city || a.town || a.village || a.municipality,
                            a.county,
                        ].filter(Boolean)
                        const addr = parts.length > 0 ? parts.join(', ') : data.display_name
                        setForm(p => ({ ...p, site_address: addr }))
                    }
                } catch {}
                setDetecting(false)
            },
            () => setDetecting(false),
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handlePhotoAdd = (e) => {
        const files = Array.from(e.target.files || [])
        const newPhotos = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
        setInstructionPhotos(p => [...p, ...newPhotos])
        e.target.value = ''
    }

    const removePhoto = (idx) => {
        setInstructionPhotos(p => {
            URL.revokeObjectURL(p[idx].preview)
            return p.filter((_, i) => i !== idx)
        })
    }

    const buildPayload = () => ({
        title: form.title,
        access_notes: form.access_notes,
        start_date: form.start_date || null,
        start_time: form.start_time || null,
        deadline_date: form.deadline_date || null,
        client_id: form.client_mode === 'existing' ? form.client_id || null : null,
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        site_id: form.site_mode === 'existing' ? form.site_id || null : null,
        site_address: form.site_mode === 'new' ? form.site_address : null,
        site_latitude: form.site_mode === 'new' ? (form.site_latitude || null) : null,
        site_longitude: form.site_mode === 'new' ? (form.site_longitude || null) : null,
        site_geofence_radius: form.site_mode === 'new' ? (parseInt(form.site_geofence_radius) || 100) : null,
        assigned_team_id: form.assigned_team_id || null,
        assigned_vehicle_id: form.assigned_vehicle_id || null,
        volumes: form.volumes.filter(v => v.label),
        materials: form.materials.filter(m => m.name),
    })

    const uploadInstructionPhotos = async (woId) => {
        for (const p of instructionPhotos) {
            const fd = new FormData()
            fd.append('file', p.file)
            fd.append('photo_type', 'instruction')
            try { await api.post(`/admin/work-orders/${woId}/photos`, fd) } catch {}
        }
    }

    const handleSave = async (andSend = false) => {
        if (!form.title.trim()) return setError('Titlul comenzii este obligatoriu.')
        setError(null)
        andSend ? setSending(true) : setSaving(true)
        try {
            let woId = savedId || id
            if (woId) {
                await api.put(`/admin/work-orders/${woId}`, buildPayload())
            } else {
                const res = await api.post('/admin/work-orders', buildPayload())
                woId = res.data.id
                setSavedId(woId)
            }
            if (instructionPhotos.length) await uploadInstructionPhotos(woId)
            if (andSend) await api.post(`/admin/work-orders/${woId}/send`)
            navigate('/admin/work-orders')
        } catch (e) {
            setError(e.response?.data?.detail || 'Eroare la salvare.')
        } finally {
            setSaving(false); setSending(false)
        }
    }

    const selectedClient = clients.find(c => c.id === form.client_id)
    const selectedSite = sites.find(s => s.id === form.site_id)

    return (
        <div className="p-2 sm:p-4 max-w-4xl mx-auto space-y-3 pb-32">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/admin/work-orders')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow shadow-blue-500/30">
                    <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {isEdit ? 'Editare Comanda' : 'Comanda Noua'}
                    </h1>
                    <p className="text-xs text-slate-500">Completeaza campurile de mai jos</p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl text-sm font-semibold mb-4">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <Section icon={FileText} title="Detalii Comandă" zIndex={80}>
                <Field label="Titlu Comanda" required>
                    <input
                        type="text"
                        value={form.title}
                        onChange={e => set('title', e.target.value)}
                        placeholder="Ex: Sapa 120mp - Familia Ionescu, Str. Florilor 12"
                        className={INPUT}
                        autoFocus
                    />
                </Field>
            </Section>

            {/* 2. Client & Locatie */}
            <Section icon={User} title="Client & Locatie" zIndex={70}>
                <div className="flex gap-2 mb-1">
                    {[['existing', 'Client Existent'], ['new', 'Client Nou']].map(([m, label]) => (
                        <button key={m} onClick={() => set('client_mode', m)}
                            className={`px-4 h-8 rounded-full text-xs font-bold transition-all ${form.client_mode === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {form.client_mode === 'existing' ? (
                    <>
                        <Field label="Selecteaza Client">
                            <select value={form.client_id} onChange={e => {
                                const cl = clients.find(c => c.id === e.target.value)
                                setForm(p => ({
                                    ...p,
                                    client_id: e.target.value,
                                    client_name: cl?.name || '',
                                    client_email: cl?.email || '',
                                    client_phone: cl?.phone || '',
                                }))
                            }} className={SELECT}>
                                <option value="">— Alege client —</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                        {selectedClient && (
                            <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
                                {selectedClient.phone && <p>{selectedClient.phone}</p>}
                                {selectedClient.email && <p>{selectedClient.email}</p>}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-3">
                        <Field label="Nume Client" required>
                            <input type="text" value={form.client_name}
                                onChange={e => set('client_name', e.target.value)}
                                placeholder="Familia Ionescu / SC Firma SRL"
                                className={INPUT} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Telefon">
                                <input type="text" value={form.client_phone}
                                    onChange={e => set('client_phone', e.target.value)}
                                    placeholder="+40 722 ..."
                                    className={INPUT} />
                            </Field>
                            <Field label="Email">
                                <input type="email" value={form.client_email}
                                    onChange={e => set('client_email', e.target.value)}
                                    placeholder="contact@..."
                                    className={INPUT} />
                            </Field>
                        </div>
                    </div>
                )}
            </Section>

            {/* 3. Locatie + GPS */}
            <Section icon={MapPin} title="Locatie Lucrare" zIndex={60}>
                <div className="flex gap-2 mb-1">
                    {[['existing', 'Santier Existent'], ['new', 'Adresa Manuala']].map(([m, label]) => (
                        <button key={m} onClick={() => set('site_mode', m)}
                            className={`px-4 h-8 rounded-full text-xs font-bold transition-all ${form.site_mode === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {form.site_mode === 'existing' ? (
                    <>
                        <Field label="Selecteaza Santier">
                            <select value={form.site_id} onChange={e => {
                                const s = sites.find(x => x.id === e.target.value)
                                setForm(p => ({
                                    ...p,
                                    site_id: e.target.value,
                                    site_address: s?.address || '',
                                    site_latitude: s?.latitude || '',
                                    site_longitude: s?.longitude || '',
                                }))
                            }} className={SELECT}>
                                <option value="">— Alege santier —</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name} {s.address ? `— ${s.address}` : ''}</option>)}
                            </select>
                        </Field>
                        {selectedSite && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-slate-700 dark:text-slate-300">
                                {selectedSite.address}
                                {selectedSite.latitude && (
                                    <p className="text-xs text-slate-400 mt-0.5">GPS: {selectedSite.latitude}, {selectedSite.longitude}</p>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        <Field label="Adresa Lucrarii" required>
                            <input type="text" value={form.site_address}
                                onChange={e => set('site_address', e.target.value)}
                                placeholder="Str. ..., Nr. ..., Oras, Judet"
                                className={INPUT} />
                        </Field>

                        {/* GPS */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Coordonate GPS</span>
                                <button
                                    type="button"
                                    onClick={handleDetectGPS}
                                    disabled={detecting}
                                    className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800 disabled:opacity-60"
                                >
                                    {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                    Detecteaza automat
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 ml-1">Latitudine</label>
                                    <input type="number" step="any" value={form.site_latitude}
                                        onChange={e => set('site_latitude', e.target.value)}
                                        placeholder="44.4268"
                                        className={INPUT} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 ml-1">Longitudine</label>
                                    <input type="number" step="any" value={form.site_longitude}
                                        onChange={e => set('site_longitude', e.target.value)}
                                        placeholder="26.1025"
                                        className={INPUT} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 ml-1">Raza Geo (m)</label>
                                    <input type="number" value={form.site_geofence_radius}
                                        onChange={e => set('site_geofence_radius', e.target.value)}
                                        placeholder="100"
                                        min="10" max="5000"
                                        className={INPUT} />
                                </div>
                            </div>
                            <MiniMapSelector
                                latitude={form.site_latitude}
                                longitude={form.site_longitude}
                                onLocationChange={(lat, lon) => setForm(p => ({ ...p, site_latitude: lat, site_longitude: lon }))}
                            />
                        </div>
                    </div>
                )}
            </Section>
            </div>

            <div className="space-y-4">
            {/* 4. Planificare — prima sectiune din coloana dreapta */}
            <Section icon={Calendar} title="Planificare" zIndex={50}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Data Incepere" required>
                        <input type="date" value={form.start_date}
                            onChange={e => set('start_date', e.target.value)}
                            className={INPUT} />
                    </Field>
                    <Field label="Ora Start">
                        <input type="time" value={form.start_time}
                            onChange={e => set('start_time', e.target.value)}
                            className={INPUT} />
                    </Field>
                    <Field label="Termen Limita">
                        <input type="date" value={form.deadline_date}
                            onChange={e => set('deadline_date', e.target.value)}
                            className={INPUT} />
                    </Field>
                </div>
            </Section>
            {/* 5. Volume + Materiale */}
            <Section icon={FileText} title="Cantitati Estimate" zIndex={40}>
                {/* Volumes */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Lucrari / Volume</span>
                        <button onClick={() => addRow('volumes', { label: '', quantity: '', unit: 'm²' })}
                            className="flex items-center gap-1 px-3 h-7 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                            <Plus className="w-3 h-3" /> Adauga
                        </button>
                    </div>
                    {form.volumes.map((vol, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <SearchableSelect 
                                value={vol.label} 
                                onChange={val => updateRow('volumes', i, 'label', val)}
                                options={activities.map(act => ({ value: act.name, label: act.name }))}
                                placeholder="Alege activitatea..."
                                className="flex-1"
                            />
                            <input value={vol.quantity} onChange={e => updateRow('volumes', i, 'quantity', e.target.value)}
                                placeholder="Cant." type="number"
                                className="w-20 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                            <select value={vol.unit} onChange={e => updateRow('volumes', i, 'unit', e.target.value)}
                                className="w-20 px-2 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm">
                                {VOLUME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            {form.volumes.length > 1 && (
                                <button onClick={() => removeRow('volumes', i)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Materiale Necesare</span>
                        <button onClick={() => addRow('materials', { name: '', quantity: '', unit: '' })}
                            className="flex items-center gap-1 px-3 h-7 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                            <Plus className="w-3 h-3" /> Adauga
                        </button>
                    </div>
                    {form.materials.map((mat, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <SearchableSelect 
                                value={mat.name} 
                                onChange={val => {
                                    updateRow('materials', i, 'name', val)
                                    const selectedItem = warehouseItems.find(item => item.name === val)
                                    if (selectedItem?.unit) {
                                        updateRow('materials', i, 'unit', selectedItem.unit)
                                    }
                                }}
                                options={warehouseItems.map(item => ({ value: item.name, label: item.name }))}
                                placeholder="Alege materialul..."
                                className="flex-1"
                            />
                            <input type="number" placeholder="Cant." value={mat.quantity} onChange={e => updateRow('materials', i, 'quantity', e.target.value ? parseFloat(e.target.value) : '')}
                                className="w-20 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                            <input type="text" placeholder="Unit. (kg, m)" value={mat.unit} onChange={e => updateRow('materials', i, 'unit', e.target.value)}
                                className="w-16 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                            {form.materials.length > 1 && (
                                <button onClick={() => removeRow('materials', i)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </Section>

            {/* 6. Echipa + Vehicul */}
            <Section icon={Users} title="Echipa si Vehicul" zIndex={20}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Șef de Echipă / Responsabil">
                        <SearchableSelect
                            value={form.assigned_team_id}
                            onChange={teamId => {
                                set('assigned_team_id', teamId);
                                if (teamId) {
                                    const selectedTeam = teams.find(t => t.id === teamId);
                                    if (selectedTeam && selectedTeam.team_leader_id) {
                                        const autoVehicle = vehicles.find(v => v.user_ids?.includes(selectedTeam.team_leader_id));
                                        if (autoVehicle) {
                                            set('assigned_vehicle_id', autoVehicle.id);
                                        }
                                    }
                                } else {
                                    set('assigned_vehicle_id', '');
                                }
                            }}
                            options={teams.map(t => ({
                                value: t.id,
                                label: t.team_leader_name && t.team_leader_name !== 'N/A' ? t.team_leader_name : t.name,
                                subLabel: t.team_leader_name && t.team_leader_name !== 'N/A' && t.name !== t.team_leader_name ? `Echipa: ${t.name}` : undefined
                            }))}
                            placeholder="— Fără alocare —"
                        />
                    </Field>
                    <Field label="Vehicul / Camion">
                        <SearchableSelect
                            value={form.assigned_vehicle_id}
                            onChange={val => set('assigned_vehicle_id', val)}
                            options={vehicles.map(v => ({
                                value: v.id,
                                label: `${v.plate_number || 'Fără nr.'} ${v.brand ? `— ${v.brand}` : ''}`,
                                subLabel: v.name
                            }))}
                            placeholder="— Fără vehicul —"
                        />
                    </Field>
                </div>
            </Section>

            <Section icon={Image} title="Instructiuni Acces (vizibile echipei)" zIndex={10}>
                <Field label="Note Acces">
                    <textarea
                        value={form.access_notes}
                        onChange={e => set('access_notes', e.target.value)}
                        placeholder="Cod intrare: 1234&#10;Etaj 3, apartament stanga&#10;Suna la interfon la Ionescu"
                        rows={4}
                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none"
                    />
                </Field>

                {/* Poze instructiuni */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Poze Instructiuni ({instructionPhotos.length})
                        </span>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Adauga Poza
                        </button>
                                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
                            </div>
                            {instructionPhotos.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {instructionPhotos.map((p, i) => (
                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                                            <img src={p.preview} alt="" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removePhoto(i)}
                                                className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-slate-400">Aceste poze sunt vizibile doar pentru echipa, nu apar la client.</p>
                        </div>
                    </Section>
                </div>
            </div>

            {/* Butoane fixe jos */}
            <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex gap-3 justify-end z-[100] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <button
                    onClick={() => navigate('/admin/work-orders')}
                    className="px-5 h-11 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                    Anuleaza
                </button>
                <button
                    onClick={() => handleSave(false)}
                    disabled={saving || sending}
                    className="flex items-center gap-2 px-5 h-11 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvează
                </button>
                <button
                    onClick={() => handleSave(true)}
                    disabled={saving || sending}
                    className="flex items-center gap-2 px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Trimite la Echipă
                </button>
            </div>
        </div>
    )
}
