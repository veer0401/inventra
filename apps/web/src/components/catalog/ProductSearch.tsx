import React, { useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";

export interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  value,
  onChange,
  isLoading = false,
  placeholder = "Search products by name, generic, brand, barcode, SKU... (Press / to focus)",
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut '/' to focus search input if not in an editable element
      if (
        e.key === "/" &&
        document.activeElement !== inputRef.current &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Shortcut 'Esc' to clear search if input is focused
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        if (value) {
          onChange("");
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, onChange]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 h-4 w-4 text-muted pointer-events-none" />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search catalog products"
        className="w-full pl-9 pr-16 py-2 bg-surface border border-strong rounded-md text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-focus transition-all font-sans shadow-xs"
      />

      <div className="absolute right-2.5 flex items-center gap-1.5">
        {isLoading && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />}

        {value && !isLoading && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="p-0.5 rounded text-muted hover:text-primary hover:bg-surface-muted transition-colors"
            title="Clear search (Esc)"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-muted bg-surface-muted border border-subtle rounded shadow-xs">
          /
        </kbd>
      </div>
    </div>
  );
};
