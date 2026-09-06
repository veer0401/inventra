import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Button,
  Badge,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellNumeric,
  EmptyState,
  Skeleton,
  Alert,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Select,
  FormField,
} from "@inventra/ui";
import { purchasingApi } from "../../services/purchasingApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type {
  SupplierStatus,
  CreateSupplierProductRequest,
} from "@inventra/api-types";
import {
  Building2,
  ArrowLeft,
  Edit,
  Phone,
  FileText,
  CreditCard,
  Plus,
  Truck,
  Star,
  AlertCircle,
} from "lucide-react";

export const SupplierDetailPage: React.FC = () => {
  const { supplierId } = useParams<{ supplierId: string }>();
  const queryClient = useQueryClient();
  const activeContext = useAuthStore((state) => state.activeContext);
  const businessId = activeContext?.businessId;
  const userRole = activeContext?.role || "STAFF";
  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(userRole);

  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "RECEIPTS">("PRODUCTS");
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // Link Product form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [supplierProductCode, setSupplierProductCode] = useState("");
  const [supplierProductName, setSupplierProductName] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState("BOX");
  const [conversionFactor, setConversionFactor] = useState("10");
  const [lastPurchasePrice, setLastPurchasePrice] = useState("");
  const [isPreferred, setIsPreferred] = useState(false);
  const [minOrderQuantity, setMinOrderQuantity] = useState("1");
  const [leadTimeDays, setLeadTimeDays] = useState("3");
  const [productModalError, setProductModalError] = useState<string | null>(null);

  // 1. Fetch Supplier Profile
  const {
    data: supplier,
    isLoading: isLoadingSupplier,
    isError: isSupplierError,
    error: supplierError,
  } = useQuery({
    queryKey: ["supplier", businessId, supplierId],
    queryFn: () => purchasingApi.getSupplier(supplierId!),
    enabled: !!businessId && !!supplierId,
  });

  // 2. Fetch Supplier Products
  const {
    data: supplierProducts = [],
    isLoading: isLoadingProducts,
    refetch: refetchSupplierProducts,
  } = useQuery({
    queryKey: ["supplier-products", businessId, supplierId],
    queryFn: () => purchasingApi.listSupplierProducts(supplierId!),
    enabled: !!businessId && !!supplierId,
  });

  // 3. Fetch Goods Receipts associated with this supplier
  const {
    data: goodsReceiptsPage,
    isLoading: isLoadingReceipts,
  } = useQuery({
    queryKey: ["goods-receipts-supplier", businessId, supplierId],
    queryFn: () => purchasingApi.listGoodsReceipts({ supplierId, size: 20 }),
    enabled: !!businessId && !!supplierId && activeTab === "RECEIPTS",
  });

  // 4. Fetch Master Products for linking modal
  const { data: catalogProductsPage } = useQuery({
    queryKey: ["catalog-products-for-supplier", businessId],
    queryFn: () => catalogApi.listProducts(0, 100),
    enabled: isAddProductModalOpen && !!businessId,
  });

  const linkProductMutation = useMutation({
    mutationFn: async (req: CreateSupplierProductRequest) => {
      return purchasingApi.addOrUpdateSupplierProduct(supplierId!, req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-products", businessId, supplierId] });
      refetchSupplierProducts();
      setIsAddProductModalOpen(false);
      resetProductModal();
    },
    onError: (err: any) => {
      setProductModalError(err.message || "Failed to link product to supplier.");
    },
  });

  const resetProductModal = () => {
    setSelectedProductId("");
    setSupplierProductCode("");
    setSupplierProductName("");
    setPurchaseUnit("BOX");
    setConversionFactor("10");
    setLastPurchasePrice("");
    setIsPreferred(false);
    setMinOrderQuantity("1");
    setLeadTimeDays("3");
    setProductModalError(null);
  };

  const handleLinkProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProductModalError(null);

    if (!selectedProductId) {
      setProductModalError("Please select a catalog product.");
      return;
    }

    const payload: CreateSupplierProductRequest = {
      productId: selectedProductId,
      supplierProductCode: supplierProductCode.trim() || undefined,
      supplierProductName: supplierProductName.trim() || undefined,
      purchaseUnit: purchaseUnit.trim(),
      conversionFactor: parseInt(conversionFactor, 10) || 1,
      lastPurchasePrice: lastPurchasePrice ? parseFloat(lastPurchasePrice) : undefined,
      isPreferred,
      minOrderQuantity: minOrderQuantity ? parseFloat(minOrderQuantity) : undefined,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : undefined,
    };

    linkProductMutation.mutate(payload);
  };

  const getStatusVariant = (status?: SupplierStatus) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "INACTIVE":
        return "neutral";
      case "BLOCKED":
        return "danger";
      default:
        return "neutral";
    }
  };

  if (isSupplierError) {
    return (
      <Alert variant="danger">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <div>
          <h4 className="font-semibold text-sm">Failed to load supplier</h4>
          <p className="text-xs mt-0.5">
            {(supplierError as any)?.message || "The requested supplier could not be found."}
          </p>
          <Link to="/suppliers" className="inline-block mt-2">
            <Button variant="outline" size="sm" className="text-xs">
              Back to Suppliers
            </Button>
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div className="space-y-1">
          <Link
            to="/suppliers"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Suppliers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              {isLoadingSupplier ? <Skeleton className="h-8 w-60" /> : supplier?.legalName}
            </h1>
            {supplier && <StatusBadge status={getStatusVariant(supplier.status)} label={supplier.status} />}
          </div>
          {supplier?.tradeName && supplier.tradeName !== supplier.legalName && (
            <p className="text-xs text-muted">Trading as: {supplier.tradeName}</p>
          )}
          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <span>Code: {supplier?.supplierCode}</span>
            <span className="text-subtle">•</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {supplier?.supplierType}
            </Badge>
          </div>
        </div>

        {canManage && supplier && (
          <Link to={`/suppliers/${supplier.id}/edit`}>
            <Button variant="outline" size="sm" className="text-xs">
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit Profile
            </Button>
          </Link>
        )}
      </div>

      {/* Supplier Profile Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Credentials */}
        <Card className="p-4 border-subtle space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-primary" />
            Contact Details
          </h2>
          <div className="text-xs space-y-1.5 text-secondary">
            <div>
              <span className="text-muted block text-[10px]">CONTACT PERSON</span>
              <span className="font-medium text-primary">{supplier?.contactPersonName || "—"}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px]">PHONE</span>
              <span>{supplier?.phoneNumber || "—"}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px]">EMAIL</span>
              <span className="truncate block">{supplier?.email || "—"}</span>
            </div>
          </div>
        </Card>

        {/* Regulatory & Tax */}
        <Card className="p-4 border-subtle space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Regulatory & Tax
          </h2>
          <div className="text-xs space-y-1.5 font-mono text-secondary">
            <div>
              <span className="text-muted block text-[10px] font-sans">GSTIN</span>
              <span className="text-primary font-semibold">{supplier?.gstin || "—"}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] font-sans">DRUG LICENSE</span>
              <span>{supplier?.drugLicenseNumber || "—"}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] font-sans">PAN</span>
              <span>{supplier?.pan || "—"}</span>
            </div>
          </div>
        </Card>

        {/* Commercial & Address */}
        <Card className="p-4 border-subtle space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            Terms & Address
          </h2>
          <div className="text-xs space-y-1.5 text-secondary">
            <div className="flex items-center justify-between font-mono">
              <span className="text-muted text-[10px] font-sans">PAYMENT TERMS:</span>
              <span className="font-bold text-primary">
                {supplier?.paymentTermsDays ? `${supplier.paymentTermsDays} Days` : "Immediate"}
              </span>
            </div>
            {supplier?.creditLimit !== null && supplier?.creditLimit !== undefined && (
              <div className="flex items-center justify-between font-mono">
                <span className="text-muted text-[10px] font-sans">CREDIT LIMIT:</span>
                <span className="font-bold text-primary">₹{supplier.creditLimit.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-1 text-[11px] text-muted border-t border-subtle">
              {[supplier?.addressLine1, supplier?.city, supplier?.state, supplier?.postalCode]
                .filter(Boolean)
                .join(", ") || "No address on record"}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs: Supplied Products vs Goods Receipts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-subtle pb-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("PRODUCTS")}
              className={`px-3 py-2 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "PRODUCTS"
                  ? "bg-primary text-primary-fg font-semibold shadow-xs"
                  : "text-secondary hover:text-primary hover:bg-surface-muted"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Supplied Products ({supplierProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("RECEIPTS")}
              className={`px-3 py-2 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "RECEIPTS"
                  ? "bg-primary text-primary-fg font-semibold shadow-xs"
                  : "text-secondary hover:text-primary hover:bg-surface-muted"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              Goods Receipts History
            </button>
          </div>

          {activeTab === "PRODUCTS" && canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddProductModalOpen(true)}
              className="text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Link Product
            </Button>
          )}
        </div>

        {/* Tab 1: Supplied Products */}
        {activeTab === "PRODUCTS" && (
          <div>
            {isLoadingProducts ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : supplierProducts.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-8 w-8" />}
                title="No Products Linked"
                description="This supplier has no registered products in their supply catalog."
                action={
                  canManage ? (
                    <Button variant="primary" size="sm" onClick={() => setIsAddProductModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Link First Product
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto border border-subtle rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Supplier Code / Name</TableHead>
                      <TableHead>Purchase Unit</TableHead>
                      <TableHead className="text-right">Multiplier</TableHead>
                      <TableHead className="text-right">Last Cost (₹)</TableHead>
                      <TableHead className="text-center">Preferred</TableHead>
                      <TableHead className="text-center">Lead Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierProducts.map((sp) => (
                      <TableRow key={sp.id} className="hover:bg-surface-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs text-primary font-medium">
                          <Link to={`/inventory/${sp.productId}`} className="hover:underline text-accent">
                            {sp.productId.slice(0, 8)}...
                          </Link>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs">
                            <span className="font-semibold text-primary">{sp.supplierProductName || "—"}</span>
                            {sp.supplierProductCode && (
                              <span className="block text-[11px] font-mono text-muted">
                                Code: {sp.supplierProductCode}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs text-secondary font-semibold">
                          {sp.purchaseUnit}
                        </TableCell>

                        <TableCellNumeric className="font-mono text-xs text-secondary">
                          {sp.conversionFactor}x
                        </TableCellNumeric>

                        <TableCellNumeric className="font-mono text-xs text-primary font-semibold">
                          {sp.lastPurchasePrice ? `₹${sp.lastPurchasePrice.toFixed(2)}` : "—"}
                        </TableCellNumeric>

                        <TableCell className="text-center">
                          {sp.isPreferred ? (
                            <Badge variant="success" className="text-[10px] font-mono">
                              <Star className="h-2.5 w-2.5 mr-1 fill-current" />
                              Preferred
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs text-muted">
                          {sp.leadTimeDays ? `${sp.leadTimeDays}d` : "—"}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={sp.status === "ACTIVE" ? "success" : "secondary"}
                            className="text-[10px] font-mono"
                          >
                            {sp.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Goods Receipts History */}
        {activeTab === "RECEIPTS" && (
          <div>
            {isLoadingReceipts ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !goodsReceiptsPage?.content || goodsReceiptsPage.content.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-8 w-8" />}
                title="No Goods Receipts on Record"
                description="No purchase receiving notes (GRNs) have been created for this supplier."
              />
            ) : (
              <div className="overflow-x-auto border border-subtle rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GRN Number</TableHead>
                      <TableHead>Received Date</TableHead>
                      <TableHead>Delivery Note</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Total Amount (₹)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goodsReceiptsPage.content.map((gr) => (
                      <TableRow key={gr.id} className="hover:bg-surface-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          <Link to={`/goods-receipts/${gr.id}`} className="hover:underline text-accent">
                            {gr.receiptNumber}
                          </Link>
                        </TableCell>

                        <TableCell className="font-mono text-xs text-muted">
                          {gr.receivedDate}
                        </TableCell>

                        <TableCell className="text-xs text-secondary font-mono">
                          {gr.vendorDeliveryNote || "—"}
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs text-secondary">
                          {gr.totalItems}
                        </TableCell>

                        <TableCellNumeric className="font-mono text-xs text-secondary">
                          {gr.totalReceivedQuantity}
                        </TableCellNumeric>

                        <TableCellNumeric className="font-mono text-xs font-bold text-primary">
                          ₹{gr.totalAmount.toFixed(2)}
                        </TableCellNumeric>

                        <TableCell>
                          <Badge
                            variant={gr.status === "POSTED" ? "success" : gr.status === "DRAFT" ? "warning" : "destructive"}
                            className="text-[10px] font-mono"
                          >
                            {gr.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <Link to={`/goods-receipts/${gr.id}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Link Product Modal */}
      <Dialog open={isAddProductModalOpen} onOpenChange={setIsAddProductModalOpen}>
        <DialogHeader>
          <DialogTitle>Link Catalog Product to Supplier</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleLinkProductSubmit} className="space-y-4 pt-2">
          {productModalError && (
            <Alert variant="danger" className="text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{productModalError}</span>
            </Alert>
          )}

          <FormField label="Catalog Product" required>
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              className="w-full text-xs font-medium"
            >
              <option value="">-- Select Master Product --</option>
              {catalogProductsPage?.content?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id.slice(0, 6)})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Supplier Item Code">
              <Input
                value={supplierProductCode}
                onChange={(e) => setSupplierProductCode(e.target.value)}
                placeholder="CIP-500"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Purchase Unit" required>
              <Input
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                placeholder="BOX / STRIP"
                required
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Conversion Multiplier" required helperText="Base units per pack">
              <Input
                type="number"
                min="1"
                value={conversionFactor}
                onChange={(e) => setConversionFactor(e.target.value)}
                placeholder="10"
                required
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Purchase Price (₹)">
              <Input
                type="number"
                step="any"
                min="0"
                value={lastPurchasePrice}
                onChange={(e) => setLastPurchasePrice(e.target.value)}
                placeholder="85.00"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Lead Time (Days)">
              <Input
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="3"
                className="font-mono text-xs"
              />
            </FormField>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="pref-check"
                checked={isPreferred}
                onChange={(e) => setIsPreferred(e.target.checked)}
                className="rounded border-subtle text-primary focus:ring-focus h-4 w-4"
              />
              <label htmlFor="pref-check" className="text-xs text-primary font-medium cursor-pointer">
                Preferred Supplier
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddProductModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={linkProductMutation.isPending}
              disabled={linkProductMutation.isPending || !selectedProductId}
            >
              Save Mapping
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
};
