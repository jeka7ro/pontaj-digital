import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Datenschutz() {
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
            Datenschutzerklärung
          </h1>

          <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
            <p>
              In dieser Datenschutzerklärung informieren wir Sie über die Verarbeitung personenbezogener Daten bei der Nutzung unserer Anwendung. Wir verarbeiten Ihre Daten unter Beachtung der geltenden Datenschutzvorschriften, insbesondere der EU-Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG).
            </p>

            <h3 className="text-lg font-bold mt-8">1. Verantwortlicher</h3>
            <p>
              TRADE INVEST NETWORK S.R.L.<br />
              Str. Popa Savu, Nr. 78, Sector 1, 11434 București, Rumänien<br />
              E-Mail: [Adresa de email, ex: office@tradeinvestnetwork.ro]
            </p>

            <h3 className="text-lg font-bold mt-8">2. Erhebung und Speicherung personenbezogener Daten</h3>
            <p>
              Wenn Sie unsere Anwendung nutzen, erheben und verarbeiten wir folgende Daten:
            </p>
            <ul className="list-disc pl-5">
              <li>Stammdaten (z. B. Name, Adresse, E-Mail, Telefonnummer)</li>
              <li>Standortdaten (z. B. GPS-Koordinaten bei Check-in/Check-out)</li>
              <li>Gerätedaten (z. B. IP-Adresse, Browsertyp, Betriebssystem)</li>
              <li>Log-Daten und Nutzungsverhalten</li>
            </ul>

            <h3 className="text-lg font-bold mt-8">3. Zwecke der Datenverarbeitung</h3>
            <p>
              Die Verarbeitung Ihrer Daten erfolgt zu folgenden Zwecken:
            </p>
            <ul className="list-disc pl-5">
              <li>Zur Bereitstellung und Funktion unserer Software</li>
              <li>Zur Verwaltung der Benutzerkonten und Authentifizierung</li>
              <li>Zur Erfassung von Arbeitszeiten und Standorten (soweit beauftragt)</li>
              <li>Zur Sicherstellung der IT-Sicherheit und Fehlerbehebung</li>
            </ul>

            <h3 className="text-lg font-bold mt-8">4. Rechtsgrundlagen</h3>
            <p>
              Wir verarbeiten Ihre Daten auf folgenden rechtlichen Grundlagen:
            </p>
            <ul className="list-disc pl-5">
              <li>Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, z. B. für Cookies)</li>
              <li>Wahrung unserer berechtigten Interessen (Art. 6 Abs. 1 lit. f DSGVO)</li>
            </ul>

            <h3 className="text-lg font-bold mt-8">5. Cookies und Tracking (TDDDG)</h3>
            <p>
              Unsere Anwendung verwendet Cookies. Essenzielle Cookies sind für den technischen Betrieb erforderlich. Nicht-essenzielle Cookies (z. B. für Analysezwecke) werden nur gesetzt, wenn Sie im Cookie-Banner ausdrücklich zustimmen (§ 25 Abs. 1 TDDDG).
            </p>

            <h3 className="text-lg font-bold mt-8">6. Ihre Rechte</h3>
            <p>
              Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch (Art. 21 DSGVO).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
