import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import api from '../../lib/api'
import {
    FileDown, Calendar, Users, Building2, Loader2, Download, Eye,
    BarChart3, Clock, TrendingUp, Activity, Filter, PieChart as PieChartIcon, FileSpreadsheet
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LabelList
} from 'recharts'
import DataTable from '../../components/DataTable'
import SearchableSelect from '../../components/SearchableSelect'
import KPICard from '../../components/KPICard'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

const toLocalISO = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
}

export default function ReportsPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
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
    }, [dateFrom, dateTo, selectedEmployee, selectedSite])

    const setDefaultDates = () => {
        const today = new Date()
        const lastWeek = new Date(today)
        lastWeek.setDate(today.getDate() - 7)
        setDateFrom(toLocalISO(lastWeek))
        setDateTo(toLocalISO(today))
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
        setDateFrom(toLocalISO(past))
        setDateTo(toLocalISO(today))
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
        ts.forEach(tNode => {
            const name = tNode.site_name || t('reports.unknown')
            if (!siteMap[name]) siteMap[name] = { name, hours: 0, count: 0 }
            siteMap[name].hours += tNode.hours_worked || 0
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
            .map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin',  day: '2-digit', month: 'short' }), hours: Math.round(d.hours * 10) / 10 }))

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

    const timesheetColumns = [
        { key: 'date', label: t('users.date'), sortable: true, render: (r) => new Date(r.date).toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin' }) },
        { key: 'employee_name', label: t('users.employee_col'), sortable: true, render: (r) => (
            <span 
                onClick={() => r.employee_id && navigate(`/admin/employees/${r.employee_id}`)}
                className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer hover:underline transition-colors"
            >
                {r.employee_name}
            </span> 
        ) },
        { key: 'employee_code', label: t('users.code'), sortable: true, render: (r) => <span className="text-slate-500">{r.employee_code}</span> },
        { key: 'role', label: t('users.role'), sortable: true, render: (r) => <span className="text-slate-500">{typeof r.role === 'object' ? (r.role?.name || r.role?.code || '') : (r.role || '')}</span> },
        { key: 'site_name', label: t('common.site'), sortable: true, render: (r) => <span className="text-slate-600 dark:text-slate-400">{r.site_name}</span> },
        { key: 'check_in', label: t('reports.table.check_in'), sortable: true, render: (r) => <span className="text-slate-600 dark:text-slate-400">{r.check_in}</span> },
        { key: 'check_out', label: t('reports.table.check_out'), sortable: true, render: (r) => <span className="text-slate-600 dark:text-slate-400">{r.check_out}</span> },
        { key: 'hours_worked', label: t('reports.table.hours'), sortable: true, render: (r) => <span className="font-bold text-blue-600 text-right block">{r.hours_worked}h</span> },
    ]

    const bySiteColumns = [
        { key: 'name', label: 'Șantier', sortable: true, render: (r, i) => (
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                 <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                 {r.name}
            </span>
        )},
        { key: 'count', label: t('reports.table.timesheets'), sortable: true, render: (r) => <span className="text-right block">{r.count}</span> },
        { key: 'hours', label: t('reports.table.total_hours'), sortable: true, render: (r) => <span className="font-bold text-blue-600 text-right block">{Math.round(r.hours * 10) / 10}h</span> },
        { key: 'avg', label: t('reports.table.avg_timesheet'), sortable: false, render: (r) => <span className="text-right block">{Math.round((r.hours / r.count) * 10) / 10}h</span> },
        { key: 'chart', label: t('reports.table.chart'), sortable: false, render: (r, i) => {
            const maxH = charts?.bySite[0]?.hours || 1;
            return (
                <div className="w-48 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(r.hours / maxH) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
            )
        }}
    ]

    const byEmployeeColumns = [
        { key: 'name', label: 'Angajat', sortable: true, render: (r) => <span className="font-semibold text-slate-800 dark:text-slate-200">{r.name}</span> },
        { key: 'days', label: t('timesheets.days_worked'), sortable: true, render: (r) => <span className="text-right block">{r.days}</span> },
        { key: 'hours', label: 'Total Ore', sortable: true, render: (r) => <span className="font-bold text-blue-600 text-right block">{Math.round(r.hours * 10) / 10}h</span> },
        { key: 'avg', label: t('reports.table.avg_day'), sortable: false, render: (r) => <span className="text-right block">{Math.round((r.hours / r.days) * 10) / 10}h</span> },
        { key: 'chart', label: 'Grafic', sortable: false, render: (r) => {
            const maxH = charts?.byEmployee[0]?.hours || 1;
            return (
                <div className="w-48 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{ width: `${(r.hours / maxH) * 100}%` }} />
                </div>
            )
        }}
    ]

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('reports.title')}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('reports.subtitle')}</p>
            </div>

            {/* Filters Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-2.5 mb-6">
                <div className="flex flex-col gap-3">
                    {/* Top Row: Quick Filters & Action Buttons */}
                    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 px-1">
                        <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto hide-scrollbar">
                            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 whitespace-nowrap"><Filter className="w-3.5 h-3.5" /> {t('reports.filters')}:</span>
                            {[
                                { label: t('reports.last_7_days'), fn: () => setQuickFilter(7) },
                                { label: t('reports.last_30_days'), fn: () => setQuickFilter(30) },
                                {
                                    label: t('timesheets.period.month'), fn: () => {
                                        const t = new Date()
                                        setDateFrom(toLocalISO(new Date(t.getFullYear(), t.getMonth(), 1)))
                                        setDateTo(toLocalISO(t))
                                    }
                                },
                                {
                                    label: t('reports.last_month'), fn: () => {
                                        const t = new Date()
                                        const first = new Date(t.getFullYear(), t.getMonth() - 1, 1)
                                        const last = new Date(t.getFullYear(), t.getMonth(), 0)
                                        setDateFrom(toLocalISO(first))
                                        setDateTo(toLocalISO(last))
                                    }
                                },
                            ].map(f => (
                                <button key={f.label} onClick={f.fn}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap">
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 w-full xl:w-auto">
                            <button onClick={handleDownloadExcel} disabled={loading || !preview}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>{t('reports.download_excel')}</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Bottom Row: Manual Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap w-16">{t('reports.from_date')}:</label>
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-full text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap w-16">{t('reports.to_date')}:</label>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-full text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap w-16">{t('users.employee_col')}:</label>
                            <SearchableSelect
                                value={selectedEmployee}
                                onChange={setSelectedEmployee}
                                placeholder={t('reports.all_employees')}
                                searchPlaceholder="Caută angajat..."
                                options={employees
                                    .filter(emp => !['Administrator', 'Super Administrator'].includes(emp.role))
                                    .map(emp => ({ value: emp.id, label: emp.full_name, subLabel: emp.employee_code }))}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap w-16">{t('common.site')}:</label>
                            <SearchableSelect
                                value={selectedSite}
                                onChange={setSelectedSite}
                                placeholder={t('reports.all_sites')}
                                searchPlaceholder="Caută șantier..."
                                options={sites.map(site => ({ value: site.id, label: site.name }))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Results */}
            {loading && !preview ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-xl mb-6">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('reports.loading')}</h3>
                    <p className="text-sm text-slate-500">{t('reports.loading_desc')}</p>
                </div>
            ) : !preview ? (
                <div className="flex flex-col items-center justify-center py-24 rounded-xl mb-6">
                    <BarChart3 className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">{t('reports.no_report')}</h3>
                    <p className="text-sm text-slate-400">{t('reports.no_report_desc')}</p>
                </div>
            ) : preview && charts ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
                        <KPICard label={t('reports.kpi.records')} value={charts.summaryCards.totalRecords} icon={BarChart3} colorTheme="blue" />
                        <KPICard label={t('timesheets.kpi.hours_worked')} value={`${Math.round(charts.summaryCards.totalHours * 10) / 10}h`} icon={Clock} colorTheme="indigo" isText />
                        <KPICard label={t('reports.kpi.employees')} value={charts.summaryCards.uniqueEmployees} icon={Users} colorTheme="green" />
                        <KPICard label={t('reports.kpi.sites')} value={charts.summaryCards.uniqueSites} icon={Building2} colorTheme="orange" />
                        <KPICard label={t('reports.kpi.days')} value={charts.summaryCards.uniqueDays} icon={Calendar} colorTheme="purple" />
                        <KPICard label={t('reports.kpi.avg_employee')} value={`${Math.round(charts.summaryCards.avgHoursPerEmployee * 10) / 10}h`} icon={TrendingUp} colorTheme="blue" isText />
                        <KPICard label={t('reports.kpi.avg_day')} value={`${Math.round(charts.summaryCards.avgHoursPerDay * 10) / 10}h`} icon={Activity} colorTheme="indigo" isText />
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Hours by Employee */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                {t('reports.charts.hours_employee')} (Top 10)
                            </h3>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={charts.byEmployee.slice(0, 10)} barSize={28}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(name) => name.split(' ')[0]} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#e2e8f0' }}
                                            formatter={(value) => [`${Math.round(value * 10) / 10}h`, t('reports.charts.hours_unit')]}
                                        />
                                        <defs>
                                            <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#6366f1" />
                                            </linearGradient>
                                        </defs>
                                        <Bar dataKey="hours" fill="url(#empGrad)" radius={[6, 6, 0, 0]}>
                                            <LabelList dataKey="hours" position="top" formatter={(val) => `${Math.round(val * 10) / 10}h`} fill="#64748b" fontSize={11} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Hours by Day */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                                {t('reports.charts.hours_day')}
                            </h3>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={charts.byDay} barSize={28}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#e2e8f0' }}
                                            formatter={(value, name) => [name === 'hours' ? `${value}h` : value, name === 'hours' ? t('reports.charts.hours') : t('reports.charts.workers')]}
                                        />
                                        <defs>
                                            <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="100%" stopColor="#34d399" />
                                            </linearGradient>
                                        </defs>
                                        <Bar dataKey="hours" fill="url(#dayGrad)" radius={[6, 6, 0, 0]}>
                                            <LabelList dataKey="hours" position="top" formatter={(val) => `${Math.round(val * 10) / 10}h`} fill="#64748b" fontSize={11} fontWeight="bold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Site Distribution Pie */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <PieChartIcon className="w-4 h-4 text-orange-500" />
                                {t('reports.charts.site_distribution')}
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
                                        >
                                            {charts.bySite.map((_, i) => (
                                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        <Tooltip formatter={(value) => [`${Math.round(value * 10) / 10}h`, 'Ore']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Employee Rankings */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-violet-500" />
                                {t('reports.charts.employee_ranking')}
                            </h3>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                {charts.byEmployee.map((emp, i) => {
                                    const maxH = charts.byEmployee[0]?.hours || 1
                                    return (
                                        <div key={emp.name} className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' :
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
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            {[
                                { key: 'timesheets', label: t('reports.tabs.timesheets'), icon: Clock },
                                { key: 'bySite', label: t('reports.tabs.by_site'), icon: Building2 },
                                { key: 'byEmployee', label: t('reports.tabs.by_employee'), icon: Users },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                                        activeTab === tab.key
                                        ? 'text-blue-600 border-blue-500 bg-white dark:bg-slate-900'
                                        : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                            <div className="flex-1" />
                            <div className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-semibold">{preview.total}</span> {t('reports.records')} •
                                <span className="font-semibold ml-1">{preview.total_hours}</span> {t('reports.charts.hours_unit')}
                            </div>
                        </div>

                        {activeTab === 'timesheets' && (
                            <DataTable
                                columns={timesheetColumns}
                                data={preview.timesheets}
                                loading={false}
                                emptyText={t('reports.no_report_desc')}
                            />
                        )}

                        {activeTab === 'bySite' && (
                            <DataTable
                                columns={bySiteColumns}
                                data={charts.bySite}
                                loading={false}
                                emptyText={t('reports.no_report_desc')}
                            />
                        )}

                        {activeTab === 'byEmployee' && (
                            <DataTable
                                columns={byEmployeeColumns}
                                data={charts.byEmployee}
                                loading={false}
                                emptyText={t('reports.no_report_desc')}
                            />
                        )}
                    </div>
                </>
            ) : !loading && null}
        </div>
    )
}


