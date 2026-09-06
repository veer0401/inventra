import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Input,
  Select,
  FormField,
  Alert,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type {
  CreateGoodsReceiptRequest,
  CreateGoodsReceiptLineRequest,
} from "@inventra/api-types";
import {
  Truck,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  Store,
  Layers,
} from "lucide-react";

interface DraftLineItem extends CreateGoodsReceiptLineRequest {
  tempId: string;
  productName: string;
}

export const GoodsReceiptCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poIdParam = searchParams.get("purchaseOrderId") || "";
  const supplierIdParam = searchParams.get("supplierId") || "";

  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;

  // Header State
  const [purchaseOrderId] = useState(poIdParam);
  const [supplierId, setSupplierId] = useState(supplierIdParam);
  const [vendorDeliveryNote, setVendorDeliveryNote] = useState("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Line Items State
  const [lines, setLines] = useState<DraftLineItem[]>([]);

  // Current Line Input State
  const [currentProductId, setCurrentProductId] = useState("");
  const [currentQty, setCurrentQty] = useState("10");
  const [currentUnit, setCurrentUnit] = useState("BOX");
  const [currentFactor, setCurrentFactor] = useState("10");
  const [currentBatchNumber, setCurrentBatchNumber] = useState("");
  const [currentMfgDate, setCurrentMfgDate] = useState("");
  const [currentExpiryDate, setCurrentExpiryDate] = useState("");
  const [currentUnitCost, setCurrentUnitCost] = useState("100");
  const [currentMrp, setCurrentMrp] = useState("150");
  const [currentSellingPrice, setCurrentSellingPrice] = useState("140");
  const [currentTaxRate, setCurrentTaxRate] = useState("12");

  // Fetch Suppliers for dropdown
  const { data: suppliersPage } = useQuery({
    queryKey: ["suppliers-dropdown", businessId],
    queryFn: () => purchasingApi.listSuppliers({ size: 100 }),
    enabled: !!businessId,
  });

  // Fetch Catalog Products for dropdown
  const { data: catalogProductsPage } = useQuery({
    queryKey: ["catalog-products-dropdown", businessId],
    queryFn: () => catalogApi.listProducts(0, 100),
    enabled: !!businessId,
  });

  // Fetch PO details if linked from PO
  const { data: poData } = useQuery({
    queryKey: ["purchase-order-preload", businessId, purchaseOrderId],
    queryFn: () => purchasingApi.getPurchaseOrder(purchaseOrderId),
    enabled: !!businessId && !!purchaseOrderId,
  });

  // Pre-fill from PO data
  useEffect(() => {
    if (poData) {
      if (poData.supplierId && !supplierId) {
        setSupplierId(poData.supplierId);
      }
      if (!vendorDeliveryNote) {
        setVendorDeliveryNote(`PO: ${poData.orderNumber}`);
      }
      if (poData.lines && lines.length === 0) {
        const prefilledLines: DraftLineItem[] = poData.lines
          .filter((l) => l.orderedQuantity > l.receivedQuantity)
          .map((l) => {
            const remaining = l.orderedQuantity - l.receivedQuantity;
            const pName =
              catalogProductsPage?.content.find((p) => p.id === l.productId)?.name ||
              `Product (${l.productId.slice(0, 6)})`;

            return {
              tempId: crypto.randomUUID(),
              purchaseOrderLineId: l.id,
              productId: l.productId,
              productName: pName,
              receivedQuantity: remaining,
              purchaseUnit: l.purchaseUnit,
              conversionFactor: l.conversionFactor,
              batchNumber: `LOT-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(
                100 + Math.random() * 900
              )}`,
              manufacturingDate: new Date().toISOString().slice(0, 10),
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().slice(0, 10),
              unitCost: l.unitCost ?? (l as any).unitPrice ?? 0,
              mrp: +((l.unitCost ?? (l as any).unitPrice ?? 0) * 1.5).toFixed(2),
              sellingPrice: +((l.unitCost ?? (l as any).unitPrice ?? 0) * 1.35).toFixed(2),
              taxRate: l.taxRate ?? 0,
            };
          });

        if (prefilledLines.length > 0) {
          setLines(prefilledLines);
        }
      }
    }
  }, [poData, catalogProductsPage]);

  const productsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (catalogProductsPage?.content) {
      for (const p of catalogProductsPage.content) {
        map.set(p.id, p.name);
      }
    }
    return map;
  }, [catalogProductsPage]);

  // Add line item to draft
  const handleAddLine = () => {
    setErrorMessage(null);

    if (!currentProductId) {
      setErrorMessage("Please select a product for the line item.");
      return;
    }
    const qty = parseFloat(currentQty);
    if (!qty || qty <= 0) {
      setErrorMessage("Received quantity must be greater than zero.");
      return;
    }
    const cost = parseFloat(currentUnitCost);
    if (isNaN(cost) || cost < 0) {
      setErrorMessage("Unit cost cannot be negative.");
      return;
    }
    if (!currentBatchNumber.trim()) {
      setErrorMessage("Batch / Lot number is required.");
      return;
    }
    if (!currentExpiryDate.trim()) {
      setErrorMessage("Expiry date is required.");
      return;
    }

    const newLine: DraftLineItem = {
      tempId: Math.random().toString(36).substring(2, 9),
      productId: currentProductId,
      productName: productsMap.get(currentProductId) || "Product",
      receivedQuantity: qty,
      purchaseUnit: currentUnit.trim(),
      conversionFactor: parseInt(currentFactor, 10) || 1,
      batchNumber: currentBatchNumber.trim(),
      manufacturingDate: currentMfgDate.trim() || undefined,
      expiryDate: currentExpiryDate.trim(),
      unitCost: cost,
      mrp: currentMrp ? parseFloat(currentMrp) : undefined,
      sellingPrice: currentSellingPrice ? parseFloat(currentSellingPrice) : undefined,
      taxRate: currentTaxRate ? parseFloat(currentTaxRate) : 0,
    };

    setLines((prev) => [...prev, newLine]);

    // Reset line input
    setCurrentProductId("");
    setCurrentBatchNumber("");
    setCurrentMfgDate("");
    setCurrentExpiryDate("");
  };

  const handleRemoveLine = (tempId: string) => {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  };

  // Compute live invoice total
  const estimatedTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const lineCost = line.receivedQuantity * line.unitCost;
      const tax = lineCost * ((line.taxRate ?? 0) / 100);
      return sum + lineCost + tax;
    }, 0);
  }, [lines]);

  const mutation = useMutation({
    mutationFn: async (req: CreateGoodsReceiptRequest) => {
      return purchasingApi.createGoodsReceipt(req);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipts", businessId, storeId] });
      navigate(`/goods-receipts/${data.id}`);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to create goods receipt. Please check all line items.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!storeId) {
      setErrorMessage("Active store context is required.");
      return;
    }
    if (!supplierId) {
      setErrorMessage("Please select a supplier.");
      return;
    }
    if (lines.length === 0) {
      setErrorMessage("At least one line item must be added to the Goods Receipt.");
      return;
    }

    const payload: CreateGoodsReceiptRequest = {
      storeId,
      supplierId,
      purchaseOrderId: purchaseOrderId || undefined,
      vendorDeliveryNote: vendorDeliveryNote.trim() || undefined,
      receivedDate: receivedDate.trim() || undefined,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        purchaseOrderLineId: l.purchaseOrderLineId || undefined,
        productId: l.productId,
        receivedQuantity: l.receivedQuantity,
        purchaseUnit: l.purchaseUnit,
        conversionFactor: l.conversionFactor,
        batchNumber: l.batchNumber,
        manufacturingDate: l.manufacturingDate,
        expiryDate: l.expiryDate,
        unitCost: l.unitCost,
        mrp: l.mrp,
        sellingPrice: l.sellingPrice,
        taxRate: l.taxRate,
      })),
    };

    mutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-subtle">
        <Link
          to="/goods-receipts"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Goods Receipts
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            New Goods Receipt (GRN)
          </h1>
          <Badge variant="outline" className="font-mono text-xs">
            DRAFT
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Store className="h-3.5 w-3.5 text-accent shrink-0" />
          <span>
            Receiving Store: <strong className="text-primary">{activeContext?.storeName}</strong>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <Alert variant="danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </Alert>
        )}

        {/* Section 1: Header / Shipment Details */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Shipment & Vendor Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Supplier" required helperText="The registered distributor delivering this stock consignment.">
              <Select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full text-xs font-medium"
              >
                <option value="">-- Select Supplier --</option>
                {suppliersPage?.content?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.legalName} ({s.supplierCode})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Delivery Note / Invoice No." helperText="Challan (DC) or invoice number printed on the paper delivery note.">
              <Input
                value={vendorDeliveryNote}
                onChange={(e) => setVendorDeliveryNote(e.target.value)}
                placeholder="DC-2026-9901"
                className="font-mono"
              />
            </FormField>

            <FormField label="Received Date" required helperText="The exact date this physical delivery arrived at your store.">
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
                className="font-mono"
              />
            </FormField>

            <div className="sm:col-span-3">
              <FormField label="Receiving Notes" helperText="Record cold-chain ice pack condition, box damages, or driver remarks.">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cold-chain insulin gel packs intact. Inspected by pharmacist."
                />
              </FormField>
            </div>
          </div>
        </Card>

        {/* Section 2: Add Line Items Box */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4 bg-surface-muted/30">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            Add Line Item & Batch
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <FormField label="Product" required helperText="The medicine matching the vendor's delivery slip.">
                <Select
                  value={currentProductId}
                  onChange={(e) => setCurrentProductId(e.target.value)}
                  className="w-full text-xs font-medium"
                >
                  <option value="">-- Select Product --</option>
                  {catalogProductsPage?.content?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id.slice(0, 6)})
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField label="Received Qty" required helperText="Count of physical packs/boxes unloaded.">
              <Input
                type="number"
                min="0.01"
                step="any"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
                placeholder="10"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Pack Unit" required helperText="e.g. BOX, STRIP, BOTTLE, VIAL">
              <Input
                value={currentUnit}
                onChange={(e) => setCurrentUnit(e.target.value)}
                placeholder="BOX"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Conversion Multiplier" required helperText="Total retail tablets/units inside 1 box.">
              <Input
                type="number"
                min="1"
                value={currentFactor}
                onChange={(e) => setCurrentFactor(e.target.value)}
                placeholder="10"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Batch Lot Number" required helperText="Manufacturer batch stamped on carton/blister.">
              <Input
                value={currentBatchNumber}
                onChange={(e) => setCurrentBatchNumber(e.target.value)}
                placeholder="LOT-2026-X"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Mfg Date (YYYY-MM-DD)" helperText="Manufacturing date printed on medicine packaging.">
              <Input
                type="date"
                value={currentMfgDate}
                onChange={(e) => setCurrentMfgDate(e.target.value)}
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Expiry Date (YYYY-MM-DD)" required helperText="Critical: System will auto-prioritize this batch for FEFO sales.">
              <Input
                type="date"
                value={currentExpiryDate}
                onChange={(e) => setCurrentExpiryDate(e.target.value)}
                required
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Unit Cost (₹)" required helperText="Net purchase cost paid to supplier per box (pre-tax).">
              <Input
                type="number"
                step="any"
                min="0"
                value={currentUnitCost}
                onChange={(e) => setCurrentUnitCost(e.target.value)}
                placeholder="100.00"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="MRP (₹)" helperText="Maximum Retail Price printed on box (statutory ceiling).">
              <Input
                type="number"
                step="any"
                min="0"
                value={currentMrp}
                onChange={(e) => setCurrentMrp(e.target.value)}
                placeholder="150.00"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Selling Price (₹)" helperText="Your pharmacy's regular retail price for patients.">
              <Input
                type="number"
                step="any"
                min="0"
                value={currentSellingPrice}
                onChange={(e) => setCurrentSellingPrice(e.target.value)}
                placeholder="140.00"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="GST Rate (%)" helperText="Applicable GST tax slab (e.g. 0%, 5%, 12%, 18%).">
              <Input
                type="number"
                min="0"
                max="100"
                value={currentTaxRate}
                onChange={(e) => setCurrentTaxRate(e.target.value)}
                placeholder="12"
                className="font-mono text-xs"
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Line to Receipt
            </Button>
          </div>
        </Card>

        {/* Section 3: Receipt Lines Table */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Receipt Line Items ({lines.length})
            </h2>
            <div className="font-mono text-xs text-secondary">
              Estimated Total:{" "}
              <strong className="text-primary text-sm font-bold">
                ₹{estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted border border-dashed border-subtle rounded-md">
              No line items added yet. Use the form above to add products and batch details.
            </div>
          ) : (
            <div className="overflow-x-auto border border-subtle rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch Lot</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Qty (Pack)</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Tax (%)</TableHead>
                    <TableHead className="text-right">Line Total (₹)</TableHead>
                    <TableHead className="text-center">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const lineCost = line.receivedQuantity * line.unitCost;
                    const tax = lineCost * ((line.taxRate ?? 0) / 100);
                    const lineTotal = lineCost + tax;

                    return (
                      <TableRow key={line.tempId} className="hover:bg-surface-muted/50 transition-colors">
                        <TableCell className="font-medium text-xs text-primary">
                          {line.productName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-secondary font-semibold">
                          {line.batchNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-primary">
                          {line.expiryDate}
                        </TableCell>
                        <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                          {line.receivedQuantity} {line.purchaseUnit}
                        </TableCellNumeric>
                        <TableCellNumeric className="font-mono text-xs text-muted">
                          {line.conversionFactor}x
                        </TableCellNumeric>
                        <TableCellNumeric className="font-mono text-xs text-secondary">
                          ₹{line.unitCost.toFixed(2)}
                        </TableCellNumeric>
                        <TableCellNumeric className="font-mono text-xs text-muted">
                          {line.taxRate}%
                        </TableCellNumeric>
                        <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                          ₹{lineTotal.toFixed(2)}
                        </TableCellNumeric>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.tempId)}
                            className="p-1 rounded text-danger hover:bg-surface-muted cursor-pointer"
                            title="Remove Line Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-subtle">
          <Link to="/goods-receipts">
            <Button type="button" variant="outline" disabled={mutation.isPending}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            disabled={mutation.isPending || lines.length === 0 || !supplierId}
          >
            <Save className="h-4 w-4 mr-1.5" />
            Create Draft Receipt
          </Button>
        </div>
      </form>
    </div>
  );
};
