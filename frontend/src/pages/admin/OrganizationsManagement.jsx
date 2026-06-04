import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Plus, Search, Edit2, Trash2, Globe, Check, Image as ImageIcon, Loader2, ChevronDown, Users, X, ShieldCheck, UserPlus, Eye, EyeOff } from 'lucide-react'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../../store/adminStore'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function OrganizationsManagement() {
    const { t } = useTranslation()
    const { admin } = useAdminStore()
    const navigate = useNavigate()
    
    useEffect(() => {
        if (admin && admin.role !== 'SUPER_ADMIN' && !admin.is_super_admin) {
            navigate('/admin/dashboard')
        }
    }, [admin, navigate])

    const [orgs, setOrgs] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [error, setError] = useState(null)
    
    // Org modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingOrg, setEditingOrg] = useState(null)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false)
    const fileInputRef = useRef(null)
    const faviconInputRef = useRef(null)

    // Admins drawer
    const [adminsDrawerOrg, setAdminsDrawerOrg] = useState(null) // org object
    const [orgAdmins, setOrgAdmins] = useState([])
    const [loadingAdmins, setLoadingAdmins] = useState(false)
    const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [adminFormData, setAdminFormData] = useState({ email: '', full_name: '', password: '', confirm_password: '', role: 'ADMIN' })
    const [adminFormError, setAdminFormError] = useState(null)

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        custom_domain: '',
        plan_tier: 'basic',
        max_users: '',
        primary_color: '#3b82f6',
        secondary_color: '#1e40af',
        logo_url: '',
        favicon_url: '',
        timezone: 'auto',
        has_long_term_sites: true,
        has_short_term_interventions: false,
        is_active: true,
        features: []
    })
    
    const fetchOrgs = async () => {
        try {
            setLoading(true)
            const res = await api.get('/admin/organizations/')
            setOrgs(res.data)
        } catch (err) {
            console.error('Error fetching orgs:', err)
        } finally {
            setLoading(false)
        }
    }
    
    useEffect(() => { fetchOrgs() }, [])

    const openModal = (org = null) => {
        if (org) {
            setEditingOrg(org)
            setFormData({
                name: org.name,
                slug: org.slug || '',
                custom_domain: org.custom_domain || '',
                plan_tier: org.plan_tier || 'basic',
                max_users: org.max_users || '',
                primary_color: org.primary_color || '#3b82f6',
                secondary_color: org.secondary_color || '#1e40af',
                logo_url: org.logo_url || '',
                timezone: org.timezone || 'auto',
                has_long_term_sites: org.has_long_term_sites !== false,
                has_short_term_interventions: org.has_short_term_interventions === true,
                is_active: org.is_active,
                favicon_url: org.favicon_url || '',
                features: org.features || []
            })
        } else {
            setEditingOrg(null)
            setFormData({
                name: '',
                slug: '',
                custom_domain: '',
                plan_tier: 'basic',
                max_users: '',
                primary_color: '#3b82f6',
                secondary_color: '#1e40af',
                logo_url: '',
                favicon_url: '',
                timezone: 'auto',
                has_long_term_sites: true,
                has_short_term_interventions: false,
                is_active: true,
                features: []
            })
        }
        setError(null)
        setIsModalOpen(true)
    }

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const data = new FormData()
        data.append('file', file)
        try {
            setUploadingLogo(true)
            const res = await api.post('/admin/organizations/upload-logo', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setFormData(prev => ({ ...prev, logo_url: res.data.logo_url }))
        } catch (err) {
            alert(err.response?.data?.detail || 'Eroare la încărcarea logo-ului')
        } finally {
            setUploadingLogo(false)
        }
    }

    const handleFaviconUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const data = new FormData()
        data.append('file', file)
        try {
            const res = await api.post('/admin/organizations/upload-logo', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setFormData(prev => ({ ...prev, favicon_url: res.data.logo_url }))
        } catch (err) {
            alert(err.response?.data?.detail || 'Eroare la incarcarea favicon-ului')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        const payload = {
            name: formData.name,
            slug: formData.slug || null,
            custom_domain: formData.custom_domain || null,
            plan_tier: formData.plan_tier,
            max_users: formData.max_users ? parseInt(formData.max_users) : null,
            primary_color: formData.primary_color || null,
            secondary_color: formData.secondary_color || null,
            logo_url: formData.logo_url || null,
            favicon_url: formData.favicon_url || null,
            timezone: formData.timezone || 'auto',
            is_active: formData.is_active,
            features: formData.features,
            has_long_term_sites: formData.has_long_term_sites,
            has_short_term_interventions: formData.has_short_term_interventions,
        }
        try {
            if (editingOrg) {
                await api.put(`/admin/organizations/${editingOrg.id}`, payload)
            } else {
                await api.post('/admin/organizations/', payload)
            }
            setIsModalOpen(false)
            fetchOrgs()
        } catch (err) {
            setError(err.response?.data?.detail || 'Eroare la salvarea companiei.')
        }
    }

    const handleDelete = async (id) => {
        if (window.confirm('Ești sigur că vrei să ștergi această companie și toți utilizatorii ei?')) {
            try {
                await api.delete(`/admin/organizations/${id}`)
                fetchOrgs()
            } catch (err) {
                alert('Eroare la ștergere.')
            }
        }
    }

    // ---- Admins Drawer ----
    const openAdminsDrawer = async (org) => {
        setAdminsDrawerOrg(org)
        setLoadingAdmins(true)
        try {
            const res = await api.get(`/admin/organizations/${org.id}/admins`)
            setOrgAdmins(res.data)
        } catch {
            setOrgAdmins([])
        } finally {
            setLoadingAdmins(false)
        }
    }

    const handleAddAdmin = async (e) => {
        e.preventDefault()
        setAdminFormError(null)
        if (adminFormData.password !== adminFormData.confirm_password) {
            return setAdminFormError('Parolele nu coincid.')
        }
        try {
            const res = await api.post(`/admin/organizations/${adminsDrawerOrg.id}/admins`, adminFormData)
            setOrgAdmins(prev => [...prev, res.data])
            setIsAddAdminModalOpen(false)
            setAdminFormData({ email: '', full_name: '', password: '', confirm_password: '', role: 'ADMIN' })
        } catch (err) {
            setAdminFormError(err.response?.data?.detail || 'Eroare la crearea adminului.')
        }
    }

    const handleDeleteAdmin = async (adminId) => {
        if (!window.confirm('Ștergi acest admin local?')) return
        try {
            await api.delete(`/admin/organizations/${adminsDrawerOrg.id}/admins/${adminId}`)
            setOrgAdmins(prev => prev.filter(a => a.id !== adminId))
        } catch {
            alert('Eroare la ștergere.')
        }
    }
    
    const filteredOrgs = orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))

    const moduleOptions = [
        { id: 'sites', label: 'Șantiere' },
        { id: 'fleet', label: 'Parc Auto' },
        { id: 'warehouse', label: 'Magazie & Inventar' },
        { id: 'accommodations', label: 'Cazări' },
        { id: 'expenses', label: 'Deconturi / Cheltuieli' },
        { id: 'reports', label: 'Rapoarte Avansate' },
    ]

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Building2 className="w-6 h-6 text-blue-600" />
                        Companii (SaaS Tenants)
                    </h1>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Caută companie..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button 
                        onClick={() => openModal()}
                        className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" /> Adaugă
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-widest">
                                <th className="px-6 py-4">Companie</th>
                                <th className="px-6 py-4">Domeniu / Slug</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-700 dark:text-slate-600 dark:text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredOrgs.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-700 dark:text-slate-600 dark:text-slate-400 text-sm">Nu am găsit companii.</td></tr>
                            ) : (
                                filteredOrgs.map((org) => (
                                    <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {org.logo_url ? (
                                                    <img src={org.logo_url.startsWith('http') ? org.logo_url : `${API_BASE}${org.logo_url}`} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-white" />
                                                ) : (
                                                    <div 
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                                        style={{ backgroundColor: org.primary_color || '#2563EB' }}
                                                    >
                                                        {org.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{org.name}</div>
                                                    <div className="text-[11px] text-slate-700 dark:text-slate-600 dark:text-slate-400 uppercase tracking-wider">Limita: {org.max_users || 'Nelimitat'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {org.custom_domain ? (
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    <Globe className="w-4 h-4 text-slate-600 dark:text-slate-400" /> {org.custom_domain}
                                                </div>
                                            ) : org.slug ? (
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    <Globe className="w-4 h-4 text-slate-600 dark:text-slate-400" /> {org.slug}.pontaj.app
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Standard</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 uppercase text-[10px]">
                                                {org.plan_tier}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                org.is_active 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
                                                    : 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'
                                            }`}>
                                                {org.is_active ? 'Activ' : 'Inactiv'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Manage Admins button */}
                                                <button 
                                                    onClick={() => openAdminsDrawer(org)} 
                                                    title="Gestionează Admini Locali"
                                                    className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-600 dark:text-slate-400 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <Users className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openModal(org)} className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(org.id)} className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* =================== ORG MODAL =================== */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col" style={{maxHeight: 'calc(100vh - 32px)'}}>
                        {/* Sticky header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingOrg ? 'Editează Compania' : 'Adaugă Companie Nouă'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                            <div className="overflow-y-auto flex-1 p-6 space-y-5">
                                {error && (
                                    <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold">
                                        {error}
                                    </div>
                                )}

                                {/* ROW 1: Logo + Nume + Plan + Limita */}
                                <div className="flex gap-4 items-start">
                                    {/* Logo + Favicon Upload */}
                                    <div className="flex gap-3 shrink-0">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Logo</label>
                                            <div
                                                className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {uploadingLogo ? (
                                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                                ) : formData.logo_url ? (
                                                    <>
                                                        <img src={formData.logo_url.startsWith('http') ? formData.logo_url : `${API_BASE}${formData.logo_url}`} className="w-full h-full object-contain p-2 bg-white" alt="Logo" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Edit2 className="w-4 h-4 text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <ImageIcon className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                )}
                                            </div>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                            <span className="text-[10px] text-slate-400 text-center">Logo</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Favicon</label>
                                            <div
                                                className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-colors"
                                                onClick={() => faviconInputRef.current?.click()}
                                            >
                                                {formData.favicon_url ? (
                                                    <>
                                                        <img src={formData.favicon_url.startsWith('http') ? formData.favicon_url : `${API_BASE}${formData.favicon_url}`} className="w-full h-full object-contain p-2 bg-white" alt="Favicon" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Edit2 className="w-4 h-4 text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <ImageIcon className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                                )}
                                            </div>
                                            <input type="file" ref={faviconInputRef} className="hidden" accept="image/*,.ico" onChange={handleFaviconUpload} />
                                            <span className="text-[10px] text-slate-400 text-center">Favicon</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nume Companie *</label>
                                            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm"
                                                placeholder="Ex: Trade Invest SRL" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Plan</label>
                                                <div onClick={() => setIsPlanDropdownOpen(!isPlanDropdownOpen)}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white shadow-sm flex items-center justify-between cursor-pointer">
                                                    <span className="font-bold capitalize">{formData.plan_tier}</span>
                                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isPlanDropdownOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                                {isPlanDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-[10000]" onClick={() => setIsPlanDropdownOpen(false)} />
                                                        <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-[10001] overflow-hidden">
                                                            {[
                                                                { id: 'basic', label: 'Basic' },
                                                                { id: 'pro', label: 'Pro' },
                                                                { id: 'enterprise', label: 'Enterprise' }
                                                            ].map(plan => (
                                                                <div key={plan.id}
                                                                    onClick={() => { setFormData({...formData, plan_tier: plan.id}); setIsPlanDropdownOpen(false) }}
                                                                    className="px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-white">
                                                                    {plan.label}
                                                                    {formData.plan_tier === plan.id && <Check className="w-4 h-4 text-blue-600" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Limita Useri</label>
                                                <input type="number" value={formData.max_users} onChange={e => setFormData({...formData, max_users: e.target.value})}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm"
                                                    placeholder="Nelimitat" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-800" />

                                {/* ROW 2: Subdomeniu + Custom Domain */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Subdomeniu</label>
                                        <div className="relative flex items-center">
                                            <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})}
                                                className="w-full pl-4 pr-[90px] h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm font-medium text-blue-600"
                                                placeholder="ex: firma1" />
                                            <span className="absolute right-4 text-xs font-bold text-slate-400 pointer-events-none">.pontaj.app</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                                            <Globe className="w-3.5 h-3.5 text-indigo-500" /> Custom Domain
                                        </label>
                                        <input type="text" value={formData.custom_domain} onChange={e => setFormData({...formData, custom_domain: e.target.value})}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-indigo-200 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm font-medium text-indigo-600"
                                            placeholder="ex: app.firma.ro" />
                                    </div>
                                </div>

                                {/* ROW 3: Timezone */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Fus Orar</label>
                                    <select value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none shadow-sm cursor-pointer">
                                        <option value="auto">Auto (Ora locală a vizitatorului)</option>
                                        <option value="Europe/Bucharest">Romania (Bucuresti)</option>
                                        <option value="Europe/Berlin">Germania (Berlin)</option>
                                    </select>
                                </div>

                                {/* ROW 4: Tipuri de Lucrari */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipuri de Lucrari</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input type="checkbox" checked={formData.has_long_term_sites}
                                                onChange={e => setFormData({...formData, has_long_term_sites: e.target.checked})}
                                                className="w-5 h-5 rounded accent-blue-600 cursor-pointer" />
                                            <div>
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">Santiere Clasice (Termen Lung)</div>
                                                <div className="text-xs text-slate-400">Locatii fixe pe harta, durata lunga.</div>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <input type="checkbox" checked={formData.has_short_term_interventions}
                                                onChange={e => setFormData({...formData, has_short_term_interventions: e.target.checked})}
                                                className="w-5 h-5 rounded accent-amber-500 cursor-pointer" />
                                            <div>
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">Lucrari Scurte (Interventii)</div>
                                                <div className="text-xs text-slate-400">Comenzi de lucru cu GPS si check-in dinamic.</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* ROW 5: Culoare + Status */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Culoare Principala</label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})}
                                                className="w-9 h-9 rounded-full cursor-pointer border-none p-0 overflow-hidden shrink-0" />
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">{formData.primary_color}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Status Cont</label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div className={`relative w-10 h-5 rounded-full transition-colors ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formData.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                                            <span className={`text-sm font-bold ${formData.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {formData.is_active ? 'Activ' : 'Inactiv'}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* ROW 6: Module */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Module Functionale</label>
                                        <button type="button" onClick={() => {
                                            if(formData.features.length === moduleOptions.length) setFormData({...formData, features: []})
                                            else setFormData({...formData, features: moduleOptions.map(m => m.id)})
                                        }} className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full">
                                            {formData.features.length === moduleOptions.length ? 'Deselecteaza Tot' : 'Selecteaza Tot'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {moduleOptions.map(mod => {
                                            const isChecked = formData.features.includes(mod.id)
                                            return (
                                                <label key={mod.id} className={`flex items-center justify-between px-4 py-2.5 rounded-full border cursor-pointer transition-all ${isChecked ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50'}`}>
                                                    <span className={`text-sm font-semibold ${isChecked ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{mod.label}</span>
                                                    <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-3 ${isChecked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isChecked ? 'left-[22px]' : 'left-0.5'}`} />
                                                        <input type="checkbox" className="sr-only" checked={isChecked}
                                                            onChange={e => {
                                                                const f = formData.features
                                                                if(e.target.checked) setFormData({...formData, features: [...f, mod.id]})
                                                                else setFormData({...formData, features: f.filter(x => x !== mod.id)})
                                                            }} />
                                                    </div>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Sticky footer — always visible */}
                            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-colors">
                                    Anulează
                                </button>
                                <button type="submit" className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all">
                                    {editingOrg ? 'Salvează' : 'Creează Compania'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}


            {/* =================== ADMINS DRAWER =================== */}
            {adminsDrawerOrg && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAdminsDrawerOrg(null)} />
                    <div className="relative ml-auto w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
                        {/* Drawer Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                    style={{ backgroundColor: adminsDrawerOrg.primary_color || '#2563EB' }}
                                >
                                    {adminsDrawerOrg.logo_url ? (
                                        <img src={adminsDrawerOrg.logo_url.startsWith('http') ? adminsDrawerOrg.logo_url : `${API_BASE}${adminsDrawerOrg.logo_url}`} className="w-full h-full object-cover rounded-full" alt="" />
                                    ) : adminsDrawerOrg.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">{adminsDrawerOrg.name}</h2>
                                    <p className="text-xs text-slate-700 dark:text-slate-600 dark:text-slate-400">Admini locali</p>
                                </div>
                            </div>
                            <button onClick={() => setAdminsDrawerOrg(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> Admini configurați
                                </p>
                                <button
                                    onClick={() => { setAdminFormError(null); setAdminFormData({ email: '', full_name: '', password: '', confirm_password: '', role: 'ADMIN' }); setIsAddAdminModalOpen(true) }}
                                    className="px-4 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                                >
                                    <UserPlus className="w-3.5 h-3.5" /> Adaugă Admin
                                </button>
                            </div>

                            {loadingAdmins ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-600 dark:text-slate-400" /></div>
                            ) : orgAdmins.length === 0 ? (
                                <div className="text-center py-8 text-slate-700 dark:text-slate-600 dark:text-slate-400">
                                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium">Niciun admin local</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Adaugă primul administrator pentru această companie.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orgAdmins.map(a => (
                                        <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                    {a.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{a.full_name}</div>
                                                    <div className="text-xs text-slate-700 dark:text-slate-600 dark:text-slate-400">{a.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">{a.role}</span>
                                                <button onClick={() => handleDeleteAdmin(a.id)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-400 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Info box */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                                    <strong>ℹ️ Notă:</strong> Adminii locali pot gestiona <strong>doar</strong> datele companiei lor ({adminsDrawerOrg.slug ? `${adminsDrawerOrg.slug}.pontaj.app` : adminsDrawerOrg.name}). Nu au acces la alte companii și nu pot vedea acest panou SaaS.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =================== ADD ADMIN MODAL =================== */}
            {isAddAdminModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Admin Nou Local</h3>
                            <button onClick={() => setIsAddAdminModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddAdmin}>
                            <div className="p-6 space-y-4">
                                {adminFormError && (
                                    <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-sm font-bold">{adminFormError}</div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-600 dark:text-slate-400 mb-1.5">Nume Complet *</label>
                                    <input required type="text" value={adminFormData.full_name} onChange={e => setAdminFormData({...adminFormData, full_name: e.target.value})} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm" placeholder="Ex: Ion Popescu" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-600 dark:text-slate-400 mb-1.5">Email *</label>
                                    <input required type="email" value={adminFormData.email} onChange={e => setAdminFormData({...adminFormData, email: e.target.value})} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm" placeholder="admin@firma.ro" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-600 dark:text-slate-400 mb-1.5">Parolă *</label>
                                        <div className="relative">
                                            <input required type={showPassword ? 'text' : 'password'} minLength={6} value={adminFormData.password} onChange={e => setAdminFormData({...adminFormData, password: e.target.value})} className="w-full pl-4 pr-12 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm" placeholder="Minim 6 caractere" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-600">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-600 dark:text-slate-400 mb-1.5">Confirmă Parola *</label>
                                        <div className="relative">
                                            <input required type={showConfirmPassword ? 'text' : 'password'} minLength={6} value={adminFormData.confirm_password} onChange={e => setAdminFormData({...adminFormData, confirm_password: e.target.value})} className="w-full pl-4 pr-12 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white outline-none transition-all shadow-sm" placeholder="Confirmă parola" />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-600">
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-600 dark:text-slate-400 mb-1.5">Rol</label>
                                    <div className="flex gap-3">
                                        {['ADMIN', 'LOGISTIC'].map(r => (
                                            <button type="button" key={r} onClick={() => setAdminFormData({...adminFormData, role: r})} className={`flex-1 h-10 rounded-full text-sm font-bold border transition-all ${adminFormData.role === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}>
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddAdminModalOpen(false)} className="px-5 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold transition-colors">Anulează</button>
                                <button type="submit" className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all">Creează Admin</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
