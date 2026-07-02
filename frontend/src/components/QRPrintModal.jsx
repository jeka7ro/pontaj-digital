import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRPrintModal({ isOpen, onClose, item }) {
    if (!isOpen || !item) return null;

    const qrValue = `pontaj-item:${item.id}`;

    const handlePrint = () => {
        const printContent = document.getElementById('qr-print-area').innerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // Quick reset after print
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">Generează QR</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 focus:outline-none"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 flex flex-col items-center">
                    <div id="qr-print-area" className="flex flex-col items-center justify-center p-4 bg-white">
                        <QRCodeSVG 
                            value={qrValue} 
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                        <div className="mt-4 text-center">
                            <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {item.inventory_code || item.model || item.category}
                            </p>
                        </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-6 text-center">
                        Acest cod poate fi printat pe etichete și lipit pe produs.
                    </p>
                </div>

                <div className="p-4 border-t bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-2xl hover:bg-gray-300 transition-colors font-medium"
                    >
                        Închide
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Printează
                    </button>
                </div>
            </div>
        </div>
    );
}
