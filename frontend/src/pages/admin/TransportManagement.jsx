import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Truck, MapPin, Clock, Gauge, Route, Calendar,
  Plus, Download, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Filter, RefreshCw, Loader2, Settings,
  Navigation, Fuel, User, Building2, BarChart3, Eye,
  ArrowLeft, Play, Square, Shield, Info
} from 'lucide-react';

const API = '/api';

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_MAP = {
  in_progress:  { label: 'În desfășurare', color: '#f59e0b', bg: '#fef3c7', dot: true },
  completed:    { label: 'Finalizat',       color: '#10b981', bg: '#d1fae5', dot: false },
  approved:     { label: 'Aprobat',         color: '#2563eb', bg: '#dbeafe', dot: false },
  rejected:     { label: 'Respins',         color: '#ef4444', bg: '#fee2e2', dot: false },
  cancelled:    { label: 'Anulat',          color: '#6b7280', bg: '#f3f4f6', dot: false },
};

const PURPOSE_LABELS = {
  transport_materiale:  '🏗️ Transport materiale',
  deplasare_personal:   '👤 Deplasare personal',
  service:              '🔧 Service / Reparații',
  livrare:              '📦 Livrare',
  alte:                 '📋 Alte',
};

const DAY_NAMES = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

function fmt(n, unit = '') {
  if (n == null) return '—';
  return `${n}${unit}`;
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDuration(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`${API}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Eroare server');
  }
  return res.json();
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{ background: s.bg, color: s.color }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
      style={{ background: s.bg, color: s.color, borderColor: s.color + '33' }}>
      {s.dot && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: s.color }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: s.color }} />
        </span>
      )}
      {s.label}
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, unit, color = '#2563eb', sub }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '18' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
          {value ?? '—'}
          {unit && <span className="text-sm font-semibold text-slate-400 ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Schedule Warning Banner ────────────────────────────────────────────────

function ScheduleBanner({ schedule }) {
  if (!schedule || schedule.can_start_trip) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 flex items-start gap-3 mb-6">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-amber-800 dark:text-amber-400 text-sm">Program transport inactiv</p>
        <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">{schedule.message}</p>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
          Program: <strong>{schedule.schedule?.start_time}–{schedule.schedule?.end_time}</strong> |
          Zile: <strong>{schedule.schedule?.allowed_day_names?.join(', ')}</strong>
          {schedule.schedule?.strict && <span className="ml-2 text-red-600 font-bold">• Strict (drumuri blocate)</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Leaflet Map Component ─────────────────────────────────────────────────

function TripMap({ trip }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.L) return;

    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB', maxZoom: 19
    }).addTo(map);
    mapInstanceRef.current = map;

    const pts = trip.visited_points || [];
    if (pts.length > 0) {
      const latlngs = pts.map(p => [p.lat, p.lng]);

      // Polyline trace
      L.polyline(latlngs, { color: '#3b82f6', weight: 4, opacity: 0.85, lineJoin: 'round' }).addTo(map);

      // Start marker (green)
      const startIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
        className: '', iconAnchor: [7, 7]
      });
      L.marker(latlngs[0], { icon: startIcon })
        .bindPopup(`<b>Start</b><br/>${trip.start_address || '—'}<br/>${fmtTime(trip.start_time)}`)
        .addTo(map);

      // End marker (red) — only if trip completed
      if (latlngs.length > 1 && trip.status !== 'in_progress') {
        const endIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
          className: '', iconAnchor: [7, 7]
        });
        L.marker(latlngs[latlngs.length - 1], { icon: endIcon })
          .bindPopup(`<b>Stop</b><br/>${trip.end_address || '—'}<br/>${fmtTime(trip.end_time)}`)
          .addTo(map);
      }

      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    } else if (trip.start_lat) {
      map.setView([trip.start_lat, trip.start_lng], 13);
    } else {
      map.setView([44.4, 26.1], 6);
    }

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [trip]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative" style={{ height: 320 }}>
      {!window.L && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <p className="text-sm text-slate-500">Hartă indisponibilă (Leaflet JS lipsă)</p>
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// ─── Trip Detail Modal ─────────────────────────────────────────────────────

function TripDetail({ trip, onClose, onApprove }) {
  const [loading, setLoading] = useState(false);
  const [rejNote, setRejNote] = useState('');

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await onApprove(trip.id, action, rejNote);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" />
              {trip.vehicle_name || '—'} — {trip.vehicle_plate || ''}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{fmtDate(trip.date)} · {trip.driver_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={trip.status} />
            {trip.out_of_schedule && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Afara programului
              </span>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors">
              <XCircle className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Route, label: 'KM Parcurși', value: fmt(trip.distance_km, ' km'), color: '#2563eb' },
              { icon: Clock, label: 'Durată', value: fmtDuration(trip.duration_minutes), color: '#10b981' },
              { icon: Gauge, label: 'Vit. Medie', value: fmt(trip.avg_speed_kmh, ' km/h'), color: '#8b5cf6' },
              { icon: Gauge, label: 'Vit. Maximă', value: fmt(trip.max_speed_kmh, ' km/h'), color: '#f59e0b' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                <p className="text-base font-extrabold text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Route info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Plecare · {fmtTime(trip.start_time)}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{trip.start_address || '—'}</p>
              {trip.start_odometer != null && (
                <p className="text-xs text-slate-500 mt-1">Odometru start: <strong>{trip.start_odometer} km</strong></p>
              )}
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Sosire · {fmtTime(trip.end_time)}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{trip.end_address || trip.site_name || '—'}</p>
              {trip.end_odometer != null && (
                <p className="text-xs text-slate-500 mt-1">Odometru stop: <strong>{trip.end_odometer} km</strong></p>
              )}
            </div>
          </div>

          {/* Scop + GPS count */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 font-semibold border border-blue-100">
              {PURPOSE_LABELS[trip.purpose_category] || trip.purpose_category || '—'}
            </span>
            {trip.purpose_notes && (
              <span className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {trip.purpose_notes}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              {trip.gps_points_count || 0} puncte GPS înregistrate
            </span>
          </div>

          {/* Avertisment program */}
          {trip.out_of_schedule && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800">Drum în afara programului de transport</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Program alocat: {trip.scheduled_start_time}–{trip.scheduled_end_time}
                </p>
                {trip.out_of_schedule_note && (
                  <p className="text-xs text-amber-600 mt-0.5">{trip.out_of_schedule_note}</p>
                )}
              </div>
            </div>
          )}

          {/* Hartă GPS */}
          {trip.visited_points?.length > 0 ? (
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" /> Traseu GPS
              </h3>
              <TripMap trip={trip} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <Navigation className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nu există puncte GPS înregistrate pentru acest drum.</p>
            </div>
          )}

          {/* Actions */}
          {trip.status === 'completed' && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Validare foaie de parcurs</p>
              <div className="space-y-3">
                <input
                  value={rejNote}
                  onChange={e => setRejNote(e.target.value)}
                  placeholder="Motiv respingere (opțional)..."
                  className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction('approve')}
                    disabled={loading}
                    className="flex-1 px-5 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Aprobă
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={loading}
                    className="flex-1 px-5 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Respinge
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Config Modal ─────────────────────────────────────────────────

function ScheduleModal({ onClose, onSaved }) {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    apiFetch('/admin/transport/schedule/config')
      .then(setCfg)
      .catch(e => setToast({ type: 'error', msg: e.message }));
  }, []);

  const toggleDay = (d) => {
    setCfg(c => {
      const days = c.transport_allowed_days.includes(d)
        ? c.transport_allowed_days.filter(x => x !== d)
        : [...c.transport_allowed_days, d];
      return { ...c, transport_allowed_days: days };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/admin/transport/schedule/config', {
        method: 'PUT',
        body: JSON.stringify({
          transport_start_time: cfg.transport_start_time,
          transport_end_time: cfg.transport_end_time,
          transport_allowed_days: cfg.transport_allowed_days,
          transport_strict_schedule: cfg.transport_strict_schedule,
        }),
      });
      setToast({ type: 'success', msg: 'Program salvat!' });
      setTimeout(() => { onSaved(); onClose(); }, 900);
    } catch (e) {
      setToast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" /> Program Transport
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {!cfg ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Interval orar */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Interval Orar Permis
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[11px] text-slate-400 mb-1">De la</p>
                  <input
                    type="time" value={cfg.transport_start_time || '06:00'}
                    onChange={e => setCfg(c => ({ ...c, transport_start_time: e.target.value }))}
                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
                <span className="text-slate-300 font-bold mt-5">→</span>
                <div className="flex-1">
                  <p className="text-[11px] text-slate-400 mb-1">Până la</p>
                  <input
                    type="time" value={cfg.transport_end_time || '20:00'}
                    onChange={e => setCfg(c => ({ ...c, transport_end_time: e.target.value }))}
                    className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Zile permise */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Zile Lucrătoare Transport
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((name, idx) => {
                  const active = cfg.transport_allowed_days?.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                      style={active
                        ? { background: '#2563eb', color: 'white', borderColor: '#2563eb' }
                        : { background: 'transparent', color: '#64748b', borderColor: '#e2e8f0' }
                      }>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mod strict */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Program Strict</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dacă activ — drumurile <strong>sunt blocate</strong> complet în afara programului.
                  Dacă inactiv — sunt permise, dar marcate cu avertisment.
                </p>
              </div>
              <button
                onClick={() => setCfg(c => ({ ...c, transport_strict_schedule: !c.transport_strict_schedule }))}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ml-4 ${cfg.transport_strict_schedule ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${cfg.transport_strict_schedule ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {toast && (
              <div className={`p-3 rounded-xl text-sm font-semibold ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {toast.msg}
              </div>
            )}

            <button
              onClick={save}
              disabled={saving}
              className="w-full px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Salvează Program
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Trip Modal ────────────────────────────────────────────────────────

function NewTripModal({ vehicles, drivers, sites, onClose, onCreated }) {
  const [form, setForm] = useState({
    vehicle_id: '', driver_id: '', site_id: '',
    purpose_category: 'transport_materiale', purpose_notes: '',
    start_odometer: '', start_address: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.vehicle_id || !form.driver_id) {
      setError('Selectați vehiculul și șoferul.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch('/admin/transport/', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          start_odometer: form.start_odometer ? parseFloat(form.start_odometer) : null,
          site_id: form.site_id || null,
        }),
      });
      onCreated(result);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-500" /> Pornire Drum Nou
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Vehicul */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Vehicul *</label>
            <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
              className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none">
              <option value="">— Selectați —</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name} {v.plate_number ? `(${v.plate_number})` : ''}</option>
              ))}
            </select>
          </div>
          {/* Șofer */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Șofer *</label>
            <select value={form.driver_id} onChange={e => set('driver_id', e.target.value)}
              className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none">
              <option value="">— Selectați —</option>
              {drivers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.employee_code})</option>
              ))}
            </select>
          </div>
          {/* Destinație */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Destinație (șantier)</label>
              <select value={form.site_id} onChange={e => set('site_id', e.target.value)}
                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none">
                <option value="">— Fără destinație —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">KM Start (odometru)</label>
              <input type="number" value={form.start_odometer} onChange={e => set('start_odometer', e.target.value)}
                placeholder="ex: 125430"
                className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none" />
            </div>
          </div>
          {/* Scop */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Scopul deplasării</label>
            <select value={form.purpose_category} onChange={e => set('purpose_category', e.target.value)}
              className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none">
              {Object.entries(PURPOSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <input value={form.purpose_notes} onChange={e => set('purpose_notes', e.target.value)}
            placeholder="Detalii scop (opțional)..."
            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none" />
          <input value={form.start_address} onChange={e => set('start_address', e.target.value)}
            placeholder="Adresa de pornire (opțional)..."
            className="w-full px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none" />

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
          <button onClick={submit} disabled={saving}
            className="w-full px-5 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Pornește Drumul
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function TransportManagement() {
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({
    date_from: new Date().toISOString().slice(0, 10),
    date_to: '',
    vehicle_id: '',
    driver_id: '',
    status: '',
  });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));

      const [tripsData, statsData, schedData, vehData, usersData, sitesData] = await Promise.all([
        apiFetch(`/admin/transport/?${params}`),
        apiFetch(`/admin/transport/stats?${params}`),
        apiFetch('/admin/transport/schedule/check').catch(() => null),
        apiFetch('/admin/vehicles?status=active').catch(() => []),
        apiFetch('/admin/users/?page_size=200').catch(() => ({ users: [] })),
        apiFetch('/admin/sites/').catch(() => ({ sites: [] })),
      ]);

      setTrips(tripsData.trips || []);
      setStats(statsData);
      setSchedule(schedData);
      setVehicles(Array.isArray(vehData) ? vehData : []);
      setDrivers(usersData.users || []);
      setSites(sitesData.sites || []);
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleApprove = async (id, action, note) => {
    await apiFetch(`/admin/transport/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ action, rejection_note: note }),
    });
    showToast('success', action === 'approve' ? 'Foaia aprobată!' : 'Foaia respinsă!');
    loadAll();
  };

  const exportExcel = async () => {
    const token = localStorage.getItem('admin_token');
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    const res = await fetch(`${API}/admin/transport/export/excel?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foi_parcurs.xlsx';
    a.click();
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Leaflet CSS */}
      {!document.getElementById('leaflet-css') && (() => {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(script);
        return null;
      })()}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-500" /> Foi de Parcurs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Înregistrare și monitorizare drumuri vehicule
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowSchedule(true)}
            className="px-5 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" /> Program
          </button>
          <button onClick={exportExcel}
            className="px-5 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowNew(true)}
            className="px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> Drum Nou
          </button>
        </div>
      </div>

      {/* Schedule banner */}
      <ScheduleBanner schedule={schedule} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Route}   label="KM Totali"      value={stats.total_km}              unit="km"   color="#2563eb" />
          <StatCard icon={Truck}   label="Drumuri Totale" value={stats.total_trips}                        color="#8b5cf6" />
          <StatCard icon={Gauge}   label="Vit. Medie"     value={stats.avg_speed_kmh}          unit="km/h" color="#f59e0b" />
          <StatCard icon={Clock}   label="Ore Condus"     value={stats.total_duration_hours}   unit="h"    color="#10b981" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)}
            className="px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none" />
          <span className="text-slate-300">→</span>
          <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)}
            className="px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none" />
          <select value={filters.vehicle_id} onChange={e => setFilter('vehicle_id', e.target.value)}
            className="px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none">
            <option value="">Toate vehiculele</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
            className="px-4 h-10 text-sm rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 outline-none">
            <option value="">Toate statusurile</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={loadAll} className="w-10 h-10 rounded-full border border-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 flex items-center justify-center transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : trips.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nu există foi de parcurs pentru filtrele selectate.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  {['Data', 'Vehicul', 'Șofer', 'Plecare → Destinație', 'Orar', 'KM', 'Durată', 'Vit. Medie', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {trips.map(t => (
                  <tr key={t.id}
                    onClick={() => setSelectedTrip(t)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmtDate(t.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{t.vehicle_name || '—'}</p>
                          <p className="text-[11px] text-slate-400">{t.vehicle_plate || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.driver_name || '—'}</p>
                      <p className="text-[11px] text-slate-400">{t.driver_code || ''}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className="truncate max-w-[120px]">{t.start_address || '—'}</span>
                        <ChevronRight className="w-3 h-3 flex-shrink-0 text-slate-300" />
                        <span className="truncate max-w-[120px]">{t.end_address || t.site_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {fmtTime(t.start_time)} → {fmtTime(t.end_time)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {fmt(t.distance_km, ' km')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {fmtDuration(t.duration_minutes)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {fmt(t.avg_speed_kmh, ' km/h')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={t.status} />
                        {t.out_of_schedule && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-2.5 h-2.5" /> Afara prog.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Drivers / Vehicles */}
      {stats && (stats.top_drivers?.length > 0 || stats.top_vehicles?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Șoferi */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> Top Șoferi (KM)
              </h3>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {stats.top_drivers.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{d.name}</p>
                      <p className="text-[11px] text-slate-400">{d.trips} drum{d.trips !== 1 ? 'uri' : ''}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{d.km} km</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Vehicule */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" /> Top Vehicule (KM)
              </h3>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {stats.top_vehicles.map((v, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{v.name}</p>
                      <p className="text-[11px] text-slate-400">{v.plate} · {v.trips} drum{v.trips !== 1 ? 'uri' : ''}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{v.km} km</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedTrip && (
        <TripDetail
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onApprove={handleApprove}
        />
      )}
      {showNew && (
        <NewTripModal
          vehicles={vehicles}
          drivers={drivers}
          sites={sites}
          onClose={() => setShowNew(false)}
          onCreated={() => loadAll()}
        />
      )}
      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onSaved={() => loadAll()}
        />
      )}
    </div>
  );
}
