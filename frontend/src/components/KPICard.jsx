import React from 'react';

export default function KPICard({ label, value, icon: Icon, colorTheme = 'blue', onClick, pulse, isText, active }) {
    const themes = {
        blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20', iconBg: 'bg-blue-500', glow: 'shadow-blue-500', activeRing: 'ring-blue-500/30 border-blue-400' },
        green: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20', iconBg: 'bg-emerald-500', glow: 'shadow-emerald-500', activeRing: 'ring-emerald-500/30 border-emerald-400' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-500/20', iconBg: 'bg-orange-500', glow: 'shadow-orange-500', activeRing: 'ring-orange-500/30 border-orange-400' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-500/20', iconBg: 'bg-purple-500', glow: 'shadow-purple-500', activeRing: 'ring-purple-500/30 border-purple-400' },
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-500/20', iconBg: 'bg-indigo-500', glow: 'shadow-indigo-500', activeRing: 'ring-indigo-500/30 border-indigo-400' },
        slate: { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20', iconBg: 'bg-slate-500', glow: 'shadow-slate-500', activeRing: 'ring-slate-400/30 border-slate-400' }
    }
    const theme = themes[colorTheme] || themes.blue;

    return (
        <div
            onClick={onClick}
            className={`group bg-white dark:bg-slate-900 rounded-xl px-3 py-2 shadow-sm hover:shadow-md hover:shadow-${theme.glow}/10 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${active ? `border-2 ring-4 ${theme.activeRing}` : 'border border-slate-200/80 dark:border-slate-700/80'}`}
        >
            <div className={`p-2 rounded-lg ${theme.bg} ${theme.border} border shrink-0 relative z-10`}>
                {Icon && <Icon className={`w-4 h-4 ${theme.text}`} />}
            </div>
            <div className="flex-1 min-w-0 relative z-10 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    <div className={`${isText ? 'text-lg' : 'text-xl'} font-extrabold text-slate-900 dark:text-white leading-none`}>
                        {value}
                    </div>
                    {pulse && (
                        <div className="relative flex h-1.5 w-1.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.iconBg}`}></span>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${theme.iconBg}`}></span>
                        </div>
                    )}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate mt-0.5">
                    {label}
                </div>
            </div>
            
            <div className={`absolute -right-4 -top-4 w-16 h-16 ${theme.bg} rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none`}></div>
        </div>
    )
}
