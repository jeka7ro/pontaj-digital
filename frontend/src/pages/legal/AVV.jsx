import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AVV() {
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
            Auftragsverarbeitungsvertrag (AVV)
          </h1>

          <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
            <p className="text-sm text-slate-500 mb-8">
              Gemäß Art. 28 DSGVO.
            </p>

            <p>
              Dieser Vertrag zur Auftragsverarbeitung (AVV) konkretisiert die datenschutzrechtlichen Verpflichtungen der Vertragsparteien, die sich aus der Nutzung der Software ergeben.
            </p>

            <h3 className="text-lg font-bold mt-8">1. Gegenstand und Dauer des Auftrags</h3>
            <p>
              Der Auftragnehmer (TRADE INVEST NETWORK S.R.L.) verarbeitet personenbezogene Daten im Auftrag des Auftraggebers (INTERVALLE GROUP SRL, CUI: 25289193, Reg. Com: J2009000266324, Hot. Fukuschdorf 1, Mediaș, Jud. Sibiu). Gegenstand, Art und Zweck der Verarbeitung ergeben sich aus dem Hauptvertrag. Die Dauer dieses AVV richtet sich nach der Laufzeit des Hauptvertrags.
            </p>

            <h3 className="text-lg font-bold mt-8">2. Art der Daten und Kreis der Betroffenen</h3>
            <p>
              Art der personenbezogenen Daten:
            </p>
            <ul className="list-disc pl-5">
              <li>Personenstammdaten</li>
              <li>Kommunikationsdaten</li>
              <li>Standortdaten (z. B. GPS)</li>
              <li>Arbeitszeitdaten (z. B. Check-in/Check-out)</li>
              <li>Biometrische Daten (z. B. Gesichtsscans, falls aktiviert)</li>
            </ul>
            <p>
              Kategorien betroffener Personen:
            </p>
            <ul className="list-disc pl-5">
              <li>Mitarbeiter des Auftraggebers</li>
            </ul>

            <h3 className="text-lg font-bold mt-8">3. Technische und organisatorische Maßnahmen (TOMs)</h3>
            <p>
              Der Auftragnehmer hat angemessene technische und organisatorische Maßnahmen zur Datensicherheit (gemäß Art. 32 DSGVO) getroffen, insbesondere zur Sicherstellung der Vertraulichkeit, Integrität und Verfügbarkeit der Daten. Diese Maßnahmen können im Kundenkonto oder auf Anfrage eingesehen werden.
            </p>

            <h3 className="text-lg font-bold mt-8">4. Unterauftragsverhältnisse</h3>
            <p>
              Die Beauftragung von Unterauftragnehmern (Subdienstleistern) ist nur mit vorheriger Zustimmung des Auftraggebers zulässig. Aktuell eingesetzte Unterauftragnehmer (z. B. Hosting-Provider) gelten als genehmigt.
            </p>

            <h3 className="text-lg font-bold mt-8">5. Rechte des Auftraggebers</h3>
            <p>
              Der Auftraggeber ist im Rahmen dieses Vertrages für die Einhaltung der gesetzlichen Bestimmungen der DSGVO verantwortlich. Der Auftragnehmer unterstützt den Auftraggeber bei der Erfüllung von Anfragen betroffener Personen (Art. 15 bis 22 DSGVO).
            </p>

            <p className="mt-8 text-sm italic text-slate-500">
              [Hinweis: Bitte lassen Sie diesen AVV von einem Rechtsanwalt prüfen. Dies ist nur ein Platzhalter und muss oft physisch oder elektronisch von beiden Seiten unterzeichnet werden.]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
