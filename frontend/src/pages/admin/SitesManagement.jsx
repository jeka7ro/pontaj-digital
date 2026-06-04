import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon broken paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})
import { useAdminStore } from '../../store/adminStore'
import useViewPreferencesStore from '../../store/viewPreferencesStore'
import api from '../../lib/api'
import {
    Building2, Plus, Search, Edit2, MapPin, Calendar, CheckCircle,
    Clock, XCircle, Zap, Hash, Loader2, Camera, X, Save, Trash2
} from 'lucide-react'
import ViewToggle from '../../components/ViewToggle'
import Pagination from '../../components/Pagination'
import PhotoUpload from '../../components/PhotoUpload'
import PhotoGallery from '../../components/PhotoGallery'
import { useUIStore } from '../../store/uiStore'
import SiteDetailView from '../../components/SiteDetailView'
import { useLocation } from 'react-router-dom'

const PAGE_ID = 'admin-sites'

const EMPTY_SITE = {
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofence_radius: 100,
    description: '',
    status: 'active',
    client_id: '',
    client_name: '',
    panel_count: '',
    system_power_kw: '',
    installation_type: 'residential',
    organization_id: '',
    work_start_time: '07:00',
    work_end_time: '16:00',
    lunch_break_start: '12:00',
    lunch_break_end: '13:00',
    max_overtime_minutes: 120
}

const MiniMapSelector = ({ latitude, longitude, onLocationChange }) => {
    const mapRef = useRef(null)
    const mapInstance = useRef(null)
    const markerInstance = useRef(null)

    useEffect(() => {
        if (!mapRef.current) return
        
        const defaultLat = latitude ? parseFloat(latitude) : 45.9432 // Romania center
        const defaultLon = longitude ? parseFloat(longitude) : 24.9668
        const zoom = latitude && longitude ? 15 : 6

        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([defaultLat, defaultLon], zoom)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap',
                maxZoom: 19
            }).addTo(mapInstance.current)

            mapInstance.current.on('click', (e) => {
                const { lat, lng } = e.latlng
                onLocationChange(lat, lng)
            })
        }
        
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove()
                mapInstance.current = null
            }
        }
    }, [])

    useEffect(() => {
        if (!mapInstance.current) return
        if (latitude && longitude) {
            const lat = parseFloat(latitude)
            const lon = parseFloat(longitude)
            mapInstance.current.setView([lat, lon], 15)
            
            if (markerInstance.current) {
                markerInstance.current.setLatLng([lat, lon])
            } else {
                markerInstance.current = L.marker([lat, lon]).addTo(mapInstance.current)
            }
        } else {
            if (markerInstance.current) {
                markerInstance.current.remove()
                markerInstance.current = null
            }
        }
    }, [latitude, longitude])

    return (
        <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative" style={{ height: 200, zIndex: 10 }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-xs px-2 py-1 rounded shadow text-slate-600 font-semibold z-[400] pointer-events-none">
                {latitude && longitude ? 'Locație selectată' : 'Click pe hartă pentru a selecta locația'}
            </div>
        </div>
    )
}

export default function SitesManagement() {
    const { showDialog, showToast } = useUIStore()
    const { token, admin } = useAdminStore()
    const [sites, setSites] = useState([])
    const [totalSites, setTotalSites] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('active') // Default to active sites
    const [stats, setStats] = useState(null)
    const [selectedSite, setSelectedSite] = useState(null) // For photo modal
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingSite, setEditingSite] = useState(null)
    const [activeModalTab, setActiveModalTab] = useState('info')
    const [teams, setTeams] = useState([])
    const [selectedTeamIds, setSelectedTeamIds] = useState([])
    const [formData, setFormData] = useState(EMPTY_SITE)
    const [saving, setSaving] = useState(false)
    const [detailSite, setDetailSite] = useState(null)
    const [clients, setClients] = useState([])

    
    // Bulk Select states
    const [selectedSiteIds, setSelectedSiteIds] = useState([])

    // View preferences
    const preferences = useViewPreferencesStore((state) => state.getPagePreferences(PAGE_ID))
    const setViewMode = useViewPreferencesStore((state) => state.setViewMode)
    const setPageSize = useViewPreferencesStore((state) => state.setPageSize)
    const setCurrentPage = useViewPreferencesStore((state) => state.setCurrentPage)

    const location = useLocation()
    
    useEffect(() => {
        fetchSites()
        fetchStats()
        fetchTeams()
        fetchClients()
    }, [search, statusFilter, preferences.currentPage, preferences.pageSize])

    // Auto-open site from location state (e.g., from Fleet Management)
    useEffect(() => {
        if (location.state?.openSiteId && sites.length > 0 && !detailSite) {
            const siteToOpen = sites.find(s => s.id === location.state.openSiteId)
            if (siteToOpen) {
                setDetailSite(siteToOpen)
                // Clear state so it doesn't reopen if they refresh
                window.history.replaceState({}, document.title)
            }
        }
    }, [location.state, sites, detailSite])

    const fetchClients = async () => {
        try {
            const response = await api.get('/admin/clients')
            // only show active clients
            setClients(response.data.filter(c => c.is_active) || [])
        } catch (error) {
            console.error('Error fetching clients:', error)
        }
    }


    const fetchTeams = async () => {
        try {
            const response = await api.get('/admin/teams/')
            setTeams(response.data.teams || [])
        } catch (error) {
            console.error('Error fetching teams:', error)
        }
    }

    const fetchSites = async () => {
        try {
            setLoading(true)
            const response = await api.get('/admin/sites/', {
                params: {
                    search,
                    ...(statusFilter && { status: statusFilter }),
                    page: preferences.currentPage,
                    page_size: preferences.pageSize
                }
            })
            setSites(response.data.sites || [])
            setTotalSites(response.data.total || 0)
        } catch (error) {
            console.error('Error fetching sites:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/sites/stats')
            setStats(response.data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const handleAddSite = () => {
        setEditingSite(null)
        setFormData(EMPTY_SITE)
        setActiveModalTab('info')
        setSelectedTeamIds([])
        setShowEditModal(true)
    }

    const handleEditSite = (site) => {
        setEditingSite(site)
        setFormData({
            name: site.name || '',
            address: site.address || '',
            latitude: site.latitude || '',
            longitude: site.longitude || '',
            geofence_radius: site.geofence_radius ?? 100,
            description: site.description || '',
            status: site.status || 'active',
            client_id: site.client_id || '',
            client_name: site.client_name || '',
            panel_count: site.panel_count || '',
            system_power_kw: site.system_power_kw || '',
            installation_type: site.installation_type || 'residential',
            organization_id: site.organization_id || '',
            work_start_time: site.work_start_time || '07:00',
            work_end_time: site.work_end_time || '16:00',
            lunch_break_start: site.lunch_break_start || '12:00',
            lunch_break_end: site.lunch_break_end || '13:00',
            max_overtime_minutes: site.max_overtime_minutes ?? 120
        })
        setActiveModalTab('info')
        setSelectedTeamIds(site.team_ids || [])
        setShowEditModal(true)
    }


    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            showToast('Geolocația nu este suportată de browserul tău.', 'error')
            return
        }

        showToast('Se detectează locația...', 'info')
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude
                const lon = position.coords.longitude
                
                let fetchedAddress = formData.address
                
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                    const data = await res.json()
                    if (data && data.display_name) {
                        fetchedAddress = data.display_name
                    }
                } catch(e) {
                    console.error("Geocoding failed:", e)
                }

                setFormData(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lon,
                    address: fetchedAddress
                }))
                showToast('Locație preluată cu succes!', 'success')
            },
            (error) => {
                console.error("GPS Error:", error)
                showToast('Eroare la preluarea locației. Verifică permisiunile GPS.', 'error')
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
    }

    const handleSaveSite = async () => {
        if (!formData.name.trim()) {
            showToast('Numele șantierului este obligatoriu!', 'error')
            return
        }

        try {
            setSaving(true)
            const payload = {
                ...formData,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                geofence_radius: formData.geofence_radius ? parseInt(formData.geofence_radius) : 100,
                panel_count: formData.panel_count ? parseInt(formData.panel_count) : null,
                system_power_kw: formData.system_power_kw ? parseFloat(formData.system_power_kw) : null,
                max_overtime_minutes: formData.max_overtime_minutes ? parseInt(formData.max_overtime_minutes) : 120,
                organization_id: formData.organization_id || admin?.organization_id || ''
            }

            let currentSiteId = editingSite?.id;
            if (editingSite) {
                await api.put(`/admin/sites/${editingSite.id}`, payload)
            } else {
                const res = await api.post('/admin/sites/', payload)
                currentSiteId = res.data.id
            }

            if (currentSiteId) {
                await api.put(`/admin/sites/${currentSiteId}/teams`, { team_ids: selectedTeamIds })
            }

            setShowEditModal(false)
            fetchSites()
            fetchStats()
            showToast('Șantier salvat cu succes!', 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || 'Eroare la salvare', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteSite = async (siteId) => {
        showDialog({
            title: 'Ștergere Șantier',
            message: 'Sigur doriți să suspendați temporar sau să ștergeți acest șantier?',
            type: 'danger',
            confirmText: 'Șterge',
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/sites/${siteId}`)
                    fetchSites()
                    fetchStats()
                    showToast('Șantier sters cu succes.', 'success')
                } catch (error) {
                    showToast(error.response?.data?.detail || 'Eroare la ștergere', 'error')
                }
            }
        })
    }

    const handleToggleSelectAll = (e) => {
        if (e.target.checked) setSelectedSiteIds(sites.map(s => s.id))
        else setSelectedSiteIds([])
    }

    const handleToggleSelect = (siteId) => {
        setSelectedSiteIds(prev => prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId])
    }

    const handleBulkDelete = () => {
        if (selectedSiteIds.length === 0) return
        showDialog({
            title: 'Ștergere Multiplă',
            message: `Ești sigur că vrei să ștergi (suspenzi) cele ${selectedSiteIds.length} șantiere selectate?`,
            type: 'danger',
            confirmText: 'Șterge Selecția',
            onConfirm: async () => {
                try {
                    await Promise.all(selectedSiteIds.map(id => api.delete(`/admin/sites/${id}`)))
                    setSelectedSiteIds([])
                    fetchSites()
                    fetchStats()
                    showToast('Șantierele selectate au fost șterse.', 'success')
                } catch (error) {
                    showToast('Eroare la ștergerea în masă', 'error')
                }
            }
        })
    }

    const handlePhotoClick = (site) => {
        setSelectedSite(site)
        setShowPhotoModal(true)
    }

    const handlePhotoUploaded = () => {
        console.log('Photo uploaded successfully')
    }

    const getInstallationTypeBadge = (type) => {
        const badges = {
            residential: 'bg-blue-100 text-blue-700',
            commercial: 'bg-purple-100 text-purple-700',
            industrial: 'bg-slate-100 text-slate-700'
        }
        const labels = {
            residential: 'Rezidențial',
            commercial: 'Comercial',
            industrial: 'Industrial'
        }
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[type] || badges.residential}`}>
                {labels[type] || type}
            </span>
        )
    }

    const getStatusBadge = (status) => {
        if (status === 'active') return (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" />
                Activ
            </span>
        )
        if (status === 'completed') return (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" />
                Finalizat
            </span>
        )
        return (
            <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                <XCircle className="w-3 h-3" />
                Suspendat
            </span>
        )
    }

    if (loading && sites.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Building2 className="w-5 h-5" />
                        </div>
                        Gestionare Șantiere
                    </h1>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative group flex items-center w-full sm:w-auto">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Caută după nume, client, locație..."
                            value={search}
                            onChange={(e) => {setSearch(e.target.value); setCurrentPage(PAGE_ID, 1)}}
                            className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                        {search && (
                            <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {sites.length}/{totalSites || 0}
                                </span>
                                <button 
                                    onClick={() => { setSearch(''); setCurrentPage(PAGE_ID, 1) }}
                                    className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5"
                                >
                                    <X className="w-3 h-3 text-white/80 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                        <select
                            value={statusFilter}
                            onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(PAGE_ID, 1)}}
                            className="h-10 pl-4 pr-8 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                        >
                            <option value="active">Active</option>
                            <option value="completed">Finalizate</option>
                            <option value="suspended">Suspendate</option>
                            <option value="all">Toate Statusurile</option>
                        </select>

                        <ViewToggle
                            viewMode={preferences.viewMode}
                            onViewModeChange={(mode) => setViewMode(PAGE_ID, mode)}
                        />

                        {/* Actions */}
                        {selectedSiteIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Șterge ({selectedSiteIds.length})</span>
                            </button>
                        )}
                        <button
                            onClick={handleAddSite}
                            className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Adaugă Șantier
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                {detailSite ? (
                    <SiteDetailView site={detailSite} onBack={() => setDetailSite(null)} />
                ) : (
                <div className="bg-white dark:bg-slate-900/80">
                    {preferences.viewMode === 'list' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-y border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 text-center w-16">
                                            <input type="checkbox" checked={sites.length > 0 && selectedSiteIds.length === sites.length} onChange={handleToggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                        </th>
                                        <th className="px-6 py-4">Șantier</th>
                                        <th className="px-6 py-4">Client</th>
                                        <th className="px-6 py-4">Sistem</th>
                                        <th className="px-6 py-4">Tip</th>
                                        <th className="px-6 py-4">Program</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {sites.map((site) => (
                                        <tr key={site.id} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedSiteIds.includes(site.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <td className="px-6 py-4 text-center">
                                                <input type="checkbox" checked={selectedSiteIds.includes(site.id)} onChange={() => handleToggleSelect(site.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <div>
                                                    <button onClick={() => setDetailSite(site)} className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors text-left">{site.name}</button>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate max-w-[200px]">{site.address || 'Fără adresă'}</span>
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <p className="text-sm text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{site.client_name || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded w-fit border border-amber-100 dark:border-amber-800">
                                                <Zap className="w-3 h-3" />
                                                {site.system_power_kw || 0} kW
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        {getInstallationTypeBadge(site.installation_type)}
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center gap-1 text-[11px]">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{site.work_start_time || '07:00'}</span>
                                            <span className="text-slate-400">—</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{site.work_end_time || '16:00'}</span>
                                        </div>
                                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">+{site.max_overtime_minutes ?? 120}min OT</p>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-center">
                                        {getStatusBadge(site.status)}
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                            <button
                                                onClick={() => handlePhotoClick(site)}
                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                title="Fotografii"
                                            >
                                                <Camera className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEditSite(site)}
                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                title="Editează"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSite(site.id)}
                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                                title="Șterge"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sites.map((site) => (
                        <div key={site.id} className={`bg-white rounded-xl border ${selectedSiteIds.includes(site.id) ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'} p-6 hover:shadow-lg transition-shadow relative`}>
                            <div className="absolute top-4 right-4 z-10" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedSiteIds.includes(site.id)} onChange={() => handleToggleSelect(site.id)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer drop-shadow-sm" />
                            </div>
                            <div className="flex items-start justify-between mb-4 pr-8">
                                <h3 className="font-bold text-lg text-slate-900 hover:text-blue-600 cursor-pointer" onClick={() => setDetailSite(site)}>{site.name}</h3>
                                {getStatusBadge(site.status)}
                            </div>

                            <div className="space-y-3 mb-4">
                                <p className="text-sm text-slate-600 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {site.address || 'Fără adresă'}
                                </p>
                                {site.client_name && (
                                    <p className="text-sm text-slate-900 font-medium">
                                        Client: {site.client_name}
                                    </p>
                                )}
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-full p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1 text-amber-700 font-semibold">
                                            <Zap className="w-5 h-5" />
                                            {site.system_power_kw || 0} kW
                                        </span>
                                        <span className="flex items-center gap-1 text-amber-600">
                                            <Hash className="w-5 h-5" />
                                            {site.panel_count || 0} panouri
                                        </span>
                                    </div>
                                </div>
                                {getInstallationTypeBadge(site.installation_type)}
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    {site.work_start_time || '07:00'} — {site.work_end_time || '16:00'}
                                    <span className="text-xs text-slate-400">(+{site.max_overtime_minutes ?? 120}min OT)</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => handlePhotoClick(site)}
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-4 h-4" />
                                    Fotografii
                                </button>
                                <button
                                    onClick={() => handleEditSite(site)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition-colors flex items-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editează
                                </button>
                                <button
                                    onClick={() => handleDeleteSite(site.id)}
                                    className="p-2 hover:bg-red-50 rounded-full transition-colors"
                                    title="Șterge"
                                >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            <Pagination
                currentPage={preferences.currentPage}
                pageSize={preferences.pageSize}
                totalItems={totalSites}
                onPageChange={(page) => setCurrentPage(PAGE_ID, page)}
                onPageSizeChange={(size) => {
                    setPageSize(PAGE_ID, size)
                    setCurrentPage(PAGE_ID, 1)
                }}
            />
            </div>
            )}
        </div>

            {/* Edit/Add Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-slate-200 dark:border-slate-800 transform scale-100 opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-slate-500" />
                                {editingSite ? 'Editează Șantier' : 'Adaugă Șantier Nou'}
                            </h2>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 px-6 pt-2">
                            <button
                                onClick={() => setActiveModalTab('info')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Informații
                            </button>
                            <button
                                onClick={() => setActiveModalTab('teams')}
                                className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalTab === 'teams' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Echipe Alocate
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 flex-1">
                            <div className={activeModalTab !== 'info' ? 'hidden' : ''}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Nume Șantier *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder="ex: Instalare Panouri Solare - Familia Ionescu"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Adresă</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder="Strada, Număr, Oraș"
                                        />
                                    </div>

                                    <div className="md:col-span-2 bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Coordonate GPS</label>
                                            <button
                                                type="button"
                                                onClick={handleDetectLocation}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800"
                                            >
                                                <MapPin className="w-3.5 h-3.5" />
                                                Detectează automat
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Latitudine</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.latitude}
                                                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                    placeholder="ex: 44.4268"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Longitudine</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.longitude}
                                                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                    placeholder="ex: 26.1025"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Rază Geofence (m)</label>
                                                <input
                                                    type="number"
                                                    value={formData.geofence_radius}
                                                    onChange={e => setFormData({ ...formData, geofence_radius: e.target.value })}
                                                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                    placeholder="ex: 100"
                                                    min="10"
                                                    max="5000"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-3 mb-2 ml-1">Sunt folosite pentru geofencing. Dacă nu sunt setate, se va încerca preluarea din adresă la salvare.</p>
                                        <MiniMapSelector 
                                            latitude={formData.latitude} 
                                            longitude={formData.longitude} 
                                            onLocationChange={(lat, lon) => setFormData({...formData, latitude: lat, longitude: lon})} 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Client</label>
                                        <select
                                            value={formData.client_id}
                                            onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        >
                                            <option value="">-- Fără client asociat --</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Tip Instalare</label>
                                        <select
                                            value={formData.installation_type}
                                            onChange={e => setFormData({ ...formData, installation_type: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        >
                                            <option value="residential">Rezidențial</option>
                                            <option value="commercial">Comercial</option>
                                            <option value="industrial">Industrial</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Putere Sistem (kW)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.system_power_kw}
                                            onChange={e => setFormData({ ...formData, system_power_kw: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder="ex: 10.5"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Număr Panouri</label>
                                        <input
                                            type="number"
                                            value={formData.panel_count}
                                            onChange={e => setFormData({ ...formData, panel_count: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder="ex: 24"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        >
                                            <option value="active">Activ</option>
                                            <option value="completed">Finalizat</option>
                                            <option value="suspended">Suspendat</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Descriere</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none"
                                            placeholder="Detalii despre șantier..."
                                        />
                                    </div>
                                </div>

                                {/* Work Schedule Section */}
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-5 mt-5">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        Program Lucru Șantier
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Început Program</label>
                                            <input
                                                type="time"
                                                value={formData.work_start_time}
                                                onChange={e => setFormData({ ...formData, work_start_time: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Sfârșit Program</label>
                                            <input
                                                type="time"
                                                value={formData.work_end_time}
                                                onChange={e => setFormData({ ...formData, work_end_time: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Overtime Max (min)</label>
                                            <input
                                                type="number"
                                                value={formData.max_overtime_minutes}
                                                onChange={e => setFormData({ ...formData, max_overtime_minutes: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                placeholder="120"
                                                min="0"
                                                max="480"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Început Pauză Masă</label>
                                            <input
                                                type="time"
                                                value={formData.lunch_break_start}
                                                onChange={e => setFormData({ ...formData, lunch_break_start: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Sfârșit Pauză Masă</label>
                                            <input
                                                type="time"
                                                value={formData.lunch_break_end}
                                                onChange={e => setFormData({ ...formData, lunch_break_end: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-1">Pontajul se poate face cu max 30 min înainte. Overtime fără aprobare: {formData.max_overtime_minutes || 120} minute.</p>
                                </div>
                            </div>

                            <div className={activeModalTab !== 'teams' ? 'hidden' : ''}>
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                        Bifează echipele care lucrează pe acest șantier. Orice modificare va actualiza forța de muncă din aplicație.
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {teams.map(team => (
                                            <label key={team.id} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-colors ${selectedTeamIds.includes(team.id) ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTeamIds.includes(team.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedTeamIds([...selectedTeamIds, team.id])
                                                            else setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id))
                                                        }}
                                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{team.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Șef: {team.team_leader_name} · {team.member_count} Muncitori</p>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                        {teams.length === 0 && (
                                            <p className="text-sm text-slate-400 text-center py-6">Nu există echipe create în sistem.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-white dark:bg-slate-900">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleSaveSite}
                                disabled={saving}
                                className="px-5 h-10 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editingSite ? 'Salvează' : 'Creează Șantier'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Modal */}
            {showPhotoModal && selectedSite && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200/50 dark:border-slate-800/50" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between text-white shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Camera className="w-6 h-6" />
                                    {selectedSite.name}
                                </h2>
                                <p className="text-white/80 mt-1 ml-8 text-sm">Fotografii șantier</p>
                            </div>
                            <button
                                onClick={() => setShowPhotoModal(false)}
                                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <PhotoUpload
                                        timesheetId={selectedSite.id}
                                        onUploadSuccess={handlePhotoUploaded}
                                        maxPhotos={20}
                                    />
                                </div>
                                <div>
                                    <PhotoGallery
                                        timesheetId={selectedSite.id}
                                        canDelete={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, isActive, onClick }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md ${isActive ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg transform -translate-y-1' : ''} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-4 bg-gradient-to-br ${color} rounded-2xl shadow-inner`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{label}</p>
                </div>
            </div>
        </div>
    )
}
