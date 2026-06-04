/**
 * SiteMap — Leaflet-based interactive map for the Admin Dashboard
 */
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet default icon broken paths in Vite/Webpack bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

export default function SiteMap({ selectedSiteId, onSiteSelect, workers = [], onWorkerSelect }) {
    const { t } = useTranslation()
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markersRef = useRef([])
    const workerMarkersRef = useRef([])
    const circleRef = useRef(null)
    const [sites, setSites] = useState([])
    const [selectedSite, setSelectedSite] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch map data from backend
    useEffect(() => {
        api.get('/admin/sites/map-data/all')
            .then(r => {
                setSites(r.data || [])
                setError(null)
            })
            .catch(e => {
                console.error('SiteMap fetch error:', e)
                setError('Nu s-au putut incarca datele hartii.')
            })
            .finally(() => setLoading(false))
    }, [])

    // Initialize Leaflet map once
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return

        mapInstanceRef.current = L.map(mapRef.current, {
            center: [45.75, 24.5], // Romania
            zoom: 7,
            zoomControl: true,
            scrollWheelZoom: false, // Prevents page scrolling trap
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(mapInstanceRef.current)

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [])

    // Add markers when sites load
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || sites.length === 0) return

        // Clear old markers
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []
        if (circleRef.current) { circleRef.current.remove(); circleRef.current = null }

        const withCoords = sites.filter(s => s.latitude && s.longitude)

        withCoords.forEach(site => {
            const color = site.active_workers > 0 ? '#1d4ed8' : '#64748b'
            const borderColor = site.active_workers > 0 ? '#93c5fd' : '#cbd5e1'

            const icon = L.divIcon({
                className: '',
                html: `
                    <div style="
                        background:${color};color:#fff;
                        border:2px solid ${borderColor};
                        border-radius:8px;padding:4px 10px;
                        font-size:12px;font-weight:600;
                        font-family:system-ui,sans-serif;
                        white-space:nowrap;
                        box-shadow:0 2px 8px rgba(0,0,0,0.3);
                        display:flex;align-items:center;gap:6px;">
                        ${site.name.length > 20 ? site.name.substring(0, 18) + '…' : site.name}
                        ${site.active_workers > 0 ? `<span style="background:rgba(255,255,255,0.25);border-radius:999px;padding:1px 7px;font-size:11px;">${site.active_workers}</span>` : ''}
                    </div>`,
                iconAnchor: [0, 0],
                popupAnchor: [0, -10],
            })

            const marker = L.marker([site.latitude, site.longitude], { icon })
                .addTo(map)
                .on('click', () => {
                    setSelectedSite(site)
                    if (onSiteSelect) onSiteSelect(site.id)
                    if (circleRef.current) circleRef.current.remove()
                    circleRef.current = L.circle([site.latitude, site.longitude], {
                        radius: site.geofence_radius || 100,
                        color: '#3b82f6', fillColor: '#3b82f6',
                        fillOpacity: 0.12, weight: 2, dashArray: '6 4',
                    }).addTo(map)
                    map.flyTo([site.latitude, site.longitude], 14, { duration: 1.2 })
                })

            markersRef.current.push(marker)
        })

        // Auto-fit bounds to all markers (sites only)
        if (withCoords.length > 0 && !selectedSite) {
            try {
                const group = L.featureGroup(markersRef.current)
                map.fitBounds(group.getBounds().pad(0.2))
            } catch (e) { /* ignore if bounds fail */ }
        }
    }, [sites])

    // Draw worker markers based on GPS Check-in
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        // Clear old worker markers
        workerMarkersRef.current.forEach(m => m.remove())
        workerMarkersRef.current = []

        const liveWorkers = workers.filter(w => w.status !== 'terminat' && w.latitude && w.longitude)

        liveWorkers.forEach(worker => {
            const initial = worker.worker_name ? worker.worker_name.charAt(0).toUpperCase() : 'W'
            // Color based on status
            let color = '#10b981' // Green for active
            if (worker.status === 'gps_pierdut') color = '#f59e0b'
            if (worker.status === 'geofence') color = '#ef4444'
            if (worker.status === 'pauză') color = '#6366f1'

            const iconHtml = worker.avatar_path 
                ? `<div style="width:28px;height:28px;border-radius:50%;border:2.5px solid ${color};background-image:url(${worker.avatar_path});background-size:cover;background-position:center;box-shadow:0 3px 6px rgba(0,0,0,0.4);"></div>`
                : `<div style="width:28px;height:28px;border-radius:50%;border:2px solid #fff;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;box-shadow:0 3px 6px rgba(0,0,0,0.4);">${initial}</div>`

            const icon = L.divIcon({
                className: '',
                html: iconHtml,
                iconAnchor: [14, 14],
                popupAnchor: [0, -14],
            })

            const checkInTime = new Date(worker.check_in_time).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
            
            let statusText = worker.status
            if (worker.status === 'geofence') statusText = 'În afara perimetrului'
            if (worker.status === 'gps_pierdut') statusText = 'GPS Pierdut'
            if (worker.status === 'activ') statusText = 'Activ pe șantier'
            if (worker.status === 'pauză') statusText = 'În pauză'

            const popupHtml = `
                <div class="p-1 min-w-[200px] font-sans">
                    <div class="flex items-center gap-3 mb-3 border-b border-slate-100 pb-2">
                        ${iconHtml}
                        <div>
                            <b class="text-sm text-slate-800 leading-none block">${worker.worker_name}</b>
                            <span class="text-[10px] text-slate-500">Cod: ${worker.employee_code || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="space-y-1.5 text-xs text-slate-600 mb-4">
                        <div class="flex justify-between">
                            <span class="text-slate-400">Check-in:</span>
                            <span class="font-bold text-slate-700">${checkInTime}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">Ore lucrate:</span>
                            <span class="font-bold text-slate-700">${worker.worked_hours > 0 ? worker.worked_hours + 'h' : '0h'}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">Status:</span>
                            <div class="flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full" style="background:${color}"></span>
                                <span class="font-bold text-slate-700">${statusText}</span>
                            </div>
                        </div>
                        <div class="flex justify-between mt-2 pt-2 border-t border-slate-100">
                            <span class="text-slate-400">Activități raportate:</span>
                            <span class="font-bold text-blue-600">${worker.activities ? worker.activities.length : 0}</span>
                        </div>
                    </div>
                    <button class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-sm worker-detail-btn" data-worker-id="${worker.worker_id}">
                        Vezi Profil Complet
                    </button>
                </div>
            `

            const marker = L.marker([worker.latitude, worker.longitude], { icon, zIndexOffset: 1000 })
                .bindTooltip(`<b>${worker.worker_name}</b>`, { direction: 'top', offset: [0, -14], opacity: 0.9 })
                .bindPopup(popupHtml, { minWidth: 220, offset: [0, -10], className: 'rounded-xl overflow-hidden shadow-2xl' })
                .addTo(map)

            workerMarkersRef.current.push(marker)
        })

        const handlePopupOpen = (e) => {
            const btn = e.popup._contentNode?.querySelector('.worker-detail-btn')
            if (btn && onWorkerSelect) {
                btn.onclick = () => {
                    const wid = btn.getAttribute('data-worker-id')
                    const w = liveWorkers.find(x => String(x.worker_id) === wid)
                    if (w) onWorkerSelect(w)
                }
            }
        }
        
        map.on('popupopen', handlePopupOpen)

        return () => {
            map.off('popupopen', handlePopupOpen)
        }

    }, [workers, sites])

    const handleSitePillClick = (site) => {
        if (!site.latitude || !site.longitude) return
        const map = mapInstanceRef.current
        setSelectedSite(site)
        if (onSiteSelect) onSiteSelect(site.id)
        if (map) {
            map.flyTo([site.latitude, site.longitude], 14, { duration: 1.0 })
            if (circleRef.current) circleRef.current.remove()
            circleRef.current = L.circle([site.latitude, site.longitude], {
                radius: site.geofence_radius || 100,
                color: '#3b82f6', fillColor: '#3b82f6',
                fillOpacity: 0.12, weight: 2, dashArray: '6 4',
            }).addTo(map)
        }
    }

    const sitesWithCoords = sites.filter(s => s.latitude && s.longitude)
    const sitesNoCoords = sites.filter(s => !s.latitude || !s.longitude)

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        {t('dashboard.map_title')}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold tracking-widest">
                        {t('dashboard.live')}
                    </span>
                </div>
                {selectedSite && (
                    <button
                        onClick={() => {
                            setSelectedSite(null)
                            if (onSiteSelect) onSiteSelect(null)
                            if (circleRef.current) { circleRef.current.remove(); circleRef.current = null }
                            const map = mapInstanceRef.current
                            if (map && sitesWithCoords.length > 0) {
                                try {
                                    const group = L.featureGroup(markersRef.current)
                                    map.fitBounds(group.getBounds().pad(0.2))
                                } catch (e) {}
                            }
                        }}
                        className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                        {t('common.back')}
                    </button>
                )}
            </div>

            <div className="flex" style={{ height: 420 }}>
                {/* Map */}
                <div className="flex-1 relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
                            <span className="text-sm text-slate-400">{t('common.loading')}</span>
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 z-10">
                            <span className="text-sm text-red-400">{error}</span>
                        </div>
                    )}
                    {!loading && !error && sitesWithCoords.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 z-10 gap-2">
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                Niciun santier cu coordonate GPS
                            </span>
                            <span className="text-xs text-slate-400">
                                Adauga latitudine/longitudine in Gestionare Santiere
                            </span>
                        </div>
                    )}
                    <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
                </div>

                {/* Selected site detail panel */}
                {selectedSite && (
                    <div className="w-60 border-l border-slate-200 dark:border-slate-700 p-4 overflow-y-auto bg-white dark:bg-slate-900 shrink-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 leading-snug">
                            {selectedSite.name}
                        </h4>
                        <div className="space-y-2.5 text-xs">
                            {selectedSite.county && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Judet</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSite.county}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-400">Muncitori activi</span>
                                <span className={`font-bold ${selectedSite.active_workers > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                    {selectedSite.active_workers}
                                </span>
                            </div>
                            {selectedSite.vehicle_count > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Vehicule</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSite.vehicle_count}</span>
                                </div>
                            )}
                            {selectedSite.panel_count && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Panouri</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSite.panel_count}</span>
                                </div>
                            )}
                            {selectedSite.system_power_kw && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Putere</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSite.system_power_kw} kW</span>
                                </div>
                            )}
                            {selectedSite.client_name && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Client</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-right max-w-[120px] leading-tight">{selectedSite.client_name}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-400">Geofence</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSite.geofence_radius} m</span>
                            </div>
                        </div>
                        {selectedSite.address && (
                            <p className="mt-3 text-xs text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
                                {selectedSite.address}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Footer pills */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 min-h-[48px]">
                <button
                    onClick={() => {
                        setSelectedSite(null)
                        if (onSiteSelect) onSiteSelect(null)
                        if (circleRef.current) { circleRef.current.remove(); circleRef.current = null }
                        const map = mapInstanceRef.current
                        if (map && sitesWithCoords.length > 0) {
                            try {
                                const group = L.featureGroup(markersRef.current)
                                map.fitBounds(group.getBounds().pad(0.2))
                            } catch (e) {}
                        }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        !selectedSite
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                >
                    Toate
                </button>
                {sitesWithCoords.map(s => (
                    <button
                        key={s.id}
                        onClick={() => handleSitePillClick(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            selectedSite?.id === s.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {s.name}
                        {s.active_workers > 0 && (
                            <span className="ml-1.5 opacity-60 text-[10px]">{s.active_workers}</span>
                        )}
                    </button>
                ))}
                {sitesNoCoords.length > 0 && (
                    <span className="text-xs text-slate-400 self-center ml-1">
                        + {sitesNoCoords.length} fara GPS: {sitesNoCoords.map(s => s.name).join(', ')}
                    </span>
                )}
                {sites.length === 0 && !loading && (
                    <span className="text-xs text-slate-400">Niciun santier activ</span>
                )}
            </div>
        </div>
    )
}
