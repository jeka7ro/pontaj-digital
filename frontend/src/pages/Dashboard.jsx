import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { Clock, Calendar, Users, Settings, TrendingUp, MapPin, Briefcase, ArrowRight, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Dashboard() {
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
            description: 'Pontează cu GPS',
            gradient: 'from-green-500 to-emerald-600',
            href: '/clock-in'
        },
        {
            icon: Clock,
            title: 'Pontaj Azi',
            description: 'Completează pontajul zilnic',
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
            description: 'Gestionează echipa ta',
            gradient: 'from-violet-500 to-violet-600',
            href: '/team'
        },
        {
            icon: Settings,
            title: 'Setări',
            description: 'Configurare cont',
            gradient: 'from-slate-500 to-slate-600',
            href: '/settings'
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
                        Bine ai venit înapoi. Iată ce se întâmplă astăzi.
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 slide-up stagger-1">
                    <StatCard
                        icon={<TrendingUp className="w-6 h-6" />}
                        label="Ore Luna Curentă"
                        value="160h"
                        change="+12h vs luna trecută"
                        positive
                    />
                    <StatCard
                        icon={<Calendar className="w-6 h-6" />}
                        label="Zile Lucrate"
                        value="20"
                        change="+2 săptămâna asta"
                        positive
                    />
                    <StatCard
                        icon={<MapPin className="w-6 h-6" />}
                        label="Șantiere Active"
                        value="3"
                        change="Toate în desfășurare"
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

function StatCard({ icon, label, value, change, positive }) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
                    {icon}
                </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
            <p className="text-sm font-medium text-slate-600 mb-2">{label}</p>
            {change && (
                <p className={`text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {change}
                </p>
            )}
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
