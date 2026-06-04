## 🎨 Reguli UI — Design System Modern

### **Culori principale**
- **Primar:** `blue-600` (`#2563EB`) — butoane principale, header, accente
- **Hover:** `blue-700`
- **Background pagină:** `slate-50` (light) / `slate-900` (dark)
- **Background card:** `white` / `slate-900`
- **Text principal:** `slate-900` / `white`
- **Text secundar:** `slate-500` / `slate-400`
- **Border:** `slate-200` / `slate-700`

### **Tipografie**
- Font: sistem default (Inter unde e disponibil)
- Titluri pagină: `text-xl font-bold`
- Label câmpuri: `text-xs font-bold uppercase tracking-wider text-slate-500`
- Text tabel: `text-sm`

### **Butoane**
- Primar: `px-5 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all`
- Secundar: `px-5 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors`
- Pericol: `px-5 h-10 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold`
- Icon: `w-8 h-8 rounded-full border border-slate-200 hover:bg-blue-50 hover:text-blue-600 transition-colors`

### **Carduri / Containere**
`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden`

### **Input-uri**
`w-full px-4 h-10 text-sm rounded-full border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white outline-none transition-all shadow-sm`
- Search input: același + iconiță `Search` la stânga cu `pl-10`

### **Tabele**
- Header: `bg-white text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider`
- Rând: `hover:bg-slate-50 transition-colors group`
- Separator rânduri: `divide-y divide-slate-100`

### **Modals**
- Overlay: `fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4`
- Container: `bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden`
- Header modal: `px-6 py-5 border-b border-slate-100`
- Body modal: `p-6 space-y-4`

### **Badge-uri / Chips**
- Albastru: `px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-600 border border-blue-200`
- Roșu: `px-3 py-1 rounded-full text-sm font-bold bg-rose-50 text-rose-600 border border-rose-200`
- Verde: `px-3 py-1 rounded-full text-sm font-bold bg-emerald-50 text-emerald-600 border border-emerald-200`

### **Spacing / Layout**
- Padding pagină: `p-4 md:p-8 max-w-7xl mx-auto`
- Gap între elemente header: `gap-4`
- Gap butoane: `gap-2` sau `gap-3`

### **Iconițe**
- Librărie: **Lucide React**
- Dimensiune standard: `w-4 h-4` (în butoane), `w-5 h-5` (standalone), `w-6 h-6` (header)

### **Toast / Notificări**
- Success: verde
- Error: roșu
- Se afișează sus în colț, dispar automat după ~3s

### **Reguli generale**
1. **Rounded-full** pentru butoane și input-uri, **rounded-2xl** pentru carduri
2. **Transition-all** sau **transition-colors** pe orice element interactiv
3. **Dark mode** pe toate componentele admin (clasa `dark:` pe fiecare element)
4. **Shadow-sm** pe carduri, **shadow-2xl** pe modals
5. Stările loading: `<Loader2 className="animate-spin" />`
