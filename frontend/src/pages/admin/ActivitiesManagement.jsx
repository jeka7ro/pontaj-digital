import { useState, useEffect } from 'react'
import api from '../../lib/api'
import {
    Plus, Edit2, Trash2, Loader2, Activity as ActivityIcon,
    CheckCircle, XCircle, ChevronDown, ChevronRight, Palette,
    FolderPlus, GripVertical, Layers, FileDown, FileSpreadsheet
} from 'lucide-react'

export default function ActivitiesManagement() {
    const [categories, setCategories] = useState([])
    const [flatActivities, setFlatActivities] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState({})

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
            for (const cat of activeGrouped) {
                catMap[cat.id || '__uncategorized'] = { ...cat, activities: [...cat.activities] }
            }
            for (const cat of inactiveGrouped) {
                const key = cat.id || '__uncategorized'
                if (catMap[key]) {
                    // Add inactive activities that aren't already present
                    const existingIds = new Set(catMap[key].activities.map(a => a.id))
                    for (const act of cat.activities) {
                        if (!existingIds.has(act.id)) {
                            catMap[key].activities.push(act)
                        }
                    }
                } else {
                    catMap[key] = { ...cat, activities: [...cat.activities] }
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
            alert(error.response?.data?.detail || 'Eroare la salvare categorie')
        }
    }

    const handleEditCategory = (cat) => {
        setEditingCategory(cat)
        setCategoryForm({ name: cat.name, color: cat.color, sort_order: cat.sort_order || 0 })
        setShowCategoryModal(true)
    }

    const handleDeleteCategory = async (catId) => {
        if (!confirm('Ștergi această categorie? Activitățile vor fi mutate la "Necategorizate".')) return
        try {
            await api.delete(`/admin/activity-categories/${catId}`)
            fetchData()
        } catch (error) {
            console.error('Error deleting category:', error)
            alert(error.response?.data?.detail || 'Eroare la ștergere categorie')
        }
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
            alert(error.response?.data?.detail || 'Eroare la salvare activitate')
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
        if (!confirm('Ștergi această activitate?')) return
        try {
            await api.delete(`/admin/activities/${id}`)
            fetchData()
        } catch (error) {
            console.error('Error deleting activity:', error)
            alert(error.response?.data?.detail || 'Eroare la ștergere')
        }
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
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">📋 Catalog Activități</h1>
                    <p className="text-slate-600">Gestionează categoriile și activitățile disponibile pentru pontaje</p>
                </div>
                <div className="flex items-center gap-3">
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
                                alert('Eroare la export: ' + (error.response?.data?.detail || error.message))
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-blue-200 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all"
                    >
                        <FileDown className="w-4 h-4" />
                        Export
                        <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                    </button>
                    <button
                        onClick={() => {
                            setEditingCategory(null)
                            setCategoryForm({ name: '', color: '#3b82f6', sort_order: 0 })
                            setShowCategoryModal(true)
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <FolderPlus className="w-5 h-5" />
                        Categorie Nouă
                    </button>
                    <button
                        onClick={() => handleAddActivityToCategory('')}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <Plus className="w-5 h-5" />
                        Activitate Nouă
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatsCard label="Categorii" value={categoryList.length} icon={Layers} color="from-violet-500 to-violet-600" />
                <StatsCard label="Total Activități" value={totalActivities} icon={ActivityIcon} color="from-blue-500 to-blue-600" />
                <StatsCard label="Active" value={activeCount} icon={CheckCircle} color="from-green-500 to-green-600" />
                <StatsCard label="Inactive" value={inactiveCount} icon={XCircle} color="from-slate-500 to-slate-600" />
            </div>

            {/* Categories + Activities */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    {categories.map((cat) => {
                        const catKey = cat.id || '__uncategorized'
                        const isExpanded = expandedCategories[catKey]
                        const catColor = cat.color || '#94a3b8'

                        return (
                            <div key={catKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
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
                                            {cat.activities.length} activități
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleAddActivityToCategory(cat.id)}
                                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Adaugă activitate în această categorie"
                                        >
                                            <Plus className="w-4 h-4 text-blue-600" />
                                        </button>
                                        {cat.id && (
                                            <>
                                                <button
                                                    onClick={() => handleEditCategory(cat)}
                                                    className="p-2 hover:bg-violet-50 rounded-lg transition-colors"
                                                    title="Editează categoria"
                                                >
                                                    <Edit2 className="w-4 h-4 text-violet-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
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
                                        {cat.activities.length === 0 ? (
                                            <div className="px-6 py-8 text-center text-slate-400 text-sm">
                                                Nicio activitate în această categorie
                                            </div>
                                        ) : (
                                            <table className="w-full">
                                                <thead className="bg-slate-50/70">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Activitate</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descriere</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">U.M.</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reguli</th>
                                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acțiuni</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {cat.activities.map((activity) => (
                                                        <tr key={activity.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-3">
                                                                <div className="font-medium text-slate-900 text-sm">{activity.name}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="text-sm text-slate-500 max-w-[200px] truncate" title={activity.description}>
                                                                    {activity.description || '—'}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                                                    {activity.unit_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                                {activity.quantity_rules || '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {activity.is_active ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                                        Activ
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                                                        Inactiv
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => handleEditActivity(activity)}
                                                                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title="Editează"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleToggleActive(activity.id, activity.is_active)}
                                                                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                                                        title={activity.is_active ? 'Dezactivează' : 'Activează'}
                                                                    >
                                                                        {activity.is_active ? (
                                                                            <XCircle className="w-3.5 h-3.5 text-slate-500" />
                                                                        ) : (
                                                                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteActivity(activity.id)}
                                                                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Șterge"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
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
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nicio categorie încă</h3>
                            <p className="text-slate-500 mb-6">Creează prima categorie de activități pentru a organiza catalogul.</p>
                            <button
                                onClick={() => {
                                    setEditingCategory(null)
                                    setCategoryForm({ name: '', color: '#3b82f6', sort_order: 0 })
                                    setShowCategoryModal(true)
                                }}
                                className="inline-flex items-center gap-2 px-5 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold transition-colors"
                            >
                                <FolderPlus className="w-5 h-5" />
                                Creează Categorie
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">
                            {editingCategory ? 'Editează Categorie' : 'Categorie Nouă'}
                        </h2>
                        <form onSubmit={handleSaveCategory} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nume Categorie</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="ex: Structura metalică"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Culoare</label>
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-10 h-10 rounded-xl border-2 border-slate-200"
                                        style={{ backgroundColor: categoryForm.color }}
                                    />
                                    <input
                                        type="text"
                                        value={categoryForm.color}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                                        placeholder="#3b82f6"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setCategoryForm({ ...categoryForm, color: c })}
                                            className={`w-7 h-7 rounded-lg transition-all ${categoryForm.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ordine Sortare</label>
                                <input
                                    type="number"
                                    value={categoryForm.sort_order}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
                                >
                                    {editingCategory ? 'Salvează' : 'Creează'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowCategoryModal(false); setEditingCategory(null) }}
                                    className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                                >
                                    Anulează
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Activity Modal */}
            {showActivityModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">
                            {editingActivity ? 'Editează Activitate' : 'Activitate Nouă'}
                        </h2>
                        <form onSubmit={handleSaveActivity} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Categorie</label>
                                <select
                                    value={activityForm.category_id}
                                    onChange={(e) => setActivityForm({ ...activityForm, category_id: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">— Fără categorie —</option>
                                    {categoryList.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nume Activitate</label>
                                <input
                                    type="text"
                                    value={activityForm.name}
                                    onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="ex: Montaj panouri solare"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Descriere (opțional)</label>
                                <textarea
                                    value={activityForm.description}
                                    onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Descriere detaliată a activității..."
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Unitate Măsură</label>
                                    <select
                                        value={activityForm.unit_type}
                                        onChange={(e) => setActivityForm({ ...activityForm, unit_type: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="buc">buc (bucăți)</option>
                                        <option value="ore">ore</option>
                                        <option value="m">m (metri)</option>
                                        <option value="m²">m² (metri pătrați)</option>
                                        <option value="buc/set">buc/set</option>
                                        <option value="kg">kg (kilograme)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Ordine Sortare</label>
                                    <input
                                        type="number"
                                        value={activityForm.sort_order}
                                        onChange={(e) => setActivityForm({ ...activityForm, sort_order: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reguli Cantitate (opțional)</label>
                                <input
                                    type="text"
                                    value={activityForm.quantity_rules}
                                    onChange={(e) => setActivityForm({ ...activityForm, quantity_rules: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="ex: min: 1, max: 100"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    checked={activityForm.is_active}
                                    onChange={(e) => setActivityForm({ ...activityForm, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                />
                                <label className="text-sm font-medium text-slate-700">Activitate activă</label>
                            </div>
                            <div className="flex items-center gap-3 pt-3">
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all"
                                >
                                    {editingActivity ? 'Salvează' : 'Adaugă'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowActivityModal(false); setEditingActivity(null) }}
                                    className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                                >
                                    Anulează
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatsCard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
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
