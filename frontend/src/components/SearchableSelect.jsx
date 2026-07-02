import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'

export default function SearchableSelect({ value, onChange, options, placeholder = "Selectează...", searchPlaceholder = "Caută...", className = "", hideSearch = false }) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState("")
    const wrapperRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    )

    const selectedOption = options.find(opt => opt.value === value)

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded-full text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer flex items-center justify-between"
            >
                <span className={`truncate ${!selectedOption ? 'text-slate-400' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-[250px] sm:w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden right-0 sm:right-auto">
                    {!hideSearch && (
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-2xl text-xs outline-none focus:border-blue-500 dark:text-slate-200"
                                />
                            </div>
                        </div>
                    )}
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        <div 
                            onClick={() => { onChange(""); setIsOpen(false); setSearch("") }}
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-slate-900 hover:text-white dark:hover:bg-slate-700 flex items-center gap-2 transition-colors ${value === "" ? "font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-700 dark:text-slate-300"}`}
                        >
                            <span className="flex-1">{placeholder}</span>
                            {value === "" && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400 text-center">Niciun rezultat</div>
                        ) : (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearch("") }}
                                    className={`px-3 py-2 text-xs cursor-pointer hover:bg-slate-900 hover:text-white dark:hover:bg-slate-700 flex items-center gap-2 transition-colors group ${value === opt.value ? "font-bold text-slate-900 bg-slate-100 dark:bg-slate-800" : "text-slate-700 dark:text-slate-300"}`}
                                >
                                    {opt.avatar && (
                                        <img 
                                            src={opt.avatar.startsWith('http') ? opt.avatar : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${opt.avatar}`} 
                                            alt="" 
                                            className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200" 
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    )}
                                    <span className="flex-1 truncate">
                                        {opt.label}
                                        {opt.subLabel && <span className="text-slate-400 group-hover:text-slate-300 font-normal ml-1 transition-colors">({opt.subLabel})</span>}
                                    </span>
                                    {value === opt.value && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
