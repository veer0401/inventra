import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  CreditCard,
  Barcode,
  RotateCcw,
  WifiOff,
  HelpCircle,
  Receipt,
  Percent,
} from "lucide-react";
import { Button, ShortcutHint } from "@inventra/ui";
import type { CreateSaleRequest, SaleResponse } from "@inventra/api-types";
import { salesApi } from "../../services/salesApi";
import { usePosCartStore } from "../../stores/posCartStore";
import { useAuthStore } from "../../stores/authStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import { PosCheckoutModal } from "../../components/pos/PosCheckoutModal";
import { PosSaleSuccessModal } from "../../components/pos/PosSaleSuccessModal";
import { CustomerSelectModal } from "../../components/customers/CustomerSelectModal";
import { formatCurrency } from "../../utils/formatters";
import { User, X } from "lucide-react";

export const PosPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, activeContext } = useAuthStore();
  const { setShortcutHelpOpen } = useShortcutStore();

  const {
    items,
    customerId,
    customerName,
    customerPhone,
    billDiscountAmount,
    addItem,
    removeItem,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    toggleItemUnit,
    setItemDiscount,
    setBillDiscount,
    setCustomer,
    clearCustomer,
    setContext,
    clearCart,
    getTotals,
  } = usePosCartStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [customerSelectModalOpen, setCustomerSelectModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync store context with cart
  useEffect(() => {
    setContext(activeContext?.businessId ?? null, activeContext?.storeId ?? null);
  }, [activeContext?.businessId, activeContext?.storeId, setContext]);

  // Online / offline monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Product Search Query
  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ["pos-products-search", activeContext?.storeId, searchQuery],
    queryFn: () =>
      salesApi.searchPosProducts({
        q: searchQuery,
        storeId: activeContext?.storeId || undefined,
        size: 24,
      }),
    enabled: Boolean(activeContext?.storeId && searchQuery.trim().length >= 1),
    staleTime: 30_000,
  });

  const productsList = searchResult?.content || [];

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: (req: CreateSaleRequest) => salesApi.checkoutSale(req),
    onSuccess: (data) => {
      setCheckoutModalOpen(false);
      setCompletedSale(data);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-batches"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products-search"] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        "Sale checkout failed. Please verify inventory and payment.";
      setCheckoutError(msg);
    },
  });

  const handleCheckoutSubmit = async (request: CreateSaleRequest) => {
    setCheckoutError(null);
    await checkoutMutation.mutateAsync(request);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        setCustomerSelectModalOpen(true);
      } else if (e.key === "F8") {
        e.preventDefault();
        if (items.length > 0 && isOnline) {
          setCheckoutModalOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length, isOnline]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (productsList.length === 1) {
        addItem(productsList[0]);
        setSearchQuery("");
      }
    }
  };

  const totals = getTotals();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Top Status & Controls Header */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-surface border-b border-border shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-text-primary">POS Terminal</h1>
              {activeContext?.storeName && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-secondary/10 text-secondary border border-secondary/20">
                  {activeContext.storeName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted">
              Cashier: <span className="text-text-secondary font-medium">{user?.fullName || "Active Operator"}</span>
            </p>
          </div>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold animate-pulse">
            <WifiOff className="h-4 w-4" />
            <span>Terminal Offline — Sales checkout disabled</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShortcutHelpOpen(true)}
            className="text-xs text-text-muted gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            <ShortcutHint shortcut="?" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/sales")}
            className="text-xs gap-1.5"
          >
            <Receipt className="h-4 w-4" />
            Sales History
          </Button>

          {items.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={clearCart}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Cart
            </Button>
          )}
        </div>
      </div>

      {/* Main Terminal Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Product Search & Browser (58%) */}
        <div className="w-[58%] flex flex-col border-r border-border bg-surface-subtle overflow-hidden">
          {/* Search Input Bar */}
          <div className="p-4 bg-surface border-b border-border">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan Barcode or Search Medicine / Generic Name / SKU... (Press F2 to focus)"
                className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-border bg-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                autoFocus
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-xs text-text-muted hover:text-text-primary rounded-md"
                  >
                    ✕
                  </button>
                )}
                <ShortcutHint shortcut="F2" />
              </div>
            </div>
          </div>

          {/* Search Results / Product Cards */}
          <div className="flex-1 overflow-y-auto p-4">
            {isSearching && (
              <div className="flex items-center justify-center h-48 text-text-muted text-xs gap-2">
                <span className="animate-spin text-primary">●</span> Searching store catalog...
              </div>
            )}

            {!isSearching && searchQuery && productsList.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                <Barcode className="h-10 w-10 text-text-muted/40 mb-2" />
                <p className="text-sm font-medium text-text-secondary">No products found</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Try another barcode or product keyword for this store
                </p>
              </div>
            )}

            {!searchQuery && (
              <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Barcode className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Barcode Scanner Ready</h3>
                <p className="text-xs text-text-muted max-w-sm mt-1">
                  Scan any product barcode or start typing product name/generic to view live FEFO batches and prices.
                </p>
                <div className="flex gap-2 mt-4">
                  <ShortcutHint shortcut="F2" className="text-xs" />
                  <span className="text-xs text-text-muted">Focus Search</span>
                  <span className="text-text-muted">•</span>
                  <ShortcutHint shortcut="F8" className="text-xs" />
                  <span className="text-xs text-text-muted">Quick Checkout</span>
                </div>
              </div>
            )}

            {/* Grid of Results */}
            <div className="grid grid-cols-2 gap-3">
              {productsList.map((product) => {
                const prodId = product.productId || (product as any).id;
                const isOutOfStock = (product.currentStock ?? 0) <= 0;
                const displayPrice =
                  product.fefoSellingPrice ??
                  product.sellingPrice ??
                  product.fefoMrp ??
                  product.mrp ??
                  0;

                return (
                  <button
                    key={prodId}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      addItem(product);
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                      isOutOfStock
                        ? "bg-surface/50 border-border/50 opacity-60 cursor-not-allowed"
                        : "bg-surface border-border hover:border-primary hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="min-w-0">
                        <div className="font-semibold text-text-primary text-sm truncate">
                          {product.name}
                        </div>
                        {product.genericName && (
                          <div className="text-[11px] text-text-muted truncate">
                            {product.genericName}
                          </div>
                        )}
                      </div>
                      {product.prescriptionRequired && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                          Rx
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-[11px] text-text-secondary flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-surface-subtle border border-border">
                        {product.dosageForm} {product.strength || ""}
                      </span>
                      <span>•</span>
                      <span>1 {product.sellingUnit}</span>
                      {product.unitsPerSellingUnit > 1 && (
                        <>
                          <span>•</span>
                          <span className="text-[10px] text-text-muted">
                            ({product.unitsPerSellingUnit} {product.baseUnit}s/pack)
                          </span>
                        </>
                      )}
                    </div>

                    {/* FEFO Batch Info */}
                    {product.fefoBatchNumber && (
                      <div className="mt-2 text-[10px] text-text-muted flex items-center justify-between">
                        <span>Lot: <span className="font-mono text-text-secondary">{product.fefoBatchNumber}</span></span>
                        {product.fefoExpiryDate && (
                          <span>Exp: <span className="text-text-secondary">{product.fefoExpiryDate}</span></span>
                        )}
                      </div>
                    )}

                    {/* Stock & Price Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                      <span className={`text-[11px] font-medium ${isOutOfStock ? "text-destructive" : "text-success"}`}>
                        {isOutOfStock ? "Out of Stock" : `Stock: ${product.currentStock} ${product.baseUnit}s`}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-primary block">
                          {formatCurrency(displayPrice)}
                        </span>
                        {product.unitsPerSellingUnit > 1 && displayPrice > 0 && (
                          <span className="text-[10px] text-text-muted block">
                            ~{formatCurrency(displayPrice / product.unitsPerSellingUnit)}/{product.baseUnit}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Cart & Settlement (42%) */}
        <div className="w-[42%] flex flex-col bg-surface overflow-hidden">
          {/* Cart Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-subtle">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-text-primary">Current Cart</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-fg">
                {totals.itemCount}
              </span>
            </div>
            <span className="text-xs text-text-muted">
              {totals.totalQuantity} total items
            </span>
          </div>

          {/* Attached Customer Pill / Bar */}
          {customerName ? (
            <div className="flex items-center justify-between px-5 py-2.5 bg-primary/5 border-b border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-text-primary truncate block">{customerName}</span>
                  <span className="text-[10px] text-text-muted font-mono">{customerPhone || "Attached"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerSelectModalOpen(true)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Change (F4)
                </button>
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="p-1 rounded text-text-muted hover:bg-surface-subtle hover:text-destructive transition-colors"
                  title="Detach customer from cart"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-5 py-2 bg-surface-subtle/40 border-b border-border text-xs text-text-secondary">
              <span className="flex items-center gap-1.5 text-text-muted">
                <User className="h-3.5 w-3.5" />
                <span>Walk-in Customer</span>
              </span>
              <button
                type="button"
                onClick={() => setCustomerSelectModalOpen(true)}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline text-xs"
              >
                <span>Attach Patient</span>
                <ShortcutHint shortcut="F4" />
              </button>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-text-muted">
                <ShoppingCart className="h-12 w-12 text-border mb-3" />
                <p className="text-sm font-medium text-text-secondary">Cart is Empty</p>
                <p className="text-xs mt-1">Scan barcode or select medicines from the left to begin</p>
              </div>
            ) : (
              items.map((item) => {
                const lineGross = item.quantity * item.unitPrice;
                const lineDisc = lineGross * (item.discountPercentage / 100);
                const lineNet = lineGross - lineDisc;

                return (
                  <div key={item.productId} className="p-3.5 hover:bg-surface-subtle transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-text-primary text-xs truncate">
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5">
                          <span>{item.sellingUnit}</span>
                          {item.batchNumber && (
                            <>
                              <span>•</span>
                              <span>Lot: {item.batchNumber}</span>
                            </>
                          )}
                          {item.prescriptionRequired && (
                            <span className="text-destructive font-bold">Rx</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-text-muted hover:text-destructive p-1 rounded transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Quantity & Pricing Controls */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-border bg-surface overflow-hidden">
                          <button
                            type="button"
                            onClick={() => decrementQuantity(item.productId)}
                            className="px-2.5 py-1 hover:bg-surface-hover text-text-secondary transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                            className="w-12 text-center text-xs font-bold font-mono focus:outline-none bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => incrementQuantity(item.productId)}
                            className="px-2.5 py-1 hover:bg-surface-hover text-text-secondary transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Unit Switcher: Full Pack vs Loose Unit */}
                        {item.unitsPerSellingUnit > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleItemUnit(item.productId)}
                            title={
                              item.isBaseUnitSale
                                ? `Switch back to full ${item.packageSellingUnit} (${item.unitsPerSellingUnit} ${item.baseUnit}s)`
                                : `Sell loose individual ${item.baseUnit}`
                            }
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all border flex items-center gap-1 ${
                              item.isBaseUnitSale
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25 shadow-xs"
                                : "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20"
                            }`}
                          >
                            <span>{item.isBaseUnitSale ? "Loose" : "Full"}</span>
                            <span className="font-normal opacity-85 truncate max-w-[70px]">
                              ({item.isBaseUnitSale ? item.baseUnit : item.packageSellingUnit})
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Line Discount Input */}
                        <div className="flex items-center gap-1 text-[11px] text-text-muted">
                          <Percent className="h-3 w-3" />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0%"
                            value={item.discountPercentage > 0 ? item.discountPercentage : ""}
                            onChange={(e) => setItemDiscount(item.productId, parseFloat(e.target.value) || 0)}
                            className="w-10 px-1 py-0.5 rounded border border-border text-center text-[10px] font-mono focus:outline-none focus:border-primary"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="text-right">
                          <div className="text-xs font-bold text-text-primary">
                            {formatCurrency(lineNet)}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {formatCurrency(item.unitPrice)} / {item.isBaseUnitSale ? item.baseUnit : item.sellingUnit}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rx Required Alert */}
          {totals.prescriptionRequired && (
            <div className="px-4 py-2 bg-warning/10 border-t border-b border-warning/20 flex items-center gap-2 text-warning text-xs font-medium shrink-0">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Prescription required — Verify doctor's physical slip</span>
            </div>
          )}

          {/* Settlement Summary Footer */}
          <div className="p-4 border-t border-border bg-surface-subtle space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.itemDiscountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Item Discounts:</span>
                  <span className="font-mono">-{formatCurrency(totals.itemDiscountAmount)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Estimated Tax:</span>
                  <span className="font-mono">+{formatCurrency(totals.taxAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-text-secondary pt-1">
                <span>Bill Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={billDiscountAmount > 0 ? billDiscountAmount : ""}
                  onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-20 px-2 py-0.5 rounded border border-border text-right text-xs font-mono bg-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Total Payable Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border shadow-xs">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Total Payable</span>
                <div className="text-xl font-black text-primary font-mono">{formatCurrency(totals.totalAmount)}</div>
              </div>
              <Button
                variant="primary"
                size="lg"
                disabled={items.length === 0 || !isOnline}
                onClick={() => setCheckoutModalOpen(true)}
                className="gap-2 px-6 shadow-md shadow-primary/20"
              >
                <CreditCard className="h-4 w-4" />
                <span>Pay & Settle</span>
                <ShortcutHint shortcut="F8" className="bg-white/20 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <PosCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onSubmit={handleCheckoutSubmit}
        isSubmitting={checkoutMutation.isPending}
        error={checkoutError}
      />

      {/* Success Modal */}
      {completedSale && (
        <PosSaleSuccessModal
          sale={completedSale}
          onNewSale={() => {
            setCompletedSale(null);
            searchInputRef.current?.focus();
          }}
          onViewDetails={() => navigate(`/sales/${completedSale.id}`)}
        />
      )}

      {/* Customer Selector Modal (F4) */}
      <CustomerSelectModal
        isOpen={customerSelectModalOpen}
        onClose={() => setCustomerSelectModalOpen(false)}
        onSelectCustomer={(cust) => setCustomer(cust)}
        selectedCustomerId={customerId}
      />
    </div>
  );
};
