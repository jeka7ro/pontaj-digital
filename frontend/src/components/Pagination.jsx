import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination Component
 * Provides page navigation and page size selection
 */
export default function Pagination({
    currentPage,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 15, 25, 50, 9999]
}) {
    const totalPages = Math.ceil(totalItems / pageSize)
    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1)
        }
    }

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1)
        }
    }

    const getPageNumbers = () => {
        const pages = []
        const maxVisible = 5

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
            }
        }

        return pages
    }

    if (totalItems === 0) {
        return null
    }

    return (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wide">Afișează</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-full px-3 py-1 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>{size === 9999 ? 'Toți' : size}</option>
                        ))}
                    </select>
                </div>
                <span className="whitespace-nowrap">
                    &middot; Total înregistrări: {totalItems}
                </span>
            </div>
            <div className="flex items-center gap-4">
                <span>Pagina {currentPage} din {totalPages || 1}</span>
                <div className="flex gap-1">
                    <button
                        onClick={handlePrevious}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
