import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../../store/adminStore'
import useViewPreferencesStore from '../../store/viewPreferencesStore'
import api from '../../lib/api'
import { Users, Plus, Search, Edit2, Trash2, Key, UserCheck, UserX, Loader2, Mail, Phone, Calendar, X, Save, Eye, Download, Upload, CreditCard, FileSpreadsheet, ScanLine, MapPin, Filter, XCircle, FileText, FileUp, FileDown } from 'lucide-react'
import ViewToggle from '../../components/ViewToggle'
import Pagination from '../../components/Pagination'
import AvatarCropModal from '../../components/AvatarCropModal'
import EmployeeDetailView from '../../components/EmployeeDetailView'

import { useUIStore } from '../../store/uiStore'

const PAGE_ID = 'admin-employees'
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
    password: '',
    confirm_password: '',
    address: '',
    is_active: true,
    hourly_rate: '',
}

export default function EmployeesManagement() {
    const navigate = useNavigate()
    const { id } = useParams()
    const { t } = useTranslation()
    const { showDialog, showToast, openDialog } = useUIStore()
    const [users, setUsers] = useState([])
    const [totalUsers, setTotalUsers] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('true')
    const [stats, setStats] = useState(null)
    const [roles, setRoles] = useState([])
    const token = useAdminStore((state) => state.token)
    
    // Detail view state
    const [detailUser, setDetailUser] = useState(null)
    
    // Bulk Select states
    const [selectedUserIds, setSelectedUserIds] = useState([])

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
    const [scannedImageBlob, setScannedImageBlob] = useState(null)
    const [avatarCropImage, setAvatarCropImage] = useState(null)
    const [importing, setImporting] = useState(false)
    const [deleteModalData, setDeleteModalData] = useState(null)
    
    // Site Assignment states
    const [sites, setSites] = useState([])
    const [showAssignSiteModal, setShowAssignSiteModal] = useState(false)
    const [assignTargetUserId, setAssignTargetUserId] = useState(null)
    const [assignSiteId, setAssignSiteId] = useState('')
    const [assigningSite, setAssigningSite] = useState(false)
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
        fetchSites()
    }, [search, roleFilter, statusFilter, preferences.currentPage, preferences.pageSize])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const params = { search, page: preferences.currentPage, page_size: preferences.pageSize }
            if (roleFilter) params.role_id = roleFilter
            if (statusFilter !== '') params.is_active = statusFilter === 'true'
            const response = await api.get('/admin/users/', { params })
            // Show ONLY non-admin employees on this page
            const ADMIN_ROLE_NAMES = ['Administrator', 'Super Administrator', 'ADMIN']
            const filtered = (response.data.users || []).filter(u =>
                !(u.employee_code === 'ADMIN' ||
                  (u.last_name === 'Admin' && u.first_name === 'User') ||
                  ADMIN_ROLE_NAMES.includes(u.role_name))
            )
            setUsers(filtered)
            setTotalUsers(filtered.length)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/users/stats/summary')
            setStats(res.data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    // Sync detailUser with URL id
    useEffect(() => {
        if (id && users.length > 0) {
            const user = users.find(u => u.id === id)
            if (user) {
                setDetailUser(user)
            } else {
                // If ID is in URL but user not in current page, maybe fetch specifically?
                // For now, if we can't find it locally, we clear it or just let it be.
                // Ideally, we'd fetch the specific user.
                api.get(`/admin/users/${id}`).then(res => setDetailUser(res.data)).catch(console.error)
            }
        } else if (!id) {
            setDetailUser(null)
        }
    }, [id, users])

    const fetchRoles = async () => {
        try {
            const response = await api.get('/admin/roles/')
            const fetchedRoles = response.data || []
            setRoles(fetchedRoles)
        } catch (error) {
            console.error('Error fetching roles:', error)
        }
    }

    const fetchSites = async () => {
        try {
            const response = await api.get('/admin/sites/', { params: { page_size: 1000 } })
            setSites(response.data.sites || [])
        } catch (error) {
            console.error('Error fetching sites:', error)
        }
    }

    const handleAssignSiteClick = (user) => {
        setAssignTargetUserId(user.id)
        setAssignSiteId(user.site_id || '')
        setShowAssignSiteModal(true)
    }

    const handleSaveSiteAssignment = async () => {
        try {
            setAssigningSite(true)
            await api.put(`/admin/users/${assignTargetUserId}`, { site_id: assignSiteId })
            showToast('Șantier atașat cu succes', 'success')
            setShowAssignSiteModal(false)
            fetchUsers()
        } catch (error) {
            showToast(error.response?.data?.detail || 'Eroare la atașarea șantierului', 'error')
        } finally {
            setAssigningSite(false)
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
            password: '',
            confirm_password: '',
            address: user.address || '',
            is_active: user.is_active,
            hourly_rate: user.hourly_rate != null ? String(user.hourly_rate) : '',
        })
        setIdCardFile(null)
        setIdCardPreview(null)
        setShowEditModal(true)
    }

    const handleSaveUser = async () => {
        if (!formData.last_name.trim()) {
            showToast(t('users.errors.last_name_required'), 'error')
            return
        }
        if (!formData.first_name.trim()) {
            showToast(t('users.errors.first_name_required'), 'error')
            return
        }
        if (!editingUser && !formData.employee_code.trim()) {
            showToast(t('users.errors.code_required'), 'error')
            return
        }
        if (!editingUser && !formData.pin) {
            showToast(t('users.errors.pin_required'), 'error')
            return
        }

        if (formData.password && formData.password !== formData.confirm_password) {
            showToast('Parolele nu coincid.', 'error')
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
                if (formData.password) updatePayload.password = formData.password
                if (formData.address !== (editingUser.address || '')) updatePayload.address = formData.address || null
                // hourly_rate: always send if present (0 is valid)
                const hrVal = formData.hourly_rate !== '' ? parseFloat(formData.hourly_rate) : null
                if (hrVal !== (editingUser.hourly_rate ?? null)) updatePayload.hourly_rate = hrVal
                if (formData.avatar_path !== (editingUser.avatar_path || '')) updatePayload.avatar_path = formData.avatar_path || null

                const resp = await api.put(`/admin/users/${editingUser.id}`, updatePayload)
                savedUser = resp.data
            } else {
                // Clean empty strings to null for optional fields
                const cleanData = { ...formData }
                const optionalFields = ['birth_date', 'cnp', 'birth_place', 'id_card_series', 'phone', 'email', 'address', 'avatar_path']
                optionalFields.forEach(f => { if (cleanData[f] === '') cleanData[f] = null })
                const resp = await api.post('/admin/users/', cleanData)
                savedUser = resp.data
            }

            // Upload ID card if selected
            if (idCardFile && savedUser?.id) {
                try {
                    // Determine the image blob to use
                    let imgBlob = scannedImageBlob
                    if (!imgBlob && idCardFile.type === 'application/pdf') {
                        const { extractTextFromImageOrPdf } = await import('../../lib/pdfOcr')
                        const result = await extractTextFromImageOrPdf(idCardFile)
                        imgBlob = result.imageBlob
                    }
                    const fileToUpload = imgBlob || idCardFile

                    // Upload ID card
                    const fd = new FormData()
                    fd.append('file', fileToUpload, imgBlob ? 'id_card_rendered.jpg' : idCardFile.name)
                    await api.post(`/admin/users/${savedUser.id}/upload-id-card`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    })

                    // CLIENT-SIDE face crop & upload as avatar
                    try {
                        const { cropFaceFromIdCard } = await import('../../lib/pdfOcr')
                        const faceBlob = await cropFaceFromIdCard(fileToUpload)
                        const avatarFd = new FormData()
                        avatarFd.append('file', faceBlob, 'avatar_face.jpg')
                        await api.post(`/admin/users/${savedUser.id}/upload-avatar`, avatarFd, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        })
                        console.log('[AVATAR] Face cropped & uploaded client-side!')
                    } catch (faceErr) {
                        console.error('[AVATAR] Client face crop failed:', faceErr)
                    }
                } catch (e) {
                    console.error('Failed to upload ID card:', e)
                }
            }

            setShowEditModal(false)
            fetchUsers()
            fetchStats()
            showToast(t('users.success.saved'), 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || t('users.errors.save_failed'), 'error')
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

    const handleDelete = (userId) => {
        const user = users.find(u => u.id === userId)
        if (user) setDeleteModalData(user)
    }

    const executeDelete = async (hardDelete) => {
        if (!deleteModalData) return
        try {
            await api.delete(`/admin/users/${deleteModalData.id}`, { params: { hard_delete: hardDelete } })
            setDeleteModalData(null)
            fetchUsers()
            fetchStats()
            showToast(hardDelete ? t('users.success.deleted') : t('users.success.archived'), 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || t('users.errors.delete_failed'), 'error')
            console.error('Error deleting user:', error)
        }
    }

    const handleRestore = async (userId) => {
        try {
            await api.put(`/admin/users/${userId}`, { is_active: true })
            fetchUsers()
            fetchStats()
            showToast(t('users.success.restored'), 'success')
        } catch (error) {
            console.error('Error restoring user:', error)
            showToast(t('users.errors.restore_failed'), 'error')
        }
    }

    const handleResetPin = (userId) => {
        setPinUserId(userId)
        setNewPin('')
        setShowPinModal(true)
    }

    const handleToggleSelectAll = (e) => {
        if (e.target.checked) setSelectedUserIds(users.map(u => u.id))
        else setSelectedUserIds([])
    }

    const handleToggleSelect = (userId) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
    }

    const handleBulkDelete = () => {
        if (selectedUserIds.length === 0) return
        showDialog({
            title: t('users.bulk_delete.title'),
            message: t('users.bulk_delete.message', { count: selectedUserIds.length }),
            type: 'danger',
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await Promise.all(selectedUserIds.map(id => api.delete(`/admin/users/${id}`)))
                    setSelectedUserIds([])
                    fetchUsers()
                    fetchStats()
                    showToast(t('users.success.bulk_deleted'), 'success')
                } catch (error) {
                    showToast(t('users.errors.bulk_delete_failed'), 'error')
                }
            }
        })
    }

    const handleSavePin = async () => {
        if (!newPin || newPin.length < 4) {
            showToast(t('users.errors.pin_length'), 'error')
            return
        }
        try {
            setSaving(true)
            await api.post(`/admin/users/${pinUserId}/reset-pin`, { new_pin: newPin })
            setShowPinModal(false)
            showToast(t('users.success.pin_reset'), 'success')
        } catch (error) {
            showToast(error.response?.data?.detail || t('users.errors.pin_reset_failed'), 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleViewUser = (user) => {
        navigate(`/admin/employees/${user.id}`)
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
            showToast(t('users.errors.select_id_card'), 'error')
            return
        }
        try {
            setOcrLoading(true)
            
            // Dynamic import
            const { extractTextFromImageOrPdf } = await import('../../lib/pdfOcr')
            
            // Client-side text extraction (handles images and PDF)
            const { text: extractedText, imageBlob } = await extractTextFromImageOrPdf(idCardFile, (stage) => {
                // optional: use progress in UI, e.g., showToast(`OCR: ${stage}`, 'info')
            })
            setScannedImageBlob(imageBlob)

            const fd = new FormData()
            fd.append('file', imageBlob, 'id_card_rendered.jpg')
            fd.append('raw_text', extractedText) // send the extracted text

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
                    avatar_path: ocr.avatar_path || prev.avatar_path
                }))
                showToast(t('users.success.ocr_extracted'), 'success')
            } else {
                showToast(ocr.message, 'error')
            }
        } catch (error) {
            showToast(t('users.errors.ocr_failed') + (error.response?.data?.detail || error.message), 'error')
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
            openDialog({ type: 'danger', title: t('common.export_error'), message: t('common.error_message') + (error.response?.data?.detail || error.message), confirmText: 'OK', cancelText: null })
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
            let msg = `${result.message}`
            if (result.errors?.length) {
                msg += `\n\n${t('common.errors')}:\n${result.errors.join('\n')}`
            }
            openDialog({ type: 'info', title: t('common.import_finished'), message: msg, confirmText: 'OK', cancelText: null })
            fetchUsers()
            fetchStats()
        } catch (error) {
            openDialog({ type: 'danger', title: t('common.import_error'), message: t('common.error_message') + (error.response?.data?.detail || error.message), confirmText: 'OK', cancelText: null })
        } finally {
            setImporting(false)
            if (importInputRef.current) importInputRef.current.value = ''
        }
    }

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Users className="w-5 h-5" />
                        </div>
                        Gestionare Angajați
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Muncitori, șoferi și personal de câmp</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-3xl">
                {!detailUser && (
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative group flex items-center w-full sm:w-auto">
                            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                                placeholder={t('users.search_placeholder')}
                                className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                            {search && (
                                <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                    <span className="text-[10px] font-bold text-white">
                                        {users.length}/{totalUsers || 0}
                                    </span>
                                    <button 
                                        onClick={() => { setSearch(''); setCurrentPage(PAGE_ID, 1) }}
                                        className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5"
                                    >
                                        <X className="w-3 h-3 text-white/80 hover:text-white" />
                                    </button>
                                </div>
                            )}
                        </div>
                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                        {!detailUser && (
                            <>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                                    className="h-10 pl-4 pr-8 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                                >
                                    <option value="true">{t('users.active_tab')}</option>
                                    <option value="false">{t('users.archive_tab')}</option>
                                    <option value="">{t('common.all') || 'Toate'}</option>
                                </select>

                                <select
                                    value={roleFilter}
                                    onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                                    className="h-10 pl-4 pr-8 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                                >
                                    <option value="">Toate Rolurile</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>

                                <ViewToggle
                                    viewMode={preferences.viewMode}
                                    onViewModeChange={(mode) => setViewMode(PAGE_ID, mode)}
                                />
                            </>
                        )}

                        {/* Actions */}
                        <input type="file" ref={importInputRef} accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
                        
                        <button 
                            onClick={handleExportExcel} 
                            className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                            title="Exportă"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span className="hidden sm:inline">Export Excel</span>
                        </button>

                        {!detailUser && selectedUserIds.length > 0 && (
                            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap">
                                <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">{t('common.delete')} ({selectedUserIds.length})</span>
                            </button>
                        )}

                        {!detailUser && (
                            <button 
                                onClick={handleAddUser} 
                                className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" /> {t('common.add')}
                            </button>
                        )}
                    </div>
                </div>
                )}

                <div className="bg-slate-50/30 dark:bg-slate-900/50 flex-1 relative">
                    {detailUser ? (
                        <EmployeeDetailView user={detailUser} onBack={() => navigate('/admin/employees')} onExport={handleExportExcel} />
                    ) : loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : preferences.viewMode === 'list' ? (
                        <UsersTable users={users} onToggleActive={handleToggleActive} onDelete={handleDelete} onEdit={handleEditUser} onResetPin={handleResetPin} onView={handleViewUser} onAssignSite={handleAssignSiteClick} selectedUserIds={selectedUserIds} onToggleSelect={handleToggleSelect} onToggleSelectAll={handleToggleSelectAll} />
                    ) : (
                        <UsersGrid users={users} onToggleActive={handleToggleActive} onDelete={handleDelete} onEdit={handleEditUser} onResetPin={handleResetPin} onView={handleViewUser} selectedUserIds={selectedUserIds} onToggleSelect={handleToggleSelect} />
                    )}

                    {!loading && !detailUser && users.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">{t('users.no_users')}</p>
                            <p className="text-sm text-slate-500 mt-1">{t('users.no_users_hint')}</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!loading && !detailUser && users.length > 0 && (
                    <Pagination
                        currentPage={preferences.currentPage}
                        pageSize={preferences.pageSize}
                        totalItems={totalUsers}
                        onPageChange={(page) => setCurrentPage(PAGE_ID, page)}
                        onPageSizeChange={(size) => setPageSize(PAGE_ID, size)}
                    />
                )}
            </div>

            {/* =================== ADD/EDIT USER MODAL =================== */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload-input')?.click()}>
                                    {editingUser?.avatar_path ? (
                                        <img
                                            src={`${API_BASE}${editingUser.avatar_path}`}
                                            style={{ objectPosition: 'top' }}
                                            alt=""
                                            className="w-10 h-12 rounded-lg object-cover object-[center_20%] ring-2 ring-slate-200 shrink-0"
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                        />
                                    ) : null}
                                    <div className={`w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm ${editingUser?.avatar_path ? 'hidden' : 'flex'}`}>
                                        {editingUser ? (editingUser.last_name?.charAt(0) || '') + (editingUser.first_name?.charAt(0) || '') : '+'}
                                    </div>
                                    {editingUser && (
                                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-[10px]">📷</span>
                                        </div>
                                    )}
                                    <input
                                        id="avatar-upload-input"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files[0]
                                            if (!f || !editingUser) return
                                            setAvatarCropImage(f)
                                            e.target.value = ''
                                        }}
                                    />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {editingUser ? t('users_modal.edit_employee') : t('users_modal.add_employee')}
                                    </h2>
                                    {editingUser && (
                                        <p className="text-xs text-slate-500">{editingUser.full_name} • {editingUser.employee_code}</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* ID Card */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5" />
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
                                                <img src={idCardPreview} alt="CI Preview" className="w-full h-40 object-contain rounded-full border border-slate-200 bg-white" />
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
                                                className="w-full h-20 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
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
                                            className="px-4 h-10 bg-violet-500 hover:bg-violet-600 text-white rounded-full text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-sm"
                                        >
                                            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                            Scanează CI
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Cod Angajat *</label>
                                    <input
                                        type="text"
                                        value={formData.employee_code}
                                        onChange={e => setFormData({ ...formData, employee_code: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="ex: EMP001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Nume *</label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="ex: Popescu"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Prenume *</label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="ex: Ion"
                                    />
                                </div>

                                {!editingUser && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">PIN *</label>
                                        <input
                                            type="password"
                                            value={formData.pin}
                                            onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            placeholder="4-6 cifre"
                                            maxLength={6}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Rol *</label>
                                    <select
                                        value={formData.role_id}
                                        onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                    >
                                        <option value="">Selectează rol...</option>
                                        {roles.filter(r => !['Administrator', 'Super Administrator', 'ADMIN'].includes(r.name)).map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {roles.find(r => r.id === formData.role_id)?.name === 'Logistica' && (
                                    <div className="md:col-span-2 pt-2 pb-1">
                                        <label className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.handle_materials || false}
                                                onChange={e => setFormData({ ...formData, handle_materials: e.target.checked })}
                                                className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 shadow-sm"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-blue-900">Gestionează Necesar Materiale</span>
                                                <span className="text-xs text-blue-700/70">Primește notificări și are acces la aprobarea materialelor</span>
                                            </div>
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">CNP</label>
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
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="13 cifre"
                                        maxLength={13}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Serie Buletin</label>
                                    <input
                                        type="text"
                                        value={formData.id_card_series}
                                        onChange={e => setFormData({ ...formData, id_card_series: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="ex: RD 123456"
                                        maxLength={20}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Data Nașterii</label>
                                    <input
                                        type="date"
                                        value={formData.birth_date}
                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Loc Naștere</label>
                                    <input
                                        type="text"
                                        value={formData.birth_place}
                                        onChange={e => setFormData({ ...formData, birth_place: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="ex: București"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Telefon</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="07xx xxx xxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="email@example.com"
                                    />
                                </div>

                                {roles.find(r => r.id === formData.role_id)?.name === 'Logistica' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                                Parolă Web {editingUser ? <span className="normal-case font-normal">(lasă gol pentru a o păstra)</span> : '*'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.password || ''}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                placeholder={editingUser ? '••••••••' : 'Parolă de conectare laptop'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Confirmă Parola</label>
                                            <input
                                                type="text"
                                                value={formData.confirm_password || ''}
                                                onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                                placeholder="Repetă parola"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Domiciliu</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="Strada, Număr, Oraș"
                                    />
                                </div>

                                {/* Hourly Rate */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                        Tarif Orar (Lei/h) <span className="normal-case font-normal">confidential</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={formData.hourly_rate}
                                        onChange={e => setFormData({ ...formData, hourly_rate: e.target.value })}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        placeholder="ex: 25.00"
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

                                {/* Contract */}
                                {editingUser && (
                                    <div className="md:col-span-2">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5" />
                                                Contract de Muncă
                                            </h3>
                                            {editingUser.contract_path ? (
                                                <div className="flex items-center gap-3">
                                                    <a
                                                        href={editingUser.contract_path.startsWith('http') ? editingUser.contract_path : `${API_BASE}${editingUser.contract_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-300 hover:border-blue-400 text-sm font-medium transition-colors"
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
                                                            openDialog({ type: 'info', title: 'Succes', message: 'Contract încărcat cu succes!', confirmText: 'OK', cancelText: null })
                                                        } catch (err) { openDialog({ type: 'danger', title: 'Eroare', message: 'Eroare: ' + (err.response?.data?.detail || err.message), confirmText: 'OK', cancelText: null }) }
                                                        finally { setUploadingContract(false); if (contractInputRef.current) contractInputRef.current.value = '' }
                                                    }} className="hidden" />
                                                    <button
                                                        onClick={() => contractInputRef.current?.click()}
                                                        disabled={uploadingContract}
                                                        className="flex items-center gap-2 px-4 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-bold transition-colors disabled:opacity-50"
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
                                                            openDialog({ type: 'info', title: 'Succes', message: 'Contract încărcat cu succes!', confirmText: 'OK', cancelText: null })
                                                        } catch (err) { openDialog({ type: 'danger', title: 'Eroare', message: 'Eroare: ' + (err.response?.data?.detail || err.message), confirmText: 'OK', cancelText: null }) }
                                                        finally { setUploadingContract(false); if (contractInputRef.current) contractInputRef.current.value = '' }
                                                    }} className="hidden" />
                                                    <button
                                                        onClick={() => contractInputRef.current?.click()}
                                                        disabled={uploadingContract}
                                                        className="w-full h-14 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
                                                    >
                                                        {uploadingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                                                        <span className="text-sm font-medium">Încarcă Contract (PDF, JPG, PNG)</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-5 h-10 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors bg-slate-50 dark:bg-slate-800/50"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleSaveUser}
                                disabled={saving}
                                className="px-5 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editingUser ? t('users_modal.save') : t('users_modal.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* =================== RESET PIN MODAL =================== */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Resetare PIN</h2>
                            <button onClick={() => setShowPinModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">PIN Nou (4-6 cifre)</label>
                            <input
                                type="password"
                                value={newPin}
                                onChange={e => setNewPin(e.target.value)}
                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm text-center text-2xl tracking-widest"
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

            {/* =================== AVATAR CROP MODAL =================== */}
            <AvatarCropModal
                imageFile={avatarCropImage}
                onCancel={() => setAvatarCropImage(null)}
                onSave={async (blob) => {
                    if (!editingUser) return
                    const fd = new FormData()
                    fd.append('file', blob, 'avatar.jpg')
                    try {
                        const resp = await api.post(`/admin/users/${editingUser.id}/upload-avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                        setEditingUser({ ...editingUser, avatar_path: resp.data.avatar_path })
                        fetchUsers()
                        showToast('Avatar actualizat', 'success')
                    } catch (err) { console.error('Avatar upload error:', err); showToast('Eroare la actualizare avatar', 'error') }
                    setAvatarCropImage(null)
                }}
            />

            {/* =================== ASSIGN SITE MODAL =================== */}
            {showAssignSiteModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-orange-500" />
                                Atașează Șantier
                            </h2>
                            <button onClick={() => setShowAssignSiteModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Selectează Șantierul</label>
                            <select
                                value={assignSiteId}
                                onChange={e => setAssignSiteId(e.target.value)}
                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                            >
                                <option value="">Niciun șantier (Anulează atașarea)</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                            <p className="mt-3 text-xs text-slate-500">
                                Angajatul va fi transferat direct pe acest șantier, ocolind necesitatea asocierii într-o Echipă dedicată.
                            </p>
                        </div>
                        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button onClick={() => setShowAssignSiteModal(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                                Anulează
                            </button>
                            <button
                                onClick={handleSaveSiteAssignment}
                                disabled={assigningSite}
                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {assigningSite ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Salvează
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================== DELETE / ARCHIVE MODAL =================== */}
            {deleteModalData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteModalData(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <Trash2 className="w-6 h-6 text-red-500" />
                                Ștergere Angajat: {deleteModalData.last_name} {deleteModalData.first_name}
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600">
                                Ai ales să elimini acest angajat din lista curentă. Te rugăm să alegi cum dorești să fie procesat:
                            </p>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => executeDelete(false)}>
                                <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-1">
                                    <UserX className="w-5 h-5 text-blue-700" />
                                    Mută în Arhivă (Recomandat)
                                </h3>
                                <p className="text-sm text-blue-800/80">
                                    Păstrează tot istoricul și rapoartele de pontaj. Angajatul nu va mai avea acces, dar informațiile lui rămân în arhivă pentru statiscă.
                                </p>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => executeDelete(true)}>
                                <h3 className="font-bold text-red-900 flex items-center gap-2 mb-1">
                                    <Trash2 className="w-5 h-5 text-red-700" />
                                    Șterge Definitiv
                                </h3>
                                <p className="text-sm text-red-800/80">
                                    <strong>Atenție!</strong> Toate pontajele și rapoartele asociate acestui angajat vor fi distruse. Folosește această opțiune doar dacă angajatul a fost creat dintr-o greșeală.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setDeleteModalData(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                                Anulează
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

function UsersTable({ users, onToggleActive, onDelete, onEdit, onResetPin, onView, onAssignSite, selectedUserIds, onToggleSelect, onToggleSelectAll }) {
    const { t } = useTranslation()
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    const allSelected = users.length > 0 && selectedUserIds.length === users.length
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3 text-center w-12 border-r border-slate-200 dark:border-slate-700">
                            <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        </th>
                        <th className="px-4 py-3 text-left">{t('users.employee_col')}</th>
                        <th className="px-4 py-3 text-left">{t('common.phone')}</th>
                        <th className="px-4 py-3 text-left">{t('common.role')}</th>
                        <th className="px-4 py-3 text-left">{t('common.status')}</th>
                        <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((user) => (
                        <tr key={user.id} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedUserIds?.includes(user.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`} onClick={() => onView(user)}>
                            <td className="px-4 py-3 text-center border-r border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedUserIds?.includes(user.id) || false} onChange={() => onToggleSelect(user.id)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {user.avatar_path ? (
                                        <img src={`${apiBase}${user.avatar_path}`} alt="" className="w-9 h-11 rounded-lg object-cover object-[center_20%] ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 relative z-0 hover:z-50 transition-transform duration-200 hover:scale-[1.8] hover:shadow-2xl" onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }} />
                                    ) : null}
                                    <div className={`w-9 h-11 rounded-lg bg-blue-100 dark:bg-blue-900/30 items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs ring-1 ring-blue-200 dark:ring-blue-800 shrink-0 ${user.avatar_path ? 'hidden' : 'flex'}`}>
                                        {(user.last_name?.charAt(0) || '') + (user.first_name?.charAt(0) || '')}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">{user.last_name} {user.first_name}</p>
                                        <p className="text-[11px] font-mono text-slate-400">{user.employee_code}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                <div className="space-y-0.5">
                                    {user.email && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="truncate max-w-[150px]">{user.email}</span>
                                        </div>
                                    )}
                                    {user.phone && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            {user.phone}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex flex-col items-start gap-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {user.role_name}
                                    </span>
                                    {user.site_name && (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                            <MapPin className="w-3 h-3" />
                                            <span className="truncate max-w-[120px]">{user.site_name}</span>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                {user.is_active ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                        {t('common.active')}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                        {t('common.inactive')}
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1 transition-opacity">
                                    <button onClick={() => onView(user)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" title="Vizualizează">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onAssignSite(user)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" title="Atașează Șantier">
                                        <MapPin className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onToggleActive(user.id, user.is_active)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" title={user.is_active ? t('users.deactivate') : t('users.activate')}>
                                        {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => onResetPin(user.id)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" title="Resetează PIN">
                                        <Key className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onEdit(user)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" title="Editează">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onDelete(user.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors text-slate-400 hover:text-red-600 dark:hover:text-red-400" title="Șterge">
                                        <Trash2 className="w-4 h-4" />
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

function UsersGrid({ users, onToggleActive, onDelete, onEdit, onResetPin, onView, selectedUserIds, onToggleSelect }) {
    const { t } = useTranslation()
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {users.map((user) => (
                <div key={user.id} className={`bg-white dark:bg-slate-800 border ${selectedUserIds?.includes(user.id) ? 'border-blue-400 ring-1 ring-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl p-5 hover:border-blue-300 hover:shadow-xl transition-all duration-300 group cursor-pointer relative`} onClick={() => onView(user)}>
                    <div className="absolute top-4 right-4 z-10" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedUserIds?.includes(user.id) || false} onChange={() => onToggleSelect(user.id)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer drop-shadow-sm" />
                    </div>
                    <div className="flex items-start justify-between mb-4 mt-2">
                        <div className="flex items-center gap-3 pr-8">
                            {/* Avatar */}
                            {user.avatar_path ? (
                                <img
                                    src={`${apiBase}${user.avatar_path}`}
                                    style={{ objectPosition: 'top' }}
                                    alt=""
                                    className="w-12 h-16 rounded-lg object-cover object-[center_20%] ring-2 ring-white shadow-lg shrink-0 relative z-0 hover:z-50 transition-transform duration-200 hover:scale-[1.8] hover:shadow-2xl"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                />
                            ) : null}
                            <div className={`w-12 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white shrink-0 ${user.avatar_path ? 'hidden' : 'flex'}`}>
                                {(user.last_name?.charAt(0) || '') + (user.first_name?.charAt(0) || '')}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{user.last_name} {user.first_name}</h3>
                                <p className="text-xs font-mono text-slate-400">{user.employee_code}</p>
                            </div>
                        </div>
                        {user.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                {t('common.active')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                {t('common.inactive')}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2 mb-4" onClick={e => e.stopPropagation()}>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100">
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
                        <button onClick={() => onView(user)} className="p-2 hover:bg-blue-100 rounded-full transition-colors" title="Vizualizează">
                            <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => onToggleActive(user.id, user.is_active)} className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-full text-sm font-medium transition-colors border border-slate-200">
                            {user.is_active ? t('users.deactivate') : t('users.activate')}
                        </button>
                        <button onClick={() => onResetPin(user.id)} className="p-2 hover:bg-violet-100 rounded-full transition-colors" title="Resetează PIN">
                            <Key className="w-4 h-4 text-violet-600" />
                        </button>
                        <button onClick={() => onEdit(user)} className="p-2 hover:bg-blue-100 rounded-full transition-colors" title="Editează">
                            <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => onDelete(user.id)} className="p-2 hover:bg-red-100 rounded-full transition-colors" title="Șterge">
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, onClick, active }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md ${active ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg transform -translate-y-1' : ''} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-4 bg-gradient-to-br ${color} rounded-2xl shadow-inner`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{value}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{label}</p>
                </div>
            </div>
        </div>
    )
}
