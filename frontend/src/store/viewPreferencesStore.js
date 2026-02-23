import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * View Preferences Store
 * Manages user preferences for view modes, pagination, and filters across all pages
 */

const useViewPreferencesStore = create(
    persist(
        (set, get) => ({
            // Preferences per page (keyed by page identifier)
            preferences: {},

            /**
             * Get preferences for a specific page
             */
            getPagePreferences: (pageId) => {
                const prefs = get().preferences[pageId]
                return prefs || {
                    viewMode: 'list', // 'list' | 'grid'
                    pageSize: 20,
                    currentPage: 1,
                    sortBy: null,
                    sortOrder: 'asc',
                    filters: {}
                }
            },

            /**
             * Set view mode for a page
             */
            setViewMode: (pageId, viewMode) => {
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        [pageId]: {
                            ...state.preferences[pageId],
                            viewMode,
                            currentPage: 1 // Reset to first page on view change
                        }
                    }
                }))
            },

            /**
             * Set page size for a page
             */
            setPageSize: (pageId, pageSize) => {
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        [pageId]: {
                            ...state.preferences[pageId],
                            pageSize,
                            currentPage: 1 // Reset to first page on size change
                        }
                    }
                }))
            },

            /**
             * Set current page number
             */
            setCurrentPage: (pageId, currentPage) => {
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        [pageId]: {
                            ...state.preferences[pageId],
                            currentPage
                        }
                    }
                }))
            },

            /**
             * Set sort configuration
             */
            setSort: (pageId, sortBy, sortOrder) => {
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        [pageId]: {
                            ...state.preferences[pageId],
                            sortBy,
                            sortOrder
                        }
                    }
                }))
            },

            /**
             * Set filters
             */
            setFilters: (pageId, filters) => {
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        [pageId]: {
                            ...state.preferences[pageId],
                            filters,
                            currentPage: 1 // Reset to first page on filter change
                        }
                    }
                }))
            },

            /**
             * Reset preferences for a page
             */
            resetPagePreferences: (pageId) => {
                set((state) => {
                    const newPreferences = { ...state.preferences }
                    delete newPreferences[pageId]
                    return { preferences: newPreferences }
                })
            },

            /**
             * Clear all preferences
             */
            clearAllPreferences: () => {
                set({ preferences: {} })
            }
        }),
        {
            name: 'view-preferences-storage',
            version: 1
        }
    )
)

export default useViewPreferencesStore
