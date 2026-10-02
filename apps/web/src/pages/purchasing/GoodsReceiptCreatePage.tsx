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
  Pencil,
  Check,
  X,
  FileCheck,
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

  // Line Editing State: tempId of the line being edited, or null if adding new line
  const [editingTempId, setEditingTempId] = useState<string | null>(null);

  // Current Line Input State (clean defaults, no hardcoded dummy values)
  const [currentProductId, setCurrentProductId] = useState("");
  const [currentQty, setCurrentQty] = useState("");
  const [currentUnit, setCurrentUnit] = useState("BOX");
  const [currentFactor, setCurrentFactor] = useState("1");
  const [currentBatchNumber, setCurrentBatchNumber] = useState("");
  const [currentMfgDate, setCurrentMfgDate] = useState("");
  const [currentExpiryDate, setCurrentExpiryDate] = useState("");
  const [currentUnitCost, setCurrentUnitCost] = useState("");
  const [currentMrp, setCurrentMrp] = useState("");
  const [currentSellingPrice, setCurrentSellingPrice] = useState("");
  const [currentTaxRate, setCurrentTaxRate] = useState("0");

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

  const productsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (catalogProductsPage?.content) {
      for (const p of catalogProductsPage.content) {
        map.set(p.id, p.name);
      }
    }
    return map;
  }, [catalogProductsPage]);

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
          .filter((l) => Number(l.orderedQuantity) > Number(l.receivedQuantity || 0))
          .map((l) => {
            const remaining = Number(l.orderedQuantity) - Number(l.receivedQuantity || 0);
            const pName =
              catalogProductsPage?.content.find((p) => p.id === l.productId)?.name ||
              `Product (${l.productId.slice(0, 6)})`;
            const unitCost = Number(l.unitCost ?? (l as any).unitPrice ?? 0);

            return {
              tempId: crypto.randomUUID(),
              purchaseOrderLineId: l.id,
              productId: l.productId,
              productName: pName,
              receivedQuantity: remaining,
              purchaseUnit: l.purchaseUnit || "BOX",
              conversionFactor: Number(l.conversionFactor) || 1,
              batchNumber: `LOT-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(
                100 + Math.random() * 900
              )}`,
              manufacturingDate: new Date().toISOString().slice(0, 10),
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().slice(0, 10),
              unitCost: unitCost,
              mrp: +(unitCost * 1.5).toFixed(2),
              sellingPrice: +(unitCost * 1.35).toFixed(2),
              taxRate: Number(l.taxRate ?? 0),
            };
          });

        if (prefilledLines.length > 0) {
          setLines(prefilledLines);
        }
      }
    }
  }, [poData, catalogProductsPage]);

  // When a product is selected in the line editor, auto-fill from PO line or catalog defaults
  const handleProductSelect = (productId: string) => {
    setCurrentProductId(productId);
    if (!productId) return;

    // Check if linked to PO and this product is on the PO
    const matchedPoLine = poData?.lines?.find((l) => l.productId === productId);
    if (matchedPoLine) {
      const remaining = Number(matchedPoLine.orderedQuantity) - Number(matchedPoLine.receivedQuantity || 0);
      setCurrentQty(String(remaining > 0 ? remaining : matchedPoLine.orderedQuantity));
      setCurrentUnit(matchedPoLine.purchaseUnit || "BOX");
      setCurrentFactor(String(matchedPoLine.conversionFactor || 1));
      const cost = Number(matchedPoLine.unitCost ?? (matchedPoLine as any).unitPrice ?? 0);
      setCurrentUnitCost(String(cost));
      setCurrentTaxRate(String(matchedPoLine.taxRate ?? 0));
      if (!currentMrp) setCurrentMrp((cost * 1.5).toFixed(2));
      if (!currentSellingPrice) setCurrentSellingPrice((cost * 1.35).toFixed(2));
      return;
    }

    // Otherwise check catalog product
    const product = catalogProductsPage?.content?.find((p) => p.id === productId);
    if (product) {
      setCurrentTaxRate(String(product.taxRate ?? 0));
      if (!currentQty) setCurrentQty("1");
    }
  };

  const resetLineInputs = () => {
    setCurrentProductId("");
    setCurrentQty("");
    setCurrentUnit("BOX");
    setCurrentFactor("1");
    setCurrentBatchNumber("");
    setCurrentMfgDate("");
    setCurrentExpiryDate("");
    setCurrentUnitCost("");
    setCurrentMrp("");
    setCurrentSellingPrice("");
    setCurrentTaxRate("0");
    setEditingTempId(null);
  };

  // Start editing an existing line
  const handleStartEditLine = (line: DraftLineItem) => {
    setErrorMessage(null);
    setEditingTempId(line.tempId);
    setCurrentProductId(line.productId);
    setCurrentQty(String(line.receivedQuantity));
    setCurrentUnit(line.purchaseUnit || "BOX");
    setCurrentFactor(String(line.conversionFactor || 1));
    setCurrentBatchNumber(line.batchNumber || "");
    setCurrentMfgDate(line.manufacturingDate || "");
    setCurrentExpiryDate(line.expiryDate || "");
    setCurrentUnitCost(String(line.unitCost ?? ""));
    setCurrentMrp(line.mrp !== undefined && line.mrp !== null ? String(line.mrp) : "");
    setCurrentSellingPrice(line.sellingPrice !== undefined && line.sellingPrice !== null ? String(line.sellingPrice) : "");
    setCurrentTaxRate(line.taxRate !== undefined && line.taxRate !== null ? String(line.taxRate) : "0");

    const editorEl = document.getElementById("receipt-line-editor");
    if (editorEl && typeof editorEl.scrollIntoView === "function") {
      editorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    resetLineInputs();
  };

  // Save line item (either update existing or add new)
  const handleSaveLine = () => {
    setErrorMessage(null);

    if (!currentProductId) {
      setErrorMessage("Please select a product for the line item.");
      return;
    }
    const qty = parseFloat(currentQty);
    if (isNaN(qty) || qty <= 0) {
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

    const pName = productsMap.get(currentProductId) || "Product";

    if (editingTempId) {
      // Update existing line, preserving tempId and purchaseOrderLineId
      setLines((prev) =>
        prev.map((l) => {
          if (l.tempId !== editingTempId) return l;
          return {
            ...l,
            productId: currentProductId,
            productName: pName,
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
        })
      );
      resetLineInputs();
    } else {
      // Add new line
      const matchedPoLine = poData?.lines?.find((l) => l.productId === currentProductId);
      const newLine: DraftLineItem = {
        tempId: crypto.randomUUID(),
        purchaseOrderLineId: matchedPoLine?.id,
        productId: currentProductId,
        productName: pName,
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
      resetLineInputs();
    }
  };

  const handleRemoveLine = (tempId: string) => {
    if (editingTempId === tempId) {
      resetLineInputs();
    }
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

        {/* Linked PO Banner */}
        {poData && (
          <div className="p-3.5 rounded-lg border border-accent/30 bg-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-accent shrink-0" />
              <div>
                <span className="font-semibold text-primary">Receiving against Purchase Order: </span>
                <span className="font-mono font-bold text-accent">{poData.orderNumber}</span>
                <span className="text-secondary ml-2">
                  ({lines.length} {lines.length === 1 ? "line" : "lines"} preloaded from order)
                </span>
              </div>
            </div>
            <Link
              to={`/purchasing/orders/${poData.id}`}
              className="text-accent hover:underline font-medium inline-flex items-center gap-1"
            >
              View Order Details &rarr;
            </Link>
          </div>
        )}

        {/* Section 1: Header / Shipment Details */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Shipment & Vendor Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Supplier" required>
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

            <FormField label="Delivery Note / Invoice No." helperText="Vendor DC or Bill reference">
              <Input
                value={vendorDeliveryNote}
                onChange={(e) => setVendorDeliveryNote(e.target.value)}
                placeholder="DC-2026-9901"
                className="font-mono"
              />
            </FormField>

            <FormField label="Received Date" required>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
                className="font-mono"
              />
            </FormField>

            <div className="sm:col-span-3">
              <FormField label="Receiving Notes">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Temperature-controlled shipment received in good condition."
                />
              </FormField>
            </div>
          </div>
        </Card>

        {/* Section 2: Receipt Lines Table (Displayed First so user sees prefilled PO items) */}
        <Card className="p-4 sm:p-6 border-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                Receipt Line Items ({lines.length})
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Review received products, batches, and costs. Click Edit on any row to modify its details.
              </p>
            </div>
            <div className="font-mono text-xs text-secondary">
              Estimated Total:{" "}
              <strong className="text-primary text-sm font-bold">
                ₹{estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted border border-dashed border-subtle rounded-md">
              No line items in this receipt yet. Use the form below to add products and batch details.
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
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const lineCost = line.receivedQuantity * line.unitCost;
                    const tax = lineCost * ((line.taxRate ?? 0) / 100);
                    const lineTotal = lineCost + tax;
                    const isEditing = editingTempId === line.tempId;
                    const resolvedName = productsMap.get(line.productId) || line.productName;

                    return (
                      <TableRow
                        key={line.tempId}
                        className={`transition-colors ${
                          isEditing
                            ? "bg-accent/10 border-l-4 border-l-accent"
                            : "hover:bg-surface-muted/50"
                        }`}
                      >
                        <TableCell className="font-medium text-xs text-primary">
                          <div className="flex flex-col">
                            <span>{resolvedName}</span>
                            {line.purchaseOrderLineId && (
                              <span className="text-[10px] text-accent font-mono font-normal">
                                PO Linked Item
                              </span>
                            )}
                          </div>
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
                          ₹{Number(line.unitCost).toFixed(2)}
                        </TableCellNumeric>
                        <TableCellNumeric className="font-mono text-xs text-muted">
                          {line.taxRate}%
                        </TableCellNumeric>
                        <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                          ₹{lineTotal.toFixed(2)}
                        </TableCellNumeric>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditLine(line)}
                              className={`p-1.5 rounded transition-colors cursor-pointer ${
                                isEditing
                                  ? "bg-accent text-white"
                                  : "text-secondary hover:text-accent hover:bg-surface-muted"
                              }`}
                              title="Edit Line Item"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.tempId)}
                              className="p-1.5 rounded text-danger hover:bg-surface-muted cursor-pointer transition-colors"
                              title="Remove Line Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Section 3: Line Item Editor (Edit Line or Add Additional Line) */}
        <Card
          id="receipt-line-editor"
          className={`p-4 sm:p-6 border-subtle space-y-4 transition-all ${
            editingTempId
              ? "ring-2 ring-accent/40 bg-accent/5"
              : "bg-surface-muted/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted flex items-center gap-2">
              {editingTempId ? (
                <>
                  <Pencil className="h-4 w-4 text-accent" />
                  <span>Edit Line Item: <strong className="text-primary normal-case font-semibold">{productsMap.get(currentProductId) || "Selected Item"}</strong></span>
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 text-accent" />
                  <span>Add Line Item & Batch</span>
                </>
              )}
            </h2>
            {editingTempId && (
              <Badge variant="accent" className="font-mono text-xs">
                EDITING LINE
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <FormField label="Product" required>
                <Select
                  value={currentProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
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

            <FormField label="Received Qty" required>
              <Input
                type="number"
                min="0.01"
                step="any"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
                placeholder="e.g. 5"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Pack Unit" required helperText="e.g. BOX / STRIP">
              <Input
                value={currentUnit}
                onChange={(e) => setCurrentUnit(e.target.value)}
                placeholder="BOX"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Conversion Multiplier" required helperText="Base units per pack">
              <Input
                type="number"
                min="1"
                value={currentFactor}
                onChange={(e) => setCurrentFactor(e.target.value)}
                placeholder="10"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Batch Lot Number" required>
              <Input
                value={currentBatchNumber}
                onChange={(e) => setCurrentBatchNumber(e.target.value)}
                placeholder="LOT-2026-X"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Mfg Date (YYYY-MM-DD)">
              <Input
                type="date"
                value={currentMfgDate}
                onChange={(e) => setCurrentMfgDate(e.target.value)}
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Expiry Date (YYYY-MM-DD)" required>
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
                placeholder="Cost e.g. 100.00"
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
                placeholder="MRP e.g. 150.00"
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
                placeholder="Price e.g. 140.00"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="GST Rate (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={currentTaxRate}
                onChange={(e) => setCurrentTaxRate(e.target.value)}
                placeholder="0"
                className="font-mono text-xs"
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle/50">
            {editingTempId ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel Edit
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveLine}
                  className="text-xs"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Update Line Item
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveLine}
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Line to Receipt
              </Button>
            )}
          </div>
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

