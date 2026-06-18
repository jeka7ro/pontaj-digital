import { useState, useEffect } from 'react'
import { 
    Wallet, TrendingDown, DollarSign, Plus, Building2, User as UserIcon, Calendar, Upload, FileText, Trash2, X, FileEdit, Banknote, Search, CheckCircle
} from 'lucide-react'
import api from '../../lib/api'

export default function ExpensesManagement() {
    const [expenses, setExpenses] = useState([])
    const [sites, setSites] = useState([])
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [selectedSite, setSelectedSite] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [formData, setFormData] = useState({
        site_id: '',
        user_id: '',
        category: 'Cheltuieli diverse',
        amount: '',
        currency: 'RON',
        date: new Date().toISOString().split('T')[0],
        description: '',
        document_url: ''
    })

    const categories = ['Salarii', 'Cazare', 'Diurnă', 'Cheltuieli diverse']
    const categoryColors = {
        'Salarii': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Cazare': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'Diurnă': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        'Cheltuieli diverse': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
    }

    const loadData = async () => {
        try {
            const [expRes, sitesRes, usersRes] = await Promise.all([
                api.get('/admin/expenses', {
                    params: {
                        site_id: selectedSite || undefined,
                        category: selectedCategory || undefined
                    }
                }),
                api.get('/admin/sites/?page_size=1000&status=active'),
                api.get('/admin/users/?page_size=1000')
            ])
            setExpenses(Array.isArray(expRes.data) ? expRes.data : [])
            const sitesData = sitesRes.data?.sites || []
            setSites(sitesData)
            setUsers(usersRes.data?.users || [])
        } catch (e) {
            console.error('Eroare încărcare date cheltuieli:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [selectedSite, selectedCategory])

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        
        setIsUploading(true)
        try {
            const res = await api.post('/photos/upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setFormData(prev => ({ ...prev, document_url: res.data.photo_url || res.data.url }))
        } catch (error) {
            console.error('Upload failed', error)
            alert('Atenție: Încărcarea fișierului a eșuat. Fișierul trebuie să fie imagine pentru ruta actuală.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await api.post('/admin/expenses', {
                ...formData,
                amount: parseFloat(formData.amount)
            })
            setShowModal(false)
            setFormData({
                site_id: '', user_id: '', category: 'Cheltuieli diverse',
                amount: '', currency: 'RON', date: new Date().toISOString().split('T')[0],
                description: '', document_url: ''
            })
            loadData()
        } catch (e) {
            alert('Eroare la salvarea cheltuielii.')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Ești sigur că vrei să ștergi această înregistrare?')) return
        try {
            await api.delete(`/admin/expenses/${id}`)
            loadData()
        } catch (e) {
            console.error(e)
        }
    }

    const totalAmount = (Array.isArray(expenses) ? expenses : []).reduce((acc, curr) => acc + (curr.amount || 0), 0)

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                        <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Cheltuieli & Deconturi</h1>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Adaugă Cheltuială
                </button>
            </div>

            {/* Total Indicator */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Cheltuieli</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {totalAmount.toLocaleString('ro-RO')} <span className="text-sm font-normal text-slate-500">RON</span>
                        </h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <TrendingDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                {/* Filters */}
                <div className="p-4 sm:p-5 flex flex-col xl:flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                                className="h-10 pl-9 pr-8 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                            >
                                <option value="">Toate Șantierele</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                                className="h-10 pl-9 pr-8 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">Toate Categoriile</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto custom-scrollbar flex-1 bg-slate-50/30 dark:bg-slate-900/50">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Dată</th>
                                <th className="px-6 py-4">Categorie</th>
                                <th className="px-6 py-4">Detalii</th>
                                <th className="px-6 py-4">Șantier</th>
                                <th className="px-6 py-4 text-right">Suma (RON)</th>
                                <th className="px-6 py-4 text-center">Document</th>
                                <th className="px-6 py-4 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        Se încarcă...
                                    </td>
                                </tr>
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        Nicio cheltuială găsită.
                                    </td>
                                </tr>
                            ) : (
                                expenses.map(exp => (
                                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                {new Date(exp.date).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${categoryColors[exp.category] || categoryColors['Cheltuieli diverse']}`}>
                                                {exp.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-800 dark:text-slate-200">{exp.description || '-'}</div>
                                            {exp.user_name && <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><UserIcon className="w-3 h-3"/> {exp.user_name}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                            <div className="flex items-center gap-2">
                                                {exp.site_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                            {exp.amount.toLocaleString('ro-RO')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {exp.document_url ? (
                                                <a href={exp.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors" title="Vezi Document">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Vezi Document
                                                </a>
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <button onClick={() => handleDelete(exp.id)} className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors" title="Șterge">
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
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Înregistrează Cheltuială
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
                                            <option value="" disabled>Alege șantier</option>
                                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Categorie *</label>
                                        <select required className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Sumă (RON) *</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input required type="number" step="0.01" min="0" className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
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

                                {['Salarii', 'Diurnă'].includes(formData.category) && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Atribuie unui Angajat (Opțional)</label>
                                        <select className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})}>
                                            <option value="">-- Fără angajat specificat --</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Descriere / Observații</label>
                                    <textarea className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows="2" placeholder="Ex: Achiziție materiale Dedeman" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Document Justificativ (Poză/PDF)</label>
                                    <div className="flex items-center justify-center w-full">
                                        <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-all ${formData.document_url ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                            <div className="flex flex-col items-center justify-center text-center">
                                                {isUploading ? (
                                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                ) : formData.document_url ? (
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-5 h-5 text-blue-500" />
                                                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Document Atașat</span>
                                                    </div>
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
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm">
                                Anulează
                            </button>
                            <button type="submit" form="expense-form" disabled={isUploading} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors text-sm">
                                Salvează
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
