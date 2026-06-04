import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { HardHat, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

export default function Login() {
    const { t } = useTranslation()
    const [employeeCode, setEmployeeCode] = useState('')
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPin, setShowPin] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

    // Load saved credentials on mount
    useEffect(() => {
        const saved = localStorage.getItem('pontaj_saved_login')
        if (saved) {
            try {
                const { code, pin: savedPin } = JSON.parse(saved)
                setEmployeeCode(code || '')
                setPin(savedPin || '')
                setRememberMe(true)
            } catch (e) { }
        }
    }, [])

    const navigate = useNavigate()
    const setAuth = useAuthStore((state) => state.setAuth)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await api.post('/auth/login', {
                employee_code: employeeCode,
                pin: pin
            })

            const { access_token, refresh_token, user } = response.data
            // Save or clear credentials
            if (rememberMe) {
                localStorage.setItem('pontaj_saved_login', JSON.stringify({ code: employeeCode, pin }))
            } else {
                localStorage.removeItem('pontaj_saved_login')
            }
            setAuth(user, access_token, refresh_token)
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.detail || 'Eroare la autentificare')
        } finally {
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
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10 mt-8">
                {/* Logo & Title */}
                <div className="text-center mb-6 fade-in">
                    <div className="inline-flex items-center justify-center w-32 h-32 mb-2 drop-shadow-xl">
                        <img src="/favicon.png" alt="Logo Elephant" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Pontaj Digital
                    </h1>
                    <p className="text-blue-100 font-medium">
                        Sistem modern de pontaj pentru construcții
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200/50 slide-up">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Employee Code Input */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Cod Angajat
                            </label>
                            <input
                                type="text"
                                value={employeeCode}
                                onChange={(e) => setEmployeeCode(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl 
                         focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 
                         outline-none transition-all duration-200 text-slate-900 font-medium
                         placeholder:text-slate-400 placeholder:font-normal"
                                placeholder="EMP001"
                                required
                                autoFocus
                            />
                        </div>

                        {/* PIN Input */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                PIN (4 cifre)
                            </label>
                            <div className="relative">
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.slice(0, 4))}
                                    className="w-full px-4 py-3 pr-12 bg-slate-50 border-2 border-slate-200 rounded-xl 
                             focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 
                             outline-none transition-all duration-200 text-slate-900 font-medium
                             placeholder:text-slate-400 placeholder:font-normal"
                                    placeholder="••••"
                                    maxLength={4}
                                    pattern="[0-9]{4}"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4.5 h-4.5 rounded border-2 border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            />
                            <span className="text-sm text-slate-600 font-medium">{t('auth.remember_me')}</span>
                        </label>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 scale-in">
                                <p className="text-red-700 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                       px-6 py-3.5 rounded-xl font-semibold text-base
                       hover:from-blue-700 hover:to-indigo-700
                       active:scale-[0.98] transition-all duration-200
                       shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{t('auth.authenticating')}...</span>
                                </>
                            ) : (
                                <>
                                    <span>Autentificare</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Link */}
                    <div className="mt-6 text-center">
                        <a href="#" className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium">
                            Ai uitat PIN-ul?
                        </a>
                    </div>
                </div>

                {/* Bottom Text */}
                <div className="mt-8 text-center flex flex-col items-center justify-center fade-in stagger-2 gap-3">
                    <p className="text-sm text-blue-200/90 font-medium tracking-wide">
                        © 2025 Pontaj Digital.<br className="sm:hidden" />
                        <span className="hidden sm:inline"> Toate drepturile rezervate. | </span>
                        O soluție digitală de {t('common.solution_by')} <a href="https://getapp.ro" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-300 font-bold transition-all underline decoration-blue-400/50 underline-offset-4">getapp.ro</a>
                    </p>
                    <a href="https://getapp.ro" target="_blank" rel="noopener noreferrer" className="inline-block opacity-80 hover:opacity-100 transition-all transform hover:scale-105">
                        <img src="/getapp_smart_timesheet_white.png" alt="GetApp" className="h-16 w-auto object-contain mx-auto drop-shadow-md" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-white font-bold border border-white/30 px-4 py-2 rounded-lg">Powered by GetApp.ro</span>' }} />
                    </a>
                </div>
            </div>
        </div>
    )
}
