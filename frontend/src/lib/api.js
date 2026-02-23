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

        // Check for employee token in Zustand auth-storage
        try {
            const authStorage = localStorage.getItem('auth-storage')
            if (authStorage) {
                const parsed = JSON.parse(authStorage)
                token = parsed.state?.accessToken
            }
        } catch (e) {
            console.error('Error parsing auth storage:', e)
        }

        // If no employee token, check for admin token
        if (!token) {
            try {
                const adminStorage = localStorage.getItem('admin-storage')
                if (adminStorage) {
                    const parsed = JSON.parse(adminStorage)
                    token = parsed.state?.token
                }
            } catch (e) {
                console.error('Error parsing admin storage:', e)
            }
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

            // If on admin route, redirect to admin login
            if (currentPath.startsWith('/admin')) {
                localStorage.removeItem('admin-storage')
                window.location.href = '/admin/login'
            } else {
                // Otherwise redirect to employee login
                localStorage.removeItem('auth-storage')
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api
