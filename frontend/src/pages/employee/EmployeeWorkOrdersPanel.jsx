import { useState, useEffect } from 'react'
import { ClipboardList, MapPin, Calendar, CircleDot, Package, Wrench, ChevronDown, ChevronUp, Plus, Trash, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'

export default function EmployeeWorkOrdersPanel() {
    const { t } = useTranslation()
    const [workOrders, setWorkOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    
    // Editare materiale consumate inline pe o anumită comandă
    const [editingMatId, setEditingMatId] = useState(null)
    const [matRows, setMatRows] = useState([])
    const [matSaving, setMatSaving] = useState(false)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const res = await api.get('/user/work-orders')
            setWorkOrders(res.data)
        } catch (error) {
            console.error('Error fetching work orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const startEditingMaterials = (wo) => {
        setEditingMatId(wo.id)
        if (wo.materials_consumed?.length > 0) {
            setMatRows(wo.materials_consumed.map(m => ({ ...m })))
        } else {
            setMatRows([{ name: '', quantity: '', unit: '', note: '' }])
        }
    }

    const saveMaterials = async (woId) => {
        setMatSaving(true)
        try {
            await api.patch(`/user/work-orders/${woId}/materials-consumed`, { materials_consumed: matRows })
            await fetchOrders()
            setEditingMatId(null)
        } catch (error) {
            console.error(error)
        } finally {
            setMatSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (workOrders.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center text-slate-500 bg-white/50 backdrop-blur-sm rounded-2xl m-4 border border-slate-200">
                <ClipboardList className="w-12 h-12 mb-3 text-slate-300" />
                <p>{t('work_orders.no_orders', 'Nu există comenzi de lucru active.')}</p>
            </div>
        )
    }

    const STATUS_COLORS = {
        sent: 'text-amber-600 bg-amber-50 border-amber-200',
        confirmed: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
    }

    const STATUS_KEYS = {
        sent: 'status_sent',
        confirmed: 'status_confirmed',
        in_progress: 'status_in_progress'
    }

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
                <ClipboardList className="w-6 h-6 text-blue-500" />
                {t('work_orders.active_orders', 'Comenzi Active')}
            </h2>

            {workOrders.map(wo => {
                const isExpanded = expandedId === wo.id
                const isEditingMat = editingMatId === wo.id

                return (
                    <div key={wo.id} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
                        {/* Header card */}
                        <div 
                            className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => {
                                if (isEditingMat) return // don't collapse if editing
                                setExpandedId(isExpanded ? null : wo.id)
                            }}
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-bold text-slate-900 leading-tight">{wo.title}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[wo.status] || 'bg-slate-100'}`}>
                                    {t(`work_orders.${STATUS_KEYS[wo.status]}`, wo.status)}
                                </span>
                            </div>
                            
                            <div className="space-y-1.5 mt-3">
                                {wo.site_name && (
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                                        <span className="font-medium">{wo.site_name}</span>
                                    </div>
                                )}
                                {wo.deadline_date && (
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>
                                            {t('timesheets.calendar', 'Termen:')} <span className="font-medium text-slate-700">{new Date(wo.deadline_date).toLocaleDateString()}</span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!isEditingMat && (
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium">
                                    <span>{isExpanded ? t('work_orders.hide_details', 'Ascunde detalii') : t('work_orders.view_details', 'Vezi detalii și materiale')}</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            )}
                        </div>

                        {/* Expandable details */}
                        {isExpanded && (
                            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4">
                                {wo.notes && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wider">{t('work_orders.internal_notes', 'Note Interne')}</h4>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{wo.notes}</p>
                                    </div>
                                )}

                                {wo.requirements?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-1.5">
                                            <Wrench className="w-3.5 h-3.5" /> {t('work_orders.requirements', 'Cerințe')}
                                        </h4>
                                        <ul className="space-y-2">
                                            {wo.requirements.map((req, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                                    <CircleDot className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <div>{req.description}</div>
                                                        {(req.qty || req.category) && (
                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                {req.qty && <span className="font-medium mr-2">{t('work_orders.qty', 'Cant')}: {req.qty}</span>}
                                                                {req.category && <span className="text-blue-600">{req.category}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {wo.materials?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5 text-slate-400" /> {t('work_orders.planned_materials', 'Materiale Planificate')}
                                        </h4>
                                        <ul className="space-y-2">
                                            {wo.materials.map((mat, i) => (
                                                <li key={i} className="flex items-center justify-between text-sm text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                                                    <span className="font-medium">{mat.name}</span>
                                                    <span className="text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                                        {mat.quantity} {mat.unit}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* CONSUMED MATERIALS SECTION */}
                                <div className="pt-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5 text-emerald-500" /> {t('work_orders.consumed_materials', 'Materiale Consumate')}
                                        </h4>
                                        {!isEditingMat && (
                                            <button 
                                                onClick={() => startEditingMaterials(wo)}
                                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg"
                                            >
                                                {t('work_orders.add_consumed', 'Raportează consum')}
                                            </button>
                                        )}
                                    </div>

                                    {!isEditingMat ? (
                                        wo.materials_consumed?.length > 0 ? (
                                            <ul className="space-y-2">
                                                {wo.materials_consumed.map((mat, i) => (
                                                    <li key={i} className="flex flex-col text-sm text-slate-700 bg-white p-2.5 rounded-lg border border-emerald-100 shadow-sm shadow-emerald-100/50">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-emerald-900">{mat.name}</span>
                                                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                                {mat.quantity} {mat.unit}
                                                            </span>
                                                        </div>
                                                        {mat.note && <span className="text-xs text-slate-500 italic block">{mat.note}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-sm text-slate-400 italic">Nu s-au raportat materiale consumate.</div>
                                        )
                                    ) : (
                                        /* EDIT MODE */
                                        <div className="space-y-2 bg-emerald-50/50 p-2 -mx-2 rounded-xl">
                                            {matRows.map((row, i) => (
                                                <div key={i} className="bg-white p-2 rounded-lg border border-emerald-200 flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:border-emerald-400 outline-none"
                                                            placeholder={t('work_orders.material_name', 'Denumire material *')}
                                                            value={row.name}
                                                            onChange={e => setMatRows(m => m.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                                                        />
                                                        <button
                                                            onClick={() => setMatRows(m => m.filter((_, j) => j !== i))}
                                                            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500"
                                                        >
                                                            <Trash className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="w-1/3 px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:border-emerald-400 outline-none text-center"
                                                            placeholder={t('work_orders.qty', 'Cant')}
                                                            value={row.quantity}
                                                            onChange={e => setMatRows(m => m.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r))}
                                                        />
                                                        <input
                                                            className="w-1/3 px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:border-emerald-400 outline-none text-center"
                                                            placeholder={t('work_orders.unit', 'UM')}
                                                            value={row.unit}
                                                            onChange={e => setMatRows(m => m.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))}
                                                        />
                                                    </div>
                                                    <input
                                                        className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm focus:border-emerald-400 outline-none"
                                                        placeholder={t('work_orders.notes', 'Notă...')}
                                                        value={row.note}
                                                        onChange={e => setMatRows(m => m.map((r, j) => j === i ? { ...r, note: e.target.value } : r))}
                                                    />
                                                </div>
                                            ))}
                                            
                                            <button
                                                onClick={() => setMatRows(m => [...m, { name: '', quantity: '', unit: '', note: '' }])}
                                                className="w-full py-2 border-2 border-dashed border-emerald-300 rounded-lg text-sm text-emerald-600 hover:bg-emerald-100 flex items-center justify-center gap-2 font-medium"
                                            >
                                                <Plus className="w-4 h-4" /> {t('work_orders.add_row', 'Adaugă rând')}
                                            </button>

                                            <div className="flex items-center gap-2 pt-2">
                                                <button
                                                    onClick={() => setEditingMatId(null)}
                                                    className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                                                >
                                                    <X className="w-4 h-4" /> {t('work_orders.cancel', 'Anulează')}
                                                </button>
                                                <button
                                                    disabled={matSaving}
                                                    onClick={() => saveMaterials(wo.id)}
                                                    className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-1 disabled:opacity-50"
                                                >
                                                    <Check className="w-4 h-4" /> {matSaving ? t('work_orders.saving', 'Se salvează...') : t('work_orders.save', 'Salvează')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
