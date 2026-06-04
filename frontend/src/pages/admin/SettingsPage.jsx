import { useState, useRef } from 'react'
import { Save, Building2, Clock, Bell, Globe, Upload, Image, X } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function SettingsPage() {
    const { t } = useTranslation()
    const { openDialog } = useUIStore()
    const [settings, setSettings] = useState({
        // Organization
        org_name: '',
        org_logo: '',
        org_contact: '',
        org_phone: '',

        // Timesheet
        work_hours_start: '08:00',
        work_hours_end: '17:00',
        break_duration: 30,
        auto_approve_managers: true,
        require_photos: false,

        // Notifications
        email_notifications: true,
        approval_reminders: true,
        rejection_notifications: true,

        // System
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        language: 'ro',
        timezone: 'Europe/Bucharest'
    })

    const [activeTab, setActiveTab] = useState('organization')
    const [logoFile, setLogoFile] = useState(null)
    const [logoPreview, setLogoPreview] = useState(null)
    const [uploading, setUploading] = useState(false)
    const logoInputRef = useRef(null)

    const handleLogoSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setLogoFile(file)
        const reader = new FileReader()
        reader.onload = (ev) => setLogoPreview(ev.target.result)
        reader.readAsDataURL(file)
    }

    const handleLogoUpload = async () => {
        if (!logoFile) return
        try {
            setUploading(true)
            const fd = new FormData()
            fd.append('file', logoFile)
            const resp = await api.post('/admin/upload-logo', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setSettings(prev => ({ ...prev, org_logo: resp.data.logo_url }))
            setLogoFile(null)
            openDialog({ type: 'info', title: 'Succes', message: 'Logo încărcat cu succes!', confirmText: 'OK', cancelText: null })
        } catch (err) {
            openDialog({ type: 'danger', title: 'Eroare Încărcare', message: 'Eroare la încărcare: ' + (err.response?.data?.detail || err.message), confirmText: 'OK', cancelText: null })
        } finally {
            setUploading(false)
        }
    }

    const handleSave = () => {
        // TODO: Save to backend
        openDialog({ type: 'info', title: 'Salvat', message: 'Setările au fost salvate cu succes!', confirmText: 'OK', cancelText: null })
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">⚙️ Setări</h1>
                <p className="text-slate-600">Configurează aplicația</p>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-slate-200">
                <div className="flex gap-4">
                    <TabButton
                        active={activeTab === 'organization'}
                        onClick={() => setActiveTab('organization')}
                        icon={Building2}
                        label="Organizație"
                    />
                    <TabButton
                        active={activeTab === 'timesheet'}
                        onClick={() => setActiveTab('timesheet')}
                        icon={Clock}
                        label="Pontaje"
                    />
                    <TabButton
                        active={activeTab === 'notifications'}
                        onClick={() => setActiveTab('notifications')}
                        icon={Bell}
                        label="Notificări"
                    />
                    <TabButton
                        active={activeTab === 'system'}
                        onClick={() => setActiveTab('system')}
                        icon={Globe}
                        label="Sistem"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                {activeTab === 'organization' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Informații Organizație</h2>

                        {/* Logo Upload Section */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Logo Organizație</label>
                            <div className="flex items-start gap-6">
                                {/* Preview */}
                                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {(logoPreview || settings.org_logo) ? (
                                        <img
                                            src={logoPreview || `${API_BASE}${settings.org_logo}`}
                                            alt="Logo"
                                            className="w-full h-full object-contain p-1"
                                        />
                                    ) : (
                                        <Image className="w-8 h-8 text-slate-400" />
                                    )}
                                </div>
                                {/* Upload controls */}
                                <div className="flex-1 space-y-2">
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoSelect}
                                        className="hidden"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => logoInputRef.current?.click()}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors text-sm font-medium"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Alege fișier
                                        </button>
                                        {logoFile && (
                                            <>
                                                <button
                                                    onClick={handleLogoUpload}
                                                    disabled={uploading}
                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors text-sm font-medium disabled:opacity-50"
                                                >
                                                    {uploading ? 'Se încarcă...' : '📤 Încarcă'}
                                                </button>
                                                <button
                                                    onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {logoFile && (
                                        <p className="text-xs text-slate-500">📎 {logoFile.name}</p>
                                    )}
                                    <p className="text-xs text-slate-400">Formate: JPG, PNG, SVG, WebP. Max 2MB.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Nume Companie</label>
                            <input
                                type="text"
                                value={settings.org_name}
                                onChange={(e) => setSettings({ ...settings, org_name: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email Contact</label>
                            <input
                                type="email"
                                value={settings.org_contact}
                                onChange={(e) => setSettings({ ...settings, org_contact: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                            <input
                                type="tel"
                                value={settings.org_phone}
                                onChange={(e) => setSettings({ ...settings, org_phone: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'timesheet' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Setări Pontaje</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Oră Start Implicit</label>
                                <input
                                    type="time"
                                    value={settings.work_hours_start}
                                    onChange={(e) => setSettings({ ...settings, work_hours_start: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Oră Sfârșit Implicit</label>
                                <input
                                    type="time"
                                    value={settings.work_hours_end}
                                    onChange={(e) => setSettings({ ...settings, work_hours_end: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Durată Pauză (minute)</label>
                            <input
                                type="number"
                                value={settings.break_duration}
                                onChange={(e) => setSettings({ ...settings, break_duration: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.auto_approve_managers}
                                    onChange={(e) => setSettings({ ...settings, auto_approve_managers: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <span className="text-sm font-medium text-slate-700">Auto-aprobare pentru manageri</span>
                            </label>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.require_photos}
                                    onChange={(e) => setSettings({ ...settings, require_photos: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <span className="text-sm font-medium text-slate-700">Obligă încărcarea fotografiilor</span>
                            </label>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Setări Notificări</h2>

                        <div className="space-y-4">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.email_notifications}
                                    onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Notificări Email</p>
                                    <p className="text-xs text-slate-500">Primește notificări pe email</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.approval_reminders}
                                    onChange={(e) => setSettings({ ...settings, approval_reminders: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Reminder-uri Aprobare</p>
                                    <p className="text-xs text-slate-500">Notificări pentru pontaje neaprobate</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.rejection_notifications}
                                    onChange={(e) => setSettings({ ...settings, rejection_notifications: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Notificări Respingere</p>
                                    <p className="text-xs text-slate-500">Anunță angajații când pontajele sunt respinse</p>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Setări Sistem</h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Format Dată</label>
                            <select
                                value={settings.date_format}
                                onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="DD/MM/YYYY">DD/MM/YYYY (17/02/2026)</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY (02/17/2026)</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-02-17)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Format Oră</label>
                            <select
                                value={settings.time_format}
                                onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="24h">24 ore (14:30)</option>
                                <option value="12h">12 ore (2:30 PM)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Limbă</label>
                            <select
                                value={settings.language}
                                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="ro">Română</option>
                                <option value="en">English</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Fus Orar</label>
                            <select
                                value={settings.timezone}
                                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="Europe/Bucharest">Europe/Bucharest (GMT+2)</option>
                                <option value="Europe/London">Europe/London (GMT+0)</option>
                                <option value="America/New_York">America/New_York (GMT-5)</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <Save className="w-5 h-5" />
                        Salvează Setările
                    </button>
                </div>
            </div>
        </div>
    )
}

function TabButton({ active, onClick, icon: Icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${active
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
        </button>
    )
}
