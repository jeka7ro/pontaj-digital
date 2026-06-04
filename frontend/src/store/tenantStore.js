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
                // Exemplu: jeka.pontaj.app -> returnează 'jeka'
                // Dacă e localhost, putem simula sau ignora
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    // Poți returna un string hardcodat pentru testare, ex: 'jeka'
                    return null
                }
                
                const parts = hostname.split('.')
                // Dacă avem cel puțin 3 părți (ex: jeka.pontaj.app)
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
