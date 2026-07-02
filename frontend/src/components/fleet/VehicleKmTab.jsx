import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Map, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const VehicleKmTab = ({ vehicleId, sites = [], t }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Pagination & Search
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        site_id: '',
        km_driven: '',
        notes: ''
    });

    useEffect(() => {
        if (vehicleId) fetchEntries();
    }, [vehicleId]);

    const fetchEntries = async () => {
        setLoading(true);
        try {
                        const adminStorage = localStorage.getItem('admin-storage');
            const token = adminStorage ? JSON.parse(adminStorage).state?.token : null;
            const res = await fetch(`/api/admin/fleet/km/${vehicleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                alert(errData.detail || "Eroare la salvare. Verificați datele introduse.");
                return;
            }
            if (res.ok) {

                const data = await res.json();
                setEntries(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
                        const adminStorage = localStorage.getItem('admin-storage');
            const token = adminStorage ? JSON.parse(adminStorage).state?.token : null;
            const res = await fetch(`/api/admin/fleet/km`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    vehicle_id: vehicleId,
                    km_driven: parseFloat(form.km_driven),
                    site_id: form.site_id || null
                })
            });

            if (res.ok) {

                setShowForm(false);
                setForm({
                    date: new Date().toISOString().split('T')[0],
                    site_id: '',
                    km_driven: '',
                    notes: ''
                });
                fetchEntries();
            }
        } catch (error) {
            console.error("Error saving km entry", error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Sigur vrei să ștergi această înregistrare?")) return;
        try {
                        const adminStorage = localStorage.getItem('admin-storage');
            const token = adminStorage ? JSON.parse(adminStorage).state?.token : null;
            await fetch(`/api/admin/fleet/km/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchEntries();
        } catch (error) {
            console.error("Error deleting", error);
        }
    };

    const currentMonthEntries = entries.filter(e => {
        const d = new Date(e.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalKm = currentMonthEntries.reduce((acc, curr) => acc + curr.km_driven, 0);

    // Filtering and Pagination
    const filteredEntries = entries.filter(e => {
        const siteName = sites.find(s => s.id === e.site_id)?.name || '';
        const str = `${siteName} ${e.notes}`.toLowerCase();
        return str.includes(search.toLowerCase());
    });
    
    const total = filteredEntries.length;
    const totalPages = rowsPerPage === 9999 ? 1 : Math.ceil(total / rowsPerPage);
    const paginatedEntries = rowsPerPage === 9999 ? filteredEntries : filteredEntries.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    // Reset page on search or row change
    useEffect(() => { setPage(1); }, [search, rowsPerPage]);

    return (
        <div className="space-y-4">
            {!showForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-4">
                        <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
                            <Map className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-semibold">Total Kilometri (Luna crt.)</p>
                            <p className="text-lg font-bold text-slate-800">{totalKm.toFixed(2)} km</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-4 justify-center">
                        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-2xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> Adaugă KM Zilnici
                        </button>
                    </div>
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4 shadow-sm">
                    <h3 className="font-bold text-slate-800">Adaugă înregistrare kilometri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="glass-input w-full px-3 py-2 border rounded-2xl bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Șantier (Opțional)</label>
                            <select value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} className="glass-input w-full px-3 py-2 border rounded-2xl bg-white">
                                <option value="">-- Fără Șantier --</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Km Parcurși</label>
                            <input type="number" step="0.1" required value={form.km_driven} onChange={e => setForm({...form, km_driven: e.target.value})} className="glass-input w-full px-3 py-2 border rounded-2xl bg-white" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Observații</label>
                        <textarea rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="glass-input w-full px-3 py-2 border rounded-2xl bg-white"></textarea>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm font-semibold hover:bg-slate-50 transition-colors">Anulează</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">Salvează</button>
                    </div>
                </form>
            )}

            {/* SEARCH BAR */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                <input
                    className="glass-input border border-slate-200 w-full outline-none focus:border-indigo-400 bg-white"
                    style={{ paddingLeft: 36, paddingRight: search ? 80 : 16, borderRadius: 9999, paddingTop: '8px', paddingBottom: '8px' }}
                    placeholder="Caută înregistrare..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {search && (
                    <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#4f46e5', color: 'white', borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {filteredEntries.length} / {entries.length}
                    </div>
                )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-t-lg bg-white">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                            <th style={{ width: 50, textAlign: 'center' }} className="p-3 font-semibold">Nr.</th>
                            <th className="p-3 font-semibold">Data</th>
                            <th className="p-3 font-semibold">Șantier</th>
                            <th className="p-3 font-semibold text-right">Km Parcurși</th>
                            <th className="p-3 font-semibold">Observații</th>
                            <th className="p-3 font-semibold text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && entries.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-400">Se încarcă datele...</td></tr>
                        ) : paginatedEntries.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-400">Niciun kilometru înregistrat.</td></tr>
                        ) : paginatedEntries.map((entry, index) => (
                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                <td style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }} className="p-3 font-medium">
                                    {(page - 1) * rowsPerPage + index + 1}
                                </td>
                                <td className="p-3 font-semibold text-slate-800">{new Date(entry.date).toLocaleDateString()}</td>
                                <td className="p-3 text-slate-700">{sites.find(s => s.id === entry.site_id)?.name || '-'}</td>
                                <td className="p-3 text-right font-bold text-indigo-600">{entry.km_driven} km</td>
                                <td className="p-3 text-slate-500 truncate max-w-xs">{entry.notes || '-'}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-2xl hover:bg-red-50 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FOOTER PAGINARE */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="text-sm text-slate-600">
                    <span style={{ whiteSpace: 'nowrap' }}>
                        Afișează&nbsp;
                        <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9999, padding: '2px 8px' }} className="outline-none focus:border-indigo-400">
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={9999}>Toți</option>
                        </select>
                    </span>
                    <span style={{ whiteSpace: 'nowrap' }}>Total: <strong className="text-slate-800">{total}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="text-sm text-slate-600">
                    <span style={{ whiteSpace: 'nowrap' }}>Pagina {page} din {totalPages || 1}</span>
                    <button className="p-1 rounded-2xl hover:bg-slate-200 disabled:opacity-50 transition-colors text-slate-500" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></button>
                    <button className="p-1 rounded-2xl hover:bg-slate-200 disabled:opacity-50 transition-colors text-slate-500" onClick={() => setPage(p => p + 1)} disabled={page === totalPages || totalPages === 0}><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>

        </div>
    );
};

export default VehicleKmTab;
