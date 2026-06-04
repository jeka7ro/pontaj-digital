import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * DataTable — macOS Tahoe style, reusable
 *
 * Props:
 *   columns: [{ key, label, sortable?, render?(row, rowIndex) }]
 *   data: array of row objects
 *   loading?: boolean
 *   defaultPageSize?: number
 *   emptyText?: string
 */
export default function DataTable({
    columns = [],
    data = [],
    loading = false,
    defaultPageSize = 25,
    emptyText,
    searchable = false,
    searchPlaceholder = 'Caută...',
    rowStyle,
    rowClassName,
    onRowClick
}) {
    const { t } = useTranslation()
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(defaultPageSize)
    const [sortKey, setSortKey] = useState(null)
    const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc'
    const [searchTerm, setSearchTerm] = useState('')

    // 1. Filter
    const filtered = useMemo(() => {
        if (!searchTerm) return data
        const lower = searchTerm.toLowerCase()
        return data.filter(row => 
            Object.values(row).some(val => 
                val != null && String(val).toLowerCase().includes(lower)
            )
        )
    }, [data, searchTerm])

    // 2. Sort
    const sorted = useMemo(() => {
        if (!sortKey) return filtered
        return [...filtered].sort((a, b) => {
            const av = a[sortKey] ?? ''
            const bv = b[sortKey] ?? ''
            if (av === bv) return 0
            const cmp = av < bv ? -1 : 1
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [filtered, sortKey, sortDir])

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
    const safePage = Math.min(page, totalPages)
    const from = (safePage - 1) * pageSize
    const slice = sorted.slice(from, from + pageSize)

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
        setPage(1)
    }

    const handlePageSize = (e) => {
        setPageSize(Number(e.target.value))
        setPage(1)
    }

    const SortIcon = ({ col }) => {
        if (!col.sortable) return null
        if (sortKey !== col.key) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
        return sortDir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-blue-500 ml-1" />
            : <ChevronDown className="w-3.5 h-3.5 text-blue-500 ml-1" />
    }

    return (
        <div className="flex flex-col min-h-0">
            {/* Toolbar (Search) */}
            {searchable && (
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
                        />
                        {searchTerm && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-600 px-2 py-1 rounded-full shadow-sm">
                                <span className="text-[10px] font-bold text-white">
                                    {filtered.length}/{data.length}
                                </span>
                                <button
                                    onClick={() => { setSearchTerm(''); setPage(1); }}
                                    className="p-0.5 hover:bg-blue-700 rounded-full transition-colors ml-0.5 text-white"
                                    title={t('common.clear')}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-y border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                        <tr>
                            {/* Row number column */}
                            <th className="px-6 py-4 text-center w-16 select-none">
                                {t('common.row_number')}
                            </th>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={[
                                        'px-6 py-4 text-left whitespace-nowrap select-none',
                                        col.sortable ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''
                                    ].join(' ')}
                                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                                >
                                    <span className="inline-flex items-center">
                                        {col.label}
                                        <SortIcon col={col} />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-6 py-10 text-center text-sm text-slate-400">
                                    {t('common.loading')}
                                </td>
                            </tr>
                        ) : slice.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-6 py-10 text-center text-sm text-slate-400">
                                    {emptyText || t('common.no_data')}
                                </td>
                            </tr>
                        ) : (
                            slice.map((row, idx) => (
                                <tr
                                    key={row.id ?? idx}
                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`}
                                    style={rowStyle ? rowStyle(row) : undefined}
                                    onClick={onRowClick ? (e) => {
                                        // Nu naviga daca s-a dat click pe un buton/link/input din rand
                                        if (e.target.closest('button,a,input,select,textarea')) return
                                        onRowClick(row)
                                    } : undefined}
                                >
                                    <td className="px-6 py-4 text-center text-slate-500 font-medium tabular-nums">
                                        {from + idx + 1}
                                    </td>
                                    {columns.map(col => (
                                        <td key={col.key} className="px-6 py-4 align-middle text-slate-900 dark:text-white font-medium">
                                            {col.render ? col.render(row, from + idx) : (row[col.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wide">Afișează</span>
                    <select
                        value={pageSize}
                        onChange={handlePageSize}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-full px-3 py-1 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {PAGE_SIZE_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-4">
                    <span>Pagina {safePage} din {totalPages || 1}</span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages || totalPages === 0}
                            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
