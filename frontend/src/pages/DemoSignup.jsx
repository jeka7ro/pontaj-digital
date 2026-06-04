import { useState } from 'react'
import { ArrowRight, Building2, User, Mail, Lock, Phone, Loader2 } from 'lucide-react'
import api from '../lib/api'

export default function DemoSignup() {
    const [formData, setFormData] = useState({
        company_name: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        phone: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await api.post('/public/demo-signup', formData)
            const slug = res.data.slug

            // Build target URL
            const hostname = window.location.hostname
            const port = window.location.port ? `:${window.location.port}` : ''
            const protocol = window.location.protocol
            
            let baseDomain = 'pontaj.app'
            if (hostname.includes('localhost') || hostname === '127.0.0.1') {
                baseDomain = `localhost${port}`
            } else if (hostname.split('.').length >= 2) {
                const parts = hostname.split('.')
                baseDomain = parts.slice(-2).join('.')
            }

            const targetUrl = `${protocol}//${slug}.${baseDomain}/admin/login?demo=1`
            window.location.href = targetUrl
        } catch (err) {
            setError(err.response?.data?.detail || 'A apărut o eroare la crearea contului.')
            setLoading(false)
        }
    }

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4 relative bg-slate-900"
            style={{
                backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.4), rgba(30, 58, 138, 0.5), rgba(49, 46, 129, 0.6)), url('/login_bg.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="w-full max-w-md relative z-10 mt-4 mb-4">
                <div className="text-center mb-6 fade-in">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20">
                        <Building2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Începe Demo Gratuit
                    </h1>
                    <p className="text-blue-100 font-medium">
                        Ai acces complet gratuit timp de 30 de zile
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 border border-slate-200/50 slide-up">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Numele Companiei *
                            </label>
                            <div className="relative flex items-center">
                                <Building2 className="absolute left-4 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="company_name"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-full 
                                             focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 
                                             outline-none transition-all text-sm text-slate-900 shadow-sm"
                                    placeholder="Firma Mea SRL"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Numele Tău (Admin) *
                            </label>
                            <div className="relative flex items-center">
                                <User className="absolute left-4 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="admin_name"
                                    value={formData.admin_name}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-full 
                                             focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 
                                             outline-none transition-all text-sm text-slate-900 shadow-sm"
                                    placeholder="Ion Popescu"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Email (Login Admin) *
                            </label>
                            <div className="relative flex items-center">
                                <Mail className="absolute left-4 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    name="admin_email"
                                    value={formData.admin_email}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-full 
                                             focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 
                                             outline-none transition-all text-sm text-slate-900 shadow-sm"
                                    placeholder="ion@firma-mea.ro"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Parolă Administrator *
                            </label>
                            <div className="relative flex items-center">
                                <Lock className="absolute left-4 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    name="admin_password"
                                    value={formData.admin_password}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-full 
                                             focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 
                                             outline-none transition-all text-sm text-slate-900 shadow-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Telefon (Opțional)
                            </label>
                            <div className="relative flex items-center">
                                <Phone className="absolute left-4 w-5 h-5 text-slate-400" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-full 
                                             focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 
                                             outline-none transition-all text-sm text-slate-900 shadow-sm"
                                    placeholder="07XX XXX XXX"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 scale-in">
                                <p className="text-red-600 text-sm font-medium text-center">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white 
                                     px-5 h-12 mt-2 rounded-full font-bold text-sm
                                     hover:bg-blue-700
                                     active:scale-[0.98] transition-all duration-200
                                     shadow-sm flex items-center justify-center gap-2 group
                                     disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Se creează contul...</span>
                                </>
                            ) : (
                                <>
                                    <span>Creează Cont Demo</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => window.location.href = '/login'} 
                            className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
                        >
                            Înapoi la Autentificare
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
