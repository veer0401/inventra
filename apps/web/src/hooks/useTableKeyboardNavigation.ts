import { useState, useEffect, useCallback } from "react";
import { isInputElement } from "./useKeyboardShortcuts";

export interface UseTableKeyboardNavigationOptions<T> {
  items: T[];
  onOpenRow?: (item: T, index: number) => void;
  onEditRow?: (item: T, index: number) => void;
  onSelectRow?: (item: T, index: number) => void;
  enabled?: boolean;
}

export function useTableKeyboardNavigation<T>({
  items,
  onOpenRow,
  onEditRow,
  onSelectRow,
  enabled = true,
}: UseTableKeyboardNavigationOptions<T>) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const resetFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  useEffect(() => {
    if (!enabled || items.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElement(e.target)) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev + 1;
          return next >= items.length ? 0 : next;
        });
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? items.length - 1 : next;
        });
      } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault();
        onOpenRow?.(items[focusedIndex], focusedIndex);
      } else if (e.key === " " && focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault();
        onSelectRow?.(items[focusedIndex], focusedIndex);
      } else if ((e.key === "e" || e.key === "E") && focusedIndex >= 0 && focusedIndex < items.length) {
        e.preventDefault();
        onEditRow?.(items[focusedIndex], focusedIndex);
      } else if (e.key === "Escape") {
        setFocusedIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [items, focusedIndex, onOpenRow, onEditRow, onSelectRow, enabled]);

  return {
    focusedIndex,
    setFocusedIndex,
    resetFocus,
  };
}
