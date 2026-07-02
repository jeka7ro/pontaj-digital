import { useUIStore } from '../../store/uiStore'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export function ToastOverlay() {
    const { toast, showToast } = useUIStore()

    if (!toast) return null

    const typeConfig = {
        success: {
            bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        },
        error: {
            bg: 'bg-red-50 border-red-200 text-red-800',
            icon: <AlertCircle className="w-5 h-5 text-red-500" />
        },
        info: {
            bg: 'bg-blue-50 border-blue-200 text-blue-800',
            icon: <Info className="w-5 h-5 text-blue-500" />
        }
    }

    const config = typeConfig[toast.type] || typeConfig.info

    return (
        <div className="fixed top-24 right-6 z-[9999] animate-in slide-in-from-top-5 fade-in duration-300">
            <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full ${config.bg}`}>
                <div className="shrink-0 mt-0.5">{config.icon}</div>
                <div className="flex-1 text-sm font-medium pr-2 whitespace-pre-wrap break-words">
                    {typeof toast.message === 'string' ? toast.message : JSON.stringify(toast.message)}
                </div>
                <button 
                    onClick={() => useUIStore.setState({ toast: null })}
                    className="shrink-0 -mr-1 -mt-1 p-1 hover:bg-black/5 rounded-2xl transition-colors opacity-60 hover:opacity-100"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
