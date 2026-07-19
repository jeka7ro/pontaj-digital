import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Star, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

const CRITERIA = [
    { key: 'score_attendance', label: 'Prezență și punctualitate', desc: 'absențe, întârzieri, respectarea programului' },
    { key: 'score_quality', label: 'Calitatea muncii', desc: 'atenție la detalii, corectitudine, respectarea standardelor' },
    { key: 'score_productivity', label: 'Productivitate', desc: 'volum de muncă, eficiență, ritm' },
    { key: 'score_responsibility', label: 'Responsabilitate', desc: 'taskuri finalizate, follow-up, asumare' },
    { key: 'score_attitude', label: 'Atitudine și comportament', desc: 'seriozitate, respect, profesionalism' },
    { key: 'score_initiative', label: 'Inițiativă', desc: 'propune soluții, observă probleme, vine cu idei' },
    { key: 'score_adaptability', label: 'Adaptabilitate', desc: 'flexibilitate, reacție la schimbări, învățare rapidă' }
];

function getLabel(score) {
    if (score >= 9) return 'Excelent';
    if (score >= 8) return 'Foarte bun';
    if (score >= 7) return 'Bun / stabil';
    if (score >= 5) return 'Necesită îmbunătățire';
    return 'Problematic';
}

function getColor(score) {
    if (score >= 9) return 'text-emerald-600 bg-emerald-100';
    if (score >= 8) return 'text-blue-600 bg-blue-100';
    if (score >= 7) return 'text-indigo-600 bg-indigo-100';
    if (score >= 5) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
}

export default function UserEvaluationsTab({ userId, onEvaluationAdded }) {
    const [evaluations, setEvaluations] = useState([]);
    const [overallAvg, setOverallAvg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        score_attendance: 10,
        score_quality: 10,
        score_productivity: 10,
        score_responsibility: 10,
        score_attitude: 10,
        score_initiative: 10,
        score_adaptability: 10,
        notes: '',
        evaluation_month: new Date().toISOString().slice(0, 7) // YYYY-MM
    });

    useEffect(() => {
        fetchEvaluations();
    }, [userId]);

    const fetchEvaluations = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/users/${userId}/evaluations`);
            setEvaluations(res.data.evaluations);
            setOverallAvg(res.data.overall_average);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSlider = (key, val) => {
        setFormData(prev => ({ ...prev, [key]: parseFloat(val) }));
    };

    const currentAvg = (
        CRITERIA.reduce((acc, c) => acc + formData[c.key], 0) / CRITERIA.length
    ).toFixed(2);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post(`/admin/users/${userId}/evaluations`, formData);
            setShowForm(false);
            fetchEvaluations();
            if (onEvaluationAdded) onEvaluationAdded();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Media Generală a Angajatului</h3>
                    {overallAvg ? (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-black text-slate-800 dark:text-white">{overallAvg} / 10</span>
                            <span className={`px-2 py-1 text-xs font-bold rounded-lg ${getColor(overallAvg)}`}>
                                {getLabel(overallAvg)}
                            </span>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 mt-1">Nu există nicio evaluare.</p>
                    )}
                </div>
                {!showForm && (
                    <button 
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Evaluează
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <h4 className="font-bold text-slate-800 dark:text-white">Formular Evaluare</h4>
                        <div className="flex items-center gap-3">
                            <input 
                                type="month" 
                                value={formData.evaluation_month} 
                                onChange={e => setFormData({...formData, evaluation_month: e.target.value})}
                                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {CRITERIA.map(c => (
                            <div key={c.key} className="flex items-center gap-4">
                                <div className="w-1/3">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{c.label}</p>
                                    <p className="text-xs text-slate-400 truncate" title={c.desc}>{c.desc}</p>
                                </div>
                                <div className="flex-1 flex items-center gap-3">
                                    <input 
                                        type="range" min="1" max="10" step="0.5"
                                        value={formData[c.key]}
                                        onChange={e => handleSlider(c.key, e.target.value)}
                                        className="w-full accent-blue-600"
                                    />
                                    <span className="w-10 text-right font-bold text-slate-700 dark:text-white">{formData[c.key]}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observații</label>
                        <textarea
                            value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3} placeholder="Note suplimentare..."
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Media rezultată:</span>
                            <span className="font-bold text-lg text-slate-800 dark:text-white">{currentAvg}</span>
                            <span className={`px-2 py-1 text-[11px] font-bold rounded-lg ${getColor(currentAvg)}`}>{getLabel(currentAvg)}</span>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Anulează</button>
                            <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Salvează
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-white mb-3">Istoric Evaluări</h4>
                {evaluations.length === 0 && !showForm && (
                    <p className="text-sm text-slate-500">Nicio evaluare înregistrată.</p>
                )}
                {evaluations.map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    <span className="font-bold text-lg text-slate-800 dark:text-white">{ev.average}</span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase tracking-wider ${getColor(ev.average)}`}>{getLabel(ev.average)}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Adăugat de {ev.evaluator_name} pt luna {ev.evaluation_month || 'N/A'}</p>
                            </div>
                            <span className="text-[10px] text-slate-400">{new Date(ev.created_at).toLocaleDateString('ro-RO')}</span>
                        </div>
                        {ev.notes && <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-2 rounded-lg mb-3">"{ev.notes}"</p>}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {CRITERIA.map(c => (
                                <div key={c.key} className="bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400 truncate mr-2" title={c.label}>{c.label}</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{ev[c.key]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
