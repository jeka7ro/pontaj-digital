import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon broken paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

/**
 * MapView — hartă read-only.
 * Dacă latitude/longitude sunt nule, geocodează automat `address` via Nominatim.
 * Props: latitude, longitude, address, height, zoom, geofenceRadius, label
 */
const MapView = ({ latitude, longitude, address, height = 300, zoom = 15, geofenceRadius, label }) => {
    const mapRef       = useRef(null)
    const mapInstance  = useRef(null)
    const markerRef    = useRef(null)
    const circleRef    = useRef(null)
    const [geocoding, setGeocoding] = useState(false)
    const [geoError,  setGeoError]  = useState(false)

    const initMap = (lat, lon, z, popupLabel) => {
        if (!mapRef.current) return

        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, {
                zoomControl: true,
                scrollWheelZoom: false,
                dragging: true,
                doubleClickZoom: true,
                attributionControl: true,
            }).setView([lat, lon], z)

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(mapInstance.current)
        } else {
            mapInstance.current.setView([lat, lon], z)
        }

        // Marker
        if (markerRef.current) markerRef.current.remove()
        markerRef.current = L.marker([lat, lon])
        if (popupLabel) {
            markerRef.current.bindPopup(`<strong style="font-size:13px">${popupLabel}</strong>`)
            markerRef.current.openPopup()
        }
        markerRef.current.addTo(mapInstance.current)

        // Cerc geofence
        if (circleRef.current) circleRef.current.remove()
        if (geofenceRadius && parseFloat(geofenceRadius) > 0) {
            circleRef.current = L.circle([lat, lon], {
                radius: parseFloat(geofenceRadius),
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '6 4',
            }).addTo(mapInstance.current)
        }

        // Force resize după mount
        setTimeout(() => mapInstance.current?.invalidateSize(), 100)
    }

    useEffect(() => {
        if (!mapRef.current) return

        const hasCoords = latitude && longitude &&
            parseFloat(latitude) !== 0 && parseFloat(longitude) !== 0

        if (hasCoords) {
            // Coordonate GPS directe
            initMap(parseFloat(latitude), parseFloat(longitude), zoom, label || address)
        } else if (address && address.trim().length > 3) {
            // Geocodare automată după adresă via Nominatim (gratis, fără API key)
            setGeocoding(true)
            setGeoError(false)
            fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
                { headers: { 'Accept-Language': 'ro', 'User-Agent': 'PontajDigital/1.0' } }
            )
                .then(r => r.json())
                .then(data => {
                    setGeocoding(false)
                    if (data && data.length > 0) {
                        const { lat, lon } = data[0]
                        initMap(parseFloat(lat), parseFloat(lon), 15, label || address)
                    } else {
                        setGeoError(true)
                        // Fallback: hartă Romania
                        if (!mapInstance.current && mapRef.current) {
                            mapInstance.current = L.map(mapRef.current, { scrollWheelZoom: false })
                                .setView([45.9432, 24.9668], 6)
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap', maxZoom: 19
                            }).addTo(mapInstance.current)
                        }
                    }
                })
                .catch(() => {
                    setGeocoding(false)
                    setGeoError(true)
                })
        } else {
            // Nicio informație GPS/adresă — hartă Romania generală
            if (!mapInstance.current && mapRef.current) {
                mapInstance.current = L.map(mapRef.current, { scrollWheelZoom: false })
                    .setView([45.9432, 24.9668], 6)
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap', maxZoom: 19
                }).addTo(mapInstance.current)
            }
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove()
                mapInstance.current = null
                markerRef.current  = null
                circleRef.current  = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latitude, longitude, address])

    return (
        <div
            className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner relative"
            style={{ height, zIndex: 1 }}
        >
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            {/* Overlay geocoding */}
            {geocoding && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 flex flex-col items-center justify-center gap-2 z-[400] pointer-events-none">
                    <div className="w-7 h-7 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Se caută locația pe hartă...</span>
                </div>
            )}

            {/* Mesaj eroare */}
            {geoError && !geocoding && (
                <div className="absolute bottom-2 left-2 right-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 z-[400] pointer-events-none">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">⚠️ Adresa nu a putut fi localizată. Adaugă GPS manual în Șantiere.</p>
                </div>
            )}
        </div>
    )
}

export default MapView
