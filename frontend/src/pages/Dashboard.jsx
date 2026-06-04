import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { Clock, Calendar, Users, Settings, TrendingUp, MapPin, Briefcase, ArrowRight, LogOut, PackageSearch, AlertTriangle, MessageSquareWarning } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import KPICard from '../components/KPICard'

export default function Dashboard() {
    const { t } = useTranslation()
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    const [stats, setStats] = useState({
        currentMonthHours: 0,
        workedDays: 0,
        activeSites: 0
    })

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            // Fetch user stats
            const response = await api.get('/timesheets/stats')
            setStats(response.data)
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const quickActions = [
        {
            icon: MapPin,
            title: 'Clock In/Out',
            description: t('dashboard.clock_in_gps'),
            gradient: 'from-green-500 to-emerald-600',
            href: '/clock-in'
        },
        {
            icon: Clock,
            title: 'Pontaj Azi',
            description: t('dashboard.complete_daily'),
            gradient: 'from-blue-500 to-blue-600',
            href: '/today'
        },
        {
            icon: Calendar,
            title: 'Istoric',
            description: 'Vezi pontajele anterioare',
            gradient: 'from-emerald-500 to-emerald-600',
            href: '/history'
        },
        {
            icon: Users,
            title: 'Echipa',
            description: t('dashboard.manage_team'),
            gradient: 'from-violet-500 to-violet-600',
            href: '/team'
        },
        {
            icon: Settings,
            title: t('dashboard.settings'),
            description: 'Configurare cont',
            gradient: 'from-slate-500 to-slate-600',
            href: '/settings'
        },
        {
            icon: PackageSearch,
            title: 'Necesar Materiale',
            description: 'Cereri pentru șantier',
            gradient: 'from-amber-500 to-orange-600',
            href: '/material-requests'
        },
        {
            icon: AlertTriangle,
            title: 'Urgențe',
            description: 'Alerte rapide din șantier',
            gradient: 'from-rose-500 to-red-600',
            href: '/emergencies'
        },
        {
            icon: MessageSquareWarning,
            title: 'Sesizări / Reclamații',
            description: 'Trimite o sesizare',
            gradient: 'from-sky-500 to-cyan-600',
            href: '/sesizari'
        }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 fade-in">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Briefcase className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Pontaj Digital</h1>
                                <p className="text-xs text-slate-500">Sistem de pontaj</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
                                <p className="text-xs text-slate-500">{user?.role?.name}</p>
                            </div>
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform cursor-pointer">
                                {user?.full_name?.charAt(0)}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-slate-900"
                                title="Deconectare"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Welcome Section */}
                <div className="slide-up">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        Bună, {user?.full_name?.split(' ')[0]}! 👋
                    </h2>
                    <p className="text-slate-600">
                        {t('dashboard.welcome_back')}
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 slide-up stagger-1">
                    <KPICard
                        icon={TrendingUp}
                        label={t('dashboard.hours_this_month')}
                        value="160h"
                        colorTheme="blue"
                    />
                    <KPICard
                        icon={Calendar}
                        label="Zile Lucrate"
                        value="20"
                        colorTheme="green"
                    />
                    <KPICard
                        icon={MapPin}
                        label="Șantiere Active"
                        value="3"
                        colorTheme="purple"
                    />
                </div>

                {/* Quick Actions */}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Acțiuni Rapide</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => (
                            <ActionCard
                                key={action.href}
                                icon={<action.icon className="w-7 h-7" />}
                                title={action.title}
                                description={action.description}
                                href={action.href}
                                gradient={action.gradient}
                                delay={`stagger-${index + 2}`}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}

function ActionCard({ icon, title, description, href, gradient, delay }) {
    const navigate = useNavigate()

    return (
        <div
            onClick={() => navigate(href)}
            className={`group bg-white rounded-2xl p-6 border border-slate-200/50 shadow-sm 
                 hover:shadow-lg transition-all duration-300 
                 hover:scale-[1.02] hover:-translate-y-1
                 slide-up ${delay} cursor-pointer`}
        >
            <div className={`inline-flex p-3 bg-gradient-to-br ${gradient} rounded-xl mb-4 
                      shadow-lg shadow-${gradient.split('-')[1]}-500/30
                      group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">
                    {icon}
                </div>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {title}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
                {description}
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                <span>Deschide</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
    )
}
