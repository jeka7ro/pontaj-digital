import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        let token = null
        // Detect admin requests: starts with /admin OR contains /admin (e.g. /site-photos/admin)
        const isAdminRequest = config.url?.startsWith('/admin') || config.url?.includes('/admin')
        // Also detect when on admin page
        const isAdminPage = window.location.pathname.startsWith('/admin')

        if (isAdminRequest || isAdminPage) {
            // Admin requests: use admin token first
            try {
                const adminStorage = localStorage.getItem('admin-storage')
                if (adminStorage) {
                    const parsed = JSON.parse(adminStorage)
                    token = parsed.state?.token
                }
            } catch (e) { }
        }

        // Employee token (or fallback for admin if no admin token)
        if (!token) {
            try {
                const authStorage = localStorage.getItem('auth-storage')
                if (authStorage) {
                    const parsed = JSON.parse(authStorage)
                    token = parsed.state?.accessToken
                }
            } catch (e) { }
        }

        // Final fallback: admin token for non-admin requests
        if (!token && !isAdminRequest) {
            try {
                const adminStorage = localStorage.getItem('admin-storage')
                if (adminStorage) {
                    const parsed = JSON.parse(adminStorage)
                    token = parsed.state?.token
                }
            } catch (e) { }
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname
            const requestUrl = error.config?.url || ''

            // Don't redirect if this IS the login request itself
            if (requestUrl.includes('/login')) {
                return Promise.reject(error)
            }

            // Don't redirect if already on a login page
            if (currentPath === '/admin/login' || currentPath === '/login') {
                return Promise.reject(error)
            }

            // Only auto-logout for core admin API calls, not secondary ones like photos
            const isCoreAdminCall = requestUrl.startsWith('/admin/')

            // If on admin route and it's a core admin call that failed
            if (currentPath.startsWith('/admin') && isCoreAdminCall) {
                localStorage.removeItem('admin-storage')
                window.location.href = '/admin/login'
            } else if (!currentPath.startsWith('/admin')) {
                // Employee route
                localStorage.removeItem('auth-storage')
                window.location.href = '/login'
            }
            // Otherwise just reject (don't redirect for non-core 401s)
        }
        return Promise.reject(error)
    }
)

export default api
