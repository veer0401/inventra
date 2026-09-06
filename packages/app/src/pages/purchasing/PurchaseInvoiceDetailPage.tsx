import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Badge,
  Alert,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  useToast,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type { PurchaseInvoiceStatus } from "@inventra/api-types";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Store,
  Receipt,
  AlertTriangle,
} from "lucide-react";

export const PurchaseInvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const userRole = activeContext?.role || "STAFF";
  const canManage = ["OWNER", "MANAGER"].includes(userRole);

  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Purchase Invoice Detail
  const {
    data: invoice,
    isLoading: isLoadingInvoice,
    isError: isInvoiceError,
    error: invoiceError,
  } = useQuery({
    queryKey: ["purchase-invoice", businessId, id],
    queryFn: () => purchasingApi.getPurchaseInvoice(id!),
    enabled: !!businessId && !!id,
  });

  // 2. Fetch Supplier Details
  const { data: supplier } = useQuery({
    queryKey: ["supplier", businessId, invoice?.supplierId],
    queryFn: () => purchasingApi.getSupplier(invoice!.supplierId),
    enabled: !!businessId && !!invoice?.supplierId,
  });

  // 3. Fetch Catalog Products Map
  const { data: catalogData } = useQuery({
    queryKey: ["catalog-products", businessId, 0, 100],
    queryFn: () => catalogApi.listProducts(0, 100),
    enabled: !!businessId,
  });

  const productsMap = React.useMemo(() => {
    const map = new Map<string, any>();
    if (catalogData?.content) {
      for (const p of catalogData.content) {
        map.set(p.id, p);
      }
    }
    return map;
  }, [catalogData]);

  // Mutations
  const postMutation = useMutation({
    mutationFn: () => purchasingApi.postPurchaseInvoice(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices", businessId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice", businessId, id] });
      toast.success(`Invoice ${data.supplierInvoiceNumber} has been posted to Accounts Payable.`, "Invoice Posted");
    },
    onError: (err: any) => setActionError(err.message || "Failed to post invoice."),
  });

  const cancelMutation = useMutation({
    mutationFn: () => purchasingApi.cancelPurchaseInvoice(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices", businessId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice", businessId, id] });
      toast.info(`Invoice ${data.supplierInvoiceNumber} has been cancelled.`, "Invoice Cancelled");
    },
    onError: (err: any) => setActionError(err.message || "Failed to cancel invoice."),
  });

  const getStatusBadge = (status: PurchaseInvoiceStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary" className="font-mono text-xs">DRAFT</Badge>;
      case "POSTED":
        return <Badge variant="success" className="font-mono text-xs">POSTED</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="font-mono text-xs">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-xs">{status}</Badge>;
    }
  };

  if (isInvoiceError) {
    return (
      <div className="space-y-4">
        <Link
          to="/purchasing/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Invoices
        </Link>
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Error Loading Purchase Invoice</h4>
            <p className="text-xs">{(invoiceError as any)?.message || "Record not found or network failure."}</p>
          </div>
        </Alert>
      </div>
    );
  }

  if (isLoadingInvoice || !invoice) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div className="space-y-1">
          <Link
            to="/purchasing/invoices"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary font-mono">
              {invoice.supplierInvoiceNumber}
            </h1>
            {getStatusBadge(invoice.status)}
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>Store Branch: <strong className="text-primary">{activeContext?.storeName}</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {invoice.status === "DRAFT" && canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="text-xs text-danger hover:text-danger hover:bg-danger-subtle/20"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Invoice"}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => postMutation.mutate()}
                disabled={postMutation.isPending}
                className="text-xs"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                {postMutation.isPending ? "Posting..." : "Post Invoice"}
              </Button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-xs">{actionError}</p>
        </Alert>
      )}

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier Info */}
        <Card className="p-4 border-subtle space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">
            Vendor / Supplier
          </span>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent shrink-0" />
            <span className="font-semibold text-sm text-primary">
              {supplier?.legalName || "Loading supplier..."}
            </span>
          </div>
          <div className="text-xs text-muted space-y-0.5 pt-1 border-t border-subtle">
            <p>Code: <span className="font-mono text-secondary">{supplier?.supplierCode}</span></p>
            {supplier?.gstin && <p>GSTIN: <span className="font-mono text-secondary">{supplier.gstin}</span></p>}
          </div>
        </Card>

        {/* Invoice Dates */}
        <Card className="p-4 border-subtle space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">
            Billing Schedule
          </span>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted shrink-0" />
            <span className="text-xs text-secondary">
              Invoice Date: <strong className="text-primary font-mono">{invoice.invoiceDate || "—"}</strong>
            </span>
          </div>
          <div className="text-xs text-muted space-y-0.5 pt-1 border-t border-subtle">
            <p>Due Date: <span className="font-mono text-secondary">{invoice.dueDate || "—"}</span></p>
            {invoice.postedAt && (
              <p>Posted At: <span className="font-mono text-secondary">{new Date(invoice.postedAt).toLocaleString()}</span></p>
            )}
          </div>
        </Card>

        {/* Financial Totals */}
        <Card className="p-4 border-subtle space-y-1.5 font-mono text-xs">
          <span className="text-[10px] uppercase font-bold text-muted tracking-wider block font-sans">
            Invoice Summary
          </span>
          <div className="flex justify-between text-muted pt-1">
            <span>Subtotal:</span>
            <span>₹{invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount:</span>
              <span>-₹{invoice.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>Tax Amount:</span>
            <span>+₹{invoice.taxAmount.toFixed(2)}</span>
          </div>
          {invoice.roundOffAmount !== 0 && (
            <div className="flex justify-between text-muted">
              <span>Round Off:</span>
              <span>₹{invoice.roundOffAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-primary pt-1.5 border-t border-subtle font-sans">
            <span>Grand Total:</span>
            <span className="font-mono text-accent">₹{invoice.totalAmount.toFixed(2)}</span>
          </div>
        </Card>
      </div>

      {/* Invoiced Lines Table */}
      <Card className="p-4 sm:p-5 border-subtle space-y-4">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
          <Receipt className="h-4 w-4 text-accent" />
          Invoiced Line Items ({invoice.lines?.length || 0})
        </h2>

        <div className="overflow-x-auto border border-subtle rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Invoiced Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines?.map((line, index) => {
                const product = productsMap.get(line.productId);

                return (
                  <TableRow key={line.id} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs text-muted">{index + 1}</TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          to={`/catalog/products/${line.productId}`}
                          className="font-medium text-xs text-primary hover:text-accent hover:underline"
                        >
                          {product?.name || `Product (${line.productId.slice(0, 8)}...)`}
                        </Link>
                        {product?.genericName && (
                          <span className="text-[11px] text-muted">{product.genericName}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                      {line.invoicedQuantity}
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs text-muted">
                      ₹{(line.unitCost ?? (line as any).unitPrice ?? 0).toFixed(2)}
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs text-muted">
                      {line.taxRate ?? 0}% (₹{(line.taxAmount ?? 0).toFixed(2)})
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs text-muted">
                      ₹{(line.discountAmount ?? 0).toFixed(2)}
                    </TableCellNumeric>

                    <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                      ₹{(line.lineTotal ?? 0).toFixed(2)}
                    </TableCellNumeric>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card className="p-4 border-subtle space-y-1">
          <span className="text-xs font-medium text-muted uppercase">Invoice Notes</span>
          <p className="text-xs text-secondary whitespace-pre-wrap">{invoice.notes}</p>
        </Card>
      )}
    </div>
  );
};
