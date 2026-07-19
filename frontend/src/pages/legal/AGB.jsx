import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AGB() {
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
            Allgemeine Geschäftsbedingungen (AGB)
          </h1>

          <div className="prose prose-slate max-w-none text-slate-700 space-y-6">
            <p className="text-sm text-slate-500">
              Stand: [Data ultimei actualizări]
            </p>

            <h3 className="text-lg font-bold mt-8">§ 1 Geltungsbereich</h3>
            <p>
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen TRADE INVEST NETWORK S.R.L. (im Folgenden „Anbieter“) und dem Kunden, INTERVALLE GROUP SRL (CUI: 25289193, Reg. Com: J2009000266324, Hot. Fukuschdorf 1, Mediaș, Jud. Sibiu), über die Nutzung der Software-as-a-Service (SaaS)-Dienste des Anbieters. Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.
            </p>

            <h3 className="text-lg font-bold mt-8">§ 2 Vertragsgegenstand</h3>
            <p>
              Der Anbieter stellt dem Kunden die Software zur webbasierten Nutzung (SaaS) zur Verfügung. Die genauen Funktionen und Leistungen ergeben sich aus der jeweiligen Leistungsbeschreibung.
            </p>

            <h3 className="text-lg font-bold mt-8">§ 3 Nutzungsrechte</h3>
            <p>
              Der Anbieter räumt dem Kunden für die Dauer des Vertrags ein nicht-ausschließliches, nicht-übertragbares und nicht-unterlizenzierbares Recht ein, die Software bestimmungsgemäß zu nutzen.
            </p>

            <h3 className="text-lg font-bold mt-8">§ 4 Verfügbarkeit und Service Level</h3>
            <p>
              Der Anbieter bemüht sich um eine Verfügbarkeit der Software von 99% im Jahresdurchschnitt. Hiervon ausgenommen sind geplante Wartungsfenster sowie Ausfälle, die außerhalb des Einflussbereichs des Anbieters liegen (z. B. höhere Gewalt).
            </p>

            <h3 className="text-lg font-bold mt-8">§ 5 Haftungsbeschränkung</h3>
            <p>
              Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Für einfache Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). In diesem Fall ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Die Haftung für Datenverlust ist auf den Wiederherstellungsaufwand beschränkt, der bei regelmäßiger und gefahrentsprechender Anfertigung von Sicherungskopien eingetreten wäre.
            </p>

            <h3 className="text-lg font-bold mt-8">§ 6 Datenschutz und Datensicherheit</h3>
            <p>
              Die Parteien verpflichten sich zur Einhaltung der geltenden datenschutzrechtlichen Bestimmungen, insbesondere der DSGVO. Soweit der Anbieter personenbezogene Daten im Auftrag des Kunden verarbeitet, schließen die Parteien einen gesonderten Auftragsverarbeitungsvertrag (AVV) ab.
            </p>

            <p className="mt-8 text-sm italic text-slate-500">
              [Hinweis: Bitte lassen Sie diese AGB rechtlich prüfen. Dies ist nur ein Platzhalter.]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
