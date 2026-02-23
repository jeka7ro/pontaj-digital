import { useState, useEffect } from 'react'
import { X, Download, Trash2, Calendar, User, FileText } from 'lucide-react'
import api from '../lib/api'

export default function PhotoGallery({ timesheetId, canDelete = false }) {
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState(null)

    useEffect(() => {
        fetchPhotos()
    }, [timesheetId])

    const fetchPhotos = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/timesheets/${timesheetId}/photos`)
            setPhotos(response.data.photos || [])
        } catch (error) {
            console.error('Error fetching photos:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (photoId) => {
        if (!confirm('Sigur vrei să ștergi această fotografie?')) return

        try {
            await api.delete(`/timesheets/photos/${photoId}`)
            setPhotos(photos.filter(p => p.id !== photoId))
            setSelectedPhoto(null)
        } catch (error) {
            console.error('Error deleting photo:', error)
            alert('Eroare la ștergere. Încearcă din nou.')
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('ro-RO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-slate-600">Se încarcă fotografiile...</p>
            </div>
        )
    }

    if (photos.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-slate-600">Nu există fotografii încărcate.</p>
            </div>
        )
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">
                    Fotografii ({photos.length})
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-all cursor-pointer"
                            onClick={() => setSelectedPhoto(photo)}
                        >
                            <img
                                src={`/${photo.thumbnail_path}`}
                                alt={photo.filename}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-2 left-2 right-2">
                                    <p className="text-white text-xs font-medium truncate">
                                        {photo.filename}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Photo Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-900 truncate pr-4">
                                {selectedPhoto.filename}
                            </h3>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* Image */}
                        <div className="flex-1 overflow-auto p-6 bg-slate-50">
                            <img
                                src={`/${selectedPhoto.file_path}`}
                                alt={selectedPhoto.filename}
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        </div>

                        {/* Details */}
                        <div className="p-6 border-t border-slate-200 space-y-3">
                            {selectedPhoto.description && (
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Descriere</p>
                                        <p className="text-sm text-slate-600">{selectedPhoto.description}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Data încărcării</p>
                                    <p className="text-sm text-slate-600">{formatDate(selectedPhoto.uploaded_at)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <User className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Încărcat de</p>
                                    <p className="text-sm text-slate-600">{selectedPhoto.uploaded_by || 'Necunoscut'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Dimensiune</p>
                                    <p className="text-sm text-slate-600">{formatFileSize(selectedPhoto.file_size)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-slate-200 flex items-center gap-3">
                            <a
                                href={`/${selectedPhoto.file_path}`}
                                download={selectedPhoto.filename}
                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Descarcă
                            </a>
                            {canDelete && (
                                <button
                                    onClick={() => handleDelete(selectedPhoto.id)}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Șterge
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
