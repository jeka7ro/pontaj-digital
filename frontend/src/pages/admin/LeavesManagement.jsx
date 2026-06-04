import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import {
  CalendarDays, Plus, Check, X, ChevronLeft, ChevronRight,
  Search, Filter, Loader2, Users, BarChart3, Wallet,
  FileText, Trash2, Clock, AlertCircle, RefreshCw, Eye
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  { value: 'CO',      label: 'Concediu Odihnă',             color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'CM',      label: 'Concediu Medical',             color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { value: 'CFS',     label: 'Concediu Fără Salariu',        color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'CNP',     label: 'Concediu Naștere/Paternitate', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'ABSENCE', label: 'Absență Nemotivată',           color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'OTHER',   label: 'Altele',                       color: 'bg-slate-100 text-slate-700 border-slate-200' },
]
const TYPE_MAP = Object.fromEntries(LEAVE_TYPES.map(t => [t.value, t]))

const STATUS_MAP = {
  pending:  { label: 'În așteptare', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Aprobat',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Respins',      cls: 'bg-red-50 text-red-700 border-red-200' },
}

const MONTH_NAMES = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']
const DAY_NAMES   = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOfMonth(year, month) {
  return (new Date(year, month, 1).getDay() + 6) % 7 // 0=Mon
}
function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function dateRange(start, end) {
  const dates = []
  let cur = new Date(start)
  const last = new Date(end)
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber:   'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    red:     'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    purple:  'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  }
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Badge({ type, value, className = '' }) {
  if (type === 'leave') {
    const t = TYPE_MAP[value]
    if (!t) return null
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${t.color} ${className}`}>{t.label}</span>
  }
  if (type === 'status') {
    const s = STATUS_MAP[value] || STATUS_MAP.pending
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.cls} ${className}`}>{s.label}</span>
  }
  return null
}

// ─── Add Leave Modal ──────────────────────────────────────────────────────────
function AddLeaveModal({ onClose, onSaved, employees }) {
  const [form, setForm] = useState({
    user_id: '', leave_type: 'CO',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.user_id) { setErr('Selectați un angajat.'); return }
    setSaving(true); setErr(null)
    try {
      await api.post('/admin/leaves/', form)
      onSaved()
    } catch(ex) {
      setErr(ex.response?.data?.detail || 'Eroare la salvare.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Adaugă Concediu</h2>
            <p className="text-xs text-slate-500 mt-0.5">Înregistrare directă de către administrator</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {err}
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">Angajat *</label>
            <select
              value={form.user_id}
              onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
              className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white"
              required
            >
              <option value="">— Selectați angajat —</option>
              {employees.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.employee_code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">Tip Concediu *</label>
            <select
              value={form.leave_type}
              onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
              className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white"
            >
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">Data Start *</label>
              <input
                type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">Data Sfârșit *</label>
              <input
                type="date" value={form.end_date}
                min={form.start_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">Notă / Motiv</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Motiv concediu (opțional)..."
              className="w-full px-4 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-5 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors">
              Anulează
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Se salvează...' : 'Adaugă'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Detail / Approve Modal ───────────────────────────────────────────────────
function LeaveDetailModal({ leave, onClose, onUpdated }) {
  const [adminNotes, setAdminNotes] = useState(leave.admin_notes || '')
  const [saving, setSaving] = useState(null) // 'approved' | 'rejected' | 'delete'

  const handleAction = async (status) => {
    setSaving(status)
    try {
      await api.put(`/admin/leaves/${leave.id}`, { status, admin_notes: adminNotes })
      onUpdated()
    } catch(e) {
      alert(e.response?.data?.detail || 'Eroare la actualizare.')
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Ștergi definitiv această cerere de concediu?')) return
    setSaving('delete')
    try {
      await api.delete(`/admin/leaves/${leave.id}`)
      onUpdated()
    } catch(e) {
      alert(e.response?.data?.detail || 'Eroare la ștergere.')
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Detalii Cerere</h2>
            <p className="text-xs text-slate-500 mt-0.5">{leave.user_name} · {leave.user_code}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Tip</p>
              <Badge type="leave" value={leave.leave_type} />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status</p>
              <Badge type="status" value={leave.status} />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Perioadă</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(leave.start_date)}</p>
              <p className="text-xs text-slate-400">→ {formatDate(leave.end_date)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Zile lucrătoare</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{leave.work_days}</p>
            </div>
          </div>

          {leave.notes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
              <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">Motiv angajat</p>
              <p className="text-sm text-blue-800 dark:text-blue-300">{leave.notes}</p>
            </div>
          )}

          {leave.approved_by_name && (
            <div className="text-xs text-slate-400">
              {leave.status === 'approved' ? '✓ Aprobat' : '✗ Acționat'} de <b>{leave.approved_by_name}</b> la {formatDate(leave.approved_at)}
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">Notă Admin</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={2}
              placeholder="Adaugă o notă (opțional)..."
              className="w-full px-4 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            {leave.status !== 'approved' && (
              <button onClick={() => handleAction('approved')} disabled={!!saving}
                className="flex-1 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Aprobă
              </button>
            )}
            {leave.status !== 'rejected' && (
              <button onClick={() => handleAction('rejected')} disabled={!!saving}
                className="flex-1 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Respinge
              </button>
            )}
            <button onClick={handleDelete} disabled={!!saving}
              className="w-10 h-10 rounded-full border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center shrink-0">
              {saving === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ year, month, leaves, onMonthChange }) {
  const totalDays = daysInMonth(year, month)
  const firstDay = firstDayOfMonth(year, month)

  // Build a map: date -> array of leaves
  const dayMap = {}
  leaves.forEach(lr => {
    const dates = dateRange(lr.start_date, lr.end_date)
    dates.forEach(d => {
      const dd = new Date(d)
      if (dd.getFullYear() === year && dd.getMonth() === month) {
        const day = dd.getDate()
        if (!dayMap[day]) dayMap[day] = []
        dayMap[day].push(lr)
      }
    })
  })

  const cells = []
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const isWeekend = (cellIndex) => {
    return (cellIndex % 7 === 5 || cellIndex % 7 === 6)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => onMonthChange(-1)}
          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button onClick={() => onMonthChange(1)}
          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
        {DAY_NAMES.map((d, i) => (
          <div key={d} className={`text-center py-2 text-[10px] font-bold uppercase tracking-wider ${i >= 5 ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const hasLeaves = day && dayMap[day]?.length > 0
          const weekend = isWeekend(i)
          const today = new Date()
          const isToday = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

          return (
            <div key={i}
              className={`min-h-[72px] p-1.5 border-b border-r border-slate-100 dark:border-slate-800 relative
                ${!day ? 'bg-slate-50 dark:bg-slate-800/30' : ''}
                ${weekend && day ? 'bg-slate-50/60 dark:bg-slate-800/20' : ''}
              `}
            >
              {day && (
                <>
                  <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-blue-600 text-white' : weekend ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {(dayMap[day] || []).slice(0, 2).map((lr, idx) => (
                      <div key={idx} className={`text-[9px] font-bold px-1 py-0.5 rounded truncate ${TYPE_MAP[lr.leave_type]?.color || ''}`}>
                        {lr.user_name.split(' ')[0]}
                      </div>
                    ))}
                    {dayMap[day]?.length > 2 && (
                      <div className="text-[9px] text-slate-400 px-1">+{dayMap[day].length - 2} mai mulți</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
        {LEAVE_TYPES.slice(0, 4).map(t => (
          <span key={t.value} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.color}`}>
            {t.value} — {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeavesManagement() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [leaves, setLeaves]     = useState([])
  const [calLeaves, setCalLeaves] = useState([])
  const [stats, setStats]       = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState('list') // 'list' | 'calendar' | 'balances'
  const [showAdd, setShowAdd]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType]     = useState('all')
  const [balances, setBalances] = useState([])
  const [balYear, setBalYear]   = useState(now.getFullYear())

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const params = { year }
      if (filterStatus !== 'all') params.status = filterStatus
      if (filterType   !== 'all') params.leave_type = filterType
      const [lRes, sRes] = await Promise.all([
        api.get('/admin/leaves/', { params }),
        api.get('/admin/leaves/stats', { params: { year } }),
      ])
      setLeaves(lRes.data)
      setStats(sRes.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [year, filterStatus, filterType])

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await api.get('/admin/leaves/calendar', { params: { year, month: month + 1 } })
      setCalLeaves(res.data)
    } catch(e) {}
  }, [year, month])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/admin/users/')
      setEmployees(res.data || [])
    } catch(e) {}
  }, [])

  const fetchBalances = useCallback(async () => {
    try {
      const res = await api.get('/admin/leaves/balances', { params: { year: balYear } })
      setBalances(res.data)
    } catch(e) {}
  }, [balYear])

  useEffect(() => { fetchLeaves(); fetchEmployees() }, [fetchLeaves, fetchEmployees])
  useEffect(() => { if (view === 'calendar') fetchCalendar() }, [view, fetchCalendar])
  useEffect(() => { if (view === 'balances') fetchBalances() }, [view, fetchBalances])

  const handleMonthChange = (dir) => {
    setMonth(m => {
      let nm = m + dir
      if (nm < 0) { setYear(y => y - 1); return 11 }
      if (nm > 11) { setYear(y => y + 1); return 0 }
      return nm
    })
  }

  const filtered = leaves.filter(l => {
    const q = search.toLowerCase()
    return !q || l.user_name?.toLowerCase().includes(q) || l.user_code?.toLowerCase().includes(q)
  })

  const handleSaved = () => {
    setShowAdd(false); setSelected(null)
    fetchLeaves(); fetchCalendar(); fetchBalances()
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            Concedii & Absențe
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gestionare cereri concediu, aprobare și balanțe</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
            {[2023,2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => { fetchLeaves(); fetchCalendar(); fetchBalances() }}
            className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adaugă
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={FileText} label="Total" value={stats.total} color="blue" />
          <StatCard icon={Check} label="Aprobate" value={stats.approved} color="green" />
          <StatCard icon={Clock} label="În așteptare" value={stats.pending} color="amber" />
          <StatCard icon={X} label="Respinse" value={stats.rejected} color="red" />
          <StatCard icon={Wallet} label="Zile CO folosite" value={`${stats.total_co_used}/${stats.total_co_allocated}`}
            sub="din total alocat" color="purple" />
        </div>
      )}

      {/* View tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-full p-1 w-fit">
        {[
          { key: 'list', label: 'Listă', icon: FileText },
          { key: 'calendar', label: 'Calendar', icon: CalendarDays },
          { key: 'balances', label: 'Balanțe CO', icon: Wallet },
        ].map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className={`flex items-center gap-1.5 px-4 h-8 rounded-full text-sm font-bold transition-all ${
              view === v.key
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}>
            <v.icon className="w-3.5 h-3.5" /> {v.label}
          </button>
        ))}
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Caută angajat..."
                className="w-full pl-10 pr-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none text-slate-900 dark:text-white shadow-sm" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Toate statusurile</option>
              <option value="pending">În așteptare</option>
              <option value="approved">Aprobate</option>
              <option value="rejected">Respinse</option>
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Toate tipurile</option>
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nu există cereri de concediu</p>
                <p className="text-sm mt-1">Adaugă prima cerere cu butonul de sus</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {['Angajat','Tip','Perioadă','Zile L.','Status','Creat','Acțiuni'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(lr => (
                    <tr key={lr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{lr.user_name}</p>
                        <p className="text-xs text-slate-400">{lr.user_code}</p>
                      </td>
                      <td className="px-4 py-3"><Badge type="leave" value={lr.leave_type} /></td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(lr.start_date)}</p>
                        <p className="text-xs text-slate-400">→ {formatDate(lr.end_date)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{lr.work_days}</span>
                      </td>
                      <td className="px-4 py-3"><Badge type="status" value={lr.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(lr.created_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelected(lr)}
                          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center text-slate-400 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <CalendarView year={year} month={month} leaves={calLeaves} onMonthChange={handleMonthChange} />
      )}

      {/* BALANCES VIEW */}
      {view === 'balances' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">An:</p>
            <select value={balYear} onChange={e => setBalYear(+e.target.value)}
              className="px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              {[2023,2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {balances.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nu există balanțe pentru {balYear}</p>
                <p className="text-sm mt-1">Balanțele se creează automat la prima aprobare CO</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {['Angajat','An','Total CO','Folosite','Rămase','Utilizare'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {balances.map(b => {
                    const pct = b.total_co_days > 0 ? Math.round((b.used_co_days / b.total_co_days) * 100) : 0
                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{b.user_name}</p>
                          <p className="text-xs text-slate-400">{b.user_code}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{b.year}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">{b.total_co_days} zile</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{b.used_co_days} zile</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${b.remaining_co_days > 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {b.remaining_co_days} zile
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[80px]">
                              <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && <AddLeaveModal onClose={() => setShowAdd(false)} onSaved={handleSaved} employees={employees} />}
      {selected && <LeaveDetailModal leave={selected} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); handleSaved() }} />}
    </div>
  )
}
