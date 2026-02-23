import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/api'
import { Calendar, Clock, Building2, Plus, Trash2, Save, Send, Loader2, X } from 'lucide-react'

export default function TimesheetForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = !!id

    const [loading, setLoading] = useState(false)
    const [sites, setSites] = useState([])
    const [activities, setActivities] = useState([])

    // Form data
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        site_id: '',
        check_in: '08:00',
        check_out: '17:00',
        break_duration: 30,
        notes: '',
        activities: []
    })

    useEffect(() => {
        fetchSites()
        fetchActivities()
        if (isEdit) {
            fetchTimesheet()
        }
    }, [id])

    const fetchSites = async () => {
        try {
            const response = await api.get('/admin/sites/', { params: { page_size: 1000 } })
            setSites(response.data.sites || [])
        } catch (error) {
            console.error('Error fetching sites:', error)
        }
    }

    const fetchActivities = async () => {
        try {
            const response = await api.get('/activities/')
            setActivities(response.data.activities || [])
        } catch (error) {
            console.error('Error fetching activities:', error)
        }
    }

    const fetchTimesheet = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/timesheets/${id}`)
            const ts = response.data

            // Parse timesheet data
            const segment = ts.segments[0]
            if (segment) {
                setFormData({
                    date: ts.date,
                    site_id: segment.site_id,
                    check_in: new Date(segment.check_in).toTimeString().slice(0, 5),
                    check_out: new Date(segment.check_out).toTimeString().slice(0, 5),
                    break_duration: segment.break_start && segment.break_end
                        ? Math.round((new Date(segment.break_end) - new Date(segment.break_start)) / 60000)
                        : 0,
                    notes: ts.note_text || '',
                    activities: segment.activities.map(a => ({
                        activity_id: a.activity_id,
                        quantity: a.quantity,
                        notes: ''
                    }))
                })
            }
        } catch (error) {
            console.error('Error fetching timesheet:', error)
        } finally {
            setLoading(false)
        }
    }

    const addActivity = () => {
        setFormData({
            ...formData,
            activities: [...formData.activities, { activity_id: '', quantity: 0, notes: '' }]
        })
    }

    const removeActivity = (index) => {
        setFormData({
            ...formData,
            activities: formData.activities.filter((_, i) => i !== index)
        })
    }

    const updateActivity = (index, field, value) => {
        const updated = [...formData.activities]
        updated[index][field] = value
        setFormData({ ...formData, activities: updated })
    }

    const handleSubmit = async (submit = false) => {
        try {
            setLoading(true)

            if (isEdit) {
                // Update existing
                await api.put(`/timesheets/${id}`, {
                    check_in: formData.check_in,
                    check_out: formData.check_out,
                    break_duration: formData.break_duration,
                    notes: formData.notes
                })
            } else {
                // Create new
                const response = await api.post('/timesheets/', formData)
                const newId = response.data.id

                if (submit) {
                    await api.post(`/timesheets/${newId}/submit`)
                }
            }

            navigate('/timesheets')
        } catch (error) {
            console.error('Error saving timesheet:', error)
            alert(error.response?.data?.detail || 'Eroare la salvare')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {isEdit ? '✏️ Editează Pontaj' : '📝 Pontaj Nou'}
                    </h1>
                    <p className="text-slate-600">Completează detaliile pontajului tău</p>
                </div>
                <button
                    onClick={() => navigate('/timesheets')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X className="w-6 h-6 text-slate-600" />
                </button>
            </div>

            {loading && isEdit ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Informații Generale</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Data
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    disabled={isEdit}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-100"
                                />
                            </div>

                            {/* Site */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Building2 className="w-4 h-4 inline mr-1" />
                                    Șantier
                                </label>
                                <select
                                    value={formData.site_id}
                                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                                    disabled={isEdit}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-100"
                                >
                                    <option value="">Selectează șantier</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Check In */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Intrare
                                </label>
                                <input
                                    type="time"
                                    value={formData.check_in}
                                    onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>

                            {/* Check Out */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Ieșire
                                </label>
                                <input
                                    type="time"
                                    value={formData.check_out}
                                    onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>

                            {/* Break Duration */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Pauză (minute)
                                </label>
                                <input
                                    type="number"
                                    value={formData.break_duration}
                                    onChange={(e) => setFormData({ ...formData, break_duration: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    min="0"
                                    step="5"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Activities Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Activități</h2>
                            <button
                                onClick={addActivity}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Adaugă Activitate
                            </button>
                        </div>

                        {formData.activities.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Nu ai adăugat activități. Apasă butonul de mai sus pentru a adăuga.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.activities.map((activity, index) => (
                                    <div key={index} className="flex gap-4 items-start p-4 bg-slate-50 rounded-lg">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <select
                                                value={activity.activity_id}
                                                onChange={(e) => updateActivity(index, 'activity_id', e.target.value)}
                                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            >
                                                <option value="">Selectează activitate</option>
                                                {activities.map(act => (
                                                    <option key={act.id} value={act.id}>
                                                        {act.name} ({act.unit_type})
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Cantitate"
                                                value={activity.quantity}
                                                onChange={(e) => updateActivity(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                min="0"
                                                step="0.1"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeActivity(index)}
                                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Notițe (opțional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="3"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="Adaugă notițe despre pontaj..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={loading || !formData.site_id}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Salvează Draft
                        </button>
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={loading || !formData.site_id || formData.activities.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            Trimite spre Aprobare
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
