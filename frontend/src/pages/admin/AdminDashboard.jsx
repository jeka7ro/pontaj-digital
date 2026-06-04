import { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet, NavLink, useLocation, Navigate } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import { useTenantStore } from '../../store/tenantStore'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../../components/LanguageSelector'
import {
    LayoutDashboard, Users, Building2, FileText, Settings, LogOut,
    ChevronLeft, Clock, Activity, Bell, ChevronRight, Camera, Sun, Moon, Truck, Package, Briefcase, Shield, HardHat, MessageSquareWarning, BedDouble, Wallet, PackageSearch, AlertTriangle, Megaphone, Globe, Navigation, ClipboardList, CalendarDays, Menu
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function AdminDashboard() {
    const { admin, logout, updateAdmin } = useAdminStore()
    const { tenant } = useTenantStore()
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [notifCount, setNotifCount] = useState(0)
    const [lastSeenCount, setLastSeenCount] = useState(0)
    const notifRef = useRef(null)

    // Birthdays
    const [birthdayUsers, setBirthdayUsers] = useState([])
    const [showBirthdayPopup, setShowBirthdayPopup] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/admin/login')
    }

    // Auto-refresh admin profile (name, avatar) without re-login
    useEffect(() => {
        const refreshProfile = async () => {
            try {
                const res = await api.get('/admin/me')
                if (res.data) updateAdmin(res.data)
            } catch { /* silently fail */ }
        }
        refreshProfile()
    }, [])

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const res = await api.get('/admin/notifications/feed')
            const events = res.data?.events || []
            setNotifications(events)
            setNotifCount(events.length)
        } catch (e) { /* silently fail */ }
    }

    useEffect(() => {
        fetchNotifications()
        const t = setInterval(fetchNotifications, 30000)
        return () => clearInterval(t)
    }, [])

    const currentSubdomain = useTenantStore((state) => state.getCurrentSubdomain())

    useEffect(() => {
        if (!currentSubdomain && (admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) && location.pathname === '/admin/dashboard') {
            navigate('/admin/organizations', { replace: true })
        }
    }, [currentSubdomain, admin, location.pathname, navigate])

    // Fetch Birthdays
    useEffect(() => {
        const checkBirthdays = async () => {
            const todayStr = new Date().toISOString().split('T')[0]
            const lastShown = localStorage.getItem('pontaj_birthday_shown_date')
            if (lastShown === todayStr) return

            try {
                const res = await api.get('/admin/users/')
                const users = res.data || []
                const today = new Date()
                const todayMonth = today.getMonth() + 1
                const todayDay = today.getDate()

                const bdays = users.filter(u => {
                    if (!u.birth_date || u.birth_date === 'None') return false
                    const b = new Date(u.birth_date)
                    return b.getMonth() + 1 === todayMonth && b.getDate() === todayDay
                })

                if (bdays.length > 0) {
                    setBirthdayUsers(bdays)
                    setShowBirthdayPopup(true)
                    localStorage.setItem('pontaj_birthday_shown_date', todayStr)
                }
            } catch(e) {}
        }
        checkBirthdays()
    }, [])

    // Fetch open complaints count for badge
    const [openComplaintsCount, setOpenComplaintsCount] = useState(0)
    const fetchComplaintsCount = async () => {
        try {
            const res = await api.get('/admin/complaints/unread-count')
            setOpenComplaintsCount(res.data?.count || 0)
        } catch { /* silently */ }
    }
    useEffect(() => {
        fetchComplaintsCount()
        const t = setInterval(fetchComplaintsCount, 60000)
        return () => clearInterval(t)
    }, [])

    // Fetch pending leaves count for badge
    const [pendingLeavesCount, setPendingLeavesCount] = useState(0)
    const fetchLeavesCount = async () => {
        try {
            const res = await api.get('/admin/leaves/pending-count')
            setPendingLeavesCount(res.data?.count || 0)
        } catch { /* silently */ }
    }
    useEffect(() => {
        fetchLeavesCount()
        const t = setInterval(fetchLeavesCount, 60000)
        return () => clearInterval(t)
    }, [])

    // Close panel on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const unreadCount = Math.max(0, notifCount - lastSeenCount)

    // Sidebar Categories
    const categories = [
        {
            id: 'general',
            label: 'General',
            items: [
                { path: '/admin/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
                { path: '/admin/timesheets', icon: Clock, label: t('nav.timesheets') },
                { path: '/admin/reports', icon: FileText, label: t('nav.reports') },
            ]
        },
        {
            id: 'hr',
            label: 'Resurse Umane',
            items: [
                { path: '/admin/employees', icon: HardHat, label: 'Angajați' },
                { path: '/admin/teams', icon: Users, label: t('nav.teams') },
                { path: '/admin/leaves', icon: CalendarDays, label: 'Concedii & Absențe', badge: pendingLeavesCount },
                { path: '/admin/accommodations', icon: BedDouble, label: 'Cazări' },
            ]
        },
        {
            id: 'operations',
            label: 'Operațiuni',
            items: [
                { path: '/admin/sites', icon: Building2, label: t('nav.sites') },
                { path: '/admin/clients', icon: Briefcase, label: t('nav.clients', 'Clienți') },
                { path: '/admin/work-orders', icon: ClipboardList, label: 'Comenzi de Lucru' },
                { path: '/admin/activities', icon: Activity, label: t('nav.activities') },
                { path: '/admin/site-photos', icon: Camera, label: t('nav.site_photos') },
            ]
        },
        {
            id: 'logistics',
            label: 'Logistică & Financiar',
            items: [
                { path: '/admin/warehouse', icon: Package, label: t('nav.warehouse', 'Magazie') },
                { path: '/admin/fleet', icon: Truck, label: t('nav.fleet') },
                { path: '/admin/transport', icon: Navigation, label: 'Foi de Parcurs' },
                { path: '/admin/material-requests', icon: PackageSearch, label: 'Necesar Materiale' },
                { path: '/admin/expenses', icon: Wallet, label: 'Deconturi / Cheltuieli' },
            ]
        },
        {
            id: 'support',
            label: 'Suport & Alerte',
            items: [
                { path: '/admin/alerts', icon: Megaphone, label: 'Avizier (Alerte)' },
                { path: '/admin/emergencies', icon: AlertTriangle, label: 'Urgențe' },
                { path: '/admin/complaints', icon: MessageSquareWarning, label: 'Sesizări', badge: openComplaintsCount },
            ]
        },
        {
            id: 'system',
            label: 'Sistem',
            items: [
                { path: '/admin/users', icon: Shield, label: 'Utilizatori' },
                { path: '/admin/settings', icon: Settings, label: t('nav.settings') },
                { path: '/admin/notifications', icon: Bell, label: t('nav.notifications') },
            ]
        }
    ]

    // Adăugăm meniul SaaS Management doar dacă este Master Admin
    if (admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) {
        categories.push({
            id: 'saas',
            label: 'Platformă SaaS',
            items: [
                { path: '/admin/organizations', icon: Globe, label: 'Companii (Tenants)' }
            ]
        })
    }

    const tenantFeatures = tenant?.features || []
    const hasLongTerm = tenant?.has_long_term_sites !== false
    const hasShortTerm = tenant?.has_short_term_interventions === true

    const isFeatureEnabled = (path) => {
        if (['/admin/sites', '/admin/site-photos'].includes(path)) return hasLongTerm
        if (path === '/admin/work-orders') return hasShortTerm
        if (['/admin/fleet', '/admin/transport'].includes(path)) return tenantFeatures.includes('fleet')
        if (['/admin/warehouse', '/admin/material-requests'].includes(path)) return tenantFeatures.includes('warehouse') || tenant?.has_warehouse === true
        if (path === '/admin/accommodations') return tenantFeatures.includes('accommodations')
        if (path === '/admin/expenses') return tenantFeatures.includes('expenses')
        if (path === '/admin/reports') return tenantFeatures.includes('reports')
        return true
    }

    const filteredCategories = categories.map(cat => {
        let roleFilteredItems = admin?.role === 'LOGISTIC'
            ? cat.items.filter(item => ['/admin/warehouse', '/admin/fleet', '/admin/transport', '/admin/settings', '/admin/notifications'].includes(item.path))
            : cat.items
            
        let featureFilteredItems = roleFilteredItems.filter(item => isFeatureEnabled(item.path))

        return {
            ...cat,
            items: featureFilteredItems
        }
    }).filter(cat => {
        // Dacă e super admin FĂRĂ organizație, ascundem operațiunile (doar SaaS și System)
        if ((admin?.role === 'SUPER_ADMIN' || admin?.is_super_admin) && !admin?.organization_id) {
            return ['saas', 'system'].includes(cat.id)
        }
        return cat.items.length > 0
    })

    const [expandedCategories, setExpandedCategories] = useState({ general: true })

    // Auto-expand category based on current route
    useEffect(() => {
        setExpandedCategories(prev => {
            const next = { ...prev }
            let found = false
            filteredCategories.forEach(cat => {
                if (cat.items.some(item => location.pathname.startsWith(item.path))) {
                    next[cat.id] = true
                    found = true
                }
            })
            return found ? next : prev
        })
        
        // Auto-close sidebar on mobile after navigation
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setSidebarOpen(false)
        }
    }, [location.pathname])

    const toggleCategory = (id) => {
        setExpandedCategories(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark'
        }
        return false
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [darkMode])

    return (
        <div className={`h-[100dvh] w-full ${darkMode ? 'bg-slate-950' : 'bg-slate-50'} flex font-sans text-slate-800 transition-colors duration-300 overflow-hidden`}>
            
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[75] transition-opacity" 
                    onClick={() => setSidebarOpen(false)} 
                />
            )}

            {/* Sidebar */}
            <aside className={`
                ${sidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'} 
                max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[80]
                bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 text-slate-800 dark:text-white transition-all duration-300 flex flex-col relative
            `}>
                
                {/* Logo Area matches Header height */}
                <div className={`h-20 flex items-center border-b border-slate-200 dark:border-white/10 shrink-0 transition-colors ${sidebarOpen ? 'px-3' : 'px-0 justify-center'} relative`}>
                    <div className={`flex items-center ${sidebarOpen ? 'gap-2 w-full pr-8' : 'justify-center'}`}>
                        {tenant ? (
                            <>
                                <div className={`flex items-center justify-center shrink-0 ${sidebarOpen ? 'w-14 h-14' : 'w-10 h-10'}`}>
                                    {tenant.logo_url ? (
                                        <img src={tenant.logo_url} alt="Tenant Logo" className="w-full h-full object-contain bg-white rounded-lg p-1" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm border border-white/20">
                                            {tenant.name?.charAt(0) || 'P'}
                                        </div>
                                    )}
                                </div>
                                {sidebarOpen && (
                                    <div className="flex-1 min-w-0 pl-3 pr-2">
                                        <h2 className="font-extrabold text-[14px] leading-tight tracking-tighter text-slate-900 dark:text-white/95 truncate">{tenant.name}</h2>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className={`flex items-center justify-center shrink-0 ${sidebarOpen ? 'w-full px-2' : 'w-10 h-10'}`}>
                                    {sidebarOpen ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                                <span className="text-white font-bold text-xs">ST</span>
                                            </div>
                                            <span className="font-extrabold text-[14px] leading-tight tracking-tighter text-slate-900 dark:text-white/95">Smart Timesheet</span>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">ST</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {filteredCategories.map((cat, index) => (
                        <div key={cat.id} className="space-y-1">
                            {/* Category Header (Only visible if sidebar open) */}
                            {sidebarOpen && (
                                <div 
                                    onClick={() => toggleCategory(cat.id)}
                                    className="flex items-center justify-between px-2 py-1.5 mb-1 cursor-pointer group select-none"
                                >
                                    <span className="text-[11px] font-bold text-slate-900 font-black dark:font-bold dark:text-slate-400 uppercase tracking-widest tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                                        {cat.label}
                                    </span>
                                    <ChevronRight className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-transform duration-200 ${expandedCategories[cat.id] ? 'rotate-90' : ''}`} />
                                </div>
                            )}

                            {/* Items Container */}
                            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? (expandedCategories[cat.id] ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0') : 'max-h-none opacity-100'}`}>
                                {cat.items.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-full transition-all duration-200 ${isActive
                                                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                                                : 'text-slate-900 font-bold dark:font-normal dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-100 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-white'
                                            }`
                                        }
                                        title={!sidebarOpen ? item.label : undefined}
                                    >
                                        <item.icon className="w-5 h-5 shrink-0" />
                                        {sidebarOpen && <span className="text-sm truncate flex-1">{item.label}</span>}
                                        
                                        {/* Badge Support */}
                                        {sidebarOpen && item.badge > 0 && (
                                            <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                        {!sidebarOpen && item.badge > 0 && (
                                            <span className="absolute left-7 top-1 w-2 h-2 bg-orange-500 rounded-full" />
                                        )}
                                    </NavLink>
                                ))}
                            </div>

                            {/* Separator when collapsed */}
                            {!sidebarOpen && index < filteredCategories.length - 1 && (
                                <div className="h-px bg-slate-200 dark:bg-white/5 my-3 mx-2" />
                            )}
                        </div>
                    ))}
                </nav>

                {/* Footer Brand */}
                <div className="py-5 px-4 border-t border-slate-200 dark:border-white/10 shrink-0 flex flex-col items-center justify-center gap-1.5 w-full overflow-hidden">
                    <div 
                        className={`flex items-center justify-center w-full ${sidebarOpen ? 'ml-7' : 'ml-0'}`}
                        title="Smart Timesheet"
                    >
                        {sidebarOpen ? (
                             <img src="/getapp_smart_timesheet_white.png" alt="Smart Timesheet" className="w-[188px] h-auto object-contain opacity-70 dark:invert-0 invert" />
                        ) : (
                             <img src="/getapp_smart_timesheet_icon.png" alt="Smart Timesheet Icon" className="w-10 h-10 object-contain opacity-70 scale-110 dark:invert-0 invert" />
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area — dark class on html element handles all dark: variants */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Header Bar */}
                <header className={`h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 px-6 flex items-center justify-between sticky top-0 z-40 text-slate-800 dark:text-white shadow-sm transition-colors shadow-slate-900/10`}>
                    <div className="flex items-center gap-4">
                         <button 
                             onClick={() => setSidebarOpen(!sidebarOpen)}
                             className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors hidden md:block"
                             title={sidebarOpen ? t('admin.collapse_menu') : t('admin.expand_menu')}
                         >
                             <Menu className="w-5 h-5" />
                         </button>
                         <span className={`font-bold text-lg hidden sm:block tracking-tight text-slate-900 font-extrabold dark:text-white/90`}>{t('admin.admin_system')}</span>
                    </div>

                    <div className="flex items-center gap-5">
                        {/* Language Selector */}
                        <LanguageSelector variant={darkMode ? 'dark' : 'light'} />

                        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/20"></div>

                        {/* Theme Toggle Button & Notifications */}
                        <div className="flex items-center gap-2">
                           <button
                               onClick={() => setDarkMode(!darkMode)}
                               title={darkMode ? t('admin.light_mode') : t('admin.dark_mode')}
                               className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm"
                           >
                               {darkMode
                                   ? <Moon className="w-4 h-4 text-blue-300" />
                                   : <Sun className="w-4 h-4 text-amber-500" />
                               }
                           </button>
                           <button onClick={() => navigate('/admin/complaints')} className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 transition-colors relative text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 shadow-sm" title="Sesizări Noi">
                               <MessageSquareWarning className="w-4 h-4" />
                               {openComplaintsCount > 0 && (
                                   <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full border-2 border-white dark:border-slate-900">
                                       {openComplaintsCount > 99 ? '99+' : openComplaintsCount}
                                   </span>
                               )}
                           </button>
                           <button className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 transition-colors relative text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 shadow-sm" onClick={() => navigate('/admin/notifications')}>
                               <Bell className="w-4 h-4" />
                               {unreadCount > 0 && (
                                   <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                               )}
                           </button>
                        </div>
                        
                        <div className="w-[1px] h-8 bg-slate-200 dark:bg-white/20"></div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none">{admin?.full_name}</p>
                                <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center justify-end w-full gap-1 mt-1 cursor-pointer hover:underline group">
                                    <LogOut className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform"/> {t('admin.logout')}
                                </button>
                            </div>
                            {admin?.avatar_path ? (
                                <img 
                                    src={admin.avatar_path.startsWith('http') ? admin.avatar_path : `${API_BASE}${admin.avatar_path}`}
                                    alt={admin.full_name}
                                    className="w-9 h-11 rounded-lg object-cover object-[center_20%] ring-2 ring-white/20 shadow-md hover:ring-blue-400/50 transition-all cursor-pointer hover:scale-105"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                />
                            ) : null}
                            <div className={`w-9 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg items-center justify-center font-bold text-white shadow-md cursor-pointer hover:shadow-lg transition-all border-2 border-white/20 ${admin?.avatar_path ? 'hidden' : 'flex'}`}>
                                {admin?.full_name?.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main View Outlet */}
                <main className={`flex-1 overflow-auto relative p-4 pb-24 md:pb-4 custom-scrollbar transition-colors ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                    <Outlet />
                </main>
            </div>

            {/* Bottom Navigation Bar (Admin Mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-2 py-3 flex justify-between items-center shadow-[0_-10px_25px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_25px_rgba(0,0,0,0.5)] z-[70]">
                {/* 1. Angajati */}
                <NavLink to="/admin/employees" className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-blue-600 dark:text-blue-400 scale-110 drop-shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>
                    <HardHat className="w-6 h-6 mb-1.5" />
                    <span className="text-[10px] font-bold">Angajați</span>
                </NavLink>

                {/* 2. Șantiere */}
                <NavLink to="/admin/sites" className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-orange-600 dark:text-orange-400 scale-110 drop-shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>
                    <Building2 className="w-6 h-6 mb-1.5" />
                    <span className="text-[10px] font-bold">Șantiere</span>
                </NavLink>

                {/* 3. Dashboard (Home) */}
                <div className="relative flex justify-center w-[96px]">
                    <button onClick={() => navigate('/admin/dashboard')} className={`absolute -top-12 flex flex-col items-center justify-center w-[72px] h-[72px] text-white rounded-full transition-all active:scale-95 border-4 border-slate-50 dark:border-slate-900 bg-gradient-to-b from-blue-500 to-blue-600 shadow-[0_5px_15px_rgba(59,130,246,0.5)] ${location.pathname === '/admin/dashboard' ? 'ring-2 ring-blue-400/50 scale-105' : ''}`}>
                        <LayoutDashboard className="w-8 h-8" />
                    </button>
                </div>

                {/* 4. Comenzi */}
                <NavLink to="/admin/work-orders" className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-emerald-600 dark:text-emerald-400 scale-110 drop-shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>
                    <ClipboardList className="w-6 h-6 mb-1.5" />
                    <span className="text-[10px] font-bold">Comenzi</span>
                </NavLink>

                {/* 5. Menu */}
                <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center p-2 w-[72px] transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                    <svg className="w-6 h-6 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="text-[10px] font-bold">Meniu</span>
                </button>
            </nav>

            {/* Birthday Popup */}
            {showBirthdayPopup && birthdayUsers.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBirthdayPopup(false)}></div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-center">
                            <div className="w-16 h-16 bg-slate-200 dark:bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                                <span className="text-3xl">🎂</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">La mulți ani!</h3>
                            <p className="text-pink-100 text-sm">Astăzi își serbează ziua de naștere:</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {birthdayUsers.map(u => (
                                <div key={u.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-100 dark:border-slate-700">
                                    <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-lg overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm shrink-0">
                                        {u.avatar_path ? <img src={u.avatar_path.startsWith('http') ? u.avatar_path : `${API_BASE}${u.avatar_path}`} className="w-full h-full object-cover" alt="" /> : u.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{u.full_name}</p>
                                        <p className="text-xs text-slate-500">{u.employee_code} • {Math.floor((new Date() - new Date(u.birth_date)) / 31557600000)} ani</p>
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={() => setShowBirthdayPopup(false)}
                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors mt-2"
                            >
                                Închide
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
