import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAdminStore } from './store/adminStore'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react'

// Lazy load heavy pages - these load AFTER the initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard'))
const TodayTimesheet = lazy(() => import('./pages/TodayTimesheet'))
const History = lazy(() => import('./pages/History'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'))
const SitesManagement = lazy(() => import('./pages/admin/SitesManagement'))
const PhotoTestPage = lazy(() => import('./pages/admin/PhotoTestPage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const TimesheetsPage = lazy(() => import('./pages/employee/TimesheetsPage'))
const TimesheetForm = lazy(() => import('./pages/employee/TimesheetForm'))
const ClockInPage = lazy(() => import('./pages/employee/ClockInPage'))
const TimesheetApprovalPage = lazy(() => import('./pages/admin/TimesheetApprovalPage'))
const ActivitiesManagement = lazy(() => import('./pages/admin/ActivitiesManagement'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const SitePhotosPage = lazy(() => import('./pages/admin/SitePhotosPage'))

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

function App() {
    const { user } = useAuthStore()

    return (
        <Router>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Admin Routes - MUST BE FIRST to prevent employee wildcard from catching them */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminOverview />} />
                        <Route path="users" element={<UsersManagement />} />
                        <Route path="sites" element={<SitesManagement />} />
                        <Route path="photos-test" element={<PhotoTestPage />} />
                        <Route path="reports" element={<ReportsPage />} />
                        <Route path="timesheets" element={<TimesheetApprovalPage />} />
                        <Route path="activities" element={<ActivitiesManagement />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="site-photos" element={<SitePhotosPage />} />
                    </Route>

                    {/* Employee Routes */}
                    <Route path="/login" element={<Login />} />

                    {user ? (
                        <>
                            <Route path="/" element={<ClockInPage />} />
                            <Route path="/today" element={<TodayTimesheet />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/clock-in" element={<ClockInPage />} />
                            <Route path="/timesheets" element={<TimesheetsPage />} />
                            <Route path="/timesheets/new" element={<TimesheetForm />} />
                            <Route path="/timesheets/:id" element={<TimesheetForm />} />
                        </>
                    ) : null}

                    {/* Fallback - redirect based on path */}
                    <Route path="*" element={<SmartRedirect />} />
                </Routes>
            </Suspense>
        </Router>
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
