import React from 'react';
import { ArrowLeft, Sparkles, AlertTriangle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeFleetHub() {
    const navigate = useNavigate();
    
    return (
        <div className="min-h-screen bg-slate-50 pb-36">
            <div className="bg-white px-4 py-4 sticky top-0 z-20 flex items-center gap-3 border-b shadow-sm">
                <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-tight">Flotă Auto</h1>
                    <p className="text-xs text-slate-500">Gestionare și curățenie vehicule</p>
                </div>
            </div>

            <div className="p-4 max-w-md mx-auto space-y-4 mt-4">
                <button 
                    onClick={() => navigate('/vehicle-cleaning')}
                    className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 active:scale-95 transition-transform text-left"
                >
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Curățenie Auto</h3>
                        <p className="text-slate-500 text-sm mt-1">Adaugă poze după ce ai curățat mașina</p>
                    </div>
                </button>

                <button 
                    onClick={() => {}}
                    className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 active:scale-95 transition-transform text-left opacity-60"
                >
                    <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                        <FileText className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Predare / Primire</h3>
                        <p className="text-slate-500 text-sm mt-1">Proces verbal auto (În curând)</p>
                    </div>
                </button>

                <button 
                    onClick={() => {}}
                    className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 active:scale-95 transition-transform text-left opacity-60"
                >
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Sesizare Auto</h3>
                        <p className="text-slate-500 text-sm mt-1">Raportează o problemă (În curând)</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
