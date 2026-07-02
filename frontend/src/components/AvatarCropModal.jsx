import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';

export default function AvatarCropModal({ imageFile, onCancel, onSave }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [imageSrc, setImageSrc] = useState(null);

    React.useEffect(() => {
        if (!imageFile) return;
        const url = URL.createObjectURL(imageFile);
        setImageSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [imageFile]);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            const image = new Image();
            image.src = imageSrc;
            await new Promise((resolve) => (image.onload = resolve));

            const canvas = document.createElement('canvas');
            canvas.width = croppedAreaPixels.width;
            canvas.height = croppedAreaPixels.height;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            );

            canvas.toBlob((blob) => {
                if (blob) {
                    onSave(blob);
                }
            }, 'image/jpeg', 0.95);
        } catch (e) {
            console.error('Failed to crop image', e);
        }
    };

    if (!imageSrc) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Încadrare Poză Profil</h3>
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-300" />
                    </button>
                </div>
                
                <div className="relative w-full h-80 bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                
                <div className="p-5 flex flex-col gap-4 bg-slate-900">
                    <div className="flex items-center gap-4">
                        <span className="text-slate-400 text-sm font-medium">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-2xl appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-2">
                        <button onClick={onCancel} className="px-5 py-2.5 rounded-2xl font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                            Anulează
                        </button>
                        <button onClick={handleSave} className="px-5 py-2.5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2">
                            <Check className="w-4 h-4" /> Finalizează
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
