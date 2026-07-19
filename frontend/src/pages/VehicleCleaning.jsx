import React, { useState, useEffect } from 'react';
import { ArrowLeft, Car, Camera, Check, Sparkles, Plus, Image as ImageIcon, ChevronRight, CarFront, Gauge, Sofa, Package, History, X } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import imageCompression from 'browser-image-compression';

export default function VehicleCleaning() {
    const { t } = useTranslation();
    const { showToast } = useUIStore();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('clean'); // 'clean' | 'history'
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [lightboxState, setLightboxState] = useState(null); // { session, index }

    const getSessionPhotos = (session) => {
        if (!session) return [];
        const ext = Object.entries(session.photos?.exterior || {}).map(([k, u]) => ({ title: `Exterior - ${k.replace('_', ' ')}`, url: u }));
        const int = Object.entries(session.photos?.interior || {}).map(([k, u]) => ({ title: `Interior - ${k.replace('_', ' ')}`, url: u }));
        return [...ext, ...int];
    };

    // Photos state
    const [photos, setPhotos] = useState({
        exterior: {
            fata: null,
            laterala_stanga: null,
            laterala_dreapta: null,
            spate: null
        },
        interior: {
            bord: null,
            scaune: null,
            portbagaj: null
        }
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vehiclesRes, historyRes] = await Promise.all([
                    api.get('/worker/assigned-vehicles'),
                    api.get('/worker/vehicle-cleaning/history')
                ]);
                setVehicles(vehiclesRes.data);
                setHistory(historyRes.data);
            } catch (err) {
                showToast("Eroare la încărcarea datelor.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handlePhotoCapture = (category, angle, file) => {
        setPhotos(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [angle]: file
            }
        }));
    };

    const triggerFileInput = (id) => {
        document.getElementById(id).click();
    };

    const handleRemovePhoto = (e, category, key) => {
        e.stopPropagation();
        setPhotos(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: null
            }
        }));
    };

    const handleSubmit = async () => {
        if (!selectedVehicle) {
            showToast("Selectează o mașină!", "error");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('vehicle_id', selectedVehicle.id);
            
            const photosMeta = { exterior: {}, interior: {} };
            
            // Compression options to reduce 5-10MB photos to ~100-300KB
            const compressionOptions = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1280,
                useWebWorker: true,
                fileType: 'image/jpeg'
            };
            
            for (const cat of ['exterior', 'interior']) {
                for (const key in photos[cat]) {
                    const file = photos[cat][key];
                    if (file) {
                        const uniqueName = `${cat}_${key}_${file.name}`;
                        try {
                            // Try to compress, if fails fallback to original
                            const compressedFile = await imageCompression(file, compressionOptions);
                            formData.append('files', compressedFile, uniqueName);
                        } catch (err) {
                            console.error("Compression error:", err);
                            formData.append('files', file, uniqueName);
                        }
                        photosMeta[cat][key] = uniqueName;
                    }
                }
            }
            formData.append('photos', JSON.stringify(photosMeta));

            await api.post('/worker/vehicle-cleaning', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            showToast("Pozele au fost trimise cu succes!", "success");
            navigate('/');
        } catch (error) {
            console.error(error);
            showToast("Eroare la trimiterea pozelor.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const renderPhotoBox = (category, key, label, Icon = Plus) => {
        const file = photos[category][key];
        const inputId = `file-${category}-${key}`;
        
        return (
            <div>
                <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
                <div 
                    onClick={() => document.getElementById(inputId).click()}
                    className={`relative aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all ${
                        file 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                >
                    {file ? (
                        <>
                            <img src={URL.createObjectURL(file)} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                            <button 
                                onClick={(e) => handleRemovePhoto(e, category, key)}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full z-10 transition-colors shadow-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <Icon className="w-8 h-8 text-slate-400 mb-2" strokeWidth={1.5} />
                            <span className="text-sm text-slate-500 font-medium">Adaugă poză</span>
                        </>
                    )}
                    <input 
                        type="file" 
                        id={inputId} 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                handlePhotoCapture(category, key, e.target.files[0]);
                            }
                        }}
                    />
                </div>
            </div>
        );
    };

    if (!selectedVehicle) {
        return (
            <div className="min-h-screen bg-slate-50 pb-24">
                <div className="bg-white px-4 py-4 sticky top-0 z-20 flex items-center gap-3 border-b shadow-sm">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Curățenie Auto</h1>
                        <p className="text-xs text-slate-500">Gestionează pozele pentru mașina ta</p>
                    </div>
                </div>

                <div className="p-4 max-w-md mx-auto">
                    {/* Tabs */}
                    <div className="flex bg-slate-200/60 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setActiveTab('clean')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                activeTab === 'clean' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Curăță o mașină
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                activeTab === 'history' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Istoric (Arhivă)
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                    ) : activeTab === 'clean' ? (
                        <div className="space-y-3">
                            {vehicles.length === 0 ? (
                                <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-100">
                                    <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Nu ai nicio mașină alocată momentan.</p>
                                    <p className="text-sm text-gray-400 mt-1">Contactează un administrator pentru a-ți asocia o mașină.</p>
                                </div>
                            ) : (
                                vehicles.map(vehicle => (
                                    <button
                                        key={vehicle.id}
                                        onClick={() => setSelectedVehicle(vehicle)}
                                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm active:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                                <Car size={24} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                                                <p className="text-sm text-gray-500">{vehicle.plate_number}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-gray-400" />
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.length === 0 ? (
                                <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-100">
                                    <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Nicio sesiune de curățenie înregistrată.</p>
                                </div>
                            ) : (
                                history.map(session => (
                                    <div key={session.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{session.vehicle_name}</h3>
                                                <p className="text-xs text-gray-500">{session.vehicle_plate}</p>
                                            </div>
                                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                {format(new Date(session.created_at), "dd MMM yyyy, HH:mm", { locale: ro })}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {getSessionPhotos(session).map((photo, i) => (
                                                <img 
                                                    key={i} 
                                                    src={photo.url} 
                                                    onClick={() => setLightboxState({ session, index: i })} 
                                                    className="w-full aspect-square object-cover rounded-lg border border-gray-100 active:scale-95 transition-transform" 
                                                    alt={photo.title}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-36">
            {/* Header */}
            <div className="bg-white px-4 py-4 sticky top-0 z-20 flex items-center gap-3 border-b shadow-sm">
                <button 
                    onClick={() => {
                        setSelectedVehicle(null);
                        setPhotos({ exterior: {}, interior: {} });
                    }} 
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-tight">Poze curățenie mașină</h1>
                    <p className="text-xs text-slate-500">{selectedVehicle.name} • {selectedVehicle.plate_number}</p>
                </div>
            </div>

            <div className="p-4 max-w-md mx-auto space-y-8">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
                    <Sparkles className="w-6 h-6 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">Adaugă poze clare cu exteriorul și interiorul mașinii după curățenie. Acestea vor fi verificate.</p>
                </div>

                {/* Exterior */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-slate-500" />
                        Poze Exterior
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {renderPhotoBox('exterior', 'fata', 'Față', CarFront)}
                        {renderPhotoBox('exterior', 'spate', 'Spate', Car)}
                        {renderPhotoBox('exterior', 'laterala_stanga', 'Laterală Stânga', Car)}
                        {renderPhotoBox('exterior', 'laterala_dreapta', 'Laterală Dreapta', Car)}
                    </div>
                </div>

                {/* Interior */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-slate-500" />
                        Poze Interior
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {renderPhotoBox('interior', 'bord', 'Bord & Consolă', Gauge)}
                        {renderPhotoBox('interior', 'scaune', 'Scaune', Sofa)}
                        {renderPhotoBox('interior', 'portbagaj', 'Portbagaj', Package)}
                    </div>
                </div>
            </div>
                
            {/* Fixed Bottom Bar for Submit Button */}
            <div className="fixed bottom-[80px] left-0 right-0 p-4 z-40 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <button 
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/30"
                    >
                        {submitting ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-6 h-6" />
                                Trimite Dosar Curățenie
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Fullscreen Gallery Lightbox Modal */}
            {lightboxState && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={() => setLightboxState(null)}>
                    <div className="flex justify-between items-center p-4 text-white" onClick={e => e.stopPropagation()}>
                        <div className="text-sm font-medium">
                            {lightboxState.index + 1} / {getSessionPhotos(lightboxState.session).length} - {getSessionPhotos(lightboxState.session)[lightboxState.index].title}
                        </div>
                        <button onClick={() => setLightboxState(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center relative px-4 sm:px-16" onClick={e => e.stopPropagation()}>
                        {lightboxState.index > 0 && (
                            <button 
                                onClick={() => setLightboxState({ ...lightboxState, index: lightboxState.index - 1 })} 
                                className="absolute left-2 sm:left-4 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                            </button>
                        )}
                        
                        <img 
                            src={getSessionPhotos(lightboxState.session)[lightboxState.index].url} 
                            className="max-w-full max-h-[85vh] object-contain select-none shadow-2xl" 
                            alt={getSessionPhotos(lightboxState.session)[lightboxState.index].title} 
                        />
                        
                        {lightboxState.index < getSessionPhotos(lightboxState.session).length - 1 && (
                            <button 
                                onClick={() => setLightboxState({ ...lightboxState, index: lightboxState.index + 1 })} 
                                className="absolute right-2 sm:right-4 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
