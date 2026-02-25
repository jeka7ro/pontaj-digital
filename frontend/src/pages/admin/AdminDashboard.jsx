import { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet, NavLink } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import api from '../../lib/api'
import {
    LayoutDashboard, Users, Building2, FileText, Settings, LogOut, Shield,
    Menu, ChevronLeft, Clock, Activity, Bell, ChevronRight, Camera
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function AdminDashboard() {
    const { admin, logout } = useAdminStore()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [notifCount, setNotifCount] = useState(0)
    const [lastSeenCount, setLastSeenCount] = useState(0)
    const notifRef = useRef(null)

    const handleLogout = () => {
        logout()
        navigate('/admin/login')
    }

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

    const navItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/users', icon: Users, label: 'Utilizatori' },
        { path: '/admin/sites', icon: Building2, label: 'Șantiere' },
        { path: '/admin/timesheets', icon: Clock, label: 'Pontaje' },
        { path: '/admin/activities', icon: Activity, label: 'Activități' },
        { path: '/admin/reports', icon: FileText, label: 'Rapoarte' },
        { path: '/admin/site-photos', icon: Camera, label: 'Poze Șantier' },
        { path: '/admin/teams', icon: Users, label: 'Echipe' },
        { path: '/admin/settings', icon: Settings, label: 'Setări' },
        { path: '/admin/notifications', icon: Bell, label: 'Notificări' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 to-blue-900 text-white transition-all duration-300 flex flex-col`}>
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Shield className="w-6 h-6" />
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1">
                                <h2 className="font-bold text-lg">Admin Portal</h2>
                                <p className="text-xs text-blue-200">Pontaj Digital</p>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30'
                                    : 'hover:bg-white/10'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {sidebarOpen && <span className="font-medium">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-white/10">
                    <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center font-bold">
                            {admin?.full_name?.charAt(0)}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{admin?.full_name}</p>
                                <p className="text-xs text-blue-200 truncate">{admin?.email}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`mt-3 w-full flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
                    >
                        <LogOut className="w-4 h-4" />
                        {sidebarOpen && <span className="text-sm font-medium">Deconectare</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    )
}
