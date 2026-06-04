import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import DataTable from '../../components/DataTable'
import { Loader2, X, Plus, Edit2, Trash2, Building2, Users, CalendarClock, UploadCloud, FileText, Check as CheckIcon, BarChart2, Download, Paperclip, ExternalLink, Search, Car } from 'lucide-react'

const VEHICLE_TYPES = ['car', 'van', 'truck', 'excavator', 'grader', 'compactor', 'pile_driver', 'concrete_mixer', 'tractor_trailer', 'forklift', 'telehandler', 'cherry_picker', 'crane_truck', 'crane', 'pickup_4x4', 'mobile_workshop', 'generator', 'other']
const VEHICLE_STATUSES = ['active', 'service', 'inactive']

const STATUS_COLORS = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    service: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600',
}

export default function FleetManagement() {
    const { t } = useTranslation()
    const [vehicles, setVehicles] = useState([])
    const [sites, setSites] = useState([])
    const [users, setUsers] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)


    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState(null)
    const [activeTab, setActiveTab] = useState('info') // 'info' | 'sites' | 'drivers'
    const [saving, setSaving] = useState(false)

    // Form state
    const [form, setForm] = useState({
        name: '', plate_number: '', chassis_number: '', type: 'van', year: new Date().getFullYear(), status: 'active', notes: ''
    })
    const [selectedSiteIds, setSelectedSiteIds] = useState([])
    const [selectedUserIds, setSelectedUserIds] = useState([])
    const [siteSearch, setSiteSearch] = useState('')
    const [userSearch, setUserSearch] = useState('')
    const [mainTab, setMainTab] = useState('cars') // 'cars' | 'equipment' | 'report' | 'categories'
    const CAR_TYPES = ['car', 'van', 'pickup_4x4', 'truck'] // Fallback legacy types
    const [showLogModal, setShowLogModal] = useState(false)
    const [logEquipment, setLogEquipment] = useState(null)
    const [logForm, setLogForm] = useState({ date: new Date().toISOString().split('T')[0], site_id: '', operator_id: '', is_used: true, refueled: false, refuel_liters: '', notes: '' })
    
    // Document upload modal
    const [showDocModal, setShowDocModal] = useState(false)
    const [editingDocId, setEditingDocId] = useState(null)
    const [docFile, setDocFile] = useState(null)
    const [docForm, setDocForm] = useState({ name: '', expiry_date: '' })
    const [uploadingDoc, setUploadingDoc] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [catSearchQuery, setCatSearchQuery] = useState('')
    const [filterSiteId, setFilterSiteId] = useState('')

    // Fleet report
    const [reportData, setReportData] = useState([])
    const [reportLoading, setReportLoading] = useState(false)
    const [reportDateFrom, setReportDateFrom] = useState(() => {
        const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
    })
    const [reportDateTo, setReportDateTo] = useState(() => new Date().toISOString().split('T')[0])

    // Categories
    const [showCatModal, setShowCatModal] = useState(false)
    const [editingCat, setEditingCat] = useState(null)
    const [catForm, setCatForm] = useState({ name: '', group: 'equipment', icon: 'tractor' })
    const [savingCat, setSavingCat] = useState(false)

    const fetchReport = useCallback(async () => {
        setReportLoading(true)
        try {
            const res = await api.get('/admin/vehicles/fleet-report', { params: { date_from: reportDateFrom, date_to: reportDateTo } })
            setReportData(res.data || [])
        } catch (e) {
            console.error(e)
        } finally {
            setReportLoading(false)
        }
    }, [reportDateFrom, reportDateTo])

    const filteredVehicles = vehicles.filter(v => {
        const cat = categories.find(c => c.name === v.type);
        const group = cat ? cat.group : (CAR_TYPES.includes(v.type) ? 'car' : 'equipment');
        return mainTab === 'cars' ? group === 'car' : group === 'equipment';
    }).filter(v => 
        !searchQuery || 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (v.plate_number && v.plate_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.chassis_number && v.chassis_number.toLowerCase().includes(searchQuery.toLowerCase()))
    ).filter(v => !filterSiteId || (v.site_ids && v.site_ids.includes(filterSiteId)))

    const filteredSites = sites.filter(s => (s.name || '').toLowerCase().includes(siteSearch.toLowerCase()) || (s.county || '').toLowerCase().includes(siteSearch.toLowerCase()))
    
    // Filter users dynamically based on selected sites
    const validUserIds = new Set();
    if (selectedSiteIds.length > 0) {
        selectedSiteIds.forEach(siteId => {
            const site = sites.find(s => s.id === siteId);
            if (site && site.assigned_worker_ids) {
                site.assigned_worker_ids.forEach(id => validUserIds.add(id));
            }
        });
    }
    
    const filteredUsers = users.filter(u => {
        // Must be in the valid user set if any sites are selected
        if (selectedSiteIds.length > 0 && !validUserIds.has(u.id)) return false;
        
        return `${u.first_name} ${u.last_name} ${u.employee_code}`.toLowerCase().includes(userSearch.toLowerCase());
    })

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(catSearchQuery.toLowerCase())
    )
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [previewDoc, setPreviewDoc] = useState(null)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [vRes, sRes, uRes, cRes] = await Promise.all([
                api.get('/admin/vehicles', { params: { page_size: 1000 } }),
                api.get('/admin/sites/', { params: { page_size: 1000 } }),
                api.get('/admin/users/', { params: { is_active: true, page_size: 1000 } }),
                api.get('/admin/fleet-categories')
            ])
            setVehicles(Array.isArray(vRes.data?.vehicles) ? vRes.data.vehicles : (Array.isArray(vRes.data) ? vRes.data : []))
            setSites(Array.isArray(sRes.data?.sites) ? sRes.data.sites : (Array.isArray(sRes.data) ? sRes.data : []))
            setUsers(Array.isArray(uRes.data?.users) ? uRes.data.users : (Array.isArray(uRes.data) ? uRes.data : []))
            setCategories(cRes.data || [])
            setError(null)
        } catch (e) {
            setError(t('fleet.errors.load'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    useEffect(() => {
        if (mainTab === 'report') {
            fetchReport()
        }
    }, [mainTab, reportDateFrom, reportDateTo, fetchReport])

    const openAdd = () => {
        setEditingVehicle(null)
        setForm({ name: '', plate_number: '', chassis_number: '', type: mainTab === 'cars' ? 'van' : 'excavator', year: new Date().getFullYear(), status: 'active', notes: '' })
        setSelectedSiteIds([])
        setSelectedUserIds([])
        setActiveTab('info')
        setShowModal(true)
    }

    const openEdit = (v, initialTab = 'info') => {
        setEditingVehicle(v)
        setForm({ name: v.name, plate_number: v.plate_number || '', chassis_number: v.chassis_number || '', type: v.type || 'van', year: v.year || new Date().getFullYear(), status: v.status || 'active', notes: v.notes || '' })
        setSelectedSiteIds((v.site_ids || []))
        setSelectedUserIds((v.user_ids || []))
        setActiveTab(initialTab)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) return
        setSaving(true)
        try {
            const payload = { ...form, site_ids: selectedSiteIds, user_ids: selectedUserIds }
            if (editingVehicle) {
                await api.put(`/admin/vehicles/${editingVehicle.id}`, payload)
            } else {
                await api.post('/admin/vehicles', payload)
            }
            setShowModal(false)
            fetchAll()
        } catch (e) {
            alert(t('fleet.errors.save'))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await api.delete(`/admin/vehicles/${deleteTarget.id}`)
            setDeleteTarget(null)
            fetchAll()
        } catch { alert(t('fleet.errors.delete')) }
    }

    const handleSaveCat = async () => {
        if (!catForm.name.trim()) return
        setSavingCat(true)
        try {
            if (editingCat) {
                await api.put(`/admin/fleet-categories/${editingCat.id}`, catForm)
            } else {
                await api.post('/admin/fleet-categories', catForm)
            }
            setShowCatModal(false)
            setSuccess('Categorie salvată cu succes!')
            setTimeout(() => setSuccess(null), 3000)
            fetchAll()
        } catch (e) {
            setError(e.response?.data?.detail || 'Eroare salvare categorie')
        } finally {
            setSavingCat(false)
        }
    }

    const handleDeleteCat = async (id) => {
        if (!window.confirm('Sigur vrei să ștergi această categorie? Utilajele existente își vor păstra numele categoriei.')) return;
        try {
            await api.delete(`/admin/fleet-categories/${id}`)
            setSuccess('Categorie ștearsă cu succes!')
            setTimeout(() => setSuccess(null), 3000)
            fetchAll()
        } catch (e) {
            setError(e.response?.data?.detail || 'Eroare ștergere categorie')
        }
    }

    const toggleId = (id, list, setList) => {
        setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleSaveLog = async () => {
        try {
            await api.post(`/admin/vehicles/equipment-logs`, {
                vehicle_id: logEquipment.id,
                site_id: logForm.site_id || null,
                operator_id: logForm.operator_id || null,
                date: logForm.date,
                is_used: logForm.is_used,
                refueled: logForm.refueled,
                refuel_liters: logForm.refueled ? parseFloat(logForm.refuel_liters || 0) : 0,
                notes: logForm.notes
            })
            setShowLogModal(false)
            setLogEquipment(null)
            fetchAll()
        } catch (e) {
            setError('Eroare salvare pontaj utilaj: ' + (e.response?.data?.detail || e.message))
        }
    }

    const handleUploadDoc = async () => {
        if (!docFile || !editingVehicle) return
        setUploadingDoc(true)
        const fd = new FormData()
        fd.append('file', docFile)
        if (docForm.name) fd.append('custom_name', docForm.name)
        if (docForm.expiry_date) fd.append('expiry_date', docForm.expiry_date)

        try {
            const res = await api.post(`/admin/vehicles/${editingVehicle.id}/upload-document`, fd, { headers: { 'Content-Type': 'multipart/form-data'} })
            setEditingVehicle(res.data)
            fetchAll()
            setShowDocModal(false)
            setDocFile(null)
            setDocForm({ name: '', expiry_date: '' })
            setSuccess('Document încărcat cu succes!')
            setTimeout(() => setSuccess(null), 3500)
        } catch (err) {
            setError('Eroare incarcare document: ' + (err.response?.data?.detail || err.message))
        } finally {
            setUploadingDoc(false)
        }
    }

    const handleSaveDocEdit = async () => {
        if (!editingVehicle || !editingDocId) return;
        setUploadingDoc(true);
        try {
            const updatedDocs = editingVehicle.documents.map(d => {
                if (d.id === editingDocId) {
                    return { ...d, name: docForm.name, expiry_date: docForm.expiry_date || null };
                }
                return d;
            });
            const res = await api.put(`/admin/vehicles/${editingVehicle.id}`, { documents: updatedDocs });
            setEditingVehicle(res.data);
            fetchAll();
            setShowDocModal(false);
            setEditingDocId(null);
            setDocForm({ name: '', expiry_date: '' });
            setSuccess('Document actualizat cu succes!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            setError('Eroare actualizare document: ' + (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Date invalide'));
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm('Sigur vrei să ștergi acest document? Această acțiune este ireversibilă.')) return;
        try {
            const updatedDocs = editingVehicle.documents.filter(d => d.id !== docId);
            const res = await api.put(`/admin/vehicles/${editingVehicle.id}`, { documents: updatedDocs });
            setEditingVehicle(res.data);
            fetchAll();
            setSuccess('Document șters cu succes!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (e) {
            setError('Eroare ștergere document: ' + (typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Date invalide'));
        }
    };

    const columns = [
        {
            key: 'name', label: t('common.name'), sortable: true,
            render: (v) => (
                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{v.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 w-full max-w-[220px]">
                        {v.plate_number && <p className="text-[11px] font-semibold text-slate-500 shrink-0">{v.plate_number}</p>}
                        {v.chassis_number && <p className="text-[11px] font-semibold text-slate-400 truncate flex-1 min-w-0" title={v.chassis_number}>SN: {v.chassis_number}</p>}
                    </div>
                </div>
            )
        },
        {
            key: 'type', label: t('fleet.type'), sortable: true,
            render: (v) => (
                <div className="flex flex-col gap-1.5 items-start">
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{t(`fleet.types.${v.type}`)}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[v.status] || STATUS_COLORS.inactive}`}>
                        {t(`fleet.statuses.${v.status}`)}
                    </span>
                </div>
            )
        },
        { key: 'year', label: t('fleet.year'), sortable: true },
        {
            key: 'site_ids', label: 'Șantiere Alocate',
            render: (v) => {
                const vehicleSites = (v.site_ids || []).map(id => sites.find(s => s.id === id)).filter(Boolean)
                if (vehicleSites.length === 0) return <span className="text-slate-300 dark:text-slate-600">—</span>
                if (vehicleSites.length === 1) return <button onClick={() => navigate('/admin/sites', { state: { openSiteId: vehicleSites[0].id } })} className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium text-left">{vehicleSites[0].name}</button>
                return (
                    <div className="flex flex-col gap-0.5">
                        <button onClick={() => navigate('/admin/sites', { state: { openSiteId: vehicleSites[0].id } })} className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium text-left">{vehicleSites[0].name}</button>
                        <span className="text-xs text-slate-400">+{vehicleSites.length - 1} alte șantiere</span>
                    </div>
                )
            }
        },
        {
            key: 'user_ids', label: t('fleet.drivers'),
            render: (v) => {
                const count = v.user_ids?.length || 0
                if (count === 0) return <span className="text-slate-500 dark:text-slate-400 text-sm">—</span>
                
                const uList = v.user_ids.map(id => users.find(u => u.id === id)).filter(Boolean)
                if (uList.length === 0) return <span className="text-slate-500 dark:text-slate-400 text-sm">—</span>
                
                if (uList.length === 1) {
                    const u = uList[0]
                    return (
                        <div 
                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 -ml-1 rounded transition-colors"
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/employees/${u.id}`); }}
                        >
                            {u.avatar_path ? (
                                <img src={u.avatar_path.startsWith('http') ? u.avatar_path : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${u.avatar_path}`} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" onError={e => { e.target.style.display = 'none' }} />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800">
                                    {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                                </div>
                            )}
                            <span className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">{`${u.first_name} ${u.last_name}`}</span>
                        </div>
                    )
                }

                return (
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {uList.slice(0, 3).map((u, i) => (
                                u.avatar_path ? (
                                    <img key={i} src={u.avatar_path.startsWith('http') ? u.avatar_path : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${u.avatar_path}`} alt="" className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-900 relative" style={{ zIndex: 3 - i }} onError={e => { e.target.style.display = 'none' }} />
                                ) : (
                                    <div key={i} className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 ring-2 ring-white dark:ring-slate-900 relative" style={{ zIndex: 3 - i }}>
                                        {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                                    </div>
                                )
                            ))}
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">({count})</span>
                    </div>
                )
            }
        },
        {
            key: 'docs', label: 'Documente',
            render: (v) => {
                let docs = v.documents;
                if (typeof docs === 'string') {
                    try { docs = JSON.parse(docs); } catch (e) { docs = []; }
                }
                const docsCount = docs?.length || 0;
                if (docsCount === 0) return <span className="text-slate-300 dark:text-slate-600">—</span>;
                
                let closestDoc = null;
                let daysLeft = null;
                const now = new Date();
                
                docs.forEach(doc => {
                    if (doc.expiry_date) {
                        const exp = new Date(doc.expiry_date);
                        const diffTime = exp - now;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (closestDoc === null || diffDays < daysLeft) {
                            closestDoc = doc;
                            daysLeft = diffDays;
                        }
                    }
                });

                let displayDoc = closestDoc || docs[0];

                return (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if (docsCount === 1) {
                                setPreviewDoc({url: docs[0].url, name: docs[0].name})
                            } else {
                                openEdit(v, 'documents'); 
                            }
                        }} 
                        className="flex flex-col items-start gap-1 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors text-left w-full max-w-[180px] -ml-1.5"
                        title={docsCount > 1 ? `Vezi toate cele ${docsCount} documente` : "Vezi documentul"}
                    >
                        <div className="flex items-center gap-1.5 w-full">
                            <div className="p-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded shrink-0">
                                <Paperclip className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {displayDoc.name || 'Document atașat'}
                            </span>
                            {docsCount > 1 && (
                                <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                                    +{docsCount - 1}
                                </span>
                            )}
                        </div>
                        
                        {displayDoc.expiry_date && daysLeft !== null && (
                            <div className="flex items-center gap-1.5 mt-0.5 pl-[26px]">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                    {new Date(displayDoc.expiry_date).toLocaleDateString('ro-RO', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${daysLeft < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : daysLeft <= 30 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {daysLeft < 0 ? 'Expirat' : `${daysLeft} zile`}
                                </span>
                            </div>
                        )}
                    </button>
                )
            }
        },
        {
            key: '_actions', label: t('common.actions'),
            render: (v) => (
                <div className="flex items-center justify-end gap-1">
                    {!CAR_TYPES.includes(v.type) && (
                        <button onClick={() => { setLogEquipment(v); setShowLogModal(true); setLogForm({ date: new Date().toISOString().split('T')[0], site_id: v.site_ids?.[0] || '', operator_id: v.user_ids?.[0] || '', is_used: true, refueled: false, refuel_liters: '', notes: '' }) }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="Pontaj Zilnic">
                            <CalendarClock className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => openEdit(v)} title={t('common.edit')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(v)} title={t('common.delete')} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        },
    ]

    const categoryColumns = [
        {
            key: 'name', label: 'NUME',
            render: (c) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                </div>
            )
        },
        {
            key: 'group', label: 'GRUP',
            render: (c) => (
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {c.group === 'car' ? 'Mașină (Flotă)' : 'Utilaj / Echipament'}
                </span>
            )
        },
        {
            key: '_actions', label: t('common.actions'),
            render: (c) => (
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditingCat(c); setCatForm({ name: c.name, group: c.group, icon: c.icon || 'tractor' }); setShowCatModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCat(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ]

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <CalendarClock className="w-5 h-5" />
                        </div>
                        {t('fleet.title')}
                    </h1>
                </div>

                {/* Main Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit shadow-inner border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-full">
                    <button
                        onClick={() => setMainTab('cars')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap ${mainTab === 'cars' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shadow-none'}`}
                    >
                        Parc Auto (Mașini)
                    </button>
                    <button
                        onClick={() => setMainTab('equipment')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap ${mainTab === 'equipment' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shadow-none'}`}
                    >
                        Utilaje
                    </button>
                    <button
                        onClick={() => { setMainTab('report'); fetchReport(); }}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap ${mainTab === 'report' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shadow-none'}`}
                    >
                        <BarChart2 className="w-4 h-4" />
                        Raport Consum
                    </button>
                    <button
                        onClick={() => setMainTab('categories')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap ${mainTab === 'categories' ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shadow-none'}`}
                    >
                        Categorii / Tipuri
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm flex justify-between items-center shadow-sm">
                    <span className="flex items-center gap-2"><CheckIcon className="w-5 h-5" /> {success}</span>
                    <button onClick={() => setSuccess(null)}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
                </div>
            )}

            {mainTab === 'categories' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-3xl">
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Caută categorie..."
                                    value={catSearchQuery}
                                    onChange={(e) => setCatSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 h-10 border border-slate-200 dark:border-slate-700 rounded-full text-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white shadow-inner"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => { setEditingCat(null); setCatForm({ name: '', group: 'equipment', icon: 'tractor' }); setShowCatModal(true); }}
                            className="px-5 h-10 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Adaugă Categorie
                        </button>
                    </div>

                    <DataTable
                        columns={categoryColumns}
                        data={filteredCategories}
                        loading={loading}
                        defaultPageSize={25}
                    />
                </div>
            )}

            {mainTab !== 'report' && mainTab !== 'categories' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-3xl">
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <select
                                value={filterSiteId}
                                onChange={e => setFilterSiteId(e.target.value)}
                                className="h-10 px-3 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            >
                                <option value="">Toate Șantierele</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <div className="relative group flex items-center w-full sm:w-auto">
                                <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('fleet.search_vehicle')}
                                    className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                />
                            {searchQuery && (
                                <div className="absolute right-1.5 flex items-center gap-1 bg-indigo-600 px-2 py-1 rounded-full shadow-sm">
                                    <span className="text-[10px] font-bold text-white">
                                        {filteredVehicles.length}/{vehicles.length}
                                    </span>
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="p-0.5 hover:bg-indigo-700 rounded-full transition-colors ml-0.5 cursor-pointer"
                                    >
                                        <X className="w-3 h-3 text-white/80 hover:text-white" />
                                    </button>
                                </div>
                            )}
                            </div>
                        </div>

                        <button
                            onClick={openAdd}
                            className="px-5 h-10 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            {t('fleet.add_vehicle')}
                        </button>
                    </div>

                    <DataTable
                        columns={columns}
                        data={filteredVehicles}
                        loading={loading}
                        defaultPageSize={25}
                    />
                </div>
            )}

            {/* Fleet Report Tab */}
            {mainTab === 'report' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">De la</label>
                            <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Până la</label>
                            <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
                        </div>
                        {reportLoading && (
                            <div className="flex items-center gap-2 mb-2 ml-2 text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Se actualizează...</span>
                            </div>
                        )}
                    </div>

                    {/* Report Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Vehicul / Utilaj</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Nr. Inmatriculare</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Tip</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Zile Lucrate</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Zile Inactive</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Motorină (L)</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Alimentari</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Ultimul Operator</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {reportLoading ? (
                                    <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></td></tr>
                                ) : reportData.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">Niciun log înregistrat în perioada selectată. Generează raportul de mai sus.</td></tr>
                                ) : reportData.map(r => (
                                    <tr key={r.vehicle_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{r.vehicle_name}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.registration}</td>
                                        <td className="px-4 py-3 text-slate-500">{r.type}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-block bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold text-xs">{r.days_used}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-block bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full text-xs">{r.days_idle}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-violet-600 dark:text-violet-400">{r.total_fuel_liters > 0 ? `${r.total_fuel_liters} L` : '—'}</td>
                                        <td className="px-4 py-3 text-center text-slate-600">{r.refuel_events || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.last_operator || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {reportData.length > 0 && (
                                <tfoot className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">TOTAL</td>
                                        <td className="px-4 py-3 text-center font-bold text-emerald-700">{reportData.reduce((s, r) => s + r.days_used, 0)}</td>
                                        <td className="px-4 py-3 text-center font-bold text-slate-500">{reportData.reduce((s, r) => s + r.days_idle, 0)}</td>
                                        <td className="px-4 py-3 text-center font-bold text-violet-700">{reportData.reduce((s, r) => s + r.total_fuel_liters, 0).toFixed(1)} L</td>
                                        <td className="px-4 py-3 text-center font-bold">{reportData.reduce((s, r) => s + r.refuel_events, 0)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                    <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        {editingVehicle ? t('fleet.edit_vehicle') : 'Vehicul Nou'}
                                    </h2>
                                    {editingVehicle && <p className="text-xs text-slate-400 mt-0.5">{editingVehicle.name} · {editingVehicle.plate_number}</p>}
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs — pill style */}
                        <div className="flex gap-1.5 px-6 pt-4 pb-2">
                            {[
                                { key: 'info', label: 'Informații' },
                                { key: 'sites', label: 'Alocări Șantiere' },
                                { key: 'drivers', label: 'Șoferi / Operatori' },
                                ...(editingVehicle ? [{ key: 'documents', label: 'Documente' }] : [])
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                        activeTab === tab.key
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {/* Info Tab */}
                            {activeTab === 'info' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                            {t('common.name')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder={t('fleet.placeholders.name')}
                                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('fleet.plate_number')}
                                            </label>
                                            <input
                                                value={form.plate_number}
                                                onChange={e => setForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))}
                                                placeholder={t('fleet.placeholders.plate')}
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Serie Șasiu / Utilaj
                                            </label>
                                            <input
                                                value={form.chassis_number}
                                                onChange={e => setForm(f => ({ ...f, chassis_number: e.target.value.toUpperCase() }))}
                                                placeholder="Serie identificare"
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('fleet.year')}
                                            </label>
                                            <input
                                                type="number"
                                                value={form.year}
                                                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                                                min="1990" max={new Date().getFullYear() + 1}
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('fleet.type')}
                                            </label>
                                            <select
                                                value={form.type}
                                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            >
                                                {(categories.length > 0 
                                                    ? categories.filter(cat => cat.group === (mainTab === 'cars' ? 'car' : 'equipment')).map(cat => ({ name: cat.name, label: cat.name }))
                                                    : VEHICLE_TYPES.filter(vt => mainTab === 'cars' ? CAR_TYPES.includes(vt) : !CAR_TYPES.includes(vt)).map(vt => ({ name: vt, label: t(`fleet.types.${vt}`) }))
                                                ).map(cat => (
                                                    <option key={cat.name} value={cat.name}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('fleet.status')}
                                            </label>
                                            <select
                                                value={form.status}
                                                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                            >
                                                {VEHICLE_STATUSES.map(vs => (
                                                    <option key={vs} value={vs}>{t(`fleet.statuses.${vs}`)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('fleet_modal.notes')}</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                            rows={3}
                                            placeholder={t('fleet.placeholders.notes')}
                                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Sites Tab */}
                            {activeTab === 'sites' && (
                                <div className="space-y-2">
                                    <div className="mb-3">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                                            {t('fleet.sites_desc')}
                                        </p>
                                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                                            <input
                                                type="checkbox"
                                                checked={filteredSites.length > 0 && filteredSites.every(s => selectedSiteIds.includes(s.id))}
                                                onChange={(e) => {
                                                    const allIds = filteredSites.map(s => s.id);
                                                    if (e.target.checked) {
                                                        setSelectedSiteIds([...new Set([...selectedSiteIds, ...allIds])]);
                                                    } else {
                                                        setSelectedSiteIds(selectedSiteIds.filter(id => !allIds.includes(id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Selectează Toate</span>
                                        </label>
                                    </div>
                                    <div className="relative mb-4">
                                        <input type="text" placeholder="Caută șantier..." value={siteSearch} onChange={e => setSiteSearch(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                    </div>
                                    {filteredSites.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-8">{t('common.no_data')}</p>
                                    ) : (
                                        filteredSites.map(s => (
                                            <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedSiteIds.includes(s.id) ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSiteIds.includes(s.id)}
                                                    onChange={() => toggleId(s.id, selectedSiteIds, setSelectedSiteIds)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="flex-1 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                                                        {s.county && <p className="text-xs text-slate-400">{s.county}</p>}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                        <span className="text-blue-600 dark:text-blue-400 font-bold">{s.assigned_workers || 0}</span> Muncitori
                                                    </div>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Drivers Tab */}
                            {activeTab === 'drivers' && (
                                <div className="space-y-2">
                                    <div className="mb-3">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                                            {t('fleet.drivers_desc')}
                                        </p>
                                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                                            <input
                                                type="checkbox"
                                                checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id))}
                                                onChange={(e) => {
                                                    const allIds = filteredUsers.map(u => u.id);
                                                    if (e.target.checked) {
                                                        setSelectedUserIds([...new Set([...selectedUserIds, ...allIds])]);
                                                    } else {
                                                        setSelectedUserIds(selectedUserIds.filter(id => !allIds.includes(id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Selectează Toți</span>
                                        </label>
                                    </div>
                                    <div className="relative mb-4">
                                        <input type="text" placeholder="Caută șofer/operator..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                    </div>
                                    {filteredUsers.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-8">{t('common.no_data')}</p>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedUserIds.includes(u.id) ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.includes(u.id)}
                                                    onChange={() => toggleId(u.id, selectedUserIds, setSelectedUserIds)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{u.last_name} {u.first_name}</p>
                                                    <p className="text-xs text-slate-400 font-mono">{u.employee_code} · {u.role_name}</p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Documents Tab */}
                            {activeTab === 'documents' && editingVehicle && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">Documente Mașină</h3>
                                            <p className="text-xs text-slate-500">Adaugă taloane, chitanțe, asigurări.</p>
                                        </div>
                                        <button onClick={() => setShowDocModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
                                            <UploadCloud className="w-4 h-4 text-blue-500" />
                                            Adaugă Document
                                        </button>
                                    </div>
                                    {editingVehicle.documents && editingVehicle.documents.length > 0 ? (
                                        <div className="space-y-2">
                                            {(typeof editingVehicle.documents === 'string' ? JSON.parse(editingVehicle.documents) : editingVehicle.documents).map(doc => {
                                                const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                                                const isExpiringSoon = !isExpired && doc.expiry_date && (new Date(doc.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
                                                return (
                                                <div key={doc.id} className={`flex justify-between items-center p-3 border rounded-xl hover:bg-slate-50 transition-colors ${
                                                    isExpired ? 'border-red-300 bg-red-50/50' : isExpiringSoon ? 'border-orange-300 bg-orange-50/50' : 'border-slate-200'
                                                }`}>
                                                    <div className="flex items-center gap-3">
                                                        <FileText className={`w-5 h-5 ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : 'text-blue-500'}`} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <button type="button" onClick={() => setPreviewDoc({url: doc.url, name: doc.name})} className="text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline">
                                                                    {doc.name}
                                                                </button>
                                                                {isExpired && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase">Expirat</span>}
                                                                {isExpiringSoon && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded uppercase">Expiră curând</span>}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                Adăugat: {doc.uploaded_at}
                                                                {doc.expiry_date && <span className="ml-2 font-medium">| Expiră la: {doc.expiry_date}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <button type="button" onClick={() => { setEditingDocId(doc.id); setDocForm({ name: doc.name || '', expiry_date: doc.expiry_date || '' }); setShowDocModal(true); }} className="p-2 hover:bg-blue-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors" title="Editează detalii">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button type="button" onClick={() => window.open(doc.url, "_blank")} title="Deschide într-o filă nouă" className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-blue-600 transition-colors">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </button>
                                                        <button type="button" onClick={() => handleDeleteDoc(doc.id)} className="p-2 hover:bg-red-100 rounded-full text-slate-400 hover:text-red-600 transition-colors" title="Șterge document">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-sm text-slate-400">Niciun document încărcat.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.name.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('common.delete_confirm')}</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                            {t('fleet.delete_confirm_msg')} <strong>{deleteTarget.name}</strong>? {t('common.cannot_be_undone')}
                        </p>
                        <div className="flex justify-end gap-3 flex-wrap">
                            <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button onClick={() => handleDelete(deleteTarget.id)} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => setPreviewDoc(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 px-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500"/> {previewDoc.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => window.open(previewDoc.url, '_blank')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-blue-600 transition-colors" title="Deschide într-o filă nouă">
                                    <ExternalLink className="w-5 h-5" />
                                </button>
                                <button onClick={() => setPreviewDoc(null)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-red-500 transition-colors" title="Închide">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 md:p-4">
                            <iframe src={previewDoc.url} className="w-full h-full bg-white rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner block" title="Document Preview" />
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Log Modal for Equipment */}
            {showLogModal && logEquipment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Pontaj Zilnic Utilaj: {logEquipment.name}</h2>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dată</label>
                                <input type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Proiect / Șantier</label>
                                <select value={logForm.site_id} onChange={e => setLogForm(f => ({ ...f, site_id: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400">
                                    <option value="">-- Neselectat --</option>
                                    {sites.filter(s => (logEquipment.site_ids || []).includes(s.id)).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <div className="text-[11px] text-slate-400 mt-1">Poți selecta doar șantierele la care este alocat pe tab-ul general.</div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Operator</label>
                                <select value={logForm.operator_id} onChange={e => setLogForm(f => ({ ...f, operator_id: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400">
                                    <option value="">-- Neselectat --</option>
                                    {users.filter(u => (logEquipment.user_ids || []).includes(u.id)).map(u => (
                                        <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>
                                    ))}
                                </select>
                            </div>

                            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                                <input type="checkbox" checked={logForm.is_used} onChange={e => setLogForm(f => ({ ...f, is_used: e.target.checked }))} className="w-5 h-5 text-blue-600 rounded" />
                                <span className="text-sm font-semibold text-slate-800">Utilajat A Fost Folosit</span>
                            </label>

                            <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                <label className="flex items-center gap-3 cursor-pointer shrink-0">
                                    <input type="checkbox" checked={logForm.refueled} onChange={e => setLogForm(f => ({ ...f, refueled: e.target.checked }))} className="w-5 h-5 text-emerald-600 rounded" />
                                    <span className="text-sm font-semibold text-slate-800">Alimentat?</span>
                                </label>
                                {logForm.refueled && (
                                    <div className="flex-1 flex gap-2 items-center">
                                        <input type="number" min="0" step="0.1" value={logForm.refuel_liters} onChange={e => setLogForm(f => ({ ...f, refuel_liters: e.target.value }))} placeholder="0" className="w-full px-3 py-1.5 border border-slate-300 rounded-full text-sm" />
                                        <span className="text-xs font-bold text-slate-500">Litri</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Observații</label>
                                <textarea value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="Probleme tehnice, accidente..." rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 resize-none"></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowLogModal(false)} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                                Anulează
                            </button>
                            <button onClick={handleSaveLog} className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                                Salvează Pontaj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Upload Modal */}
            {showDocModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingDocId ? 'Editează Document' : 'Adaugă Document'}</h2>
                            <button onClick={() => { setShowDocModal(false); setEditingDocId(null); setDocForm({ name: '', expiry_date: '' }); }} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            {!editingDocId && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Alege Fișierul *</label>
                                    <div className="relative group cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept=".pdf,image/*" 
                                            onChange={(e) => setDocFile(e.target.files[0])} 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                        />
                                        <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors ${docFile ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 group-hover:bg-slate-100 dark:group-hover:bg-slate-700'}`}>
                                            <UploadCloud className={`w-8 h-8 mb-2 ${docFile ? 'text-blue-500' : 'text-slate-400'}`} />
                                            <p className={`text-sm font-semibold text-center ${docFile ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {docFile ? docFile.name : 'Apasă aici pentru a alege un document'}
                                            </p>
                                            {!docFile && <p className="text-xs text-slate-400 mt-1">PDF sau Imagine, maxim 10 MB</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Denumire Document (Opțional)</label>
                                <input type="text" value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: RCA Generali 2026" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
                                <p className="text-[11px] text-slate-400 mt-1">Dacă lași gol, se va folosi numele original al fișierului.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dată Expirare (Opțional)</label>
                                <input type="date" value={docForm.expiry_date} onChange={e => setDocForm(f => ({ ...f, expiry_date: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" />
                                <p className="text-[11px] text-slate-400 mt-1">Vei primi alerte cu 30 de zile înainte de expirare.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setShowDocModal(false); setEditingDocId(null); setDocForm({ name: '', expiry_date: '' }); }} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                                Anulează
                            </button>
                            <button onClick={editingDocId ? handleSaveDocEdit : handleUploadDoc} disabled={uploadingDoc || (!editingDocId && !docFile)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors">
                                {uploadingDoc && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingDocId ? 'Salvează Modificări' : 'Salvează Document'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Add / Edit Modal */}
            {showCatModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingCat ? 'Editează Categoria' : 'Adaugă Categorie'}</h2>
                            <button onClick={() => setShowCatModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nume Categorie <span className="text-red-500">*</span></label>
                                <input value={catForm.name} onChange={e => setCatForm(f => ({...f, name: e.target.value}))} placeholder="Ex: Macara Turn" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Grup</label>
                                <select value={catForm.group} onChange={e => setCatForm(f => ({...f, group: e.target.value}))} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-400">
                                    <option value="equipment">Utilaj / Echipament</option>
                                    <option value="car">Mașină (Flotă Auto)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Anulează</button>
                                <button onClick={handleSaveCat} disabled={savingCat} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors">
                                    {savingCat && <Loader2 className="w-4 h-4 animate-spin" />} Salvează
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
