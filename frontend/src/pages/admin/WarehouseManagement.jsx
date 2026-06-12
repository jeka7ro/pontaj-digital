import { useState, useEffect, useRef } from 'react'
import { Plus, Package, Truck, Search, Loader2, ArrowUpRight, ArrowDownRight, Edit2, Trash2, FileText, Download, ChevronLeft, ChevronRight, Paperclip, History, X, FileSpreadsheet, Save, ChevronDown, MapPin, QrCode, ScanLine } from 'lucide-react'
import api from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../store/uiStore'
import * as XLSX from 'xlsx'
import Pagination from '../../components/Pagination'
import QRPrintModal from '../../components/QRPrintModal'
import QRScannerModal from '../../components/QRScannerModal'

const MultiSelectDropdown = ({ options, selectedIds, onChange, placeholder, searchPlaceholder, displayFn }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const wrapperRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filtered = options.filter(o => displayFn(o).toLowerCase().includes(search.toLowerCase()))
    const allChecked = filtered.length > 0 && filtered.every(o => selectedIds.includes(o.id))

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm flex items-center justify-between">
                <span className="truncate">{selectedIds.length > 0 ? `${selectedIds.length} selectați` : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text" autoFocus 
                                value={search} onChange={e => setSearch(e.target.value)} 
                                placeholder={searchPlaceholder}
                                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer text-sm font-semibold border-b border-slate-100 dark:border-slate-800 mb-1">
                            <input type="checkbox" checked={allChecked} onChange={() => {
                                if (allChecked) onChange(selectedIds.filter(id => !filtered.find(o => o.id === id)))
                                else onChange([...new Set([...selectedIds, ...filtered.map(o => o.id)])])
                            }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            Selectează Toți
                        </label>
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-slate-400">Nu s-au găsit rezultate.</div>
                        ) : filtered.map(o => (
                            <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer text-sm transition-colors">
                                <input type="checkbox" checked={selectedIds.includes(o.id)} onChange={(e) => {
                                    if (e.target.checked) onChange([...selectedIds, o.id])
                                    else onChange(selectedIds.filter(id => id !== o.id))
                                }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                {displayFn(o)}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

const SingleSelectDropdown = ({ options, selectedId, onChange, placeholder, searchPlaceholder, displayFn }) => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const wrapperRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Reset search when closed
    useEffect(() => {
        if (!isOpen) setSearch('')
    }, [isOpen])

    const filtered = options.filter(o => displayFn(o).toLowerCase().includes(search.toLowerCase()))
    const selectedOption = options.find(o => o.id === selectedId)

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm flex items-center justify-between">
                <span className="truncate">{selectedOption ? displayFn(selectedOption) : <span className="text-slate-400">{placeholder}</span>}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text" autoFocus 
                                value={search} onChange={e => setSearch(e.target.value)} 
                                placeholder={searchPlaceholder}
                                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                        <div 
                            onClick={() => { onChange(''); setIsOpen(false) }} 
                            className={`flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer text-sm mb-1 ${!selectedId ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : ''}`}
                        >
                            <span className="truncate">{placeholder}</span>
                        </div>
                        {filtered.map(o => (
                            <div key={o.id} onClick={() => { onChange(o.id); setIsOpen(false) }} className={`flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full cursor-pointer text-sm ${selectedId === o.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium' : ''}`}>
                                <span className="truncate">{displayFn(o)}</span>
                            </div>
                        ))}
                        {filtered.length === 0 && <div className="p-3 text-center text-xs text-slate-500">{t('warehouse.no_results')}</div>}
                    </div>
                </div>
            )}
        </div>
    )
}

const unitOptions = [
    { id: 'buc', name: 'buc (Bucăți)' },
    { id: 'L', name: 'L (Litri)' },
    { id: 'kg', name: 'kg (Kilograme)' },
    { id: 'm', name: 'm (Metri)' },
    { id: 'ml', name: 'ml (Metri liniari)' },
    { id: 'mp', name: 'mp (Metri pătrați)' },
    { id: 'rolă', name: 'rolă' },
    { id: 'set', name: 'set' },
    { id: 'cutie', name: 'cutie' },
]
const getCategories = (t) => [
    { id: 'TOATE', label: t('warehouse.all'), icon: Package },
    { id: 'SCULE', label: t('warehouse.tools'), icon: Package },
    { id: 'CONSUMABILE', label: t('warehouse.consumables'), icon: Package },
    { id: 'STRUCTURA', label: t('warehouse.structure'), icon: Package },
    { id: 'COMBUSTIBIL', label: t('warehouse.fuel'), icon: Truck },
]

export default function WarehouseManagement() {
    const { t } = useTranslation()
    const { showToast } = useUIStore()
    const [activeTab, setActiveTab] = useState('TOATE')
    const [allSites, setAllSites] = useState([])
    const [selectedSite, setSelectedSite] = useState('')
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [transactions, setTransactions] = useState([])
    const [historyItem, setHistoryItem] = useState(null)
    const [historySearch, setHistorySearch] = useState('')
    const [historyCurrentPage, setHistoryCurrentPage] = useState(1)
    const [historyItemsPerPage, setHistoryItemsPerPage] = useState(25)
    const [selectedTxIds, setSelectedTxIds] = useState([])
    const [editingTx, setEditingTx] = useState(null)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    
    // Pagination & Search for Items
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    // Data for dropdowns
    const [users, setUsers] = useState([])
    const [showAssignPanel, setShowAssignPanel] = useState(false)
    const [assignUserId, setAssignUserId] = useState('')
    const [assignSiteId, setAssignSiteId] = useState('')
    const [linkedRequest, setLinkedRequest] = useState(null)
    const [vehicles, setVehicles] = useState([])
    const [sites, setSites] = useState([])

    // Modals
    const [showItemModal, setShowItemModal] = useState(false)
    const [showTxModal, setShowTxModal] = useState(false)
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
    const [selectedItem, setSelectedItem] = useState(null)
    const [txType, setTxType] = useState('IN') // 'IN' or 'OUT'

    // QR Modals
    const [qrPrintModalItem, setQrPrintModalItem] = useState(null)
    const [isScannerOpen, setIsScannerOpen] = useState(false)

    // Form states
    const [itemForm, setItemForm] = useState({ name: '', unit: '', model: '', inventory_code: '', site_id: '' })
    const [txForm, setTxForm] = useState({ quantity: '', date: new Date().toISOString().split('T')[0], assigned_to_user_ids: [], assigned_to_vehicle_ids: [], site_id: '', notes: '', file: null })

    // Transactions History Modal
    const [showHistoryModal, setShowHistoryModal] = useState(false)

    // Returnări în așteptare confirmare admin
    const [pendingReturns, setPendingReturns] = useState([])
    const [confirmReturnModal, setConfirmReturnModal] = useState(null) // { item }
    const [confirmReturnLoading, setConfirmReturnLoading] = useState(false)

    // Tool Check-Out Modal
    const [toolModal, setToolModal] = useState({ isOpen: false, item: null, siteId: '', userId: '', date: new Date().toISOString().split('T')[0] })
    const [isSubmittingTool, setIsSubmittingTool] = useState(false)

    useEffect(() => {
        setCurrentPage(1)
        setSearchQuery('')
    }, [activeTab])

    useEffect(() => {
        fetchItems()
        fetchSites()
        fetchDropdownData()
        fetchPendingReturns()
    }, [activeTab, selectedSite])

    const fetchPendingReturns = async () => {
        try {
            const res = await api.get('/warehouse/pending-returns')
            setPendingReturns(res.data || [])
        } catch (e) { /* silent */ }
    }

    const confirmPendingReturn = async (itemId, condition) => {
        setConfirmReturnLoading(true)
        try {
            await api.post('/warehouse/confirm-return', { item_id: itemId, condition })
            showToast(
                condition === 'functional' ? 'Sculă primită — FUNCȚIONALĂ' :
                condition === 'defective' ? 'Sculă primită — DEFECTĂ' :
                'Sculă marcată ca PIERDUTĂ',
                condition === 'functional' ? 'success' : 'warning'
            )
            setConfirmReturnModal(null)
            fetchPendingReturns()
            fetchItems()
        } catch (e) {
            showToast('Eroare la confirmare', 'error')
        } finally {
            setConfirmReturnLoading(false)
        }
    }

    const fetchItems = async () => {
        try {
            setLoading(true)
            const res = await api.get('/warehouse/items', { params: { category: activeTab !== 'TOATE' ? activeTab : undefined, site_id: selectedSite || undefined } })
            setItems(res.data)
        } catch (error) {
            showToast('Eroare la încărcarea stocurilor', 'error')
        } finally {
            setLoading(false)
        }
    }

    const fetchSites = () => {
        api.get('/admin/sites/', { params: { page_size: 1000, status: 'active' } })
            .then(res => {
                const list = Array.isArray(res.data?.sites) ? res.data.sites : (Array.isArray(res.data) ? res.data : [])
                setAllSites(list)
                setSites(list)
            })
            .catch(err => console.error(err))
    }

    const fetchDropdownData = async () => {
        try {
            api.get('/admin/users/', { params: { page_size: 1000 } })
                .then(res => {
                    const list = Array.isArray(res.data?.users) ? res.data.users : (Array.isArray(res.data) ? res.data : [])
                    setUsers(list.filter(u => u.is_active !== false))
                }).catch(e => console.error('Failed to fetch users', e))
            
            api.get('/admin/vehicles', { params: { page_size: 1000 } })
                .then(res => {
                    const list = Array.isArray(res.data?.vehicles) ? res.data.vehicles : (Array.isArray(res.data) ? res.data : [])
                    setVehicles(list)
                }).catch(e => console.error('Failed to fetch vehicles', e))
        } catch (error) {
            console.error('Failed to init dropdown fetching', error)
        }
    }

    const fetchTransactions = async (itemId) => {
        try {
            const res = await api.get(`/warehouse/items/${itemId}/transactions`)
            setTransactions(res.data)
            setSelectedTxIds([])
        } catch (error) {
            showToast('Eroare la încărcarea istoricului', 'error')
        }
    }

    const handleToggleSelectTx = (id) => {
        setSelectedTxIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const handleToggleSelectAllTx = (txList) => {
        if (selectedTxIds.length === txList.length) {
            setSelectedTxIds([])
        } else {
            setSelectedTxIds(txList.map(t => t.id))
        }
    }

    const handleDeleteTx = (txId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Tranzacție',
            message: 'Sigur doriți să ștergeți tranzacția? Stocul va fi actualizat automat.',
            onConfirm: async () => {
                try {
                    await api.delete(`/warehouse/transactions/${txId}`)
                    showToast('Tranzacție ștearsă', 'success')
                    fetchTransactions(selectedItem.id)
                    fetchItems()
                    fetchSites()
                } catch (error) {
                    showToast('Eroare la ștergerea tranzacției', 'error')
                }
            }
        })
    }

    const handleBatchDeleteTx = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Multiplă',
            message: `Sigur doriți să ștergeți ${selectedTxIds.length} tranzacții? Stocul va fi actualizat automat.`,
            onConfirm: async () => {
                try {
                    for (const id of selectedTxIds) {
                        await api.delete(`/warehouse/transactions/${id}`)
                    }
                    showToast('Tranzacții șterse', 'success')
                    setSelectedTxIds([])
                    fetchTransactions(selectedItem.id)
                    fetchItems()
                    fetchSites()
                } catch (error) {
                    showToast('Eroare la ștergerea tranzacțiilor', 'error')
                }
            }
        })
    }

    const [isSubmittingItem, setIsSubmittingItem] = useState(false)

    const handleSaveItem = async (e) => {
        e.preventDefault()
        if (isSubmittingItem) return
        try {
            setIsSubmittingItem(true)
            const payload = { ...itemForm, category: activeTab }
            // Clean up empty strings for optional fields
            if (!payload.model) delete payload.model
            if (!payload.inventory_code) delete payload.inventory_code
            
            if (selectedItem) {
                await api.put(`/warehouse/items/${selectedItem.id}`, { name: itemForm.name, unit: itemForm.unit, model: itemForm.model, inventory_code: itemForm.inventory_code })
                showToast('Articol actualizat', 'success')
            } else {
                const res = await api.post('/warehouse/items', payload)
                const newItemId = res.data?.id
                
                if (itemForm.site_id && payload.inventory_code && newItemId) {
                    // Dacă e Sculă (are inventory_code) și utilizatorul are un șantier selectat, o trimitem automat pe acel șantier
                    await api.post(`/warehouse/items/${newItemId}/force-assign`, {
                        site_id: itemForm.site_id,
                        date: new Date().toISOString().split('T')[0]
                    })
                    showToast('Sculă creată și adăugată direct pe șantier', 'success')
                } else if (itemForm.site_id) {
                    // Pentru materiale de volum, resetăm filtrul pentru a i se permite să adauge tranzacția de intrare
                    if (selectedSite) setSelectedSite('')
                    showToast('Articol creat! Adaugă acum o tranzacție de Intrare pentru a adăuga stoc.', 'success')
                } else {
                    showToast('Articol creat', 'success')
                }
            }
            setShowItemModal(false)
            fetchItems()
            fetchSites()
        } catch (error) {
            showToast('Eroare la salvare', 'error')
        } finally {
            setIsSubmittingItem(false)
        }
    }

    const handleDeleteItem = (itemId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Ștergere Articol',
            message: 'Sigur dorești să ștergi acest articol? Tot istoricul va fi pierdut.',
            onConfirm: async () => {
                try {
                    await api.delete(`/warehouse/items/${itemId}`)
                    showToast('Articol șters', 'success')
                    fetchItems()
                    fetchSites()
                } catch (error) {
                    showToast('Eroare la ștergerea articolului', 'error')
                }
            }
        })
    }

    const handleCheckOut = async (e) => {
        e.preventDefault()
        if (isSubmittingTool || (!toolModal.siteId && !toolModal.userId)) return
        try {
            setIsSubmittingTool(true)
            await api.post(`/warehouse/items/${toolModal.item.id}/checkout`, {
                site_id: toolModal.siteId,
                user_id: toolModal.userId,
                date: toolModal.date
            })
            showToast('Sculă repartizată cu succes', 'success')
            setToolModal({ ...toolModal, isOpen: false })
            fetchItems()
            fetchSites()
        } catch (error) {
            showToast(error.response?.data?.detail || 'Eroare la repartizare', 'error')
        } finally {
            setIsSubmittingTool(false)
        }
    }

    const handleCheckIn = async (item) => {
        if (isSubmittingTool) return
        
        let msg = 'Sunteți sigur că ați primit scula înapoi?';
        if (item.current_site_name && item.current_holder_name) {
            msg = `Sunteți sigur că ați primit scula înapoi de la ${item.current_holder_name} (șantierul ${item.current_site_name})?`
        } else if (item.current_site_name) {
            msg = `Sunteți sigur că ați primit scula înapoi de pe șantierul ${item.current_site_name}?`
        } else if (item.current_holder_name) {
            msg = `Sunteți sigur că ați primit scula înapoi de la ${item.current_holder_name}?`
        }

        setConfirmModal({
            isOpen: true,
            title: 'Primire Sculă în Magazie',
            message: msg,
            onConfirm: async () => {
                try {
                    setIsSubmittingTool(true)
                    await api.post(`/warehouse/items/${item.id}/checkin`, {
                        date: new Date().toISOString().split('T')[0]
                    })
                    showToast('Sculă primită în magazie', 'success')
                    fetchItems()
                    fetchSites()
                } catch (error) {
                    showToast(error.response?.data?.detail || 'Eroare la primire', 'error')
                } finally {
                    setIsSubmittingTool(false)
                }
            }
        })
    }

    const handleToggleDefective = async (item, e) => {
        e.stopPropagation();
        try {
            await api.post(`/warehouse/items/${item.id}/toggle-defective`)
            showToast(item.is_defective ? 'Scula a fost marcată ca funcțională' : 'Scula a fost marcată ca defectă', 'success')
            fetchItems()
            fetchSites()
        } catch (error) {
            showToast('Eroare la actualizarea stării', 'error')
        }
    }

    const [isSubmittingTx, setIsSubmittingTx] = useState(false)

    const handleSaveTx = async (e) => {
        e.preventDefault()
        if (isSubmittingTx) return
        if (!txForm.quantity || Number(txForm.quantity) <= 0) {
            showToast('Introduceți o cantitate validă', 'error')
            return
        }

        try {
            setIsSubmittingTx(true)
            const formData = new FormData()
            if (!editingTx) {
                formData.append('item_id', selectedItem.id)
                formData.append('transaction_type', txType)
            }
            formData.append('quantity', Number(txForm.quantity))
            formData.append('date', txForm.date)
            
            if (editingTx) {
                if (txForm.assigned_to_user_ids[0]) formData.append('assigned_to_user_id', txForm.assigned_to_user_ids[0])
                if (txForm.assigned_to_vehicle_ids[0]) formData.append('assigned_to_vehicle_id', txForm.assigned_to_vehicle_ids[0])
                await api.put(`/warehouse/transactions/${editingTx.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                showToast('Tranzacție actualizată', 'success')
            } else {
                const uIds = txForm.assigned_to_user_ids.length > 0 ? txForm.assigned_to_user_ids : [null]
                const vIds = txForm.assigned_to_vehicle_ids.length > 0 ? txForm.assigned_to_vehicle_ids : [null]
                
                for (const uid of uIds) {
                    for (const vid of vIds) {
                        const fd = new FormData()
                        fd.append('item_id', selectedItem.id)
                        fd.append('transaction_type', txType)
                        fd.append('quantity', Number(txForm.quantity))
                        fd.append('date', txForm.date)
                        if (uid) fd.append('assigned_to_user_id', uid)
                        if (vid) fd.append('assigned_to_vehicle_id', vid)
                        if (txForm.site_id) fd.append('site_id', txForm.site_id)
                        if (txForm.notes) fd.append('notes', txForm.notes)
                        if (txForm.file) fd.append('file', txForm.file)

                        await api.post('/warehouse/transactions', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        })
                    }
                }
                showToast('Tranzacții salvate cu succes', 'success')
            }
            
            setShowTxModal(false)
            fetchItems()
            fetchSites()
            if (historyItem && historyItem.id === selectedItem.id) {
                fetchTransactions(selectedItem.id)
            }
        } catch (error) {
            showToast(error.response?.data?.detail || 'Eroare la salvare tranzacție', 'error')
        } finally {
            setIsSubmittingTx(false)
        }
    }

    const openTxModal = (item, type, existingTx = null) => {
        setSelectedItem(item)
        setTxType(type)
        if (existingTx) {
            setEditingTx(existingTx)
            setTxForm({
                quantity: existingTx.quantity,
                date: existingTx.date || new Date().toISOString().split('T')[0],
                assigned_to_user_ids: existingTx.assigned_to_user_id ? [existingTx.assigned_to_user_id] : [],
                assigned_to_vehicle_ids: existingTx.assigned_to_vehicle_id ? [existingTx.assigned_to_vehicle_id] : [],
                site_id: existingTx.site_id || '',
                notes: existingTx.notes || '',
                file: null
            })
        } else {
            setEditingTx(null)
            setTxForm({ quantity: '', date: new Date().toISOString().split('T')[0], assigned_to_user_ids: [], assigned_to_vehicle_ids: [], site_id: '', notes: '', file: null })
        }
        setShowTxModal(true)
    }

    const handleScanSuccess = async (itemId) => {
        setIsScannerOpen(false);
        try {
            const res = await api.get(`/warehouse/items/${itemId}`);
            if (res.data) {
                if (res.data.inventory_code && !res.data.current_holder_id && !res.data.current_site_id) {
                    setToolModal({ isOpen: true, item: res.data, siteId: '', userId: '', date: new Date().toISOString().split('T')[0] });
                } else if (res.data.inventory_code && (res.data.current_holder_id || res.data.current_site_id)) {
                    handleCheckIn(res.data);
                } else {
                    openTxModal(res.data, 'OUT');
                }
            }
        } catch (error) {
            showToast("Articolul scanat nu a fost găsit.", 'error');
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredItems.map(item => ({
            'Articol': item.name,
            'Categorie': activeTab,
            'Stoc Curent': item.total_quantity,
            'Unitate de Măsură': item.unit
        }))
        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Stoc")
        XLSX.writeFile(wb, `Stoc_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    // Filtering & Pagination for Items
    const filteredItems = items
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const filteredHistory = transactions.filter(t => {
        const searchLower = historySearch.toLowerCase()
        return (
            (t.date && String(t.date).toLowerCase().includes(searchLower)) ||
            (t.transaction_type && t.transaction_type.toLowerCase().includes(searchLower)) ||
            (String(t.quantity).includes(searchLower)) ||
            (t.assigned_site && t.assigned_site.toLowerCase().includes(searchLower)) ||
            (t.assigned_user && t.assigned_user.toLowerCase().includes(searchLower)) ||
            (t.assigned_vehicle && t.assigned_vehicle.toLowerCase().includes(searchLower)) ||
            (t.operator && t.operator.toLowerCase().includes(searchLower)) ||
            (t.notes && t.notes.toLowerCase().includes(searchLower))
        )
    })
    const lastOutTx = transactions.filter(t => t.transaction_type === 'OUT').slice(-1)[0]
    const isFromWorkerRequest = lastOutTx?.notes?.includes('Flux Cerere')

    return (
        <>
            {historyItem ? (
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {/* Back Button */}
                <button 
                    onClick={() => setHistoryItem(null)}
                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors w-fit"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="font-semibold">{t('warehouse.back_to_warehouse')}</span>
                </button>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    {/* Header of Detail View */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {historyItem.name}
                            </h2>
                            {historyItem.inventory_code ? (
                                <p className="text-sm text-slate-500 mt-1">
                                    Status: <span className={`font-bold ${(historyItem.current_holder_id || historyItem.current_site_id) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {historyItem.current_holder_name
                                            ? `În teren · ${historyItem.current_holder_name}${historyItem.current_site_name ? ` · ${historyItem.current_site_name}` : ''}`
                                            : historyItem.current_site_name
                                                ? `La șantier · ${historyItem.current_site_name}`
                                                : 'La magazie'
                                        }
                                    </span>
                                </p>
                            ) : (
                                <p className="text-sm text-slate-500 mt-1">Stoc curent: <span className="font-bold text-slate-800 dark:text-slate-200">{historyItem.total_quantity} {historyItem.unit}</span></p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="relative flex-1 lg:w-64 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Caută în istoric..."
                                    value={historySearch}
                                    onChange={e => setHistorySearch(e.target.value)}
                                    className="w-full pl-9 pr-10 py-2 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all h-10"
                                />
                                {historySearch && (
                                    <button
                                        onClick={() => setHistorySearch('')}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white p-1 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openTxModal(historyItem, 'IN')}
                                    className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                >
                                    <ArrowDownRight className="w-4 h-4" /> Intrare
                                </button>
                                <button
                                    onClick={() => openTxModal(historyItem, 'OUT')}
                                    className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Ieșire
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TIMELINE COMPACT — doar pentru scule unice (cu inventory_code) */}
                    {linkedRequest && historyItem.inventory_code && (
                        <div className="mx-6 mb-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Traseul sculei</span>
                            </div>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    <tr>
                                        <td className="px-4 py-2 w-28 text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">Solicitat</td>
                                        <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">{linkedRequest.requested_by}</td>
                                        <td className="px-4 py-2 text-xs text-slate-500">{linkedRequest.site_name || '—'}</td>
                                        <td className="px-4 py-2 text-xs text-slate-400 text-right whitespace-nowrap">{linkedRequest.requested_at ? new Date(linkedRequest.requested_at).toLocaleString('ro-RO', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                                    </tr>
                                    {linkedRequest.approved_by && (
                                        <tr>
                                            <td className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">Aprobat</td>
                                            <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">{linkedRequest.approved_by}</td>
                                            <td className="px-4 py-2 text-xs text-slate-500">—</td>
                                            <td className="px-4 py-2 text-xs text-slate-400 text-right whitespace-nowrap">{linkedRequest.approved_at ? new Date(linkedRequest.approved_at).toLocaleString('ro-RO', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                                        </tr>
                                    )}
                                    {linkedRequest.approved_at && (
                                        <tr>
                                            <td className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">Predat</td>
                                            <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">{linkedRequest.approved_by}</td>
                                            <td className="px-4 py-2 text-xs text-slate-500">{linkedRequest.site_name || '—'}</td>
                                            <td className="px-4 py-2 text-xs text-slate-400 text-right whitespace-nowrap">{linkedRequest.approved_at ? new Date(linkedRequest.approved_at).toLocaleString('ro-RO', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                                        </tr>
                                    )}
                                    {linkedRequest.confirmed_by && (
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            <td className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">Confirmat</td>
                                            <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100">{linkedRequest.confirmed_by}</td>
                                            <td className="px-4 py-2 text-xs text-slate-500">Semnat digital</td>
                                            <td className="px-4 py-2 text-xs text-slate-400 text-right whitespace-nowrap">{linkedRequest.confirmed_at ? new Date(linkedRequest.confirmed_at).toLocaleString('ro-RO', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* LOCATIE CURENTA — doar pentru scule unice */}
                    {historyItem.inventory_code && (() => {
                        const holderName = historyItem.current_holder_name || (linkedRequest?.status === 'completed' ? linkedRequest?.current_holder || linkedRequest?.confirmed_by : null)
                        const siteName = historyItem.current_site_name || linkedRequest?.current_site || linkedRequest?.site_name
                        const isOut = !!holderName
                        return (
                        <div className={`mx-6 my-3 rounded-xl border-2 overflow-hidden ${isOut ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className={`flex items-center justify-between px-4 py-2.5 ${isOut ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-white" />
                                    <span className="text-[11px] font-black text-white uppercase tracking-widest">
                                        {isOut ? 'In teren' : 'In magazie — disponibil'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => { setShowAssignPanel(p => !p); setAssignUserId(''); setAssignSiteId('') }}
                                    className="flex items-center gap-1 text-[10px] font-bold text-white/80 hover:text-white transition-colors"
                                >
                                    <Edit2 className="w-3 h-3" />
                                    {showAssignPanel ? 'Anuleaza' : 'Modifica'}
                                </button>
                            </div>
                            {!showAssignPanel && isOut && (
                                <div className="px-4 py-3 bg-white dark:bg-slate-900 grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Muncitor</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{holderName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Santier</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{siteName || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sursa</p>
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            {isFromWorkerRequest || linkedRequest?.status === 'completed' ? 'Cerere muncitor' : 'Atribuit de admin'}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {showAssignPanel && (
                                <div className="px-4 py-3 bg-white dark:bg-slate-900">
                                    <div className="flex flex-wrap gap-3 items-end">
                                        <div className="flex-1 min-w-[160px]">
                                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Muncitor</label>
                                            <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                                                <option value="">— Nimeni (inapoi in magazie) —</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1 min-w-[160px]">
                                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Santier</label>
                                            <select value={assignSiteId} onChange={e => setAssignSiteId(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                                                <option value="">— Alege santier —</option>
                                                {allSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await api.post(`/warehouse/items/${historyItem.id}/force-assign`, {
                                                        user_id: assignUserId || null,
                                                        site_id: assignSiteId || null,
                                                        date: new Date().toISOString().split('T')[0]
                                                    })
                                                    showToast('Detinatorul actualizat!', 'success')
                                                    setShowAssignPanel(false)
                                                    setHistoryItem(prev => ({
                                                        ...prev,
                                                        current_holder_name: users.find(u => u.id === assignUserId)?.full_name || null,
                                                        current_site_name: allSites.find(s => s.id === assignSiteId)?.name || null,
                                                        total_quantity: (assignUserId || assignSiteId) ? 0 : 1
                                                    }))
                                                } catch(e) {
                                                    showToast('Eroare la actualizare', 'error')
                                                }
                                            }}
                                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
                                        >
                                            Salveaza
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        )
                    })()}

                    {/* Batch Delete Actions */}
                    {selectedTxIds.length > 0 && (
                        <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 flex items-center justify-between dark:bg-rose-900/20 dark:border-rose-900/50">
                            <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                                {selectedTxIds.length} tranzacții selectate
                            </span>
                            <button
                                onClick={handleBatchDeleteTx}
                                className="text-sm px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-sm transition-colors font-medium"
                            >
                                Șterge Selectatele
                            </button>
                        </div>
                    )}

                    <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30 dark:bg-slate-900/50">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={filteredHistory.length > 0 && selectedTxIds.length === filteredHistory.length}
                                            onChange={() => handleToggleSelectAllTx(filteredHistory)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4">Dată</th>
                                    <th className="px-6 py-4">Tip</th>
                                    {!historyItem?.inventory_code && (
                                        <th className="px-6 py-4 text-right">Cantitate</th>
                                    )}
                                    <th className="px-6 py-4">Șantier</th>
                                    <th className="px-6 py-4">Destinatar</th>
                                    <th className="px-6 py-4">Notițe / Atașament</th>
                                    <th className="px-6 py-4">Operator</th>
                                    <th className="px-6 py-4 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredHistory.length === 0 ? (
                                    <tr><td colSpan={historyItem?.inventory_code ? "8" : "9"} className="px-6 py-12 text-center text-slate-500">Nu s-au găsit tranzacții.</td></tr>
                                ) : (
                                    filteredHistory.slice((historyCurrentPage - 1) * historyItemsPerPage, historyCurrentPage * historyItemsPerPage).map(t => (
                                        <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${selectedTxIds.includes(t.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                            <td className="px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTxIds.includes(t.id)}
                                                    onChange={() => handleToggleSelectTx(t.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-blue-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 dark:text-slate-300 font-bold">{t.date}</span>
                                                    {t.created_at && (
                                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded w-fit mt-1">
                                                            Ora: {new Date(t.created_at).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Bucharest', hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${t.transaction_type === 'IN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                                    {t.transaction_type}
                                                </span>
                                            </td>
                                            {!historyItem?.inventory_code && (
                                                <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                    {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                {t.assigned_site || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                                <div className="flex flex-col gap-0.5">
                                                    {t.assigned_user && <span className="font-bold">{t.assigned_user}</span>}
                                                    {t.assigned_vehicle && <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">{t.assigned_vehicle}</span>}
                                                    {!t.assigned_user && !t.assigned_vehicle && '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {t.notes && (
                                                        <span className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-w-sm">{t.notes}</span>
                                                    )}
                                                    {t.attachment_url && (
                                                        <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 px-2.5 py-1.5 rounded-md w-fit transition-colors">
                                                            <FileText className="w-3.5 h-3.5" />
                                                            Vezi Document
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{t.operator}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openTxModal(historyItem, t.transaction_type, t)} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors" title="Modifică tranzacție">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteTx(t.id)} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors" title="Șterge tranzacție">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {filteredHistory.length > 0 && (
                        <Pagination
                            currentPage={historyCurrentPage}
                            pageSize={historyItemsPerPage}
                            totalItems={filteredHistory.length}
                            onPageChange={setHistoryCurrentPage}
                            onPageSizeChange={setHistoryItemsPerPage}
                        />
                    )}
                </div>
            </div>
            ) : (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* ── Returnări în așteptare ─────────────────────────────────────── */}
            {pendingReturns.length > 0 && (
                <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-3xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 bg-amber-400">
                        <h3 className="font-black text-white text-sm uppercase tracking-wider">
                            {pendingReturns.length} Sculă{pendingReturns.length > 1 ? ' în' : ''} așteptare confirmare
                        </h3>
                        <span className="ml-auto text-[11px] font-bold text-amber-900 bg-amber-200 px-3 py-1 rounded-full">
                            Muncitorii au predat — confirmați starea
                        </span>
                    </div>
                    <div className="divide-y divide-amber-200">
                        {pendingReturns.map(pr => (
                            <div key={pr.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800">{pr.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {pr.inventory_code && <span className="font-mono mr-2">{pr.inventory_code}</span>}
                                        {pr.model && <span className="mr-2">· {pr.model}</span>}
                                        · Predat de <strong>{pr.returned_by}</strong>
                                        {pr.pending_return_at && (
                                            <span className="ml-2 text-amber-600">
                                                {new Date(pr.pending_return_at).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => confirmPendingReturn(pr.id, 'functional')}
                                        disabled={confirmReturnLoading}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors disabled:opacity-50"
                                    >Funcțională</button>
                                    <button
                                        onClick={() => confirmPendingReturn(pr.id, 'defective')}
                                        disabled={confirmReturnLoading}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-full transition-colors disabled:opacity-50"
                                    >Defectă</button>
                                    <button
                                        onClick={() => confirmPendingReturn(pr.id, 'lost')}
                                        disabled={confirmReturnLoading}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-full transition-colors disabled:opacity-50"
                                    >Pierdută</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gestiune Depozit</h1>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 flex flex-col gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative group flex items-center w-full sm:w-auto flex-1 max-w-md">
                            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Caută articol..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                            {searchQuery && (
                                <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                    <span className="text-[10px] font-bold text-white">
                                        {filteredItems.length}/{items.length}
                                    </span>
                                    <button
                                        onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                        className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5"
                                    >
                                        <X className="w-3 h-3 text-white/80 hover:text-white" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end overflow-x-auto custom-scrollbar pb-1 sm:pb-0 shrink-0">
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                            <button
                                onClick={() => setIsScannerOpen(true)}
                                className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                            >
                                <ScanLine className="w-4 h-4" /> Scanează QR
                            </button>
                            <button
                                onClick={() => { setItemForm({ name: '', unit: activeTab === 'COMBUSTIBIL' ? 'L' : (activeTab === 'SCULE' ? 'buc' : ''), model: '', inventory_code: '', site_id: selectedSite || '' }); setSelectedItem(null); setShowItemModal(true); }}
                                className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                Articol
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-full shadow-inner shrink-0">
                            {getCategories(t).map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => { setActiveTab(cat.id); setCurrentPage(1); }}
                                    className={`flex items-center justify-center gap-1.5 px-4 h-8 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                                        activeTab === cat.id
                                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-slate-100/10'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <cat.icon className="w-4 h-4 shrink-0" />
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        <select 
                            value={selectedSite}
                            onChange={(e) => setSelectedSite(e.target.value)}
                            className="h-10 px-4 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                        >
                            <option value="">Toate Șantierele</option>
                            {allSites.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-3 py-3 w-10 text-center">Nr.</th>
                                <th className="px-3 py-3">Articol</th>
                                <th className="px-3 py-3 text-center">UM</th>
                                <th className="px-3 py-3 text-center">Intr.</th>
                                <th className="px-3 py-3 text-center">Ieș.</th>
                                <th className="px-3 py-3 text-center">Mag.</th>
                                <th className="px-3 py-3 text-center">Santier</th>
                                <th className="px-3 py-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                                        Nu s-au găsit articole.
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item, index) => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => {
                                            setHistoryItem(item)
                                            setHistorySearch('')
                                            setLinkedRequest(null)
                                            fetchTransactions(item.id)
                                            api.get(`/warehouse/items/${item.id}/linked-request`)
                                              .then(r => setLinkedRequest(r.data))
                                              .catch(() => {})
                                        }}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-3 py-2 text-center text-slate-500 font-medium">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{item.name}</span>
                                                {item.inventory_code && (
                                                    <div className="flex items-center gap-1.5">
                                                        {item.model && <span className="text-[11px] text-slate-500 font-medium border-l border-slate-200 dark:border-slate-700 pl-2">Mod: {item.model}</span>}
                                                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{item.inventory_code}</span>
                                                        
                                                        {/* Inline Assignment Status */}
                                                        {(item.current_site_id || item.current_holder_id) ? (
                                                            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                                <span className="text-[11px] text-amber-700 font-semibold">
                                                                    {item.current_holder_name || 'Repartizat'}
                                                                    {item.current_site_name && <span className="text-amber-500 font-normal"> · {item.current_site_name}</span>}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${item.is_defective ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                                                <span className={`text-[11px] font-semibold ${item.is_defective ? 'text-red-600 uppercase tracking-wider' : 'text-emerald-600'}`}>
                                                                    {item.is_defective ? 'Defect' : 'In Depozit'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400 font-medium">
                                            {item.unit}
                                        </td>
                                        {item.inventory_code ? (
                                            <>
                                                <td className="px-3 py-2 text-center text-slate-400 dark:text-slate-500 font-medium">-</td>
                                                <td className="px-3 py-2 text-center text-slate-400 dark:text-slate-500 font-medium">-</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2 text-center text-blue-600 dark:text-blue-400 font-bold">
                                                    {item.total_in > 0 ? `+${item.total_in}` : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-center text-rose-500 dark:text-rose-400 font-bold">
                                                    {item.total_out > 0 ? `-${item.total_out}` : '-'}
                                                </td>
                                            </>
                                        )}
                                        {/* Stoc Magazie */}
                                        <td className="px-3 py-2 text-center">
                                            <div className={`inline-flex items-center justify-center min-w-[3rem] px-2 h-6 rounded-full border text-xs font-bold ${
                                                (item.inventory_code ? (item.current_site_id || item.current_holder_id) : (item.total_quantity === 0))
                                                    ? 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
                                                    : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                            }`}>
                                                {item.inventory_code ? ((item.current_site_id || item.current_holder_id) ? '0' : '1') : item.total_quantity}
                                            </div>
                                        </td>
                                        {/* Stoc Santier */}
                                        <td className="px-3 py-2 text-center">
                                            {item.inventory_code ? (
                                                /* Sculă unică */
                                                (item.current_site_id || item.current_holder_id) ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="inline-flex items-center justify-center min-w-[3rem] px-2 h-6 rounded-full border text-xs font-bold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                                            1
                                                        </div>
                                                        {item.current_site_name && (
                                                            <span className="text-[10px] text-amber-600 font-semibold">{item.current_site_name}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                )
                                            ) : (
                                                /* Consumabil — stoc total la toate santierele */
                                                (item.site_total > 0) ? (
                                                    <div className="inline-flex items-center justify-center min-w-[3rem] px-2 h-6 rounded-full border text-xs font-bold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                                        {item.site_total}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                )
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                {item.inventory_code ? (
                                                    <>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setQrPrintModalItem(item); }} 
                                                            className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors" 
                                                            title="Printează QR"
                                                        >
                                                            <QrCode className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleToggleDefective(item, e)} 
                                                            className={`flex items-center justify-center px-2 h-8 rounded-full border text-xs font-bold transition-colors ${item.is_defective ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                            title={item.is_defective ? "Marchează funcțională" : "Marchează defectă"}
                                                        >
                                                            Defect
                                                        </button>
                                                        {item.current_site_id || item.current_holder_id ? (
                                                            <button onClick={(e) => { e.stopPropagation(); handleCheckIn(item); }} className="flex items-center justify-center px-3 h-8 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-xs font-bold" title="Primire">
                                                                Primire
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setToolModal({ isOpen: true, item, siteId: '', userId: '', date: new Date().toISOString().split('T')[0] }); }} 
                                                                className={`flex items-center justify-center px-3 h-8 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-xs font-bold ${item.is_defective ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                title="Repartizare"
                                                                disabled={item.is_defective}
                                                            >
                                                                Repartizare
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); openTxModal(item, 'IN'); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="Adaugă Intrare">
                                                            <ArrowDownRight className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); openTxModal(item, 'OUT'); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Adaugă Ieșire">
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setItemForm({ name: item.name, unit: item.unit, model: item.model || '', inventory_code: item.inventory_code || '', site_id: item.site_id || '' }); setShowItemModal(true); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors" title="Modifică articol">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors" title="Șterge articol">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wide">Afișare</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>Pagina {currentPage} din {Math.max(1, totalPages)}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 opacity-100 transition-all">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                    className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Anulează
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmModal.onConfirm) confirmModal.onConfirm();
                                        setConfirmModal({ ...confirmModal, isOpen: false });
                                    }}
                                    className="px-5 h-10 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 transition-all"
                                >
                                    Da, Șterge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOOL CHECK-OUT MODAL */}
            {toolModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 transform scale-100 opacity-100 transition-all flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Repartizare pe Șantier
                            </h2>
                            <button onClick={() => setToolModal({ ...toolModal, isOpen: false })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">{toolModal.item?.name} ({toolModal.item?.inventory_code})</p>
                            <form onSubmit={handleCheckOut} className="space-y-4">
                                <div className="space-y-4">
                                    {/* Searchable Site Select using SingleSelectDropdown */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Șantier Destinație (Opțional)</label>
                                        <SingleSelectDropdown
                                            options={sites}
                                            selectedId={toolModal.siteId}
                                            onChange={val => setToolModal({ ...toolModal, siteId: val })}
                                            placeholder="Nu asocia cu șantier..."
                                            searchPlaceholder="Caută șantier..."
                                            displayFn={s => s.name}
                                        />
                                    </div>

                                    {/* Searchable User Select using SingleSelectDropdown */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Angajat / Persoană (Opțional)</label>
                                        <SingleSelectDropdown
                                            options={users}
                                            selectedId={toolModal.userId}
                                            onChange={val => setToolModal({ ...toolModal, userId: val })}
                                            placeholder="Nu asocia cu angajat..."
                                            searchPlaceholder="Caută angajat..."
                                            displayFn={u => `${u.full_name}${u.employee_code ? ` (${u.employee_code})` : ''}`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Data Repartizare</label>
                                    <input type="date" required value={toolModal.date} onChange={e => setToolModal({ ...toolModal, date: e.target.value })} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                </div>
                                <div className="flex gap-3 justify-end pt-4 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setToolModal({ ...toolModal, isOpen: false })}
                                        className="px-5 h-10 rounded-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Anulează
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingTool}
                                        className="px-5 h-10 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50"
                                    >
                                        {isSubmittingTool ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmă Predarea'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ITEM MODAL */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-slate-500" />
                                {selectedItem ? 'Modifică Articol' : t('warehouse.add_new_item')}
                            </h2>
                            <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
                            <form onSubmit={handleSaveItem} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('warehouse.item_name')}</label>
                                    <input type="text" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">{t('warehouse.unit_of_measure')}</label>
                                    <div className={activeTab === 'COMBUSTIBIL' ? 'opacity-70 pointer-events-none' : ''}>
                                        <SingleSelectDropdown
                                            options={activeTab === 'COMBUSTIBIL' ? [{id: 'L', name: 'L (Litri)'}] : unitOptions}
                                            selectedId={itemForm.unit}
                                            onChange={val => setItemForm({ ...itemForm, unit: val })}
                                            placeholder="Alege unitatea..."
                                            searchPlaceholder="Caută..."
                                            displayFn={o => o.name}
                                        />
                                    </div>
                                </div>
                                
                                {activeTab === 'SCULE' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Model (Opțional)</label>
                                            <input type="text" value={itemForm.model} onChange={e => setItemForm({ ...itemForm, model: e.target.value })} placeholder="ex. GSB 18V-110 C" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Cod Inventar (Opțional)</label>
                                            <input type="text" value={itemForm.inventory_code} onChange={e => setItemForm({ ...itemForm, inventory_code: e.target.value })} placeholder="ex. INV-001" className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                        </div>
                                    </>
                                )}
                                
                                {!selectedItem && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Alocă direct pe Șantier (Opțional)</label>
                                        <SingleSelectDropdown
                                            options={allSites}
                                            selectedId={itemForm.site_id}
                                            onChange={val => setItemForm({ ...itemForm, site_id: val })}
                                            placeholder="— Nu (Magazia Generală) —"
                                            searchPlaceholder="Caută șantier..."
                                            displayFn={s => s.name}
                                        />
                                    </div>
                                )}
                                
                                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                                    <button type="button" onClick={() => setShowItemModal(false)} className="px-5 h-10 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors bg-slate-100 dark:bg-slate-800/50">Anulează</button>
                                    <button type="submit" className="px-5 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Salvează
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
             {/* TRANSACTION MODAL */}
            {showTxModal && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className={`px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-2xl shrink-0 ${txType === 'IN' ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-orange-50/50 dark:bg-orange-900/10'}`}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {txType === 'IN' ? <ArrowDownRight className="w-5 h-5 text-blue-600" /> : <ArrowUpRight className="w-5 h-5 text-orange-600" />}
                                {editingTx ? 'Modifică Tranzacție' : (txType === 'IN' ? 'Intrare Stoc' : 'Ieșire Stoc')}
                                <span className="text-sm font-normal text-slate-500 ml-2 block truncate">
                                    {selectedItem?.name}
                                </span>
                            </h2>
                            <button onClick={() => setShowTxModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-visible rounded-b-2xl custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                            <form onSubmit={handleSaveTx} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Cantitate ({selectedItem.unit})</label>
                                        <input type="number" step="0.01" min="0.01" required value={txForm.quantity} onChange={e => setTxForm({ ...txForm, quantity: e.target.value })} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Data</label>
                                        <input type="date" required value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm" />
                                    </div>
                                </div>

                                {txType === 'OUT' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Șantier (Opțional)</label>
                                            <select
                                                value={txForm.site_id || ''}
                                                onChange={e => setTxForm({ ...txForm, site_id: e.target.value })}
                                                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                            >
                                                <option value="">Companie General</option>
                                                {sites.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {(() => {
                                                const filteredUsers = txForm.site_id 
                                                    ? users.filter(u => u.site_id === txForm.site_id) 
                                                    : users;
                                                const filteredVehicles = txForm.site_id 
                                                    ? vehicles.filter(v => v.site_ids && v.site_ids.includes(txForm.site_id)) 
                                                    : vehicles;
                                                return (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Angajat / Persoană</label>
                                                            <MultiSelectDropdown
                                                                options={filteredUsers}
                                                                selectedIds={txForm.assigned_to_user_ids}
                                                                onChange={ids => setTxForm({ ...txForm, assigned_to_user_ids: ids })}
                                                                placeholder="Alege angajați..."
                                                                searchPlaceholder="Caută angajat..."
                                                                displayFn={u => `${u.full_name}${u.employee_code ? ` (${u.employee_code})` : ''}`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Utilaj / Mașină</label>
                                                            <MultiSelectDropdown
                                                                options={filteredVehicles}
                                                                selectedIds={txForm.assigned_to_vehicle_ids}
                                                                onChange={ids => setTxForm({ ...txForm, assigned_to_vehicle_ids: ids })}
                                                                placeholder="Alege utilaje..."
                                                                searchPlaceholder="Caută utilaj..."
                                                                displayFn={v => `${v.name}${v.plate_number ? ` (${v.plate_number})` : ''}`}
                                                            />
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Atașament (Opțional)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={e => setTxForm({ ...txForm, file: e.target.files[0] })}
                                            className="w-full px-4 h-10 pt-2 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-transparent outline-none transition-all shadow-sm file:hidden pl-10"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                        />
                                        <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                                            {txForm.file ? txForm.file.name : "Alege fisier..."}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 ml-1">Notițe (Opțional)</label>
                                    <textarea rows={2} value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm custom-scrollbar" />
                                </div>

                                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                                    <button type="button" onClick={() => setShowTxModal(false)} className="px-5 h-10 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors bg-slate-100 dark:bg-slate-800/50">Anulează</button>
                                    <button type="submit" className={`px-5 h-10 text-white rounded-full text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${txType === 'IN' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'}`}>
                                        <Save className="w-4 h-4" />
                                        Salvează {txType === 'IN' ? 'Intrarea' : 'Ieșirea'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <QRPrintModal 
                isOpen={!!qrPrintModalItem} 
                onClose={() => setQrPrintModalItem(null)} 
                item={qrPrintModalItem} 
            />
            
            <QRScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScanSuccess={handleScanSuccess} 
            />
        </>
    )
}
