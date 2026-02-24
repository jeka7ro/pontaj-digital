import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import {
    Camera, Trash2, ChevronLeft, ChevronRight, Building2,
    User, Calendar, Loader2, Image as ImageIcon, X, Filter,
    Grid3X3, List, Check, Download, Edit3, MessageSquare, CheckSquare, Square
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function SitePhotosPage() {
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [siteFilter, setSiteFilter] = useState('')
    const [sites, setSites] = useState([])
    const [lightbox, setLightbox] = useState(null)
    const [viewMode, setViewMode] = useState('grid') // grid or list
    const [selected, setSelected] = useState(new Set())
    const [editingId, setEditingId] = useState(null)
    const [editDesc, setEditDesc] = useState('')

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

    useEffect(() => { fetchPhotos() }, [fetchPhotos])

    useEffect(() => {
        api.get('/admin/sites').then(r => {
            const data = r.data
            setSites(Array.isArray(data) ? data : Array.isArray(data?.sites) ? data.sites : [])
        }).catch(() => { })
    }, [])

    const handleDelete = async (id) => {
        if (!confirm('Sigur vrei să ștergi această poză?')) return
        try {
            await api.delete(`/site-photos/${id}`)
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
            fetchPhotos()
        } catch (e) { console.error(e) }
    }

    const handleBulkDelete = async () => {
        if (selected.size === 0) return
        if (!confirm(`Ștergi ${selected.size} poze selectate?`)) return
        try {
            await Promise.all([...selected].map(id => api.delete(`/site-photos/${id}`)))
            setSelected(new Set())
            fetchPhotos()
        } catch (e) { console.error(e) }
    }

    const handleDownload = async (photo) => {
        const url = photo.photo_path.startsWith('http') ? photo.photo_path : `${API_BASE}${photo.photo_path}`
        try {
            const res = await fetch(url)
            const blob = await res.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `santier_${photo.site_name?.replace(/\s/g, '_') || 'photo'}_${new Date(photo.created_at).toISOString().slice(0, 10)}.jpg`
            a.click()
            URL.revokeObjectURL(a.href)
        } catch { window.open(url, '_blank') }
    }

    const handleBulkDownload = () => {
        const selectedPhotos = photos.filter(p => selected.has(p.id))
        selectedPhotos.forEach(p => handleDownload(p))
    }

    const startEdit = (photo) => {
        setEditingId(photo.id)
        setEditDesc(photo.description || '')
    }

    const saveEdit = async (id) => {
        try {
            await api.patch(`/site-photos/${id}`, { description: editDesc })
            setEditingId(null)
            fetchPhotos()
        } catch (e) { console.error(e) }
    }

    const toggleSelect = (id) => {
        setSelected(prev => {
            const n = new Set(prev)
            n.has(id) ? n.delete(id) : n.add(id)
            return n
        })
    }

    const toggleSelectAll = () => {
        if (selected.size === photos.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(photos.map(p => p.id)))
        }
    }

    const formatDate = (d) => new Date(d).toLocaleDateString('ro-RO', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    const getPhotoUrl = (photo) =>
        photo.photo_path?.startsWith('http') ? photo.photo_path : `${API_BASE}${photo.photo_path}`

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                        Poze Șantier
                        <span className="text-base font-normal text-slate-400">({total})</span>
                    </h1>
                </div>

                {/* Toolbar */}
                <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Site filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <select
                                    value={siteFilter}
                                    onChange={(e) => { setSiteFilter(e.target.value); setPage(1) }}
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 outline-none"
                                >
                                    <option value="">Toate șantierele</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            {/* Select all */}
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                {selected.size === photos.length && photos.length > 0
                                    ? <CheckSquare className="w-4 h-4 text-violet-500" />
                                    : <Square className="w-4 h-4" />}
                                Selectează tot
                            </button>

                            {/* Bulk actions */}
                            {selected.size > 0 && (
                                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                                    <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
                                        {selected.size} selectate
                                    </span>
                                    <button
                                        onClick={handleBulkDownload}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Descarcă
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Șterge
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* View toggle */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                    </div>
                ) : photos.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-600">Nicio poză încă</p>
                        <p className="text-sm text-slate-400 mt-1">Pozele adăugate de echipă vor apărea aici</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ─── GRID VIEW ─── */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {photos.map(photo => (
                            <div key={photo.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden group hover:shadow-lg transition-all ${selected.has(photo.id) ? 'ring-2 ring-violet-500 ring-offset-2' : ''}`}>
                                {/* Image */}
                                <div className="aspect-[4/3] bg-slate-100 relative cursor-pointer overflow-hidden" onClick={() => setLightbox(photo)}>
                                    <img src={getPhotoUrl(photo)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                    {/* Selection checkbox */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id) }}
                                        className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${selected.has(photo.id) ? 'bg-violet-500 text-white' : 'bg-white/80 text-slate-400 opacity-0 group-hover:opacity-100'
                                            }`}
                                    >
                                        {selected.has(photo.id) && <Check className="w-4 h-4" />}
                                    </button>
                                    {/* Actions */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleDownload(photo) }} className="p-1.5 bg-white/90 hover:bg-white text-slate-600 rounded-lg shadow-sm" title="Descarcă">
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); startEdit(photo) }} className="p-1.5 bg-white/90 hover:bg-white text-slate-600 rounded-lg shadow-sm" title="Editează">
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(photo.id) }} className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg shadow-sm" title="Șterge">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                {/* Info */}
                                <div className="p-3">
                                    {editingId === photo.id ? (
                                        <div className="flex gap-1 mb-2">
                                            <input
                                                value={editDesc}
                                                onChange={(e) => setEditDesc(e.target.value)}
                                                className="flex-1 border border-violet-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-violet-400"
                                                placeholder="Descriere..."
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(photo.id)}
                                            />
                                            <button onClick={() => saveEdit(photo.id)} className="px-2 py-1 bg-violet-500 text-white rounded-lg text-xs font-semibold">✓</button>
                                            <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs">✕</button>
                                        </div>
                                    ) : photo.description ? (
                                        <p className="text-sm text-slate-800 font-medium mb-2 line-clamp-2 cursor-pointer hover:text-violet-600" onClick={() => startEdit(photo)}>
                                            <MessageSquare className="w-3 h-3 inline mr-1 text-slate-400" />{photo.description}
                                        </p>
                                    ) : (
                                        <button onClick={() => startEdit(photo)} className="text-xs text-slate-400 hover:text-violet-500 mb-2 flex items-center gap-1">
                                            <Edit3 className="w-3 h-3" /> Adaugă descriere
                                        </button>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                                        <span className="font-semibold text-slate-700 truncate">{photo.site_name}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <User className="w-3.5 h-3.5 shrink-0" />
                                            <span>{photo.uploader_name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">{formatDate(photo.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ─── LIST VIEW ─── */
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-8">
                                        <button onClick={toggleSelectAll}>
                                            {selected.size === photos.length && photos.length > 0
                                                ? <CheckSquare className="w-4 h-4 text-violet-500" />
                                                : <Square className="w-4 h-4 text-slate-400" />}
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Poză</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descriere</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Șantier</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Încărcat de</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {photos.map(photo => (
                                    <tr key={photo.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${selected.has(photo.id) ? 'bg-violet-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <button onClick={() => toggleSelect(photo.id)}>
                                                {selected.has(photo.id)
                                                    ? <CheckSquare className="w-4 h-4 text-violet-500" />
                                                    : <Square className="w-4 h-4 text-slate-300" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <img
                                                src={getPhotoUrl(photo)}
                                                alt=""
                                                className="w-16 h-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setLightbox(photo)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingId === photo.id ? (
                                                <div className="flex gap-1">
                                                    <input
                                                        value={editDesc}
                                                        onChange={(e) => setEditDesc(e.target.value)}
                                                        className="flex-1 border border-violet-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-violet-400"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(photo.id)}
                                                    />
                                                    <button onClick={() => saveEdit(photo.id)} className="px-2 py-1 bg-violet-500 text-white rounded-lg text-xs">✓</button>
                                                    <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-slate-200 rounded-lg text-xs">✕</button>
                                                </div>
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(photo)}
                                                    className={`text-sm cursor-pointer hover:text-violet-600 ${photo.description ? 'text-slate-700' : 'text-slate-400 italic'}`}
                                                >
                                                    {photo.description || 'Adaugă descriere...'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-slate-700">{photo.site_name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-slate-600">{photo.uploader_name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-slate-400">{formatDate(photo.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleDownload(photo)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors" title="Descarcă">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => startEdit(photo)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors" title="Editează">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(photo.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Șterge">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                        <span className="text-sm font-semibold text-slate-600 px-3">{page} / {totalPages}</span>
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
                    {/* Navigation arrows */}
                    {photos.indexOf(lightbox) > 0 && (
                        <button
                            className="absolute left-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full"
                            onClick={(e) => { e.stopPropagation(); setLightbox(photos[photos.indexOf(lightbox) - 1]) }}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}
                    {photos.indexOf(lightbox) < photos.length - 1 && (
                        <button
                            className="absolute right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full"
                            onClick={(e) => { e.stopPropagation(); setLightbox(photos[photos.indexOf(lightbox) + 1]) }}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}
                    <div className="max-w-4xl max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
                        <img src={getPhotoUrl(lightbox)} alt="" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                        <div className="mt-3 flex items-center justify-between">
                            <div>
                                {lightbox.description && <p className="text-white text-lg font-medium">{lightbox.description}</p>}
                                <p className="text-white/60 text-sm mt-1">
                                    {lightbox.site_name} • {lightbox.uploader_name} • {formatDate(lightbox.created_at)}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDownload(lightbox)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" /> Descarcă
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
