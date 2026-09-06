import React, { useState, useId } from "react";
import {
  Printer,
  X,
  Sliders,
  RotateCcw,
  Check,
  Store,
  Receipt,
  Layout,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@inventra/ui";
import type { ReceiptResponse } from "@inventra/api-types";
import { formatCurrency } from "../../utils/formatters";

export interface ReceiptCustomization {
  storeName: string;
  tagline: string;
  showAddress: boolean;
  address: string;
  showPhone: boolean;
  phone: string;
  showGstin: boolean;
  gstin: string;
  showDrugLicense: boolean;
  drugLicense: string;
  paperWidth: "80mm" | "58mm";
  density: "standard" | "compact";
  showBatchAndExpiry: boolean;
  showCustomer: boolean;
  showCashier: boolean;
  showInvoiceNo: boolean;
  footerGreeting: string;
  returnPolicy: string;
  showInventraBranding: boolean;
}

export interface PosReceiptViewProps {
  receipt: ReceiptResponse;
  onClose?: () => void;
}

export const PosReceiptView: React.FC<PosReceiptViewProps> = ({ receipt, onClose }) => {
  const storeStorageKey = `inventra_receipt_customization_${receipt.storeId || receipt.storeName || "default"}`;

  const getDefaultCustomization = (): ReceiptCustomization => ({
    storeName: receipt.storeName || receipt.pharmacyName || "INVENTRA PHARMACY",
    tagline:
      receipt.pharmacyName && receipt.pharmacyName !== receipt.storeName
        ? receipt.pharmacyName
        : "Healthcare & Surgical Store",
    showAddress: Boolean(receipt.storeAddress),
    address: receipt.storeAddress || "",
    showPhone: Boolean(receipt.storePhone),
    phone: receipt.storePhone || "",
    showGstin: Boolean(receipt.gstin),
    gstin: receipt.gstin || "",
    showDrugLicense: Boolean(receipt.drugLicenseNumber),
    drugLicense: receipt.drugLicenseNumber || "",
    paperWidth: "80mm",
    density: "standard",
    showBatchAndExpiry: true,
    showCustomer: true,
    showCashier: true,
    showInvoiceNo: true,
    footerGreeting: receipt.footerNote || "Thank you for choosing us! Get well soon.",
    returnPolicy: "Goods once sold cannot be returned without original receipt.",
    showInventraBranding: true,
  });

  const [customization, setCustomization] = useState<ReceiptCustomization>(() => {
    try {
      const saved = localStorage.getItem(storeStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...getDefaultCustomization(), ...parsed };
      }
    } catch {
      // fallback to defaults
    }
    return getDefaultCustomization();
  });

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const styleId = useId();

  // Save changes to localStorage
  const handleSaveAsDefault = () => {
    try {
      localStorage.setItem(storeStorageKey, JSON.stringify(customization));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error("Failed to save receipt customization:", e);
    }
  };

  const handleResetDefaults = () => {
    try {
      localStorage.removeItem(storeStorageKey);
    } catch {
      // ignore
    }
    setCustomization(getDefaultCustomization());
  };

  const handlePrint = () => {
    window.print();
  };

  const is58mm = customization.paperWidth === "58mm";
  const isCompact = customization.density === "compact";

  return (
    <>
      {/* Print-specific style injection */}
      <style key={styleId}>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #thermal-receipt-paper,
            #thermal-receipt-paper * {
              visibility: visible !important;
            }
            #thermal-receipt-paper {
              position: fixed !important;
              left: 50% !important;
              top: 0 !important;
              transform: translateX(-50%) !important;
              width: ${is58mm ? "58mm" : "80mm"} !important;
              max-width: ${is58mm ? "58mm" : "80mm"} !important;
              margin: 0 !important;
              padding: 2mm 3mm !important;
              box-shadow: none !important;
              border: none !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              page-break-after: always;
            }
            @page {
              size: ${is58mm ? "58mm" : "80mm"} auto;
              margin: 0;
            }
          }
        `}
      </style>

      <div
        className={`flex flex-col bg-surface rounded-2xl border border-border overflow-hidden shadow-2xl transition-all duration-300 ${
          isCustomizing ? "w-full max-w-5xl h-[90vh]" : "w-full max-w-xl max-h-[92vh]"
        } mx-auto`}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-surface-subtle print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                Thermal Receipt Preview
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase">
                  {customization.paperWidth}
                </span>
              </h3>
              <p className="text-[11px] text-text-muted">
                {customization.storeName} • {receipt.saleNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isCustomizing ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsCustomizing(!isCustomizing)}
              className="gap-1.5 text-xs"
            >
              <Sliders className="h-3.5 w-3.5 text-primary" />
              {isCustomizing ? "Hide Settings" : "Customize Receipt"}
            </Button>

            <Button variant="primary" size="sm" onClick={handlePrint} className="gap-1.5 text-xs shadow-md">
              <Printer className="h-3.5 w-3.5" />
              Print Thermal Receipt
            </Button>

            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content Area: Side-by-side or Centered Preview */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Customization Drawer / Sidebar */}
          {isCustomizing && (
            <div className="w-80 md:w-96 border-r border-border bg-surface flex flex-col shrink-0 print:hidden overflow-y-auto">
              <div className="p-4 border-b border-border bg-surface-subtle/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Receipt Settings</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[11px] text-text-muted hover:text-danger flex items-center gap-1 transition-colors"
                  title="Reset to original values"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>

              <div className="p-4 space-y-5 text-xs">
                {/* Store Header Section */}
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    Store Header Info
                  </label>

                  <div>
                    <span className="text-[11px] text-text-secondary font-medium block mb-1">Store Name (Primary Title)</span>
                    <input
                      type="text"
                      value={customization.storeName}
                      onChange={(e) => setCustomization({ ...customization, storeName: e.target.value })}
                      placeholder="e.g. Apollo Pharmacy #04"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text-primary font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-text-secondary font-medium block mb-1">Subtitle / Tagline</span>
                    <input
                      type="text"
                      value={customization.tagline}
                      onChange={(e) => setCustomization({ ...customization, tagline: e.target.value })}
                      placeholder="e.g. Healthcare & Surgical Store"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-text-secondary font-medium">Store Address</span>
                      <input
                        type="checkbox"
                        checked={customization.showAddress}
                        onChange={(e) => setCustomization({ ...customization, showAddress: e.target.checked })}
                        className="rounded text-primary focus:ring-0 cursor-pointer"
                        title="Show/Hide address"
                      />
                    </div>
                    {customization.showAddress && (
                      <input
                        type="text"
                        value={customization.address}
                        onChange={(e) => setCustomization({ ...customization, address: e.target.value })}
                        placeholder="e.g. Shop 12, Park Road, Metro Market"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-text-secondary font-medium">Contact Phone</span>
                      <input
                        type="checkbox"
                        checked={customization.showPhone}
                        onChange={(e) => setCustomization({ ...customization, showPhone: e.target.checked })}
                        className="rounded text-primary focus:ring-0 cursor-pointer"
                        title="Show/Hide phone"
                      />
                    </div>
                    {customization.showPhone && (
                      <input
                        type="text"
                        value={customization.phone}
                        onChange={(e) => setCustomization({ ...customization, phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-text-secondary font-medium">GSTIN</span>
                        <input
                          type="checkbox"
                          checked={customization.showGstin}
                          onChange={(e) => setCustomization({ ...customization, showGstin: e.target.checked })}
                          className="rounded text-primary focus:ring-0 cursor-pointer"
                        />
                      </div>
                      {customization.showGstin && (
                        <input
                          type="text"
                          value={customization.gstin}
                          onChange={(e) => setCustomization({ ...customization, gstin: e.target.value })}
                          placeholder="GSTIN"
                          className="w-full px-2 py-1 text-xs rounded border border-border bg-surface text-text-primary font-mono"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-text-secondary font-medium">D.L. No.</span>
                        <input
                          type="checkbox"
                          checked={customization.showDrugLicense}
                          onChange={(e) => setCustomization({ ...customization, showDrugLicense: e.target.checked })}
                          className="rounded text-primary focus:ring-0 cursor-pointer"
                        />
                      </div>
                      {customization.showDrugLicense && (
                        <input
                          type="text"
                          value={customization.drugLicense}
                          onChange={(e) => setCustomization({ ...customization, drugLicense: e.target.value })}
                          placeholder="Drug License"
                          className="w-full px-2 py-1 text-xs rounded border border-border bg-surface text-text-primary font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Paper & Density Section */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <label className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                    Format & Dimensions
                  </label>

                  <div>
                    <span className="text-[11px] text-text-secondary font-medium block mb-1">Paper Roll Width</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomization({ ...customization, paperWidth: "80mm" })}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          customization.paperWidth === "80mm"
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-text-secondary hover:bg-surface-subtle"
                        }`}
                      >
                        80mm (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomization({ ...customization, paperWidth: "58mm" })}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          customization.paperWidth === "58mm"
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-text-secondary hover:bg-surface-subtle"
                        }`}
                      >
                        58mm (Compact)
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-text-secondary font-medium block mb-1">Font Density</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomization({ ...customization, density: "standard" })}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                          customization.density === "standard"
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-text-secondary hover:bg-surface-subtle"
                        }`}
                      >
                        Standard Spacing
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomization({ ...customization, density: "compact" })}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                          customization.density === "compact"
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-text-secondary hover:bg-surface-subtle"
                        }`}
                      >
                        Compact (Paper Saver)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <label className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Content Visibility
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface-subtle cursor-pointer">
                    <span className="text-text-secondary">Show Batch & Expiry Date</span>
                    <input
                      type="checkbox"
                      checked={customization.showBatchAndExpiry}
                      onChange={(e) => setCustomization({ ...customization, showBatchAndExpiry: e.target.checked })}
                      className="rounded text-primary focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface-subtle cursor-pointer">
                    <span className="text-text-secondary">Show Customer Info</span>
                    <input
                      type="checkbox"
                      checked={customization.showCustomer}
                      onChange={(e) => setCustomization({ ...customization, showCustomer: e.target.checked })}
                      className="rounded text-primary focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface-subtle cursor-pointer">
                    <span className="text-text-secondary">Show Cashier Name</span>
                    <input
                      type="checkbox"
                      checked={customization.showCashier}
                      onChange={(e) => setCustomization({ ...customization, showCashier: e.target.checked })}
                      className="rounded text-primary focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded hover:bg-surface-subtle cursor-pointer">
                    <span className="text-text-secondary">Show Invoice Number</span>
                    <input
                      type="checkbox"
                      checked={customization.showInvoiceNo}
                      onChange={(e) => setCustomization({ ...customization, showInvoiceNo: e.target.checked })}
                      className="rounded text-primary focus:ring-0"
                    />
                  </label>
                </div>

                {/* Footer & Branding Section */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <label className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Footer & Branding
                  </label>

                  <div>
                    <span className="text-[11px] text-text-secondary font-medium block mb-1">Customer Greeting</span>
                    <input
                      type="text"
                      value={customization.footerGreeting}
                      onChange={(e) => setCustomization({ ...customization, footerGreeting: e.target.value })}
                      placeholder="e.g. Thank you! Get well soon."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-text-secondary font-medium block mb-1">Return / Terms Policy</span>
                    <textarea
                      value={customization.returnPolicy}
                      onChange={(e) => setCustomization({ ...customization, returnPolicy: e.target.value })}
                      rows={2}
                      placeholder="Policy note..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <label className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle border border-border cursor-pointer">
                    <div>
                      <span className="font-semibold text-text-primary block">Subtle Inventra POS</span>
                      <span className="text-[10px] text-text-muted">Branding credit at bottom</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={customization.showInventraBranding}
                      onChange={(e) => setCustomization({ ...customization, showInventraBranding: e.target.checked })}
                      className="rounded text-primary focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Save button */}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveAsDefault}
                    className="w-full justify-center gap-2 shadow"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="h-4 w-4 text-white" />
                        Saved for this Terminal!
                      </>
                    ) : (
                      <>Save as Store Default</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Live Receipt Paper Preview Container */}
          <div className="flex-1 bg-neutral-900/10 dark:bg-black/40 p-4 md:p-6 overflow-y-auto flex items-start justify-center">
            {/* The Actual Thermal Receipt Paper */}
            <div
              id="thermal-receipt-paper"
              className={`bg-white text-black font-mono shadow-2xl rounded-sm border border-neutral-300 relative transition-all duration-200 ${
                is58mm ? "w-[280px] text-[10px]" : "w-[380px] text-[11px]"
              } ${isCompact ? "p-3 leading-tight" : "p-5 leading-normal"}`}
              style={{ color: "#000000", backgroundColor: "#ffffff" }}
            >
              {/* Paper Top Serration Accent (screen only) */}
              <div
                className="absolute -top-1 left-0 right-0 h-1 bg-white print:hidden"
                style={{
                  backgroundImage: "radial-gradient(circle, transparent 50%, #ffffff 50%)",
                  backgroundSize: "6px 6px",
                }}
              />

              {/* 1. STORE HEADER (Prominent Store Name!) */}
              <div className="text-center pb-2.5 border-b border-dashed border-black/80">
                <h1
                  className={`font-black uppercase tracking-tight text-neutral-950 leading-tight ${
                    is58mm ? "text-base" : "text-lg"
                  }`}
                >
                  {customization.storeName || "INVENTRA PHARMACY"}
                </h1>

                {customization.tagline && (
                  <p className="text-[10px] font-medium tracking-wide uppercase text-neutral-700 mt-0.5">
                    {customization.tagline}
                  </p>
                )}

                {customization.showAddress && customization.address && (
                  <p className="text-[10px] text-neutral-800 mt-0.5 leading-snug">{customization.address}</p>
                )}

                {customization.showPhone && customization.phone && (
                  <p className="text-[10px] text-neutral-800">Tel: {customization.phone}</p>
                )}

                {(customization.showGstin && customization.gstin) || (customization.showDrugLicense && customization.drugLicense) ? (
                  <div className="flex flex-wrap justify-center gap-x-2 text-[9px] text-neutral-700 mt-0.5">
                    {customization.showGstin && customization.gstin && (
                      <span>GST: {customization.gstin}</span>
                    )}
                    {customization.showDrugLicense && customization.drugLicense && (
                      <span>DL: {customization.drugLicense}</span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* 2. RECEIPT METADATA */}
              <div className={`py-2 border-b border-dashed border-black/80 ${isCompact ? "space-y-0.5" : "space-y-1"}`}>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Sale No:</span>
                  <span className="font-bold">{receipt.saleNumber}</span>
                </div>

                {customization.showInvoiceNo && receipt.invoiceNumber && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Invoice:</span>
                    <span>{receipt.invoiceNumber}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-neutral-600">Date:</span>
                  <span>{receipt.date}</span>
                </div>

                {customization.showCashier && receipt.cashierName && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Cashier:</span>
                    <span>{receipt.cashierName}</span>
                  </div>
                )}

                {customization.showCustomer && receipt.customerName && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Customer:</span>
                    <span className="font-medium">
                      {receipt.customerName}
                      {receipt.customerPhone ? ` (${receipt.customerPhone})` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. LINE ITEMS TABLE */}
              <div className="py-2">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black text-[10px] font-bold uppercase tracking-wider">
                      <th className="pb-1">Item</th>
                      <th className="pb-1 text-center">Qty</th>
                      <th className="pb-1 text-right">Price</th>
                      <th className="pb-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20">
                    {receipt.items?.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-1 pr-1">
                          <div className="font-semibold text-neutral-950 leading-tight">
                            {item.name}
                          </div>
                          {customization.showBatchAndExpiry && item.batch && (
                            <div className="text-[9px] text-neutral-600">
                              B:{item.batch} {item.expiry ? `| Exp:${item.expiry}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="py-1 text-center font-sans">{item.quantity}</td>
                        <td className="py-1 text-right font-sans">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-1 text-right font-bold font-sans">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4. TOTALS & FINANCIAL SUMMARY */}
              <div
                className={`pt-1.5 border-t border-dashed border-black/80 ${
                  isCompact ? "space-y-0.5" : "space-y-1"
                }`}
              >
                <div className="flex justify-between text-neutral-700">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>

                {receipt.discount > 0 && (
                  <div className="flex justify-between text-neutral-900 font-medium">
                    <span>Discount:</span>
                    <span>-{formatCurrency(receipt.discount)}</span>
                  </div>
                )}

                {receipt.tax > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>Tax (GST):</span>
                    <span>+{formatCurrency(receipt.tax)}</span>
                  </div>
                )}

                {receipt.roundOff !== 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Round Off:</span>
                    <span>{receipt.roundOff > 0 ? "+" : ""}{formatCurrency(receipt.roundOff)}</span>
                  </div>
                )}

                {/* Prominent Double-Bordered Total Amount */}
                <div className="border-t-2 border-b-2 border-black py-1.5 my-1 flex justify-between font-black text-sm tracking-tight text-neutral-950">
                  <span>TOTAL AMOUNT:</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>

                <div className="flex justify-between text-neutral-800">
                  <span>Paid ({receipt.paymentMethod}):</span>
                  <span>{formatCurrency(receipt.paid)}</span>
                </div>

                {receipt.change > 0 && (
                  <div className="flex justify-between font-bold text-neutral-950">
                    <span>Change Due:</span>
                    <span>{formatCurrency(receipt.change)}</span>
                  </div>
                )}
              </div>

              {/* 5. FOOTER & POLICIES */}
              <div className="text-center pt-3 mt-3 border-t border-dashed border-black/80 space-y-1 text-[10px]">
                {customization.footerGreeting && (
                  <p className="font-semibold text-neutral-900">{customization.footerGreeting}</p>
                )}

                {customization.returnPolicy && (
                  <p className="text-[9px] text-neutral-600 leading-snug">{customization.returnPolicy}</p>
                )}

                {/* 6. SUBTLE INVENTRA POS FOOTER BRANDING */}
                {customization.showInventraBranding && (
                  <div className="pt-2 mt-2 border-t border-dotted border-neutral-300">
                    <p className="text-[9px] tracking-widest text-neutral-500 uppercase font-mono">
                      — Powered by Inventra POS —
                    </p>
                  </div>
                )}
              </div>

              {/* Paper Bottom Serration Accent (screen only) */}
              <div
                className="absolute -bottom-1 left-0 right-0 h-1 bg-white print:hidden"
                style={{
                  backgroundImage: "radial-gradient(circle, transparent 50%, #ffffff 50%)",
                  backgroundSize: "6px 6px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
