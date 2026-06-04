import { useState } from 'react'
import { CalendarDays } from 'lucide-react'

export default function LeavesManagement() {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-blue-600" />
                        Concedii și Absențe
                    </h1>
                    <p className="text-slate-500 mt-1">Gestionare cereri de concediu, medical și alte absențe</p>
                </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">Modul în lucru</h3>
                <p className="text-slate-500 max-w-md mx-auto mt-2">
                    Acest modul este momentan în construcție și va fi disponibil în curând.
                </p>
            </div>
        </div>
    )
}
