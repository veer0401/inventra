import React, { useState, useEffect } from "react";
import {
  Banknote,
  QrCode,
  CreditCard,
  Building,
  Check,
  AlertCircle,
  Loader2,
  User,
  Phone,
  FileText,
  X,
} from "lucide-react";
import { Button, Input } from "@inventra/ui";
import type { PaymentMethod, CreateSaleRequest } from "@inventra/api-types";
import { usePosCartStore } from "../../stores/posCartStore";
import { formatCurrency } from "../../utils/formatters";

export interface PosCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: CreateSaleRequest) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

export const PosCheckoutModal: React.FC<PosCheckoutModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const {
    items,
    customerId,
    customerName,
    customerPhone,
    selectedPaymentMethod,
    amountTendered,
    paymentReference,
    notes,
    billDiscountAmount,
    roundOffAmount,
    activeStoreId,
    setCustomer,
    setPayment,
    getTotals,
  } = usePosCartStore();

  const totals = getTotals();
  const [tenderInput, setTenderInput] = useState<string>(
    amountTendered > 0 ? String(amountTendered) : String(totals.totalAmount)
  );

  useEffect(() => {
    if (isOpen) {
      if (selectedPaymentMethod === "CASH" && amountTendered === 0) {
        setTenderInput(String(totals.totalAmount));
        setPayment("CASH", totals.totalAmount);
      }
    }
  }, [isOpen, totals.totalAmount, selectedPaymentMethod]);

  const handleTenderChange = (valStr: string) => {
    setTenderInput(valStr);
    const num = parseFloat(valStr) || 0;
    setPayment(selectedPaymentMethod, num);
  };

  const handleQuickTender = (amt: number) => {
    setTenderInput(String(amt));
    setPayment(selectedPaymentMethod, amt);
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    if (method === "CASH") {
      setPayment(method, totals.totalAmount);
      setTenderInput(String(totals.totalAmount));
    } else {
      setPayment(method, totals.totalAmount);
    }
  };

  const handleCompleteSale = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || !activeStoreId) return;

    const tenderedNum = selectedPaymentMethod === "CASH" ? parseFloat(tenderInput) || totals.totalAmount : totals.totalAmount;

    const payload: CreateSaleRequest = {
      storeId: activeStoreId,
      saleDate: new Date().toISOString().split("T")[0],
      customerId: customerId || undefined,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      discountAmount: billDiscountAmount > 0 ? billDiscountAmount : undefined,
      roundOffAmount: roundOffAmount !== 0 ? roundOffAmount : undefined,
      notes: notes.trim() || undefined,
      idempotencyKey: `POS-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      lines: items.map((item) => {
        const prodId = item.productId || (item as any).id;
        if (!prodId) {
          throw new Error(`Missing productId for cart item: ${item.productName}`);
        }
        return {
          productId: prodId,
          batchId: item.batchId || undefined,
          sellingUnit: item.sellingUnit,
          quantity: item.quantity,
          discountPercentage: item.discountPercentage > 0 ? item.discountPercentage : undefined,
        };
      }),
      payments: [
        {
          paymentMethod: selectedPaymentMethod,
          amount: totals.totalAmount,
          tenderedAmount: selectedPaymentMethod === "CASH" ? tenderedNum : undefined,
          transactionReference: paymentReference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      ],
    };

    await onSubmit(payload);
  };

  if (!isOpen) return null;

  const paymentOptions: { method: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { method: "CASH", label: "Cash", icon: <Banknote className="h-4 w-4" /> },
    { method: "UPI", label: "UPI / QR", icon: <QrCode className="h-4 w-4" /> },
    { method: "CARD", label: "Card / POS", icon: <CreditCard className="h-4 w-4" /> },
    { method: "CREDIT", label: "Store Credit", icon: <Building className="h-4 w-4" /> },
    { method: "OTHER", label: "Other", icon: <FileText className="h-4 w-4" /> },
  ];

  const quickAmounts = [totals.totalAmount, 100, 200, 500, 1000, 2000]
    .filter((amt, idx, arr) => arr.indexOf(amt) === idx && amt >= totals.totalAmount)
    .slice(0, 5);

  const tenderedValue = parseFloat(tenderInput) || 0;
  const changeDue = selectedPaymentMethod === "CASH" && tenderedValue > totals.totalAmount
    ? tenderedValue - totals.totalAmount
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Payment & Checkout</h2>
            <p className="text-xs text-text-secondary">
              {totals.itemCount} items • {totals.totalQuantity} total qty
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleCompleteSale} className="p-6 space-y-5">
          {/* Amount Due Banner */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Total Payable</span>
              <div className="text-2xl font-black text-primary">{formatCurrency(totals.totalAmount)}</div>
            </div>
            {totals.prescriptionRequired && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Rx Verified
              </span>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentOptions.map((opt) => {
                const isSelected = selectedPaymentMethod === opt.method;
                return (
                  <button
                    key={opt.method}
                    type="button"
                    onClick={() => handlePaymentMethodSelect(opt.method)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]"
                        : "bg-surface-subtle text-text-secondary border-border hover:bg-surface-hover"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tender Details */}
          {selectedPaymentMethod === "CASH" && (
            <div className="space-y-3 p-4 rounded-xl bg-surface-subtle border border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary">Amount Tendered (₹)</label>
                {changeDue > 0 && (
                  <span className="text-xs font-bold text-success">
                    Change Due: {formatCurrency(changeDue)}
                  </span>
                )}
              </div>
              <Input
                type="number"
                step="any"
                min="0"
                value={tenderInput}
                onChange={(e) => handleTenderChange(e.target.value)}
                className="text-lg font-bold font-mono"
                autoFocus
              />

              {/* Quick Cash Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickTender(amt)}
                    className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-surface border border-border hover:border-primary hover:text-primary transition-all"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* UPI / Card Reference */}
          {(selectedPaymentMethod === "UPI" || selectedPaymentMethod === "CARD") && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Transaction / Reference ID (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. UPI-REF-892348"
                value={paymentReference}
                onChange={(e) => setPayment(selectedPaymentMethod, totals.totalAmount, e.target.value)}
              />
            </div>
          )}

          {/* Customer Information (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Customer Name
              </label>
              <Input
                type="text"
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={(e) => setCustomer(e.target.value, customerPhone)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Phone Number
              </label>
              <Input
                type="text"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomer(customerName, e.target.value)}
              />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel (Esc)
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || items.length === 0}
              className="gap-2 px-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Sale...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Complete Sale (Enter)
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
