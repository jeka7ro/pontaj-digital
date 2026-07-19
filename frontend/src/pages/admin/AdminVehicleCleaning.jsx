import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Search, Image as ImageIcon, Sparkles, X, ChevronRight, Download } from 'lucide-react';
import api from '../../lib/api';

export default function AdminVehicleCleaning({ vehicleId }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSession, setSelectedSession] = useState(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await api.get('/admin/vehicle-cleaning');
            setSessions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredSessions = sessions.filter(s => {
        if (vehicleId && s.vehicle_id !== vehicleId) return false;
        return s.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               s.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
               s.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden rounded-3xl">
            {!vehicleId && (
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Caută mașină sau șofer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 h-10 border border-slate-200 dark:border-slate-700 rounded-full text-sm outline-none focus:border-blue-400 dark:bg-slate-800 dark:text-white"
                        />
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                            <th className="p-4">Dată</th>
                            {!vehicleId && <th className="p-4">Vehicul</th>}
                            <th className="p-4">Șofer</th>
                            <th className="p-4">Status / Poze</th>
                            <th className="p-4 text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredSessions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-500">
                                    <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                    Nicio înregistrare găsită.
                                </td>
                            </tr>
                        ) : (
                            filteredSessions.map(session => (
                                <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-slate-900 dark:text-white">
                                            {format(new Date(session.created_at), "dd MMM yyyy", { locale: ro })}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {format(new Date(session.created_at), "HH:mm")}
                                        </div>
                                    </td>
                                    {!vehicleId && (
                                        <td className="p-4">
                                            <div className="font-semibold text-slate-900 dark:text-white">{session.vehicle_name}</div>
                                            <div className="text-slate-500">{session.vehicle_plate}</div>
                                        </td>
                                    )}
                                    <td className="p-4">
                                        <div className="font-medium text-slate-700 dark:text-slate-300">{session.user_name}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                {Object.values(session.photos?.exterior || {}).slice(0,2).map((url, i) => (
                                                    <img key={`ext-${i}`} src={url} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                                                ))}
                                                {Object.values(session.photos?.interior || {}).slice(0,2).map((url, i) => (
                                                    <img key={`int-${i}`} src={url} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                                                ))}
                                            </div>
                                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                                Verifică dosar
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => setSelectedSession(session)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Vezi poze <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Photo Viewer Modal */}
            {selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto">
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-500" />
                                    Dosar Curățenie: {selectedSession.vehicle_name}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Trimis de {selectedSession.user_name} la {format(new Date(selectedSession.created_at), "dd MMMM yyyy, HH:mm", { locale: ro })}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto space-y-8">
                            {/* Exterior Photos */}
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Exterior
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(selectedSession.photos?.exterior || {}).map(([key, url]) => (
                                        <div key={key} className="space-y-2">
                                            <a href={url} target="_blank" rel="noreferrer" className="block relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square">
                                                <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <Download className="text-white opacity-0 group-hover:opacity-100 w-8 h-8" />
                                                </div>
                                            </a>
                                            <p className="text-xs text-center font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">{key.replace('_', ' ')}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Interior Photos */}
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Interior
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {Object.entries(selectedSession.photos?.interior || {}).map(([key, url]) => (
                                        <div key={key} className="space-y-2">
                                            <a href={url} target="_blank" rel="noreferrer" className="block relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[4/3]">
                                                <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <Download className="text-white opacity-0 group-hover:opacity-100 w-8 h-8" />
                                                </div>
                                            </a>
                                            <p className="text-xs text-center font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">{key}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
