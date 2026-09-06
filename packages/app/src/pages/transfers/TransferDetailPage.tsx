import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  Ban,
  Building2,
  AlertCircle,
  Boxes,
  Info,
} from "lucide-react";
import { transferApi } from "../../services/transferApi";
import {
  TransferStatusBadge,
  Button,
  Card,
  Input,
  Alert,
  useToast,
  Spinner,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@inventra/ui";
import type {
  ShipTransferRequest,
  ReceiveTransferRequest,
} from "@inventra/api-types";

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const [showShipModal, setShowShipModal] = useState(false);
  const [carrierName, setCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipBatches, setShipBatches] = useState<
    Record<string, { batchNumber: string; quantity: number; expiryDate: string; unitCost: number }>
  >({});

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [receiveDiscrepancies, setReceiveDiscrepancies] = useState<Record<string, string>>({});

  const { data: transfer, isLoading, isError } = useQuery({
    queryKey: ["transfer-detail", id],
    queryFn: () => (id ? transferApi.getTransfer(id) : Promise.reject("No id")),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transfer-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["transfers"] });
  };

  // 1. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: () => transferApi.approveTransfer(id!),
    onSuccess: () => {
      invalidate();
      toast.success("Transfer request has been approved.", "Transfer Approved");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Approval Failed");
    },
  });

  // 2. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: () => transferApi.rejectTransfer(id!, rejectionReason),
    onSuccess: () => {
      invalidate();
      setShowRejectModal(false);
      setRejectionReason("");
      toast.info("Transfer request was rejected.", "Transfer Rejected");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Rejection Failed");
    },
  });

  // 3. Ship Mutation
  const shipMutation = useMutation({
    mutationFn: (req: ShipTransferRequest) => transferApi.shipTransfer(id!, req),
    onSuccess: () => {
      invalidate();
      setShowShipModal(false);
      toast.success("Inventory batches picked and marked IN_TRANSIT.", "Transfer Dispatched");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Shipment Failed");
    },
  });

  // 4. Receive Mutation
  const receiveMutation = useMutation({
    mutationFn: (req: ReceiveTransferRequest) => transferApi.receiveTransfer(id!, req),
    onSuccess: (data) => {
      invalidate();
      setShowReceiveModal(false);
      toast.success(`Receipt logged. Status: ${data.transferStatus}`, "Stock Received");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Receiving Failed");
    },
  });

  // 5. Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: () => transferApi.cancelTransfer(id!, cancellationReason),
    onSuccess: () => {
      invalidate();
      setShowCancelModal(false);
      setCancellationReason("");
      toast.info("Transfer request was cancelled.", "Transfer Cancelled");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message, "Cancellation Failed");
    },
  });

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Loading transfer details...</p>
      </div>
    );
  }

  if (isError || !transfer) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/transfers")} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Transfers</span>
        </Button>
        <Card className="p-8 text-center border-destructive/30 bg-destructive/5 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-foreground">Transfer Not Found</h3>
          <p className="text-sm text-muted-foreground">Could not find transfer details for ID: {id}</p>
        </Card>
      </div>
    );
  }

  // Prepopulate ship batches modal
  const openShipModal = () => {
    const defaultBatches: Record<string, { batchNumber: string; quantity: number; expiryDate: string; unitCost: number }> = {};
    transfer.lines.forEach((l) => {
      defaultBatches[l.id] = {
        batchNumber: "BAT-" + new Date().getFullYear() + "-01",
        quantity: l.requestedQuantity,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        unitCost: 25.0,
      };
    });
    setShipBatches(defaultBatches);
    setShowShipModal(true);
  };

  // Prepopulate receive modal
  const openReceiveModal = () => {
    const defaultRec: Record<string, number> = {};
    transfer.lines.forEach((l) => {
      const remainingToReceive = Math.max(0, l.shippedQuantity - l.receivedQuantity);
      defaultRec[l.id] = remainingToReceive;
    });
    setReceiveQuantities(defaultRec);
    setShowReceiveModal(true);
  };

  const handleConfirmShip = (e: React.FormEvent) => {
    e.preventDefault();
    const req: ShipTransferRequest = {
      lines: transfer.lines.map((l) => {
        const b = shipBatches[l.id];
        return {
          transferLineId: l.id,
          batchAllocations: [
            {
              sourceBatchId: crypto.randomUUID(),
              shippedQuantity: b?.quantity || l.requestedQuantity,
            },
          ],
        };
      }),
    };
    shipMutation.mutate(req);
  };

  const handleConfirmReceive = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate cumulative invariant: received <= shipped
    for (const l of transfer.lines) {
      const recQty = Number(receiveQuantities[l.id] || 0);
      if (recQty < 0) {
        toast.error("Received quantity cannot be negative.", "Invalid Quantity");
        return;
      }
      if (l.receivedQuantity + recQty > l.shippedQuantity) {
        toast.error(
          `Line for ${l.productName}: Cumulative received (${l.receivedQuantity + recQty}) exceeds shipped quantity (${l.shippedQuantity}).`,
          "Over-Receive Violation"
        );
        return;
      }
    }

    const req: ReceiveTransferRequest = {
      lines: transfer.lines.map((l) => ({
        transferLineId: l.id,
        batchAllocations: [
          {
            sourceBatchId: crypto.randomUUID(),
            receivedQuantity: Number(receiveQuantities[l.id] || 0),
          },
        ],
      })),
    };
    receiveMutation.mutate(req);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/transfers")} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Transfers</span>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono text-foreground">{transfer.transferNumber}</h1>
              <TransferStatusBadge status={transfer.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Requested {new Date(transfer.requestedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons based on status */}
        <div className="flex items-center flex-wrap gap-2">
          {transfer.status === "REQUESTED" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowRejectModal(true)}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending && <Spinner className="h-4 w-4 mr-1.5" />}
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve Transfer
              </Button>
            </>
          )}

          {transfer.status === "APPROVED" && (
            <Button size="sm" className="bg-primary text-primary-foreground gap-1.5" onClick={openShipModal}>
              <Truck className="h-4 w-4" />
              <span>Ship & Dispatch Batches</span>
            </Button>
          )}

          {(transfer.status === "IN_TRANSIT" || transfer.status === "PARTIALLY_RECEIVED") && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={openReceiveModal}>
              <PackageCheck className="h-4 w-4" />
              <span>Receive Inventory</span>
            </Button>
          )}

          {["REQUESTED", "APPROVED"].includes(transfer.status) && (
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setShowCancelModal(true)}
            >
              <Ban className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Info Banner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Store */}
        <Card className="p-4 space-y-1.5 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase font-semibold">
            <Building2 className="h-3.5 w-3.5" />
            <span>Fulfilling Source Store</span>
          </div>
          <div className="font-mono text-sm font-semibold text-foreground">{transfer.sourceStoreId}</div>
        </Card>

        {/* Destination Store */}
        <Card className="p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase font-semibold">
            <Building2 className="h-3.5 w-3.5" />
            <span>Receiving Destination Store</span>
          </div>
          <div className="font-mono text-sm font-semibold text-foreground">{transfer.destinationStoreId}</div>
        </Card>
      </div>

      {/* Notes or Reason Alerts */}
      {transfer.notes && (
        <Card className="p-4 bg-muted/20 border-border/80 flex items-start gap-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-foreground">
            <span className="font-semibold">Requisition Notes:</span> {transfer.notes}
          </div>
        </Card>
      )}

      {transfer.rejectionReason && (
        <Alert variant="danger" className="flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>Rejection Reason: {transfer.rejectionReason}</span>
        </Alert>
      )}

      {transfer.cancellationReason && (
        <Alert variant="danger" className="flex items-center gap-2">
          <Ban className="h-4 w-4 shrink-0" />
          <span>Cancellation Reason: {transfer.cancellationReason}</span>
        </Alert>
      )}

      {/* Line Items Table */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border/50 pb-3">
          <Boxes className="h-5 w-5 text-primary" />
          <span>Requisition Item Lines ({transfer.lines?.length || 0})</span>
        </h3>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium text-xs border-b border-border uppercase">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-right">Requested</th>
                <th className="py-3 px-4 text-right">Shipped</th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {transfer.lines?.map((line, index) => (
                <tr key={line.id} className="hover:bg-muted/20">
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground">{index + 1}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{line.productName}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">{line.requestedQuantity}</td>
                  <td className="py-3 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold">
                    {line.shippedQuantity}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {line.receivedQuantity}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{line.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal} className="max-w-md">
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-danger/10 text-danger">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-danger">Reject Transfer Request</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this transfer requisition.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Input
              placeholder="e.g. Insufficient warehouse stock to fulfill requisition"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
              >
                {rejectMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal} className="max-w-md">
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-danger/10 text-danger">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-danger">Cancel Transfer Request</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for cancelling this transfer requisition.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Input
              placeholder="e.g. Created by mistake / Stock no longer needed"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              required
            />

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
                Keep Transfer
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!cancellationReason.trim() || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Ship Modal */}
      {showShipModal && (
        <Dialog open={showShipModal} onOpenChange={setShowShipModal} className="max-w-2xl">
          <form onSubmit={handleConfirmShip} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Dispatch & Allocate Stock Batches</DialogTitle>
                  <DialogDescription>
                    Specify logistics tracking and batch allocations for outgoing transfer
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary">Carrier / Logistics Name</label>
                <Input
                  placeholder="e.g. BlueDart / Store Van"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary">Tracking Number / AWB</label>
                <Input
                  placeholder="e.g. TRK-8921-X"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">
                Batch Allocation per Line
              </label>
              {transfer.lines.map((l) => (
                <div key={l.id} className="p-3 rounded-xl border border-subtle bg-surface-muted/40 space-y-2">
                  <div className="text-xs font-semibold text-primary">
                    {l.productName} (Req: {l.requestedQuantity})
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Batch Number"
                      value={shipBatches[l.id]?.batchNumber || ""}
                      onChange={(e) =>
                        setShipBatches({
                          ...shipBatches,
                          [l.id]: { ...shipBatches[l.id], batchNumber: e.target.value },
                        })
                      }
                      className="h-8 text-xs font-mono"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      max={l.requestedQuantity}
                      value={shipBatches[l.id]?.quantity || l.requestedQuantity}
                      onChange={(e) =>
                        setShipBatches({
                          ...shipBatches,
                          [l.id]: { ...shipBatches[l.id], quantity: Number(e.target.value) },
                        })
                      }
                      className="h-8 text-xs font-mono"
                      required
                    />
                    <Input
                      type="date"
                      value={shipBatches[l.id]?.expiryDate || ""}
                      onChange={(e) =>
                        setShipBatches({
                          ...shipBatches,
                          [l.id]: { ...shipBatches[l.id], expiryDate: e.target.value },
                        })
                      }
                      className="h-8 text-xs"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowShipModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={shipMutation.isPending}>
                {shipMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Authorize & Dispatch
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal} className="max-w-2xl">
          <form onSubmit={handleConfirmReceive} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Receive Transferred Inventory</DialogTitle>
                  <DialogDescription>
                    Confirm quantities received at the destination branch. Invariant: Received cannot exceed Shipped.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {transfer.lines.map((l) => {
                const remaining = Math.max(0, l.shippedQuantity - l.receivedQuantity);
                return (
                  <div key={l.id} className="p-3 rounded-xl border border-subtle bg-surface-muted/40 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-primary">
                      <span>{l.productName}</span>
                      <span className="text-muted font-mono">
                        Shipped: {l.shippedQuantity} | Already Received: {l.receivedQuantity}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted">Receiving Qty Now</label>
                        <Input
                          type="number"
                          min="0"
                          max={remaining}
                          value={receiveQuantities[l.id] ?? remaining}
                          onChange={(e) =>
                            setReceiveQuantities({
                              ...receiveQuantities,
                              [l.id]: Number(e.target.value),
                            })
                          }
                          className="h-8 text-xs font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted">Discrepancy / Damage Note</label>
                        <Input
                          placeholder="Optional reason if shortfall"
                          value={receiveDiscrepancies[l.id] || ""}
                          onChange={(e) =>
                            setReceiveDiscrepancies({
                              ...receiveDiscrepancies,
                              [l.id]: e.target.value,
                            })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowReceiveModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={receiveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {receiveMutation.isPending && <Spinner className="h-4 w-4 mr-1" />}
                Confirm Stock Intake
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </div>
  );
};
