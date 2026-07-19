import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Impressum() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Zurück
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-8">
            Impressum
          </h1>

          <div className="prose prose-slate max-w-none">
            <p className="text-sm text-slate-500 mb-8">
              Angaben gemäß § 5 TMG
            </p>

            <h3 className="text-lg font-bold mt-8 mb-4">Anbieter:</h3>
            <p>
              TRADE INVEST NETWORK S.R.L.<br />
              Str. Popa Savu, Nr. 78<br />
              Sector 1, 11434 București<br />
              Rumänien (România)
            </p>

            <h3 className="text-lg font-bold mt-8 mb-4">Vertreten durch (Reprezentat de):</h3>
            <p>Cazmal Eugeniu</p>

            <h3 className="text-lg font-bold mt-8 mb-4">Kontakt:</h3>
            <p>
              Telefon: +40 729 030 303<br />
              E-Mail: [Adresa de email, ex: office@tradeinvestnetwork.ro]
            </p>

            <h3 className="text-lg font-bold mt-8 mb-4">Umsatzsteuer-ID (CUI / VAT):</h3>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
              RO42322117 (Cod Unic de Înregistrare: 42322117)
            </p>

            <h3 className="text-lg font-bold mt-8 mb-4">Registereintrag:</h3>
            <p>
              Eintragung im Handelsregister.<br />
              Registergericht: Registrul Comerțului București<br />
              Registernummer: J40/2825/2020<br />
              EUID: ROONRC.J40/2825/2020
            </p>

            <h3 className="text-lg font-bold mt-8 mb-4">Streitschlichtung:</h3>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://ec.europa.eu/consumers/odr</a>.<br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.<br />
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>

            <h3 className="text-lg font-bold mt-8 mb-4">Haftung für Inhalte:</h3>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
