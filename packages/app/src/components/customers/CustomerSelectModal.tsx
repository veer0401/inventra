import React, { useState, useEffect, useRef } from "react";
import { Search, User, Phone, Plus, X, Check, Loader2 } from "lucide-react";
import { customerApi } from "../../services/customerApi";
import { CustomerFormModal } from "./CustomerFormModal";
import type { CustomerSummaryResponse, CustomerResponse } from "@inventra/api-types";

export interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: { id: string; name: string; phone: string }) => void;
  selectedCustomerId?: string | null;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  selectedCustomerId,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSummaryResponse[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Autofocus search on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setIsLoading(true);
      customerApi
        .searchCustomers("")
        .then((res) => {
          setResults(res || []);
        })
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setIsLoading(true);
      customerApi
        .searchCustomers(query)
        .then((res) => {
          setResults(res || []);
          setSelectedIndex(0);
        })
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (query.trim()) {
        setShowCreateModal(true);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (customer: CustomerSummaryResponse) => {
    onSelectCustomer({
      id: customer.id,
      name: customer.fullName,
      phone: customer.phone,
    });
    onClose();
  };

  const handleCreated = (customer: CustomerResponse) => {
    onSelectCustomer({
      id: customer.id,
      name: customer.fullName,
      phone: customer.phone,
    });
    setShowCreateModal(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-16 sm:pt-24"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-select-title"
      >
        <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Search Input */}
          <div className="border-b border-border p-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search patient by mobile number, name, or code... (F4)"
                className="w-full rounded-lg border-0 bg-surface-subtle pl-10 pr-10 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 p-0.5 text-text-muted hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-xs text-text-muted">
              <span>Use ↑ ↓ to navigate, Enter to attach</span>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Quick Register Customer</span>
              </button>
            </div>
          </div>

          {/* Results List */}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-border/40">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-text-muted">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Searching directory...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((cust, idx) => {
                const isSelected = idx === selectedIndex;
                const isCurrent = selectedCustomerId === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => handleSelect(cust)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-fg"
                        : "hover:bg-surface-subtle text-text-primary"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {cust.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{cust.fullName}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase ${
                              isSelected ? "bg-white/20 text-white" : "bg-surface-subtle text-text-muted"
                            }`}
                          >
                            {cust.customerCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs opacity-80 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {cust.phone}
                          </span>
                          {cust.email && <span className="truncate">{cust.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrent && (
                        <span
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            isSelected ? "bg-white/20 text-white" : "bg-success-subtle text-success-fg"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Attached
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center px-4">
                <User className="h-8 w-8 mx-auto text-text-muted opacity-40 mb-2" />
                <p className="text-sm font-medium text-text-primary">No customers found</p>
                <p className="text-xs text-text-muted mt-1">
                  {query ? `No patient matches "${query}"` : "Customer directory is empty"}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-fg hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Register "{query || "New Customer"}"
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-surface-subtle/50 px-4 py-2 flex items-center justify-between text-xs text-text-muted">
            <span>Esc to cancel</span>
            <button
              type="button"
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Quick Create Modal */}
      {showCreateModal && (
        <CustomerFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreated}
        />
      )}
    </>
  );
};
