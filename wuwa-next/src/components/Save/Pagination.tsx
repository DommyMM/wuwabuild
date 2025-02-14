import React from 'react';
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    pageCount: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    pageCount,
    onPageChange
}) => {
    if (pageCount <= 1) return null;

    return (
        <div className="pagination">
            <button onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                aria-label="First page"
            >
                <ChevronFirst size={20} />
            </button>
            <button onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
            >
                <ChevronLeft size={20} />
            </button>
            <span className="current-page">{currentPage}</span>
            <button onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === pageCount}
                aria-label="Next page"
            >
                <ChevronRight size={20} />
            </button>
            <button onClick={() => onPageChange(pageCount)}
                disabled={currentPage === pageCount}
                aria-label="Last page"
            >
                <ChevronLast size={20} />
            </button>
        </div>
    );
};