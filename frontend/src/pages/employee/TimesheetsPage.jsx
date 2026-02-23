import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { Calendar, Plus, Clock, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react'

export default function TimesheetsPage() {
    const navigate = useNavigate()
    const [timesheets, setTimesheets] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, draft, submitted, approved

    useEffect(() => {
        fetchTimesheets()
    }, [filter])

    const fetchTimesheets = async () => {
        try {
            setLoading(true)
            const params = {}
            if (filter !== 'all') {
                params.status = filter.toUpperCase()
            }

            const response = await api.get('/timesheets/', { params })
            setTimesheets(response.data.timesheets || [])
        } catch (error) {
            console.error('Error fetching timesheets:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status) => {
        const badges = {
            DRAFT: { color: 'bg-gray-100 text-gray-700', icon: FileText, label: 'Draft' },
            SUBMITTED: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'În așteptare' },
            APPROVED: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Aprobat' },
            REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Respins' }
        }
        const badge = badges[status] || badges.DRAFT
        const Icon = badge.icon

        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                <Icon className="w-4 h-4" />
                {badge.label}
            </span>
        )
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">📋 Pontajele Mele</h1>
                    <p className="text-slate-600">Gestionează pontajele tale zilnice</p>
                </div>
                <button
                    onClick={() => navigate('/timesheets/new')}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" />
                    Pontaj Nou
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {['all', 'draft', 'submitted', 'approved'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        {f === 'all' ? 'Toate' : f === 'draft' ? 'Draft' : f === 'submitted' ? 'În așteptare' : 'Aprobate'}
                    </button>
                ))}
            </div>

            {/* Timesheets List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : timesheets.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
                    <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">
                        Nu ai pontaje
                    </h3>
                    <p className="text-slate-500 mb-4">
                        Creează primul tău pontaj pentru a începe
                    </p>
                    <button
                        onClick={() => navigate('/timesheets/new')}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Creează Pontaj
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {timesheets.map((ts) => (
                        <div
                            key={ts.id}
                            onClick={() => navigate(`/timesheets/${ts.id}`)}
                            className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 text-slate-900 font-semibold mb-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(ts.date).toLocaleDateString('ro-RO', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Clock className="w-4 h-4" />
                                        {ts.total_hours}h lucrate
                                    </div>
                                </div>
                                {getStatusBadge(ts.status)}
                            </div>

                            {ts.note_text && (
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                    {ts.note_text}
                                </p>
                            )}

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">
                                    {ts.activities_count} {ts.activities_count === 1 ? 'activitate' : 'activități'}
                                </span>
                                {ts.status === 'DRAFT' && (
                                    <span className="text-blue-600 font-medium">
                                        Editează →
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
