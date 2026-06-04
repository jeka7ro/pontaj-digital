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
const DemoSignup = lazy(() => import('./pages/DemoSignup'))
const WorkspaceRouter = lazy(() => import('./pages/WorkspaceRouter'))
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
const LeavesManagement = lazy(() => import('./pages/admin/LeavesManagement'))
const ExpensesManagement = lazy(() => import('./pages/admin/ExpensesManagement'))
const AdminMaterialRequests = lazy(() => import('./pages/admin/AdminMaterialRequests'))
const AdminEmergencies = lazy(() => import('./pages/admin/AdminEmergencies'))
const EmployeeComplaints = lazy(() => import('./pages/employee/EmployeeComplaints'))
const EmployeeMaterialRequests = lazy(() => import('./pages/employee/EmployeeMaterialRequests'))
const EmployeeEmergencies = lazy(() => import('./pages/employee/EmployeeEmergencies'))
const EmployeeInventory = lazy(() => import('./pages/employee/EmployeeInventory'))
const WorkerOrdersPage = lazy(() => import('./pages/employee/WorkerOrdersPage'))
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
const WorkOrderForm   = lazy(() => import('./pages/admin/WorkOrderForm'))
const WorkOrderDetail = lazy(() => import('./pages/admin/WorkOrderDetail'))
const WorkOrderConfirm = lazy(() => import('./pages/public/WorkOrderConfirm'))

function App() {
    const { user } = useAuthStore()
    
    // Tenant Config Logic
    const setTenant = useTenantStore((state) => state.setTenant)
    const getCurrentSubdomain = useTenantStore((state) => state.getCurrentSubdomain)
    const [invalidTenant, setInvalidTenant] = useState(false)

    useEffect(() => {
        const fetchTenantConfig = async () => {
            const subdomain = getCurrentSubdomain()
            if (subdomain) {
                try {
                    const res = await api.get('/public/tenant-config', { params: { slug: subdomain } })
                    setTenant(res.data)
                    if (res.data.name) {
                        document.title = `${res.data.name} - Smart Timesheet`
                    }
                    
                    let iconUrl = res.data.favicon_url || res.data.logo_url;
                    if (!iconUrl && res.data.name) {
                        const initial = res.data.name.charAt(0).toUpperCase();
                        iconUrl = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%232563eb"/><text x="50" y="70" font-size="60" fill="white" font-weight="bold" font-family="Arial" text-anchor="middle">${initial}</text></svg>`;
                    }
                    
                    if (iconUrl) {
                        let link = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement('link');
                            link.rel = 'icon';
                            document.head.appendChild(link);
                        }
                        link.href = iconUrl;
                    }
                } catch (err) {
                    console.error('Failed to load tenant config', err)
                    if (err.response && err.response.status === 404) {
                        setInvalidTenant(true)
                    }
                }
            }
        }
        fetchTenantConfig()
    }, [])

    // Apply tenant styles synchronously when tenant state is available (from persist or fetch)
    const tenantObj = useTenantStore((state) => state.tenant)
    useEffect(() => {
        if (tenantObj?.primary_color) {
            document.documentElement.style.setProperty('--primary-tenant', tenantObj.primary_color)
            let style = document.getElementById('tenant-dynamic-styles')
            if (!style) {
                style = document.createElement('style')
                style.id = 'tenant-dynamic-styles'
                document.head.appendChild(style)
            }
            style.innerHTML = `
                .bg-blue-600, .bg-indigo-600 { background-color: ${tenantObj.primary_color} !important; }
                .text-blue-600, .text-indigo-600 { color: ${tenantObj.primary_color} !important; }
                .border-blue-600, .border-indigo-600 { border-color: ${tenantObj.primary_color} !important; }
                .ring-blue-600, .ring-indigo-600 { --tw-ring-color: ${tenantObj.primary_color} !important; }
                .focus\:border-blue-500:focus, .focus\:border-indigo-500:focus { border-color: ${tenantObj.primary_color} !important; }
                
                /* Extra states */
                .hover\:bg-blue-700:hover, .hover\:bg-indigo-700:hover { background-color: ${tenantObj.primary_color} !important; filter: brightness(0.9); }
                .hover\:text-blue-700:hover, .hover\:text-indigo-700:hover { color: ${tenantObj.primary_color} !important; filter: brightness(0.9); }
            `
        }
    }, [tenantObj?.primary_color])

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

    if (invalidTenant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-3">Compania nu există</h1>
                    <p className="text-slate-600 mb-6">Link-ul pe care l-ai accesat este invalid sau compania a fost ștearsă din sistem.</p>
                    <a href="http://localhost:5678" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-blue-500/20">
                        Înapoi la Pagina Principală
                    </a>
                </div>
            </div>
        )
    }

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
                        <Route path="leaves" element={<LeavesManagement />} />
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
                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="work-orders" element={<WorkOrders />} />
                        <Route path="work-orders/new" element={<WorkOrderForm />} />
                        <Route path="work-orders/:id" element={<WorkOrderDetail />} />
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
                            <Route path="/comenzi" element={<WorkerOrdersPage />} />
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
    const subdomain = useTenantStore.getState().getCurrentSubdomain()
    
    // If no subdomain, we are on root, redirect to workspace router
    if (!subdomain) {
        if (location === '/demo') {
            return <DemoSignup />
        }
        return <WorkspaceRouter isAdmin={location.startsWith('/admin')} />
    }

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
