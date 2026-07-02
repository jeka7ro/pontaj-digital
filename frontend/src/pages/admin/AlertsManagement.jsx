import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, CheckCircle2, AlertCircle, Clock, Users, Building2, User } from 'lucide-react';
import api from '../../lib/api';
import { useUIStore } from '../../store/uiStore';

export default function AlertsManagement() {
    const [alerts, setAlerts] = useState([]);
    const [sites, setSites] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useUIStore();

    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        message: '',
        target_type: 'ALL',
        target_id: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [sitesRes, usersRes] = await Promise.all([
                api.get('/admin/sites/'),
                api.get('/admin/users/')
            ]);
            setSites(sitesRes.data || []);
            setUsers(usersRes.data || []);
            
            // We don't have an admin GET /alerts/ yet, but for simplicity we can just simulate it or we need to create one.
            // Wait, I didn't create a GET /alerts for Admin to see ALL alerts including history.
            // Let's create a mockup array for now, or use the active ones.
            // Actually, I need to fetch active alerts. I'll use a mocked list until I add the admin endpoint, or just create it.
            // Let's assume we will add `GET /alerts/all` in backend.
            try {
                const alertsRes = await api.get('/alerts/all'); // Will add this to backend
                setAlerts(alertsRes.data || []);
            } catch (e) {
                setAlerts([]);
            }
        } catch (error) {
            console.error('Error fetching data', error);
            showToast('error', 'Eroare la încărcarea datelor');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                message: formData.message,
                target_type: formData.target_type,
                target_id: formData.target_id || null
            };
            
            await api.post('/alerts/', payload);
            showToast('success', 'Mesaj trimis cu succes!');
            setIsCreating(false);
            setFormData({ message: '', target_type: 'ALL', target_id: '' });
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Error creating alert', error);
            showToast('error', 'Eroare la trimiterea mesajului');
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Avizier Digital (Alerte)</h1>
                    <p className="text-slate-500">Trimite mesaje și alerte instantanee către muncitori</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-medium flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Mesaj Nou
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 animate-fade-in-up">
                    <h2 className="text-lg font-bold mb-4">Compune Mesaj Nou</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mesaj / Anunț</label>
                            <textarea
                                required
                                rows={3}
                                className="w-full p-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                                placeholder="Scrie aici mesajul care va apărea pe ecranul muncitorilor..."
                                value={formData.message}
                                onChange={e => setFormData({...formData, message: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Destinatar (Cine vede mesajul)</label>
                                <select
                                    className="w-full p-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                                    value={formData.target_type}
                                    onChange={e => setFormData({...formData, target_type: e.target.value, target_id: ''})}
                                >
                                    <option value="ALL">Toată lumea (Global)</option>
                                    <option value="SITE">Un șantier specific</option>
                                    <option value="USER">Un muncitor specific</option>
                                </select>
                            </div>

                            {formData.target_type === 'SITE' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Alege Șantierul</label>
                                    <select
                                        required
                                        className="w-full p-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                                        value={formData.target_id}
                                        onChange={e => setFormData({...formData, target_id: e.target.value})}
                                    >
                                        <option value="">-- Selectează --</option>
                                        {sites.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.target_type === 'USER' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Alege Muncitorul</label>
                                    <select
                                        required
                                        className="w-full p-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500"
                                        value={formData.target_id}
                                        onChange={e => setFormData({...formData, target_id: e.target.value})}
                                    >
                                        <option value="">-- Selectează --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name} ({u.employee_code})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-2xl font-medium"
                            >
                                Anulează
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-2xl font-bold flex items-center gap-2"
                            >
                                <AlertCircle className="w-5 h-5" />
                                Trimite Mesajul
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Istoric Mesaje</h3>
                </div>
                
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Se încarcă...</div>
                ) : alerts.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Nu există niciun mesaj trimis.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {alerts.map(alert => (
                            <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                                <div className="mt-1">
                                    <div className="bg-amber-100 p-2 rounded-2xl text-amber-600">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-slate-900 font-medium mb-1">{alert.message}</p>
                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(alert.created_at).toLocaleString('ro-RO')}
                                        </span>
                                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                                            {alert.target_type === 'ALL' && <><Users className="w-3.5 h-3.5 text-blue-500"/> Către toți</>}
                                            {alert.target_type === 'SITE' && <><Building2 className="w-3.5 h-3.5 text-indigo-500"/> Șantier Specific</>}
                                            {alert.target_type === 'USER' && <><User className="w-3.5 h-3.5 text-emerald-500"/> Muncitor Specific</>}
                                        </span>
                                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {alert.acknowledgements_count || 0} Confirmări
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <button className="text-red-500 hover:bg-red-50 p-2 rounded-2xl transition-colors" title="Șterge">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
