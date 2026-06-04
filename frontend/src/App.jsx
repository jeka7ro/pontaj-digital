import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAdminStore } from './store/adminStore'
import { useTenantStore } from './store/tenantStore'
import api from './lib/api'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react'

// Eager load core admin pages for INSTANT navigation and 0 delays
import AdminDashboard from './pages/admin/AdminDashboard'
import AlertsManagement from './pages/admin/AlertsManagement'
import AdminOverview from './pages/admin/AdminOverview'
import TimesheetApprovalPage from './pages/admin/TimesheetApprovalPage'
import ReportsPage from './pages/admin/ReportsPage'
import EmployeesManagement from './pages/admin/EmployeesManagement'

import SitesManagement from './pages/admin/SitesManagement'
import ActivitiesManagement from './pages/admin/ActivitiesManagement'

// Lazy load secondary/heavy pages
const Dashboard = lazy(() => import('./pages/Dashboard'))
const TodayTimesheet = lazy(() => import('./pages/TodayTimesheet'))
const History = lazy(() => import('./pages/History'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'))
const ClientsManagement = lazy(() => import('./pages/admin/ClientsManagement'))
const PhotoTestPage = lazy(() => import('./pages/admin/PhotoTestPage'))
const TimesheetsPage = lazy(() => import('./pages/employee/TimesheetsPage'))
const TimesheetForm = lazy(() => import('./pages/employee/TimesheetForm'))
const ClockInPage = lazy(() => import('./pages/employee/ClockInPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const SitePhotosPage = lazy(() => import('./pages/admin/SitePhotosPage'))
const TeamsManagement = lazy(() => import('./pages/admin/TeamsManagement'))
const NotificationsPage = lazy(() => import('./pages/admin/NotificationsPage'))
const FleetManagement = lazy(() => import('./pages/admin/FleetManagement'))
const TransportManagement = lazy(() => import('./pages/admin/TransportManagement'))
const WarehouseManagement = lazy(() => import('./pages/admin/WarehouseManagement'))
const ComplaintsManagement = lazy(() => import('./pages/admin/ComplaintsManagement'))
const AccommodationsManagement = lazy(() => import('./pages/admin/AccommodationsManagement'))
const ExpensesManagement = lazy(() => import('./pages/admin/ExpensesManagement'))
const AdminMaterialRequests = lazy(() => import('./pages/admin/AdminMaterialRequests'))
const AdminEmergencies = lazy(() => import('./pages/admin/AdminEmergencies'))
const EmployeeComplaints = lazy(() => import('./pages/employee/EmployeeComplaints'))
const EmployeeMaterialRequests = lazy(() => import('./pages/employee/EmployeeMaterialRequests'))
const EmployeeEmergencies = lazy(() => import('./pages/employee/EmployeeEmergencies'))
const EmployeeInventory = lazy(() => import('./pages/employee/EmployeeInventory'))
const LeavesManagement = lazy(() => import('./pages/admin/LeavesManagement'))
import EmployeeLayout from './components/layout/EmployeeLayout'
import { DialogOverlay } from './components/ui/DialogOverlay'
import { ToastOverlay } from './components/ui/ToastOverlay'

// Loading fallback for lazy-loaded pages
function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">Se încarcă...</p>
            </div>
        </div>
    )
}

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }
    static getDerivedStateFromError(error) {
        return { hasError: true }
    }
    componentDidCatch(error, errorInfo) {
        console.error('App routing error:', error)
        // Auto-refresh if it's a chunk load error (network glitch / new deployment)
        if (error.name === 'ChunkLoadError' || (error.message && error.message.includes('fetch dynamically imported module'))) {
            window.location.reload()
        }
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">A apărut o eroare de navigare.</h2>
                    <p className="text-sm text-slate-500 mb-4">Te rugăm să reîncarci pagina.</p>
                    <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-md transition-colors">
                        Reîncarcă Pagina
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}

import OrganizationsManagement from './pages/admin/OrganizationsManagement'
const WorkOrders = lazy(() => import('./pages/admin/WorkOrders'))
const WorkOrderForm = lazy(() => import('./pages/admin/WorkOrderForm'))
const WorkOrderConfirm = lazy(() => import('./pages/public/WorkOrderConfirm'))

function App() {
    const { user } = useAuthStore()
    
    // Tenant Config Logic
    const setTenant = useTenantStore((state) => state.setTenant)
    const getCurrentSubdomain = useTenantStore((state) => state.getCurrentSubdomain)

    useEffect(() => {
        const fetchTenantConfig = async () => {
            const subdomain = getCurrentSubdomain()
            if (subdomain) {
                try {
                    const res = await api.get('/public/tenant-config', { params: { slug: subdomain } })
                    setTenant(res.data)
                    // Set CSS Variables dynamically for the tenant
                    if (res.data.primary_color) {
                        document.documentElement.style.setProperty('--primary-tenant', res.data.primary_color)
                        const style = document.createElement('style')
                        style.innerHTML = `
                            .bg-blue-600 { background-color: ${res.data.primary_color} !important; }
                            .text-blue-600 { color: ${res.data.primary_color} !important; }
                            .border-blue-600 { border-color: ${res.data.primary_color} !important; }
                            .ring-blue-600 { --tw-ring-color: ${res.data.primary_color} !important; }
                            .focus\:border-blue-500:focus { border-color: ${res.data.primary_color} !important; }
                        `
                        document.head.appendChild(style)
                    }
                    if (res.data.name) {
                        document.title = `${res.data.name} - Smart Timesheet`
                    }
                    if (res.data.favicon_url) {
                        let link = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement('link');
                            link.rel = 'icon';
                            document.head.appendChild(link);
                        }
                        link.href = res.data.favicon_url;
                    }
                } catch (err) {
                    console.error('Failed to load tenant config', err)
                }
            }
        }
        fetchTenantConfig()
    }, [])

    // ─── Auto-reload la deploy nou (fara refresh manual de la angajati) ───────
    useEffect(() => {
        let knownVersion = null

        const checkVersion = async () => {
            // Nu verifica daca ecranul e stins — economie baterie
            if (document.visibilityState !== 'visible') return
            try {
                const res = await fetch('/api/version')
                const data = await res.json()
                if (!knownVersion) {
                    knownVersion = data.version // Prima incarcare — stocheaza versiunea
                } else if (data.version !== knownVersion) {
                    // Versiune noua detectata — reload automat dupa 2s
                    setTimeout(() => window.location.reload(), 2000)
                }
            } catch (e) { /* offline sau eroare — ignoram */ }
        }

        checkVersion()
        // Verifica din 5 in 5 minute — 1 request mic, impact baterie: zero
        const interval = setInterval(checkVersion, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <GlobalErrorBoundary>
            <Router>
            <DialogOverlay />
            <ToastOverlay />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Admin Routes - MUST BE FIRST to prevent employee wildcard from catching them */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminOverview />} />
                        <Route path="users" element={<UsersManagement />} />
                        <Route path="employees" element={<EmployeesManagement />} />
                        <Route path="employees/:id" element={<EmployeesManagement />} />
                        <Route path="organizations" element={<OrganizationsManagement />} />

                        <Route path="clients" element={<ClientsManagement />} />
                        <Route path="sites" element={<SitesManagement />} />
                        <Route path="photos-test" element={<PhotoTestPage />} />
                        <Route path="reports" element={<ReportsPage />} />
                        <Route path="timesheets" element={<TimesheetApprovalPage />} />
                        <Route path="activities" element={<ActivitiesManagement />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="site-photos" element={<SitePhotosPage />} />
                        <Route path="teams" element={<TeamsManagement />} />
                        <Route path="fleet" element={<FleetManagement />} />
                        <Route path="transport" element={<TransportManagement />} />
                        <Route path="warehouse" element={<WarehouseManagement />} />
                        <Route path="complaints" element={<ComplaintsManagement />} />
                        <Route path="accommodations" element={<AccommodationsManagement />} />
                                <Route path="expenses" element={<ExpensesManagement />} />
                                <Route path="material-requests" element={<AdminMaterialRequests />} />
                                <Route path="emergencies" element={<AdminEmergencies />} />
                                <Route path="alerts" element={<AlertsManagement />} />
                        <Route path="leaves" element={<LeavesManagement />} />
                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="work-orders" element={<WorkOrders />} />
                        <Route path="work-orders/new" element={<WorkOrderForm />} />
                        <Route path="work-orders/:id/edit" element={<WorkOrderForm />} />
                    </Route>

                    {/* Public Routes - Work Order confirmation */}
                    <Route path="/confirm/:token" element={<WorkOrderConfirm />} />

                    {/* Employee Routes */}
                    <Route path="/login" element={<Login />} />

                    {user ? (
                        <Route element={<EmployeeLayout />}>
                            <Route path="/" element={<ClockInPage />} />
                            <Route path="/today" element={<TodayTimesheet />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/clock-in" element={<ClockInPage />} />
                            <Route path="/timesheets" element={<TimesheetsPage />} />
                            <Route path="/timesheets/new" element={<TimesheetForm />} />
                            <Route path="/timesheets/:id" element={<TimesheetForm />} />
                            <Route path="/sesizari" element={<EmployeeComplaints />} />
                            <Route path="/material-requests" element={<EmployeeMaterialRequests />} />
                            <Route path="/my-inventory" element={<EmployeeInventory />} />
                            <Route path="/emergencies" element={<EmployeeEmergencies />} />
                        </Route>
                    ) : null}

                    {/* Fallback - redirect based on path */}
                    <Route path="*" element={<SmartRedirect />} />
                </Routes>
            </Suspense>
        </Router>
        </GlobalErrorBoundary>
    )
}

// Smart redirect based on current path
function SmartRedirect() {
    const location = window.location.pathname

    // If trying to access admin routes, redirect to admin login
    if (location.startsWith('/admin')) {
        return <Navigate to="/admin/login" replace />
    }

    // Otherwise redirect to employee login
    return <Navigate to="/login" replace />
}

// Protected route for admin users
function AdminProtectedRoute({ children }) {
    const admin = useAdminStore((state) => state.admin)
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        // Wait for zustand persist to hydrate from localStorage
        const unsub = useAdminStore.persist.onFinishHydration(() => {
            setHydrated(true)
        })
        // If already hydrated (e.g. on subsequent renders)
        if (useAdminStore.persist.hasHydrated()) {
            setHydrated(true)
        }
        return () => unsub?.()
    }, [])

    // Show nothing while hydrating — prevents flash redirect
    if (!hydrated) {
        return null
    }

    if (!admin) {
        return <Navigate to="/admin/login" replace />
    }

    return children
}

export default App
