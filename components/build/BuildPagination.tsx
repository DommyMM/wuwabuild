'use client';

import React from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PAGE_INDICATOR_CLASS, PAGE_SKIP, PAGINATION_BUTTON_CLASS } from './buildConstants';

interface BuildPaginationProps {
  page: number;
  pageCount: number;
  statusText: string;
  onPageChange: (page: number) => void;
}

export const BuildPagination: React.FC<BuildPaginationProps> = ({ page, pageCount, statusText, onPageChange }) => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-start">
    <div />
    <div className="justify-self-center flex items-start gap-2 text-text-primary/75 my-2">
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1} className={PAGINATION_BUTTON_CLASS}>
          <ChevronFirst className="h-4 w-4" />
        </button>
        <span className="text-xs leading-none">first</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => onPageChange(Math.max(1, page - PAGE_SKIP))} disabled={page <= 1} className={PAGINATION_BUTTON_CLASS}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <span className="text-xs leading-none">skip</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className={PAGINATION_BUTTON_CLASS}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs leading-none">back</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className={PAGE_INDICATOR_CLASS}>{page}</span>
        <span className="text-xs leading-none">page</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount} className={PAGINATION_BUTTON_CLASS}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="text-xs leading-none">next</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => onPageChange(Math.min(pageCount, page + PAGE_SKIP))} disabled={page >= pageCount} className={PAGINATION_BUTTON_CLASS}>
          <ChevronsRight className="h-4 w-4" />
        </button>
        <span className="text-xs leading-none">skip</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => onPageChange(pageCount)} disabled={page >= pageCount} className={PAGINATION_BUTTON_CLASS}>
          <ChevronLast className="h-4 w-4" />
        </button>
        <span className="text-xs leading-none">last</span>
      </div>
    </div>
    <div className="min-w-35 justify-self-end self-start text-right text-xs text-text-primary/60">
      {statusText}
    </div>
  </div>
);
