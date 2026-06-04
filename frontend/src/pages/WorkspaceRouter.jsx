import { useState } from 'react'
import { ArrowRight, Building2 } from 'lucide-react'

export default function WorkspaceRouter({ isAdmin = false }) {
    const [workspace, setWorkspace] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!workspace.trim()) return

        const slug = workspace.trim().toLowerCase()
        const hostname = window.location.hostname
        const port = window.location.port ? `:${window.location.port}` : ''
        const protocol = window.location.protocol
        
        let baseDomain = 'pontaj.app'
        if (hostname.includes('localhost') || hostname === '127.0.0.1') {
            baseDomain = `localhost${port}`
        } else if (hostname.split('.').length >= 2) {
            // Extract the top 2 domain parts (e.g. smart-timesheet.ro)
            const parts = hostname.split('.')
            baseDomain = parts.slice(-2).join('.')
        }

        const targetPath = isAdmin ? '/admin/login' : '/login'
        const targetUrl = `${protocol}//${slug}.${baseDomain}${targetPath}`
        
        window.location.href = targetUrl
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
            <div className="w-full max-w-md relative z-10 mt-8">
                <div className="text-center mb-8 fade-in">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl mb-4 border border-white/20">
                        <Building2 className="w-12 h-12 text-blue-300" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Bine ai venit
                    </h1>
                    <p className="text-blue-100 font-medium">
                        Te rugăm să introduci codul companiei tale
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200/50 slide-up">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Workspace (Nume Companie)
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={workspace}
                                    onChange={(e) => setWorkspace(e.target.value)}
                                    className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-full 
                                             focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 
                                             outline-none transition-all text-sm text-slate-900 shadow-sm
                                             placeholder:text-slate-400"
                                    placeholder="ex: constructii-srl"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white 
                                     px-5 h-12 rounded-full font-bold text-sm
                                     hover:bg-blue-700
                                     active:scale-[0.98] transition-all duration-200
                                     shadow-sm flex items-center justify-center gap-2 group"
                        >
                            <span>Continuă</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500 mb-4">Nu ai un cont pentru compania ta?</p>
                        <button 
                            onClick={() => window.location.href = '/demo'}
                            className="w-full px-5 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors"
                        >
                            Începe un Demo de 30 de zile gratuit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
