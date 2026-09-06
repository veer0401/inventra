import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Search,
  Plus,
  Check,
  ArrowLeft,
  Pill,
  ShieldAlert,
  SlidersHorizontal,
  Package,
  BookOpen,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Pagination,
  EmptyState,
  Alert,
  useToast,
  Spinner,
} from "@inventra/ui";
import { GlobalMedicineHelpModal } from "../../components/catalog/GlobalMedicineHelpModal";
import {
  globalMedicineApi,
  type GlobalMedicineResponse,
} from "../../services/globalMedicineApi";
import { useAuthStore } from "../../stores/authStore";
import type { DosageForm } from "@inventra/api-types";

const DOSAGE_FILTER_OPTIONS: { label: string; value: DosageForm | "ALL" }[] = [
  { label: "All Forms", value: "ALL" },
  { label: "Tablets", value: "TABLET" },
  { label: "Capsules", value: "CAPSULE" },
  { label: "Syrups", value: "SYRUP" },
  { label: "Injections", value: "INJECTION" },
  { label: "Ointments", value: "OINTMENT" },
  { label: "Drops", value: "DROPS" },
  { label: "Powders", value: "POWDER" },
  { label: "Devices", value: "DEVICE" },
];

export const GlobalMedicinesDirectoryPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const canManage = ["OWNER", "MANAGER", "PHARMACIST"].includes(
    activeContext?.role || ""
  );

  // URL state synchronization
  const initialQuery = searchParams.get("q") || "";
  const initialPage = parseInt(searchParams.get("page") || "0", 10);
  const initialForm = (searchParams.get("form") as DosageForm | "ALL") || "ALL";
  const initialRxOnly = searchParams.get("rx") === "true";

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedForm, setSelectedForm] = useState<DosageForm | "ALL">(initialForm);
  const [rxOnly, setRxOnly] = useState(initialRxOnly);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(20);

  // Set of medicines added during this session
  const [sessionAddedIds, setSessionAddedIds] = useState<Set<string>>(new Set());
  // Set of medicine IDs currently being imported
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());

  // Debounce search query input (250ms for snappy retrieval)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(0);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync state to URL search parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if (page > 0) params.set("page", page.toString());
    if (selectedForm !== "ALL") params.set("form", selectedForm);
    if (rxOnly) params.set("rx", "true");
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, page, selectedForm, rxOnly, setSearchParams]);

  // Query: Fetch global medicines with fast retrieval
  const {
    data: pageData,
    isLoading: isCatalogLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["global-medicines-directory", debouncedQuery, page, pageSize],
    queryFn: () =>
      globalMedicineApi.searchGlobalMedicines(debouncedQuery.trim(), page, pageSize),
    staleTime: 30000,
  });

  // Query: Fetch set of global medicine IDs that this business already imported
  const { data: importedIdsList = [] } = useQuery({
    queryKey: ["catalog-imported-global-ids", businessId],
    queryFn: globalMedicineApi.getImportedGlobalMedicineIds,
    enabled: Boolean(businessId),
    staleTime: 60000,
  });

  const importedIdsSet = useMemo(() => {
    const set = new Set<string>(importedIdsList.map((id) => String(id)));
    sessionAddedIds.forEach((id) => set.add(id));
    return set;
  }, [importedIdsList, sessionAddedIds]);

  // Filter client-side for dosage form and Rx Only if specified
  const filteredMedicines = useMemo(() => {
    const items = pageData?.content || [];
    return items.filter((med) => {
      if (selectedForm !== "ALL" && med.dosageForm !== selectedForm) {
        return false;
      }
      if (rxOnly && !med.prescriptionRequired) {
        return false;
      }
      return true;
    });
  }, [pageData?.content, selectedForm, rxOnly]);

  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 0;

  // 1-Click Automatic Store Add Handler (NO modal, NO popup)
  const handleQuickAdd = async (med: GlobalMedicineResponse) => {
    if (!canManage) {
      toast.error("You do not have permission to add products to this store.");
      return;
    }

    setImportingIds((prev) => new Set(prev).add(med.id));
    try {
      await globalMedicineApi.quickImportToStore(med.id);
      setSessionAddedIds((prev) => new Set(prev).add(med.id));
      queryClient.invalidateQueries({ queryKey: ["catalog-imported-global-ids", businessId] });
      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
      toast.success(`"${med.name}" added to your store catalog with default formulation!`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : `Failed to add "${med.name}" to store.`
      );
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(med.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Top Banner & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-lg border border-subtle shadow-card">
        <div className="flex items-start gap-3">
          <Link to="/catalog">
            <Button
              variant="outline"
              size="sm"
              className="mt-0.5 px-2.5"
              title="Back to Store Catalog"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Global Medicine Directory
              </h1>
              <span className="text-xs font-mono text-primary bg-primary-subtle px-2 py-0.5 rounded border border-primary-border">
                {totalElements} VERIFIED FORMULATIONS
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Browse standard pharmaceutical formulations and generic salts. Click{" "}
              <strong className="text-primary">Add to Store</strong> to automatically add any
              medicine to <strong className="text-primary">{activeContext?.businessName}</strong>{" "}
              without manual data entry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <GlobalMedicineHelpModal />
          <Link to="/catalog/global/guide">
            <Button variant="outline" size="sm" leftIcon={<BookOpen className="h-4 w-4 text-primary" />}>
              Guide
            </Button>
          </Link>
          <Link to="/catalog/products/new">
            <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Custom Product
            </Button>
          </Link>
          <Link to="/catalog">
            <Button variant="primary" size="sm" leftIcon={<Package className="h-4 w-4" />}>
              Store Catalog
            </Button>
          </Link>
        </div>
      </div>

      {/* Fast Search & Instant Filter Bar */}
      <div className="space-y-3 bg-surface p-4 rounded-lg border border-subtle shadow-card">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              placeholder="Instant search by brand name, generic salt, formulation, manufacturer, barcode..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-8 text-xs h-9"
              autoFocus
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary text-xs font-semibold px-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setRxOnly(!rxOnly);
                setPage(0);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                rxOnly
                  ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                  : "bg-surface-subtle text-secondary border-subtle hover:bg-subtle"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Rx Only
            </button>

            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Spinner size="sm" />
                <span>Searching...</span>
              </div>
            )}
          </div>
        </div>

        {/* Dosage Form Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
          <span className="text-2xs uppercase tracking-wider text-muted font-medium mr-1 flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="h-3 w-3" /> Form:
          </span>
          {DOSAGE_FILTER_OPTIONS.map((opt) => {
            const isSelected = selectedForm === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedForm(opt.value);
                  setPage(0);
                }}
                className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-surface-subtle text-secondary hover:bg-subtle hover:text-primary border border-subtle"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Query Error Alert */}
      {error && (
        <Alert variant="danger" title="Failed to load global medicines">
          {error instanceof Error ? error.message : "An unexpected server error occurred."}
        </Alert>
      )}

      {/* Directory Table */}
      <Card className="shadow-card border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle border-b border-subtle text-secondary font-medium uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Medicine & Strength</th>
                <th className="py-3 px-4">Generic Salt</th>
                <th className="py-3 px-4">Brand / Manufacturer</th>
                <th className="py-3 px-4">Dosage & Packaging</th>
                <th className="py-3 px-4">GST / HSN</th>
                <th className="py-3 px-4 text-right">Store Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {isCatalogLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Spinner size="md" />
                      <span>Loading global medicine directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    <EmptyState
                      icon={<Pill className="h-8 w-8 text-primary" />}
                      title="No medicines found"
                      description={
                        debouncedQuery
                          ? `No verified medicines match "${debouncedQuery}". You can create a custom product.`
                          : "No global medicines available in this category."
                      }
                      action={
                        <Link to="/catalog/products/new">
                          <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                            Add Custom Medicine
                          </Button>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((med) => {
                  const isImported = importedIdsSet.has(med.id);
                  const isImporting = importingIds.has(med.id);

                  return (
                    <tr key={med.id} className="hover:bg-surface-subtle transition-colors group">
                      {/* Medicine & Strength */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-primary text-sm flex items-center gap-1.5">
                          {med.name}
                          {med.prescriptionRequired && (
                            <span
                              className="px-1.5 py-0.2 rounded text-2xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              title="Prescription Required (Schedule Drug)"
                            >
                              Rx
                            </span>
                          )}
                        </div>
                        <div className="text-2xs text-secondary mt-0.5 flex items-center gap-2">
                          {med.strength && (
                            <span className="font-medium text-primary bg-subtle px-1.5 py-0.5 rounded">
                              {med.strength}
                            </span>
                          )}
                          {med.barcode && (
                            <span className="font-mono text-muted">
                              Barcode: {med.barcode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Generic Salt */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-primary">
                          {med.genericName || "—"}
                        </div>
                        {med.categoryName && (
                          <div className="text-2xs text-muted mt-0.5">
                            {med.categoryName}
                          </div>
                        )}
                      </td>

                      {/* Brand & Manufacturer */}
                      <td className="py-3 px-4">
                        <div className="text-primary font-medium">
                          {med.brandName || "—"}
                        </div>
                        <div className="text-2xs text-secondary mt-0.5">
                          {med.manufacturer || "Generic Formulation"}
                        </div>
                      </td>

                      {/* Dosage & Packaging */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-2xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {med.dosageForm}
                          </span>
                        </div>
                        <div className="text-2xs text-secondary mt-1">
                          {med.sellingUnit ? (
                            <span>
                              {med.sellingUnit} ({med.unitsPerSellingUnit} {med.baseUnit}
                              {med.unitsPerSellingUnit > 1 ? "s" : ""})
                            </span>
                          ) : (
                            <span>Base: {med.baseUnit}</span>
                          )}
                        </div>
                      </td>

                      {/* GST / HSN */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-primary">
                          {med.taxRate}% GST
                        </div>
                        <div className="text-2xs font-mono text-muted">
                          HSN: {med.hsnCode || "3004"}
                        </div>
                      </td>

                      {/* 1-Click Action */}
                      <td className="py-3 px-4 text-right">
                        {isImported ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <Check className="h-3.5 w-3.5" />
                            In Store
                          </span>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={isImporting}
                            disabled={!canManage || isImporting}
                            onClick={() => handleQuickAdd(med)}
                            leftIcon={!isImporting ? <Plus className="h-3.5 w-3.5" /> : undefined}
                            className="text-xs h-8 whitespace-nowrap shadow-xs"
                          >
                            Add to Store
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Server Pagination */}
      {totalElements > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
        />
      )}
    </div>
  );
};
