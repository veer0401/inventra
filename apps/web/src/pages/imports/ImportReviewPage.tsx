import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Edit2,
  Ban,
  CheckCheck,
  Clock,
} from "lucide-react";
import { importApi } from "../../services/importApi";
import {
  StatusBadge,
  MatchConfidenceBadge,
  Button,
  Card,
  Input,
  Alert,
  useToast,
  Spinner,
  Dialog,
} from "@inventra/ui";
import type {
  ImportRowResponse,
  ImportRowStatus,
  ConfirmImportResponse,
} from "@inventra/api-types";

export const ImportReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState<ImportRowStatus | "">("");
  const [page, setPage] = useState<number>(0);
  const pageSize = 25;

  // Modals state
  const [rowToEdit, setRowToEdit] = useState<ImportRowResponse | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});

  const [rowToSkip, setRowToSkip] = useState<ImportRowResponse | null>(null);
  const [skipReason, setSkipReason] = useState<string>("");

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  // Fetch Import Job Overview
  const {
    data: job,
    isLoading: isLoadingJob,
    isError: isJobError,
  } = useQuery({
    queryKey: ["import-job", id],
    queryFn: () => (id ? importApi.getImport(id) : Promise.reject("No id")),
    enabled: !!id,
  });

  // Fetch Import Rows
  const {
    data: rowsPage,
    isLoading: isLoadingRows,
  } = useQuery({
    queryKey: ["import-rows", id, statusFilter, page],
    queryFn: () =>
      id
        ? importApi.getImportRows(id, {
            status: statusFilter ? statusFilter : undefined,
            page,
            size: pageSize,
          })
        : Promise.reject("No id"),
    enabled: !!id,
  });

  const rows = rowsPage?.content || [];
  const totalPages = rowsPage?.totalPages || 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["import-job", id] });
    queryClient.invalidateQueries({ queryKey: ["import-rows", id] });
    queryClient.invalidateQueries({ queryKey: ["imports-list"] });
  };

  // Update Row Mutation
  const updateRowMutation = useMutation({
    mutationFn: () =>
      importApi.updateImportRow(id!, rowToEdit!.id, editFields),
    onSuccess: (updatedRow) => {
      invalidate();
      setRowToEdit(null);
      toast.success(`Row #${updatedRow.rowIndex} re-validated: Status is ${updatedRow.status}.`, "Row Updated");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Update Failed");
    },
  });

  // Skip Row Mutation
  const skipRowMutation = useMutation({
    mutationFn: () =>
      importApi.skipImportRow(id!, rowToSkip!.id, skipReason),
    onSuccess: (skippedRow) => {
      invalidate();
      setRowToSkip(null);
      setSkipReason("");
      toast.info(`Row #${skippedRow.rowIndex} will be excluded during ledger posting.`, "Row Skipped");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Skip Failed");
    },
  });

  // Confirm Import Mutation
  const confirmMutation = useMutation({
    mutationFn: () => importApi.confirmImport(id!),
    onSuccess: (data: ConfirmImportResponse) => {
      invalidate();
      setShowConfirmModal(false);
      toast.success(`Successfully posted ${data.postedRows} records to the domain ledger (${data.skippedRows} skipped).`, "Import Finalized");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Confirmation Failed");
    },
  });

  // Cancel Import Mutation
  const cancelMutation = useMutation({
    mutationFn: () => importApi.cancelImport(id!),
    onSuccess: () => {
      invalidate();
      setShowCancelModal(false);
      toast.info("Import job marked cancelled.", "Import Cancelled");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Cancellation Failed");
    },
  });

  const openEditModal = (row: ImportRowResponse) => {
    setRowToEdit(row);
    setEditFields({ ...row.rawData });
  };

  const openSkipModal = (row: ImportRowResponse) => {
    setRowToSkip(row);
    setSkipReason(row.skipReason || "");
  };

  if (isLoadingJob) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Loading draft verification...</p>
      </div>
    );
  }

  if (isJobError || !job) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/imports")} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Imports</span>
        </Button>
        <Card className="p-8 text-center border-destructive/30 bg-destructive/5 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-foreground">Import Job Not Found</h3>
          <p className="text-sm text-muted-foreground">Could not load import job with ID: {id}</p>
        </Card>
      </div>
    );
  }

  const isPendingReview = job.status === "PENDING_REVIEW";
  const hasInvalidRows = job.invalidRows > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/imports")} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Imports</span>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono text-foreground">{job.originalFilename}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Domain: <span className="font-semibold text-foreground">{job.importDomain}</span> • Ingested {new Date(job.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {isPendingReview && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowCancelModal(true)}
              >
                <Ban className="h-4 w-4 mr-1.5" />
                Cancel Import
              </Button>

              <Button
                size="sm"
                disabled={hasInvalidRows || confirmMutation.isPending}
                onClick={() => setShowConfirmModal(true)}
                className={`gap-1.5 shadow-sm ${
                  hasInvalidRows
                    ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {confirmMutation.isPending && <Spinner className="h-4 w-4" />}
                <CheckCheck className="h-4 w-4" />
                <span>Confirm & Post to Ledger</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Rows */}
        <Card className="p-4 space-y-1 bg-card">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Parsed
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{job.totalRows}</div>
          <div className="text-[11px] text-muted-foreground">Draft rows extracted from CSV</div>
        </Card>

        {/* Valid Rows */}
        <Card className="p-4 space-y-1 bg-card border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Valid Ready
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {job.validRows}
          </div>
          <div className="text-[11px] text-muted-foreground">Eligible for ledger commit</div>
        </Card>

        {/* Invalid Rows */}
        <Card
          className={`p-4 space-y-1 bg-card border-l-4 ${
            hasInvalidRows ? "border-l-destructive bg-destructive/5" : "border-l-border"
          }`}
        >
          <div className="text-xs font-semibold text-destructive uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Invalid Errors
          </div>
          <div className="text-2xl font-bold font-mono text-destructive">{job.invalidRows}</div>
          <div className="text-[11px] text-muted-foreground">
            {hasInvalidRows ? "Must correct or skip before confirming" : "Zero blocking errors"}
          </div>
        </Card>

        {/* Skipped Rows */}
        <Card className="p-4 space-y-1 bg-card border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Skipped Rows
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {job.skippedRows}
          </div>
          <div className="text-[11px] text-muted-foreground">Excluded with audit reason</div>
        </Card>
      </div>

      {hasInvalidRows && isPendingReview && (
        <Alert variant="danger" className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <strong>Action Required:</strong> {job.invalidRows} rows contain validation errors. Click{" "}
            <strong>Edit</strong> to fix invalid values inline, or <strong>Skip</strong> to exclude
            unresolvable rows before ledger confirmation.
          </div>
        </Alert>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => {
            setStatusFilter("");
            setPage(0);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === ""
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          All Rows ({job.totalRows})
        </button>
        <button
          onClick={() => {
            setStatusFilter("INVALID");
            setPage(0);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            statusFilter === "INVALID"
              ? "bg-destructive text-destructive-foreground"
              : "text-destructive hover:bg-destructive/10"
          }`}
        >
          <span>Invalid Errors ({job.invalidRows})</span>
        </button>
        <button
          onClick={() => {
            setStatusFilter("VALID");
            setPage(0);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === "VALID"
              ? "bg-emerald-600 text-white"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Valid ({job.validRows})
        </button>
        <button
          onClick={() => {
            setStatusFilter("SKIPPED");
            setPage(0);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === "SKIPPED"
              ? "bg-amber-600 text-white"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Skipped ({job.skippedRows})
        </button>
      </div>

      {/* Rows Table */}
      {isLoadingRows ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Loading draft rows...</p>
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <p className="text-sm text-muted-foreground">No rows found matching current filter tab.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium text-xs border-b border-border uppercase">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-40">Match Resolution</th>
                  <th className="py-3 px-4">Normalized Draft Data</th>
                  <th className="py-3 px-4">Validation Issues</th>
                  {isPendingReview && <th className="py-3 px-4 text-right w-36">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr
                      key={row.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        row.status === "INVALID" ? "bg-destructive/5" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-xs font-mono font-bold text-muted-foreground">
                        {row.rowIndex}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <MatchConfidenceBadge
                          confidence={row.matchConfidence}
                          matchedEntityId={row.matchedEntityId}
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xl text-xs font-mono">
                          {Object.entries(row.normalizedData || {}).map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px] text-foreground"
                            >
                              <strong className="text-muted-foreground font-normal">{k}:</strong>{" "}
                              {String(v)}
                            </span>
                          ))}
                        </div>
                        {row.status === "SKIPPED" && row.skipReason && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                            Skip reason: {row.skipReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {row.validationIssues?.length > 0 ? (
                          <div className="space-y-1">
                            {row.validationIssues.map((issue) => (
                              <div
                                key={issue.id}
                                className={`text-xs flex items-center gap-1 ${
                                  issue.severity === "ERROR"
                                    ? "text-destructive font-medium"
                                    : "text-amber-600"
                                }`}
                              >
                                {issue.severity === "ERROR" ? (
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                )}
                                <span>
                                  <strong>{issue.fieldName}:</strong> {issue.errorMessage}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Clean
                          </span>
                        )}
                      </td>
                      {isPendingReview && (
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(row)}
                            className="h-7 text-xs px-2 text-primary"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {row.status !== "SKIPPED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSkipModal(row)}
                              className="h-7 text-xs px-2 text-amber-600 hover:text-amber-700"
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Skip
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(row)}
                              className="h-7 text-xs px-2 text-muted-foreground"
                            >
                              Restore
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2 text-sm text-muted-foreground">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Row Modal */}
      {rowToEdit && (
        <Dialog open={!!rowToEdit} onOpenChange={() => setRowToEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateRowMutation.mutate();
            }}
            className="p-6 space-y-4 max-w-lg bg-card rounded-lg border border-border shadow-lg"
          >
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              <span>Correct Draft Row #{rowToEdit.rowIndex}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Edit raw values to resolve validation errors. The row will be automatically re-parsed,
              re-normalized, and matched against existing master data.
            </p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {Object.entries(rowToEdit.rawData || {}).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">{key}</label>
                  <Input
                    value={editFields[key] ?? val}
                    onChange={(e) =>
                      setEditFields({
                        ...editFields,
                        [key]: e.target.value,
                      })
                    }
                    className="text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setRowToEdit(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateRowMutation.isPending}
                className="bg-primary text-primary-foreground"
              >
                {updateRowMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Re-validate & Save
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Skip Row Modal */}
      {rowToSkip && (
        <Dialog open={!!rowToSkip} onOpenChange={() => setRowToSkip(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!skipReason.trim()) return;
              skipRowMutation.mutate();
            }}
            className="p-6 space-y-4 max-w-md bg-card rounded-lg border border-border shadow-lg"
          >
            <h3 className="text-lg font-bold text-amber-600 flex items-center gap-2">
              <Ban className="h-5 w-5 text-amber-600" />
              <span>Skip Row #{rowToSkip.rowIndex}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Skipping a row will exclude it from posting to the authoritative ledger. A mandatory skip
              reason is required for audit logs.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Mandatory Skip Reason <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Duplicate item / Invalid license number"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setRowToSkip(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!skipReason.trim() || skipRowMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {skipRowMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Confirm Skip Row
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Confirm & Post Modal */}
      {showConfirmModal && (
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <div className="p-6 space-y-4 max-w-md bg-card rounded-lg border border-border shadow-lg">
            <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
              <CheckCheck className="h-5 w-5 text-emerald-600" />
              <span>Confirm & Commit Import to Ledger</span>
            </h3>
            <Alert variant="info" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
              This action will invoke domain application services to create authoritative database
              records for <strong>{job.validRows} valid rows</strong>.
              {job.skippedRows > 0 && ` ${job.skippedRows} skipped rows will be omitted.`}
            </Alert>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to finalize this import job? This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {confirmMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Yes, Post Records
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Cancel Ingestion Modal */}
      {showCancelModal && (
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <div className="p-6 space-y-4 max-w-md bg-card rounded-lg border border-border shadow-lg">
            <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              <span>Cancel Import Job</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to cancel this import job? All draft records will remain archived in
              CANCELLED status.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
                Keep Draft
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
