import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useTenantStore = create(
    persist(
        (set) => ({
            tenant: null,
            
            setTenant: (tenantData) => set({ tenant: tenantData }),
            
            clearTenant: () => set({ tenant: null }),
            
            // Helper to get domain/slug
            getCurrentSubdomain: () => {
                const hostname = window.location.hostname
                
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    return null
                }
                
                // Allow *.localhost for testing locally
                if (hostname.endsWith('.localhost')) {
                    return hostname.split('.')[0]
                }
                
                const parts = hostname.split('.')
                if (parts.length >= 3) {
                    const subdomain = parts[0]
                    if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'admin' && subdomain !== 'master') {
                        return subdomain
                    }
                }
                
                return null
            }
        }),
        {
            name: 'tenant-storage',
        }
    )
)

export { useTenantStore }
