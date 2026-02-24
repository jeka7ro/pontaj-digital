import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import {
    Camera, Search, Trash2, ChevronLeft, ChevronRight, Building2,
    User, Calendar, Loader2, Image as ImageIcon, X, Filter
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function SitePhotosPage() {
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [siteFilter, setSiteFilter] = useState('')
    const [sites, setSites] = useState([])
    const [lightbox, setLightbox] = useState(null)

    const fetchPhotos = useCallback(async () => {
        try {
            setLoading(true)
            const params = { page, per_page: 20 }
            if (siteFilter) params.site_id = siteFilter
            const res = await api.get('/site-photos', { params })
            setPhotos(res.data.photos || [])
            setTotalPages(res.data.total_pages || 1)
            setTotal(res.data.total || 0)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [page, siteFilter])

    useEffect(() => {
        fetchPhotos()
    }, [fetchPhotos])

    useEffect(() => {
        api.get('/admin/sites').then(r => {
            const data = r.data
            const arr = Array.isArray(data) ? data : Array.isArray(data?.sites) ? data.sites : []
            setSites(arr)
        }).catch(() => { })
    }, [])

    const handleDelete = async (id) => {
        if (!confirm('Sigur vrei să ștergi această poză?')) return
        try {
            await api.delete(`/site-photos/${id}`)
            fetchPhotos()
        } catch (e) { console.error(e) }
    }

    const formatDate = (d) => {
        return new Date(d).toLocaleDateString('ro-RO', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                            Poze Șantier
                            <span className="text-base font-normal text-slate-400">({total})</span>
                        </h1>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={siteFilter}
                                onChange={(e) => { setSiteFilter(e.target.value); setPage(1) }}
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 outline-none"
                            >
                                <option value="">Toate șantierele</option>
                                {sites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Photos Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                    </div>
                ) : photos.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-600">Niciun poze încă</p>
                        <p className="text-sm text-slate-400 mt-1">Pozele adăugate de echipă vor apărea aici</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {photos.map(photo => (
                            <div key={photo.id} className="bg-white rounded-2xl shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
                                {/* Image */}
                                <div
                                    className="aspect-[4/3] bg-slate-100 relative cursor-pointer overflow-hidden"
                                    onClick={() => setLightbox(photo)}
                                >
                                    <img
                                        src={photo.photo_path.startsWith('http') ? photo.photo_path : `${API_BASE}${photo.photo_path}`}
                                        alt={photo.description || 'Foto șantier'}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(photo.id) }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Info */}
                                <div className="p-3">
                                    {photo.description && (
                                        <p className="text-sm text-slate-800 font-medium mb-2 line-clamp-2">{photo.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Building2 className="w-3.5 h-3.5" />
                                        <span className="font-semibold text-slate-700">{photo.site_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        <User className="w-3.5 h-3.5" />
                                        <span>{photo.uploader_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{formatDate(photo.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-semibold text-slate-600 px-3">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                    <button className="absolute top-4 right-4 p-2 text-white/80 hover:text-white" onClick={() => setLightbox(null)}>
                        <X className="w-8 h-8" />
                    </button>
                    <div className="max-w-4xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
                        <img
                            src={lightbox.photo_path.startsWith('http') ? lightbox.photo_path : `${API_BASE}${lightbox.photo_path}`}
                            alt={lightbox.description || ''}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />
                        <div className="mt-3 text-center">
                            {lightbox.description && <p className="text-white text-lg font-medium">{lightbox.description}</p>}
                            <p className="text-white/60 text-sm mt-1">
                                {lightbox.site_name} • {lightbox.uploader_name} • {formatDate(lightbox.created_at)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
