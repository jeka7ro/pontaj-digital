import { useState, useEffect } from 'react'
import { Plus, Building2, Calendar, FileText, Trash2, X, Image as ImageIcon, Download, ChevronLeft, ChevronRight, Search, Pencil } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'

export default function DeliveriesManagement() {
    const [deliveries, setDeliveries] = useState([])
    const [sites, setSites] = useState([])
    const [loading, setLoading] = useState(true)
    const { showToast } = useUIStore()

    // Pagination
    const [page, setPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState({
        site_id: '',
        delivery_date: new Date().toISOString().split('T')[0],
        materials_delivered: '',
        photo_url: null
    })
    const [uploading, setUploading] = useState(false)
    
    // View image state
    const [viewImage, setViewImage] = useState(null)
    const [search, setSearch] = useState('')
    
    // Bulk delete state
    const [selectedIds, setSelectedIds] = useState([])
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [deliveriesRes, sitesRes] = await Promise.all([
                api.get('/admin/logistics/deliveries'),
                api.get('/admin/sites/', { params: { page_size: 1000, status: 'active' } })
            ])
            setDeliveries(Array.isArray(deliveriesRes.data) ? deliveriesRes.data : [])
            setSites(Array.isArray(sitesRes.data) ? sitesRes.data : (sitesRes.data?.sites || []))
        } catch (error) {
            showToast('Eroare la încărcarea datelor', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        try {
            setUploading(true)
            const form = new FormData()
            form.append('file', file)
            const res = await api.post('/admin/logistics/deliveries/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setFormData(prev => ({ ...prev, photo_url: res.data.url }))
            showToast('Poză încărcată cu succes', 'success')
        } catch (error) {
            showToast('Eroare la încărcarea pozei', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.site_id || !formData.materials_delivered) {
            showToast('Completați câmpurile obligatorii', 'error')
            return
        }

        try {
            if (editingId) {
                await api.put(`/admin/logistics/deliveries/${editingId}`, formData)
                showToast('Livrare actualizată cu succes', 'success')
            } else {
                await api.post('/admin/logistics/deliveries', formData)
                showToast('Livrare adăugată cu succes', 'success')
            }
            setShowModal(false)
            setEditingId(null)
            setFormData({
                site_id: '',
                delivery_date: new Date().toISOString().split('T')[0],
                materials_delivered: '',
                photo_url: null
            })
            fetchData()
        } catch (error) {
            showToast('Eroare la salvare', 'error')
        }
    }

    const handleEdit = (delivery) => {
        setFormData({
            site_id: delivery.site_id,
            delivery_date: delivery.delivery_date,
            materials_delivered: delivery.materials_delivered,
            photo_url: delivery.photo_url
        })
        setEditingId(delivery.id)
        setShowModal(true)
    }

    const handleDelete = (id) => {
        setDeleteConfirm([id])
    }

    const handleBulkDelete = () => {
        setDeleteConfirm(selectedIds)
    }

    const confirmDelete = async () => {
        if (!deleteConfirm) return
        try {
            let errorOccurred = false
            for (const id of deleteConfirm) {
                try {
                    await api.delete(`/admin/logistics/deliveries/${id}`)
                } catch (e) {
                    if (e.response?.status !== 404) {
                        errorOccurred = true
                    }
                }
            }
            
            if (errorOccurred) {
                showToast('Eroare la ștergerea unor livrări', 'error')
            } else {
                showToast(deleteConfirm.length > 1 ? 'Livrări șterse cu succes' : 'Livrare ștearsă', 'success')
            }
            
            if (deleteConfirm.length > 1) {
                setSelectedIds([])
            } else {
                setSelectedIds(prev => prev.filter(id => !deleteConfirm.includes(id)))
            }
            setDeleteConfirm(null)
            fetchData()
        } catch (error) {
            showToast('Eroare la ștergere', 'error')
            setDeleteConfirm(null)
        }
    }

    // Pagination calculations
    const safeDeliveries = Array.isArray(deliveries) ? deliveries : []
    const filteredDeliveries = safeDeliveries.filter(d => {
        const searchLower = search.toLowerCase()
        const dateFormatted = new Date(d.delivery_date).toLocaleDateString('ro-RO').toLowerCase()
        return (d.site_name || '').toLowerCase().includes(searchLower) || 
               (d.materials_delivered || '').toLowerCase().includes(searchLower) ||
               dateFormatted.includes(searchLower)
    })
    const totalPages = Math.ceil(filteredDeliveries.length / rowsPerPage)
    const paginatedDeliveries = filteredDeliveries.slice((page - 1) * rowsPerPage, page * rowsPerPage)

    if (loading) return <div className="p-8 text-center">Se încarcă...</div>

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Livrări Logistica</h1>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div style={{ position: 'relative' }} className="flex-1 sm:w-64">
                        <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                        <input
                            className="w-full glass-input bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                            style={{ paddingLeft: 36, paddingRight: search ? 80 : 16, borderRadius: 9999, paddingTop: '8px', paddingBottom: '8px', fontSize: '14px' }}
                            placeholder="Caută..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                        {search && (
                            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#3b82f6', color: 'white', borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {filteredDeliveries.length} / {safeDeliveries.length}
                            </div>
                        )}
                    </div>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center justify-center gap-1.5 px-4 h-10 bg-red-100 hover:bg-red-200 text-red-600 text-[14px] font-medium rounded-full transition-colors shadow-sm whitespace-nowrap shrink-0"
                        >
                            <Trash2 className="w-4 h-4" />
                            Șterge ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setEditingId(null)
                            setFormData({
                                site_id: '',
                                delivery_date: new Date().toISOString().split('T')[0],
                                materials_delivered: '',
                                photo_url: null
                            })
                            setShowModal(true)
                        }}
                        className="flex items-center justify-center gap-1.5 px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-medium rounded-full transition-colors shadow-sm whitespace-nowrap shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Adaugă Livrare
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th style={{ width: 40, textAlign: 'center' }} className="p-4">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={paginatedDeliveries.length > 0 && selectedIds.length === paginatedDeliveries.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIds(paginatedDeliveries.map(d => d.id))
                                            } else {
                                                setSelectedIds([])
                                            }
                                        }}
                                    />
                                </th>
                                <th style={{ width: 50, textAlign: 'center' }} className="p-4 font-medium text-slate-500 text-[13px] uppercase tracking-wider">Nr.</th>
                                <th className="p-4 font-medium text-slate-500 text-[13px] uppercase tracking-wider">Data</th>
                                <th className="p-4 font-medium text-slate-500 text-[13px] uppercase tracking-wider">Șantier</th>
                                <th className="p-4 font-medium text-slate-500 text-[13px] uppercase tracking-wider">Ce s-a livrat</th>
                                <th className="p-4 font-medium text-slate-500 text-[13px] uppercase tracking-wider">Dovadă (Poză)</th>
                                <th className="p-4 font-medium text-slate-500 text-[13px] uppercase tracking-wider text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedDeliveries.map((delivery, index) => (
                                <tr key={delivery.id} className="hover:bg-gray-50">
                                    <td style={{ textAlign: 'center' }} className="p-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={selectedIds.includes(delivery.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds(prev => [...prev, delivery.id])
                                                } else {
                                                    setSelectedIds(prev => prev.filter(id => id !== delivery.id))
                                                }
                                            }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }} className="p-4">
                                        {(page - 1) * rowsPerPage + index + 1}
                                    </td>
                                    <td className="p-4">
                                        {new Date(delivery.delivery_date).toLocaleDateString('ro-RO')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-400" />
                                            {delivery.site_name}
                                        </div>
                                    </td>
                                    <td className="p-4 max-w-md truncate" title={delivery.materials_delivered}>
                                        {delivery.materials_delivered}
                                    </td>
                                    <td className="p-4">
                                        {delivery.photo_url ? (
                                            <button 
                                                onClick={() => setViewImage(delivery.photo_url)}
                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Vezi Poza
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Fără poză</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleEdit(delivery)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Editează"
                                            >
                                                <Pencil className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(delivery.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Șterge"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredDeliveries.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        Nu există livrări înregistrate.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ whiteSpace: 'nowrap', fontSize: '14px', color: '#64748b' }}>
                            Afișează&nbsp;
                            <select 
                                value={rowsPerPage} 
                                onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }} 
                                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 9999, padding: '2px 8px', outline: 'none' }}
                            >
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={9999}>Toți</option>
                            </select>
                        </span>
                        <span style={{ whiteSpace: 'nowrap', fontSize: '14px', color: '#64748b' }}>Total înregistrări: <strong>{filteredDeliveries.length}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '14px', color: '#64748b' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>Pagina {page} din {totalPages || 1}</span>
                        <button 
                            className="p-1 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50" 
                            onClick={() => setPage(p => p - 1)} 
                            disabled={page === 1}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                            className="p-1 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50" 
                            onClick={() => setPage(p => p + 1)} 
                            disabled={page === totalPages || totalPages === 0}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Adăugare Livrare */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b shrink-0">
                            <h2 className="text-xl font-bold">{editingId ? 'Editează Livrare' : 'Adaugă Livrare Nouă'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data Livrării *
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="date"
                                        required
                                        value={formData.delivery_date}
                                        onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                                        className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Șantier *
                                </label>
                                <select
                                    required
                                    value={formData.site_id}
                                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Selectează Șantierul --</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>
                                            {site.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ce s-a livrat? (Materiale) *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.materials_delivered}
                                    onChange={(e) => setFormData({ ...formData, materials_delivered: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: 3 paleți ciment, 200m cablu CYABY, etc..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Atașează Poză (Dovadă / Aviz)
                                </label>
                                {formData.photo_url ? (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                                        <span className="text-sm text-green-600 font-medium">Poză încărcată!</span>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({ ...formData, photo_url: null })}
                                            className="text-red-500 text-sm hover:underline"
                                        >
                                            Șterge
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="w-full p-2 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                )}
                                {uploading && <p className="text-xs text-blue-500 mt-1">Se încarcă...</p>}
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Renunță
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Salvează Livrare
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Image Modal */}
            {viewImage && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
                    <button 
                        onClick={() => setViewImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img 
                        src={viewImage} 
                        alt="Dovada Livrare" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    />
                </div>
            )}

            {/* Custom Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmare Ștergere</h3>
                            <p className="text-gray-600">
                                {deleteConfirm.length > 1 
                                    ? `Sunteți sigur că doriți să ștergeți cele ${deleteConfirm.length} livrări selectate?`
                                    : 'Sunteți sigur că doriți să ștergeți această livrare?'}
                            </p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium"
                            >
                                Șterge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
