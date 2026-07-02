import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, CheckCircle2, Plus, Trash2, AlertTriangle, X, Clock } from 'lucide-react';
import api from '../lib/api';

const DEFAULT_HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 07:00 to 18:00

export default function TasksCalendarView({ tasks, users, workers, sites, fetchData, openModal }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [showWorkers, setShowWorkers] = useState(false);
    
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [deleteInstanceDate, setDeleteInstanceDate] = useState(null);

    const handleDeleteClick = (task, instanceStart) => {
        setTaskToDelete(task);
        setDeleteInstanceDate(instanceStart);
    };

    const confirmDelete = async (action) => {
        try {
            const dateStr = deleteInstanceDate ? new Date(deleteInstanceDate.getTime() - deleteInstanceDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : '';
            if (taskToDelete.frequency === 'Zilnic') {
                await api.delete(`/admin/tasks/${taskToDelete.id}/instance?action=${action}&date=${dateStr}`);
            } else {
                await api.delete(`/admin/tasks/${taskToDelete.id}`);
            }
            fetchData(false);
            setTaskToDelete(null);
            setDeleteInstanceDate(null);
        } catch (err) {
            alert('Eroare la ștergerea sarcinii: ' + (err.response?.data?.detail || err.message));
        }
    };

    const dynamicHours = useMemo(() => {
        let max = 18;
        if (Array.isArray(tasks)) {
            tasks.forEach(task => {
                if (task.start_time) {
                    const d = new Date(task.start_time);
                    if (d.getHours() > max) max = d.getHours();
                }
                if (task.end_time) {
                    const d = new Date(task.end_time);
                    if (d.getHours() > max) max = d.getHours();
                }
            });
        }
        const length = max - 7 + 1;
        return Array.from({ length: Math.max(12, length) }, (_, i) => i + 7);
    }, [tasks]);

    const filteredAssignees = useMemo(() => {
        let list = [...users];
        if (showWorkers && workers) {
            list = [...list, ...workers];
        }
        
        if (searchQuery.trim()) {
            const lower = searchQuery.toLowerCase();
            list = list.filter(u => {
                const name = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
                return name.toLowerCase().includes(lower);
            });
        }
        return list;
    }, [users, workers, showWorkers, searchQuery]);

    const startOfWeek = useMemo(() => {
        const date = new Date(currentDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(date.setDate(diff));
    }, [currentDate]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [startOfWeek]);

    const nextWeek = () => {
        const next = new Date(currentDate);
        next.setDate(next.getDate() + 7);
        setCurrentDate(next);
    };

    const prevWeek = () => {
        const prev = new Date(currentDate);
        prev.setDate(prev.getDate() - 7);
        setCurrentDate(prev);
    };

    const goToCurrentWeek = () => {
        setCurrentDate(new Date());
    };

    const formatDayHeader = (date) => {
        const days = ['DUM', 'LUN', 'MAR', 'MIE', 'JOI', 'VIN', 'SÂM'];
        return {
            name: days[date.getDay()],
            num: date.getDate()
        };
    };

    const handleDragStart = (e, task) => {
        e.dataTransfer.setData('taskId', task.id);
        // Add a slight transparency to the element being dragged
        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
    };

    const handleDrop = async (e, date, hour) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) return;

        // Calculate new start and end time based on the dropped cell
        // We assume dropping it sets it to exactly that hour. We keep the same duration if possible.
        let durationHours = 1;
        if (task.start_time && task.end_time) {
            const start = new Date(task.start_time);
            const end = new Date(task.end_time);
            durationHours = (end - start) / (1000 * 60 * 60);
        }

        const newStart = new Date(date);
        newStart.setHours(hour, 0, 0, 0);

        const newEnd = new Date(newStart);
        newEnd.setHours(newStart.getHours() + durationHours);

        const pad = (n) => n.toString().padStart(2, '0');
        const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

        try {
            const dataToSubmit = {
                title: task.title,
                description: task.description || '',
                status: task.status,
                priority: task.priority || 'Medie',
                frequency: task.frequency || 'Punctual',
                start_time: formatLocal(newStart),
                end_time: formatLocal(newEnd),
                due_date: formatLocal(newStart).split('T')[0], // update due_date to match
                assignee_id: task.assignee_id || null,
                site_id: task.site_id || null,
            };
            if (!dataToSubmit.assignee_id) delete dataToSubmit.assignee_id;
            
            await api.put(`/admin/tasks/${task.id}`, dataToSubmit);
            fetchData(false);
        } catch (err) {
            alert('Eroare la mutarea task-ului: ' + (err.response?.data?.detail || err.message));
        }
    };

    const monthNames = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
    
    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full">
            {/* Main Calendar Area */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                {/* Calendar Header */}
                <div className="bg-blue-600 text-white px-6 h-[72px] flex justify-between items-center rounded-t-3xl border-b border-blue-700 shrink-0">
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="w-6 h-6" />
                        <h2 className="text-xl font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-2xl overflow-hidden text-white shadow-sm border border-white/20">
                        <button onClick={prevWeek} className="px-3 py-1.5 hover:bg-white/20 border-r border-white/20 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={goToCurrentWeek} className="px-4 py-1.5 font-medium hover:bg-white/20 text-sm transition-colors">
                            Săpt. curentă
                        </button>
                        <button onClick={nextWeek} className="px-3 py-1.5 hover:bg-white/20 border-l border-white/20 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-[50px_repeat(7,1fr)] h-[60px] border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <div className="border-r border-slate-200 dark:border-slate-700"></div> {/* Empty corner */}
                    {weekDays.map((date, i) => {
                        const header = formatDayHeader(date);
                        const isToday = new Date().toDateString() === date.toDateString();
                        return (
                            <div key={i} className={`flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-700 last:border-0 ${
                                isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                            }`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-500' : 'text-slate-500'}`}>{header.name}</span>
                                <span className={`text-lg font-black mt-0.5 ${
                                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                                }`}>{header.num}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Calendar Grid Body */}
                <div className="relative">
                    <div className="grid grid-cols-[50px_repeat(7,1fr)] min-h-full">
                        {dynamicHours.map((hour) => (
                            <React.Fragment key={hour}>
                                {/* Time Label */}
                                <div className="text-[10px] text-slate-400 font-medium text-center py-1.5 border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-center">
                                    {hour.toString().padStart(2, '0')}:00
                                </div>
                                
                                {/* Drop Cells for each day */}
                                {weekDays.map((date, dayIdx) => {
                                    const handleCellAction = (assigneeId = null) => {
                                        const newStart = new Date(date);
                                        newStart.setHours(hour, 0, 0, 0);
                                        const newEnd = new Date(newStart);
                                        newEnd.setHours(hour + 1, 0, 0, 0);
                                        
                                        const pad = (n) => n.toString().padStart(2, '0');
                                        const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                        
                                        openModal(null, { 
                                            startTime: formatLocal(newStart), 
                                            endTime: formatLocal(newEnd), 
                                            assigneeId 
                                        });
                                    };

                                    return (
                                        <div 
                                            key={`${dayIdx}-${hour}`} 
                                            className="border-b border-r border-slate-100 dark:border-slate-800/50 relative group transition-colors min-h-[60px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
                                                const assigneeId = e.dataTransfer.getData('assigneeId');
                                                if (assigneeId) {
                                                    handleCellAction(assigneeId);
                                                } else {
                                                    handleDrop(e, date, hour);
                                                }
                                            }}
                                            onClick={() => handleCellAction()}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                                                <div className="w-8 h-8 rounded-full bg-blue-500 shadow-sm flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform duration-200">
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        {/* Absolute Positioned Tasks */}
                        {tasks.flatMap((task, index) => {
                            let origStart = task.start_time ? new Date(task.start_time) : null;
                            
                            // Fallback to due_date if start_time is missing
                            if (!origStart && task.due_date) {
                                origStart = new Date(task.due_date);
                                // Stagger default hours (8:00, 9:00, 10:00, etc.) based on index so they don't overlap
                                origStart.setHours(8 + (index % 9), 0, 0, 0);
                            }
                            
                            if (!origStart) return [];
                            
                            const origEnd = task.end_time ? new Date(task.end_time) : new Date(origStart.getTime() + 60 * 60 * 1000); // Default 1hr
                            
                            const instances = [];
                            
                            if (task.frequency === 'Zilnic') {
                                // Calculate daily duration
                                let dailyDurationHours = (origEnd.getHours() + origEnd.getMinutes() / 60) - (origStart.getHours() + origStart.getMinutes() / 60);
                                if (dailyDurationHours <= 0) dailyDurationHours = 1; // Default to 1 hour if end time is weird
                                
                                const startDay = new Date(origStart);
                                startDay.setHours(0, 0, 0, 0);
                                const endDay = new Date(origEnd);
                                endDay.setHours(23, 59, 59, 999);
                                
                                weekDays.forEach(day => {
                                    if (day.getDay() === 0) return; // Skip Sundays!
                                    
                                    const dayStr = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                                    
                                    if (task.deleted_dates && task.deleted_dates.includes(dayStr)) {
                                        return;
                                    }
                                    
                                    if (task.recurrence_end_date) {
                                        const endDate = new Date(task.recurrence_end_date);
                                        endDate.setHours(23, 59, 59, 999);
                                        if (day > endDate) return;
                                    }
                                    
                                    if (day >= startDay && day <= endDay) {
                                        const instanceStart = new Date(day);
                                        instanceStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
                                        const instanceEnd = new Date(instanceStart.getTime() + dailyDurationHours * 60 * 60 * 1000);
                                        instances.push({ start: instanceStart, end: instanceEnd });
                                    }
                                });
                            } else {
                                // Check if task falls within this week
                                if (origStart >= weekDays[0] && origStart <= new Date(weekDays[6].getTime() + 24*60*60*1000)) {
                                    instances.push({ start: origStart, end: origEnd });
                                }
                            }
                            
                            return instances.map((inst, instIdx) => {
                                const start = inst.start;
                                const end = inst.end;

                                const dayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1; // 0 is LUN, 6 is DUM
                                
                                // Calculate top and height
                                let startHourOffset = start.getHours() - dynamicHours[0] + (start.getMinutes() / 60);
                                
                                // Prevent tasks from floating outside the grid if they start before 07:00
                                if (startHourOffset < 0) startHourOffset = 0;
                                
                                let durationHours = (end - start) / (1000 * 60 * 60);
                                
                                // Cap duration to the end of the calendar day
                                const maxDuration = dynamicHours.length - startHourOffset;
                                if (durationHours > maxDuration) {
                                    durationHours = maxDuration;
                                }
                                
                                const ROW_HEIGHT = 60;
                                const top = startHourOffset * ROW_HEIGHT;
                                const height = Math.max(durationHours * ROW_HEIGHT, 30); // min 30px height
                            
                            const isDone = task.status === 'Finalizat' || task.status === 'Done';
                            const isDoing = task.status === 'În curs' || task.status === 'Doing';
                            
                            let assigneeName = 'Nealocat';
                            let taskUser = null;
                            if (task.assignee_id) {
                                taskUser = users.find(x => x.id === task.assignee_id) || workers?.find(x => x.id === task.assignee_id);
                                if (taskUser) assigneeName = taskUser.full_name || `${taskUser.first_name || ''} ${taskUser.last_name || ''}`.trim();
                            }

                            // Colors based on status (like screenshot)
                            let bgClass = "bg-yellow-50 dark:bg-yellow-900/30"; // Yellowish
                            let borderClass = "border-yellow-400 dark:border-yellow-600";
                            let borderStyle = "solid";
                            let borderWidth = "2px";
                            
                            if (isDone) {
                                bgClass = "bg-emerald-50 dark:bg-emerald-900/30";
                                borderClass = "border-emerald-500 dark:border-emerald-400";
                                borderStyle = "solid";
                                borderWidth = "2px"; // Pronounced outline
                            } else if (isDoing) {
                                bgClass = "bg-blue-50 dark:bg-blue-900/30";
                                borderClass = "border-blue-400 dark:border-blue-500";
                            }

                            return (
                                <div 
                                    key={`${task.id}-${instIdx}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.opacity = '0.7'; }}
                                    onDragLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.currentTarget.style.opacity = '1';
                                        const assigneeId = e.dataTransfer.getData('assigneeId');
                                        if (assigneeId) {
                                            try {
                                                const dataToSubmit = {
                                                    title: task.title,
                                                    description: task.description,
                                                    status: task.status,
                                                    priority: task.priority,
                                                    frequency: task.frequency,
                                                    start_time: task.start_time,
                                                    end_time: task.end_time,
                                                    due_date: task.due_date,
                                                    assignee_id: assigneeId,
                                                };
                                                await api.put(`/admin/tasks/${task.id}`, dataToSubmit);
                                                fetchData(false);
                                            } catch (err) {
                                                alert('Eroare la asignare: ' + (err.response?.data?.detail || err.message));
                                            }
                                        }
                                    }}
                                    onClick={(e) => { e.stopPropagation(); openModal(task); }}
                                    className={`absolute rounded p-1.5 cursor-pointer transition-shadow hover:shadow-md ${bgClass} ${borderClass} group/task`}
                                    style={{
                                        left: `calc(50px + (${dayIndex} * ((100% - 50px) / 7)) + 2px)`,
                                        width: `calc(((100% - 50px) / 7) - 4px)`,
                                        top: `${top + 2}px`,
                                        height: `${height - 4}px`,
                                        borderWidth: borderWidth,
                                        borderStyle: borderStyle,
                                    }}
                                >
                                    <div className={`h-full w-full relative ${borderClass.replace('border-', 'text-')}`}>
                                        <div className="flex justify-between items-start gap-1.5 h-full">
                                            {/* Left: Title, Site, Desc */}
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <div className="flex items-start gap-1 font-bold text-[10px] leading-[1.1] text-slate-800 dark:text-slate-200">
                                                    {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                                                    <span className={`${height > 50 ? 'line-clamp-2' : 'line-clamp-1'} break-words pr-1`}>{task.title}</span>
                                                </div>
                                                
                                                {task.site_id && sites && (
                                                    <div className="mt-1.5 flex items-center gap-0.5 font-bold text-[8.5px] leading-tight truncate opacity-80" style={{ color: 'inherit' }}>
                                                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                        <span className="truncate">{sites.find(s => s.id === task.site_id)?.name || 'Șantier'}</span>
                                                    </div>
                                                )}
                                                
                                                {height > 60 && task.description && (
                                                    <div className="hidden sm:flex items-center gap-0.5 mt-1 text-[9px] opacity-70 leading-tight" style={{ color: 'inherit' }}>
                                                        <span className="line-clamp-1">{task.description}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Right: Avatar & Name */}
                                            <div className="flex flex-col items-center shrink-0 w-10 mt-0.5" style={{ color: 'inherit' }}>
                                                {taskUser ? (
                                                    <div className="w-6 h-6 mb-0.5 shrink-0 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center overflow-hidden shadow-sm border border-current opacity-90">
                                                        {taskUser.avatar_path ? (
                                                            <img src={taskUser.avatar_path.startsWith('http') ? taskUser.avatar_path : `${import.meta.env.VITE_API_URL || ''}${taskUser.avatar_path}`} alt={assigneeName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[9px] font-bold" style={{ color: 'inherit' }}>
                                                                {assigneeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : null}
                                                <span className="text-[8px] font-semibold text-center leading-[1.1] truncate w-full opacity-90">
                                                    {assigneeName.split(' ')[0]}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Delete Button */}
                                        <div 
                                            className="absolute -top-3 -right-3 opacity-0 group-hover/task:opacity-100 transition-opacity p-1 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/50 z-20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteClick(task, start);
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        </div>
                                        
                                        {/* Custom Tooltip */}
                                        <div className={`absolute top-full mt-2 w-48 bg-slate-900 dark:bg-slate-800 text-white p-2.5 rounded-xl shadow-2xl opacity-0 invisible group-hover/task:opacity-100 group-hover/task:visible transition-all duration-200 z-[100] pointer-events-none border border-slate-700/50 ${dayIndex > 4 ? 'right-0' : 'left-0'}`}>
                                            <div className="font-bold text-[11px] mb-1.5 leading-tight text-white">{task.title}</div>
                                            {task.site_id && sites && (
                                                <div className="flex items-start gap-1.5 text-slate-300 mb-1.5 text-[9.5px] font-medium">
                                                    <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                                                    <span className="leading-tight">{sites.find(s => s.id === task.site_id)?.name || 'Șantier'}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 text-slate-300 mb-1.5 text-[9.5px] font-medium">
                                                <Clock className="w-3 h-3 shrink-0 text-slate-400" />
                                                <span>{start.toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'})} - {end.toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-300 mb-1.5 text-[9.5px] font-medium">
                                                <div className="w-3.5 h-3.5 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {taskUser?.avatar_path ? (
                                                        <img src={taskUser.avatar_path.startsWith('http') ? taskUser.avatar_path : `${import.meta.env.VITE_API_URL || ''}${taskUser.avatar_path}`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[6px] font-bold text-white">{assigneeName.substring(0,1)}</span>
                                                    )}
                                                </div>
                                                <span>{assigneeName}</span>
                                            </div>
                                            {task.description && (
                                                <div className="mt-2.5 text-slate-400 border-t border-slate-700/50 pt-2 text-[9.5px] leading-tight">
                                                    {task.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                        })}
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Assignees */}
            <div className="w-full lg:w-56 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden shrink-0">
                <div className="px-4 h-[72px] bg-blue-600 border-b border-blue-700 flex flex-col justify-center shrink-0 gap-0.5">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base text-white">Responsabili</h3>
                        <button 
                            type="button"
                            onClick={() => setShowWorkers(!showWorkers)}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showWorkers ? 'bg-white' : 'bg-blue-800'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full transition-transform ${showWorkers ? 'translate-x-3.5 bg-blue-600' : 'translate-x-0.5 bg-white'}`} />
                        </button>
                    </div>
                    <span className="text-[10px] font-medium text-blue-200">Arată și muncitorii în listă</span>
                </div>
                
                <div className="px-3 h-[60px] bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center shrink-0">
                    {/* Search Bar */}
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Caută..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 shadow-sm"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {filteredAssignees.map(u => {
                        const name = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Fără nume';
                        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        
                        return (
                            <div 
                                key={u.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('assigneeId', u.id);
                                    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
                                }}
                                onDragEnd={(e) => { e.target.style.opacity = '1'; }}
                                className="p-2 bg-white dark:bg-slate-800 rounded-2xl cursor-grab active:cursor-grabbing hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-2"
                            >
                                {/* Avatar */}
                                <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 border border-blue-200 dark:border-blue-700/50 flex items-center justify-center overflow-hidden">
                                    {u.avatar_path ? (
                                        <img src={u.avatar_path.startsWith('http') ? u.avatar_path : `${import.meta.env.VITE_API_URL || ''}${u.avatar_path}`} alt={name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">{initials}</span>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-[11px] text-slate-700 dark:text-slate-200 leading-tight truncate">
                                        {name}
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-0.5 leading-tight truncate">
                                        {u.role_name ? `Echipa / ${u.role_name}` : 'Muncitor'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {filteredAssignees.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-500">
                            Nu s-au găsit persoane.
                        </div>
                    )}
                </div>
            </div>
            {/* Delete Modal */}
            {taskToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 text-red-600 mx-auto">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">
                                Ștergere Sarcină
                            </h3>
                            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
                                {taskToDelete.frequency === 'Zilnic' 
                                    ? "Aceasta este o sarcină repetitivă. Ce dorești să ștergi?" 
                                    : "Ești sigur că vrei să ștergi această sarcină? Acțiunea este ireversibilă."}
                            </p>

                            {taskToDelete.frequency === 'Zilnic' ? (
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => confirmDelete('this')}
                                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium transition-colors text-left flex flex-col"
                                    >
                                        <span>Doar această instanță</span>
                                        <span className="text-xs font-normal text-slate-500">Șterge doar sarcina din data selectată.</span>
                                    </button>
                                    <button 
                                        onClick={() => confirmDelete('following')}
                                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium transition-colors text-left flex flex-col"
                                    >
                                        <span>Aceasta și cele viitoare</span>
                                        <span className="text-xs font-normal text-slate-500">Oprește repetarea începând cu această dată.</span>
                                    </button>
                                    <button 
                                        onClick={() => confirmDelete('all')}
                                        className="w-full py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium transition-colors text-left flex flex-col"
                                    >
                                        <span>Toate sarcinile din serie</span>
                                        <span className="text-xs font-normal opacity-80">Șterge complet sarcina repetitivă.</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => { setTaskToDelete(null); setDeleteInstanceDate(null); }}
                                        className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Anulează
                                    </button>
                                    <button 
                                        onClick={() => confirmDelete('all')}
                                        className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-colors"
                                    >
                                        Șterge
                                    </button>
                                </div>
                            )}

                            {taskToDelete.frequency === 'Zilnic' && (
                                <button 
                                    onClick={() => { setTaskToDelete(null); setDeleteInstanceDate(null); }}
                                    className="w-full mt-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Anulează
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const CalendarIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
        <line x1="16" x2="16" y1="2" y2="6"/>
        <line x1="8" x2="8" y1="2" y2="6"/>
        <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
);
