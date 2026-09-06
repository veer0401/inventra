import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Globe, Pill, Check, Loader2, Info } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  EmptyState,
} from "@inventra/ui";
import { globalMedicineApi, type GlobalMedicineResponse } from "../../services/globalMedicineApi";

export interface GlobalMedicineSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (medicine: GlobalMedicineResponse) => void;
}

export const GlobalMedicineSelectModal: React.FC<GlobalMedicineSelectModalProps> = ({
  open,
  onOpenChange,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["global-medicines", debouncedSearch],
    queryFn: () => globalMedicineApi.searchGlobalMedicines(debouncedSearch.trim(), 0, 50),
    enabled: open,
  });

  const medicines = data?.content || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary-subtle text-primary border border-primary-border">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Global Medicine Database</DialogTitle>
            <DialogDescription>
              Select an official drug formulation to auto-populate master attributes. Your store pricing remains independent.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by brand name, active salt (e.g. Paracetamol), or manufacturer..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-subtle text-xs text-secondary border border-subtle">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>
            Global medicines contain generic formulation standards, HSN codes, and tax slabs. When imported, you set your own store purchase and retail selling rates.
          </span>
        </div>

        {/* Results List */}
        <div className="border border-subtle rounded-lg max-h-[380px] overflow-y-auto divide-y divide-subtle">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Searching global repository...</span>
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-xs text-danger">
              Failed to load global medicines. Please try again.
            </div>
          ) : medicines.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<Pill className="h-8 w-8 text-muted" />}
                title="No medicines found"
                description={
                  debouncedSearch
                    ? `No matches for "${debouncedSearch}". You can enter custom details in the form, and our admins will verify it for the global catalog.`
                    : "Start typing to search global master medicines."
                }
              />
            </div>
          ) : (
            medicines.map((med) => (
              <div
                key={med.id}
                className="p-3.5 flex items-center justify-between hover:bg-surface-hover transition-colors gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-primary">{med.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary-subtle text-primary border border-primary-border font-medium">
                      {med.dosageForm}
                    </span>
                    {med.strength && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface border border-subtle text-secondary font-mono">
                        {med.strength}
                      </span>
                    )}
                    {med.prescriptionRequired && (
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
                        Rx Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-secondary">
                    <span>
                      <strong className="text-muted font-normal">Generic:</strong> {med.genericName}
                    </span>
                    {med.manufacturer && (
                      <span>
                        <strong className="text-muted font-normal">Mfr:</strong> {med.manufacturer}
                      </span>
                    )}
                    <span>
                      <strong className="text-muted font-normal">Pack:</strong> {med.sellingUnit} ({med.unitsPerSellingUnit} {med.baseUnit}s)
                    </span>
                    <span>
                      <strong className="text-muted font-normal">GST:</strong> {med.taxRate}%
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onSelect(med);
                    onOpenChange(false);
                  }}
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Select & Autofill
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
