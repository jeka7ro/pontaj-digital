import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAdminStore } from './store/adminStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TodayTimesheet from './pages/TodayTimesheet'
import History from './pages/History'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOverview from './pages/admin/AdminOverview'
import UsersManagement from './pages/admin/UsersManagement'
import SitesManagement from './pages/admin/SitesManagement'
import PhotoTestPage from './pages/admin/PhotoTestPage'
import ReportsPage from './pages/admin/ReportsPage'
import TimesheetsPage from './pages/employee/TimesheetsPage'
import TimesheetForm from './pages/employee/TimesheetForm'
import ClockInPage from './pages/employee/ClockInPage'
import TimesheetApprovalPage from './pages/admin/TimesheetApprovalPage'
import ActivitiesManagement from './pages/admin/ActivitiesManagement'
import SettingsPage from './pages/admin/SettingsPage'

function App() {
    const { user } = useAuthStore()

    return (
        <Router>
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
