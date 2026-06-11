import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit, Check, X, Calendar, FileText, Loader2 } from 'lucide-react'
import api from '../../lib/api'
import Pagination from '../../components/Pagination'
import SearchableSelect from '../../components/SearchableSelect'
import useViewPreferencesStore from '../../store/viewPreferencesStore'

const PAGE_ID = 'admin-leaves'

export default function LeavesManagement() {
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
    
    const [leaves, setLeaves] = useState([])
    const [users, setUsers] = useState([])
    const [admins, setAdmins] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    
    // View preferences for Pagination
    const preferences = useViewPreferencesStore((state) => state.getPagePreferences(PAGE_ID))
    const setPageSize = useViewPreferencesStore((state) => state.setPageSize)
    const setCurrentPage = useViewPreferencesStore((state) => state.setCurrentPage)
    
    // Form state
    const getToday = () => new Date().toISOString().split('T')[0];
    const getTomorrow = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        user_id: '',
        leave_type: 'odihna',
        start_date: getToday(),
        end_date: getTomorrow(),
        notes: '',
        status: 'approved',
        approved_by_id: ''
    })
    const [editingId, setEditingId] = useState(null)
    const [deleteModalId, setDeleteModalId] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            setError(null)
            const [leavesRes, usersRes, adminsRes] = await Promise.allSettled([
                api.get('/admin/leaves/'),
                api.get('/admin/users/', { params: { page_size: 1000 } }),
                api.get('/admin/leaves/admins')
            ])
            
            if (leavesRes.status === 'fulfilled') {
                setLeaves(Array.isArray(leavesRes.value.data) ? leavesRes.value.data : [])
            }

            if (adminsRes.status === 'fulfilled') {
                setAdmins(Array.isArray(adminsRes.value.data) ? adminsRes.value.data : [])
            }

            if (usersRes.status === 'fulfilled') {
                const data = usersRes.value.data;
                if (data.items) setUsers(data.items)
                else if (data.users) setUsers(data.users)
                else if (Array.isArray(data)) setUsers(data)
            }

            if (leavesRes.status === 'rejected') {
                throw leavesRes.reason; // Trigger error state if main endpoint fails
            }
        } catch (e) {
            console.error('Error fetching leaves:', e)
            try {
                const altUsersRes = await api.get('/teams/available-workers')
                if (altUsersRes.data.workers) {
                    setUsers(altUsersRes.data.workers)
                }
            } catch (err) {
                if (err.response?.status === 401) {
                    // handled by interceptor or app
                } else {
                    console.error("Could not fetch data", err)
                    setError(err.response?.data?.detail || err.message || 'Eroare la încărcarea datelor')
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!formData.user_id) {
            alert('Te rugăm să selectezi un angajat.');
            return;
        }
        try {
            const selectedAdmin = admins.find(a => a.id === formData.approved_by_id)
            const payload = {
                ...formData,
                approved_by_name: selectedAdmin ? selectedAdmin.full_name : null
            }

            if (editingId) {
                await api.put(`/admin/leaves/${editingId}`, payload)
            } else {
                await api.post('/admin/leaves/', payload)
            }
            setShowModal(false)
            setFormData({ user_id: '', leave_type: 'odihna', start_date: getToday(), end_date: getTomorrow(), notes: '', status: 'approved', approved_by_id: '' })
            setEditingId(null)
            fetchData()
        } catch (error) {
            alert('Eroare: ' + (error.response?.data?.detail || error.message))
        }
    }

    const handleDelete = async (id) => {
        try {
            await api.delete(`/admin/leaves/${id}`)
            setDeleteModalId(null)
            fetchData()
        } catch (error) {
            alert('Eroare la ștergere: ' + (error.response?.data?.detail || error.message))
        }
    }

    const openEdit = (leave) => {
        setFormData({
            user_id: leave.user_id,
            leave_type: leave.leave_type,
            start_date: leave.start_date,
            end_date: leave.end_date,
            notes: leave.notes || '',
            status: leave.status || 'approved',
            approved_by_id: leave.approved_by_id || ''
        })
        setEditingId(leave.id)
        setShowModal(true)
    }

    const getLeaveTypeLabel = (type) => {
        switch(type) {
            case 'medical': return 'Medical';
            case 'odihna': return 'Odihnă';
            case 'fara_plata': return 'Fără plată';
            default: return type;
        }
    }

    const getLeaveTypeColor = (type) => {
        switch(type) {
            case 'medical': return 'bg-red-100 text-red-800 border-red-200';
            case 'odihna': return 'bg-green-100 text-green-800 border-green-200';
            case 'fara_plata': return 'bg-slate-100 text-slate-800 border-slate-200';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    }

    const getStatusInfo = (status) => {
        switch(status) {
            case 'approved': return { label: 'Aprobat', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
            case 'rejected': return { label: 'Respins', color: 'bg-red-100 text-red-800 border-red-200' };
            case 'pending': return { label: 'În așteptare', color: 'bg-amber-100 text-amber-800 border-amber-200' };
            default: return { label: status, color: 'bg-slate-100 text-slate-800 border-slate-200' };
        }
    }

    const filteredLeaves = leaves.filter(leave => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            (leave.full_name || '').toLowerCase().includes(s) || 
            (leave.employee_code || '').toLowerCase().includes(s) ||
            (getLeaveTypeLabel(leave.leave_type) || '').toLowerCase().includes(s)
        );
    });

    const totalItems = filteredLeaves.length;
    const startIndex = (preferences.currentPage - 1) * preferences.pageSize;
    const displayedLeaves = filteredLeaves.slice(startIndex, startIndex + preferences.pageSize);

    // Auto-reset page if beyond results
    useEffect(() => {
        if (!loading && displayedLeaves.length === 0 && totalItems > 0 && preferences.currentPage > 1) {
            setCurrentPage(PAGE_ID, 1)
        }
    }, [loading, displayedLeaves.length, totalItems, preferences.currentPage])


    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Calendar className="w-5 h-5" />
                        </div>
                        Management Concedii
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Evidența concediilor de odihnă și medicale</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-3xl">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative group flex items-center w-full sm:w-auto">
                        <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(PAGE_ID, 1) }}
                            placeholder="Caută angajat..."
                            className="w-full sm:w-64 md:w-80 h-10 pl-10 pr-[72px] bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                        {search && (
                            <div className="absolute right-1.5 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {filteredLeaves.length}/{leaves.length || 0}
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
                        <button 
                            onClick={() => {
                                setEditingId(null);
                                setFormData({ user_id: '', leave_type: 'odihna', start_date: getToday(), end_date: getTomorrow(), notes: '', status: 'approved', approved_by_id: '' });
                                setShowModal(true);
                            }}
                            className="flex items-center gap-1.5 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> Adaugă Concediu
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50/30 dark:bg-slate-900/50 flex-1 relative">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 w-16 text-center">#</th>
                                    <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Angajat</th>
                                    <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Tip Concediu</th>
                                    <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Data Început</th>
                                    <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Data Sfârșit</th>
                                    <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Status</th>
                                    <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {error ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center">
                                            <div className="text-red-500 bg-red-50 p-4 rounded-lg inline-block border border-red-200">
                                                <p className="font-bold mb-1">Eroare API</p>
                                                <p className="text-sm">{error}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : loading ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                        </td>
                                    </tr>
                                ) : displayedLeaves.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center">
                                            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-600 font-medium text-sm">Nu există concedii găsite.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedLeaves.map((leave, index) => (
                                        <tr key={leave.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 text-center text-sm font-medium text-slate-400">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {leave.avatar_path ? (
                                                        <img 
                                                            src={`${apiBase}${leave.avatar_path}`} 
                                                            alt="" 
                                                            className="w-9 h-11 rounded-lg object-cover object-[center_20%] ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 relative z-0 hover:z-50 transition-transform duration-200 hover:scale-[1.8] hover:shadow-2xl"
                                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                                                        />
                                                    ) : null}
                                                    <div 
                                                        className={`w-9 h-11 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 ${leave.avatar_path ? 'hidden' : 'flex'}`}
                                                    >
                                                        {leave.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 dark:text-white">{leave.full_name}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                                                            <span className="font-medium">#{leave.employee_code}</span>
                                                            {leave.role_name && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                                    <span>{leave.role_name}</span>
                                                                </>
                                                            )}
                                                            {leave.team_name && (
                                                                <>
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                                    <span className="text-blue-600 dark:text-blue-400">{leave.team_name}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getLeaveTypeColor(leave.leave_type)}`}>
                                                    {getLeaveTypeLabel(leave.leave_type)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span>{leave.start_date}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span>{leave.end_date}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border w-fit ${getStatusInfo(leave.status).color}`}>
                                                        {getStatusInfo(leave.status).label}
                                                    </span>
                                                    {leave.approved_by_name && (
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                            de {leave.approved_by_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => openEdit(leave)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors" title="Editează">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteModalId(leave.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors" title="Șterge">
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

                {!loading && totalItems > 0 && (
                    <Pagination
                        currentPage={preferences.currentPage}
                        pageSize={preferences.pageSize}
                        totalItems={totalItems}
                        onPageChange={(page) => setCurrentPage(PAGE_ID, page)}
                        onPageSizeChange={(size) => setPageSize(PAGE_ID, size)}
                    />
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    {editingId ? 'Modifică Concediu' : 'Adaugă Concediu Nou'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Completează datele referitoare la concediu</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="p-5 overflow-y-auto">
                            <form id="leaveForm" onSubmit={handleSave} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Angajat *</label>
                                    <SearchableSelect
                                        value={formData.user_id}
                                        onChange={(val) => setFormData({...formData, user_id: val})}
                                        options={users.map(u => ({
                                            value: u.id,
                                            label: u.full_name,
                                            subLabel: `#${u.employee_code}`
                                        }))}
                                        placeholder="-- Selectează angajat --"
                                        searchPlaceholder="Caută angajat..."
                                        className={editingId !== null ? "pointer-events-none opacity-50" : ""}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Tip Concediu *</label>
                                    <select 
                                        required
                                        value={formData.leave_type}
                                        onChange={e => setFormData({...formData, leave_type: e.target.value})}
                                        className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                    >
                                        <option value="odihna">Concediu de Odihnă</option>
                                        <option value="medical">Concediu Medical</option>
                                        <option value="fara_plata">Concediu Fără Plată</option>
                                        <option value="altul">Altul</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status *</label>
                                    <select 
                                        required
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                        className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                                    >
                                        <option value="approved">Aprobat</option>
                                        <option value="pending">În așteptare</option>
                                        <option value="rejected">Respins</option>
                                    </select>
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aprobat de (Opțional)</label>
                                    <SearchableSelect 
                                        options={admins.map(a => ({
                                            value: a.id,
                                            label: a.full_name
                                        }))}
                                        value={formData.approved_by_id}
                                        onChange={val => setFormData({...formData, approved_by_id: val})}
                                        placeholder="-- Selectează Admin --"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Data Început *</label>
                                        <input 
                                            type="date" required
                                            value={formData.start_date}
                                            onChange={e => setFormData({...formData, start_date: e.target.value})}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Data Sfârșit *</label>
                                        <input 
                                            type="date" required
                                            value={formData.end_date}
                                            min={formData.start_date}
                                            onChange={e => setFormData({...formData, end_date: e.target.value})}
                                            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Note / Detalii (Opțional)</label>
                                    <textarea 
                                        rows="3"
                                        value={formData.notes}
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all shadow-sm resize-none"
                                        placeholder="Ex: Bilet medical nr. 123..."
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)}
                                className="px-5 h-10 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm shadow-sm"
                            >
                                Anulează
                            </button>
                            <button 
                                type="submit" 
                                form="leaveForm"
                                className="px-5 h-10 text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-sm transition-all font-semibold text-sm flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Salvează
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModalId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Șterge Concediul</h3>
                        <p className="text-slate-500 text-sm mb-6">Sigur dorești să ștergi acest concediu? Această acțiune este ireversibilă.</p>
                        
                        <div className="flex gap-3 justify-center">
                            <button 
                                onClick={() => setDeleteModalId(null)}
                                className="px-5 h-10 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm shadow-sm flex-1"
                            >
                                Anulează
                            </button>
                            <button 
                                onClick={() => handleDelete(deleteModalId)}
                                className="px-5 h-10 text-white bg-red-600 rounded-full hover:bg-red-700 shadow-sm transition-all font-semibold text-sm flex-1"
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
