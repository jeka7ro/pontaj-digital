import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAdminStore } from './store/adminStore'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react'

// Eager load core admin pages for INSTANT navigation and 0 delays
import AdminDashboard from './pages/admin/AdminDashboard'
import AlertsManagement from './pages/admin/AlertsManagement'
import AdminOverview from './pages/admin/AdminOverview'
import TimesheetApprovalPage from './pages/admin/TimesheetApprovalPage'
import ReportsPage from './pages/admin/ReportsPage'
import EmployeesManagement from './pages/admin/EmployeesManagement'
import LeavesManagement from './pages/admin/LeavesManagement'
import TasksManagement from './pages/admin/TasksManagement'

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
        // Daca e eroare de incarcare fisier (ChunkLoadError), probabil serverul s-a actualizat.
        // Asteptam 1 secunda si incercam sa reincarcam fortat fara cache o singura data.
        if (error.name === 'ChunkLoadError' || (error.message && error.message.includes('fetch dynamically imported module'))) {
            const hasReloaded = sessionStorage.getItem('chunk_reload')
            if (!hasReloaded) {
                sessionStorage.setItem('chunk_reload', 'true')
                window.location.href = window.location.pathname + '?v=' + new Date().getTime()
            }
        }
    }
    render() {
        if (this.state.hasError) {
            // Nu facem nimic aici — componentDidCatch deja a dat redirect o singura data
            // Returnam null = ecran alb scurt pana redirect-ul are loc
            return null
        }
        return this.props.children
    }
}

function App() {
    const { user } = useAuthStore()

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
                        <Route path="leaves" element={<LeavesManagement />} />
                        <Route path="tasks" element={<TasksManagement />} />
                        <Route path="employees/:id" element={<EmployeesManagement />} />

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
                        <Route path="warehouse" element={<WarehouseManagement />} />
                        <Route path="complaints" element={<ComplaintsManagement />} />
                        <Route path="accommodations" element={<AccommodationsManagement />} />
                                <Route path="expenses" element={<ExpensesManagement />} />
                                <Route path="material-requests" element={<AdminMaterialRequests />} />
                                <Route path="emergencies" element={<AdminEmergencies />} />
                                <Route path="alerts" element={<AlertsManagement />} />
                        <Route path="notifications" element={<NotificationsPage />} />
                    </Route>

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
