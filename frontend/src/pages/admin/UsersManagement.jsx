import { useState, useEffect, useRef } from 'react'
import { useAdminStore } from '../../store/adminStore'
import useViewPreferencesStore from '../../store/viewPreferencesStore'
import api from '../../lib/api'
import { Users, Plus, Search, Edit2, Trash2, Key, UserCheck, UserX, Loader2, Mail, Phone, Calendar, X, Save, Eye, Download, Upload, CreditCard, FileSpreadsheet, ScanLine, MapPin, Filter, XCircle, FileText, FileUp, FileDown } from 'lucide-react'
import ViewToggle from '../../components/ViewToggle'
import Pagination from '../../components/Pagination'

const PAGE_ID = 'admin-users'
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

const EMPTY_USER = {
    employee_code: '',
    last_name: '',
    first_name: '',
    role_id: '',
    pin: '',
    birth_date: '',
    cnp: '',
    birth_place: '',
    id_card_series: '',
    phone: '',
    email: '',
    address: '',
    is_active: true
}

export default function UsersManagement() {
    const [users, setUsers] = useState([])
    const [totalUsers, setTotalUsers] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [stats, setStats] = useState(null)
    const [roles, setRoles] = useState([])
    const token = useAdminStore((state) => state.token)

    // Modal states
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState(EMPTY_USER)
    const [saving, setSaving] = useState(false)
    const [showPinModal, setShowPinModal] = useState(false)
    const [pinUserId, setPinUserId] = useState(null)
    const [newPin, setNewPin] = useState('')
    const [showViewModal, setShowViewModal] = useState(false)
    const [viewingUser, setViewingUser] = useState(null)
    const [idCardFile, setIdCardFile] = useState(null)
    const [idCardPreview, setIdCardPreview] = useState(null)
    const [uploadingIdCard, setUploadingIdCard] = useState(false)
    const [ocrLoading, setOcrLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [contractFile, setContractFile] = useState(null)
    const [uploadingContract, setUploadingContract] = useState(false)
    const contractInputRef = useRef(null)
    const importInputRef = useRef(null)
    const idCardInputRef = useRef(null)

    // View preferences
    const preferences = useViewPreferencesStore((state) => state.getPagePreferences(PAGE_ID))
    const setViewMode = useViewPreferencesStore((state) => state.setViewMode)
    const setPageSize = useViewPreferencesStore((state) => state.setPageSize)
    const setCurrentPage = useViewPreferencesStore((state) => state.setCurrentPage)

    // Auto-reset page if beyond results
    useEffect(() => {
        if (!loading && users.length === 0 && totalUsers > 0 && preferences.currentPage > 1) {
            setCurrentPage(PAGE_ID, 1)
        }
    }, [loading, users.length, totalUsers, preferences.currentPage])

    useEffect(() => {
        fetchUsers()
        fetchStats()
        fetchRoles()
    }, [search, roleFilter, statusFilter, preferences.currentPage, preferences.pageSize])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const params = { search, page: preferences.currentPage, page_size: preferences.pageSize }
            if (roleFilter) params.role_id = roleFilter
            if (statusFilter !== '') params.is_active = statusFilter === 'true'
            const response = await api.get('/admin/users/', { params })
            setUsers(response.data.users)
            setTotalUsers(response.data.total)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/users/stats/summary')
            setStats(response.data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const fetchRoles = async () => {
        try {
            const response = await api.get('/admin/roles/')
            setRoles(response.data || [])
        } catch (error) {
            console.error('Error fetching roles:', error)
        }
    }

    const handleAddUser = async () => {
        setEditingUser(null)
        setFormData(EMPTY_USER)
        setIdCardFile(null)
        setIdCardPreview(null)
        setShowEditModal(true)
        // Auto-fetch next employee code
        try {
            const resp = await api.get('/admin/users/next-code')
            if (resp.data.next_code) {
                setFormData(prev => ({ ...prev, employee_code: resp.data.next_code }))
            }
        } catch (e) {
            console.error('Could not fetch next employee code:', e)
        }
    }

    const handleEditUser = (user) => {
        setEditingUser(user)
        setFormData({
            employee_code: user.employee_code || '',
            last_name: user.last_name || '',
            first_name: user.first_name || '',
            role_id: user.role_id || '',
            pin: '',
            birth_date: user.birth_date || '',
            cnp: user.cnp || '',
            birth_place: user.birth_place || '',
            id_card_series: user.id_card_series || '',
            phone: user.phone || '',
            email: user.email || '',
            address: user.address || '',
            is_active: user.is_active
        })
        setIdCardFile(null)
        setIdCardPreview(null)
        setShowEditModal(true)
    }

    const handleSaveUser = async () => {
        if (!formData.last_name.trim()) {
            alert('Numele este obligatoriu!')
            return
        }
        if (!formData.first_name.trim()) {
            alert('Prenumele este obligatoriu!')
            return
        }
        if (!editingUser && !formData.employee_code.trim()) {
            alert('Codul angajatului este obligatoriu!')
            return
        }
        if (!editingUser && !formData.pin) {
            alert('PIN-ul este obligatoriu!')
            return
        }

        try {
            setSaving(true)
            let savedUser
            if (editingUser) {
                const updatePayload = {}
                if (formData.last_name !== (editingUser.last_name || '')) updatePayload.last_name = formData.last_name
                if (formData.first_name !== (editingUser.first_name || '')) updatePayload.first_name = formData.first_name
                if (formData.role_id !== editingUser.role_id) updatePayload.role_id = formData.role_id
                if (formData.is_active !== editingUser.is_active) updatePayload.is_active = formData.is_active
                if (formData.birth_date !== (editingUser.birth_date || '')) updatePayload.birth_date = formData.birth_date || null
                if (formData.cnp !== (editingUser.cnp || '')) updatePayload.cnp = formData.cnp || null
                if (formData.birth_place !== (editingUser.birth_place || '')) updatePayload.birth_place = formData.birth_place || null
                if (formData.id_card_series !== (editingUser.id_card_series || '')) updatePayload.id_card_series = formData.id_card_series || null
                if (formData.phone !== (editingUser.phone || '')) updatePayload.phone = formData.phone || null
                if (formData.email !== (editingUser.email || '')) updatePayload.email = formData.email || null
                if (formData.address !== (editingUser.address || '')) updatePayload.address = formData.address || null

                const resp = await api.put(`/admin/users/${editingUser.id}`, updatePayload)
                savedUser = resp.data
            } else {
                // Clean empty strings to null for optional fields
                const cleanData = { ...formData }
                const optionalFields = ['birth_date', 'cnp', 'birth_place', 'id_card_series', 'phone', 'email', 'address']
                optionalFields.forEach(f => { if (cleanData[f] === '') cleanData[f] = null })
                const resp = await api.post('/admin/users/', cleanData)
                savedUser = resp.data
            }

            // Upload ID card if selected
            if (idCardFile && savedUser?.id) {
                const fd = new FormData()
                fd.append('file', idCardFile)
                await api.post(`/admin/users/${savedUser.id}/upload-id-card`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
            }

            setShowEditModal(false)
            fetchUsers()
            fetchStats()
        } catch (error) {
            alert(error.response?.data?.detail || 'Eroare la salvare')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleActive = async (userId, currentStatus) => {
        try {
            await api.put(`/admin/users/${userId}`, { is_active: !currentStatus })
            fetchUsers()
            fetchStats()
        } catch (error) {
            console.error('Error updating user:', error)
        }
    }

    const handleDelete = async (userId) => {
        if (!confirm('Sigur doriți să ștergeți acest utilizator?')) return
        try {
            await api.delete(`/admin/users/${userId}`)
            fetchUsers()
            fetchStats()
        } catch (error) {
            console.error('Error deleting user:', error)
        }
    }

    const handleResetPin = (userId) => {
        setPinUserId(userId)
        setNewPin('')
        setShowPinModal(true)
    }

    const handleSavePin = async () => {
        if (!newPin || newPin.length < 4) {
            alert('PIN-ul trebuie să aibă minim 4 caractere!')
            return
        }
        try {
            setSaving(true)
            await api.post(`/admin/users/${pinUserId}/reset-pin`, { new_pin: newPin })
            setShowPinModal(false)
            alert('PIN resetat cu succes!')
        } catch (error) {
            alert(error.response?.data?.detail || 'Eroare la resetarea PIN-ului')
        } finally {
            setSaving(false)
        }
    }

    const handleViewUser = (user) => {
        setViewingUser(user)
        setShowViewModal(true)
    }

    const handleIdCardSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            setIdCardFile(file)
            setIdCardPreview(URL.createObjectURL(file))
        }
    }

    const handleScanIdCard = async () => {
        if (!idCardFile) {
            alert('Selectează mai întâi o imagine cu cartea de identitate!')
            return
        }
        try {
            setOcrLoading(true)
            const fd = new FormData()
            fd.append('file', idCardFile)
            const resp = await api.post('/admin/users/ocr/extract', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            const ocr = resp.data
            if (ocr.success) {
                const cnpValue = ocr.cnp || formData.cnp
                const autoPin = cnpValue && cnpValue.length >= 4 ? cnpValue.slice(-4) : ''
                setFormData(prev => ({
                    ...prev,
                    last_name: ocr.last_name || prev.last_name,
                    first_name: ocr.first_name || prev.first_name,
                    cnp: ocr.cnp || prev.cnp,
                    pin: autoPin || prev.pin,
                    birth_date: ocr.birth_date || prev.birth_date,
                    birth_place: ocr.birth_place || prev.birth_place,
                    id_card_series: ocr.id_card_series || prev.id_card_series,
                    address: ocr.address || prev.address,
                }))
                alert('✅ Date extrase cu succes din cartea de identitate!')
            } else {
                alert(`⚠️ ${ocr.message}`)
            }
        } catch (error) {
            alert('Eroare la scanarea cărții de identitate: ' + (error.response?.data?.detail || error.message))
        } finally {
            setOcrLoading(false)
        }
    }

    const handleExportExcel = async () => {
        try {
            const response = await api.get('/admin/users/export/excel', { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `angajati_${new Date().toISOString().slice(0, 10)}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            alert('Eroare la export: ' + (error.response?.data?.detail || error.message))
        }
    }

    const handleImportExcel = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        try {
            setImporting(true)
            const fd = new FormData()
            fd.append('file', file)
            const resp = await api.post('/admin/users/import/excel', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            const result = resp.data
            let msg = `✅ ${result.message}`
            if (result.errors?.length) {
                msg += `\n\n⚠️ Erori:\n${result.errors.join('\n')}`
            }
            alert(msg)
            fetchUsers()
            fetchStats()
        } catch (error) {
            alert('Eroare la import: ' + (error.response?.data?.detail || error.message))
        } finally {
            setImporting(false)
            if (importInputRef.current) importInputRef.current.value = ''
        }
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-600" />
                        Gestionare Angajați
                    </h1>
                    <p className="text-slate-600 mt-1">Administrează conturile angajaților</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Excel Import */}
                    <input
                        type="file"
                        ref={importInputRef}
                        accept=".xlsx,.xls"
                        onChange={handleImportExcel}
                        className="hidden"
                    />
                    <button
                        onClick={() => importInputRef.current?.click()}
                        disabled={importing}
                        className="bg-white border-2 border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                        Import
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    </button>
                    {/* Excel Export */}
                    <button
                        onClick={handleExportExcel}
                        className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                        <FileDown className="w-4 h-4" />
                        Export
                        <FileSpreadsheet className="w-4 h-4" />
                    </button>
                    {/* Add User */}
                    <button
                        onClick={handleAddUser}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Adaugă Angajat
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard label="Total Angajați" value={stats.total_users} icon={Users} color="from-blue-500 to-blue-600" />
                    <StatCard label="Activi" value={stats.active_users} icon={UserCheck} color="from-emerald-500 to-emerald-600" />
                    <StatCard label="Inactivi" value={stats.inactive_users} icon={UserX} color="from-slate-500 to-slate-600" />
                    <StatCard label="Roluri" value={stats.users_by_role?.length || 0} icon={Key} color="from-violet-500 to-violet-600" />
                </div>
            )}

            {/* Search and Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[280px] bg-white rounded-xl border border-slate-200 p-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                            placeholder="Caută după nume sau cod angajat..."
                            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Role Filter */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <select
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                        className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-sm min-w-[160px]"
                    >
                        <option value="">Toate rolurile</option>
                        {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                        className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-sm min-w-[140px]"
                    >
                        <option value="">Toți</option>
                        <option value="true">Activi</option>
                        <option value="false">Inactivi</option>
                    </select>
                </div>

                {/* Clear Filters */}
                {(roleFilter || statusFilter || search) && (
                    <button
                        onClick={() => { setRoleFilter(''); setStatusFilter(''); setSearch(''); setCurrentPage(PAGE_ID, 1) }}
                        className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors border border-red-200"
                        title="Resetează filtrele"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                )}

                <ViewToggle
                    viewMode={preferences.viewMode}
                    onViewModeChange={(mode) => setViewMode(PAGE_ID, mode)}
                />
            </div>

            {/* Users Content */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : preferences.viewMode === 'list' ? (
                    <UsersTable users={users} onToggleActive={handleToggleActive} onDelete={handleDelete} onEdit={handleEditUser} onResetPin={handleResetPin} onView={handleViewUser} />
                ) : (
                    <UsersGrid users={users} onToggleActive={handleToggleActive} onDelete={handleDelete} onEdit={handleEditUser} onResetPin={handleResetPin} onView={handleViewUser} />
                )}

                {!loading && users.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">Nu există angajați</p>
                        <p className="text-sm text-slate-500 mt-1">Adaugă primul angajat pentru a începe</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && users.length > 0 && (
                <Pagination
                    currentPage={preferences.currentPage}
                    pageSize={preferences.pageSize}
                    totalItems={totalUsers}
                    onPageChange={(page) => setCurrentPage(PAGE_ID, page)}
                    onPageSizeChange={(size) => setPageSize(PAGE_ID, size)}
                />
            )}

            {/* =================== ADD/EDIT USER MODAL =================== */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl border border-slate-200/50" onClick={e => e.stopPropagation()}>
                        {/* Header with gradient */}
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent)]"></div>
                            <div className="relative p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Avatar in header — clickable to change */}
                                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload-input')?.click()}>
                                        {editingUser?.avatar_path ? (
                                            <img
                                                src={`${API_BASE}${editingUser.avatar_path}`}
                                                style={{ objectPosition: 'top' }}
                                                alt=""
                                                className="w-14 h-14 rounded-full object-cover ring-3 ring-white/40 shadow-lg"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                            />
                                        ) : null}
                                        <div className={`w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full items-center justify-center text-white font-bold text-xl ring-3 ring-white/20 ${editingUser?.avatar_path ? 'hidden' : 'flex'}`}>
                                            {editingUser ? (editingUser.last_name?.charAt(0) || '') + (editingUser.first_name?.charAt(0) || '') : '✦'}
                                        </div>
                                        {editingUser && (
                                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-semibold">📷</span>
                                            </div>
                                        )}
                                        <input
                                            id="avatar-upload-input"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const f = e.target.files[0]
                                                if (!f || !editingUser) return
                                                const fd = new FormData()
                                                fd.append('file', f)
                                                try {
                                                    const resp = await api.post(`/admin/users/${editingUser.id}/upload-avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                                                    setEditingUser({ ...editingUser, avatar_path: resp.data.avatar_path })
                                                    fetchUsers()
                                                } catch (err) { console.error('Avatar upload error:', err) }
                                                e.target.value = ''
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            {editingUser ? 'Editează Angajat' : 'Adaugă Angajat Nou'}
                                        </h2>
                                        {editingUser && (
                                            <p className="text-blue-100 text-sm">{editingUser.full_name} • {editingUser.employee_code}</p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X className="w-6 h-6 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* ID Card Upload + OCR Section */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                                <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Carte de Identitate
                                </h3>
                                <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            ref={idCardInputRef}
                                            accept="image/*"
                                            onChange={handleIdCardSelect}
                                            className="hidden"
                                        />
                                        {idCardPreview ? (
                                            <div className="relative">
                                                <img src={idCardPreview} alt="CI Preview" className="w-full h-40 object-contain rounded-lg border border-slate-200 bg-white" />
                                                <button
                                                    onClick={() => { setIdCardFile(null); setIdCardPreview(null) }}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => idCardInputRef.current?.click()}
                                                className="w-full h-32 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <Upload className="w-6 h-6 mb-1" />
                                                <span className="text-sm font-medium">Încarcă poză CI</span>
                                                <span className="text-xs text-blue-400 mt-0.5">JPG, PNG, max 10MB</span>
                                            </button>
                                        )}
                                    </div>
                                    {idCardPreview && (
                                        <button
                                            onClick={handleScanIdCard}
                                            disabled={ocrLoading}
                                            className="px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                            Scanează CI
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Employee Code - only for new */}
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Cod Angajat *</label>
                                        <input
                                            type="text"
                                            value={formData.employee_code}
                                            onChange={e => setFormData({ ...formData, employee_code: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                            placeholder="ex: EMP001"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nume *</label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: Popescu"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Prenume *</label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: Ion"
                                    />
                                </div>

                                {/* PIN - only for new */}
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">PIN *</label>
                                        <input
                                            type="password"
                                            value={formData.pin}
                                            onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                            placeholder="4-6 cifre"
                                            maxLength={6}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Rol *</label>
                                    <select
                                        value={formData.role_id}
                                        onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                    >
                                        <option value="">Selectează rol...</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">CNP</label>
                                    <input
                                        type="text"
                                        value={formData.cnp}
                                        onChange={e => {
                                            const cnpVal = e.target.value
                                            const updates = { ...formData, cnp: cnpVal }
                                            // Auto-fill PIN with last 4 digits of CNP when complete
                                            if (cnpVal.length === 13 && !formData.pin) {
                                                updates.pin = cnpVal.slice(-4)
                                            }
                                            setFormData(updates)
                                        }}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="13 cifre"
                                        maxLength={13}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Serie Buletin</label>
                                    <input
                                        type="text"
                                        value={formData.id_card_series}
                                        onChange={e => setFormData({ ...formData, id_card_series: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: RD 123456"
                                        maxLength={20}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Data Nașterii</label>
                                    <input
                                        type="date"
                                        value={formData.birth_date}
                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Loc Naștere</label>
                                    <input
                                        type="text"
                                        value={formData.birth_place}
                                        onChange={e => setFormData({ ...formData, birth_place: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="ex: București"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Telefon</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="07xx xxx xxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="email@example.com"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Domiciliu</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="Strada, Număr, Oraș"
                                    />
                                </div>

                                {editingUser && (
                                    <div className="md:col-span-2">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="w-5 h-5 rounded border-slate-300"
                                            />
                                            <span className="text-sm font-semibold text-slate-700">Cont activ</span>
                                        </label>
                                    </div>
                                )}

                                {/* Contract Upload */}
                                {editingUser && (
                                    <div className="md:col-span-2">
                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                                            <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Contract de Muncă
                                            </h3>
                                            {editingUser.contract_path ? (
                                                <div className="flex items-center gap-3">
                                                    <a
                                                        href={editingUser.contract_path.startsWith('http') ? editingUser.contract_path : `${API_BASE}${editingUser.contract_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors text-sm font-medium"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Vizualizează Contract
                                                    </a>
                                                    <input type="file" ref={contractInputRef} accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                                                        const file = e.target.files[0]
                                                        if (!file) return
                                                        setUploadingContract(true)
                                                        try {
                                                            const fd = new FormData()
                                                            fd.append('file', file)
                                                            const resp = await api.post(`/admin/users/${editingUser.id}/upload-contract`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                                                            setEditingUser({ ...editingUser, contract_path: resp.data.contract_path })
                                                            alert('✅ Contract încărcat cu succes!')
                                                        } catch (err) { alert('Eroare: ' + (err.response?.data?.detail || err.message)) }
                                                        finally { setUploadingContract(false); if (contractInputRef.current) contractInputRef.current.value = '' }
                                                    }} className="hidden" />
                                                    <button
                                                        onClick={() => contractInputRef.current?.click()}
                                                        disabled={uploadingContract}
                                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {uploadingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                        Înlocuiește
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <input type="file" ref={contractInputRef} accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                                                        const file = e.target.files[0]
                                                        if (!file) return
                                                        setUploadingContract(true)
                                                        try {
                                                            const fd = new FormData()
                                                            fd.append('file', file)
                                                            const resp = await api.post(`/admin/users/${editingUser.id}/upload-contract`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                                                            setEditingUser({ ...editingUser, contract_path: resp.data.contract_path })
                                                            alert('✅ Contract încărcat cu succes!')
                                                        } catch (err) { alert('Eroare: ' + (err.response?.data?.detail || err.message)) }
                                                        finally { setUploadingContract(false); if (contractInputRef.current) contractInputRef.current.value = '' }
                                                    }} className="hidden" />
                                                    <button
                                                        onClick={() => contractInputRef.current?.click()}
                                                        disabled={uploadingContract}
                                                        className="w-full h-24 border-2 border-dashed border-amber-300 rounded-lg flex flex-col items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
                                                    >
                                                        {uploadingContract ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6 mb-1" />}
                                                        <span className="text-sm font-medium">Încarcă Contract</span>
                                                        <span className="text-xs text-amber-400 mt-0.5">PDF, JPG, PNG</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleSaveUser}
                                disabled={saving}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {editingUser ? 'Salvează' : 'Creează Angajat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================== VIEW USER MODAL =================== */}
            {showViewModal && viewingUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                <Eye className="w-6 h-6 text-blue-600" />
                                Detalii Angajat
                            </h2>
                            <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-6 h-6 text-slate-600" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* User Header */}
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
                                {viewingUser.avatar_path ? (
                                    <img
                                        src={`${API_BASE}${viewingUser.avatar_path}`}
                                        style={{ objectPosition: 'top' }}
                                        alt="Avatar"
                                        className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-blue-200"
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                    />
                                ) : null}
                                <div className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full items-center justify-center text-white font-bold text-2xl shadow-lg ${viewingUser.avatar_path ? 'hidden' : 'flex'}`}>
                                    {viewingUser.full_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{viewingUser.full_name}</h3>
                                    <p className="text-sm font-mono text-slate-500">{viewingUser.employee_code}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                            {viewingUser.role_name}
                                        </span>
                                        {viewingUser.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Activ
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Inactiv
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <InfoField label="Nume" value={viewingUser.last_name} />
                                <InfoField label="Prenume" value={viewingUser.first_name} />
                                <InfoField label="CNP" value={viewingUser.cnp} />
                                <InfoField label="Serie Buletin" value={viewingUser.id_card_series} icon={<CreditCard className="w-4 h-4" />} />
                                <InfoField label="Data Nașterii" value={viewingUser.birth_date ? new Date(viewingUser.birth_date).toLocaleDateString('ro-RO') : null} />
                                <InfoField label="Loc Naștere" value={viewingUser.birth_place} icon={<MapPin className="w-4 h-4" />} />
                                <InfoField label="Telefon" value={viewingUser.phone} icon={<Phone className="w-4 h-4" />} />
                                <InfoField label="Email" value={viewingUser.email} icon={<Mail className="w-4 h-4" />} />
                                <InfoField label="Domiciliu" value={viewingUser.address} fullWidth />
                            </div>

                            {/* ID Card Image */}
                            {viewingUser.id_card_path && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        Carte de Identitate
                                    </h4>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <img
                                            src={`${API_BASE}${viewingUser.id_card_path}`}
                                            alt="Carte de identitate"
                                            className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                                            onError={(e) => { e.target.style.display = 'none' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                onClick={() => { setShowViewModal(false); handleEditUser(viewingUser) }}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Editează
                            </button>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                            >
                                Închide
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================== RESET PIN MODAL =================== */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPinModal(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Resetare PIN</h2>
                            <button onClick={() => setShowPinModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">PIN Nou (4-6 cifre)</label>
                            <input
                                type="password"
                                value={newPin}
                                onChange={e => setNewPin(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-center text-2xl tracking-widest"
                                placeholder="••••"
                                maxLength={6}
                                autoFocus
                            />
                        </div>
                        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button onClick={() => setShowPinModal(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                                Anulează
                            </button>
                            <button
                                onClick={handleSavePin}
                                disabled={saving || newPin.length < 4}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                                Resetează PIN
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// =================== HELPER COMPONENTS ===================

function InfoField({ label, value, icon, fullWidth }) {
    return (
        <div className={fullWidth ? 'col-span-2' : ''}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm text-slate-900 flex items-center gap-1.5">
                {icon}
                {value || <span className="text-slate-400 italic">—</span>}
            </p>
        </div>
    )
}

function UsersTable({ users, onToggleActive, onDelete, onEdit, onResetPin, onView }) {
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200">
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Angajat</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acțiuni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                        <tr key={user.id} className="group hover:bg-blue-50/40 transition-all duration-200 cursor-pointer" onClick={() => onView(user)}>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    {user.avatar_path ? (
                                        <img
                                            src={`${apiBase}${user.avatar_path}`}
                                            alt=""
                                            className="w-10 h-10 rounded-full object-cover object-top ring-2 ring-white shadow-md"
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                        />
                                    ) : null}
                                    <div
                                        className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white ${user.avatar_path ? 'hidden' : 'flex'}`}
                                    >
                                        {(user.last_name?.charAt(0) || '') + (user.first_name?.charAt(0) || '')}
                                    </div>
                                    {/* Name + Code */}
                                    <div>
                                        <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{user.last_name} {user.first_name}</p>
                                        <p className="text-xs font-mono text-slate-400">{user.employee_code}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <div className="space-y-0.5">
                                    {user.email && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="truncate max-w-[180px]">{user.email}</span>
                                        </div>
                                    )}
                                    {user.phone && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            {user.phone}
                                        </div>
                                    )}
                                    {!user.email && !user.phone && (
                                        <span className="text-xs text-slate-300 italic">—</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100">
                                    {user.role_name}
                                </span>
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {user.is_active ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        Activ
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                        Inactiv
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onView(user)} className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Vizualizează">
                                        <Eye className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button onClick={() => onToggleActive(user.id, user.is_active)} className="p-2 hover:bg-amber-100 rounded-lg transition-colors" title={user.is_active ? 'Dezactivează' : 'Activează'}>
                                        {user.is_active ? <UserX className="w-4 h-4 text-amber-600" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
                                    </button>
                                    <button onClick={() => onResetPin(user.id)} className="p-2 hover:bg-violet-100 rounded-lg transition-colors" title="Resetează PIN">
                                        <Key className="w-4 h-4 text-violet-600" />
                                    </button>
                                    <button onClick={() => onEdit(user)} className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Editează">
                                        <Edit2 className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button onClick={() => onDelete(user.id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors" title="Șterge">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function UsersGrid({ users, onToggleActive, onDelete, onEdit, onResetPin, onView }) {
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {users.map((user) => (
                <div key={user.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-xl transition-all duration-300 group cursor-pointer" onClick={() => onView(user)}>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            {user.avatar_path ? (
                                <img
                                    src={`${apiBase}${user.avatar_path}`}
                                    style={{ objectPosition: 'top' }}
                                    alt=""
                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-lg"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                />
                            ) : null}
                            <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white ${user.avatar_path ? 'hidden' : 'flex'}`}>
                                {(user.last_name?.charAt(0) || '') + (user.first_name?.charAt(0) || '')}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{user.last_name} {user.first_name}</h3>
                                <p className="text-xs font-mono text-slate-400">{user.employee_code}</p>
                            </div>
                        </div>
                        {user.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                Activ
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                Inactiv
                            </span>
                        )}
                    </div>

                    <div className="space-y-2 mb-4" onClick={e => e.stopPropagation()}>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100">
                            {user.role_name}
                        </span>
                        {user.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="truncate">{user.email}</span>
                            </div>
                        )}
                        {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="w-4 h-4 text-slate-400" />
                                {user.phone}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1 pt-4 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onView(user)} className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Vizualizează">
                            <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => onToggleActive(user.id, user.is_active)} className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors border border-slate-200">
                            {user.is_active ? 'Dezactivează' : 'Activează'}
                        </button>
                        <button onClick={() => onResetPin(user.id)} className="p-2 hover:bg-violet-100 rounded-lg transition-colors" title="Resetează PIN">
                            <Key className="w-4 h-4 text-violet-600" />
                        </button>
                        <button onClick={() => onEdit(user)} className="p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Editează">
                            <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => onDelete(user.id)} className="p-2 hover:bg-red-100 rounded-lg transition-colors" title="Șterge">
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${color} rounded-xl shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
            <p className="text-sm font-medium text-slate-600">{label}</p>
        </div>
    )
}
