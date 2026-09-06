import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  StatusBadge,
  Alert,
  Spinner,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  useToast,
} from "@inventra/ui";
import type {
  OnboardingApplicationSummaryResponse,
  OnboardingApplicationDetailResponse,
  OnboardingApprovalResponse,
  OnboardingApplicationStatus,
} from "@inventra/api-types";
import { useAuthStore } from "../../stores/authStore";
import { apiClient } from "../../services/api";

export const OnboardingApplicationsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const toast = useToast();

  const [applications, setApplications] = useState<OnboardingApplicationSummaryResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OnboardingApplicationStatus | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Detail Modal
  const [selectedApp, setSelectedApp] = useState<OnboardingApplicationDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Rejection Dialog
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Development Activation Link Notice (Local Dev Only)
  const [devApprovalInfo, setDevApprovalInfo] = useState<OnboardingApprovalResponse | null>(null);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url =
        selectedStatus === "ALL"
          ? "/api/v1/admin/onboarding/applications"
          : `/api/v1/admin/onboarding/applications?status=${selectedStatus}`;

      const res = await apiClient.get<{ content?: OnboardingApplicationSummaryResponse[] } | OnboardingApplicationSummaryResponse[]>(url);
      if (res.data && "content" in res.data && res.data.content) {
        setApplications(res.data.content);
      } else if (Array.isArray(res.data)) {
        setApplications(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load onboarding applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [selectedStatus]);

  const viewDetails = async (id: string) => {
    try {
      setIsLoadingDetail(true);
      const res = await apiClient.get<OnboardingApplicationDetailResponse>(
        `/api/v1/admin/onboarding/applications/${id}`
      );
      if (res.data) {
        setSelectedApp(res.data);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load details");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setIsSubmittingAction(true);
      const res = await apiClient.post<OnboardingApprovalResponse>(
        `/api/v1/admin/onboarding/applications/${id}/approve`
      );

      toast.success("Application approved! Account created and activation token generated.");

      if (res.data?.devActivationUrl) {
        setDevApprovalInfo(res.data);
      }

      setSelectedApp(null);
      fetchApplications();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Approval Failed");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectingAppId(id);
    setRejectionReason("");
    setIsRejectOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectingAppId || !rejectionReason.trim()) {
      toast.error("Please provide a valid reason for rejecting this application.");
      return;
    }

    try {
      setIsSubmittingAction(true);
      await apiClient.post(
        `/api/v1/admin/onboarding/applications/${rejectingAppId}/reject`,
        { rejectionReason: rejectionReason.trim() }
      );

      toast.success("Application rejected.");

      setIsRejectOpen(false);
      setSelectedApp(null);
      fetchApplications();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Rejection Failed");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-primary flex flex-col">
      {/* Top Admin Header */}
      <header className="border-b border-subtle bg-surface sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-mono font-bold text-primary-fg shadow-card">
            I
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary tracking-tight">Inventra Platform Console</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-primary-subtle text-primary border border-primary-border">
                PLATFORM ADMIN
              </span>
            </div>
            <p className="text-xs text-secondary">Admin-Approved Business Onboarding Review</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-primary">{user?.fullName || "Administrator"}</p>
            <p className="text-xs text-secondary">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:px-8 space-y-6">
        {/* Dev Activation Notice Banner (Local Dev Only) */}
        {devApprovalInfo?.devActivationUrl && (
          <Alert variant="warning" title="LOCAL DEVELOPMENT ONLY — Activation Link Generated">
            <div className="space-y-2 mt-1">
              <p className="text-xs">
                In local development, the activation URL is returned directly so you can test activation without email services:
              </p>
              <div className="flex items-center gap-2 bg-surface-muted p-2 rounded border border-warning-border">
                <code className="text-xs font-mono flex-1 break-all text-primary">
                  {devApprovalInfo.devActivationUrl}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(devApprovalInfo.devActivationUrl || "");
                    toast.success("Copied activation link to clipboard");
                  }}
                >
                  Copy Link
                </Button>
                <a
                  href={devApprovalInfo.devActivationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block"
                >
                  <Button size="sm" variant="primary">
                    Open Activation
                  </Button>
                </a>
              </div>
            </div>
          </Alert>
        )}

        {/* Page Title & Status Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Onboarding Applications</h1>
            <p className="text-sm text-secondary">
              Review and verify pharmacy credentials before activating enterprise accounts
            </p>
          </div>

          <div className="inline-flex bg-surface-muted border border-subtle rounded-lg p-1">
            {(["ALL", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  selectedStatus === status
                    ? "bg-primary text-primary-fg shadow-card"
                    : "text-secondary hover:text-primary hover:bg-surface"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List Card */}
        <Card className="shadow-card border-subtle overflow-hidden">
          <CardHeader className="border-b border-subtle pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-primary">Submitted Applications</CardTitle>
                <CardDescription className="text-secondary">
                  Showing {applications.length} applications ({selectedStatus.replace("_", " ")})
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchApplications} disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : "Refresh"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {error && (
              <div className="p-6">
                <Alert variant="danger" title="Error">
                  {error}
                </Alert>
              </div>
            )}

            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-secondary">Loading onboarding applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="py-16 text-center text-muted">
                <p className="text-base font-medium text-secondary">No applications found</p>
                <p className="text-xs mt-1">There are no onboarding applications matching this filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-subtle">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-primary text-base">{app.businessName}</span>
                        <StatusBadge status={app.status} />
                      </div>
                      <div className="text-xs text-secondary flex items-center gap-3 flex-wrap">
                        <span>Applicant: <strong className="text-primary font-normal">{app.applicantName}</strong></span>
                        <span>Email: <strong className="text-primary font-normal">{app.applicantEmail}</strong></span>
                        <span>Store: <strong className="text-primary font-normal">{app.storeName}</strong></span>
                        <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDetails(app.id)}
                        disabled={isLoadingDetail}
                      >
                        Inspect Details
                      </Button>

                      {app.status === "PENDING_REVIEW" && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(app.id)}
                            disabled={isSubmittingAction}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openRejectDialog(app.id)}
                            disabled={isSubmittingAction}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Modal Dialog */}
      <Dialog
        open={Boolean(selectedApp)}
        onOpenChange={(open) => {
          if (!open) setSelectedApp(null);
        }}
      >
        <DialogHeader>
          <DialogTitle>Application Credentials & Compliance</DialogTitle>
          <DialogDescription>Verify licensing and ownership credentials before approval.</DialogDescription>
        </DialogHeader>

        {selectedApp && (
          <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-1 py-2">
            <div className="flex justify-between items-center bg-surface-muted p-3 rounded-lg border border-subtle">
              <span className="text-muted">Current Status</span>
              <StatusBadge status={selectedApp.status} />
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                Applicant Information
              </h4>
              <div className="bg-surface-muted p-3 rounded-lg border border-subtle space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted">Full Name</span><span className="text-primary font-medium">{selectedApp.applicantName}</span></div>
                <div className="flex justify-between"><span className="text-muted">Email</span><span className="text-primary font-mono">{selectedApp.applicantEmail}</span></div>
                <div className="flex justify-between"><span className="text-muted">Phone</span><span className="text-secondary">{selectedApp.applicantPhone || "—"}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                Business & Regulatory Compliance
              </h4>
              <div className="bg-surface-muted p-3 rounded-lg border border-subtle space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted">Legal Business Name</span><span className="text-primary font-medium">{selectedApp.businessName}</span></div>
                <div className="flex justify-between"><span className="text-muted">Trade / Board Name</span><span className="text-secondary">{selectedApp.tradeName || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Drug License No.</span><span className="text-primary font-mono font-medium">{selectedApp.drugLicenseNumber || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">GSTIN</span><span className="text-secondary font-mono">{selectedApp.gstin || "—"}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                Primary Store & Location
              </h4>
              <div className="bg-surface-muted p-3 rounded-lg border border-subtle space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted">Store Name</span><span className="text-primary font-medium">{selectedApp.storeName}</span></div>
                <div className="flex justify-between"><span className="text-muted">Store Code</span><span className="text-secondary font-mono">{selectedApp.storeCode}</span></div>
                <div className="flex justify-between"><span className="text-muted">Address</span><span className="text-secondary">{[selectedApp.addressLine1, selectedApp.addressLine2].filter(Boolean).join(", ") || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">City, State, PIN</span><span className="text-secondary">{[selectedApp.city, selectedApp.state, selectedApp.postalCode].filter(Boolean).join(", ") || "—"}</span></div>
              </div>
            </div>

            {selectedApp.rejectionReason && (
              <Alert variant="danger" title="Rejection Reason">
                {selectedApp.rejectionReason}
              </Alert>
            )}

            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
              {selectedApp.status === "PENDING_REVIEW" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const id = selectedApp.id;
                      setSelectedApp(null);
                      openRejectDialog(id);
                    }}
                    disabled={isSubmittingAction}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(selectedApp.id)}
                    disabled={isSubmittingAction}
                  >
                    Approve Application
                  </Button>
                </>
              )}
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        open={isRejectOpen}
        onOpenChange={(open) => {
          if (!open) setIsRejectOpen(false);
        }}
      >
        <DialogHeader>
          <DialogTitle>Reject Onboarding Application</DialogTitle>
          <DialogDescription>Provide a clear, auditable reason for rejecting this pharmacy registration.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Rejection Reason" required>
            <textarea
              className="w-full bg-surface border border-subtle rounded-md p-3 text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus min-h-[100px]"
              placeholder="e.g. State drug license number could not be verified against the state pharmacy portal."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={isSubmittingAction}
            />
          </FormField>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsRejectOpen(false)} disabled={isSubmittingAction}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              isLoading={isSubmittingAction}
              disabled={!rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
};
