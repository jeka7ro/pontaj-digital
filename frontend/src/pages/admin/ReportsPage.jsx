import { useState, useEffect } from 'react'
import { useAdminStore } from '../../store/adminStore'
import api from '../../lib/api'
import {
    FileDown, Calendar, Users, Building2, Loader2, Download, Eye,
    BarChart3, Clock, TrendingUp, Activity, Filter, PieChart as PieChartIcon
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function ReportsPage() {
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(null)
    const [employees, setEmployees] = useState([])
    const [sites, setSites] = useState([])
    const [activeTab, setActiveTab] = useState('timesheets')

    // Filters
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState('')
    const [selectedSite, setSelectedSite] = useState('')

    useEffect(() => {
        fetchEmployees()
        fetchSites()
        setDefaultDates()
    }, [])

    // Auto-load report after dates are set
    useEffect(() => {
        if (dateFrom && dateTo) {
            handlePreview()
        }
    }, [dateFrom, dateTo])

    const setDefaultDates = () => {
        const today = new Date()
        const lastWeek = new Date(today)
        lastWeek.setDate(today.getDate() - 7)
        setDateFrom(lastWeek.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
    }

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/admin/users/', { params: { page_size: 1000 } })
            setEmployees(res.data.users || [])
        } catch (e) { console.error(e) }
    }

    const fetchSites = async () => {
        try {
            const res = await api.get('/admin/sites/', { params: { page_size: 1000 } })
            setSites(res.data.sites || [])
        } catch (e) { console.error(e) }
    }

    const handlePreview = async () => {
        try {
            setLoading(true)
            const params = {}
            if (dateFrom) params.date_from = dateFrom
            if (dateTo) params.date_to = dateTo
            if (selectedEmployee) params.employee_id = selectedEmployee
            if (selectedSite) params.site_id = selectedSite

            const res = await api.get('/admin/reports/timesheets/preview', { params })
            setPreview(res.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const handleDownloadExcel = async () => {
        try {
            setLoading(true)
            const params = {}
            if (dateFrom) params.date_from = dateFrom
            if (dateTo) params.date_to = dateTo
            if (selectedEmployee) params.employee_id = selectedEmployee
            if (selectedSite) params.site_id = selectedSite

            const res = await api.get('/admin/reports/timesheets/excel', { params, responseType: 'blob' })
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `pontaje_${dateFrom}_${dateTo}.xlsx`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const setQuickFilter = (days) => {
        const today = new Date()
        const past = new Date(today)
        past.setDate(today.getDate() - days)
        setDateFrom(past.toISOString().split('T')[0])
        setDateTo(today.toISOString().split('T')[0])
    }

    // Compute chart data from preview
    const computeCharts = () => {
        if (!preview?.timesheets) return { byEmployee: [], bySite: [], byDay: [], summaryCards: {} }

        const ts = preview.timesheets

        // By employee
        const empMap = {}
        ts.forEach(t => {
            if (!empMap[t.employee_name]) empMap[t.employee_name] = { name: t.employee_name, hours: 0, days: 0 }
            empMap[t.employee_name].hours += t.hours_worked || 0
            empMap[t.employee_name].days++
        })
        const byEmployee = Object.values(empMap).sort((a, b) => b.hours - a.hours)

        // By site
        const siteMap = {}
        ts.forEach(t => {
            const name = t.site_name || 'Necunoscut'
            if (!siteMap[name]) siteMap[name] = { name, hours: 0, count: 0 }
            siteMap[name].hours += t.hours_worked || 0
            siteMap[name].count++
        })
        const bySite = Object.values(siteMap).sort((a, b) => b.hours - a.hours)

        // By day
        const dayMap = {}
        ts.forEach(t => {
            const day = t.date
            if (!dayMap[day]) dayMap[day] = { date: day, hours: 0, workers: 0 }
            dayMap[day].hours += t.hours_worked || 0
            dayMap[day].workers++
        })
        const byDay = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }), hours: Math.round(d.hours * 10) / 10 }))

        // Summary
        const totalHours = ts.reduce((s, t) => s + (t.hours_worked || 0), 0)
        const uniqueEmployees = new Set(ts.map(t => t.employee_name)).size
        const uniqueSites = new Set(ts.map(t => t.site_name)).size
        const uniqueDays = new Set(ts.map(t => t.date)).size
        const avgHoursPerEmployee = uniqueEmployees > 0 ? totalHours / uniqueEmployees : 0
        const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0

        return {
            byEmployee, bySite, byDay,
            summaryCards: { totalHours, uniqueEmployees, uniqueSites, uniqueDays, avgHoursPerEmployee, avgHoursPerDay, totalRecords: ts.length }
        }
    }

    const charts = preview ? computeCharts() : null

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">📊 Rapoarte</h1>
                <p className="text-sm text-slate-600">Analize și statistici detaliate pentru pontaje</p>
            </div>

            {/* Filters Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-blue-500" />
                    <h2 className="text-sm font-bold text-slate-700">Filtre Raport</h2>
                </div>

                {/* Quick Filters */}
                <div className="flex gap-2 mb-5 flex-wrap">
                    {[
                        { label: 'Ultimele 7 zile', fn: () => setQuickFilter(7) },
                        { label: 'Ultimele 30 zile', fn: () => setQuickFilter(30) },
                        {
                            label: 'Luna curentă', fn: () => {
                                const t = new Date()
                                setDateFrom(new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split('T')[0])
                                setDateTo(t.toISOString().split('T')[0])
                            }
                        },
                        {
                            label: 'Luna trecută', fn: () => {
                                const t = new Date()
                                const first = new Date(t.getFullYear(), t.getMonth() - 1, 1)
                                const last = new Date(t.getFullYear(), t.getMonth(), 0)
                                setDateFrom(first.toISOString().split('T')[0])
                                setDateTo(last.toISOString().split('T')[0])
                            }
                        },
                    ].map(f => (
                        <button key={f.label} onClick={f.fn}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> De la data
                        </label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> Până la data
                        </label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <Users className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> Angajat
                        </label>
                        <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none">
                            <option value="">Toți angajații</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            <Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> Șantier
                        </label>
                        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none">
                            <option value="">Toate șantierele</option>
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-5">
                    <button onClick={handlePreview} disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        Generează Raport
                    </button>
                    <button onClick={handleDownloadExcel} disabled={loading || !preview}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download className="w-4 h-4" />
                        Descarcă Excel
                    </button>
                </div>
            </div>

            {/* Report Results */}
            {preview && charts ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
                        <SummaryCard label="Înregistrări" value={charts.summaryCards.totalRecords} icon={BarChart3} color="text-blue-600 bg-blue-50 border-blue-100" />
                        <SummaryCard label="Total Ore" value={`${Math.round(charts.summaryCards.totalHours * 10) / 10}h`} icon={Clock} color="text-indigo-600 bg-indigo-50 border-indigo-100" />
                        <SummaryCard label="Angajați" value={charts.summaryCards.uniqueEmployees} icon={Users} color="text-emerald-600 bg-emerald-50 border-emerald-100" />
                        <SummaryCard label="Șantiere" value={charts.summaryCards.uniqueSites} icon={Building2} color="text-orange-600 bg-orange-50 border-orange-100" />
                        <SummaryCard label="Zile" value={charts.summaryCards.uniqueDays} icon={Calendar} color="text-violet-600 bg-violet-50 border-violet-100" />
                        <SummaryCard label="Medie / Angajat" value={`${Math.round(charts.summaryCards.avgHoursPerEmployee * 10) / 10}h`} icon={TrendingUp} color="text-sky-600 bg-sky-50 border-sky-100" />
                        <SummaryCard label="Medie / Zi" value={`${Math.round(charts.summaryCards.avgHoursPerDay * 10) / 10}h`} icon={Activity} color="text-pink-600 bg-pink-50 border-pink-100" />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Hours by Employee */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                Ore pe Angajat
                            </h3>
                            <div style={{ width: '100%', height: Math.max(200, charts.byEmployee.length * 36) }}>
                                <ResponsiveContainer>
                                    <BarChart data={charts.byEmployee.slice(0, 15)} layout="vertical" barSize={20}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                            formatter={(value) => [`${Math.round(value * 10) / 10}h`, 'Ore']}
                                        />
                                        <defs>
                                            <linearGradient id="empGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#6366f1" />
                                            </linearGradient>
                                        </defs>
                                        <Bar dataKey="hours" fill="url(#empGrad)" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Hours by Day */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                                Ore pe Zi
                            </h3>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={charts.byDay} barSize={28}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                            formatter={(value, name) => [name === 'hours' ? `${value}h` : value, name === 'hours' ? 'Ore' : 'Muncitori']}
                                        />
                                        <defs>
                                            <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="100%" stopColor="#34d399" />
                                            </linearGradient>
                                        </defs>
                                        <Bar dataKey="hours" fill="url(#dayGrad)" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Site Distribution Pie */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <PieChartIcon className="w-4 h-4 text-orange-500" />
                                Distribuție pe Șantiere
                            </h3>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={charts.bySite}
                                            dataKey="hours"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            innerRadius={55}
                                            paddingAngle={3}
                                            label={({ name, hours }) => `${name}: ${Math.round(hours)}h`}
                                        >
                                            {charts.bySite.map((_, i) => (
                                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${Math.round(value * 10) / 10}h`, 'Ore']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Employee Rankings */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-violet-500" />
                                Clasament Angajați
                            </h3>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                {charts.byEmployee.map((emp, i) => {
                                    const maxH = charts.byEmployee[0]?.hours || 1
                                    return (
                                        <div key={emp.name} className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' :
                                                i === 1 ? 'bg-slate-200 text-slate-600' :
                                                    i === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-sm font-medium text-slate-700 truncate">{emp.name}</span>
                                                    <span className="text-sm font-bold text-blue-600 ml-2">{Math.round(emp.hours * 10) / 10}h</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                                                        style={{ width: `${(emp.hours / maxH) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Tabs: Timesheets / By Site */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center border-b border-slate-200 bg-slate-50">
                            {[
                                { key: 'timesheets', label: 'Detalii Pontaj', icon: Clock },
                                { key: 'bySite', label: 'Pe Șantiere', icon: Building2 },
                                { key: 'byEmployee', label: 'Pe Angajați', icon: Users },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab.key
                                        ? 'text-blue-600 border-blue-500 bg-white'
                                        : 'text-slate-500 border-transparent hover:text-slate-700'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                            <div className="flex-1" />
                            <div className="px-5 py-3 text-sm text-slate-600">
                                <span className="font-semibold">{preview.total}</span> înregistrări •
                                <span className="font-semibold ml-1">{preview.total_hours}</span> ore
                            </div>
                        </div>

                        {activeTab === 'timesheets' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Data</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Angajat</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Cod</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Rol</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Șantier</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Intrare</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Ieșire</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Ore</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {preview.timesheets.map((ts) => (
                                            <tr key={ts.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-5 py-3 text-sm text-slate-900">{new Date(ts.date).toLocaleDateString('ro-RO')}</td>
                                                <td className="px-5 py-3 text-sm font-medium text-slate-900">{ts.employee_name}</td>
                                                <td className="px-5 py-3 text-sm text-slate-500">{ts.employee_code}</td>
                                                <td className="px-5 py-3 text-sm text-slate-500">{ts.role}</td>
                                                <td className="px-5 py-3 text-sm text-slate-600">{ts.site_name}</td>
                                                <td className="px-5 py-3 text-sm text-slate-600">{ts.check_in}</td>
                                                <td className="px-5 py-3 text-sm text-slate-600">{ts.check_out}</td>
                                                <td className="px-5 py-3 text-sm font-bold text-blue-600 text-right">{ts.hours_worked}h</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'bySite' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Șantier</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Pontaje</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Ore</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Medie/Pontaj</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Grafic</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {charts.bySite.map((site, i) => {
                                            const maxH = charts.bySite[0]?.hours || 1
                                            return (
                                                <tr key={site.name} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                            {site.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 text-right">{site.count}</td>
                                                    <td className="px-5 py-3 text-sm font-bold text-blue-600 text-right">{Math.round(site.hours * 10) / 10}h</td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 text-right">{Math.round((site.hours / site.count) * 10) / 10}h</td>
                                                    <td className="px-5 py-3 w-48">
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all" style={{ width: `${(site.hours / maxH) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'byEmployee' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Angajat</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Zile lucrate</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Ore</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Medie/Zi</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Grafic</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {charts.byEmployee.map((emp, i) => {
                                            const maxH = charts.byEmployee[0]?.hours || 1
                                            return (
                                                <tr key={emp.name} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' :
                                                            i === 1 ? 'bg-slate-200 text-slate-600' :
                                                                i === 2 ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-slate-100 text-slate-500'
                                                            }`}>{i + 1}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">{emp.name}</td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 text-right">{emp.days}</td>
                                                    <td className="px-5 py-3 text-sm font-bold text-blue-600 text-right">{Math.round(emp.hours * 10) / 10}h</td>
                                                    <td className="px-5 py-3 text-sm text-slate-600 text-right">{Math.round((emp.hours / emp.days) * 10) / 10}h</td>
                                                    <td className="px-5 py-3 w-48">
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${(emp.hours / maxH) * 100}%` }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : !loading && (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <FileDown className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Selectează filtrele și apasă "Generează Raport"</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">Raportul va include grafice vizuale, statistici, and tabel detaliat cu toate pontajele din perioada selectată</p>
                </div>
            )}
        </div>
    )
}

function SummaryCard({ label, value, icon: Icon, color }) {
    return (
        <div className={`rounded-xl p-3.5 border ${color}`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-lg font-bold">{value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
        </div>
    )
}
