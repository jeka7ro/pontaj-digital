import React, { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { Link } from "react-router-dom";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificăm dacă utilizatorul a setat deja preferința (TDDDG Compliance)
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setIsVisible(false);
    // Aici se inițializează trackere / analitice (ex: Google Analytics),
    // respectând faptul că NU s-au setat înainte de acceptul explicit.
  };

  const handleReject = () => {
    localStorage.setItem("cookie_consent", "rejected");
    setIsVisible(false);
    // Setările de bază continuă să funcționeze, dar fără tracking.
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-white border-t shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] sm:p-6">
      <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-4 items-start">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Ihre Privatsphäre ist uns wichtig
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Wir verwenden Cookies, um Ihnen das beste Nutzererlebnis zu bieten, den Datenverkehr zu analysieren und Inhalte zu personalisieren. Durch Klicken auf "Akzeptieren" stimmen Sie der Verwendung von Cookies gemäß unserer{" "}
              <Link to="/datenschutz" className="text-blue-600 hover:underline">
                Datenschutzerklärung
              </Link>
              {" "}zu.
            </p>
          </div>
        </div>
        {/* Conform TDDDG: Butoanele de Refuz și Accept trebuie să fie vizual echivalente ca greutate. */}
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button 
            className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            onClick={handleReject}
          >
            Ablehnen
          </button>
          <button 
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            onClick={handleAccept}
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
