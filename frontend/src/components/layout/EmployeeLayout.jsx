import React from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, PackageOpen, Wrench, AlertTriangle, Calendar } from 'lucide-react'

export default function EmployeeLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const isHome = location.pathname === '/'

    const handleHomePress = async () => {
        if (isHome) {
            // Deja pe home — face refresh complet (curata cache GPS/locatie)
            try {
                if ('caches' in window) {
                    const keys = await caches.keys()
                    await Promise.all(keys.map(k => caches.delete(k)))
                }
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations()
                    await Promise.all(regs.map(r => r.unregister()))
                }
            } catch (e) { /* ignore */ }
            window.location.reload(true)
        } else {
            navigate('/')
        }
    }

    return (
        <div className="flex flex-col min-h-[100dvh] bg-slate-50">
            {/* Main Content Area */}
            <main className="flex-grow flex flex-col pb-24">
                <Outlet />
            </main>

            {/* Bottom Navigation Bar (Glossy Glass Theme) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-blue-100/40 backdrop-blur-xl border-4 border-b-0 border-white/80 px-2 py-3 flex justify-between items-center shadow-[0_-10px_25px_rgba(59,130,246,0.5)] z-50 rounded-t-3xl">
                
                {/* 1. Istoric (Blue) */}
                <NavLink 
                    to="/history" 
                    className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-blue-700 scale-110 drop-shadow-md' : (isHome ? 'text-blue-600/90' : 'text-slate-400')}`}
                >
                    <Calendar className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-bold">Istoric</span>
                </NavLink>

                {/* 2. Materiale (Orange) */}
                <NavLink 
                    to="/material-requests" 
                    className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-orange-600 scale-110 drop-shadow-md' : (isHome ? 'text-orange-500/90' : 'text-slate-400')}`}
                >
                    <PackageOpen className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-bold">Materiale</span>
                </NavLink>

                {/* 3. Acasă (Home) - Glossy Glass 3D Button */}
                <div className="relative flex justify-center w-[96px]">
                    <button
                        onClick={handleHomePress}
                        className={`absolute -top-14 flex flex-col items-center justify-center w-[84px] h-[84px] text-white rounded-full transition-all active:scale-95 border-4 border-white/80 backdrop-blur-xl bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 shadow-[0_10px_25px_rgba(59,130,246,0.6),inset_0_2px_6px_rgba(255,255,255,0.9),inset_0_-2px_6px_rgba(0,0,0,0.2)] ${isHome ? 'ring-4 ring-blue-400/30 scale-105' : 'ring-2 ring-blue-300/20'}`}
                    >
                        <Home className="w-10 h-10 drop-shadow-md" />
                    </button>
                </div>

                {/* 4. Inventar (Green/Teal) */}
                <NavLink 
                    to="/my-inventory" 
                    className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-emerald-600 scale-110 drop-shadow-md' : (isHome ? 'text-emerald-600/90' : 'text-slate-400')}`}
                >
                    <Wrench className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-bold">Inventar</span>
                </NavLink>

                {/* 5. Sesizări (Red) */}
                <NavLink 
                    to="/sesizari" 
                    className={({isActive}) => `flex flex-col items-center p-2 w-[72px] transition-all ${isActive ? 'text-red-600 scale-110 drop-shadow-md' : (isHome ? 'text-red-500/90' : 'text-slate-400')}`}
                >
                    <AlertTriangle className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-bold">Sesizări</span>
                </NavLink>
            </nav>
        </div>
    )
}
