import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'
import {
    Clock, Play, Square, Coffee, MapPin, Loader2, Timer, Calendar,
    ClipboardList, Plus, Trash2, CheckCircle, CheckCircle2, AlertCircle, ShieldAlert,
    Navigation, ChevronDown, ChevronRight, LogOut, Users, Settings, XCircle,
    Building2, ShieldCheck, ArrowLeftRight, MessageSquareWarning, PackageSearch, Wrench, CloudRain
} from 'lucide-react'
import TeamLeaderPanel from './TeamLeaderPanel'
import SiteManagerPanel from './SiteManagerPanel'
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Red site marker
const siteIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

// Blue user marker
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

// Component to auto-fit map bounds
function MapAutoFit({ userPos, sitePos }) {
    const map = useMap()
    useEffect(() => {
        if (userPos && sitePos) {
            const bounds = L.latLngBounds([userPos, sitePos])
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 })
        } else if (userPos) {
            map.setView(userPos, 16)
        } else if (sitePos) {
            map.setView(sitePos, 16)
        }
    }, [userPos, sitePos, map])
    return null
}

// Calculate distance between two GPS points in meters
function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function ClockInPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { user, setAuth, accessToken, refreshToken, logout } = useAuthStore()

    const [loading, setLoading] = useState(true)
    const [unreadComplaints, setUnreadComplaints] = useState(0)
    const [pendingSignatures, setPendingSignatures] = useState(0)
    const [activeShift, setActiveShift] = useState(null)
    const [sites, setSites] = useState([])
    const [selectedSite, setSelectedSite] = useState(null)
    const [location, setLocation] = useState(null)
    const [locationError, setLocationError] = useState(null)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [breakTime, setBreakTime] = useState(0)
    const [currentAddress, setCurrentAddress] = useState(null)
    const [selfDeclaration, setSelfDeclaration] = useState(false)
    const [availableActivities, setAvailableActivities] = useState([])
    const [activityCategories, setActivityCategories] = useState([])
    const [expandedCategory, setExpandedCategory] = useState(null)
    const [addedActivities, setAddedActivities] = useState([])
    const [activityQuantities, setActivityQuantities] = useState({})
    const [showActivityPicker, setShowActivityPicker] = useState(false)
    const [lastAddedActivityId, setLastAddedActivityId] = useState(null)
    const [expandedDescriptions, setExpandedDescriptions] = useState({}) // activity id -> boolean
    const [showClockOutConfirm, setShowClockOutConfirm] = useState(false)
    const [clockOutResult, setClockOutResult] = useState(null)
    const [errorMessage, setErrorMessage] = useState(null)
    const [earlyClockinData, setEarlyClockinData] = useState(null)
    const [breakMessage, setBreakMessage] = useState(null)
    const [activeTab, setActiveTab] = useState('pontaj')
    const [teamInfo, setTeamInfo] = useState(null)
    const [geofencePing, setGeofencePing] = useState(null) // latest ping response
    const [geofencePauseTime, setGeofencePauseTime] = useState(0) // total pause seconds
    const [hadPreviousShift, setHadPreviousShift] = useState(false)
    const [showSiteChange, setShowSiteChange] = useState(false)
    const [changeSiteId, setChangeSiteId] = useState(null)

    // History state
    const [showHistory, setShowHistory] = useState(false)
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0])
    const [historyData, setHistoryData] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyDates, setHistoryDates] = useState([])

    // Alerts
    const [activeAlerts, setActiveAlerts] = useState([])

    const fetchAlerts = async () => {
        try {
            const res = await api.get('/alerts/active')
            setActiveAlerts(res.data || [])
        } catch (error) {
            // silent fail
        }
    }

    useEffect(() => {
        fetchAlerts()
        const interval = setInterval(fetchAlerts, 15000)
        return () => clearInterval(interval)
    }, [])

    const handleAcknowledgeAlert = async (alertId) => {
        try {
            await api.post(`/alerts/${alertId}/acknowledge`)
            setActiveAlerts(prev => prev.filter(a => a.id !== alertId))
            useUIStore.getState().showToast('success', 'Am confirmat citirea.')
        } catch (error) {
            useUIStore.getState().showToast('error', 'Eroare la confirmare.')
        }
    }

    const isTeamLead = user?.role?.code === 'TEAM_LEAD'
    const isSiteManager = user?.role?.code === 'SITE_MANAGER'
    const hasTeamTab = isTeamLead || isSiteManager

    // Format decimal hours to Xh Ymin
    const formatHoursMinutes = (decimalHours) => {
        const h = Math.floor(decimalHours)
        const m = Math.round((decimalHours - h) * 60)
        if (h === 0) return `${m}min`
        if (m === 0) return `${h}h`
        return `${h}h ${m}min`
    }

    const timerInterval = useRef(null)
    const lastGeocodedCoords = useRef(null)
    const swRef = useRef(null) // Service Worker registration
    const locationRef = useRef(null) // Ref pentru coordonate curente (evita restart interval la fiecare update GPS)

    // ─── Inregistrare Service Worker GPS ────────────────────────────────────
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return
        navigator.serviceWorker.register('/sw-gps.js')
            .then(reg => { swRef.current = reg })
            .catch(() => {})
    }, [])

    // Auto-dismiss error message after 5 seconds
    useEffect(() => {
        if (!errorMessage) return
        const timeout = setTimeout(() => setErrorMessage(null), 5000)
        return () => clearTimeout(timeout)
    }, [errorMessage])

    // Auto-refresh user data (for avatar_path etc.)
    useEffect(() => {
        api.get('/auth/me')
            .then(response => {
                if (response.data && response.data.avatar_path !== user?.avatar_path) {
                    setAuth(response.data, accessToken, refreshToken)
                }
            })
            .catch(() => { })
    }, [])

    // Fetch team info for current user
    useEffect(() => {
        api.get('/teams/my-team')
            .then(res => {
                if (res.data?.team_name) setTeamInfo(res.data)
            })
            .catch(() => { })
    }, [])

    // Get the selected site object
    const selectedSiteObj = useMemo(() => {
        return sites.find(s => s.id === selectedSite)
    }, [sites, selectedSite])

    // Check if within geofence
    const geofenceStatus = useMemo(() => {
        if (!location || !selectedSiteObj) return null
        if (!selectedSiteObj.latitude || !selectedSiteObj.longitude) return null

        const distance = calcDistance(
            location.latitude, location.longitude,
            selectedSiteObj.latitude, selectedSiteObj.longitude
        )
        const radius = selectedSiteObj.geofence_radius || 300
        return {
            isWithin: distance <= radius,
            distance: Math.round(distance),
            radius
        }
    }, [location, selectedSiteObj])

    // Reverse geocode user location to get address
    useEffect(() => {
        if (!selectedSiteObj) return
        setSelfDeclaration(false)
    }, [selectedSiteObj])

    // Sync offline activities periodically when online
    useEffect(() => {
        const syncOfflineActivities = async () => {
            if (!activeShift?.timesheet_id || !navigator.onLine) return
            const offlineKey = `offlineActivities_${activeShift.timesheet_id}`
            const offlineActivities = JSON.parse(localStorage.getItem(offlineKey) || '[]')
            
            if (offlineActivities.length > 0) {
                let allSynced = true
                for (const act of offlineActivities) {
                    try {
                        await api.post(`/timesheets/${activeShift.timesheet_id}/activities`, {
                            activity_id: act.activity_id,
                            quantity: act.quantity
                        })
                    } catch (e) {
                        allSynced = false
                        console.error('Failed to sync offline activity', e)
                    }
                }
                if (allSynced) {
                    localStorage.removeItem(offlineKey)
                    fetchAddedActivities(activeShift.timesheet_id)
                }
            }
        }

        window.addEventListener('online', syncOfflineActivities)
        const interval = setInterval(syncOfflineActivities, 60000)
        
        return () => {
            window.removeEventListener('online', syncOfflineActivities)
            clearInterval(interval)
        }
    }, [activeShift?.timesheet_id])

    useEffect(() => {
        if (!location) return

        // Only fetch if moved more than 150 meters from the last geocoded location
        if (lastGeocodedCoords.current) {
            const dist = calcDistance(
                location.latitude, location.longitude,
                lastGeocodedCoords.current.latitude, lastGeocodedCoords.current.longitude
            )
            if (dist < 150) {
                return
            }
        }

        const controller = new AbortController()
        fetch(`/api/reverse-geocode?lat=${location.latitude}&lon=${location.longitude}`, {
            signal: controller.signal
        })
            .then(r => r.json())
            .then(data => {
                if (data.display_name) {
                    // Simplify: take first 3 parts of the address
                    const parts = data.display_name.split(', ')
                    setCurrentAddress(parts.slice(0, 3).join(', '))
                    lastGeocodedCoords.current = {
                        latitude: location.latitude,
                        longitude: location.longitude
                    }
                }
            })
            .catch(() => { })
        return () => controller.abort()
    }, [location?.latitude, location?.longitude])

    useEffect(() => {
        const fetchBadges = () => {
            api.get('/user/notifications/badges')
                .then(res => {
                    setPendingSignatures(res.data?.material_requests || 0)
                })
                .catch(() => {})
            api.get('/user/complaints/unread-count')
                .then(res => setUnreadComplaints(res.data?.count || 0))
                .catch(() => {})
        }
        fetchBadges()
        const t = setInterval(fetchBadges, 10000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        fetchActiveShift()
        fetchSites()
        fetchActivities()
        requestLocation()
    }, [])

    // Watch position continuously
    useEffect(() => {
        if (!navigator.geolocation) return
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                }
                setLocation(coords)
                locationRef.current = coords // Actualizeaza ref — fara re-render
                setLocationError(null)
                // Trimite coordonatele actualizate catre Service Worker
                if (swRef.current?.active) {
                    swRef.current.active.postMessage({
                        type: 'LOCATION_UPDATE',
                        lat: coords.latitude,
                        lon: coords.longitude
                    })
                }
            },
            () => { },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        )
        return () => navigator.geolocation.clearWatch(watchId)
    }, [])

    useEffect(() => {
        if (activeShift) {
            // Freeze timer when NOT actively working (geofence outside or on break)
            // GPS lost does NOT freeze timer — just shows a warning
            if (activeShift.is_outside_geofence || activeShift.is_on_break) {
                const frozenHours = Math.max(0,
                    (activeShift.elapsed_hours || 0) -
                    (activeShift.break_hours || 0) -
                    (activeShift.geofence_pause_hours || 0)
                )
                setElapsedTime(frozenHours)
                // Don't start interval — timer stays frozen
                return
            }

            timerInterval.current = setInterval(() => {
                const now = new Date()
                const checkIn = new Date(activeShift.check_in_time)
                const totalElapsed = (now - checkIn) / 1000 / 3600

                // Calculate total break time
                let currentBreakHours = activeShift.break_hours || 0

                // Calculate geofence pause time
                let geoFencePauseHours = activeShift.geofence_pause_hours || 0

                // Work time = total elapsed - break time - geofence pause time
                const workTime = Math.max(0, totalElapsed - currentBreakHours - geoFencePauseHours)
                setElapsedTime(workTime)
            }, 1000)

            return () => clearInterval(timerInterval.current)
        }
    }, [activeShift, geofencePauseTime])

    // Break timer — counts up while on break
    useEffect(() => {
        if (!activeShift?.is_on_break || !activeShift?.break_start_time) {
            return
        }
        const updateBreak = () => {
            const now = new Date()
            const breakStart = new Date(activeShift.break_start_time)
            const breakSecs = (now - breakStart) / 1000 / 3600
            setBreakTime(breakSecs)
        }
        updateBreak()
        const interval = setInterval(updateBreak, 1000)
        return () => clearInterval(interval)
    }, [activeShift?.is_on_break, activeShift?.break_start_time])

    // Geofence location ping — every 30s while shift is active
    // Folosim locationRef (nu state location) pentru a evita restart la fiecare update GPS
    useEffect(() => {
        if (!activeShift?.segment_id) return

        // Initialize geofence pause time from server
        if (activeShift.geofence_pause_hours) {
            setGeofencePauseTime(activeShift.geofence_pause_hours * 3600)
        }

        const sendPing = async () => {
            const coords = locationRef.current
            if (!coords) return // Nu avem GPS inca
            try {
                const res = await api.post('/timesheets/location-ping', {
                    latitude: coords.latitude,
                    longitude: coords.longitude
                })
                const data = res.data
                if (data.geofence_applicable) {
                    setGeofencePing(data)
                    if (data.total_geofence_pause_seconds !== undefined) {
                        setGeofencePauseTime(data.total_geofence_pause_seconds)
                    }
                    if (data.status_changed) {
                        fetchActiveShift()
                    }
                }
            } catch (e) { /* silently fail */ }
        }

        // Trimite primul ping dupa 5s (sa aiba timp GPS sa se fixeze), apoi din 30 in 30s
        const firstPing = setTimeout(sendPing, 5000)
        const interval = setInterval(sendPing, 30000)
        return () => { clearTimeout(firstPing); clearInterval(interval) }
    }, [activeShift?.segment_id]) // ← doar segment_id, nu lat/lon — evita battery drain

    // ─── Notifica Service Worker cand tura se schimba ────────────────────────
    useEffect(() => {
        const sw = swRef.current?.active
        if (!sw) return
        if (activeShift?.segment_id && location) {
            // Tura activa — trimite date catre SW
            const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.accessToken
            sw.postMessage({
                type: 'SHIFT_START',
                segmentId: activeShift.segment_id,
                lat: location.latitude,
                lon: location.longitude,
                token,
                apiBase: window.location.origin
            })
        } else if (!activeShift) {
            // Tura terminata — curata datele din SW
            sw.postMessage({ type: 'SHIFT_END' })
        }
    }, [activeShift?.segment_id, location?.latitude])

    // ─── Background Sync: ping cand telefonul e folosit pentru alte aplicatii ─
    useEffect(() => {
        const onVisibility = () => {
            const sw = swRef.current
            if (!sw || !activeShift?.segment_id) return
            if (document.visibilityState === 'hidden') {
                // Pagina intra in background — inregistreaza sync event
                // Chrome il va declansa la urmatoarea activitate de retea (orice app)
                if ('sync' in sw) {
                    sw.sync.register('gps-ping').catch(() => {})
                }
            }
        }
        document.addEventListener('visibilitychange', onVisibility)
        return () => document.removeEventListener('visibilitychange', onVisibility)
    }, [activeShift?.segment_id])

    // GPS keepalive — forteaza GPS proaspat din 10 in 10 min, chiar daca ecranul e stins
    // Chrome pe Android throttleaza setInterval la ~1min in background — suficient pentru last_ping_at
    useEffect(() => {
        if (!activeShift?.segment_id) return

        const keepalivePing = () => {
            if (!navigator.geolocation) return
            // Cere GPS proaspat de la sistem (trezeste GPS-ul daca era adormit)
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    api.post('/timesheets/location-ping', {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }).catch(() => {})
                },
                () => {} // GPS indisponibil — ignoram
                , { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            )
        }

        // La fiecare 10 minute — GPS keepalive
        const interval = setInterval(keepalivePing, 10 * 60 * 1000)

        // Ping instant cand muncitorul redeschide app-ul (Page Visibility API)
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                keepalivePing()
            }
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [activeShift?.segment_id])

    const fetchActiveShift = async () => {
        try {
            const response = await api.get('/timesheets/active-shift')
            setActiveShift(response.data)
            if (response.data?.timesheet_id) {
                await fetchAddedActivities(response.data.timesheet_id)
                setHadPreviousShift(false)
            } else {
                // No active shift — check if had completed shifts today
                try {
                    const histRes = await api.get('/timesheets/my-today')
                    setHadPreviousShift(histRes.data?.has_completed_segments || false)
                } catch { setHadPreviousShift(false) }
            }
            return response.data
        } catch (error) {
            console.error('Error fetching active shift:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchSites = async () => {
        try {
            const response = await api.get('/sites/')
            setSites(response.data || [])
        } catch (error) {
            console.error('Error fetching sites:', error)
        }
    }

    const fetchActivities = async () => {
        try {
            const response = await api.get('/activities/')
            setAvailableActivities(response.data?.activities || [])
            setActivityCategories(response.data?.categories || [])
        } catch (error) {
            console.error('Error fetching activities:', error)
        }
    }

    const fetchHistory = async (d) => {
        try {
            setHistoryLoading(true)
            const res = await api.get('/timesheets/my-history', { params: { target_date: d } })
            setHistoryData(res.data)
        } catch (e) { console.error('History error:', e) }
        finally { setHistoryLoading(false) }
    }

    const fetchHistoryDates = async () => {
        try {
            const res = await api.get('/timesheets/my-dates')
            setHistoryDates(res.data?.dates || [])
        } catch (e) { /* silent */ }
    }

    const handleSiteChange = async (newSiteId) => {
        try {
            setLoading(true)
            // Close current segment
            const payload = location
                ? { latitude: location.latitude, longitude: location.longitude }
                : {}
            await api.post('/timesheets/clock-out', payload)

            // Start new segment at new site
            const clockInPayload = { site_id: newSiteId }
            if (location) {
                clockInPayload.latitude = location.latitude
                clockInPayload.longitude = location.longitude
            }
            await api.post('/timesheets/clock-in', clockInPayload)

            setShowSiteChange(false)
            setChangeSiteId(null)
            await fetchActiveShift()
        } catch (error) {
            setErrorMessage(error.response?.data?.detail || t('errors.change_site'))
        } finally {
            setLoading(false)
        }
    }

    const fetchAddedActivities = async (timesheetId) => {
        try {
            const response = await api.get(`/timesheets/${timesheetId}`)
            const segments = response.data?.segments || []
            const apiActivities = segments.flatMap(s => s.activities || [])
            
            // Cache them
            localStorage.setItem(`cachedApiActivities_${timesheetId}`, JSON.stringify(apiActivities))
            
            // Merge with offline activities
            const offlineKey = `offlineActivities_${timesheetId}`
            const offlineActivities = JSON.parse(localStorage.getItem(offlineKey) || '[]').map((act, idx) => ({
                id: `offline-${idx}`,
                activity_id: act.activity_id,
                name: act.name,
                quantity_numeric: act.quantity,
                unit_type: act.unit_type,
                is_offline: true
            }))
            
            setAddedActivities([...apiActivities, ...offlineActivities])
        } catch (error) {
            console.error('Error fetching added activities:', error)
            // Use cached + offline
            const cached = JSON.parse(localStorage.getItem(`cachedApiActivities_${timesheetId}`) || '[]')
            const offlineKey = `offlineActivities_${timesheetId}`
            const offlineActivities = JSON.parse(localStorage.getItem(offlineKey) || '[]').map((act, idx) => ({
                id: `offline-${idx}`,
                activity_id: act.activity_id,
                name: act.name,
                quantity_numeric: act.quantity,
                unit_type: act.unit_type,
                is_offline: true
            }))
            setAddedActivities([...cached, ...offlineActivities])
        }
    }

    const handleAddActivity = async (activity) => {
        if (!activeShift?.timesheet_id) return
        const qty = activityQuantities[activity.id] || 1
        
        const optimisticActivity = {
            id: `temp-${Date.now()}`,
            activity_id: activity.id,
            name: activity.name,
            quantity_numeric: qty,
            unit_type: activity.unit_type,
            is_offline: true
        }

        try {
            await api.post(`/timesheets/${activeShift.timesheet_id}/activities`, {
                activity_id: activity.id,
                quantity: qty
            })
            await fetchAddedActivities(activeShift.timesheet_id)
            setActivityQuantities(prev => ({ ...prev, [activity.id]: 1 }))
            setLastAddedActivityId(activity.id)
            setTimeout(() => setLastAddedActivityId(null), 1500)
        } catch (error) {
            if (!navigator.onLine || error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
                // Save locally
                const offlineKey = `offlineActivities_${activeShift.timesheet_id}`
                const existing = JSON.parse(localStorage.getItem(offlineKey) || '[]')
                existing.push({
                    activity_id: activity.id,
                    quantity: qty,
                    name: activity.name,
                    unit_type: activity.unit_type,
                    timestamp: new Date().toISOString()
                })
                localStorage.setItem(offlineKey, JSON.stringify(existing))
                
                // Update UI optimistically
                fetchAddedActivities(activeShift.timesheet_id)
                setActivityQuantities(prev => ({ ...prev, [activity.id]: 1 }))
                setLastAddedActivityId(activity.id)
                setTimeout(() => setLastAddedActivityId(null), 1500)
            } else {
                setErrorMessage(error.response?.data?.detail || t('errors.add_activity'))
            }
        }
    }

    const handleRemoveActivity = async (lineId) => {
        if (typeof lineId === 'string' && lineId.startsWith('offline-')) {
            const idx = parseInt(lineId.split('-')[1])
            const offlineKey = `offlineActivities_${activeShift.timesheet_id}`
            const existing = JSON.parse(localStorage.getItem(offlineKey) || '[]')
            existing.splice(idx, 1)
            localStorage.setItem(offlineKey, JSON.stringify(existing))
            fetchAddedActivities(activeShift.timesheet_id)
            return
        }

        try {
            await api.delete(`/timesheets/activities/${lineId}`)
            await fetchAddedActivities(activeShift.timesheet_id)
        } catch (error) {
            setErrorMessage(error.response?.data?.detail || t('errors.delete_activity'))
        }
    }

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocationError(t('errors.geo_not_supported'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                })
                setLocationError(null)
            },
            (error) => {
                setLocationError(t('errors.geo_permission'))
                console.error('Geolocation error:', error)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        )
    }

    const handleClockIn = async () => {
        if (!selectedSite) {
            setErrorMessage(t('errors.select_site'))
            return
        }

        try {
            setLoading(true)
            const needsSelfDeclaration = geofenceStatus && !geofenceStatus.isWithin && geofenceStatus.distance <= 3000
            const payload = {
                site_id: selectedSite,
                self_declaration: needsSelfDeclaration ? selfDeclaration : false
            }
            // Send GPS coords only if available
            if (location) {
                payload.latitude = location.latitude
                payload.longitude = location.longitude
            }
            const response = await api.post('/timesheets/clock-in', payload)

            if (response.data?.is_early_checkin) {
                setEarlyClockinData(response.data.billable_start_time)
            }

            const shiftData = await fetchActiveShift()
            setSelfDeclaration(false)
        } catch (error) {
            setErrorMessage(error.response?.data?.detail || t('errors.clock_in'))
        } finally {
            setLoading(false)
        }
    }

    const handleClockOut = () => {
        setShowClockOutConfirm(true)
    }

    const confirmClockOut = async () => {
        setShowClockOutConfirm(false)

        // Capture activities before clearing state
        const savedActivities = [...addedActivities]

        try {
            setLoading(true)

            // Sync offline activities before clocking out
            if (activeShift?.timesheet_id && navigator.onLine) {
                const offlineKey = `offlineActivities_${activeShift.timesheet_id}`
                const offlineActivities = JSON.parse(localStorage.getItem(offlineKey) || '[]')
                if (offlineActivities.length > 0) {
                    for (const act of offlineActivities) {
                        try {
                            await api.post(`/timesheets/${activeShift.timesheet_id}/activities`, {
                                activity_id: act.activity_id,
                                quantity: act.quantity
                            })
                        } catch(e) {
                            console.error('Failed to sync activity on clockout', e)
                        }
                    }
                    localStorage.removeItem(offlineKey)
                }
            }

            // Send GPS coords if available, otherwise send empty body (backend accepts optional coords)
            const payload = location
                ? { latitude: location.latitude, longitude: location.longitude }
                : {}
            const response = await api.post('/timesheets/clock-out', payload)

            setClockOutResult({ ...response.data, activities: savedActivities })
            setActiveShift(null)
            setAddedActivities([])
        } catch (error) {
            setClockOutResult({ error: error.response?.data?.detail || t('errors.clock_out') })
        } finally {
            setLoading(false)
        }
    }

    const handleStartBreak = async () => {
        // Prevent second break
        if (activeShift && activeShift.break_hours > 0 && !activeShift.is_on_break) {
            setBreakMessage(t('errors.second_break'))
            return
        }

        if (!location) {
            requestLocation()
            return
        }

        try {
            setLoading(true)
            await api.post('/timesheets/start-break', {
                latitude: location.latitude,
                longitude: location.longitude
            })

            await fetchActiveShift()
        } catch (error) {
            setBreakMessage(error.response?.data?.detail || t('errors.start_break'))
        } finally {
            setLoading(false)
        }
    }

    const handleEndBreak = async () => {
        try {
            setLoading(true)
            await api.post('/timesheets/end-break')
            await fetchActiveShift()
        } catch (error) {
            setBreakMessage(error.response?.data?.detail || t('errors.end_break'))
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (hours) => {
        const h = Math.floor(hours)
        const m = Math.floor((hours - h) * 60)
        const s = Math.floor(((hours - h) * 60 - m) * 60)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    // Compute site position: from selected site OR from active shift
    // NOTE: All hooks MUST be before any early returns (React rules of hooks)
    const activeSitePos = useMemo(() => {
        if (selectedSiteObj?.latitude && selectedSiteObj?.longitude) {
            return { lat: selectedSiteObj.latitude, lon: selectedSiteObj.longitude, radius: selectedSiteObj.geofence_radius || 300, name: selectedSiteObj.name }
        }
        if (activeShift?.site_latitude && activeShift?.site_longitude) {
            return { lat: activeShift.site_latitude, lon: activeShift.site_longitude, radius: activeShift.site_geofence_radius || 300, name: activeShift.site_name }
        }
        return null
    }, [selectedSiteObj, activeShift])

    const mapCenter = activeSitePos
        ? [activeSitePos.lat, activeSitePos.lon]
        : location
            ? [location.latitude, location.longitude]
            : [44.4268, 26.1025] // Bucharest default

    if (loading && !activeShift) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 pb-4">
            {/* Error Message Banner */}
            {errorMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[90%] animate-[slideDown_0.3s_ease-out]">
                    <div className="bg-red-600 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium">{errorMessage}</p>
                        </div>
                        <button
                            onClick={() => setErrorMessage(null)}
                            className="text-white/70 hover:text-white transition-colors ml-2 mt-0.5"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Early Clock-in Success Banner */}
            {earlyClockinData && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center transform animate-[slideUp_0.3s_ease-out]">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Check-in Reușit!</h3>
                        <p className="text-slate-600 mb-6 text-[15px] leading-relaxed">
                            Te-ai pontat mai devreme cu succes. Ești <strong>Activ</strong>, dar timpul tău va fi calculat automat începând cu ora <strong className="text-blue-600 font-bold text-lg">{earlyClockinData}</strong>.
                            <br/><br/>
                            <span className="text-sm text-slate-500">Nu este nevoie să mai dai check-in încă o dată!</span>
                        </p>
                        <button
                            onClick={() => setEarlyClockinData(null)}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] text-lg"
                        >
                            Am Înțeles
                        </button>
                    </div>
                </div>
            )}

            {/* Header with Profile */}
            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white p-4 shadow-lg">
                <div className="flex items-center justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                        {user?.avatar_path && (
                            <img
                                src={user.avatar_path.startsWith('http') ? user.avatar_path : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${user.avatar_path}`}
                                alt=""
                                className="w-12 h-12 rounded-lg object-cover object-[center_20%] shrink-0 ring-2 ring-white/50"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex' }}
                            />
                        )}
                        <div className={`w-12 h-12 rounded-lg bg-white/20 items-center justify-center text-lg font-bold shrink-0 ${user?.avatar_path ? 'hidden' : 'flex'}`}>
                            {user?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <div className="font-semibold">{user?.full_name || t('users.employee')}</div>
                            <div className="text-xs text-blue-100">{user?.role?.name || 'Angajat'}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => { logout(); navigate('/login'); }}
                            className="p-2 hover:bg-red-500/30 rounded-full transition-colors"
                            title={t('common.logout')}
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Tab Navigation for Team Leaders & Site Managers */}
            {hasTeamTab && (
                <div className="max-w-md mx-auto px-4">
                    <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-slate-200 p-1 mt-3">
                        <button
                            onClick={() => setActiveTab('pontaj')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'pontaj'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Clock className="w-4 h-4" />
                            {t('timesheets.clock_in')}
                        </button>
                        <button
                            onClick={() => setActiveTab('echipa')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'echipa'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {isSiteManager ? <Building2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                            {isSiteManager ? 'Șantier' : 'Echipa'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Content */}
            {activeTab === 'echipa' && hasTeamTab ? (
                <div className="max-w-md mx-auto">
                    {isSiteManager ? <SiteManagerPanel /> : <TeamLeaderPanel />}
                </div>
            ) : (
                <div className="max-w-md mx-auto px-3 pt-3 pb-2 flex flex-col gap-2" style={{ minHeight: 'calc(100dvh - 160px)' }}>
                    {/* === MAP SECTION === */}
                    <div className="rounded-2xl overflow-hidden shadow-lg border-2 border-white" style={{ height: '200px' }}>
                        <MapContainer
                            center={mapCenter}
                            zoom={16}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                            attributionControl={false}
                        >
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution="Esri Satellite"
                            />
                            {/* Labels overlay on satellite */}
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}"
                            />

                            {/* Geofence circle */}
                            {activeSitePos && (
                                <Circle
                                    center={[activeSitePos.lat, activeSitePos.lon]}
                                    radius={activeSitePos.radius}
                                    pathOptions={{
                                        color: activeShift?.is_outside_geofence ? '#ef4444' : '#3b82f6',
                                        fillColor: activeShift?.is_outside_geofence ? '#ef4444' : '#3b82f6',
                                        fillOpacity: 0.15,
                                        weight: 2,
                                        dashArray: '8 4'
                                    }}
                                />
                            )}

                            {/* Site marker (red pin) */}
                            {activeSitePos && (
                                <Marker
                                    position={[activeSitePos.lat, activeSitePos.lon]}
                                    icon={siteIcon}
                                >
                                    <Popup>{activeSitePos.name}</Popup>
                                </Marker>
                            )}

                            {/* User location marker (blue) */}
                            {location && (
                                <Marker
                                    position={[location.latitude, location.longitude]}
                                    icon={userIcon}
                                >
                                    <Popup>{t('common.your_location')}</Popup>
                                </Marker>
                            )}

                            {/* Auto-fit bounds */}
                            <MapAutoFit
                                userPos={location ? [location.latitude, location.longitude] : null}
                                sitePos={activeSitePos
                                    ? [activeSitePos.lat, activeSitePos.lon]
                                    : null
                                }
                            />
                        </MapContainer>
                    </div>

                    {/* Address + GPS — single row */}
                    {location && currentAddress ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-700">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />
                            <span className="truncate">{currentAddress}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs text-red-600">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>GPS indisponibil — activați locația</span>
                        </div>
                    )}

                    {/* Geofence Status */}
                    {geofenceStatus && (
                        <div className={`rounded-xl p-2 flex items-center justify-center gap-2 font-semibold text-xs
                        ${geofenceStatus.isWithin
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : 'bg-red-50 border border-red-200 text-red-700'
                            }`}
                        >
                            {geofenceStatus.isWithin ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    {t('timesheets.on_site')} — {geofenceStatus.distance}m distanță ✓
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4" />
                                    {t('timesheets.not_on_site')} — {geofenceStatus.distance}m distanță
                                </>
                            )}
                        </div>
                    )}

                    {/* Self-Declaration Checkbox - show when 300m < distance <= 3000m */}
                    {geofenceStatus && !geofenceStatus.isWithin && geofenceStatus.distance <= 3000 && !activeShift && (
                        <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selfDeclaration}
                                onChange={(e) => setSelfDeclaration(e.target.checked)}
                                className="mt-1 w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                            />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">{t('timesheets.self_declaration')}</p>
                                <p className="text-xs text-amber-600 mt-0.5">{t('timesheets.self_declaration_desc')}</p>
                            </div>
                        </label>
                    )}

                    {/* Location Error */}
                    {locationError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-red-800">{locationError}</p>
                                <button
                                    onClick={requestLocation}
                                    className="text-sm text-red-600 font-medium mt-1 hover:underline"
                                >
                                    Încearcă din nou
                                </button>
                            </div>
                        </div>
                    )}



                    {/* No GPS Warning */}
                    {!location && !activeShift && !locationError && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <p className="text-xs text-amber-700">Locație obligatorie pentru a începe tura.</p>
                        </div>
                    )}

                    {/* Active Shift View */}
                    {activeShift ? (
                        <>
                            {/* Today's Date */}
                            <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-center gap-2 text-slate-700">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium">
                                    {new Date().toLocaleDateString('ro-RO', { timeZone: 'Europe/Berlin',  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>

                            {/* Geofence Auto-Pause Banner */}
                            {activeShift.is_outside_geofence && (
                                <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl shadow-lg p-4 text-white text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1 animate-pulse">
                                        <ShieldAlert className="w-6 h-6" />
                                        <span className="font-bold text-sm">⏸ {t('timesheets.timer_stopped')}</span>
                                    </div>
                                    <p className="text-xs text-white/90">
                                        {t('timesheets.outside_radius')} {activeShift.site_geofence_radius || 300}m de șantier
                                        {geofencePing?.distance ? ` (${Math.round(geofencePing.distance)}m {t('timesheets.distance').toLowerCase()})` : ''}.
                                        {t('timesheets.timer_stopped_desc')}
                                    </p>
                                    {geofencePauseTime > 0 && (
                                        <p className="text-xs text-white/70 mt-1">
                                            {t('timesheets.time_lost_today')}: {formatTime(geofencePauseTime / 3600)}
                                        </p>
                                    )}
                                    <div className="mt-3 pt-3 border-t border-white/20">
                                        <p className="text-xs text-white/80 font-medium">
                                            💡 {t('timesheets.timer_stopped_hint')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* GPS Lost Banner — no GPS for 2+ minutes */}
                            {activeShift.gps_lost && !activeShift.is_outside_geofence && (
                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg p-4 text-white text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <AlertCircle className="w-6 h-6" />
                                        <span className="font-bold text-sm">📡 {t('timesheets.gps_lost')}</span>
                                    </div>
                                    <p className="text-xs text-white/90">
                                        {t('timesheets.gps_lost_desc')}
                                        {t('timesheets.timer_continues')}
                                    </p>
                                    <div className="mt-3 pt-3 border-t border-white/20">
                                        <p className="text-xs text-white/80 font-medium">
                                            💡 {t('timesheets.gps_lost_hint')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Geofence OK Banner (show briefly after return) */}
                            {geofencePing?.status === 'RESUMED' && (
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-3 text-white text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <ShieldCheck className="w-5 h-5" />
                                        <span className="font-semibold text-sm">✅ {t('timesheets.returned_to_site')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Timer Display */}
                            <div className={`bg-white rounded-2xl shadow-lg p-6 text-center ${activeShift.is_outside_geofence ? 'opacity-60' : ''}`}>
                                <div className="text-sm text-slate-600 mb-2">
                                    {activeShift.is_outside_geofence
                                        ? `🚫 ${t('timesheets.timer_stopped_outside')}`
                                        : activeShift.is_on_break
                                            ? `⏸ ${t('timesheets.timer_stopped_break')}`
                                            : `⏱ ${t('timesheets.time_worked')}`
                                    }
                                </div>
                                <div className={`text-4xl font-bold mb-1 ${activeShift.is_outside_geofence ? 'text-red-500'
                                    : activeShift.is_on_break ? 'text-orange-500'
                                        : 'text-blue-600'
                                    }`}>
                                    {formatTime(elapsedTime)}
                                </div>
                                <div className="text-sm text-slate-500">
                                    📍 {activeShift.site_name}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
                                    <span>{t('timesheets.check_in')}: {new Date(activeShift.check_in_time).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit' })}</span>
                                    {(breakTime > 0 || activeShift.break_hours > 0) && (
                                        <span>☕ {t('timesheets.breaks')}: {formatTime(breakTime || activeShift.break_hours || 0)}</span>
                                    )}
                                    {geofencePauseTime > 0 && (
                                        <span>🚫 {t('timesheets.outside')}: {formatTime(geofencePauseTime / 3600)}</span>
                                    )}
                                </div>
                            </div>

                            {/* Team Info */}
                            {teamInfo && (
                                <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-800">{teamInfo.team_name}</div>
                                        <div className="text-xs text-slate-500">{t('teams.team_leader_label')}: {teamInfo.team_leader_name}</div>
                                    </div>
                                </div>
                            )}

                            {/* Break Status */}
                            {activeShift.is_on_break ? (
                                <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl shadow-lg p-5 text-white text-center">
                                    <Coffee className="w-7 h-7 mx-auto mb-1" />
                                    <div className="font-semibold text-sm mb-1">{t('timesheets.lunch_break_btn')}</div>
                                    <div className="text-2xl font-bold">{formatTime(breakTime)}</div>
                                    {activeShift.break_start_time && (
                                        <div className="text-xs text-white/80 mt-1">
                                            {t('timesheets.started_at')} {new Date(activeShift.break_start_time).toLocaleTimeString('ro-RO', { timeZone: 'Europe/Berlin',  hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleEndBreak}
                                        disabled={loading}
                                        className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                                    >
                                        {t('timesheets.end_break')}
                                    </button>
                                </div>
                            ) : activeShift.break_hours > 0 ? (
                                /* Break already taken - show history */
                                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Coffee className="w-5 h-5 text-orange-500" />
                                            <span className="text-sm font-semibold text-orange-800">{t('timesheets.break_taken')}</span>
                                        </div>
                                        <span className="text-sm font-bold text-orange-700">{formatTime(activeShift.break_hours)}</span>
                                    </div>
                                    <p className="text-xs text-orange-600 mt-1">{t('errors.second_break')}</p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleStartBreak}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow transition-all text-sm"
                                >
                                    <Coffee className="w-5 h-5" />
                                    {t('timesheets.lunch_break')}
                                </button>
                            )}

                            {/* Site Change Button — only for Site Managers */}
                            {isSiteManager && !activeShift?.is_on_break && (
                                <button
                                    onClick={() => setShowSiteChange(true)}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow transition-all text-sm"
                                >
                                    <ArrowLeftRight className="w-5 h-5" />
                                    {t('timesheets.change_site')}
                                </button>
                            )}

                            {/* Activities Section */}
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-blue-500" />
                                        <span className="font-semibold text-slate-800">{t('activities.title')}</span>
                                    </div>
                                    <button
                                        onClick={() => setShowActivityPicker(!showActivityPicker)}
                                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium hover:bg-blue-100 flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Adaugă
                                    </button>
                                </div>

                                {/* Added Activities */}
                                {addedActivities.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        {addedActivities.map((act, i) => (
                                            <div key={act.id || i} className="px-4 py-3 flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-800">{act.activity_name || act.name}</div>
                                                    <div className="text-xs text-slate-500">{act.quantity} {act.unit_type}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveActivity(act.id)}
                                                    className="text-red-400 hover:text-red-600 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-sm text-slate-400">
                                        {t('activities.no_activities_added')}
                                    </div>
                                )}

                                {/* Activity Picker — Grouped by Category */}
                                {showActivityPicker && (
                                    <div className="border-t border-slate-100">
                                        {activityCategories.length > 0 ? (
                                            <div>
                                                {activityCategories.map(cat => (
                                                    <div key={cat.id || 'uncategorized'}>
                                                        {/* Category Header */}
                                                        <button
                                                            onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                                                <span className="text-sm font-bold" style={{ color: cat.color }}>{cat.name}</span>
                                                                <span className="text-xs text-slate-400">{cat.activities.length}</span>
                                                            </div>
                                                            {expandedCategory === cat.id
                                                                ? <ChevronDown className="w-4 h-4 text-slate-400" />
                                                                : <ChevronRight className="w-4 h-4 text-slate-400" />
                                                            }
                                                        </button>

                                                        {/* Category Activities */}
                                                        {expandedCategory === cat.id && (
                                                            <div className="bg-slate-50/70">
                                                                {cat.activities.map(act => (
                                                                    <div key={act.id} className="px-4 py-3 border-b border-slate-100/80">
                                                                        <div className="flex items-start gap-3">
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-medium text-slate-800">{act.name}</div>
                                                                                {act.description && (
                                                                                    <div className="mt-0.5">
                                                                                        <div className={`text-xs text-slate-500 whitespace-pre-wrap ${expandedDescriptions[act.id] ? '' : 'line-clamp-2'}`}>
                                                                                            {act.description}
                                                                                        </div>
                                                                                        {act.description.length > 80 && (
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation()
                                                                                                    setExpandedDescriptions(prev => ({ ...prev, [act.id]: !prev[act.id] }))
                                                                                                }}
                                                                                                className="text-[11px] text-blue-500 hover:text-blue-700 font-medium mt-1"
                                                                                            >
                                                                                                {expandedDescriptions[act.id] ? 'Ascunde' : 'Vezi mai mult...'}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                <div className="text-xs text-slate-400 mt-1">{t('activities.unit_type')}: {act.unit_type}</div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    value={activityQuantities[act.id] ?? 1}
                                                                                    onChange={e => setActivityQuantities(prev => ({ ...prev, [act.id]: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                                                                                    onBlur={e => { if (e.target.value === '' || parseFloat(e.target.value) < 1) setActivityQuantities(prev => ({ ...prev, [act.id]: 1 })) }}
                                                                                    onClick={e => e.target.select()}
                                                                                    className="w-16 text-center border border-slate-200 rounded-full py-1.5 text-sm"
                                                                                />
                                                                                <button
                                                                                    onClick={() => handleAddActivity(act)}
                                                                                    className={`text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${lastAddedActivityId === act.id
                                                                                        ? 'bg-green-500 scale-105'
                                                                                        : 'hover:opacity-90'
                                                                                        }`}
                                                                                    style={lastAddedActivityId !== act.id ? { backgroundColor: cat.color } : {}}
                                                                                >
                                                                                    {lastAddedActivityId === act.id ? '✓' : t('common.add')}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-sm text-slate-400">{t('activities.no_activities_configured')}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Close Shift Button */}
                            <button
                                onClick={handleClockOut}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg transition-all"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
                                {t('timesheets.clock_out')}
                            </button>
                        </>
                    ) : hadPreviousShift ? (
                        /* Shift completed today — show summary */
                        <div className="bg-white rounded-2xl shadow-lg p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{t('timesheets.shift_ended')} ✅</h3>
                                <p className="text-sm text-slate-500 mt-1">{t('timesheets.shift_ended_desc')}</p>
                            </div>
                            <button
                                onClick={() => navigate('/history')}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                            >
                                <Calendar className="w-5 h-5" />
                                {t('timesheets.view_history_today')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Site Selection */}
                            <div className="bg-white rounded-2xl shadow-lg p-3">
                                <label className="block text-xs font-semibold text-slate-700 mb-2">
                                    📍 {t('timesheets.select_site')}
                                </label>
                                <select
                                    value={selectedSite || ''}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                    className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                                >
                                    <option value="">{t('timesheets.choose_site')}...</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Site details card */}
                                {selectedSiteObj && (
                                    <div className="mt-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 space-y-1">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-red-500">📍</span>
                                            <span className="font-medium text-slate-800">{selectedSiteObj.name}</span>
                                        </div>
                                        {selectedSiteObj.address && (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {selectedSiteObj.address}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Start Shift Button — above home button */}
                            <div className="mt-auto pt-4 mb-14">
                                <button
                                    onClick={handleClockIn}
                                    disabled={loading || !selectedSite || !location}
                                    className="w-full py-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold text-base flex items-center justify-center gap-3 shadow-2xl shadow-green-500/40 transition-all disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5" />
                                            <span>{t('timesheets.start_shift')}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* ALERTS SECTION (Active messages from Admin) */}
                            {Array.isArray(activeAlerts) && activeAlerts.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {activeAlerts.map(alert => (
                                        <div key={alert.id} className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/20 animate-fade-in-up">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-white/20 p-2 rounded-xl shrink-0 mt-1">
                                                    <AlertCircle className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-lg leading-tight mb-1">Avizier Important</h4>
                                                    <p className="text-white/90 text-sm font-medium mb-3">{alert.message}</p>
                                                    <button 
                                                        onClick={() => handleAcknowledgeAlert(alert.id)}
                                                        className="bg-white text-orange-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-orange-50 transition-colors flex items-center gap-2"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        OK, Am înțeles
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </>
                    )}

                </div>
            )}

            {/* Site Change Modal */}
            {showSiteChange && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <div className="text-center mb-4">
                            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <ArrowLeftRight className="w-7 h-7 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">{t('timesheets.change_site_modal')}</h3>
                            <p className="text-sm text-slate-500 mt-1">{t('timesheets.change_site_desc')}</p>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {sites.filter(s => s.id !== activeShift?.site_id).map(site => (
                                <button
                                    key={site.id}
                                    onClick={() => handleSiteChange(site.id)}
                                    disabled={loading}
                                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                >
                                    <div className="font-semibold text-sm text-slate-800">{site.name}</div>
                                    <div className="text-xs text-slate-500">{site.address}</div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowSiteChange(false)}
                            className="w-full mt-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {showClockOutConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Square className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('timesheets.clock_out_confirm')}</h3>
                            <p className="text-slate-600 text-sm">{t('timesheets.clock_out_confirm_desc')}</p>
                            <p className="text-red-500 text-xs font-semibold mt-2">⚠️ {t('timesheets.clock_out_warning')}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowClockOutConfirm(false)}
                                className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={confirmClockOut}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-semibold transition-all"
                            >
                                Da, închei
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {clockOutResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <div className="text-center mb-4">
                            {clockOutResult.error ? (
                                <>
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <XCircle className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('common.error')}</h3>
                                    <p className="text-slate-600 text-sm">{clockOutResult.error}</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('timesheets.shift_ended_success')}</h3>
                                    <div className="space-y-2 text-sm text-left">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <span className="text-slate-600">⏱ {t('timesheets.hours_worked_label')}</span>
                                            <span className="font-bold text-blue-600">{formatHoursMinutes(clockOutResult.worked_hours)}</span>
                                        </div>
                                        {clockOutResult.break_hours > 0 && (
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span className="text-slate-600">☕ {t('timesheets.lunch_break_label')}</span>
                                                <span className="font-bold text-orange-600">{formatHoursMinutes(clockOutResult.break_hours)}</span>
                                            </div>
                                        )}
                                        {clockOutResult.geofence_pause_hours > 0 && (
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span className="text-slate-600">🚫 {t('timesheets.outside_zone_label')}</span>
                                                <span className="font-bold text-red-500">{formatHoursMinutes(clockOutResult.geofence_pause_hours)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <span className="text-slate-600">📊 {t('timesheets.total_with_break')}</span>
                                            <span className="font-bold text-slate-900">{formatHoursMinutes(clockOutResult.total_hours)}</span>
                                        </div>
                                        {clockOutResult.activities && clockOutResult.activities.length > 0 && (
                                            <div className="pt-2">
                                                <p className="text-xs font-semibold text-slate-700 mb-1">📋 {t('activities.recorded_activities')}</p>
                                                {clockOutResult.activities.map((act, i) => (
                                                    <div key={i} className="flex justify-between text-xs py-1">
                                                        <span className="text-slate-600">{act.activity_name || act.name}</span>
                                                        <span className="font-medium">{act.quantity} {act.unit_type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => setClockOutResult(null)}
                            className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {breakMessage && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Coffee className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('timesheets.status.break')}</h3>
                            <p className="text-slate-600 text-sm">{breakMessage}</p>
                        </div>
                        <button
                            onClick={() => setBreakMessage(null)}
                            className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors"
                        >
                            {t('common.understood')}
                        </button>
                    </div>
                </div>
            )
            }
        </div >
    )
}
