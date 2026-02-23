import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { HardHat, ArrowRight, Loader2 } from 'lucide-react'

export default function Login() {
    const [employeeCode, setEmployeeCode] = useState('')
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

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
            setAuth(user, access_token, refresh_token)
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.detail || 'Eroare la autentificare')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Title */}
                <div className="text-center mb-8 fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
                        <HardHat className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Pontaj Digital
                    </h1>
                    <p className="text-slate-600">
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
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl 
                         focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 
                         outline-none transition-all duration-200 text-slate-900 font-medium
                         placeholder:text-slate-400 placeholder:font-normal"
                                placeholder="••••"
                                maxLength={4}
                                pattern="[0-9]{4}"
                                required
                            />
                        </div>

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
                                    <span>Se autentifică...</span>
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
                <p className="text-center mt-6 text-sm text-slate-500 fade-in stagger-2">
                    © 2024 Pontaj Digital. Toate drepturile rezervate.
                </p>
            </div>
        </div>
    )
}
