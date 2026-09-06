import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "./utils";
import { Button } from "./button";

export interface PaginationProps {
  /**
   * 0-indexed current page number (matches Spring Data Page)
   */
  currentPage: number;
  /**
   * Total number of available pages
   */
  totalPages: number;
  /**
   * Optional total elements across all pages
   */
  totalElements?: number;
  /**
   * Number of items displayed per page
   */
  pageSize: number;
  /**
   * Page size options available in dropdown. Defaults to [10, 20, 50, 100]
   */
  pageSizeOptions?: number[];
  /**
   * Callback fired when page index changes (0-indexed)
   */
  onPageChange: (newPage: number) => void;
  /**
   * Callback fired when page size changes
   */
  onPageSizeChange?: (newPageSize: number) => void;
  className?: string;
  showPageSizeSelector?: boolean;
  showTotalCount?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
  showPageSizeSelector = true,
  showTotalCount = true,
}) => {
  // Safe bounds
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(0, currentPage), safeTotalPages - 1);

  // Compute display range: e.g. "Showing 1 to 20 of 84 entries"
  const startItem = totalElements === 0 ? 0 : safeCurrentPage * pageSize + 1;
  const endItem =
    totalElements !== undefined
      ? Math.min(totalElements, (safeCurrentPage + 1) * pageSize)
      : (safeCurrentPage + 1) * pageSize;

  // Generate visible page numbers with smart ellipsis (1 ... 4 5 6 ... 12)
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i);
    }

    const pages: (number | "ellipsis")[] = [];
    const current = safeCurrentPage;

    // Always include page 0
    pages.push(0);

    if (current > 2) {
      pages.push("ellipsis");
    }

    const start = Math.max(1, current - 1);
    const end = Math.min(safeTotalPages - 2, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < safeTotalPages - 3) {
      pages.push("ellipsis");
    }

    // Always include last page
    pages.push(safeTotalPages - 1);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface-subtle text-xs text-text-secondary select-none",
        className
      )}
      aria-label="Table pagination"
    >
      {/* Left section: Total count and/or Page Size Selector */}
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
        {showTotalCount && (
          <span className="text-text-muted text-[11px] sm:text-xs">
            {totalElements !== undefined ? (
              <>
                Showing <span className="font-semibold text-text-primary">{startItem}</span> to{" "}
                <span className="font-semibold text-text-primary">{endItem}</span> of{" "}
                <span className="font-semibold text-text-primary">{totalElements}</span> entries
              </>
            ) : (
              <>
                Page <span className="font-semibold text-text-primary">{safeCurrentPage + 1}</span> of{" "}
                <span className="font-semibold text-text-primary">{safeTotalPages}</span>
              </>
            )}
          </span>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <label htmlFor="pagination-page-size" className="hidden sm:inline">
              Rows per page:
            </label>
            <select
              id="pagination-page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 rounded border border-border bg-surface text-text-primary text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right section: Pagination Navigation Buttons */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
        {/* First Page */}
        <Button
          variant="ghost"
          size="sm"
          disabled={safeCurrentPage === 0}
          onClick={() => onPageChange(0)}
          className="p-1.5 h-7 w-7 text-text-muted hover:text-text-primary disabled:opacity-40"
          title="First Page"
          aria-label="Go to first page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="ghost"
          size="sm"
          disabled={safeCurrentPage === 0}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className="p-1.5 h-7 w-7 text-text-muted hover:text-text-primary disabled:opacity-40"
          title="Previous Page"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Numbered Page Buttons */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-text-muted font-mono text-xs">
                  …
                </span>
              );
            }

            const isActive = p === safeCurrentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  "min-w-[28px] h-7 px-1.5 rounded text-xs font-mono font-medium transition-colors flex items-center justify-center",
                  isActive
                    ? "bg-primary text-primary-fg font-bold shadow-sm"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Page ${p + 1}`}
              >
                {p + 1}
              </button>
            );
          })}
        </div>

        {/* Mobile current page indicator */}
        <span className="sm:hidden text-xs font-mono text-text-secondary px-2">
          {safeCurrentPage + 1} / {safeTotalPages}
        </span>

        {/* Next Page */}
        <Button
          variant="ghost"
          size="sm"
          disabled={safeCurrentPage >= safeTotalPages - 1}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className="p-1.5 h-7 w-7 text-text-muted hover:text-text-primary disabled:opacity-40"
          title="Next Page"
          aria-label="Go to next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {/* Last Page */}
        <Button
          variant="ghost"
          size="sm"
          disabled={safeCurrentPage >= safeTotalPages - 1}
          onClick={() => onPageChange(safeTotalPages - 1)}
          className="p-1.5 h-7 w-7 text-text-muted hover:text-text-primary disabled:opacity-40"
          title="Last Page"
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
