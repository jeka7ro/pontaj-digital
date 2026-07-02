import { AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

export function DialogOverlay() {
    const { dialog, closeDialog } = useUIStore()

    if (!dialog) return null

    const isDanger = dialog.type === 'danger'

    return (
        <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={closeDialog}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className={`p-6 border-b flex items-start gap-4 ${isDanger ? 'bg-red-50/50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                    <div className={`p-3 rounded-xl ${isDanger ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'}`}>
                        {isDanger ? <AlertTriangle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 mt-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{dialog.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">{dialog.message}</p>
                    </div>
                    <button 
                        onClick={closeDialog}
                        className="p-1 -mr-2 -mt-2 text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700 hover:text-slate-600 rounded-2xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3 justify-end border-t border-slate-100 dark:border-slate-700">
                    <button 
                        className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                        onClick={closeDialog}
                    >
                        {dialog.cancelText || 'Anulează'}
                    </button>
                    <button 
                        className={`px-5 py-2 font-semibold text-white rounded-xl shadow-md transition-all ${isDanger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
                        onClick={async () => {
                            if (dialog.onConfirm) {
                                await dialog.onConfirm()
                            }
                            closeDialog()
                        }}
                    >
                        {dialog.confirmText || 'Confirmă'}
                    </button>
                </div>
            </div>
        </div>
    )
}
