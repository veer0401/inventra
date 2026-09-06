import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Plus,
  Search,
  Check,
  X,
  Pill,
  Building2,
  Edit2,
  Sparkles,
  Upload,
  Download,
  FileText,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { GlobalMedicineHelpModal } from "../../components/catalog/GlobalMedicineHelpModal";
import {
  Card,
  Button,
  Input,
  Select,
  FormField,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  EmptyState,
  Pagination,
  useToast,
} from "@inventra/ui";
import {
  globalMedicineApi,
  type GlobalMedicineResponse,
  type GlobalMedicineSuggestionResponse,
  type GlobalMedicineStatus,
  type SuggestionStatus,
  type CreateGlobalMedicineRequest,
  type GlobalMedicineCsvImportResult,
} from "../../services/globalMedicineApi";
import type { DosageForm } from "@inventra/api-types";

const DOSAGE_FORMS: DosageForm[] = [
  "TABLET",
  "CAPSULE",
  "SYRUP",
  "INJECTION",
  "OINTMENT",
  "DROPS",
  "POWDER",
  "DEVICE",
  "GENERAL",
];

export const AdminGlobalMedicinesPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Tabs: 'catalog' | 'suggestions'
  const [activeTab, setActiveTab] = useState<"catalog" | "suggestions">("catalog");

  // Catalog tab state
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogStatus, setCatalogStatus] = useState<GlobalMedicineStatus | "">("");
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogPageSize, setCatalogPageSize] = useState(20);

  // Suggestions tab state
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [suggestionStatus, setSuggestionStatus] = useState<SuggestionStatus | "">("PENDING");
  const [suggestionPage, setSuggestionPage] = useState(0);
  const [suggestionPageSize, setSuggestionPageSize] = useState(20);

  // Modal: Create/Edit Medicine
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<GlobalMedicineResponse | null>(null);
  const [medicineFormData, setMedicineFormData] = useState<CreateGlobalMedicineRequest>({
    name: "",
    genericName: "",
    brandName: "",
    manufacturer: "",
    dosageForm: "TABLET",
    strength: "",
    baseUnit: "Tablet",
    sellingUnit: "Strip of 10",
    unitsPerSellingUnit: 10,
    hsnCode: "30049099",
    taxRate: 12,
    prescriptionRequired: false,
    categoryName: "",
    barcode: "",
    description: "",
  });

  // Modal: Approve Suggestion
  const [approvingSuggestion, setApprovingSuggestion] = useState<GlobalMedicineSuggestionResponse | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Modal: Reject Suggestion
  const [rejectingSuggestion, setRejectingSuggestion] = useState<GlobalMedicineSuggestionResponse | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Modal: Bulk CSV Import
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<GlobalMedicineCsvImportResult | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await globalMedicineApi.adminDownloadCsvTemplate();
      toast.success("CSV template downloaded successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to download template.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setIsCsvUploading(true);
    try {
      const result = await globalMedicineApi.adminImportCsv(csvFile);
      setCsvImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["admin-global-medicines"] });
      if (result.failedCount === 0) {
        toast.success(`Successfully imported ${result.createdCount + result.updatedCount} global medicines!`);
      } else {
        toast.error(`Import completed with ${result.failedCount} errors. Review details.`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to import CSV.");
    } finally {
      setIsCsvUploading(false);
    }
  };

  // Queries
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-pending-suggestions-count"],
    queryFn: globalMedicineApi.adminGetPendingCount,
    refetchInterval: 30000,
  });

  const {
    data: catalogData,
    isLoading: isCatalogLoading,
  } = useQuery({
    queryKey: ["admin-global-medicines", catalogQuery, catalogStatus, catalogPage, catalogPageSize],
    queryFn: () =>
      globalMedicineApi.adminSearchMedicines(
        catalogQuery.trim(),
        catalogStatus ? (catalogStatus as GlobalMedicineStatus) : undefined,
        catalogPage,
        catalogPageSize
      ),
    enabled: activeTab === "catalog",
  });

  const {
    data: suggestionData,
    isLoading: isSuggestionsLoading,
  } = useQuery({
    queryKey: ["admin-global-suggestions", suggestionQuery, suggestionStatus, suggestionPage, suggestionPageSize],
    queryFn: () =>
      globalMedicineApi.adminGetSuggestions(
        suggestionQuery.trim(),
        suggestionStatus ? (suggestionStatus as SuggestionStatus) : undefined,
        suggestionPage,
        suggestionPageSize
      ),
    enabled: activeTab === "suggestions",
  });

  // Mutations
  const saveMedicineMutation = useMutation({
    mutationFn: async () => {
      if (editingMedicine) {
        return globalMedicineApi.adminUpdateMedicine(editingMedicine.id, {
          ...medicineFormData,
        });
      } else {
        return globalMedicineApi.adminCreateMedicine(medicineFormData);
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin-global-medicines"] });
      toast.success(`Global medicine "${saved.name}" saved successfully.`);
      setIsMedicineModalOpen(false);
      setEditingMedicine(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save global medicine.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: GlobalMedicineStatus }) => {
      return globalMedicineApi.adminUpdateStatus(id, newStatus);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-global-medicines"] });
      toast.success(`Medicine status updated to ${updated.status}.`);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    },
  });

  const approveSuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!approvingSuggestion) return;
      return globalMedicineApi.adminApproveSuggestion(approvingSuggestion.id, approvalNotes.trim() || undefined);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-global-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-suggestions-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-global-medicines"] });
      toast.success(`Suggestion for "${res?.name}" approved and promoted to Global Master Catalog!`);
      setApprovingSuggestion(null);
      setApprovalNotes("");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to approve suggestion.");
    },
  });

  const rejectSuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!rejectingSuggestion || !rejectionReason.trim()) return;
      return globalMedicineApi.adminRejectSuggestion(rejectingSuggestion.id, rejectionReason.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-global-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-suggestions-count"] });
      toast.success("Suggestion rejected.");
      setRejectingSuggestion(null);
      setRejectionReason("");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to reject suggestion.");
    },
  });

  const handleOpenCreateModal = () => {
    setEditingMedicine(null);
    setMedicineFormData({
      name: "",
      genericName: "",
      brandName: "",
      manufacturer: "",
      dosageForm: "TABLET",
      strength: "",
      baseUnit: "Tablet",
      sellingUnit: "Strip of 10",
      unitsPerSellingUnit: 10,
      hsnCode: "30049099",
      taxRate: 12,
      prescriptionRequired: false,
      categoryName: "",
      barcode: "",
      description: "",
    });
    setIsMedicineModalOpen(true);
  };

  const handleOpenEditModal = (med: GlobalMedicineResponse) => {
    setEditingMedicine(med);
    setMedicineFormData({
      name: med.name,
      genericName: med.genericName,
      brandName: med.brandName || "",
      manufacturer: med.manufacturer || "",
      dosageForm: med.dosageForm,
      strength: med.strength || "",
      baseUnit: med.baseUnit,
      sellingUnit: med.sellingUnit,
      unitsPerSellingUnit: med.unitsPerSellingUnit,
      hsnCode: med.hsnCode || "",
      taxRate: med.taxRate,
      prescriptionRequired: med.prescriptionRequired,
      categoryName: med.categoryName || "",
      barcode: med.barcode || "",
      description: med.description || "",
    });
    setIsMedicineModalOpen(true);
  };

  const medicines = catalogData?.content || [];
  const suggestions = suggestionData?.content || [];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-subtle shadow-card">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary-subtle text-primary border border-primary-border">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-primary">
                Global Medicine Master Database
              </h1>
              <span className="text-xs font-mono text-primary bg-primary-subtle px-2 py-0.5 rounded border border-primary-border font-semibold">
                PLATFORM MASTER
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Curate standard pharmaceutical salts, formulations, and GST slabs. Review products silently submitted by pharmacy owners.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlobalMedicineHelpModal mode="admin" />
          <Link to="/catalog/global/guide">
            <Button variant="outline" size="sm" leftIcon={<BookOpen className="h-4 w-4 text-primary" />}>
              Handbook
            </Button>
          </Link>
          {activeTab === "catalog" && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Upload className="h-4 w-4 text-primary" />}
                onClick={() => {
                  setCsvFile(null);
                  setCsvImportResult(null);
                  setIsCsvModalOpen(true);
                }}
              >
                Import CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreateModal}
              >
                Add Global Medicine
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-subtle">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "catalog"
              ? "border-primary text-primary"
              : "border-transparent text-secondary hover:text-primary"
          }`}
        >
          <Pill className="h-4 w-4" />
          Master Catalog
          {catalogData?.totalElements !== undefined && (
            <span className="ml-1 text-2xs px-1.5 py-0.5 rounded-full bg-subtle text-secondary font-mono">
              {catalogData.totalElements}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("suggestions")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "suggestions"
              ? "border-primary text-primary"
              : "border-transparent text-secondary hover:text-primary"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Store Product Proposals
          {pendingCount > 0 && (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
              {pendingCount} PENDING
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Master Catalog */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-surface rounded-lg border border-subtle shadow-card">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                placeholder="Search global medicines by name, generic salt, manufacturer, barcode..."
                value={catalogQuery}
                onChange={(e) => {
                  setCatalogQuery(e.target.value);
                  setCatalogPage(0);
                }}
                className="pl-9 text-xs"
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={catalogStatus}
                onChange={(e) => {
                  setCatalogStatus(e.target.value as GlobalMedicineStatus | "");
                  setCatalogPage(0);
                }}
                className="text-xs"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </div>
          </div>

          {/* Table */}
          <Card className="shadow-card border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-subtle text-secondary font-medium uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Medicine & Formulation</th>
                    <th className="py-3 px-4">Generic Salt</th>
                    <th className="py-3 px-4">Manufacturer / Brand</th>
                    <th className="py-3 px-4">Packaging & Units</th>
                    <th className="py-3 px-4">GST / HSN</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {isCatalogLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted">
                        Loading global medicine master catalog...
                      </td>
                    </tr>
                  ) : medicines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <EmptyState
                          icon={<Pill className="h-8 w-8 text-muted" />}
                          title="No medicines match your query"
                          description="Try modifying search keywords or add a new global medicine."
                        />
                      </td>
                    </tr>
                  ) : (
                    medicines.map((med) => (
                      <tr key={med.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-primary">{med.name}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-2xs px-1.5 py-0.5 rounded bg-primary-subtle text-primary border border-primary-border font-medium">
                                {med.dosageForm}
                              </span>
                              {med.strength && (
                                <span className="text-2xs px-1 py-0.5 rounded bg-surface border border-subtle text-secondary font-mono">
                                  {med.strength}
                                </span>
                              )}
                              {med.prescriptionRequired && (
                                <span className="text-2xs px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium">
                                  Rx
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-secondary">
                          <span className="font-medium text-primary">{med.genericName}</span>
                          {med.categoryName && (
                            <p className="text-2xs text-muted">{med.categoryName}</p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-secondary">
                          <span>{med.manufacturer || "—"}</span>
                          {med.brandName && (
                            <p className="text-2xs text-muted">Brand: {med.brandName}</p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-secondary">
                          <span className="font-mono">
                            {med.sellingUnit} ({med.unitsPerSellingUnit} {med.baseUnit}s)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-secondary">
                          <span className="font-mono">{med.taxRate}%</span>
                          {med.hsnCode && (
                            <p className="text-2xs font-mono text-muted">HSN: {med.hsnCode}</p>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`text-2xs px-2 py-0.5 rounded-full font-semibold border ${
                              med.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : med.status === "INACTIVE"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                            }`}
                          >
                            {med.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleOpenEditModal(med)}
                              leftIcon={<Edit2 className="h-3 w-3" />}
                            >
                              Edit
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  id: med.id,
                                  newStatus: med.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                })
                              }
                            >
                              {med.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {catalogData && catalogData.totalPages > 1 && (
              <div className="p-4 border-t border-subtle">
                <Pagination
                  currentPage={catalogPage}
                  totalPages={catalogData.totalPages}
                  totalElements={catalogData.totalElements}
                  pageSize={catalogPageSize}
                  pageSizeOptions={[10, 20, 50]}
                  onPageChange={setCatalogPage}
                  onPageSizeChange={(sz) => {
                    setCatalogPageSize(sz);
                    setCatalogPage(0);
                  }}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Store Suggestions Queue */}
      {activeTab === "suggestions" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-surface rounded-lg border border-subtle shadow-card">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                placeholder="Search suggestions by name, generic salt, or store..."
                value={suggestionQuery}
                onChange={(e) => {
                  setSuggestionQuery(e.target.value);
                  setSuggestionPage(0);
                }}
                className="pl-9 text-xs"
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={suggestionStatus}
                onChange={(e) => {
                  setSuggestionStatus(e.target.value as SuggestionStatus | "");
                  setSuggestionPage(0);
                }}
                className="text-xs"
              >
                <option value="">All Proposals</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved & Promoted</option>
                <option value="REJECTED">Rejected</option>
              </Select>
            </div>
          </div>

          <Card className="shadow-card border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-subtle text-secondary font-medium uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Submitting Store</th>
                    <th className="py-3 px-4">Proposed Product</th>
                    <th className="py-3 px-4">Generic Salt</th>
                    <th className="py-3 px-4">Formulation & Units</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted On</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {isSuggestionsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted">
                        Loading store product suggestions...
                      </td>
                    </tr>
                  ) : suggestions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <EmptyState
                          icon={<Sparkles className="h-8 w-8 text-muted" />}
                          title="No suggestions found"
                          description={
                            suggestionStatus === "PENDING"
                              ? "All store product submissions have been reviewed! New custom items added by retailers will appear here automatically."
                              : "No proposals match the current filter."
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    suggestions.map((sug) => (
                      <tr key={sug.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted shrink-0" />
                            <span className="font-semibold text-primary">{sug.businessName}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-primary">{sug.name}</span>
                            {sug.brandName && (
                              <p className="text-2xs text-muted">Brand: {sug.brandName}</p>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-secondary">
                          <span className="font-medium text-primary">
                            {sug.genericName || "—"}
                          </span>
                          {sug.manufacturer && (
                            <p className="text-2xs text-muted">Mfr: {sug.manufacturer}</p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-secondary">
                          <div className="space-y-0.5">
                            <span className="font-mono text-primary">{sug.dosageForm}</span>
                            {sug.strength && <span className="font-mono ml-1">({sug.strength})</span>}
                            <p className="text-2xs text-muted">
                              {sug.sellingUnit} ({sug.unitsPerSellingUnit} {sug.baseUnit}s) • {sug.taxRate}% GST
                            </p>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`text-2xs px-2 py-0.5 rounded-full font-semibold border ${
                              sug.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : sug.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            }`}
                          >
                            {sug.status}
                          </span>
                          {sug.adminNotes && (
                            <p className="text-2xs text-muted mt-1 max-w-xs truncate" title={sug.adminNotes}>
                              Note: {sug.adminNotes}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-secondary font-mono text-2xs">
                          {new Date(sug.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {sug.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="primary"
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                leftIcon={<Check className="h-3 w-3" />}
                                onClick={() => {
                                  setApprovingSuggestion(sug);
                                  setApprovalNotes("Approved formulation from store proposal.");
                                }}
                              >
                                Approve & Add
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs text-danger hover:bg-danger-subtle"
                                leftIcon={<X className="h-3 w-3" />}
                                onClick={() => {
                                  setRejectingSuggestion(sug);
                                  setRejectionReason("");
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-2xs text-muted italic">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {suggestionData && suggestionData.totalPages > 1 && (
              <div className="p-4 border-t border-subtle">
                <Pagination
                  currentPage={suggestionPage}
                  totalPages={suggestionData.totalPages}
                  totalElements={suggestionData.totalElements}
                  pageSize={suggestionPageSize}
                  pageSizeOptions={[10, 20, 50]}
                  onPageChange={setSuggestionPage}
                  onPageSizeChange={(sz) => {
                    setSuggestionPageSize(sz);
                    setSuggestionPage(0);
                  }}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal: Create or Edit Global Medicine */}
      <Dialog open={isMedicineModalOpen} onOpenChange={setIsMedicineModalOpen}>
        <DialogHeader>
          <DialogTitle>
            {editingMedicine ? "Edit Global Master Medicine" : "Add New Global Master Medicine"}
          </DialogTitle>
          <DialogDescription>
            Official master formulations are available to all pharmacies on Inventra. Retailers import with their own custom commercial prices.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMedicineMutation.mutate();
          }}
          className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Medicine Name"
              required
              helperText="Brand trade name (e.g. Dolo 650 Tablet, Augmentin 625 Duo)."
            >
              <Input
                required
                value={medicineFormData.name}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, name: e.target.value })
                }
                placeholder="e.g. Dolo 650 Tablet"
              />
            </FormField>

            <FormField
              label="Generic Active Salt Name"
              required
              helperText="Active chemical compound (e.g. Paracetamol). Standard generic reference."
            >
              <Input
                required
                value={medicineFormData.genericName}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, genericName: e.target.value })
                }
                placeholder="e.g. Paracetamol"
              />
            </FormField>

            <FormField
              label="Brand Name"
              helperText="Marketing brand line (e.g. Dolo, Calpol)."
            >
              <Input
                value={medicineFormData.brandName}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, brandName: e.target.value })
                }
                placeholder="e.g. Dolo"
              />
            </FormField>

            <FormField
              label="Manufacturer"
              helperText="Pharma manufacturer (e.g. Micro Labs Ltd, GSK, Cipla)."
            >
              <Input
                value={medicineFormData.manufacturer}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, manufacturer: e.target.value })
                }
                placeholder="e.g. Micro Labs Ltd"
              />
            </FormField>

            <FormField
              label="Dosage Form"
              required
              helperText="Physical formulation form (Tablet, Capsule, Syrup, etc.)."
            >
              <Select
                value={medicineFormData.dosageForm}
                onChange={(e) =>
                  setMedicineFormData({
                    ...medicineFormData,
                    dosageForm: e.target.value as DosageForm,
                  })
                }
              >
                {DOSAGE_FORMS.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Strength"
              helperText="Active strength per unit dose (e.g. 650 mg, 500 mg, 10 mg/5ml)."
            >
              <Input
                value={medicineFormData.strength}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, strength: e.target.value })
                }
                placeholder="e.g. 650 mg"
              />
            </FormField>

            <FormField
              label="Base Unit"
              required
              helperText="Smallest single unit counted or dispensed (e.g. Tablet, Bottle)."
            >
              <Input
                required
                value={medicineFormData.baseUnit}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, baseUnit: e.target.value })
                }
                placeholder="e.g. Tablet, Capsule, Bottle"
              />
            </FormField>

            <FormField
              label="Default Selling Unit"
              required
              helperText="Standard counter retail pack (e.g. Strip of 15, Box of 100)."
            >
              <Input
                required
                value={medicineFormData.sellingUnit}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, sellingUnit: e.target.value })
                }
                placeholder="e.g. Strip of 15"
              />
            </FormField>

            <FormField
              label="Units per Selling Unit"
              required
              helperText="Count of base units in 1 selling pack (e.g. 15 for a strip of 15 tablets)."
            >
              <Input
                type="number"
                min={1}
                required
                value={medicineFormData.unitsPerSellingUnit}
                onChange={(e) =>
                  setMedicineFormData({
                    ...medicineFormData,
                    unitsPerSellingUnit: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </FormField>

            <FormField
              label="HSN Code"
              helperText="Government 8-digit tax code (usually 3004 for pharmaceuticals)."
            >
              <Input
                value={medicineFormData.hsnCode}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, hsnCode: e.target.value })
                }
                placeholder="e.g. 30049060"
              />
            </FormField>

            <FormField
              label="Standard GST Slab (%)"
              required
              helperText="Standard tax percentage (typically 12% for formulations, 5% for critical)."
            >
              <Input
                type="number"
                step="0.01"
                min={0}
                required
                value={medicineFormData.taxRate}
                onChange={(e) =>
                  setMedicineFormData({
                    ...medicineFormData,
                    taxRate: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </FormField>

            <FormField
              label="Barcode (GTIN/EAN)"
              helperText="12 or 13-digit EAN/UPC barcode for instant counter checkout."
            >
              <Input
                value={medicineFormData.barcode}
                onChange={(e) =>
                  setMedicineFormData({ ...medicineFormData, barcode: e.target.value })
                }
                placeholder="e.g. 8901148210012"
              />
            </FormField>
          </div>

          <FormField
            label="Drug Classification / Category"
            helperText="Therapeutic category (e.g. Analgesics & Antipyretics, Antibiotics, Cardiac)."
          >
            <Input
              value={medicineFormData.categoryName}
              onChange={(e) =>
                setMedicineFormData({ ...medicineFormData, categoryName: e.target.value })
              }
              placeholder="e.g. Analgesic / Antipyretic"
            />
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="admin-rx-required"
              checked={medicineFormData.prescriptionRequired}
              onChange={(e) =>
                setMedicineFormData({
                  ...medicineFormData,
                  prescriptionRequired: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-subtle text-primary cursor-pointer"
            />
            <label htmlFor="admin-rx-required" className="text-xs text-primary font-medium cursor-pointer">
              Schedule H / Prescription Required (Rx)
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMedicineModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saveMedicineMutation.isPending}
            >
              {editingMedicine ? "Save Changes" : "Create Master Medicine"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: Approve Suggestion */}
      <Dialog open={Boolean(approvingSuggestion)} onOpenChange={() => setApprovingSuggestion(null)}>
        <DialogHeader>
          <DialogTitle>Approve & Promote to Global Master</DialogTitle>
          <DialogDescription>
            This formulation proposed by <strong>{approvingSuggestion?.businessName}</strong> will be added to the Global Medicine Database, making it available to all pharmacies, and the submitting store's product will be linked.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-surface-subtle rounded-lg border border-subtle space-y-1 text-xs">
            <div className="font-semibold text-primary text-sm">{approvingSuggestion?.name}</div>
            <div className="text-secondary">
              Generic: <strong>{approvingSuggestion?.genericName}</strong> • {approvingSuggestion?.dosageForm} ({approvingSuggestion?.strength})
            </div>
            <div className="text-muted text-2xs">
              Mfr: {approvingSuggestion?.manufacturer || "N/A"} • Pack: {approvingSuggestion?.sellingUnit} ({approvingSuggestion?.unitsPerSellingUnit} {approvingSuggestion?.baseUnit}s) • {approvingSuggestion?.taxRate}% GST
            </div>
          </div>

          <FormField label="Admin Notes (Optional)">
            <Input
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Standard generic salt verified against CDSCO list"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setApprovingSuggestion(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            isLoading={approveSuggestionMutation.isPending}
            onClick={() => approveSuggestionMutation.mutate()}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Confirm Approval
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal: Reject Suggestion */}
      <Dialog open={Boolean(rejectingSuggestion)} onOpenChange={() => setRejectingSuggestion(null)}>
        <DialogHeader>
          <DialogTitle>Reject Store Formulation Suggestion</DialogTitle>
          <DialogDescription>
            Specify a feedback reason for rejecting this proposal from <strong>{rejectingSuggestion?.businessName}</strong>. The retailer will still keep the product in their private store catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <FormField label="Rejection Reason" required>
            <Input
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Duplicate of existing global medicine, or incorrect generic salt name"
              autoFocus
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setRejectingSuggestion(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white"
            disabled={!rejectionReason.trim()}
            isLoading={rejectSuggestionMutation.isPending}
            onClick={() => rejectSuggestionMutation.mutate()}
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal: Bulk CSV Import */}
      <Dialog
        open={isCsvModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCsvFile(null);
            setCsvImportResult(null);
          }
          setIsCsvModalOpen(open);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Import Global Medicines via CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file containing standard medicines to populate the master catalog.
            All valid rows will be ingested and immediately made available to all retail stores.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Template Download Prompt */}
          <div className="flex items-center justify-between p-3.5 bg-primary/5 border border-primary/20 rounded-lg text-xs">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-primary">Need the standard CSV format?</p>
                <p className="text-secondary text-2xs">
                  Download our pre-configured template with proper column headers and sample rows.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              isLoading={isDownloadingTemplate}
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              className="text-xs shrink-0"
            >
              Download Template
            </Button>
          </div>

          {!csvImportResult ? (
            <div className="space-y-4">
              {/* File Dropzone / Selector */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  csvFile
                    ? "border-primary/40 bg-primary/5"
                    : "border-subtle hover:border-primary/50 hover:bg-surface-subtle"
                }`}
              >
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCsvFile(file);
                  }}
                />

                {csvFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-primary">{csvFile.name}</p>
                      <p className="text-2xs text-secondary">
                        {(csvFile.size / 1024).toFixed(1)} KB • Ready for streaming ingestion
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <label htmlFor="csv-file-input">
                        <Button variant="outline" size="sm" type="button" className="text-xs pointer-events-none">
                          Change File
                        </Button>
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setCsvFile(null)}
                        className="text-xs text-rose-500 hover:text-rose-600"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted" />
                    <p className="text-sm font-medium text-primary">
                      Click to choose CSV file or drag and drop
                    </p>
                    <p className="text-2xs text-secondary">
                      Supports comma or semicolon separated CSV with UTF-8 encoding
                    </p>
                    <span className="mt-2 inline-flex items-center px-3 py-1 rounded border border-subtle bg-surface text-xs font-medium text-secondary">
                      Browse Files
                    </span>
                  </label>
                )}
              </div>
            </div>
          ) : (
            /* Results Summary */
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-surface-subtle rounded-lg border border-subtle">
                  <p className="text-2xs uppercase text-secondary font-medium">Total Rows</p>
                  <p className="text-lg font-bold text-primary">{csvImportResult.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <p className="text-2xs uppercase text-emerald-600 font-medium">Created</p>
                  <p className="text-lg font-bold text-emerald-600">{csvImportResult.createdCount}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-2xs uppercase text-blue-600 font-medium">Updated</p>
                  <p className="text-lg font-bold text-blue-600">{csvImportResult.updatedCount}</p>
                </div>
                <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                  <p className="text-2xs uppercase text-rose-600 font-medium">Failed</p>
                  <p className="text-lg font-bold text-rose-600">{csvImportResult.failedCount}</p>
                </div>
              </div>

              {csvImportResult.errors && csvImportResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Row Parsing Errors:
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2.5 bg-rose-500/5 rounded-lg border border-rose-500/20 text-2xs text-rose-700 font-mono">
                    {csvImportResult.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!csvImportResult ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCsvModalOpen(false)}
                disabled={isCsvUploading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isCsvUploading}
                disabled={!csvFile || isCsvUploading}
                onClick={handleCsvImport}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Start Ingestion
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCsvFile(null);
                  setCsvImportResult(null);
                }}
              >
                Import Another File
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCsvModalOpen(false)}
              >
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
};
