import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Plus, Trash2, ClipboardList, Check, Building2, User, MapPin, Calendar, FileText } from 'lucide-react'
import api from '../../lib/api'

const STEPS = [
    { id: 1, label: 'Client & Locație', icon: User },
    { id: 2, label: 'Cerințe & Volume', icon: FileText },
    { id: 3, label: 'Preview & Trimitere', icon: Check },
]

const EMPTY_FORM = {
    title: '',
    notes: '',
    start_date: '',
    deadline_date: '',
    // Client
    client_mode: 'existing', // 'existing' | 'new'
    client_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    // Locație
    site_mode: 'existing', // 'existing' | 'new'
    site_id: '',
    site_address: '',
    // Arrays
    requirements: [{ description: '', category: '', qty: '' }],
    materials: [{ name: '', quantity: '', unit: '' }],
    volumes: [{ label: '', quantity: '', unit: 'm²', price: '' }],
}

const VOLUME_UNITS = ['m²', 'm³', 'm liniar', 'buc', 'ore', 'kg', 'tone', 't', 'pal', 'set']
const CATEGORIES = ['Structură', 'Finisaje', 'Instalații', 'Amenajare', 'Demolare', 'Transport', 'Altele']

export default function WorkOrderForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [step, setStep] = useState(1)
    const [form, setForm] = useState(EMPTY_FORM)
    const [clients, setClients] = useState([])
    const [sites, setSites] = useState([])
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState(null)
    const [savedId, setSavedId] = useState(null)

    // Load clients + sites + (if edit) existing order
    useEffect(() => {
        const load = async () => {
            try {
                const [cRes, sRes] = await Promise.all([
                    api.get('/admin/clients'),
                    api.get('/admin/sites'),
                ])
                // clients endpoint returns array directly
                setClients(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || cRes.data?.clients || []))
                // sites endpoint may return { items: [...] } or array
                const sitesData = sRes.data
                setSites(Array.isArray(sitesData) ? sitesData : (sitesData?.items || sitesData?.sites || []))
            } catch {}

            if (isEdit) {
                try {
                    const res = await api.get(`/work-orders/${id}`)
                    const wo = res.data
                    setForm(prev => ({
                        ...prev,
                        title: wo.title || '',
                        notes: wo.notes || '',
                        start_date: wo.start_date || '',
                        deadline_date: wo.deadline_date || '',
                        client_mode: wo.client_id ? 'existing' : 'new',
                        client_id: wo.client_id || '',
                        client_name: wo.client_name || '',
                        client_email: wo.client_email || '',
                        client_phone: wo.client_phone || '',
                        site_mode: wo.site_id ? 'existing' : 'new',
                        site_id: wo.site_id || '',
                        site_address: wo.site_address || '',
                        requirements: wo.requirements?.length ? wo.requirements : [{ description: '', category: '', qty: '' }],
                        materials: wo.materials?.length ? wo.materials : [{ name: '', quantity: '', unit: '' }],
                        volumes: wo.volumes?.length ? wo.volumes : [{ label: '', quantity: '', unit: 'm²', price: '' }],
                    }))
                    setSavedId(wo.id)
                } catch {}
            }
        }
        load()
    }, [id])

    // Helpers for arrays
    const addRow = (field, empty) => setForm(p => ({ ...p, [field]: [...p[field], empty] }))
    const removeRow = (field, idx) => setForm(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }))
    const updateRow = (field, idx, key, val) => setForm(p => ({
        ...p,
        [field]: p[field].map((row, i) => i === idx ? { ...row, [key]: val } : row)
    }))

    const buildPayload = () => ({
        title: form.title,
        notes: form.notes,
        start_date: form.start_date || null,
        deadline_date: form.deadline_date || null,
        client_id: form.client_mode === 'existing' ? form.client_id || null : null,
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        site_id: form.site_mode === 'existing' ? form.site_id || null : null,
        site_address: form.site_mode === 'new' ? form.site_address : null,
        requirements: form.requirements.filter(r => r.description),
        materials: form.materials.filter(m => m.name),
        volumes: form.volumes.filter(v => v.label),
    })

    const handleSaveDraft = async () => {
        if (!form.title.trim()) return setError('Titlul comenzii este obligatoriu.')
        setError(null)
        setSaving(true)
        try {
            if (savedId || isEdit) {
                const res = await api.put(`/work-orders/${savedId || id}`, buildPayload())
                setSavedId(res.data.id)
            } else {
                const res = await api.post('/work-orders', buildPayload())
                setSavedId(res.data.id)
            }
            navigate('/admin/work-orders')
        } catch (e) {
            setError(e.response?.data?.detail || 'Eroare la salvare.')
        } finally {
            setSaving(false)
        }
    }

    const handleSendDirect = async () => {
        if (!form.title.trim()) return setError('Titlul comenzii este obligatoriu.')
        setError(null)
        setSending(true)
        try {
            let woId = savedId || id
            if (!woId) {
                const res = await api.post('/work-orders', buildPayload())
                woId = res.data.id
                setSavedId(woId)
            } else {
                await api.put(`/work-orders/${woId}`, buildPayload())
            }
            await api.post(`/work-orders/${woId}/send`)
            navigate('/admin/work-orders')
        } catch (e) {
            setError(e.response?.data?.detail || 'Eroare la trimitere.')
        } finally {
            setSending(false)
        }
    }

    const selectedClient = clients.find(c => c.id === form.client_id)
    const selectedSite = sites.find(s => s.id === form.site_id)

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
                    <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                        {isEdit ? 'Editează Comanda' : 'Comandă Nouă de Lucru'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Completează pașii de mai jos</p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-8">
                {STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1">
                        <button
                            onClick={() => step > s.id && setStep(s.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                                step === s.id
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                    : step > s.id
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer hover:bg-emerald-200'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                            }`}
                        >
                            {step > s.id ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{s.label}</span>
                        </button>
                        {i < STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-1 rounded ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl text-sm font-semibold">
                    {error}
                </div>
            )}

            {/* ── STEP 1: Client & Locație ── */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Titlu */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5">Titlu Comandă *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            placeholder="Ex: Instalare panouri fotovoltaice — Str. Florilor 12"
                            className="w-full px-4 h-11 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm font-medium"
                        />
                    </div>

                    {/* Client */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" /> Client
                            </h3>
                            <div className="flex gap-2">
                                {['existing', 'new'].map(m => (
                                    <button key={m} onClick={() => setForm(p => ({ ...p, client_mode: m }))}
                                        className={`px-3 h-7 rounded-full text-xs font-bold transition-all ${form.client_mode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                                        {m === 'existing' ? 'Client Existent' : 'Client Nou'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.client_mode === 'existing' ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Selectează Client</label>
                                <select value={form.client_id} onChange={e => {
                                    const cl = clients.find(c => c.id === e.target.value)
                                    setForm(p => ({
                                        ...p,
                                        client_id: e.target.value,
                                        client_name: cl?.name || '',
                                        client_email: cl?.email || '',
                                        client_phone: cl?.phone || '',
                                    }))
                                }} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm">
                                    <option value="">— Alege client —</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {selectedClient && (
                                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                        {selectedClient.email && <p>✉️ {selectedClient.email}</p>}
                                        {selectedClient.phone && <p>📞 {selectedClient.phone}</p>}
                                        {selectedClient.address && <p>📍 {selectedClient.address}</p>}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { key: 'client_name', label: 'Nume Companie / Persoană', placeholder: 'Ex: SC Construct SRL' },
                                    { key: 'client_email', label: 'Email', placeholder: 'contact@firma.ro' },
                                    { key: 'client_phone', label: 'Telefon', placeholder: '+40 722 ...' },
                                ].map(f => (
                                    <div key={f.key} className={f.key === 'client_name' ? 'sm:col-span-2' : ''}>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">{f.label}</label>
                                        <input type={f.key === 'client_email' ? 'email' : 'text'} value={form[f.key]}
                                            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                            placeholder={f.placeholder}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Locație */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" /> Locație
                            </h3>
                            <div className="flex gap-2">
                                {['existing', 'new'].map(m => (
                                    <button key={m} onClick={() => setForm(p => ({ ...p, site_mode: m }))}
                                        className={`px-3 h-7 rounded-full text-xs font-bold transition-all ${form.site_mode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                                        {m === 'existing' ? 'Șantier Existent' : 'Adresă Manuală'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.site_mode === 'existing' ? (
                            <select value={form.site_id} onChange={e => setForm(p => ({ ...p, site_id: e.target.value }))}
                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm">
                                <option value="">— Alege șantier —</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Adresă Lucrare</label>
                                <textarea value={form.site_address} onChange={e => setForm(p => ({ ...p, site_address: e.target.value }))}
                                    placeholder="Str. ..., Nr. ..., Oraș, Județ"
                                    rows={2}
                                    className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none" />
                            </div>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <Calendar className="w-4 h-4 text-blue-600" /> Planificare
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Data Start</label>
                                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Termen Limită</label>
                                <input type="date" value={form.deadline_date} onChange={e => setForm(p => ({ ...p, deadline_date: e.target.value }))}
                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Cerințe & Volume ── */}
            {step === 2 && (
                <div className="space-y-6">
                    {/* Requirements */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 dark:text-white">Cerințe de Lucru</h3>
                            <button onClick={() => addRow('requirements', { description: '', category: '', qty: '' })}
                                className="flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                                <Plus className="w-3 h-3" /> Adaugă
                            </button>
                        </div>
                        {form.requirements.map((req, i) => (
                            <div key={i} className="flex gap-2 items-start">
                                <input value={req.description} onChange={e => updateRow('requirements', i, 'description', e.target.value)}
                                    placeholder="Descriere cerință"
                                    className="flex-1 px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                <select value={req.category} onChange={e => updateRow('requirements', i, 'category', e.target.value)}
                                    className="w-36 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm">
                                    <option value="">Categorie</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input value={req.qty} onChange={e => updateRow('requirements', i, 'qty', e.target.value)}
                                    placeholder="Cantitate"
                                    className="w-28 px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                {form.requirements.length > 1 && (
                                    <button onClick={() => removeRow('requirements', i)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Volumes */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 dark:text-white">Volume</h3>
                            <button onClick={() => addRow('volumes', { label: '', quantity: '', unit: 'm²', price: '' })}
                                className="flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                                <Plus className="w-3 h-3" /> Adaugă
                            </button>
                        </div>
                        {form.volumes.map((vol, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={vol.label} onChange={e => updateRow('volumes', i, 'label', e.target.value)}
                                    placeholder="Ex: Suprafață tencuială"
                                    className="flex-1 px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                <input value={vol.quantity} onChange={e => updateRow('volumes', i, 'quantity', e.target.value)}
                                    placeholder="Cant."
                                    type="number"
                                    className="w-24 px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                <select value={vol.unit} onChange={e => updateRow('volumes', i, 'unit', e.target.value)}
                                    className="w-24 px-3 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm">
                                    {VOLUME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                {form.volumes.length > 1 && (
                                    <button onClick={() => removeRow('volumes', i)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Materials */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-900 dark:text-white">Materiale Necesare</h3>
                            <button onClick={() => addRow('materials', { name: '', quantity: '', unit: '' })}
                                className="flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                                <Plus className="w-3 h-3" /> Adaugă
                            </button>
                        </div>
                        {form.materials.map((mat, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input value={mat.name} onChange={e => updateRow('materials', i, 'name', e.target.value)}
                                    placeholder="Denumire material"
                                    className="flex-1 px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                <input value={mat.quantity} onChange={e => updateRow('materials', i, 'quantity', e.target.value)}
                                    placeholder="Cant."
                                    className="w-24 px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                <input value={mat.unit} onChange={e => updateRow('materials', i, 'unit', e.target.value)}
                                    placeholder="UM"
                                    className="w-20 px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm" />
                                {form.materials.length > 1 && (
                                    <button onClick={() => removeRow('materials', i)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Notes */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-1.5">Note Interne</label>
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Observații, condiții speciale, instrucțiuni pentru echipă..."
                            rows={3}
                            className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none" />
                    </div>
                </div>
            )}

            {/* ── STEP 3: Preview & Trimitere ── */}
            {step === 3 && (
                <div className="space-y-5">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* Preview header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <ClipboardList className="w-6 h-6 opacity-80" />
                                <span className="text-sm font-bold opacity-80 uppercase tracking-wider">Comandă de Lucru</span>
                            </div>
                            <h2 className="text-2xl font-black">{form.title || 'Fără titlu'}</h2>
                            <div className="flex gap-4 mt-3 text-sm opacity-90">
                                {form.start_date && <span>📅 Start: {new Date(form.start_date).toLocaleDateString('ro-RO')}</span>}
                                {form.deadline_date && <span>⏰ Deadline: {new Date(form.deadline_date).toLocaleDateString('ro-RO')}</span>}
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Client */}
                            <div>
                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Client</h4>
                                <p className="font-bold text-slate-900 dark:text-white">{form.client_name || selectedClient?.name || '—'}</p>
                                {(form.client_email || selectedClient?.email) && <p className="text-sm text-slate-600 dark:text-slate-400">✉️ {form.client_email || selectedClient?.email}</p>}
                                {(form.client_phone || selectedClient?.phone) && <p className="text-sm text-slate-600 dark:text-slate-400">📞 {form.client_phone || selectedClient?.phone}</p>}
                            </div>
                            {/* Location */}
                            <div>
                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Locație</h4>
                                <p className="text-slate-900 dark:text-white font-semibold">
                                    {selectedSite?.name || '—'}
                                    {form.site_address && <span className="font-normal text-slate-600 dark:text-slate-400"> — {form.site_address}</span>}
                                </p>
                            </div>
                            {/* Requirements */}
                            {form.requirements.filter(r => r.description).length > 0 && (
                                <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Cerințe</h4>
                                    <div className="space-y-1">
                                        {form.requirements.filter(r => r.description).map((r, i) => (
                                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                <span className="text-sm text-slate-800 dark:text-slate-200">{r.description}</span>
                                                <div className="flex gap-3 text-xs text-slate-500">
                                                    {r.category && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full">{r.category}</span>}
                                                    {r.qty && <span className="font-bold">{r.qty}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Volumes */}
                            {form.volumes.filter(v => v.label).length > 0 && (
                                <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Volume</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {form.volumes.filter(v => v.label).map((v, i) => (
                                            <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{v.label}</p>
                                                <p className="font-black text-slate-900 dark:text-white">{v.quantity} <span className="text-sm font-normal">{v.unit}</span></p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {form.notes && (
                                <div>
                                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Note</h4>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">{form.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/admin/work-orders')}
                    className="flex items-center gap-2 px-5 h-10 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {step === 1 ? 'Anulează' : 'Înapoi'}
                </button>

                <div className="flex gap-3">
                    {step === 3 && (
                        <>
                            <button
                                onClick={handleSaveDraft}
                                disabled={saving}
                                className="px-5 h-10 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Se salvează...' : 'Salvează Draft'}
                            </button>
                            <button
                                onClick={handleSendDirect}
                                disabled={sending}
                                className="flex items-center gap-2 px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                {sending ? 'Se trimite...' : '✉️ Salvează & Trimite'}
                            </button>
                        </>
                    )}
                    {step < 3 && (
                        <button
                            onClick={() => {
                                if (step === 1 && !form.title.trim()) return setError('Titlul comenzii este obligatoriu.')
                                setError(null)
                                setStep(s => s + 1)
                            }}
                            className="flex items-center gap-2 px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-500/20 transition-all"
                        >
                            Continuă
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
