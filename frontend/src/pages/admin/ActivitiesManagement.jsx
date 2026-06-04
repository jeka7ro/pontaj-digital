import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'
import {
    Plus, Edit2, Trash2, Loader2, Activity as ActivityIcon, Activity,
    CheckCircle, XCircle, X, ChevronDown, ChevronRight, Palette,
    FolderPlus, GripVertical, Layers, FileDown, FileSpreadsheet, Search, Save, Folder
} from 'lucide-react'

export default function ActivitiesManagement() {
    const { t } = useTranslation()
    const { showDialog } = useUIStore()
    const [categories, setCategories] = useState([])
    const [flatActivities, setFlatActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState({})
    const [searchQuery, setSearchQuery] = useState('')
    const [showInactive, setShowInactive] = useState(false)

    // Category modal
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editingCategory, setEditingCategory] = useState(null)
    const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3b82f6', sort_order: 0 })

    // Activity modal
    const [showActivityModal, setShowActivityModal] = useState(false)
    const [editingActivity, setEditingActivity] = useState(null)
    const [activityForm, setActivityForm] = useState({
        name: '', unit_type: 'buc', category_id: '', description: '',
        quantity_rules: '', sort_order: 0, is_active: true
    })

    // Category list for dropdowns
    const [categoryList, setCategoryList] = useState([])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [activitiesRes, categoriesRes] = await Promise.all([
                api.get('/activities/?is_active=true'),
                api.get('/admin/activity-categories/')
            ])

            // Also get inactive activities
            let inactiveRes
            try {
                inactiveRes = await api.get('/activities/?is_active=false')
            } catch (e) {
                inactiveRes = { data: { categories: [], activities: [] } }
            }

            const activeGrouped = activitiesRes.data.categories || []
            const inactiveGrouped = inactiveRes.data.categories || []
            const allFlat = [
                ...(activitiesRes.data.activities || []),
                ...(inactiveRes.data.activities || [])
            ]

            // Merge grouped categories with all activities
            const catMap = {}
            for (const cat of (categoriesRes.data.categories || [])) {
                catMap[cat.id] = { ...cat, activities: [] }
            }
            
            for (const cat of activeGrouped) {
                const key = cat.id || '__uncategorized'
                if (!catMap[key]) catMap[key] = { ...cat, activities: [] }
                catMap[key].activities = [...catMap[key].activities, ...cat.activities]
            }
            for (const cat of inactiveGrouped) {
                const key = cat.id || '__uncategorized'
                if (!catMap[key]) catMap[key] = { ...cat, activities: [] }
                const existingIds = new Set(catMap[key].activities.map(a => a.id))
                for (const act of cat.activities) {
                    if (!existingIds.has(act.id)) {
                        catMap[key].activities.push(act)
                    }
                }
            }

            setCategories(Object.values(catMap))
            setFlatActivities(allFlat)
            setCategoryList(categoriesRes.data.categories || [])

            // Auto-expand all categories
            const expanded = {}
            Object.keys(catMap).forEach(k => { expanded[k] = true })
            setExpandedCategories(expanded)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleCategory = (catId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catId || '__uncategorized']: !prev[catId || '__uncategorized']
        }))
    }

    // Category CRUD
    const handleSaveCategory = async (e) => {
        e.preventDefault()
        try {
            if (editingCategory) {
                await api.put(`/admin/activity-categories/${editingCategory.id}`, categoryForm)
            } else {
                await api.post('/admin/activity-categories/', categoryForm)
            }
            setShowCategoryModal(false)
            setEditingCategory(null)
            setCategoryForm({ name: '', color: '#3b82f6', sort_order: 0 })
            fetchData()
        } catch (error) {
            console.error('Error saving category:', error)
            showDialog({ type: 'danger', title: t('common.error'), message: error.response?.data?.detail || t('activities.errors.save_category'), confirmText: 'OK', cancelText: null })
        }
    }

    const handleEditCategory = (cat) => {
        setEditingCategory(cat)
        setCategoryForm({ name: cat.name, color: cat.color, sort_order: cat.sort_order || 0 })
        setShowCategoryModal(true)
    }

    const handleDeleteCategory = async (catId) => {
        showDialog({
            type: 'danger',
            title: t('activities.delete.category_title'),
            message: t('activities.delete.category_message'),
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await api.delete(`/admin/activity-categories/${catId}`)
                    fetchData()
                } catch (error) {
                    console.error('Error deleting category:', error)
                    showDialog({ type: 'danger', title: 'Eroare', message: error.response?.data?.detail || t('activities.errors.delete_category'), confirmText: 'OK', cancelText: null })
                }
            }
        })
    }

    // Activity CRUD
    const handleSaveActivity = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                ...activityForm,
                category_id: activityForm.category_id || null
            }
            if (editingActivity) {
                await api.put(`/admin/activities/${editingActivity.id}`, payload)
            } else {
                await api.post('/admin/activities/', payload)
            }
            setShowActivityModal(false)
            setEditingActivity(null)
            setActivityForm({
                name: '', unit_type: 'buc', category_id: '', description: '',
                quantity_rules: '', sort_order: 0, is_active: true
            })
            fetchData()
        } catch (error) {
            console.error('Error saving activity:', error)
            showDialog({ type: 'danger', title: 'Eroare', message: error.response?.data?.detail || t('activities.errors.save_activity'), confirmText: 'OK', cancelText: null })
        }
    }

    const handleEditActivity = (activity) => {
        setEditingActivity(activity)
        setActivityForm({
            name: activity.name,
            unit_type: activity.unit_type,
            category_id: activity.category_id || '',
            description: activity.description || '',
            quantity_rules: activity.quantity_rules || '',
            sort_order: activity.sort_order || 0,
            is_active: activity.is_active
        })
        setShowActivityModal(true)
    }

    const handleAddActivityToCategory = (catId) => {
        setEditingActivity(null)
        setActivityForm({
            name: '', unit_type: 'buc', category_id: catId || '',
            description: '', quantity_rules: '', sort_order: 0, is_active: true
        })
        setShowActivityModal(true)
    }

    const handleDeleteActivity = async (id) => {
        showDialog({
            type: 'danger',
            title: t('activities.delete.activity_title'),
            message: t('activities.delete.activity_message'),
            confirmText: 'Șterge',
            onConfirm: async () => {
                try {
                    const response = await api.delete(`/admin/activities/${id}`)
                    if (response.data?.message?.includes('deactivated')) {
                        showDialog({
                            type: 'info',
                            title: t('activities.deactivated.title'),
                            message: t('activities.deactivated.message'),
                            confirmText: 'OK',
                            cancelText: null
                        })
                    }
                    fetchData()
                } catch (error) {
                    console.error('Error deleting activity:', error)
                    showDialog({ type: 'danger', title: 'Eroare', message: error.response?.data?.detail || t('activities.errors.delete_activity'), confirmText: 'OK', cancelText: null })
                }
            }
        })
    }

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await api.put(`/admin/activities/${id}`, { is_active: !currentStatus })
            fetchData()
        } catch (error) {
            console.error('Error toggling activity:', error)
        }
    }

    const totalActivities = flatActivities.length
    const activeCount = flatActivities.filter(a => a.is_active).length
    const inactiveCount = flatActivities.filter(a => !a.is_active).length

    const PRESET_COLORS = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
        '#64748b'
    ]

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <ActivityIcon className="w-5 h-5" />
                        </div>
                        {t('activities.title')}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* The "Bubble" Search */}
                    <div className="relative group flex items-center">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('activities.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {totalActivities}
                                </span>
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5"
                                >
                                    <X className="w-3 h-3 text-white/80 hover:text-white" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <label className="flex items-center gap-2 cursor-pointer h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                        <input 
                            type="checkbox" 
                            checked={showInactive} 
                            onChange={(e) => setShowInactive(e.target.checked)} 
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Arhiva (Inactive)</span>
                    </label>

                    <button
                        onClick={async () => {
                            try {
                                const response = await api.get('/admin/activities/export/excel', { responseType: 'blob' })
                                const url = window.URL.createObjectURL(new Blob([response.data]))
                                const link = document.createElement('a')
                                link.href = url
                                link.setAttribute('download', `activitati_${new Date().toISOString().slice(0, 10)}.xlsx`)
                                document.body.appendChild(link)
                                link.click()
                                link.remove()
                                window.URL.revokeObjectURL(url)
                            } catch (error) {
                                showDialog({ type: 'danger', title: t('common.export_error'), message: t('common.error_message') + (error.response?.data?.detail || error.message), confirmText: 'OK', cancelText: null })
                            }
                        }}
                        className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('common.export')}</span>
                    </button>
                    <button
                        onClick={() => {
                            setEditingCategory(null)
                            setCategoryForm({ name: '', color: '#3b82f6', sort_order: 0 })
                            setShowCategoryModal(true)
                        }}
                        className="flex items-center gap-1.5 px-4 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                    >
                        <FolderPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('activities.new_category')}</span>
                    </button>
                    <button
                        onClick={() => handleAddActivityToCategory('')}
                        className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        {t('activities.new_activity')}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatsCard label={t('activities.categories')} value={categoryList.length} icon={Layers} color="from-violet-500 to-violet-600" />
                <StatsCard label={t('activities.total_activities')} value={totalActivities} icon={ActivityIcon} color="from-blue-500 to-blue-600" />
                <StatsCard label={t('activities.active_count')} value={activeCount} icon={CheckCircle} color="from-green-500 to-green-600" />
                <StatsCard label={t('activities.inactive_count')} value={inactiveCount} icon={XCircle} color="from-slate-500 to-slate-600" />
            </div>

            {/* Categories + Activities */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    {categories.filter(cat => {
                        const activeActsList = cat.activities.filter(a => showInactive || a.is_active);
                        // Hide category if it only has inactive activities and showInactive is false
                        if (activeActsList.length === 0 && cat.activities.length > 0) return false;
                        // Hide __uncategorized if it's completely empty based on current filter
                        if (!cat.id && activeActsList.length === 0) return false;

                        if (!searchQuery) return true;
                        
                        const query = searchQuery.toLowerCase();
                        if ((cat.name || '').toLowerCase().includes(query)) return true;
                        return activeActsList.some(a => 
                            (a.name || '').toLowerCase().includes(query) || 
                            (a.description || '').toLowerCase().includes(query)
                        );
                    }).map((cat) => {
                        const catKey = cat.id || '__uncategorized'
                        // Auto-expand if searching to show matching children immediately
                        const isExpanded = searchQuery ? true : expandedCategories[catKey]
                        const catColor = cat.color || '#94a3b8'

                        const query = searchQuery.toLowerCase();
                        const categoryMatches = (cat.name || '').toLowerCase().includes(query);
                        
                        const activeActsList = cat.activities.filter(a => showInactive || a.is_active);

                        // If category name matches the query, show all its items.
                        // Otherwise, only show items that matched the query.
                        const filteredActivities = categoryMatches && searchQuery ? activeActsList : activeActsList.filter(a => {
                            if (!searchQuery) return true;
                            return (a.name || '').toLowerCase().includes(query) || 
                                   (a.description || '').toLowerCase().includes(query);
                        });

                        return (
                            <div key={catKey} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                {/* Category Header */}
                                <div
                                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => toggleCategory(cat.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: catColor }}
                                        />
                                        <h3 className="text-lg font-bold text-slate-900">{cat.name}</h3>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                            {cat.activities.length} {t('dashboard.activities')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleAddActivityToCategory(cat.id)}
                                            className="p-2 hover:bg-blue-50 rounded-full transition-colors"
                                            title={t('activities.add_cat_activity')}
                                        >
                                            <Plus className="w-4 h-4 text-blue-600" />
                                        </button>
                                        {cat.id && (
                                            <>
                                                <button
                                                    onClick={() => handleEditCategory(cat)}
                                                    className="p-2 hover:bg-violet-50 rounded-full transition-colors"
                                                    title={t('common.edit_category')}
                                                >
                                                    <Edit2 className="w-4 h-4 text-violet-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="p-2 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Șterge categoria"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Activities Table */}
                                {isExpanded && (
                                    <div className="border-t border-slate-200">
                                        {filteredActivities.length === 0 ? (
                                            <div className="px-6 py-8 text-center text-slate-400 text-sm">
                                                {t('activities.no_match')}
                                            </div>
                                        ) : (
                                            <table className="w-full">
                                                <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left">{t('dashboard.activities')}</th>
                                                        <th className="px-4 py-3 text-left">{t('common.description')}</th>
                                                        <th className="px-4 py-3 text-left">{t('activities.unit_measure')}</th>
                                                        <th className="px-4 py-3 text-left">{t('activities.rules')}</th>
                                                        <th className="px-4 py-3 text-center">{t('common.status')}</th>
                                                        <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                    {filteredActivities.map((activity) => (
                                                        <tr key={activity.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="px-6 py-3">
                                                                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm group-hover:text-blue-600 transition-colors">{activity.name}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={activity.description}>
                                                                    {activity.description || '—'}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded border border-blue-200 dark:border-blue-900/50 text-[11px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                                                                    {activity.unit_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                                                                {activity.quantity_rules || '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {activity.is_active ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                                        {t('common.active')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                        {t('common.inactive')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleEditActivity(activity)}
                                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                                        title={t('common.edit')}
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleToggleActive(activity.id, activity.is_active)}
                                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                                        title={activity.is_active ? t('users.deactivate') : t('users.activate')}
                                                                    >
                                                                        {activity.is_active ? (
                                                                            <XCircle className="w-4 h-4" />
                                                                        ) : (
                                                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteActivity(activity.id)}
                                                                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                                                        title="Șterge"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {categories.length === 0 && !loading && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">{t('activities.no_categories')}</h3>
                            <p className="text-slate-500 mb-6">{t('activities.no_categories_hint')}</p>
                            <button
                                onClick={() => {
                                    setEditingCategory(null)
                                    setCategoryForm({ name: '', color: '#3b82f6', sort_order: 0 })
                                    setShowCategoryModal(true)
                                }}
                                className="inline-flex items-center gap-2 px-5 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold transition-colors"
                            >
                                <FolderPlus className="w-5 h-5" />
                                {t('activities.create_category')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6 flex justify-between items-center text-white shrink-0">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Folder className="w-6 h-6" />
                                {editingCategory ? t('activities.edit_category') : t('activities.new_category')}
                            </h2>
                            <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSaveCategory} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('activities.category_name')}</label>
                                    <input
                                        type="text"
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                                        placeholder={t('activities.placeholders.name')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('activities.color')}</label>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className="w-11 h-11 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0"
                                            style={{ backgroundColor: categoryForm.color }}
                                        />
                                        <input
                                            type="text"
                                            value={categoryForm.color}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all font-mono text-sm uppercase"
                                            placeholder="#3B82F6"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setCategoryForm({ ...categoryForm, color: c })}
                                                className={`w-8 h-8 rounded-xl transition-all ${categoryForm.color === c ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-400 scale-110 shadow-md' : 'hover:scale-110 shadow-sm opacity-80 hover:opacity-100'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('activities.sort_order')}</label>
                                    <input
                                        type="number"
                                        value={categoryForm.sort_order}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                                        className="w-24 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => { setShowCategoryModal(false); setEditingCategory(null) }}
                                        className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                                    >
                                        Anulează
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium shadow-sm shadow-violet-600/20 transition-all flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingCategory ? t('common.save') : t('teams.create')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Modal */}
            {showActivityModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-800/50" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Activity className="w-6 h-6" />
                                {editingActivity ? t('activities.edit_activity') : t('activities.new_activity')}
                            </h2>
                            <button onClick={() => { setShowActivityModal(false); setEditingActivity(null); }} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSaveActivity} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('activities.categories')}</label>
                                    <select
                                        value={activityForm.category_id}
                                        onChange={(e) => setActivityForm({ ...activityForm, category_id: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    >
                                        <option value="">{t('activities.no_category')}</option>
                                        {categoryList.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('activities.activity_name')}</label>
                                    <input
                                        type="text"
                                        value={activityForm.name}
                                        onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="ex: Montaj panouri solare"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('activities.description_optional')}</label>
                                    <textarea
                                        value={activityForm.description}
                                        onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all custom-scrollbar"
                                        placeholder={`${t('activities.placeholders.desc')}...`}
                                        rows={2}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('activities.unit_measure')}</label>
                                        <select
                                            value={activityForm.unit_type}
                                            onChange={(e) => setActivityForm({ ...activityForm, unit_type: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        >
                                            <option value="buc">{t('activities.units.buc')}</option>
                                            <option value="ore">ore</option>
                                            <option value="m">m (metri)</option>
                                            <option value="m²">{t('activities.units.sqm')}</option>
                                            <option value="buc/set">buc/set</option>
                                            <option value="kg">kg (kilograme)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('activities.sort_order')}</label>
                                        <input
                                            type="number"
                                            value={activityForm.sort_order}
                                            onChange={(e) => setActivityForm({ ...activityForm, sort_order: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('activities.quantity_rules')}</label>
                                    <input
                                        type="text"
                                        value={activityForm.quantity_rules}
                                        onChange={(e) => setActivityForm({ ...activityForm, quantity_rules: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="ex: min: 1, max: 100"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        checked={activityForm.is_active}
                                        onChange={(e) => setActivityForm({ ...activityForm, is_active: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('activities.is_active_label')}</label>
                                </div>
                                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => { setShowActivityModal(false); setEditingActivity(null) }}
                                        className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                                    >
                                        Anulează
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm shadow-blue-600/20 transition-all flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingActivity ? t('common.save') : t('common.add')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatsCard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-white rounded-3xl border border-slate-300 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                <div className={`p-3 bg-gradient-to-br ${color} rounded-xl`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-sm text-slate-600">{label}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    )
}
