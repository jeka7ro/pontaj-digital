import { useState, useEffect } from 'react'
import { Calendar, Building2, Car, MapPin, Package, Users, Camera, ArrowLeft, Loader2, X, Clock, CheckSquare } from 'lucide-react'
import api from '../lib/api'

export default function SiteDetailView({ site, onBack }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('general')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Row selection for attendance tab
    const [selectedRows, setSelectedRows] = useState([])

    useEffect(() => {
        if (!site) return
        fetchDetails()
    }, [site, startDate, endDate])

    // Reset selection on tab change
    useEffect(() => { setSelectedRows([]) }, [activeTab])

    const fetchDetails = async () => {
        setLoading(true)
        try {
            const params = {}
            if (startDate) params.start_date = startDate
            if (endDate) params.end_date = endDate
            const res = await api.get(`/admin/sites/${site.id}/details`, { params })
            setData(res.data)
        } catch (error) {
            console.error('Failed to load site details', error)
        } finally {
            setLoading(false)
        }
    }

    if (!data && loading) {
        return (
            <div className="flex items-center justify-center p-12 h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!data) return null

    const totalWorkers = (data.direct_users?.length || 0) + (data.teams?.reduce((acc, t) => acc + (t.members?.length || 0), 0) || 0)

    const TABS = [
        { id: 'general',    label: 'Informații Generale',                          icon: Building2 },
        { id: 'teams',      label: `Echipe/Angajați (${totalWorkers})`,            icon: Users },
        { id: 'vehicles',   label: `Utilaje (${data.vehicles?.length || 0})`,      icon: Car },
        { id: 'warehouse',  label: `Magazie (${data.warehouse_transactions?.length || 0})`, icon: Package },
        { id: 'attendance', label: `Activitate (${data.attendance?.length || 0})`, icon: Clock },
        { id: 'photos',     label: `Fotografii (${data.photos?.length || 0})`,     icon: Camera },
    ]

    const toggleRow = (id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleAll = (ids) => setSelectedRows(prev => ids.every(id => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])])

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* ─── Site Header (fără card propriu, blenduit în parent) ─── */}
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {data.site.name}
                            {data.site.status === 'active' && (
                                <span className="px-2 py-0.5 text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold">Activ</span>
                            )}
                        </h2>
                        <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {data.site.address || 'Fără adresă'}
                        </p>
                    </div>
                </div>

                {/* Date range filter */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                    <input
                        type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 outline-none w-32"
                    />
                    <span className="text-slate-300">–</span>
                    <input
                        type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 outline-none w-32 pr-2"
                    />
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate('') }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full mr-1">
                            <X className="w-3 h-3 text-slate-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Tabs ─── */}
            <div className="flex overflow-x-auto gap-1.5 px-6 py-3 border-b border-slate-100 dark:border-slate-800 custom-scrollbar">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ─── Content ─── */}
            {loading && data ? (
                <div className="flex justify-center items-center p-10 opacity-50">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="p-6">

                    {/* ══ GENERAL TAB ══ */}
                    {activeTab === 'general' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Client & Sistem */}
                                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                    <h3 className="font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-500" /> Informații Client & Sistem
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Client',        val: data.site.client_name || '—' },
                                            { label: 'Putere Sistem', val: `${data.site.system_power_kw || 0} kW`, cls: 'text-amber-600 font-bold' },
                                            { label: 'Panouri',       val: `${data.site.panel_count || 0} buc` },
                                            { label: 'Tip Instalare', val: data.site.installation_type || 'N/A', cls: 'capitalize' },
                                        ].map(({ label, val, cls }) => (
                                            <div key={label} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-slate-400 text-xs mb-1">{label}</p>
                                                <p className={`font-semibold text-slate-800 dark:text-white text-sm ${cls || ''}`}>{val}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Program & Locatie */}
                                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                    <h3 className="font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-500" /> Program & Locație
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-slate-400 text-xs mb-1">Program Lucru</p>
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm">{data.site.work_start_time || '—'} – {data.site.work_end_time || '—'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-slate-400 text-xs mb-1">Pauză Masă</p>
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm">{data.site.lunch_break_start || '—'} – {data.site.lunch_break_end || '—'}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 col-span-2">
                                            <p className="text-slate-400 text-xs mb-1">Data Creării</p>
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm">{data.site.created_at ? new Date(data.site.created_at).toLocaleString('ro-RO') : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Map */}
                            {data.site.address && (
                                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                                        <MapPin className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Locație pe hartă</span>
                                        <span className="text-xs text-slate-400 truncate">— {data.site.address}</span>
                                    </div>
                                    <iframe
                                        title="Locatie santier"
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(data.site.address)}&output=embed&z=15`}
                                        width="100%" height="320"
                                        style={{ border: 0, display: 'block' }}
                                        allowFullScreen loading="lazy"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ ECHIPE TAB ══ */}
                    {activeTab === 'teams' && (
                        <div className="space-y-6">
                            {data.teams?.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Echipe Alocate</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {data.teams.map(team => (
                                            <div key={team.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                                                <h5 className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-3 text-sm">
                                                    <Users className="w-4 h-4" /> {team.name}
                                                </h5>
                                                <ul className="space-y-1.5">
                                                    {team.members?.map(m => (
                                                        <li key={m.id} className="text-sm text-slate-600 dark:text-slate-300 flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                            <span>{m.name}</span>
                                                            <span className="text-[10px] uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">{typeof m.role === 'object' ? (m.role?.name || m.role?.code || '') : (m.role || '')}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {data.direct_users?.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Angajați Individuali</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {data.direct_users.map(u => (
                                            <div key={u.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.name}</span>
                                                <span className="text-[10px] uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">{typeof u.role === 'object' ? (u.role?.name || u.role?.code || '') : (u.role || '')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!data.teams?.length && !data.direct_users?.length && (
                                <p className="text-slate-400 text-sm italic py-6 text-center">Nu există echipe sau angajați alocați acestui șantier.</p>
                            )}
                        </div>
                    )}

                    {/* ══ UTILAJE TAB ══ */}
                    {activeTab === 'vehicles' && (
                        <div>
                            {data.vehicles.length === 0 ? (
                                <p className="text-slate-400 text-sm italic py-6 text-center">Nu există utilaje alocate.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {data.vehicles.map(v => (
                                        <div key={v.id} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                                <Car className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{v.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{v.plate_number || '—'}</p>
                                                <p className="text-xs text-slate-400 capitalize">{v.type} · {v.year}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ MAGAZIE TAB ══ */}
                    {activeTab === 'warehouse' && (() => {
                        const rows = data.warehouse_transactions
                        const allIds = rows.map(r => r.id)
                        const allSelected = allIds.length > 0 && allIds.every(id => selectedRows.includes(id))
                        return (
                            <div>
                                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3 w-10">
                                                    <input type="checkbox" checked={allSelected} onChange={() => toggleAll(allIds)} className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                                </th>
                                                <th className="px-4 py-3">Dată</th>
                                                <th className="px-4 py-3">Articol</th>
                                                <th className="px-4 py-3">Tip</th>
                                                <th className="px-4 py-3">Cantitate</th>
                                                <th className="px-4 py-3">Utilizator</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {rows.length === 0 ? (
                                                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic text-sm">Nu există tranzacții în perioada selectată.</td></tr>
                                            ) : rows.map(tx => (
                                                <tr key={tx.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedRows.includes(tx.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`} onClick={() => toggleRow(tx.id)}>
                                                    <td className="px-4 py-3">
                                                        <input type="checkbox" checked={selectedRows.includes(tx.id)} onChange={() => toggleRow(tx.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{new Date(tx.created_at).toLocaleString('ro-RO')}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-semibold text-blue-600 dark:text-blue-400">{tx.item_name}</span>
                                                        <span className="block text-xs text-slate-400">{tx.item_sku}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {tx.tx_type === 'out'
                                                            ? <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">Ieșire</span>
                                                            : <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">Intrare</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{tx.quantity}</td>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tx.user_name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Footer */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                                    <span>{selectedRows.filter(id => allIds.includes(id)).length > 0 ? `${selectedRows.filter(id => allIds.includes(id)).length} selectate` : ''}</span>
                                    <span>Total: <strong className="text-slate-600 dark:text-slate-200">{rows.length}</strong> înregistrări</span>
                                </div>
                            </div>
                        )
                    })()}

                    {/* ══ ACTIVITATE TAB ══ */}
                    {activeTab === 'attendance' && (() => {
                        const rows = data.attendance
                        const allIds = rows.map(r => r.id)
                        const allSelected = allIds.length > 0 && allIds.every(id => selectedRows.includes(id))
                        return (
                            <div>
                                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3 w-10">
                                                    <input type="checkbox" checked={allSelected} onChange={() => toggleAll(allIds)} className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                                </th>
                                                <th className="px-4 py-3">Dată</th>
                                                <th className="px-4 py-3">Muncitor</th>
                                                <th className="px-4 py-3">Check In</th>
                                                <th className="px-4 py-3">Check Out</th>
                                                <th className="px-4 py-3">Activități efectuate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {rows.length === 0 ? (
                                                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic text-sm">Nu există activitate înregistrată{startDate || endDate ? ' în perioada selectată' : ''}.</td></tr>
                                            ) : rows.map(a => (
                                                <tr key={a.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedRows.includes(a.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`} onClick={() => toggleRow(a.id)}>
                                                    <td className="px-4 py-3">
                                                        <input type="checkbox" checked={selectedRows.includes(a.id)} onChange={() => toggleRow(a.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{new Date(a.date).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin' })}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{a.user_name}</td>
                                                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                        {a.check_in ? new Date(a.check_in).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-red-500 dark:text-red-400 tabular-nums">
                                                        {a.check_out ? new Date(a.check_out).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {a.activities?.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {a.activities.map((act, i) => (
                                                                    <span key={i} className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                                                        {act}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Footer total */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                                    <span>{selectedRows.filter(id => allIds.includes(id)).length > 0 ? `${selectedRows.filter(id => allIds.includes(id)).length} selectate` : ''}</span>
                                    <span>Total: <strong className="text-slate-600 dark:text-slate-200">{rows.length}</strong> înregistrări{(startDate || endDate) ? ' (filtrate)' : ''}</span>
                                </div>
                            </div>
                        )
                    })()}

                    {/* ══ FOTOGRAFII TAB ══ */}
                    {activeTab === 'photos' && (
                        <div>
                            {data.photos.length === 0 ? (
                                <p className="text-slate-400 text-sm italic py-6 text-center">Nu există fotografii încărcate.</p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {data.photos.map(p => (
                                        <div key={p.id} className="relative group rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                                            <img src={p.photo_path} alt="Site" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <p className="text-white text-xs font-medium">{new Date(p.created_at).toLocaleString('ro-RO')}</p>
                                                <p className="text-slate-300 text-xs truncate">de {p.uploader_name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}
        </div>
    )
}
