import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import api from '../lib/api';

export default function ShortWorksCalendar({ workOrders = [] }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [syncing, setSyncing] = useState(false);
    const { openDialog } = useUIStore();
    const navigate = useNavigate();

    // Generate week days (Monday to Sunday)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    // Filter work orders that fall in this week
    const weeklyOrders = useMemo(() => {
        return workOrders.filter(wo => {
            const dateStr = wo.start_date || wo.deadline_date;
            if (!dateStr) return false;
            try {
                const datePart = dateStr.split('T')[0];
                const [year, month, day] = datePart.split('-').map(Number);
                const woDate = new Date(year, month - 1, day, 12, 0, 0);
                return weekDays.some(d => isSameDay(d, woDate));
            } catch (e) {
                return false;
            }
        });
    }, [workOrders, weekDays]);

    const navigateWeek = (dir) => {
        setCurrentDate(prev => addDays(prev, dir * 7));
    };

    const getGridRowFromTime = (timeStr) => {
        if (!timeStr) return 3; // Default to 08:00 (row 3 when starting at 06:00)
        const [hours] = timeStr.split(':').map(Number);
        const row = hours - 6 + 1; // 06:00 is row 1
        return Math.max(1, Math.min(18, row));
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: ro })}
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            try {
                                setSyncing(true);
                                const res = await api.get('/admin/me/calendar-token');
                                const token = res.data.calendar_token;
                                const orgId = res.data.organization_id;
                                const protocol = window.location.protocol === 'https:' ? 'webcal:' : 'http:';
                                const host = window.location.host;
                                const feedUrl = `${protocol}//${host}/api/public/calendar/${orgId}/${token}/feed.ics`;
                                
                                openDialog({
                                    type: 'info',
                                    title: 'Sincronizare Apple Calendar',
                                    message: `Pentru a sincroniza comenzile de lucru cu Apple/Google Calendar pe telefon sau tabletă, copiază link-ul de mai jos și adaugă-l ca "Subscribed Calendar":\n\n${feedUrl.replace('webcal://', 'https://')}`,
                                    confirmText: 'Copiază Link',
                                    cancelText: 'Închide',
                                    onConfirm: async () => {
                                        try {
                                            await navigator.clipboard.writeText(feedUrl.replace('webcal://', 'https://'));
                                            alert('Link copiat! Acum poți să îl adaugi în calendarul tău.');
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }
                                });
                            } catch (e) {
                                alert('Eroare la generarea link-ului de calendar.');
                            } finally {
                                setSyncing(false);
                            }
                        }}
                        disabled={syncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Sync Apple
                    </button>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button onClick={() => navigateWeek(-1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Săptămâna curentă</span>
                    <button onClick={() => navigateWeek(1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                </div>
            </div>

            {/* Calendar Grid Container */}
            <div className="flex-1 overflow-auto flex">
                {/* Time Gutter */}
                <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 sticky left-0 z-20">
                    <div className="h-12 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-900/80 z-20" />
                    {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-start justify-center text-[10px] text-slate-400 font-medium pt-1">
                            {(i + 6).toString().padStart(2, '0')}:00
                        </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="flex-1 min-w-[800px]">

                    {/* Header: Days */}
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
                        {weekDays.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                                <div key={i} className={`h-12 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                    <span className={`text-[11px] uppercase font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                                        {format(day, 'EEE', { locale: ro })}
                                    </span>
                                    <span className={`text-sm font-black ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Events Grid */}
                    <div className="relative grid grid-cols-7 grid-rows-[repeat(18,minmax(80px,80px))] bg-slate-50/30 dark:bg-slate-900/30">
                        {weeklyOrders.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <span className="text-slate-400 text-sm">Nicio comandă în această săptămână</span>
                            </div>
                        )}
                        
                        {/* Grid Lines */}
                        {Array.from({ length: 18 * 7 }).map((_, i) => (
                            <div key={i} className="border-r border-b border-slate-200 dark:border-slate-800/60" />
                        ))}

                        {/* Events overlay */}
                        {weeklyOrders.map(wo => {
                            const dateStr = wo.start_date || wo.deadline_date;
                            let woDate;
                            try {
                                const datePart = dateStr.split('T')[0];
                                const [year, month, day] = datePart.split('-').map(Number);
                                woDate = new Date(year, month - 1, day, 12, 0, 0);
                            } catch (e) {
                                return null;
                            }
                            
                            const dayIndex = weekDays.findIndex(d => isSameDay(d, woDate));
                            if (dayIndex === -1) return null;

                            const rowStart = getGridRowFromTime(wo.start_time);
                            // Ensure team_color is valid hex or fallback to standard palette
                            const colorHex = wo.assigned_team_color || '#93c5fd'; // blue-300 fallback
                            
                            // To support dynamic colors, we use inline styles for background.
                            // We mix the hex with opacity for the background and use full hex for border/left-border
                            
                            return (
                                <div 
                                    key={wo.id}
                                    className="absolute p-1.5 overflow-hidden rounded-md border-l-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer mx-1"
                                    style={{
                                        top: `${(rowStart - 1) * 80 + 4}px`,
                                        height: '72px',
                                        left: `${dayIndex * (100 / 7)}%`,
                                        width: `calc(${100 / 7}% - 8px)`,
                                        backgroundColor: `${colorHex}30`,
                                        borderLeftColor: colorHex,
                                        borderColor: `${colorHex}50`
                                    }}
                                    onClick={() => navigate(`/admin/work-orders/${wo.id}`)}
                                    title={`${wo.title} — click pentru detalii`}
                                >
                                    <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate" title={wo.title}>
                                        {wo.title}
                                    </div>
                                    <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 truncate flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5" />
                                        {wo.client_name || wo.site_name || 'Fără locație'}
                                    </div>
                                    <div className="text-[10px] font-semibold mt-1 truncate" style={{ color: colorHex }}>
                                        {wo.assigned_team_name || 'Neasignat'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
