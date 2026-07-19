import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Pontaj Digital. Alle Rechte vorbehalten.
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/impressum" className="hover:text-blue-600 transition-colors">
              Impressum
            </Link>
            <Link to="/datenschutz" className="hover:text-blue-600 transition-colors">
              Datenschutz
            </Link>
            <Link to="/agb" className="hover:text-blue-600 transition-colors">
              AGB
            </Link>
            <Link to="/avv" className="hover:text-blue-600 transition-colors">
              AVV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
