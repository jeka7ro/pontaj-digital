import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAdminStore = create(
    persist(
        (set) => ({
            admin: null,
            token: null,

            setAuth: (admin, token) => set({ admin, token }),

            logout: () => set({ admin: null, token: null }),

            isAuthenticated: () => {
                const state = useAdminStore.getState()
                return !!state.token && !!state.admin
            }
        }),
        {
            name: 'admin-storage',
        }
    )
)

export { useAdminStore }
