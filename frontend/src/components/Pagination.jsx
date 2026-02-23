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
    pageSizeOptions = [10, 20, 50, 100]
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
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
            {/* Items info */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">
                    Afișare <span className="font-semibold text-slate-900">{startItem}</span> -{' '}
                    <span className="font-semibold text-slate-900">{endItem}</span> din{' '}
                    <span className="font-semibold text-slate-900">{totalItems}</span>
                </span>

                {/* Page size selector */}
                <div className="flex items-center gap-2">
                    <label htmlFor="pageSize" className="text-sm text-slate-600">
                        Rânduri:
                    </label>
                    <select
                        id="pageSize"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Pagina anterioară"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-3 py-2 text-slate-400">
                                ...
                            </span>
                        ) : (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                        ? 'bg-blue-500 text-white shadow-sm'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                {page}
                            </button>
                        )
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Pagina următoare"
                >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
            </div>
        </div>
    )
}
