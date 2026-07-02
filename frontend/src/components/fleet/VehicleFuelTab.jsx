import React, { useState, useEffect, useRef } from 'react';
import Autocomplete from 'react-google-autocomplete';
import { Plus, Trash2, Droplet, DollarSign, FileText, Search, ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';

const VehicleFuelTab = ({ vehicleId, sites = [], t }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Pagination & Search
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        time: '',
        supplier: 'DKV',
        fuel_card: '',
        country: 'România',
        city: '',
        liters: '',
        total_cost: '',
        currency: 'EUR',
        site_id: '',
        notes: ''
    });
    
    const [receiptFile, setReceiptFile] = useState(null);

    useEffect(() => {
        if (vehicleId) {
            fetchEntries();
        }
    }, [vehicleId]);

    const fetchEntries = async () => {
        setLoading(true);
        try {
                        const adminStorage = localStorage.getItem('admin-storage');
            const token = adminStorage ? JSON.parse(adminStorage).state?.token : null;
            const res = await fetch(`/api/admin/fleet/fuel/${vehicleId}`, {
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
            const res = await fetch(`/api/admin/fleet/fuel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    vehicle_id: vehicleId,
                    liters: parseFloat(form.liters),
                    total_cost: parseFloat(form.total_cost),
                    site_id: form.site_id || null
                    // currency is already in ...form
                })
            });

            if (res.ok) {

                const entry = await res.json();
                if (receiptFile) {
                    const formData = new FormData();
                    formData.append('file', receiptFile);
                    const uploadRes = await fetch(`/api/admin/fleet/fuel/${entry.id}/upload-receipt`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    if (!uploadRes.ok) {
                        alert("Alimentarea a fost salvată, dar încărcarea bonului a eșuat.");
                    }
                }
                setShowForm(false);
                setForm({
                    date: new Date().toISOString().split('T')[0],
                    time: '',
                    supplier: 'DKV',
                    fuel_card: '',
                    country: 'România',
                    city: '',
                    liters: '',
                    total_cost: '',
                    currency: 'EUR',
                    site_id: '',
                    notes: ''
                });
                setReceiptFile(null);
                fetchEntries();
            }
        } catch (error) {
            console.error("Error saving fuel entry", error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Sigur vrei să ștergi această alimentare?")) return;
        try {
                        const adminStorage = localStorage.getItem('admin-storage');
            const token = adminStorage ? JSON.parse(adminStorage).state?.token : null;
            await fetch(`/api/admin/fleet/fuel/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchEntries();
        } catch (error) {
            console.error("Error deleting", error);
        }
    };

    // Calculate stats for current month
    const currentMonthEntries = entries.filter(e => {
        const d = new Date(e.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalLiters = currentMonthEntries.reduce((acc, curr) => acc + curr.liters, 0);
    const totalCost = currentMonthEntries.reduce((acc, curr) => acc + curr.total_cost, 0);

    // Filtering and Pagination
    const filteredEntries = entries.filter(e => {
        const str = `${e.supplier} ${e.city} ${e.country} ${e.fuel_card} ${e.notes}`.toLowerCase();
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="glass-input p-4 rounded-2xl flex items-center justify-between border border-slate-200 bg-white">
                        <div>
                            <p className="text-xs text-slate-500 font-semibold mb-1">Total Litri (Luna crt.)</p>
                            <p className="text-lg font-bold text-slate-800">{totalLiters.toFixed(2)} L</p>
                        </div>
                    </div>
                    <div className="glass-input p-4 rounded-2xl flex items-center justify-between border border-slate-200 bg-white">
                        <div>
                            <p className="text-xs text-slate-500 font-semibold mb-1">Total Cost (Luna crt.)</p>
                            <p className="text-lg font-bold text-slate-800">{totalCost.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-end">
                        <button onClick={() => setShowForm(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 h-10 w-full md:w-auto rounded-2xl font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> Adaugă alimentare
                        </button>
                    </div>
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4 shadow-sm">
                    <h3 className="font-bold text-slate-800">Adaugă alimentare nouă</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="glass-input w-full px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Ora</label>
                            <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="glass-input w-full px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Furnizor</label>
                            <select value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="glass-input w-full px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                                <option value="DKV">DKV</option>
                                <option value="OMV">OMV</option>
                                <option value="Petrom">Petrom</option>
                                <option value="Rompetrol">Rompetrol</option>
                                <option value="Lukoil">Lukoil</option>
                                <option value="Altul">Altul</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Card</label>
                            <input type="text" value={form.fuel_card} onChange={e => setForm({...form, fuel_card: e.target.value})} className="glass-input w-full px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="1234 5678..." />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Locație (Adresă / Oraș / Benzinărie)</label>
                            <Autocomplete
                                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
                                onPlaceSelected={(place) => {
                                    let city = "";
                                    let country = "";
                                    
                                    if (place.address_components) {
                                        place.address_components.forEach(component => {
                                            const types = component.types;
                                            if (types.includes("locality")) city = component.long_name;
                                            if (types.includes("administrative_area_level_2") && !city) city = component.long_name;
                                            if (types.includes("country")) country = component.long_name;
                                        });
                                    }
                                    
                                    // Fallback if city not found but we have formatted address
                                    if (!city && place.name) city = place.name;
                                    
                                    setForm({
                                        ...form, 
                                        city: city || form.city,
                                        country: country || form.country
                                    });
                                }}
                                options={{
                                    types: ['establishment', 'geocode'],
                                    fields: ['address_components', 'formatted_address', 'name']
                                }}
                                defaultValue={form.city ? `${form.city}, ${form.country}` : ''}
                                placeholder="Caută locație..."
                                className="glass-input w-full px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Litri</label>
                            <input type="number" step="0.01" required value={form.liters} onChange={e => setForm({...form, liters: e.target.value})} className="glass-input w-full px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Total Cost</label>
                            <div className="flex gap-2">
                                <input type="number" step="0.01" required value={form.total_cost} onChange={e => setForm({...form, total_cost: e.target.value})} className="glass-input flex-1 min-w-0 px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Ex: 50.5" />
                                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="glass-input w-24 shrink-0 px-3 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                                    <option value="EUR">EUR</option>
                                    <option value="RON">RON</option>
                                    <option value="HUF">HUF</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Șantier (Opțional)</label>
                        <select value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} className="glass-input w-full px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                            <option value="">-- Fără Șantier --</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Observații</label>
                        <textarea rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="glass-input w-full px-4 py-2.5 border rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"></textarea>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Poză Bon</label>
                        <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl cursor-pointer transition-colors text-sm text-slate-600 w-full">
                            <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="truncate flex-1">{receiptFile ? receiptFile.name : 'Atașează document/poză...'}</span>
                            <input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files[0])} className="hidden" />
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                        <button type="button" onClick={() => setShowForm(false)} className="px-5 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold transition-colors">Anulează</button>
                        <button type="submit" className="px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-sm shadow-blue-600/20 transition-all flex items-center gap-2">Salvează</button>
                    </div>
                </form>
            )}

            {/* SEARCH BAR */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                <input
                    className="glass-input border border-slate-200 w-full outline-none focus:border-blue-400 bg-white"
                    style={{ paddingLeft: 36, paddingRight: search ? 80 : 16, borderRadius: 9999, paddingTop: '8px', paddingBottom: '8px' }}
                    placeholder="Caută alimentare..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {search && (
                    <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#3b82f6', color: 'white', borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {filteredEntries.length} / {entries.length}
                    </div>
                )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-t-lg bg-white">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                            <th style={{ width: 50, textAlign: 'center' }} className="p-3 font-semibold">Nr.</th>
                            <th className="p-3 font-semibold">Data / Ora</th>
                            <th className="p-3 font-semibold">Furnizor</th>
                            <th className="p-3 font-semibold">Locație</th>
                            <th className="p-3 font-semibold text-right">Litri</th>
                            <th className="p-3 font-semibold text-right">Cost</th>
                            <th className="p-3 font-semibold text-center">Bon</th>
                            <th className="p-3 font-semibold text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && entries.length === 0 ? (
                            <tr><td colSpan="8" className="p-8 text-center text-slate-400">Se încarcă datele...</td></tr>
                        ) : paginatedEntries.length === 0 ? (
                            <tr><td colSpan="8" className="p-8 text-center text-slate-400">Nicio alimentare găsită.</td></tr>
                        ) : paginatedEntries.map((entry, index) => (
                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                <td style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }} className="p-3 font-medium">
                                    {(page - 1) * rowsPerPage + index + 1}
                                </td>
                                <td className="p-3">
                                    <p className="font-semibold text-slate-800">{new Date(entry.date).toLocaleDateString()}</p>
                                    {entry.time && <p className="text-xs text-slate-400">{entry.time.substring(0,5)}</p>}
                                </td>
                                <td className="p-3">
                                    <span className="font-semibold text-slate-700">{entry.supplier}</span>
                                    {entry.fuel_card && <p className="text-xs text-slate-400">Card: {entry.fuel_card}</p>}
                                </td>
                                <td className="p-3 text-slate-600">
                                    {entry.city || entry.country ? `${entry.city || ''} ${entry.country ? '('+entry.country+')' : ''}` : '-'}
                                </td>
                                <td className="p-3 text-right font-bold text-blue-600">{entry.liters} L</td>
                                <td className="p-3 text-right font-bold text-emerald-600">{entry.total_cost}</td>
                                <td className="p-3 text-center">
                                    {entry.receipt_photo_url ? (
                                        <a href={entry.receipt_photo_url} target="_blank" rel="noreferrer" className="inline-flex p-1.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors" title="Vezi Bon">
                                            <FileText className="w-4 h-4" />
                                        </a>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
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
                        <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9999, padding: '2px 8px' }} className="outline-none focus:border-blue-400">
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

export default VehicleFuelTab;
