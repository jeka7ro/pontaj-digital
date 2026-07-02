import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleScan = (detectedCodes) => {
        if (detectedCodes && detectedCodes.length > 0) {
            const code = detectedCodes[0].rawValue;
            if (code.startsWith('pontaj-item:')) {
                const itemId = code.replace('pontaj-item:', '');
                onScanSuccess(itemId);
            } else {
                setError("Codul QR scanat nu este valid pentru aplicația de Logistică.");
                setTimeout(() => setError(null), 3000);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Scanează QR
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors focus:outline-none"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="relative bg-black aspect-square w-full">
                    <Scanner
                        onScan={handleScan}
                        onError={(err) => setError("Eroare la accesarea camerei: " + err?.message)}
                        components={{
                            audio: false,
                            finder: true
                        }}
                    />
                    
                    {error && (
                        <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-2xl text-sm shadow-lg animate-fade-in-down backdrop-blur-md">
                            {error}
                        </div>
                    )}
                    
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                        <div className="bg-black/50 backdrop-blur-md text-white text-sm px-4 py-2 rounded-full border border-white/20 shadow-lg">
                            Încadrează codul QR în centru
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-semibold shadow-sm"
                    >
                        Anulează
                    </button>
                </div>
            </div>
        </div>
    );
}
