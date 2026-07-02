import React, { useState, useEffect } from 'react';
import { Search, Download, FileText, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const VehicleReportsTab = ({ vehicleId, sites = [], t }) => {
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    
    const [filters, setFilters] = useState({
        month: new Date().toISOString().substring(0, 7), // YYYY-MM
        site_id: '',
        supplier: 'Toate'
    });

    const fetchReport = async () => {
        setLoading(true);
        try {
                        const adminStorage = localStorage.getItem('admin-storage');
            const token = adminStorage ? JSON.parse(adminStorage).state?.token : null;
            const res = await fetch(`/api/admin/fleet/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    month: filters.month,
                    vehicle_id: vehicleId,
                    site_id: filters.site_id || null,
                    supplier: filters.supplier
                })
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (vehicleId) fetchReport();
    }, [vehicleId, filters]);

    const handleExportExcel = () => {
        if (reports.length === 0) return;
        const r = reports[0];
        
        const data = [
            ["Raport Lunar Parc Auto"],
            ["Mașină", `${r.vehicle_name} (${r.plate_number})`],
            ["Șantier Principal", r.site_name || "N/A"],
            [""],
            ["Sumar"],
            ["Km parcurși", `${r.km_driven} km`],
            ["Alimentări (număr)", r.total_fuel_entries],
            ["Total litri", `${r.total_liters} L`],
            ["Cost Combustibil", `${r.total_cost} EUR/RON`],
            ["Consum Mediu", `${r.avg_consumption} L/100km`],
            ["Cost per km", `${r.cost_per_km} / km`],
            [""],
            ["Costuri pe Furnizori"]
        ];

        Object.entries(r.supplier_costs).forEach(([sup, cost]) => {
            data.push([sup, cost]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Raport");
        XLSX.writeFile(wb, `Raport_${r.plate_number}_${filters.month}.xlsx`);
    };

    const handleExportPDF = () => {
        window.print();
    };

    return (
        <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl print:hidden shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Lună</label>
                        <input type="month" value={filters.month} onChange={e => setFilters({...filters, month: e.target.value})} className="glass-input w-full px-3 py-2 border rounded-2xl bg-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Șantier (Opțional)</label>
                        <select value={filters.site_id} onChange={e => setFilters({...filters, site_id: e.target.value})} className="glass-input w-full px-3 py-2 border rounded-2xl bg-white">
                            <option value="">-- Toate Șantierele --</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Furnizor</label>
                        <select value={filters.supplier} onChange={e => setFilters({...filters, supplier: e.target.value})} className="glass-input w-full px-3 py-2 border rounded-2xl bg-white">
                            <option value="Toate">Toate</option>
                            <option value="DKV">DKV</option>
                            <option value="OMV">OMV</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportPDF} disabled={reports.length === 0} className="flex-1 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-semibold disabled:opacity-50 transition-colors">
                            PDF
                        </button>
                        <button onClick={handleExportExcel} disabled={reports.length === 0} className="flex-1 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-semibold disabled:opacity-50 transition-colors">
                            Excel
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-400">Generare raport...</div>
            ) : reports.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                    <p>Nicio dată găsită pentru filtrele selectate.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm print:shadow-none print:border-none print:p-0" id="report-content">
                    {reports.map((r, idx) => (
                        <div key={idx} className="space-y-6">
                            <div className="border-b pb-4">
                                <h2 className="text-xl font-bold text-slate-800">{r.vehicle_name} — {filters.month}</h2>
                                <p className="text-slate-500 font-mono">{r.plate_number}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Șantier Principal</p>
                                    <p className="font-semibold text-slate-800">{r.site_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Km parcurși</p>
                                    <p className="font-semibold text-slate-800">{r.km_driven} km</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Alimentări</p>
                                    <p className="font-semibold text-slate-800">{r.total_fuel_entries}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Total litri</p>
                                    <p className="font-semibold text-slate-800">{r.total_liters} L</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Cost combustibil</p>
                                    <p className="font-semibold text-red-600">{r.total_cost}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Consum mediu</p>
                                    <p className="font-semibold text-blue-600">{r.avg_consumption} L/100 km</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Cost / km</p>
                                    <p className="font-semibold text-slate-800">{r.cost_per_km}</p>
                                </div>
                            </div>

                            {Object.keys(r.supplier_costs).length > 0 && (
                                <div className="mt-6 pt-4 border-t">
                                    <h3 className="font-bold text-slate-800 mb-3">Defalcare Furnizori</h3>
                                    <div className="space-y-2">
                                        {Object.entries(r.supplier_costs).map(([sup, cost]) => (
                                            <div key={sup} className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl">
                                                <span className="font-semibold text-slate-600">{sup}</span>
                                                <span className="font-bold text-slate-800">{cost}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VehicleReportsTab;
