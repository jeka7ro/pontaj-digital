import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import api from '../../lib/api'
import { Shield, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

    const navigate = useNavigate()
    const setAuth = useAdminStore((state) => state.setAuth)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await api.post('/admin/login', {
                email,
                password
            })

            const { access_token, admin } = response.data
            setAuth(admin, access_token)
            navigate('/admin/dashboard')
        } catch (err) {
            setError(err.response?.data?.detail || 'Eroare la autentificare')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Title */}
                <div className="text-center mb-8 fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/50">
                        <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Admin Portal
                    </h1>
                    <p className="text-blue-200">
                        Pontaj Digital - Panou de Administrare
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 slide-up">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                <Mail className="w-4 h-4 inline mr-2" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl 
                         focus:border-blue-400 focus:bg-white/20 focus:ring-4 focus:ring-blue-500/20 
                         outline-none transition-all duration-200 text-white font-medium
                         placeholder:text-white/50"
                                placeholder="admin@pontaj.ro"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                <Lock className="w-4 h-4 inline mr-2" />
                                Parolă
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-white/10 border-2 border-white/20 rounded-xl 
                         focus:border-blue-400 focus:bg-white/20 focus:ring-4 focus:ring-blue-500/20 
                         outline-none transition-all duration-200 text-white font-medium
                         placeholder:text-white/50"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/60 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/30"
                            />
                            <span className="text-sm text-white/80">Memorează-mă</span>
                        </label>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/20 border-2 border-red-400/50 rounded-xl p-4 scale-in">
                                <p className="text-red-100 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white 
                       px-6 py-3.5 rounded-xl font-semibold text-base
                       hover:from-blue-600 hover:to-indigo-700
                       active:scale-[0.98] transition-all duration-200
                       shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Se autentifică...</span>
                                </>
                            ) : (
                                <>
                                    <span>Autentificare Admin</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Back to Main App */}
                    <div className="mt-6 text-center">
                        <a href="/" className="text-sm text-blue-200 hover:text-white transition-colors font-medium">
                            ← Înapoi la aplicație
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center mt-6 text-sm text-blue-200/70 fade-in stagger-2">
                    © 2024 Pontaj Digital. Acces restricționat.
                </p>
            </div>
        </div>
    )
}
