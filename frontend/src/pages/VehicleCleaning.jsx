import React, { useState, useEffect } from 'react';
import { ArrowLeft, Car, Camera, Check, Sparkles, Plus, Image as ImageIcon, ChevronRight, CarFront, Gauge, Sofa, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';

export default function VehicleCleaning() {
    const { t } = useTranslation();
    const { showToast } = useUIStore();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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
        const fetchVehicles = async () => {
            try {
                // Fetch only vehicles assigned to the logged-in user
                const res = await api.get('/worker/assigned-vehicles'); 
                setVehicles(res.data);
            } catch (err) {
                showToast("Nu s-au putut încărca mașinile.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchVehicles();
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

    const handleSubmit = async () => {
        if (!selectedVehicle) {
            showToast("Selectează o mașină!", "error");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('vehicle_id', selectedVehicle.id);
            
            const photoMap = { exterior: {}, interior: {} };
            
            // Append files and build map
            for (const cat of ['exterior', 'interior']) {
                for (const [angle, file] of Object.entries(photos[cat])) {
                    if (file) {
                        // Generate a unique field name for the backend to recognize
                        const uniqueName = `${cat}_${angle}_${file.name}`;
                        formData.append('files', file, uniqueName);
                        photoMap[cat][angle] = uniqueName;
                    }
                }
            }
            
            formData.append('photos', JSON.stringify(photoMap));

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
                            <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                                <Check className="w-4 h-4" />
                            </div>
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
                <div className="bg-white px-4 py-4 sticky top-0 z-20 flex items-center justify-between border-b shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
                            <ArrowLeft className="w-6 h-6 text-slate-700" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 leading-tight">Flotă Auto</h1>
                            <p className="text-xs text-slate-500">Selectează mașina pentru curățenie</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                    ) : (
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
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white px-4 py-4 sticky top-0 z-20 flex items-center gap-3 border-b shadow-sm">
                <button onClick={() => setSelectedVehicle(null)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
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

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50">
                <button 
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
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
    );
}
