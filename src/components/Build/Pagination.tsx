import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
            <button onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
            >
                <ChevronLeft size={20} />
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => onPageChange(page)}
                    className={page === currentPage ? 'active' : ''}
                >
                    {page}
                </button>
            ))}
            
            <button onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === pageCount}
                aria-label="Next page"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};