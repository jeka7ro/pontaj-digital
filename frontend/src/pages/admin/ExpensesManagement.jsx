import { useState, useEffect } from 'react'
import { 
    Wallet, TrendingDown, DollarSign, Plus, Building2, User as UserIcon, Calendar, Upload, FileText, Trash2, X, FileEdit, Banknote, Search, CheckCircle, Download, CalendarDays, Tag, Pencil, ChevronDown, Paperclip, Edit2
} from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'

export default function ExpensesManagement() {
    const [expenses, setExpenses] = useState([])
    const [sites, setSites] = useState([])
    const [users, setUsers] = useState([])
    const [customCategories, setCustomCategories] = useState([])
    const [activeTab, setActiveTab] = useState('expenses')
    const [loading, setLoading] = useState(true)
    const { showToast } = useUIStore()

    // Pagination state
    const [page, setPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(15)

    // Document Viewer state
    const [viewDocument, setViewDocument] = useState(null)

    // Filters
    const getLocalDateStr = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const initialToday = new Date();
    const initialTomorrow = new Date();
    initialTomorrow.setDate(initialTomorrow.getDate() + 1);

    const [selectedSite, setSelectedSite] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [selectedPeriod, setSelectedPeriod] = useState('Luna curentă')
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    
    const periods = ['Azi', 'Mâine', 'Ieri', 'Săptămâna curentă', 'Luna curentă', 'Luna trecută', 'Anul curent', 'Anul trecut', 'Toate perioadele']

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [formData, setFormData] = useState({
        site_id: '',
        user_id: '',
        category: 'Cheltuieli diverse',
        amount: '',
        currency: 'RON',
        date: new Date().toISOString().split('T')[0],
        description: '',
        document_url: '',
        showCustomCategory: false,
        status: 'achitat',
        partial_amount: ''
    })

    const [userSearch, setUserSearch] = useState('')
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)

    // Category Settings State
    const [newCatName, setNewCatName] = useState('')
    const [newCatBgColor, setNewCatBgColor] = useState('#e2e8f0')
    const [newCatTextColor, setNewCatTextColor] = useState('#0f172a')
    const [isAddingCat, setIsAddingCat] = useState(false)
    const [editingCatId, setEditingCatId] = useState(null)

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        setIsAddingCat(true);
        try {
            const colorData = JSON.stringify({ bg: newCatBgColor, text: newCatTextColor });
            if (editingCatId) {
                await api.put(`/admin/expenses/categories/${editingCatId}`, { name: newCatName, color: colorData });
                showToast('Categorie actualizată cu succes!', 'success');
            } else {
                await api.post('/admin/expenses/categories', { name: newCatName, color: colorData });
                showToast('Categorie adăugată cu succes!', 'success');
            }
            setNewCatName('');
            setNewCatBgColor('#e2e8f0');
            setNewCatTextColor('#0f172a');
            setEditingCatId(null);
            const resCats = await api.get('/admin/expenses/categories');
            setCustomCategories(resCats.data || []);
            // Update expenses in background to catch any renamed categories
            api.get('/admin/expenses/').then(res => setExpenses(res.data || [])).catch(() => {});
        } catch (e) {
            showToast(e.response?.data?.detail || 'Eroare la salvarea categoriei', 'error');
        } finally {
            setIsAddingCat(false);
        }
    }

    const handleEditCategoryStart = (cat) => {
        setEditingCatId(cat.id);
        setNewCatName(cat.name);
        let bg = '#e2e8f0';
        let text = '#0f172a';
        if (cat.color && cat.color.startsWith('{')) {
            try {
                const p = JSON.parse(cat.color);
                bg = p.bg || bg;
                text = p.text || text;
            } catch (e) {}
        }
        setNewCatBgColor(bg);
        setNewCatTextColor(text);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const handleDeleteCategory = async (id) => {
        if (!confirm('Ești sigur că vrei să ștergi această categorie? Cheltuielile existente o vor păstra ca text.')) return;
        try {
            await api.delete(`/admin/expenses/categories/${id}`);
            showToast('Categorie ștearsă', 'success');
            setCustomCategories(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            showToast('Eroare la ștergerea categoriei', 'error');
        }
    }

    const categories = customCategories.length > 0 ? customCategories.map(c => c.name) : ['Cheltuieli diverse']
    const categoryColors = customCategories.reduce((acc, cat) => {
        acc[cat.name] = cat.color;
        return acc;
    }, {});

    const getCategoryStyle = (catName) => {
        const colorStr = categoryColors[catName] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        let style = {};
        let className = 'inline-flex px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ';
        
        if (colorStr.startsWith('{')) {
            try {
                const parsed = JSON.parse(colorStr);
                style = { backgroundColor: parsed.bg, color: parsed.text };
            } catch {
                className += colorStr;
            }
        } else {
            className += colorStr;
        }
        
        return { className, style };
    }

    const getPeriodDates = (period) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const getLocalDateString = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        switch(period) {
            case 'Azi': {
                const dateStr = getLocalDateString(today);
                return { start: dateStr, end: dateStr };
            }
            case 'Mâine': {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dateStr = getLocalDateString(tomorrow);
                return { start: dateStr, end: dateStr };
            }
            case 'Ieri': {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const dateStr = getLocalDateString(yesterday);
                return { start: dateStr, end: dateStr };
            }
            case 'Săptămâna curentă': {
                const currentWeekStart = new Date(today);
                const day = currentWeekStart.getDay();
                const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
                currentWeekStart.setDate(diff);
                const currentWeekEnd = new Date(currentWeekStart);
                currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
                return { start: getLocalDateString(currentWeekStart), end: getLocalDateString(currentWeekEnd) };
            }
            case 'Luna curentă': {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                return { start: getLocalDateString(startOfMonth), end: getLocalDateString(endOfMonth) };
            }
            case 'Luna trecută': {
                const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                return { start: getLocalDateString(startOfLastMonth), end: getLocalDateString(endOfLastMonth) };
            }
            case 'Anul curent': {
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                const endOfYear = new Date(today.getFullYear(), 11, 31);
                return { start: getLocalDateString(startOfYear), end: getLocalDateString(endOfYear) };
            }
            case 'Anul trecut': {
                const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
                const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31);
                return { start: getLocalDateString(startOfLastYear), end: getLocalDateString(endOfLastYear) };
            }
            default: return { start: undefined, end: undefined };
        }
    }

    const loadData = async () => {
        try {
            let startDate, endDate;
            if (customStartDate || customEndDate) {
                startDate = customStartDate || undefined;
                endDate = customEndDate || undefined;
            } else {
                const dates = getPeriodDates(selectedPeriod);
                startDate = dates.start;
                endDate = dates.end;
            }

            const params = {
                site_id: selectedSite || undefined,
                category: selectedCategory || undefined,
                start_date: startDate,
                end_date: endDate,
                _t: new Date().getTime()
            };

            const [resEx, resSites, resUsers, resCats] = await Promise.all([
                api.get('/admin/expenses/', { params }),
                api.get('/admin/sites/', { params: { page_size: 1000, status: 'active' } }),
                api.get('/admin/users/', { params: { page_size: 1000 } }),
                api.get('/admin/expenses/categories')
            ])
            setExpenses(Array.isArray(resEx.data) ? resEx.data : [])
            setSites(Array.isArray(resSites.data) ? resSites.data : (resSites.data?.sites || []))
            setUsers(Array.isArray(resUsers.data) ? resUsers.data : (resUsers.data?.users || []))
            setCustomCategories(resCats.data || [])
        } catch (e) {
            console.error('Eroare încărcare date cheltuieli:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (selectedPeriod !== 'Toate perioadele') {
            const { start, end } = getPeriodDates(selectedPeriod);
            if (start && end) {
                setCustomStartDate(start);
                setCustomEndDate(end);
            }
        } else {
            setCustomStartDate('');
            setCustomEndDate('');
        }
    }, [selectedPeriod]);

    useEffect(() => {
        loadData()
    }, [selectedSite, selectedCategory, selectedPeriod, customStartDate, customEndDate])

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        
        setIsUploading(true)
        try {
            const res = await api.post('/admin/expenses/upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setFormData(prev => ({ ...prev, document_url: res.data.photo_url || res.data.url }))
            showToast('Document încărcat cu succes!', 'success')
        } catch (error) {
            console.error('Upload failed', error)
            showToast('Eroare la încărcarea documentului.', 'error')
        } finally {
            setIsUploading(false)
        }
    }

    const handleOpenAddModal = () => {
        setEditId(null);
        setFormData({
            site_id: '', user_id: '', category: customCategories.length > 0 ? customCategories[0].name : 'Cheltuieli diverse',
            amount: '', currency: 'RON', date: new Date().toISOString().split('T')[0],
            description: '', document_url: '', showCustomCategory: false, status: 'achitat', partial_amount: ''
        });
        setIsUserDropdownOpen(false);
        setUserSearch('');
        setShowModal(true);
    };

    const handleEdit = (expense) => {
        setEditId(expense.id);
        setFormData({
            site_id: expense.site_id || '',
            user_id: expense.user_id || '',
            category: expense.category || 'Cheltuieli diverse',
            amount: expense.amount || '',
            currency: expense.currency || 'RON',
            date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
            description: expense.description || '',
            document_url: expense.document_url || '',
            showCustomCategory: false,
            status: expense.status || 'achitat',
            partial_amount: expense.partial_amount || ''
        });
        setIsUserDropdownOpen(false);
        setUserSearch('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            let res;
            const payload = { ...formData };
            delete payload.showCustomCategory;
            payload.user_id = payload.user_id === '' ? null : payload.user_id;
            payload.amount = parseFloat(payload.amount);
            if (payload.status === 'partial') {
                payload.partial_amount = payload.partial_amount ? parseFloat(payload.partial_amount) : null;
            } else {
                payload.partial_amount = null;
            }

            if (editId) {
                res = await api.put(`/admin/expenses/${editId}`, payload)
                // Optimistic UI Update pt instantaneitate
                setExpenses(prev => prev.map(e => {
                    if (e.id === editId) {
                        const site = sites.find(s => s.id === payload.site_id);
                        const user = payload.user_id ? users.find(u => u.id === payload.user_id) : null;
                        return {
                            ...e,
                            ...payload,
                            site_name: site ? site.name : e.site_name,
                            user_name: user ? user.full_name : (payload.user_id === null ? null : e.user_name)
                        }
                    }
                    return e;
                }));
            } else {
                res = await api.post('/admin/expenses/', payload)
                if (res && res.data) {
                    setExpenses(prev => {
                        const exists = prev.find(e => e.id === res.data.id);
                        if (exists) return prev;
                        return [res.data, ...prev];
                    });
                }
            }
            setShowModal(false)

            setFormData({
                site_id: '', user_id: '', category: 'Cheltuieli diverse',
                amount: '', currency: 'RON', date: new Date().toISOString().split('T')[0],
                description: '', document_url: '', showCustomCategory: false, status: 'achitat', partial_amount: ''
            })

            // Async background refresh, non-blocking
            api.get('/admin/expenses/').then(r => setExpenses(r.data || [])).catch(()=> {})
            showToast(editId ? 'Cheltuiala a fost actualizată!' : 'Cheltuiala a fost salvată!', 'success')
            setEditId(null)
        } catch (e) {
            console.error(e);
            const errDetail = e.response?.data?.detail || e.message;
            const errMsg = typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail;
            showToast(`Eroare la salvare: ${errMsg}`, 'error');
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Ești sigur că vrei să ștergi această înregistrare?')) return
        try {
            await api.delete(`/admin/expenses/${id}`)
            loadData()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const exportToExcel = () => {
        if (expenses.length === 0) {
            showToast('Nu există date pentru export', 'error');
            return;
        }

        const dataToExport = expenses.map((exp, index) => ({
            'Nr. Crt.': index + 1,
            'Dată': new Date(exp.date).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin' }),
            'Categorie': exp.category,
            'Șantier': exp.site_name,
            'Angajat': exp.user_name || '-',
            'Descriere': exp.description || '-',
            'Suma (RON)': exp.amount,
            'Document Atașat': exp.document_url ? 'Da' : 'Nu'
        }))

        const worksheet = XLSX.utils.json_to_sheet(dataToExport)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cheltuieli')
        
        worksheet['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }
        ]

        XLSX.writeFile(workbook, `Cheltuieli_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    const filteredExpenses = expenses.filter(exp => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (exp.description && exp.description.toLowerCase().includes(q)) ||
            (exp.user_name && exp.user_name.toLowerCase().includes(q)) ||
            (exp.site_name && exp.site_name.toLowerCase().includes(q)) ||
            (exp.amount && exp.amount.toString().includes(q))
        );
    });

    const expensesArray = Array.isArray(filteredExpenses) ? filteredExpenses : [];
    const totalAmountRON = expensesArray.filter(e => !e.currency || e.currency === 'RON').reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalAmountEUR = expensesArray.filter(e => e.currency === 'EUR').reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const total = filteredExpenses.length
    const totalPages = rowsPerPage === 9999 ? 1 : Math.ceil(total / rowsPerPage)
    const paginatedExpenses = rowsPerPage === 9999 ? filteredExpenses : filteredExpenses.slice((page - 1) * rowsPerPage, page * rowsPerPage)

    const allCategories = [...new Set([...categories, ...expenses.map(e => e.category).filter(Boolean)])];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    Management Cheltuieli
                </h1>
                <button
                    onClick={handleOpenAddModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                    <Plus className="w-5 h-5" />
                    Adaugă Cheltuială
                </button>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex items-center gap-2 mb-6 bg-slate-200/50 dark:bg-slate-800 p-1.5 rounded-full w-fit">
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Cheltuieli
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Setări Categorii
                </button>
            </div>

            {activeTab === 'expenses' ? (
                <>
                    {/* Total Indicator */}
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Cheltuieli</p>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                    {totalAmountEUR.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-500">EUR</span>
                                </h3>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Cheltuieli</p>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                    {totalAmountRON.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-500">RON</span>
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                        {/* Filters */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/50 overflow-x-auto custom-scrollbar">
                            <div className="flex items-center gap-2 lg:gap-3 w-full">
                                <div className="relative flex-1 min-w-[100px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Caută..."
                                        className="h-10 pl-8 pr-3 text-[13px] sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 w-full"
                                        value={searchQuery}
                                        onChange={(e) => {setSearchQuery(e.target.value); setPage(1);}}
                                    />
                                </div>
                                <div className="relative flex-1 min-w-[100px]">
                                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select 
                                        className="h-10 pl-8 pr-6 text-[13px] sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 appearance-none w-full text-ellipsis overflow-hidden whitespace-nowrap"
                                        value={selectedSite}
                                        onChange={(e) => {setSelectedSite(e.target.value); setPage(1);}}
                                    >
                                        <option value="">Toate Șantierele</option>
                                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="relative flex-1 min-w-[100px]">
                                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select 
                                        className="h-10 pl-8 pr-6 text-[13px] sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 appearance-none w-full text-ellipsis overflow-hidden whitespace-nowrap"
                                        value={selectedCategory}
                                        onChange={(e) => {setSelectedCategory(e.target.value); setPage(1);}}
                                    >
                                        <option value="">Toate Categoriile</option>
                                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="relative flex-1 min-w-[100px]">
                                    <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select 
                                        className="h-10 pl-8 pr-6 text-[13px] sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 appearance-none w-full text-ellipsis overflow-hidden whitespace-nowrap"
                                        value={(!customStartDate && !customEndDate) ? selectedPeriod : ''}
                                        onChange={(e) => {
                                            setCustomStartDate('');
                                            setCustomEndDate('');
                                            setSelectedPeriod(e.target.value); 
                                            setPage(1);
                                        }}
                                    >
                                        {(customStartDate || customEndDate) && <option value="" disabled hidden>Perioadă...</option>}
                                        {periods.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                
                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 h-10 flex-[1.6] min-w-0">
                                    <input 
                                        type="date" 
                                        className="h-8 text-[13px] sm:text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-700 dark:text-slate-200 w-full px-1 text-center min-w-[125px]"
                                        value={customStartDate}
                                        onChange={e => {
                                            setCustomStartDate(e.target.value); 
                                            setPage(1);
                                        }}
                                    />
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0"></div>
                                    <input 
                                        type="date" 
                                        className="h-8 text-[13px] sm:text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-700 dark:text-slate-200 w-full px-1 text-center min-w-[125px]"
                                        value={customEndDate}
                                        onChange={e => {
                                            setCustomEndDate(e.target.value); 
                                            setPage(1);
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center justify-center gap-1.5 px-2.5 lg:px-3 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] sm:text-sm font-medium rounded-full transition-colors shadow-sm whitespace-nowrap shrink-0 ml-auto"
                                >
                                    <Download className="w-4 h-4 shrink-0" />
                                    <span className="hidden xl:inline">Exportă Excel</span>
                                    <span className="inline xl:hidden">Exportă</span>
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto custom-scrollbar flex-1 bg-slate-50/30 dark:bg-slate-900/50">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th style={{ width: 50, textAlign: 'center' }} className="px-6 py-4">Nr.</th>
                                        <th className="px-6 py-4">Dată</th>
                                        <th className="px-6 py-4">Categorie</th>
                                        <th className="px-6 py-4">Detalii</th>
                                        <th className="px-6 py-4">Șantier</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Suma</th>
                                        <th className="px-6 py-4 text-center">Document</th>
                                        <th className="px-6 py-4 text-right">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                                Se încarcă...
                                            </td>
                                        </tr>
                                    ) : filteredExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                                Nicio cheltuială găsită.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedExpenses.map((exp, index) => (
                                            <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }} className="px-6 py-4">
                                                    {(page - 1) * rowsPerPage + index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                        {exp.date ? exp.date.split('T')[0].split('-').reverse().join('.') : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        const badgeStyle = getCategoryStyle(exp.category);
                                                        return (
                                                            <span className={badgeStyle.className} style={badgeStyle.style}>
                                                                {exp.category}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-800 dark:text-slate-200">{exp.description || '-'}</div>
                                                    {exp.user_name && (() => {
                                                        const u = users.find(user => user.id === exp.user_id);
                                                        return (
                                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                                {u?.avatar_path ? (
                                                                    <img src={u.avatar_path} alt={exp.user_name} className="w-4 h-4 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                                                                ) : (
                                                                    <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[8px] font-bold">
                                                                        {exp.user_name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                {exp.user_name}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {exp.site_name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {exp.status === 'achitat' && <span className="text-slate-700 dark:text-slate-300 font-medium">Achitat</span>}
                                                    {exp.status === 'neachitat' && <span className="text-slate-700 dark:text-slate-300 font-medium">Neachitat</span>}
                                                    {exp.status === 'stornat' && <span className="text-slate-500 dark:text-slate-400 font-medium line-through">Stornat</span>}
                                                    {exp.status === 'partial' && (
                                                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                            Parțial: {exp.partial_amount}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                    {exp.amount.toLocaleString('ro-RO')} <span className="text-[11px] font-normal text-slate-500 uppercase">{exp.currency || 'RON'}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {exp.document_url ? (
                                                        <button onClick={() => setViewDocument(exp.document_url)} className="inline-flex items-center justify-center w-8 h-8 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors mx-auto" title="Vezi Document">
                                                            <Paperclip className="w-4 h-4" />
                                                        </button>
                                                    ) : <span className="text-slate-400 text-xs">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <button onClick={() => handleEdit(exp)} className="inline-flex items-center justify-center w-8 h-8 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors" title="Editează">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(exp.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-full text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors" title="Șterge">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <td colSpan="5" className="px-6 py-3">
                                            <div className="flex items-center gap-8">
                                                <span style={{ whiteSpace: 'nowrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                Afișează&nbsp;
                                                <select value={rowsPerPage} onChange={e => {setRowsPerPage(Number(e.target.value)); setPage(1);}} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 9999, padding: '2px 8px', outline: 'none' }}>
                                                    <option value={10}>10</option>
                                                    <option value={15}>15</option>
                                                    <option value={25}>25</option>
                                                    <option value={50}>50</option>
                                                    <option value={9999}>Toți</option>
                                                </select>
                                                </span>
                                                <span style={{ whiteSpace: 'nowrap', fontSize: '13px', color: 'var(--text-secondary)' }}>Total înregistrări: <strong>{total}</strong></span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                                                    {totalAmountRON.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">LEI</span>
                                                </span>
                                                <span className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                                                    {totalAmountEUR.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">EUR</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td colSpan="2" className="px-6 py-3 text-right">
                                            <div className="flex justify-end items-center gap-8" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                <span style={{ whiteSpace: 'nowrap' }}>Pagina {page} din {totalPages}</span>
                                                <div className="flex gap-1">
                                                    <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                                    </button>
                                                    <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row overflow-hidden">
                    {/* Add Category Form */}
                    <div className="p-6 md:p-8 w-full md:w-1/3 bg-slate-50/50 dark:bg-slate-800/30 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Adaugă Categorie</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nume Categorie</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Materiale"
                                    className="w-full text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-full px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Culoare Fundal</label>
                                    <div className="relative">
                                        <input 
                                            type="color" 
                                            value={newCatBgColor}
                                            onChange={e => setNewCatBgColor(e.target.value)}
                                            className="w-full h-10 rounded-xl cursor-pointer border-0 p-0 overflow-hidden"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Culoare Text</label>
                                    <div className="relative">
                                        <input 
                                            type="color" 
                                            value={newCatTextColor}
                                            onChange={e => setNewCatTextColor(e.target.value)}
                                            className="w-full h-10 rounded-xl cursor-pointer border-0 p-0 overflow-hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Previzualizare</label>
                                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                                    <span 
                                        className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold" 
                                        style={{ backgroundColor: newCatBgColor, color: newCatTextColor }}
                                    >
                                        {newCatName || 'Nume Categorie'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleAddCategory}
                                disabled={isAddingCat || !newCatName.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-full font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                                {isAddingCat ? 'Se salvează...' : <><Plus className="w-4 h-4" /> {editingCatId ? 'Salvează Modificări' : 'Salvează Categorie'}</>}
                            </button>
                            {editingCatId && (
                                <button
                                    onClick={() => {
                                        setEditingCatId(null);
                                        setNewCatName('');
                                        setNewCatBgColor('#e2e8f0');
                                        setNewCatTextColor('#0f172a');
                                    }}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-full font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
                                >
                                    Anulează
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category List */}
                    <div className="p-6 md:p-8 flex-1">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Categoriile tale ({customCategories.length})</h2>
                        {customCategories.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <Tag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nicio categorie personalizată</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Folosește formularul din stânga pentru a adăuga categorii cu culori personalizate.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {customCategories.map(cat => {
                                    const badgeStyle = getCategoryStyle(cat.name);
                                    return (
                                        <div key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm group hover:border-slate-300 dark:hover:border-slate-600 transition-colors pl-4">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className={badgeStyle.className} style={badgeStyle.style}>
                                                    Aa
                                                </span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                    {cat.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center">
                                                <button 
                                                    onClick={() => handleEditCategoryStart(cat)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Editează"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="p-1.5 mr-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Șterge"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {editId ? 'Editează Cheltuială' : 'Înregistrează Cheltuială'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto custom-scrollbar">
                            <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Șantier *</label>
                                        <select required className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.site_id} onChange={e => setFormData({...formData, site_id: e.target.value})}>
                                            <option value="">Alege șantier</option>
                                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Categorie *</label>
                                        <select 
                                            required 
                                            className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                                            value={formData.category} 
                                            onChange={e => setFormData({...formData, category: e.target.value})}
                                        >
                                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Sumă *</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input required type="number" step="0.01" min="0" className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                            </div>
                                            <select
                                                className="text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.currency}
                                                onChange={e => setFormData({...formData, currency: e.target.value})}
                                            >
                                                <option value="RON">RON</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Dată *</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input required type="date" className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:light] dark:[color-scheme:dark]" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Status *</label>
                                        <select
                                            className="w-full text-sm font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.status}
                                            onChange={e => setFormData({...formData, status: e.target.value})}
                                        >
                                            <option value="achitat">Achitat</option>
                                            <option value="neachitat">Neachitat</option>
                                            <option value="partial">Parțial</option>
                                            <option value="stornat">Stornat</option>
                                        </select>
                                    </div>
                                    {formData.status === 'partial' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Sumă Parțială *</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    required 
                                                    type="number" 
                                                    step="0.01" 
                                                    min="0" 
                                                    className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    placeholder="0.00" 
                                                    value={formData.partial_amount} 
                                                    onChange={e => setFormData({...formData, partial_amount: e.target.value})} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Atribuie unei persoane (Opțional)</label>
                                    <div className="relative">
                                        <div 
                                            className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 cursor-pointer flex justify-between items-center"
                                            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                {formData.user_id ? (() => {
                                                    const u = users.find(u => u.id === formData.user_id);
                                                    if (!u) return <span>-- Fără persoană specificată --</span>;
                                                    return (
                                                        <>
                                                            {u.avatar_path ? (
                                                                <img src={u.avatar_path} alt={u.full_name} className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                                                            ) : (
                                                                <div className="w-5 h-5 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                                                                    {u.full_name?.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <span className="truncate">{u.full_name}</span>
                                                        </>
                                                    );
                                                })() : <span>-- Fără persoană specificată --</span>}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isUserDropdownOpen && (
                                            <div className="absolute top-full mt-1 left-0 z-[60] w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
                                                <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                                                    <div className="relative">
                                                        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                                        <input 
                                                            type="text" 
                                                            className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-transparent rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                                                            placeholder="Caută persoană..."
                                                            value={userSearch}
                                                            onChange={e => setUserSearch(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto p-1 custom-scrollbar">
                                                    <div 
                                                        className="px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                                        onClick={() => {
                                                            setFormData({...formData, user_id: ''});
                                                            setIsUserDropdownOpen(false);
                                                            setUserSearch('');
                                                        }}
                                                    >
                                                        -- Fără persoană specificată --
                                                    </div>
                                                    {users.filter(u => (u.full_name || '').toLowerCase().includes((userSearch || '').toLowerCase())).map(u => (
                                                        <div 
                                                            key={u.id}
                                                            className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center ${formData.user_id === u.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-200'}`}
                                                            onClick={() => {
                                                                setFormData({...formData, user_id: u.id});
                                                                setIsUserDropdownOpen(false);
                                                                setUserSearch('');
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                {u.avatar_path ? (
                                                                    <img src={u.avatar_path} alt={u.full_name} className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                                                                ) : (
                                                                    <div className="w-5 h-5 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                                                                        {u.full_name?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <span className="truncate">{u.full_name}</span>
                                                            </div>
                                                            {u.role && <span className="ml-2 text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">{u.role}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Descriere / Observații</label>
                                    <textarea className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows="2" placeholder="Ex: Achiziție materiale Dedeman" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Document Justificativ (Poză/PDF)</label>
                                    {formData.document_url ? (
                                        <div className="flex items-center justify-between p-3 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5 text-blue-500" />
                                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Document Atașat</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setViewDocument(formData.document_url)}
                                                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-sm border border-blue-100 dark:border-blue-800 transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Vezi
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setFormData({...formData, document_url: ''})}
                                                    className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-sm border border-red-100 dark:border-red-800 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Șterge
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center w-full">
                                            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all">
                                                <div className="flex flex-col items-center justify-center text-center">
                                                    {isUploading ? (
                                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Upload className="w-5 h-5 text-slate-400" />
                                                            <span className="text-xs text-slate-500"><span className="font-semibold text-blue-500">Click pentru a încărca</span></span>
                                                        </div>
                                                    )}
                                                </div>
                                                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={isUploading} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm">
                                Anulează
                            </button>
                            <button type="submit" form="expense-form" disabled={isUploading || isSubmitting} className="flex-1 px-4 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2">
                                {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editId ? 'Salvează' : 'Adaugă')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewDocument && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" />
                                Vizualizare Document
                            </h3>
                            <div className="flex items-center gap-2">
                                <a href={viewDocument} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-full transition-colors font-medium">
                                    Deschide în tab nou
                                </a>
                                <button onClick={() => setViewDocument(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 relative">
                            {viewDocument.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={viewDocument} className="w-full h-full rounded-lg bg-white" title="PDF Viewer" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center overflow-auto bg-white dark:bg-slate-900 rounded-lg">
                                    <img src={viewDocument} alt="Document" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
