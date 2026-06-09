import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../lib/api'
import {
    Users, Building2, Clock, CheckCircle, TrendingUp, Calendar, BarChart3, Activity,
    Loader2, Coffee, MapPin, RefreshCw, Timer, Trophy, AlertTriangle, Zap,
    ArrowUpRight, ArrowDownRight, ChevronRight, Eye, ShieldAlert, WifiOff,
    X, Phone, Mail, FileText, ArrowLeft, Package, ClipboardList, ExternalLink, Truck, Plus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SiteMap from '../../components/SiteMap'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts'
import KPICard from '../../components/KPICard'
import DataTable from '../../components/DataTable'
import ShortWorksCalendar from '../../components/ShortWorksCalendar'
import BuienradarWidget from '../../components/BuienradarWidget'
import AddressAutocomplete from '../../components/AddressAutocomplete'
import SearchableSelect from '../../components/SearchableSelect'
import { useTenantStore } from '../../store/tenantStore'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function AdminOverview() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { tenant } = useTenantStore()
    const [stats, setStats] = useState({ total_users: 0, total_sites: 0, pending: 0, total_hours_week: 0 })
    const [chartData, setChartData] = useState({ daily: [], hourly: [], activities: [], sites: [] })
    const [statsLoading, setStatsLoading] = useState(true)
    const [chartLoading, setChartLoading] = useState(true)

    const DEFAULT_LAYOUT = {
        recent_work_orders: { visible: true, size: 'L' },
        live_sites: { visible: true, size: 'M' },
        hours_chart: { visible: true, size: 'M' },
        hourly_activity: { visible: true, size: 'M' },
        top_performers: { visible: true, size: 'S' },
        alerts_production: { visible: true, size: 'S' },
        worker_complaints: { visible: true, size: 'M' },
        warehouse_requests: { visible: true, size: 'S' },
        warehouse_status: { visible: true, size: 'S' },
        live_workers: { visible: true, size: 'L' }
    }
    
    const [dashboardLayout, setDashboardLayout] = useState(() => {
        try {
            const saved = localStorage.getItem('pontaj_dashboard_layout')
            return saved ? { ...DEFAULT_LAYOUT, ...JSON.parse(saved) } : DEFAULT_LAYOUT
        } catch {
            return DEFAULT_LAYOUT
        }
    })
    
    const getLayoutClass = (key, baseClass) => {
        const size = dashboardLayout[key]?.size || 'M'
        let span = 'lg:col-span-1'
        if (size === 'M') span = 'lg:col-span-2'
        if (size === 'L') span = 'lg:col-span-3'
        // For some containers we might need full width
        return `${span} ${baseClass}`
    }
    const [activeWorkers, setActiveWorkers] = useState([])
    const [fleetAlerts, setFleetAlerts] = useState([])
    const [sesizari, setSesizari] = useState([])       // cereri de material pending
    const [necesar, setNecesar] = useState([])         // cereri neîndeplinite / în așteptare
    const [livrat, setLivrat] = useState([])           // cereri finalizate / livrate
    const [complaints, setComplaints] = useState([])   // sesizari reale de la muncitori
    const [workersLoading, setWorkersLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(null)
    const refreshTimer = useRef(null)
    const [workOrdersStats, setWorkOrdersStats] = useState({ total: 0, active: 0, draft: 0 })
    const [allWorkOrders, setAllWorkOrders] = useState([])
    const [recentWorkOrders, setRecentWorkOrders] = useState([])
    const [teams, setTeams] = useState([])

    // Feature flags
    const tenantFeatures = tenant?.features || []
    const isLongTerm = tenant?.has_long_term_sites !== false
    const isShortTerm = tenant?.has_short_term_interventions === true
    const hasWarehouse = tenant?.features?.includes('warehouse') || tenant?.has_warehouse === true

    const [isScreeds, setIsScreeds] = useState(() => {
        const saved = localStorage.getItem('pontaj_is_screeds_mode')
        if (saved !== null) return saved === 'true'
        return true // Make Screeds default as requested
    })

    const [weeklyOrdersCount, setWeeklyOrdersCount] = useState(0)
    const [todayOrdersCount, setTodayOrdersCount] = useState(0)
    
    useEffect(() => {
        if (!isScreeds || !allWorkOrders) return;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
        startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        
        let wCount = 0;
        let tCount = 0;
        
        allWorkOrders.forEach(wo => {
            const dateStr = wo.start_date || wo.deadline_date;
            if (!dateStr) return;
            const dStr = dateStr.split('T')[0];
            const d = new Date(dStr);
            
            if (dStr === todayStr) tCount++;
            if (d >= startOfWeek && d <= endOfWeek) wCount++;
        });
        
        setWeeklyOrdersCount(wCount);
        setTodayOrdersCount(tCount);
    }, [allWorkOrders, isScreeds]);

    // Worker detail drawer
    const [selectedWorker, setSelectedWorker] = useState(null)
    const [workerDetail, setWorkerDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [activityPopup, setActivityPopup] = useState(null)

    // Global Site Filter
    const [globalSiteFilter, setGlobalSiteFilter] = useState(null)
    const [isInitialLoad, setIsInitialLoad] = useState(true)

    const [quickCreateData, setQuickCreateData] = useState(null) // { teamId, clientId, clientName, date, time }
    const [quickCreateForm, setQuickCreateForm] = useState({ title: '', address: '', latitude: '', longitude: '', surface: '', thickness: '', clientId: '' })
    const [quickCreateStep, setQuickCreateStep] = useState(1) // 1 = General, 2 = Resurse, 'new-client' = formular client nou
    const [quickCreateClientForm, setQuickCreateClientForm] = useState({ name: '', phone: '', email: '', type: 'fizica', identifier: '' })
    const [quickCreateSaving, setQuickCreateSaving] = useState(false)
    const [detectingLocation, setDetectingLocation] = useState(false)

    const [clients, setClients] = useState([])

    // Live clock — use ref to avoid re-rendering charts every second
    const nowRef = useRef(Date.now())
    const [clockTick, setClockTick] = useState(0)

    // Dark mode detection for Recharts (which uses inline styles, not Tailwind)
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
    useEffect(() => {
        const obs = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'))
        })
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])
    useEffect(() => {
        const t = setInterval(() => {
            nowRef.current = Date.now()
            setClockTick(c => c + 1)
        }, 10000) // update every 10s instead of 1s
        return () => clearInterval(t)
    }, [])

    const getLiveHours = (w) => {
        if (w.status === 'terminat' || !w.check_in_time) return w.worked_hours || 0
        if (w.gps_lost || w.status === 'gps_pierdut') return w.worked_hours || 0
        const checkin = new Date(w.check_in_time).getTime()
        let elapsed = (nowRef.current - checkin) / 3600000
        let breakH = w.break_hours || 0
        return Math.max(0, elapsed - breakH)
    }

    useEffect(() => {
        // Fire all requests in parallel — dashboard shows immediately, each section fills in
        fetchStats()
        fetchChartData()
        fetchActiveWorkers()
        fetchFleetAlerts()
        fetchComplaints()
        fetchTeams()
        fetchClients()
        if (isShortTerm) fetchWorkOrdersStats()

        if (refreshTimer.current) clearInterval(refreshTimer.current)
        refreshTimer.current = setInterval(() => {
            fetchStats(true)
            fetchActiveWorkers()
            fetchChartData()
            fetchComplaints()
            fetchTeams()
            fetchClients()
            if (isShortTerm) fetchWorkOrdersStats()
        }, 15000)

        return () => clearInterval(refreshTimer.current)
    }, [globalSiteFilter, isShortTerm])

    const fetchStats = async (isBackground = false) => {
        if (!isBackground) setStatsLoading(true)
        try {
            const url = globalSiteFilter ? `/admin/timesheets/stats?site_id=${globalSiteFilter}` : '/admin/timesheets/stats'
            const res = await api.get(url)
            const tsStats = res.data || {}
            setStats({
                total_users: tsStats.total_users || 0,
                total_sites: tsStats.total_sites || 0,
                pending: tsStats.pending || 0,
                total_hours_week: tsStats.total_hours_week || 0,
            })
        } catch (e) { console.error(e) }
        finally { setStatsLoading(false) }
    }

    const getDateParams = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 28);
        return `?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`;
    }

    const fetchWorkOrdersStats = async () => {
        try {
            const res = await api.get(`/admin/work-orders${getDateParams()}`)
            const all = res.data?.items || res.data || []
            const total = res.data?.total || all.length
            const active = Array.isArray(all) ? all.filter(w => w.status === 'in_progress' || w.status === 'sent' || w.status === 'confirmed').length : 0
            const draft = Array.isArray(all) ? all.filter(w => w.status === 'draft').length : 0
            setWorkOrdersStats({ total, active, draft })
            if (Array.isArray(all)) {
                setAllWorkOrders(all)
            }
            // Fetch the 50 most recent work orders independent of current month
            const recentRes = await api.get('/admin/work-orders?limit=50')
            setRecentWorkOrders(recentRes.data || [])
        } catch {}
    }

    const fetchTeams = async () => {
        try {
            const res = await api.get('/admin/teams/')
            setTeams(res.data?.teams || res.data || [])
        } catch (e) { console.error(e) }
    }

    const fetchClients = async () => {
        try {
            const res = await api.get('/admin/clients')
            setClients(Array.isArray(res.data) ? res.data : res.data?.items || [])
        } catch (e) { console.error(e) }
    }

    const handleTeamDropOnOrder = async (workOrderId, teamId) => {
        try {
            const team = teams.find(t => String(t.id) === String(teamId))
            
            // Optimistic UI Update
            setAllWorkOrders(prev => prev.map(wo => {
                if (String(wo.id) === String(workOrderId)) {
                    return {
                        ...wo,
                        assigned_team_id: teamId,
                        assigned_team_name: team?.name || wo.assigned_team_name,
                        assigned_team_color: team?.color || wo.assigned_team_color
                    }
                }
                return wo
            }))

            await api.put(`/admin/work-orders/${workOrderId}`, {
                assigned_team_id: teamId
            })
            // Silent refresh
            fetchWorkOrdersStats()
        } catch (error) {
            console.error("Error assigning team:", error)
            alert("Eroare la asignarea echipei.")
            fetchWorkOrdersStats()
        }
    }

    const handleClientDropOnOrder = async (workOrderId, clientId) => {
        try {
            const client = clients.find(c => String(c.id) === String(clientId))
            
            // Optimistic UI Update
            setAllWorkOrders(prev => prev.map(wo => {
                if (String(wo.id) === String(workOrderId)) {
                    return {
                        ...wo,
                        client_id: clientId,
                        client_name: client?.name || wo.client_name
                    }
                }
                return wo
            }))

            await api.put(`/admin/work-orders/${workOrderId}`, {
                client_id: clientId
            })
            // Silent refresh
            fetchWorkOrdersStats()
        } catch (error) {
            console.error("Error assigning client:", error)
            alert("Eroare la asignarea clientului.")
            fetchWorkOrdersStats()
        }
    }

    const handleTeamDropOnEmpty = (date, time, teamId) => {
        setQuickCreateData({ date, time, teamId })
        setQuickCreateForm({ title: '', address: '', latitude: '', longitude: '' })
    }

    const handleDetectGPS = () => {
        setDetectingLocation(true)
        if (!navigator.geolocation) {
            alert('Geolocația nu este suportată de browser.');
            setDetectingLocation(false);
            return;
        }

        const gpsTimeout = setTimeout(() => {
            setDetectingLocation(false);
            alert('Timpul a expirat. Verifică setările de permisiuni GPS.');
        }, 8000);

        navigator.geolocation.getCurrentPosition(
            async pos => {
                clearTimeout(gpsTimeout);
                const lat = pos.coords.latitude.toFixed(6)
                const lon = pos.coords.longitude.toFixed(6)
                
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&email=contact@davidechape.com`,
                        { headers: { 'Accept-Language': 'ro,en,fr,de' } }
                    )
                    const data = await res.json()
                    if (data?.display_name) {
                        const a = data.address || {}
                        const parts = [
                            a.road && a.house_number ? `${a.road} ${a.house_number}` : a.road,
                            a.city || a.town || a.village || a.municipality,
                            a.county
                        ].filter(Boolean)
                        const addr = parts.length > 0 ? parts.join(', ') : data.display_name
                        setQuickCreateForm(p => ({ ...p, address: addr, latitude: lat, longitude: lon }))
                    }
                } catch (e) {
                    console.error('Eroare reverse geocoding:', e)
                } finally {
                    setDetectingLocation(false)
                }
            },
            err => {
                clearTimeout(gpsTimeout);
                setDetectingLocation(false);
                alert('Eroare la detectarea locației.');
            },
            { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
        );
    }

    const handleQuickCreateClient = async () => {
        setQuickCreateSaving(true)
        try {
            const res = await api.post('/admin/clients', {
                name: quickCreateClientForm.name,
                type: quickCreateClientForm.type,
                identifier: quickCreateClientForm.identifier,
                phone: quickCreateClientForm.phone,
                email: quickCreateClientForm.email,
                is_favorite: true
            })
            // Fetch updated clients or just add to list
            const newClient = res.data
            setClients(prev => [...prev, newClient])
            
            // Auto select it and go back to step 1
            setQuickCreateForm(p => ({
                ...p,
                clientId: newClient.id,
                title: !p.title ? newClient.name : p.title
            }))
            setQuickCreateClientForm({ name: '', phone: '', email: '', type: 'fizica', identifier: '' })
            setQuickCreateStep(1)
        } catch (error) {
            console.error("Error creating client:", error)
            alert("Eroare la crearea clientului.")
        } finally {
            setQuickCreateSaving(false)
        }
    }

    const handleQuickCreateSubmit = async (e, openDetails = false) => {
        if (e) e.preventDefault()
        setQuickCreateSaving(true)
        try {
            let estimatedAmount = 0;
            let isAutoCalculated = false;
            
            const surface = parseFloat(quickCreateForm.surface) || 0;
            const thickness = parseFloat(quickCreateForm.thickness) || 0;
            
            if (surface > 0) {
                const extraThickness = Math.max(0, thickness - 5);
                const autoBase = 12.5 * surface;
                const autoExtra = extraThickness * 1.25 * surface;
                const autoFoil = quickCreateForm.has_foil ? 1.2 * surface : 0;
                const autoMesh = quickCreateForm.has_mesh ? 2.5 * surface : 0;
                // Duramint added as checkbox, price pending if required
                estimatedAmount = autoBase + autoExtra + autoFoil + autoMesh;
                isAutoCalculated = true;
            }

            const res = await api.post('/admin/work-orders', {
                title: quickCreateForm.title,
                site_address: quickCreateForm.address,
                site_latitude: quickCreateForm.latitude,
                site_longitude: quickCreateForm.longitude,
                start_date: quickCreateData.date,
                start_time: quickCreateData.time,
                assigned_team_id: quickCreateData.teamId || null,
                client_id: quickCreateData.clientId || null,
                status: 'draft',
                volumes: (quickCreateForm.surface || quickCreateForm.thickness) ? [{
                    label: 'Șapă',
                    quantity: parseFloat(quickCreateForm.surface) || 0,
                    unit: 'm²',
                    thickness: parseFloat(quickCreateForm.thickness) || 0,
                    has_foil: !!quickCreateForm.has_foil,
                    has_mesh: !!quickCreateForm.has_mesh,
                    has_duramint: !!quickCreateForm.has_duramint
                }] : [],
                estimated_amount: estimatedAmount > 0 ? estimatedAmount : null,
                is_auto_calculated: isAutoCalculated
            })
            setQuickCreateData(null)
            fetchWorkOrdersStats()
            if (openDetails && res.data && res.data.id) {
                navigate(`/admin/work-orders/${res.data.id}/edit`)
            }
        } catch (error) {
            console.error("Error quick creating work order:", error)
            alert("A apărut o eroare la crearea rapidă a comenzii.")
        } finally {
            setQuickCreateSaving(false)
        }
    }

    const handleOrderRescheduled = async (woId, newDate, newTime, revert = false) => {
        if (woId && newDate && newTime) {
            setAllWorkOrders(prev => prev.map(wo => wo.id === String(woId) ? { ...wo, start_date: newDate, start_time: newTime } : wo));
        }
        if (revert || !woId) {
            fetchWorkOrdersStats();
        } else {
            // Background update
            api.get(`/admin/work-orders${getDateParams()}`).then(res => {
                const all = res.data?.items || res.data || [];
                if (Array.isArray(all)) {
                    setAllWorkOrders(all);
                }
            }).catch(e => {})
        }
    }

    const fetchChartData = async () => {
        setChartLoading(true)
        try {
            const url = globalSiteFilter ? `/admin/dashboard-stats?site_id=${globalSiteFilter}` : '/admin/dashboard-stats'
            const res = await api.get(url)
            setChartData(res.data)
        } catch (e) { console.error(e) }
        finally { setChartLoading(false) }
    }

    const fetchFleetAlerts = async () => {
        try {
            const res = await api.get('/admin/vehicles/expiring-documents')
            setFleetAlerts(res.data)
        } catch (e) { console.error(e) }
    }

    const fetchSesizariNecesar = async () => {
        try {
            const res = await api.get('/admin/material-requests/')
            const all = res.data || []
            setSesizari(all.filter(r => r.status === 'pending' || r.status === 'submitted'))
            setNecesar(all.filter(r => r.status === 'approved' || r.status === 'in_progress'))
            setLivrat(all.filter(r => r.status === 'completed' || r.status === 'delivered').slice(0, 10))
        } catch (e) { console.error('[NECESAR]', e?.response?.status, e?.message) }
    }

    const fetchComplaints = async () => {
        try {
            const res = await api.get('/admin/complaints/')
            const all = res.data || []
            setComplaints(all.filter(c => c.status === 'open' || c.status === 'in_review'))
        } catch (e) { console.error('[COMPLAINTS]', e) }
    }

    const fetchActiveWorkers = async () => {
        try {
            setWorkersLoading(true)
            const url = globalSiteFilter ? `/admin/timesheets/active-workers?site_id=${globalSiteFilter}` : '/admin/timesheets/active-workers'
            const res = await api.get(url)
            setActiveWorkers(res.data.active_workers || [])
            setLastRefresh(new Date())
        } catch (e) { console.error(e) }
        finally { setWorkersLoading(false) }
    }

    const openWorkerDetail = async (worker) => {
        setSelectedWorker(worker)
        setDetailLoading(true)
        try {
            const res = await api.get(`/admin/timesheets/worker/${worker.worker_id}/history`)
            setWorkerDetail(res.data)
        } catch (e) {
            console.error('Error fetching worker detail:', e)
            setWorkerDetail(null)
        } finally {
            setDetailLoading(false)
        }
    }

    const closeWorkerDetail = () => { setSelectedWorker(null); setWorkerDetail(null) }

    const formatTime = (hours) => {
        if (!hours || hours <= 0) return '0h 00m'
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${h}h ${String(m).padStart(2, '0')}m`
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

    const isWorking = (w) => w.status === 'activ' || w.status === 'gps_pierdut' || w.status === 'outside_geofence'
    const isOnBreak = (w) => w.status === 'pauză' || w.is_on_break
    const isDone = (w) => w.status === 'terminat'

    const activeCount = activeWorkers.filter(w => isWorking(w) && !isOnBreak(w)).length
    const breakCount = activeWorkers.filter(w => isOnBreak(w)).length
    const finishedCount = activeWorkers.filter(w => isDone(w)).length
    const totalHoursToday = activeWorkers.reduce((sum, w) => sum + getLiveHours(w), 0)

    // Compute top performers
    const topPerformers = [...activeWorkers]
        .map(w => ({ ...w, live_hours: getLiveHours(w) }))
        .sort((a, b) => b.live_hours - a.live_hours)
        .slice(0, 5)

    // Site distribution — live
    const siteDistribution = {}
    activeWorkers.forEach(w => {
        const site = w.site_name || 'Necunoscut'
        if (!siteDistribution[site]) siteDistribution[site] = { name: site, total: 0, active: 0, onBreak: 0, done: 0 }
        siteDistribution[site].total++
        if (isOnBreak(w)) siteDistribution[site].onBreak++
        else if (isWorking(w)) siteDistribution[site].active++
        else siteDistribution[site].done++
    })
    const siteList = Object.values(siteDistribution)

    // Weekly comparison
    const daily = chartData.daily || []
    const thisWeekHours = daily.slice(-7).reduce((s, d) => s + (d.hours || 0), 0)
    const lastWeekDaily = daily.slice(0, Math.max(0, daily.length - 7))
    const lastWeekHours = lastWeekDaily.reduce((s, d) => s + (d.hours || 0), 0)
    const weekChange = lastWeekHours > 0 ? ((thisWeekHours - lastWeekHours) / lastWeekHours * 100) : 0

    // Workers who checked in late (after 8:30 AM)
    const lateArrivals = activeWorkers.filter(w => {
        if (!w.check_in_time) return false
        const checkin = new Date(w.check_in_time)
        return checkin.getHours() > 8 || (checkin.getHours() === 8 && checkin.getMinutes() > 30)
    })

    const tzOption = tenant?.timezone && tenant.timezone !== 'auto' ? { timeZone: tenant.timezone } : {}
    const getTzName = () => {
        if (!tenant?.timezone || tenant.timezone === 'auto') return 'Ora Locală'
        if (tenant.timezone === 'Europe/Berlin') return 'Ora Germaniei'
        if (tenant.timezone === 'Europe/Bucharest') return 'Ora României'
        return tenant.timezone
    }


    return (
        <div className="p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* Subtle loading bar at very top */}
            {(statsLoading || workersLoading) && (
                <div className="fixed top-0 left-0 right-0 z-[999] h-1 bg-blue-100 overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '40%', animation: 'moveRight 1.5s linear infinite', background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }} />
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Planning
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                </div>
            </div>

            {/* KPI Row */}
            <div className={`grid gap-3 mb-6 ${isScreeds ? 'grid-cols-3 md:grid-cols-3 lg:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
                {statsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    ))
                ) : isScreeds ? (
                    <>
                        <KPICard label="Lucrări Azi" value={todayOrdersCount} icon={Timer} colorTheme="blue" onClick={() => navigate('/admin/work-orders')} />
                        <KPICard label="Săptămâna Curentă" value={weeklyOrdersCount} icon={Calendar} colorTheme="violet" onClick={() => navigate('/admin/work-orders')} />
                        <KPICard label="Necesar Nisip" value={necesar.length} icon={Package} colorTheme="amber" onClick={() => document.getElementById('necesar-materiale-table')?.scrollIntoView({ behavior: 'smooth' })} />
                    </>
                ) : (
                    <>
                        <KPICard label={t('dashboard.employees')} value={stats.total_users} icon={Users} colorTheme="blue" onClick={() => navigate('/admin/users')} />
                        {isLongTerm && (
                            <KPICard label={t('dashboard.sites')} value={stats.total_sites} icon={Building2} colorTheme="indigo" onClick={() => navigate('/admin/sites')} />
                        )}
                        {isShortTerm && (
                            <KPICard label="Comenzi" value={workOrdersStats.total} icon={ClipboardList} colorTheme="violet" onClick={() => navigate('/admin/work-orders')} />
                        )}
                        <KPICard label={t('dashboard.working_now')} value={activeCount} icon={Timer} colorTheme="green" pulse={activeCount > 0} onClick={() => document.getElementById('live-workers-table')?.scrollIntoView({ behavior: 'smooth' })} />
                        <KPICard label={t('dashboard.on_break')} value={breakCount} icon={Coffee} colorTheme="orange" onClick={() => document.getElementById('live-workers-table')?.scrollIntoView({ behavior: 'smooth' })} />
                        <KPICard label={t('dashboard.hours_today')} value={formatTime(totalHoursToday)} icon={Clock} colorTheme="purple" isText pulse onClick={() => document.getElementById('live-workers-table')?.scrollIntoView({ behavior: 'smooth' })} />
                        <KPICard label={t('dashboard.hours_week')} value={formatTime(stats.total_hours_week)} icon={TrendingUp} colorTheme="slate" isText onClick={() => navigate('/admin/reports')} />
                    </>
                )}
            </div>

            {/* Calendar Timesheet and Radar - Visible only for short term interventions */}
            {isShortTerm && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
                    <div className="xl:col-span-3">
                        <ShortWorksCalendar 
                            workOrders={allWorkOrders} 
                            onOrderRescheduled={handleOrderRescheduled} 
                            onTeamDrop={handleTeamDropOnOrder}
                            onClientDrop={handleClientDropOnOrder}
                            onTeamDropOnEmpty={(date, time, teamId) => {
                                setQuickCreateData({ date, time, teamId, clientId: null })
                                setQuickCreateForm(p => ({ ...p, title: '', address: '', latitude: '', longitude: '', surface: '', thickness: '', clientId: '' }))
                                setQuickCreateStep(1)
                            }}
                            onClientDropOnEmpty={(date, time, clientId, clientName) => {
                                const c = clients.find(cl => String(cl.id) === String(clientId))
                                setQuickCreateData({ date, time, teamId: null, clientId })
                                setQuickCreateForm(p => ({ 
                                    ...p, 
                                    title: clientName || '', 
                                    address: c?.address || '', 
                                    latitude: c?.latitude || '', 
                                    longitude: c?.longitude || '', 
                                    surface: '', 
                                    thickness: '',
                                    clientId: clientId || ''
                                }))
                                setQuickCreateStep(1)
                            }}
                            onEmptyCellClick={(date, time) => {
                                setQuickCreateData({ date, time, teamId: null, clientId: null })
                                setQuickCreateForm(p => ({ ...p, title: '', address: '', latitude: '', longitude: '', surface: '', thickness: '', clientId: '' }))
                                setQuickCreateStep(1)
                            }}
                        />
                    </div>
                    <div className="xl:col-span-1 flex flex-col gap-4 h-[800px]">
                        {/* Drag and Drop Clients Module */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden min-h-0">
                            <div className="px-4 py-3 shrink-0" style={{ backgroundColor: tenant?.primary_color || '#2563eb' }}>
                                <h3 className="font-extrabold text-white flex items-center gap-2 mb-0.5 text-xs uppercase tracking-wide">
                                    <Building2 className="w-3.5 h-3.5 text-white" />
                                    Clienți Frecvenți
                                </h3>
                                <p className="text-[10px] text-amber-100">
                                    Trage clientul pe calendar.
                                </p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-0">
                                {clients.filter(c => c.is_favorite).map(client => (
                                    <div 
                                        key={`fav-${client.id}`}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("type", "client")
                                            e.dataTransfer.setData("id", String(client.id))
                                            e.dataTransfer.setData("name", client.name)
                                        }}
                                        className="p-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] bg-orange-100 dark:bg-orange-900/30 border-orange-500 shadow-sm flex items-center justify-between"
                                    >
                                        <div className="font-bold text-orange-600 dark:text-orange-400 text-xs truncate">⭐️ {client.name}</div>
                                    </div>
                                ))}
                                {clients.filter(c => !c.name.toLowerCase().includes('isoflex')).slice(0, 15).map(client => (
                                    <div 
                                        key={client.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("type", "client")
                                            e.dataTransfer.setData("id", String(client.id))
                                            e.dataTransfer.setData("name", client.name)
                                        }}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] bg-white dark:bg-slate-800 flex items-center justify-between shadow-sm hover:border-amber-300"
                                    >
                                        <div className="font-medium text-slate-700 dark:text-slate-300 text-xs truncate">{client.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Drag and Drop Teams Module */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden min-h-0">
                            <div className="px-4 py-3 shrink-0" style={{ backgroundColor: tenant?.primary_color || '#2563eb' }}>
                                <h3 className="font-extrabold text-white flex items-center gap-2 mb-0.5 text-xs uppercase tracking-wide">
                                    <Truck className="w-3.5 h-3.5 text-white" />
                                    Camioane (Echipe)
                                </h3>
                                <p className="text-[10px] text-blue-100">
                                    Trage un camion peste lucrare.
                                </p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar min-h-0">
                                {teams.map(team => (
                                    <div 
                                        key={team.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("type", "team")
                                            e.dataTransfer.setData("id", String(team.id))
                                            e.currentTarget.classList.add('opacity-50', 'border-dashed', 'scale-95')
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.classList.remove('opacity-50', 'border-dashed', 'scale-95')
                                        }}
                                        className="p-1.5 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] bg-white dark:bg-slate-800 flex items-center justify-between border-transparent shadow-sm hover:shadow-md"
                                        style={{ borderLeftColor: team.color || '#3b82f6', borderLeftWidth: '3px' }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${team.color || '#3b82f6'}20` }}>
                                                <Truck className="w-3 h-3" style={{ color: team.color || '#3b82f6' }} />
                                            </div>
                                            <div className="min-w-0 flex flex-col justify-center">
                                                <div className="font-bold text-xs text-slate-800 dark:text-white truncate max-w-[120px] leading-tight">{team.name}</div>
                                                {team.members?.length > 0 && (
                                                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider leading-none mt-0.5">{team.members.length} membri</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex -space-x-2 shrink-0">
                                            {team.members?.slice(0, 3).map((m, i) => (
                                                <AvatarImg key={i} name={m.user_full_name || m.name || m.first_name || 'E'} size="w-5 h-5 border border-white dark:border-slate-800" textSize="text-[7px]" />
                                            ))}
                                            {(team.members?.length || 0) > 3 && (
                                                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 border border-white dark:border-slate-800 flex items-center justify-center text-[7px] font-bold text-slate-600 dark:text-slate-300 z-10 relative">
                                                    +{team.members.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 items-start">
{/* Recent Work Orders */}
            {dashboardLayout.recent_work_orders?.visible && (
                <div className={`${isShortTerm ? 'xl:col-span-3' : 'xl:col-span-4'} bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col overflow-hidden`}>
                    <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: tenant?.primary_color || '#2563eb' }}>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-white" />
                            Comenzi Recente
                        </h3>
                        <button onClick={() => navigate('/admin/work-orders')} className="text-xs font-bold text-blue-100 hover:text-white transition-colors bg-white/10 px-2 py-1 rounded">Vezi toate →</button>
                    </div>
                    {recentWorkOrders.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-sm">
                            Nicio comandă recentă.
                        </div>
                    ) : (
                        <div className="border-t border-slate-200 dark:border-slate-700">
                            <DataTable 
                                columns={[
                                    {
                                        key: 'title',
                                        label: 'Titlu',
                                        sortable: true,
                                        render: (wo) => (
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{wo.title}</div>
                                                {wo.site_name && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">📍 {wo.site_name}</div>}
                                            </div>
                                        )
                                    },
                                    {
                                        key: 'client_name',
                                        label: 'Client',
                                        sortable: true,
                                        render: (wo) => <div className="text-sm text-slate-700 dark:text-slate-300">{wo.client_name || '—'}</div>
                                    },
                                    {
                                        key: 'start_date',
                                        label: 'Data Execuție',
                                        sortable: true,
                                        render: (wo) => <div className="text-sm text-slate-700 dark:text-slate-300">{wo.start_date ? new Date(wo.start_date).toLocaleDateString('ro-RO') : '—'}</div>
                                    },
                                    {
                                        key: 'created_at',
                                        label: 'Dată Creare',
                                        sortable: true,
                                        render: (wo) => <div className="text-xs text-slate-500 dark:text-slate-400">{wo.created_at ? new Date(wo.created_at).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                                    },
                                    {
                                        key: 'status',
                                        label: 'Status',
                                        sortable: true,
                                        render: (wo) => {
                                            const cfg = {
                                                draft:       { label: 'Draft',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
                                                sent:        { label: 'Trimisă',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
                                                confirmed:   { label: 'Confirmată',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
                                                in_progress: { label: 'În Execuție', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
                                                completed:   { label: 'Finalizată',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500' },
                                                cancelled:   { label: 'Anulată',     color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' }
                                            }[wo.status] || { label: 'Draft', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400' }
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.color}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            )
                                        }
                                    },
                                    {
                                        key: 'actions',
                                        label: 'Acțiuni',
                                        render: (wo) => (
                                            <button onClick={() => navigate(`/admin/work-orders/${wo.id}/edit`)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors inline-block">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        )
                                    }
                                ]}
                                data={recentWorkOrders}
                                defaultPageSize={10}
                                pageSizeOptions={[10, 25, 150, 99999]}
                            />
                        </div>
                    )}
                </div>
            )}
            
            {/* Weather Module next to Recent Orders */}
            {isShortTerm && (
                <div className="xl:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col overflow-hidden h-[400px]">
                    <BuienradarWidget />
                </div>
            )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">


            {/* Live Site Map — afiseaza doar daca tenant are santiere clasice */}
            {isLongTerm && (
                <div className="mb-6">
                    <SiteMap selectedSiteId={globalSiteFilter} workers={activeWorkers} onSiteSelect={setGlobalSiteFilter} onWorkerSelect={openWorkerDetail} />
                </div>
            )}

            {/* Row 2: Weekly Comparison + Site Live Map */}
            
                {/* Weekly Hours Chart — takes 2 cols */}
                {isLongTerm && dashboardLayout.hours_chart?.visible && (
<div className={getLayoutClass("hours_chart", "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col overflow-hidden")}>
                    <div className="flex items-center justify-between px-5 py-4 bg-blue-600 dark:bg-slate-800">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-white" />
                            {t('dashboard.weekly_chart')}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold flex items-center gap-1 text-white bg-white/20 px-2 py-1 rounded shadow-sm`}>
                                {weekChange >= 0 ? <ArrowUpRight className="w-3 h-3 text-green-300" /> : <ArrowDownRight className="w-3 h-3 text-red-300" />}
                                {Math.abs(weekChange).toFixed(0)}% {t('dashboard.vs_last_week')}
                            </span>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <ComposedChart data={daily} barSize={36}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="" hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b' }}
                                    formatter={(value, name) => [name === 'hours' ? `${value}h` : value, name === 'hours' ? 'Ore' : 'Muncitori']}
                                    labelFormatter={(label) => `Data: ${label}`}
                                />
                                <defs>
                                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                                <Bar yAxisId="left" dataKey="hours" fill="url(#blueGrad)" radius={[6, 6, 0, 0]} />
                                <Line yAxisId="left" type="monotone" dataKey="workers" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-6 mt-2 px-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-indigo-600" /> {t('dashboard.hours_worked')}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <div className="w-3 h-0.5 bg-amber-500 rounded" style={{ width: 16 }} /> {t('dashboard.workers')}
                        </div>
                    </div>
                </div>
)}

                {/* Live Site Map */}
                {isLongTerm && dashboardLayout.live_sites?.visible && (
<div className={getLayoutClass("live_sites", "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col overflow-hidden min-h-[400px]")}>
                    <div className="px-5 py-4 bg-blue-600 dark:bg-slate-800 shrink-0">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-white" />
                            {t('dashboard.live_sites')}
                        </h3>
                    </div>
                    {siteList.length === 0 ? (
                        <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">
                            <div className="text-center">
                                <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p>{t('dashboard.no_workers_today')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 overflow-y-auto flex-1 pr-0.5">
                            {siteList.sort((a, b) => b.total - a.total).map(site => (
                                <div key={site.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-slate-800 truncate flex-1">{site.name}</span>
                                        <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border">{site.total}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {site.active > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                {site.active} activ{site.active > 1 ? 'i' : ''}
                                            </span>
                                        )}
                                        {site.onBreak > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                                                <Coffee className="w-3 h-3" /> {site.onBreak}
                                            </span>
                                        )}
                                        {site.done > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                                <CheckCircle className="w-3 h-3" /> {site.done}
                                            </span>
                                        )}
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                                        {site.active > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${(site.active / site.total) * 100}%` }} />}
                                        {site.onBreak > 0 && <div className="bg-orange-400 h-full transition-all" style={{ width: `${(site.onBreak / site.total) * 100}%` }} />}
                                        {site.done > 0 && <div className="bg-slate-400 h-full transition-all" style={{ width: `${(site.done / site.total) * 100}%` }} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Row 3: Hourly Chart + Top Performers + Late Arrivals/Production */}
            
                {/* Hourly Activity */}
                {isLongTerm && dashboardLayout.hourly_activity?.visible && (
<div className={getLayoutClass("hourly_activity", "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5 flex flex-col")}>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
                        <Activity className="w-4 h-4 text-green-500" />
                        {t('dashboard.hourly_activity')}
                    </h3>
                    <div style={{ width: '100%', height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.hourly || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b' }}
                                    formatter={(value) => [value, t('dashboard.workers')]}
                                />
                                <defs>
                                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="workers" stroke="#10b981" strokeWidth={2.5} fill="url(#greenGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
)}

                {/* Top Performers & Late Arrivals */}
                {isLongTerm && dashboardLayout.top_performers?.visible && (
<div className={getLayoutClass("top_performers", "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5 flex flex-col max-h-[500px] overflow-y-auto custom-scrollbar")}>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 shrink-0">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            {t('dashboard.top_performers_today')}
                        </h3>
                        {topPerformers.length === 0 ? (
                            <div className="flex items-center justify-center py-4 text-slate-400 text-sm">
                                <p>{t('dashboard.no_workers_today')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {topPerformers.map((w, idx) => (
                                    <div key={w.worker_id} className="flex items-center gap-3 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                                            idx === 1 ? 'bg-slate-200 text-slate-600' :
                                            idx === 2 ? 'bg-orange-100 text-orange-600' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {`#${idx + 1}`}
                                        </div>
                                        <AvatarImg path={w.avatar_path} name={w.worker_name} size="w-8 h-8" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{w.worker_name}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{w.site_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-blue-600">{formatTime(w.live_hours)}</span>
                                            {w.status !== 'terminat' && !w.gps_lost && w.status !== 'gps_pierdut' && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {lateArrivals.length > 0 && <div className="border-t border-slate-100 dark:border-slate-700 my-4" />}

                    {/* Late Arrivals */}
                    {lateArrivals.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {t('dashboard.late_arrivals')} ({lateArrivals.length})
                            </h3>
                            <div className="space-y-2">
                                {lateArrivals.slice(0, 4).map(w => (
                                    <div key={w.worker_id} className="flex items-center gap-2 text-sm p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-full">
                                        <AvatarImg path={w.avatar_path} name={w.worker_name} size="w-6 h-6" textSize="text-[10px]" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{w.worker_name}</span>
                                        <span className="text-[11px] font-bold text-amber-700 bg-white dark:bg-amber-950 px-2 py-0.5 rounded-full shadow-sm">
                                            {new Date(w.check_in_time).toLocaleTimeString('ro-RO', { ...tzOption, hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* Alerts + Production — single card, two sections */}
                {isLongTerm && dashboardLayout.alerts_production?.visible && (
<div className={getLayoutClass("alerts_production", "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5 flex flex-col gap-5 max-h-[500px] overflow-y-auto custom-scrollbar")}>
                    
                    {/* Fleet Expiry Alerts */}
                    {fleetAlerts.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Alerte Flotă (Documente)
                            </h3>
                            <div className="space-y-2">
                                {fleetAlerts.map((a, i) => (
                                    <div key={i} className={`flex flex-col gap-1 text-sm bg-${a.status === 'expired' ? 'red' : 'orange'}-50 dark:bg-slate-800 p-2.5 rounded-full border border-${a.status === 'expired' ? 'red' : 'orange'}-200 dark:border-slate-700`}>
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-800 dark:text-white truncate" title={a.document_name}>{a.document_name}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${a.status === 'expired' ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>
                                                {a.status === 'expired' ? 'Expirat' : `Expiră în ${a.days_left} zile`}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                            {a.vehicle_name} ({a.registration})
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {(chartData.activities || []).length > 0 && <div className="border-t border-slate-100 dark:border-slate-700 mt-4" />}
                        </div>
                    )}

                    {/* Today's Activities Summary */}
                    {(chartData.activities || []).length > 0 ? (
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-violet-500" />
                                {t('dashboard.production_today')}
                            </h3>
                            <div className="space-y-2 overflow-y-auto">
                                {(chartData.activities || []).slice(0, 8).map((act, i) => (
                                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-full px-3 py-2 border border-slate-100 dark:border-slate-700">
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{act.name}</span>
                                        <span className="text-sm font-bold text-violet-600">
                                            {act.quantity} <span className="text-xs text-slate-400 font-normal">{act.unit_type}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : fleetAlerts.length === 0 && (
                        <div className="flex items-center justify-center flex-1 text-center">
                            <div>
                                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.all_ok')}</p>
                                <p className="text-xs text-slate-400 mt-1">{t('dashboard.no_alerts')}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Site Distribution Pie + Workers per Day */}
            {isLongTerm && (
            <>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        {t('dashboard.site_distribution')}
                    </h3>
                    {(chartData.sites || []).length > 0 ? (
                        <div style={{ width: '100%', height: 220 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={chartData.sites || []}
                                        dataKey="workers"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={85}
                                        innerRadius={50}
                                        paddingAngle={3}
                                    >
                                        {(chartData.sites || []).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                            <div className="text-center">
                                <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p>{t('dashboard.no_workers_today')}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-5">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-violet-500" />
                        {t('dashboard.workers_per_day')}
                    </h3>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer>
                            <BarChart data={daily} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', backgroundColor: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b' }}
                                    formatter={(value) => [value, t('dashboard.workers')]}
                                />
                                <defs>
                                    <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#a78bfa" />
                                    </linearGradient>
                                </defs>
                                <Bar dataKey="workers" fill="url(#violetGrad)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </>
            )}

            {/* ── Sesizări + Necesar ──────────────────────────────────── */}
            
                
                {/* Reclamații / Sesizări Reale */}
                {isLongTerm && dashboardLayout.worker_complaints?.visible && (
<div className={getLayoutClass("worker_complaints", "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden")}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Sesizări Muncitori
                            {complaints.length > 0 && (
                                <span className="ml-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                    {complaints.length}
                                </span>
                            )}
                        </h3>
                        <button onClick={() => navigate('/admin/complaints')} className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
                            <ChevronRight className="w-3 h-3" /> Toate
                        </button>
                    </div>
                    {complaints.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 font-medium">Nicio sesizare deschisă</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {complaints.slice(0, 5).map(c => (
                                <div key={c.id} onClick={() => navigate('/admin/complaints')} className="px-5 py-3 hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{c.user_name || 'Muncitor'}</p>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{c.title || c.content?.substring(0, 50)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">NOU</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
)}

                {/* Cereri Magazie — cereri noi neaprobate */}
                {isLongTerm && dashboardLayout.warehouse_requests?.visible && hasWarehouse && (
                <div className={getLayoutClass("warehouse_requests", "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden")}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-500" />
                            Cereri Magazie (Noi)
                            {sesizari.length > 0 && (
                                <span className="ml-1 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                    {sesizari.length}
                                </span>
                            )}
                        </h3>
                        <button onClick={() => navigate('/admin/material-requests')} className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
                            <ChevronRight className="w-3 h-3" /> Toate
                        </button>
                    </div>
                    {sesizari.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 font-medium">Nicio sesizare nouă</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {sesizari.slice(0, 5).map(req => (
                                <div key={req.id} onClick={() => navigate('/admin/material-requests')} className="px-5 py-3 hover:bg-amber-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{req.user_name || 'Muncitor'}</p>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{req.items_text?.split('\n')[0]?.substring(0, 50)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">NOU</span>
                                            <p className="text-[10px] text-slate-400 mt-1">{req.site_name || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                )}

                {/* Necesar + Livrat — aprobat nelivrat + istoric */}
                {isLongTerm && dashboardLayout.warehouse_status?.visible && hasWarehouse && (
                <div className={getLayoutClass("warehouse_status", "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden flex flex-col")}>
                    {/* Secțiunea: De Livrat */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-500" />
                            Necesar de Livrat
                            {necesar.length > 0 && (
                                <span className="ml-1 bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {necesar.length}
                                </span>
                            )}
                        </h3>
                        <button onClick={() => navigate('/admin/material-requests')} className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
                            <ChevronRight className="w-3 h-3" /> Toate
                        </button>
                    </div>
                    {necesar.length === 0 ? (
                        <div className="px-5 py-5 text-center">
                            <CheckCircle className="w-7 h-7 text-emerald-400 mx-auto mb-1" />
                            <p className="text-sm text-slate-500 font-medium">Totul a fost livrat</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {necesar.slice(0, 4).map(req => (
                                <div key={req.id} onClick={() => navigate('/admin/material-requests')} className="px-5 py-3 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <AvatarImg path={req.avatar_path} name={req.user_name} size="w-7 h-7" textSize="text-[10px]" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{req.user_name || 'Muncitor'}</p>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{req.items_text?.split('\n')[0]?.substring(0, 50)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">APROBAT</span>
                                            <p className="text-[10px] text-slate-400 mt-1">{req.site_name || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Divider + Secțiunea: Livrat Recent */}
                    <div className="border-t-4 border-slate-100 dark:border-slate-700/80 mt-auto">
                        <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                Livrat Recent
                                {livrat.length > 0 && (
                                    <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{livrat.length}</span>
                                )}
                            </p>
                        </div>
                        {livrat.length === 0 ? (
                            <div className="px-5 py-4 text-center">
                                <p className="text-xs text-slate-400">Nicio livrare înregistrată</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-52 overflow-y-auto">
                                {livrat.map(req => (
                                    <div key={req.id} onClick={() => navigate('/admin/material-requests')} className="px-5 py-3 hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                        {/* Cui + data */}
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <AvatarImg path={req.avatar_path} name={req.user_name} size="w-6 h-6" textSize="text-[9px]" />
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{req.user_name || 'Muncitor'}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                {req.updated_at ? new Date(req.updated_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        {/* Unde */}
                                        {req.site_name && req.site_name !== 'N/A' && (
                                            <div className="flex items-center gap-1 mb-1 mt-1">
                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">{req.site_name}</span>
                                            </div>
                                        )}
                                        {/* Ce s-a livrat */}
                                        <p className="text-xs text-slate-500 truncate">{req.items_text?.split('\n')[0]?.substring(0, 60)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                )}

            
</div>

{/* Live Workers Table */}
            {isLongTerm && dashboardLayout.live_workers?.visible && (() => {
                const liveWorkers = activeWorkers.filter(w => w.status !== 'terminat')
                const doneWorkers = activeWorkers.filter(w => w.status === 'terminat')
                const columns = [
                    {
                        key: 'worker',
                        label: t('dashboard.worker'),
                        sortable: true,
                        sortFn: (a, b) => (a.worker_name || '').localeCompare(b.worker_name || ''),
                        render: (worker) => (
                            <div className="flex items-center gap-3">
                                <AvatarImg path={worker.avatar_path} name={worker.worker_name} size="w-10 h-10" />
                                <div>
                                    <div className="text-sm font-semibold text-blue-700 hover:text-blue-900 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); openWorkerDetail(worker) }}>{worker.worker_name}</div>
                                    <div className="text-xs text-slate-500">{worker.employee_code}</div>
                                </div>
                            </div>
                        )
                    },
                    {
                        key: 'site_name',
                        label: t('dashboard.site'),
                        sortable: true,
                        render: (worker) => (
                            <div className="flex items-center gap-1.5 text-sm text-slate-700">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {worker.site_name || '—'}
                            </div>
                        )
                    },
                    {
                        key: 'check_in_time',
                        label: t('dashboard.check_in'),
                        sortable: true,
                        render: (worker) => <span className="text-sm text-slate-600">{worker.check_in_time ? new Date(worker.check_in_time).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    },
                    {
                        key: 'worked_hours',
                        label: t('dashboard.hours_worked'),
                        sortable: true,
                        sortFn: (a, b) => getLiveHours(a) - getLiveHours(b),
                        render: (worker) => (
                            <>
                                <span className={`text-sm font-bold ${worker.status === 'terminat' ? 'text-slate-600' : 'text-blue-600'}`}>
                                    {formatTime(getLiveHours(worker))}
                                </span>
                                {worker.status !== 'terminat' && !worker.gps_lost && worker.status !== 'gps_pierdut' && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                                {worker.break_hours > 0 && <span className="text-xs text-orange-500 ml-2">({t('dashboard.break')}: {formatTime(worker.break_hours)})</span>}
                            </>
                        )
                    },
                    {
                        key: 'status',
                        label: t('common.status'),
                        sortable: true,
                        render: (worker) => <StatusBadge status={worker.status} is_on_break={worker.is_on_break} is_outside_geofence={worker.is_outside_geofence} gps_lost={worker.gps_lost} />
                    },
                    {
                        key: 'activities',
                        label: t('dashboard.activities'),
                        sortable: false,
                        render: (worker) => (
                            worker.activities && worker.activities.length > 0 ? (
                                <div className="relative group inline-block">
                                    <button 
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect()
                                            setActivityPopup(activityPopup?.worker_id === worker.worker_id ? null : { ...worker, anchorRect: rect })
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 cursor-pointer hover:bg-violet-200 transition-colors"
                                    >
                                        <Activity className="w-3 h-3" />
                                        {worker.activities.length} {worker.activities.length === 1 ? 'activitate' : 'activități'}
                                    </button>
                                </div>
                            ) : <span className="text-xs text-slate-400">—</span>
                        )
                    }
                ]

                return (
                    <>
                        {/* Active Workers */}
                        <div id="live-workers-table" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-visible mb-4 scroll-mt-6">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    {t('dashboard.live_workers_title')}
                                </h3>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => navigate('/admin/timesheets')} className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> {t('nav.timesheets')}
                                    </button>
                                    <button onClick={fetchActiveWorkers} disabled={workersLoading} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                                        <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${workersLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            {liveWorkers.length === 0 ? (
                                <div className="px-5 py-8 text-center text-slate-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="font-medium text-slate-500">{t('dashboard.no_active_workers')}</p>
                                    <p className="text-xs mt-1">{t('dashboard.will_appear_on_checkin')}</p>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <DataTable
                                        columns={columns}
                                        data={liveWorkers}
                                        searchable={true}
                                        searchPlaceholder="Caută muncitor..."
                                        pagination={true}
                                        itemsPerPage={10}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Finished Workers */}
                        {doneWorkers.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-visible mb-6">
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                    <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-slate-400" /> {t('dashboard.finished_today')}
                                    </h3>
                                </div>
                                <div className="p-4">
                                    <DataTable
                                        columns={columns}
                                        data={doneWorkers}
                                        searchable={true}
                                        searchPlaceholder="Caută muncitor terminat..."
                                        pagination={true}
                                        itemsPerPage={5}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )
            })()}

            {/* Quick Actions */}
            {isLongTerm && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickAction icon={Clock} title={t('nav.timesheets')} desc={t('dashboard.view_timesheets')} color="bg-blue-500" onClick={() => navigate('/admin/timesheets')} />
                <QuickAction icon={BarChart3} title={t('nav.reports')} desc={t('dashboard.generate_report')} color="bg-indigo-500" onClick={() => navigate('/admin/reports')} />
                <QuickAction icon={Activity} title={t('nav.activities')} desc={t('dashboard.manage_catalog')} color="bg-violet-500" onClick={() => navigate('/admin/activities')} />
                <QuickAction icon={Users} title={t('nav.users')} desc={`${stats.total_users} ${t('users.total_label')}`} color="bg-slate-600" onClick={() => navigate('/admin/users')} />
            </div>
            )}

            {/* Worker Detail Drawer */}
            {selectedWorker && (
                <div className="fixed inset-0 z-[9999] flex">
                    <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={closeWorkerDetail} />
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto" style={{ animation: 'slideInRight 0.25s ease-out' }}>
                        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
                            <button onClick={closeWorkerDetail} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
                                <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                            </button>
                            <button onClick={closeWorkerDetail} className="p-1.5 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>

                        {detailLoading ? (
                            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                        ) : workerDetail ? (
                            <div className="p-6 space-y-6">
                                {/* Worker Profile */}
                                <div className="flex items-center gap-4">
                                    <AvatarImg path={workerDetail.worker.avatar_path} name={workerDetail.worker.full_name} size="w-16 h-16" textSize="text-xl" />
                                    <div>
                                        <h2 
                                            className="text-xl font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/admin/employees/${workerDetail.worker.id}`)}
                                        >
                                            {workerDetail.worker.full_name}
                                        </h2>
                                        <p className="text-sm text-slate-500">{workerDetail.worker.employee_code} • {workerDetail.worker.role_name}</p>
                                        <StatusBadge status={selectedWorker.status} is_on_break={selectedWorker.is_on_break} is_outside_geofence={selectedWorker.is_outside_geofence} gps_lost={selectedWorker.gps_lost} />
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                                    {workerDetail.worker.phone && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Phone className="w-4 h-4 text-slate-400" />
                                            <a href={`tel:${workerDetail.worker.phone}`} className="text-blue-600 hover:underline">{workerDetail.worker.phone}</a>
                                        </div>
                                    )}
                                    {workerDetail.worker.email && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-700">{workerDetail.worker.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Today's Shift Summary */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('dashboard.todays_shift')}</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                                            <div className="text-lg font-bold text-blue-600">{formatTime(getLiveHours(selectedWorker))}</div>
                                            <div className="text-[10px] text-blue-500 mt-0.5">{t('dashboard.hours_worked')}</div>
                                        </div>
                                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                                            <div className="text-lg font-bold text-orange-600">{formatTime(selectedWorker.break_hours || 0)}</div>
                                            <div className="text-[10px] text-orange-500 mt-0.5">{t('dashboard.break')}</div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                                            <div className="text-lg font-bold text-slate-700">
                                                {selectedWorker.check_in_time ? new Date(selectedWorker.check_in_time).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">Check-in</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Today's Activities */}
                                {selectedWorker.activities && selectedWorker.activities.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('dashboard.reported_activities_today')}</h3>
                                        <div className="space-y-2">
                                            {selectedWorker.activities.map((act, i) => (
                                                <div key={i} className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700">{act.name}</span>
                                                        {act.added_at && (
                                                            <span className="ml-2 text-[11px] text-slate-400">
                                                                {new Date(act.added_at).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-violet-600">{act.quantity} <span className="text-xs text-slate-400 font-normal">{act.unit_type}</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* History Summary */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-indigo-600">{workerDetail.summary.total_days}</div>
                                        <div className="text-xs text-indigo-500 mt-1">{t('dashboard.total_days_worked')}</div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-emerald-600">{formatTime(workerDetail.summary.total_hours)}</div>
                                        <div className="text-xs text-emerald-500 mt-1">{t('reports.total_hours')}</div>
                                    </div>
                                </div>

                                {/* Recent History */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('dashboard.recent_timesheets')}</h3>
                                    <div className="space-y-2">
                                        {workerDetail.history.slice(0, 7).map((entry, i) => (
                                            <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {new Date(entry.date).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin',  weekday: 'short', day: 'numeric', month: 'short' })}
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-600">{formatTime(entry.worked_hours)}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {entry.site_name}</span>
                                                    {entry.check_in && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(entry.check_in).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit' })}</span>}
                                                </div>
                                                {entry.activities.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {entry.activities.map((a, j) => (
                                                            <span key={j} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                                                {a.name}: {a.quantity} {a.unit_type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-20 text-slate-400"><p>Eroare la încărcarea datelor</p></div>
                        )}
                    </div>
                </div>
            )}

            {/* Activity Popup (Portal) */}
            {activityPopup && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setActivityPopup(null)} />
                    <div
                        className="fixed z-[110] bg-slate-900 text-white rounded-xl shadow-2xl p-3 min-w-[240px] max-w-[320px] animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            top: Math.max(10, Math.min(activityPopup.anchorRect.top - 10, window.innerHeight - 200)),
                            left: Math.max(10, Math.min(activityPopup.anchorRect.left, window.innerWidth - 260)),
                        }}
                    >
                        <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-purple-400" />
                                Activități Raportate
                            </h4>
                            <button onClick={() => setActivityPopup(null)} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto hide-scrollbar">
                            {activityPopup.activities.map((a, i) => (
                                <div key={i} className="flex justify-between items-center gap-4 bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                                    <span className="font-medium text-slate-200 text-xs">{a.name}</span>
                                    <span className="font-bold text-purple-300 text-xs whitespace-nowrap">{a.quantity} <span className="text-[10px] text-slate-400 font-normal">{a.unit_type}</span></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Quick Create Modal */}
            {quickCreateData && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700" style={{ animation: 'slideInUp 0.3s ease-out' }}>
                        <div className="px-5 py-4 bg-blue-600 dark:bg-slate-800 flex items-center justify-between rounded-t-2xl">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Creare Rapidă
                            </h3>
                            <button onClick={() => setQuickCreateData(null)} className="text-blue-100 hover:text-white p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleQuickCreateSubmit} className="p-5 space-y-4">
                            {quickCreateStep === 1 && (
                                <>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Client (Opțional)</label>
                                            <button type="button" onClick={() => setQuickCreateStep('new-client')} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors">
                                                <Plus className="w-3 h-3" /> Client Nou
                                            </button>
                                        </div>
                                        <SearchableSelect
                                            value={quickCreateForm.clientId || ""}
                                            onChange={val => {
                                                const c = clients.find(cl => String(cl.id) === String(val))
                                                setQuickCreateForm(p => ({
                                                    ...p,
                                                    clientId: val,
                                                    title: c && !p.title ? c.name : p.title,
                                                    address: c && !p.address ? c.address : p.address,
                                                    latitude: c && !p.latitude ? c.latitude : p.latitude,
                                                    longitude: c && !p.longitude ? c.longitude : p.longitude
                                                }))
                                            }}
                                            options={clients.map(c => ({ value: String(c.id), label: c.name }))}
                                            placeholder="-- Alege client --"
                                            buttonClassName="rounded-xl h-11 text-sm font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Titlu Lucrare *</label>
                                        <input 
                                            type="text"
                                            autoFocus
                                            required
                                            value={quickCreateForm.title}
                                            onChange={e => setQuickCreateForm({ ...quickCreateForm, title: e.target.value })}
                                            className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ex: Șapă Rezi Ilfov..."
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Adresă / Localitate (Opțional)</label>
                                            <button
                                                type="button"
                                                onClick={handleDetectGPS}
                                                disabled={detectingLocation}
                                                className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800 disabled:opacity-60"
                                            >
                                                {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                                GPS Automat
                                            </button>
                                        </div>
                                        <AddressAutocomplete 
                                            value={quickCreateForm.address}
                                            onChange={(addr, lat, lon) => {
                                                setQuickCreateForm(p => ({ 
                                                    ...p, 
                                                    address: addr,
                                                    ...(lat && lon ? { latitude: lat, longitude: lon } : {})
                                                }))
                                            }}
                                            className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ex: București, Sector 1"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Suprafață (m²)</label>
                                            <input 
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={quickCreateForm.surface}
                                                onChange={e => setQuickCreateForm({ ...quickCreateForm, surface: e.target.value })}
                                                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Ex: 150"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Grosime (cm)</label>
                                            <input 
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={quickCreateForm.thickness}
                                                onChange={e => setQuickCreateForm({ ...quickCreateForm, thickness: e.target.value })}
                                                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Ex: 6.5"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={!!quickCreateForm.has_foil}
                                                onChange={e => setQuickCreateForm({ ...quickCreateForm, has_foil: e.target.checked })}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                            />
                                            Include Folie plastic (1,2 EUR/m²)
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={!!quickCreateForm.has_mesh}
                                                onChange={e => setQuickCreateForm({ ...quickCreateForm, has_mesh: e.target.checked })}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                            />
                                            Include Plasă metalică (2,50 EUR/m²)
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={!!quickCreateForm.has_duramint}
                                                onChange={e => setQuickCreateForm({ ...quickCreateForm, has_duramint: e.target.checked })}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                            />
                                            Include Duramint
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Echipă Alocată</label>
                                        <SearchableSelect
                                            value={quickCreateData.teamId || ''}
                                            onChange={val => setQuickCreateData(p => ({...p, teamId: val}))}
                                            options={[
                                                { value: '', label: '-- Fără echipă (Draft) --' },
                                                ...teams.map(t => ({ value: String(t.id), label: t.name }))
                                            ]}
                                            placeholder="-- Fără echipă (Draft) --"
                                            buttonClassName="rounded-xl h-11 text-sm font-semibold"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-3">
                                        <button type="button" onClick={() => setQuickCreateData(null)} className="h-11 px-4 font-bold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                            Anulează
                                        </button>
                                        <button type="button" onClick={(e) => handleQuickCreateSubmit(e, false)} disabled={quickCreateSaving || !quickCreateForm.title} className="flex-1 h-11 font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-full shadow-sm transition-all flex items-center justify-center gap-2">
                                            {quickCreateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmă Comanda'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {quickCreateStep === 'new-client' && (
                                <>
                                    <div className="flex items-center gap-2 mb-2">
                                        <button type="button" onClick={() => setQuickCreateStep(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><ArrowLeft className="w-4 h-4"/></button>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Adaugă Client Nou</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tip Client</label>
                                        <div className="flex gap-2">
                                            <label className={`flex-1 flex items-center justify-center gap-2 p-2 border rounded-full cursor-pointer transition-colors ${quickCreateClientForm.type === 'fizica' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                <input type="radio" className="hidden" checked={quickCreateClientForm.type === 'fizica'} onChange={() => setQuickCreateClientForm(p => ({...p, type: 'fizica'}))} /> Fizică
                                            </label>
                                            <label className={`flex-1 flex items-center justify-center gap-2 p-2 border rounded-full cursor-pointer transition-colors ${quickCreateClientForm.type === 'juridica' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                <input type="radio" className="hidden" checked={quickCreateClientForm.type === 'juridica'} onChange={() => setQuickCreateClientForm(p => ({...p, type: 'juridica'}))} /> Juridică
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nume Client *</label>
                                        <input type="text" autoFocus required value={quickCreateClientForm.name} onChange={e => setQuickCreateClientForm(p => ({...p, name: e.target.value}))} className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Popescu Ion / Firma SRL" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{quickCreateClientForm.type === 'fizica' ? 'CNP (Opțional)' : 'CUI *'}</label>
                                        <input type="text" required={quickCreateClientForm.type === 'juridica'} value={quickCreateClientForm.identifier} onChange={e => setQuickCreateClientForm(p => ({...p, identifier: e.target.value}))} className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                            <input type="text" value={quickCreateClientForm.phone} onChange={e => setQuickCreateClientForm(p => ({...p, phone: e.target.value}))} className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                            <input type="email" value={quickCreateClientForm.email} onChange={e => setQuickCreateClientForm(p => ({...p, email: e.target.value}))} className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-3">
                                        <button type="button" onClick={() => setQuickCreateStep(1)} className="flex-1 h-11 px-4 font-bold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                            Înapoi
                                        </button>
                                        <button type="button" onClick={handleQuickCreateClient} disabled={quickCreateSaving || !quickCreateClientForm.name} className="flex-1 h-11 font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-full shadow-sm transition-all flex items-center justify-center gap-2">
                                            {quickCreateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvează Client'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes slideInUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    )
}

/* ─── Helper Components ─── */

function AvatarImg({ path, name, size = 'w-8 h-8', textSize = 'text-xs' }) {
    if (path) {
        return (
            <div className={`shrink-0 group flex items-center justify-center`}>
                <img 
                    src={path.startsWith('http') ? path : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${path}`} 
                    alt="" 
                    className={`${size} rounded-lg object-cover object-[center_20%] ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 relative z-0 hover:z-50 transition-transform duration-200 hover:scale-[2.5] hover:shadow-2xl`} 
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }} 
                />
                <div className={`${size} rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center font-bold ${textSize} text-slate-500 shrink-0 hidden`}>
                    {name?.substring(0, 2).toUpperCase() || 'W'}
                </div>
            </div>
        )
    }
    return (
        <div className={`${size} rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold ${textSize} text-slate-500 shrink-0`}>
            {name?.substring(0, 2).toUpperCase() || 'W'}
        </div>
    )
}

function StatusBadge({ status, is_on_break, is_outside_geofence, gps_lost }) {
    const { t } = useTranslation()
    if (status === 'geofence' || is_outside_geofence) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><ShieldAlert className="w-3 h-3" /> {t('dashboard.outside_zone')}</span>
    }
    if (status === 'gps_pierdut' || gps_lost) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><WifiOff className="w-3 h-3" /> {t('dashboard.gps_lost')}</span>
    }
    if (status === 'pauză' || is_on_break) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700"><Coffee className="w-3 h-3" /> {t('dashboard.on_break_status')}</span>
    }
    if (status === 'terminat') {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"><CheckCircle className="w-3 h-3" /> {t('dashboard.done')}</span>
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {t('dashboard.working')}</span>
}


function QuickAction({ icon: Icon, title, desc, color, onClick }) {
    return (
        <div onClick={onClick} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all shadow-md">
            <div className="flex items-start gap-3">
                <div className={`p-2 ${color} rounded-full`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                    <p className="text-xs text-slate-500 truncate">{desc}</p>
                </div>
            </div>
        </div>
    )
}
