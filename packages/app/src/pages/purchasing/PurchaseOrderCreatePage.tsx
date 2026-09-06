import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Input,
  Alert,
  Badge,
  useToast,
  Select,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import { createPurchaseOrderSchema } from "@inventra/validation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  Boxes,
  Store,
} from "lucide-react";

interface EditablePOLine {
  id: string;
  productId: string;
  purchaseUnit: string;
  conversionFactor: number;
  orderedQuantity: number;
  unitCost: number;
  discountPercentage: number;
  taxRate: number;
}

export const PurchaseOrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const activeContext = useAuthStore((state) => state.activeContext);
  const storeId = activeContext?.storeId;
  const businessId = activeContext?.businessId;

  // Form State
  const [supplierId, setSupplierId] = useState<string>("");
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Line items state
  const [lines, setLines] = useState<EditablePOLine[]>([
    {
      id: crypto.randomUUID(),
      productId: "",
      purchaseUnit: "BOX",
      conversionFactor: 10,
      orderedQuantity: 1,
      unitCost: 0,
      discountPercentage: 0,
      taxRate: 12,
    },
  ]);

  // Query suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-dropdown", businessId],
    queryFn: () => purchasingApi.listSuppliers({ size: 100 }),
    enabled: !!businessId,
  });

  // Query products from catalog
  const { data: catalogData } = useQuery({
    queryKey: ["catalog-products", businessId, 0, 200],
    queryFn: () => catalogApi.listProducts(0, 200),
    enabled: !!businessId,
  });

  // Query supplier products if supplier is selected
  const { data: supplierProducts = [] } = useQuery({
    queryKey: ["supplier-products", businessId, supplierId],
    queryFn: () => purchasingApi.listSupplierProducts(supplierId),
    enabled: !!supplierId,
  });

  // Add new line
  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: "",
        purchaseUnit: "BOX",
        conversionFactor: 10,
        orderedQuantity: 1,
        unitCost: 0,
        discountPercentage: 0,
        taxRate: 12,
      },
    ]);
  };

  // Remove line
  const handleRemoveLine = (id: string) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Update line field
  const handleLineChange = (id: string, field: keyof EditablePOLine, value: any) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const updated = { ...line, [field]: value };

        // If product changed, check for supplier product defaults or catalog defaults
        if (field === "productId" && value) {
          const sp = supplierProducts.find((p) => p.productId === value);
          if (sp) {
            updated.purchaseUnit = sp.purchaseUnit || "BOX";
            updated.conversionFactor = sp.conversionFactor || 10;
            if (sp.lastPurchasePrice) {
              updated.unitCost = sp.lastPurchasePrice;
            }
          } else {
            const product = catalogData?.content.find((p) => p.id === value);
            if (product) {
              updated.taxRate = product.taxRate ?? 12;
            }
          }
        }
        return updated;
      })
    );
  };

  // Financial preview calculation
  const calculations = lines.map((line) => {
    const rawLine = line.orderedQuantity * line.unitCost;
    const discount = (rawLine * line.discountPercentage) / 100;
    const taxable = Math.max(0, rawLine - discount);
    const tax = (taxable * line.taxRate) / 100;
    const total = taxable + tax;
    return { rawLine, discount, tax, total };
  });

  const subtotal = calculations.reduce((acc, c) => acc + c.rawLine, 0);
  const totalLineDiscount = calculations.reduce((acc, c) => acc + c.discount, 0);
  const totalTax = calculations.reduce((acc, c) => acc + c.tax, 0);
  const totalAmount = Math.max(0, subtotal - totalLineDiscount - discountAmount + totalTax);

  // Mutation
  const createPOMutation = useMutation({
    mutationFn: (payload: any) => purchasingApi.createPurchaseOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", businessId] });
      toast.success(`Order ${data.orderNumber} successfully saved as DRAFT.`, "Purchase Order Created");
      navigate(`/purchasing/orders/${data.id}`);
    },
    onError: (err: any) => {
      setValidationError(err.message || "Failed to create purchase order.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!storeId) {
      setValidationError("Active store context is required to create a purchase order.");
      return;
    }

    if (!supplierId) {
      setValidationError("Please select a supplier.");
      return;
    }

    // Validate lines
    const payload = {
      storeId,
      supplierId,
      orderDate: orderDate || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      discountAmount: Number(discountAmount) || 0,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        purchaseUnit: l.purchaseUnit,
        conversionFactor: Number(l.conversionFactor),
        orderedQuantity: Number(l.orderedQuantity),
        unitCost: Number(l.unitCost),
        discountPercentage: Number(l.discountPercentage) || 0,
        taxRate: Number(l.taxRate) || 0,
      })),
    };

    const parseResult = createPurchaseOrderSchema.safeParse(payload);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Invalid purchase order form fields.";
      setValidationError(firstError);
      return;
    }

    createPOMutation.mutate(parseResult.data);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div className="space-y-1">
          <Link
            to="/purchasing/orders"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Purchase Orders
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              Create Purchase Order
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              DRAFT
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Store className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>
              Receiving Branch: <strong className="text-primary">{activeContext?.storeName}</strong>
            </span>
          </div>
        </div>
      </div>

      {validationError && (
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-xs">{validationError}</p>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Details Card */}
        <Card className="p-4 sm:p-5 border-subtle space-y-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" />
            Supplier & Order Timing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Supplier Selection */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Supplier / Vendor <span className="text-danger">*</span>
              </label>
              <Select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select Supplier...</option>
                {suppliersData?.content.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.legalName} ({s.supplierCode})
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-muted mt-1">
                The registered distributor or pharma company supplying this order.
              </p>
            </div>

            {/* Order Date */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Order Date
              </label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted mt-1">
                Date you send this purchase requirement.
              </p>
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Expected Delivery Date
              </label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted mt-1">
                Estimated arrival date at your pharmacy loading dock.
              </p>
            </div>
          </div>
        </Card>

        {/* Itemized Line Editor Card */}
        <Card className="p-4 sm:p-5 border-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
              <Boxes className="h-4 w-4 text-accent" />
              Itemized Products ({lines.length})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Product Line
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const calc = calculations[index] || { total: 0 };
              return (
                <div
                  key={line.id}
                  className="p-3.5 rounded-lg border border-subtle bg-surface-muted/30 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-subtle/50 text-xs">
                    <span className="font-mono font-bold text-accent">Line #{index + 1}</span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id)}
                        className="text-danger hover:text-danger/80 p-1"
                        title="Remove Line"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
                    {/* Product Selection (2 cols) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-medium text-muted mb-1">
                        Product <span className="text-danger">*</span>
                      </label>
                      <Select
                        value={line.productId}
                        onChange={(e) => handleLineChange(line.id, "productId", e.target.value)}
                        required
                      >
                        <option value="">Select Catalog Product...</option>
                        {catalogData?.content.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.id.slice(0, 6)})
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Purchase Unit */}
                    <div>
                      <label className="block text-[10px] uppercase font-medium text-muted mb-1">
                        Unit
                      </label>
                      <Select
                        value={line.purchaseUnit}
                        onChange={(e) => handleLineChange(line.id, "purchaseUnit", e.target.value)}
                      >
                        <option value="BOX">BOX</option>
                        <option value="STRIP">STRIP</option>
                        <option value="BOTTLE">BOTTLE</option>
                        <option value="VIAL">VIAL</option>
                        <option value="TUBE">TUBE</option>
                        <option value="PACK">PACK</option>
                        <option value="UNIT">UNIT</option>
                      </Select>
                    </div>

                    {/* Conversion Factor */}
                    <div>
                      <label className="block text-[10px] uppercase font-medium text-muted mb-1">
                        Conv. Factor
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={line.conversionFactor}
                        onChange={(e) => handleLineChange(line.id, "conversionFactor", Number(e.target.value))}
                        required
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Ordered Quantity */}
                    <div>
                      <label className="block text-[10px] uppercase font-medium text-muted mb-1">
                        Quantity <span className="text-danger">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0.001"
                        step="any"
                        value={line.orderedQuantity}
                        onChange={(e) => handleLineChange(line.id, "orderedQuantity", Number(e.target.value))}
                        required
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div>
                      <label className="block text-[10px] uppercase font-medium text-muted mb-1">
                        Unit Cost (₹) <span className="text-danger">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) => handleLineChange(line.id, "unitCost", Number(e.target.value))}
                        required
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-medium text-muted mb-1">
                        Discount %
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discountPercentage}
                        onChange={(e) => handleLineChange(line.id, "discountPercentage", Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-medium text-muted mb-1">
                        Tax Rate %
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.taxRate}
                        onChange={(e) => handleLineChange(line.id, "taxRate", Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-2 flex items-center justify-end font-mono text-xs text-primary font-semibold self-end pb-1.5">
                      <span>Line Est. Total: ₹{calc.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Order Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notes */}
          <Card className="p-4 border-subtle space-y-2">
            <div>
              <label className="block text-xs font-medium text-secondary">
                Purchase Order Notes / Instructions
              </label>
              <p className="text-[11px] text-muted mb-2">
                Provide instructions for the vendor (transporter details, cold chain delivery alerts, payment terms).
              </p>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please deliver via cold chain van before Friday. Bill to HQ GSTIN."
              className="w-full p-2.5 rounded-md border border-subtle bg-surface text-xs text-primary focus:outline-none focus:ring-2 focus:ring-focus resize-none"
            />
          </Card>

          {/* Totals Preview Card */}
          <Card className="p-4 border-subtle space-y-2.5 font-mono text-xs">
            <div className="flex justify-between text-muted">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {totalLineDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span>Line Discounts:</span>
                <span>-₹{totalLineDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-secondary">
              <span>Order Discount (₹):</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="h-7 w-28 text-right text-xs font-mono"
              />
            </div>
            <div className="flex justify-between text-muted">
              <span>Estimated Tax:</span>
              <span>+₹{totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-primary pt-2 border-t border-subtle font-sans">
              <span>Estimated Total:</span>
              <span className="font-mono text-accent">₹{totalAmount.toFixed(2)}</span>
            </div>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-subtle">
          <Link to="/purchasing/orders">
            <Button variant="outline" size="sm" type="button" className="text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={createPOMutation.isPending}
            className="text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            {createPOMutation.isPending ? "Creating Draft..." : "Save Draft Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
};
