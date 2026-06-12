import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { DialogOverlay } from '../../components/ui/DialogOverlay';
import SearchableSelect from '../../components/SearchableSelect';
import TasksCalendarView from '../../components/TasksCalendarView';
import { useAdminStore } from '../../store/adminStore';
import { 
    Plus, Search, Edit2, Trash2, Calendar as CalendarIcon, 
    Clock, AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, X, Calendar, ArrowDown, ArrowUp, MapPin
} from 'lucide-react';

export default function TasksManagement() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { admin } = useAdminStore();
    
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    
    const [tasks, setTasks] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [users, setUsers] = useState([]);
    const [showWorkers, setShowWorkers] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const getTodayDateStr = () => new Date().toISOString().split('T')[0];
    const getTodayDateTimeStr = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        frequency: 'Punctual',
        priority: 'Medie',
        status: 'De făcut',
        assignee_id: '',
        due_date: getTodayDateStr(),
        reminder: getTodayDateTimeStr(),
        site_id: ''
    });

    const [sites, setSites] = useState([]);

    const columns = [
        { id: 'De făcut', title: 'To do', bgColor: 'bg-slate-50 dark:bg-gray-800/50', dotColor: 'bg-slate-400' },
        { id: 'În curs', title: 'Doing', bgColor: 'bg-blue-50/50 dark:bg-blue-900/10', dotColor: 'bg-blue-500' },
        { id: 'Finalizat', title: 'Done', bgColor: 'bg-emerald-50/50 dark:bg-emerald-900/10', dotColor: 'bg-emerald-500' }
    ];

    const priorityColors = {
        'Scăzută': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        'Medie': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'Ridicată': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        'Critică': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };

    const statusColors = {
        'De făcut': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        'În curs': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Finalizat': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    };

    const [quickAddText, setQuickAddText] = useState({
        'De făcut': '',
        'În curs': '',
        'Finalizat': ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const [tasksRes, usersRes, sitesRes] = await Promise.all([
                api.get('/admin/tasks/'),
                api.get('/admin/users/', { params: { page_size: 1000 } }),
                api.get('/admin/sites/', { params: { page_size: 1000, status: 'active' } })
            ]);
            
            setTasks(tasksRes.data.items || tasksRes.data.tasks || (Array.isArray(tasksRes.data) ? tasksRes.data : []));
            setSites(sitesRes.data.items || sitesRes.data.sites || (Array.isArray(sitesRes.data) ? sitesRes.data : []));
            
            let loadedAllUsers = [];
            if (usersRes.data.items) loadedAllUsers = usersRes.data.items;
            else if (usersRes.data.users) loadedAllUsers = usersRes.data.users;
            else if (Array.isArray(usersRes.data)) loadedAllUsers = usersRes.data;

            const workerUsers = loadedAllUsers.filter(u => u.role_name?.toLowerCase().includes('muncitor') || u.role_id === 3);
            setWorkers(workerUsers);

            const staffUsers = loadedAllUsers.filter(u => {
                if (u.role_name?.toLowerCase().includes('muncitor') || u.role_id === 3) return false;
                if (u.role_name === 'Super Administrator' || u.role_id === 1) {
                    return user?.role_name === 'Super Administrator' || user?.role_id === 1;
                }
                return true;
            });
            setUsers(staffUsers);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Eroare la încărcarea datelor. Vă rugăm reîncercați.');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (task = null, options = {}) => {
        const formatLocal = (isoStr) => {
            if (!isoStr) return '';
            // If it's already local format without Z (from options), return it
            if (isoStr.length === 16 && !isoStr.includes('Z')) return isoStr;
            const d = new Date(isoStr);
            if (isNaN(d)) return isoStr.slice(0, 16);
            const pad = (n) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        if (task) {
            setEditingTask(task);
            setFormData({
                title: task.title || '',
                description: task.description || '',
                frequency: task.frequency || 'Punctual',
                priority: task.priority || 'Medie',
                status: task.status || 'De făcut',
                assignee_id: task.assignee_id || '',
                start_time: formatLocal(task.start_time),
                end_time: formatLocal(task.end_time),
                due_date: task.due_date ? task.due_date.split('T')[0] : getTodayDateStr(),
                reminder: formatLocal(task.reminder),
                site_id: task.site_id || ''
            });
        } else {
            setEditingTask(null);
            setFormData({
                title: '',
                description: '',
                frequency: 'Punctual',
                priority: 'Medie',
                status: 'De făcut',
                assignee_id: options.assigneeId || '',
                start_time: options.startTime || '',
                end_time: options.endTime || '',
                due_date: options.startTime ? options.startTime.split('T')[0] : getTodayDateStr(),
                reminder: '',
                site_id: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSubmit = { ...formData };
            if (!dataToSubmit.due_date) delete dataToSubmit.due_date;
            if (!dataToSubmit.reminder) delete dataToSubmit.reminder;
            if (!dataToSubmit.start_time) delete dataToSubmit.start_time;
            if (!dataToSubmit.end_time) delete dataToSubmit.end_time;
            
            if (!dataToSubmit.assignee_id) dataToSubmit.assignee_id = null;
            if (!dataToSubmit.site_id) dataToSubmit.site_id = null;

            if (editingTask) {
                await api.put(`/admin/tasks/${editingTask.id}`, dataToSubmit);
            } else {
                await api.post('/admin/tasks/', dataToSubmit);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert('Eroare la salvare: ' + (err.response?.data?.detail || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleQuickAdd = async (columnId) => {
        const text = quickAddText[columnId] || '';
        if (!text.trim()) return;

        try {
            await api.post('/admin/tasks/', {
                title: text.trim(),
                status: columnId,
                priority: 'Medie',
                frequency: 'Punctual'
            });
            setQuickAddText(prev => ({ ...prev, [columnId]: '' }));
            fetchData();
        } catch (err) {
            alert('Eroare la adăugare rapidă: ' + err.message);
        }
    };

    const handleQuickAddKeyDown = (e, columnId) => {
        if (e.key === 'Enter') handleQuickAdd(columnId);
    };

    const handleDeleteClick = (task) => {
        setTaskToDelete(task);
        setIsDeleteModalOpen(true);
        setIsModalOpen(false);
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/admin/tasks/${taskToDelete.id}`);
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
            fetchData();
        } catch (err) {
            alert('Eroare la ștergere: ' + err.message);
        }
    };

    const handleToggleTaskStatus = async (task) => {
        let nextStatus;
        if (task.status === 'Finalizat') {
            nextStatus = 'De făcut'; // Uncheck -> înapoi la To Do
        } else {
            nextStatus = 'Finalizat'; // Check -> direct la Done (din To Do sau Doing)
        }

        try {
            const dataToSubmit = {
                title: task.title,
                description: task.description,
                status: nextStatus,
                priority: task.priority,
                frequency: task.frequency,
                assignee_id: task.assignee_id || null,
                due_date: task.due_date || null
            };
            if (!dataToSubmit.assignee_id) delete dataToSubmit.assignee_id;
            
            await api.put(`/admin/tasks/${task.id}`, dataToSubmit);
            fetchData();
        } catch (err) {
            alert('Eroare la schimbarea statusului: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleMoveTask = async (task, direction) => {
        const states = ['De făcut', 'În curs', 'Finalizat'];
        const currentIndex = states.indexOf(task.status);
        if (currentIndex === -1) return;
        
        let nextIndex = currentIndex + (direction === 'forward' ? 1 : -1);
        if (nextIndex < 0 || nextIndex >= states.length) return;
        
        let nextStatus = states[nextIndex];

        try {
            const dataToSubmit = {
                title: task.title,
                description: task.description,
                status: nextStatus,
                priority: task.priority,
                frequency: task.frequency,
                assignee_id: task.assignee_id || null,
                due_date: task.due_date || null
            };
            if (!dataToSubmit.assignee_id) delete dataToSubmit.assignee_id;
            
            await api.put(`/admin/tasks/${task.id}`, dataToSubmit);
            fetchData();
        } catch (err) {
            alert('Eroare la mutarea task-ului: ' + (err.response?.data?.detail || err.message));
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const formatAssigneeDropdown = () => {
        let combined = [...users.map(u => ({
            value: u.id,
            label: u.full_name || 'Fără Nume',
            subLabel: u.role_name || 'Admin',
            avatar: u.avatar_path
        }))];

        if (showWorkers) {
            combined = [...combined, ...workers.map(w => ({
                value: w.id,
                label: `${w.first_name || ''} ${w.last_name || ''}`.trim() || w.full_name || 'Fără Nume',
                subLabel: 'Muncitor',
                avatar: w.avatar_path
            }))];
        }

        return [
            { value: '', label: 'Nealocat' },
            ...combined
        ];
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Management Sarcini
                    </h1>
                </div>
                {/* View Toggles */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Listă
                    </button>
                    <button 
                        onClick={() => setViewMode('calendar')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Calendar (Orare)
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {viewMode === 'calendar' ? (
                <TasksCalendarView 
                    tasks={tasks} 
                    users={users} 
                    workers={workers} 
                    sites={sites}
                    fetchData={fetchData} 
                    openModal={openModal} 
                />
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden rounded-3xl flex-1 flex flex-col min-h-0 mb-4">
                    {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <div className="col-span-3 pl-8">Nume</div>
                    <div className="col-span-2 text-center">Șantier</div>
                    <div className="col-span-2 text-center">Responsabil</div>
                    <div className="col-span-2 text-center">Dată limită</div>
                    <div className="col-span-1 text-center">Prioritate</div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-1 text-center">Acțiuni</div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-2">
                    {columns.map(column => {
                        const columnTasks = tasks.filter(t => t.status === column.id);
                        
                        return (
                            <div key={column.id} className="mb-2">
                                {/* Group Header */}
                                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 pb-1 mt-2">
                                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                                        <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                                        <h3 className="text-sm">{column.title}</h3>
                                    </div>
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                                        {columnTasks.length}
                                    </span>
                                </div>

                                {/* Task Rows */}
                                <div className="">
                                    {columnTasks.length === 0 && (
                                        <div className="py-2 px-8 text-[11px] text-slate-400 italic">
                                            Niciun task în această secțiune.
                                        </div>
                                    )}

                                    {columnTasks.map(task => (
                                        <div 
                                            key={task.id} 
                                            className="grid grid-cols-12 gap-2 items-center py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group transition-colors px-3 border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                                        >
                                            {/* Nume & Checkbox */}
                                            <div className="col-span-3 pl-2 flex items-center gap-3">
                                                <button 
                                                    onClick={() => handleToggleTaskStatus(task)}
                                                    className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${task.status === 'Finalizat' ? 'border-emerald-500 bg-emerald-500 hover:bg-emerald-600 hover:border-emerald-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer'}`}
                                                >
                                                    {task.status === 'Finalizat' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className={`font-semibold text-[14px] line-clamp-1 ${task.status === 'Finalizat' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Șantier */}
                                            <div className="col-span-2 flex items-center justify-center">
                                                {task.site_id ? (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg max-w-full">
                                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                                                            {sites.find(s => s.id === task.site_id)?.name || 'Șantier sters'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">-</span>
                                                )}
                                            </div>

                                            {/* Responsabil */}
                                            <div className="col-span-2 flex items-center justify-center gap-2">
                                                {(() => {
                                                    let avatarUrl = null;
                                                    let roleName = null;
                                                    if (task.assignee_id) {
                                                        const u = users.find(x => x.id === task.assignee_id);
                                                        if (u) {
                                                            if (u.avatar_path) avatarUrl = u.avatar_path;
                                                            roleName = u.role_name || 'Admin';
                                                        } else {
                                                            const w = workers.find(x => x.id === task.assignee_id);
                                                            if (w) {
                                                                if (w.avatar_path) avatarUrl = w.avatar_path;
                                                                roleName = 'Muncitor';
                                                            }
                                                        }
                                                    }
                                                    
                                                    let AvatarEl = (
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shrink-0">
                                                            {getInitials(task.assignee?.full_name)}
                                                        </div>
                                                    );
                                                    
                                                    if (avatarUrl) {
                                                        const imgSrc = avatarUrl.startsWith('http') ? avatarUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${avatarUrl}`;
                                                        AvatarEl = (
                                                            <div className="relative w-7 h-7 shrink-0">
                                                                <img src={imgSrc} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" onError={e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                                                                <div className="hidden absolute inset-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                                    {getInitials(task.assignee?.full_name)}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <>
                                                            {AvatarEl}
                                                            <div className="flex flex-col min-w-0 items-start">
                                                                <span className="text-[13px] text-slate-600 dark:text-slate-400 font-medium line-clamp-1 leading-tight">
                                                                    {task.assignee?.full_name || 'Nealocat'}
                                                                </span>
                                                                {roleName && (
                                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 leading-tight mt-0.5">
                                                                        {roleName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Due Date */}
                                            <div className="col-span-2 flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                                <div className="p-1 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-md shrink-0">
                                                    <CalendarIcon className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="whitespace-nowrap">{task.due_date ? new Date(task.due_date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</span>
                                            </div>

                                            {/* Priority */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${task.priority === 'Medie' ? 'bg-amber-100 text-amber-700' : (priorityColors[task.priority] || priorityColors['Medie'])}`}>
                                                    {task.priority}
                                                </span>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                    task.status === 'Finalizat' ? 'bg-emerald-100 text-emerald-700' :
                                                    task.status === 'În curs' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {task.status}
                                                </div>
                                            </div>

                                            {/* Acțiuni */}
                                            <div className="col-span-1 flex justify-center gap-1.5">
                                                {task.status !== 'De făcut' && (
                                                    <button onClick={() => handleMoveTask(task, 'backward')} className="p-1.5 text-red-500 hover:text-red-700 rounded-full transition-colors border border-slate-200 shadow-sm bg-white hover:bg-red-50" title="Mută înapoi (Sus)">
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {task.status !== 'Finalizat' && (
                                                    <button onClick={() => handleMoveTask(task, 'forward')} className="p-1.5 text-emerald-500 hover:text-emerald-700 rounded-full transition-colors border border-slate-200 shadow-sm bg-white hover:bg-emerald-50" title="Mută înainte (Jos)">
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); openModal(task); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-full transition-colors border border-slate-200 shadow-sm bg-white hover:bg-slate-50" title="Editează">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(task); }} className="p-1.5 text-slate-400 hover:text-red-600 rounded-full transition-colors border border-slate-200 shadow-sm bg-white hover:bg-slate-50" title="Șterge">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Quick Add Row */}
                                    <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/50">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 px-2">
                                                <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                                                <input
                                                    type="text"
                                                    maxLength={255}
                                                    placeholder="Adaugă task rapid..."
                                                    value={quickAddText[column.id] || ''}
                                                    onChange={(e) => setQuickAddText(prev => ({ ...prev, [column.id]: e.target.value }))}
                                                    onKeyDown={(e) => handleQuickAddKeyDown(e, column.id)}
                                                    className="w-full bg-transparent border-none text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] text-slate-400">
                                                    Max: {255 - (quickAddText[column.id] || '').length} char
                                                </span>
                                                <button 
                                                    onClick={() => handleQuickAdd(column.id)}
                                                    disabled={!quickAddText[column.id]?.trim()}
                                                    className="px-3 py-1 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white text-[10px] font-bold rounded-full transition-colors shadow-sm disabled:cursor-not-allowed"
                                                >
                                                    Adaugă
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            )}

            {/* Fereastra Adaugare/Editare Task */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    {editingTask ? 'Editează Task' : 'Task Nou'}
                                </h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="p-5 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Titlu *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full pl-3 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                                            placeholder="ex: Salut"
                                        />
                                    </div>
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Frecvență
                                        </label>
                                        <SearchableSelect
                                            options={[
                                                { value: 'Punctual', label: 'Punctual' },
                                                { value: 'Zilnic', label: 'Zilnic' },
                                                { value: 'Săptămânal', label: 'Săptămânal' },
                                                { value: 'Lunar', label: 'Lunar' }
                                            ]}
                                            value={formData.frequency}
                                            onChange={(val) => setFormData(prev => ({ ...prev, frequency: val }))}
                                            hideSearch={true}
                                            placeholder="Selectează..."
                                        />
                                    </div>
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Prioritate
                                        </label>
                                        <SearchableSelect
                                            options={[
                                                { value: 'Mică', label: 'Mică' },
                                                { value: 'Medie', label: 'Medie' },
                                                { value: 'Mare', label: 'Mare' }
                                            ]}
                                            value={formData.priority}
                                            onChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                                            hideSearch={true}
                                            placeholder="Selectează..."
                                        />
                                    </div>
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Status
                                        </label>
                                        <SearchableSelect
                                            options={[
                                                { value: 'De făcut', label: 'De făcut' },
                                                { value: 'În curs', label: 'În curs' },
                                                { value: 'Finalizat', label: 'Finalizat' }
                                            ]}
                                            value={formData.status}
                                            onChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                                            hideSearch={true}
                                            placeholder="Selectează..."
                                        />
                                    </div>

                                    <div className="col-span-12">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                                Responsabil
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <label 
                                                    onClick={() => setShowWorkers(!showWorkers)} 
                                                    className="text-[10px] text-slate-500 font-medium cursor-pointer select-none"
                                                >
                                                    Afișează muncitori
                                                </label>
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowWorkers(!showWorkers)}
                                                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showWorkers ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                >
                                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showWorkers ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>
                                        <SearchableSelect
                                            options={formatAssigneeDropdown()}
                                            value={formData.assignee_id}
                                            onChange={(val) => setFormData(prev => ({ ...prev, assignee_id: val }))}
                                            placeholder="Caută și alege responsabil..."
                                        />
                                    </div>
                                    
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Ora Început (Calendar)
                                        </label>
                                        <div className="relative flex items-center">
                                            <div className="absolute left-2 w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center pointer-events-none z-10">
                                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <input
                                                type="datetime-local"
                                                value={formData.start_time || ''}
                                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                                className="w-full pl-10 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Ora Sfârșit (Calendar)
                                        </label>
                                        <div className="relative flex items-center">
                                            <div className="absolute left-2 w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center pointer-events-none z-10">
                                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <input
                                                type="datetime-local"
                                                value={formData.end_time || ''}
                                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                                className="w-full pl-10 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Reminder
                                        </label>
                                        <div className="relative flex items-center">
                                            <div className="absolute left-2 w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center pointer-events-none z-10">
                                                <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <input
                                                type="datetime-local"
                                                value={formData.reminder}
                                                onChange={e => setFormData({ ...formData, reminder: e.target.value })}
                                                className="w-full pl-10 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-6">
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Șantier (Opțional)
                                        </label>
                                        <SearchableSelect
                                            options={[{ value: '', label: 'Fără șantier' }, ...sites.map(s => ({ value: s.id, label: s.name }))]}
                                            value={formData.site_id}
                                            onChange={(val) => setFormData(prev => ({ ...prev, site_id: val }))}
                                            placeholder="Selectează șantier..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descriere</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows="3"
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-2.5 text-gray-900 dark:text-white"
                                        placeholder="Detalii rapide despre task, pași, context..."
                                    ></textarea>
                                </div>
                                
                                <div className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
                                    >
                                        Renunță
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        {saving ? 'Se salvează...' : (editingTask ? 'Salvează task' : 'Salvează task')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmare Stergere Modal (Custom) */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Ești sigur?
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            Vrei să ștergi definitiv task-ul "{taskToDelete?.title}"? Această acțiune nu poate fi anulată.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-5 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-sm rounded-full transition-colors"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 h-10 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-full transition-colors shadow-sm"
                            >
                                Da, șterge!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
