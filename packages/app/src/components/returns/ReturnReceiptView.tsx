import React from "react";
import { Printer, X } from "lucide-react";
import type { SaleReturnResponse, SaleResponse } from "@inventra/api-types";

export interface ReturnReceiptViewProps {
  saleReturn: SaleReturnResponse;
  originalSale?: SaleResponse | null;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeGstin?: string;
  onClose?: () => void;
}

export const ReturnReceiptView: React.FC<ReturnReceiptViewProps> = ({
  saleReturn,
  originalSale,
  storeName = "INVENTRA PHARMACY",
  storeAddress = "Store Branch 1, Medical Complex",
  storePhone,
  storeGstin,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const refund = saleReturn.refunds?.[0];

  return (
    <div className="flex flex-col items-center">
      {/* Controls - Hidden during print */}
      <div className="flex items-center gap-3 mb-4 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg shadow hover:opacity-90 transition-opacity"
        >
          <Printer className="h-4 w-4" />
          <span>Print Return Credit Note</span>
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-subtle"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        )}
      </div>

      {/* 80mm Thermal Receipt Paper Container */}
      <div
        className="w-[80mm] min-h-[120mm] bg-white text-black p-4 font-mono text-[11px] leading-tight border border-border/80 shadow-md print:border-none print:shadow-none print:m-0 print:p-2"
        id="thermal-return-receipt"
      >
        {/* Header */}
        <div className="text-center pb-2 border-b border-black border-dashed">
          <h2 className="text-sm font-bold tracking-wider uppercase">{storeName}</h2>
          {storeAddress && <p className="text-[10px] text-gray-700 mt-0.5">{storeAddress}</p>}
          {storePhone && <p className="text-[10px] text-gray-700">Phone: {storePhone}</p>}
          {storeGstin && <p className="text-[10px] font-bold mt-0.5">GSTIN: {storeGstin}</p>}
          <div className="my-1.5 border-t border-black/40 border-dotted pt-1">
            <span className="text-[11px] font-bold uppercase tracking-widest bg-black text-white px-1.5 py-0.5">
              *** CREDIT NOTE / RETURN ***
            </span>
          </div>
        </div>

        {/* Transaction Metadata */}
        <div className="py-2 border-b border-black border-dashed space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="font-bold">Return #:</span>
            <span>{saleReturn.returnNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{saleReturn.returnDate} {new Date(saleReturn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span>Original Sale #:</span>
            <span>{originalSale?.saleNumber || "Ref: " + saleReturn.saleId.slice(0, 8)}</span>
          </div>
          {originalSale?.invoiceNumber && (
            <div className="flex justify-between">
              <span>Original Invoice:</span>
              <span>{originalSale.invoiceNumber}</span>
            </div>
          )}
          {originalSale?.customerName && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-semibold">{originalSale.customerName}</span>
            </div>
          )}
          {originalSale?.customerPhone && (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{originalSale.customerPhone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Reason:</span>
            <span className="truncate max-w-[150px]">{saleReturn.reason}</span>
          </div>
        </div>

        {/* Returned Items Table */}
        <div className="py-2 border-b border-black border-dashed">
          <div className="grid grid-cols-12 font-bold text-[10px] pb-1 border-b border-black/30 mb-1">
            <span className="col-span-6">Item</span>
            <span className="col-span-2 text-right">Qty</span>
            <span className="col-span-4 text-right">Amount</span>
          </div>

          <div className="space-y-1.5 text-[10px]">
            {saleReturn.lines?.map((line, idx) => {
              const origLine = originalSale?.lines?.find((l) => l.id === line.saleLineId);
              const productName = origLine?.productName || `Item #${idx + 1}`;
              const lotNumber = line.allocations?.[0]?.batchId?.slice(0, 6) || "LOT";

              return (
                <div key={line.id || idx}>
                  <div className="grid grid-cols-12">
                    <span className="col-span-6 font-semibold truncate">{productName}</span>
                    <span className="col-span-2 text-right font-mono">{line.quantity}</span>
                    <span className="col-span-4 text-right font-mono font-semibold">
                      ₹{line.lineTotal?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-600 pl-1">
                    <span>Lot: {lotNumber} • @ ₹{line.unitRefundPrice?.toFixed(2)} + {line.taxRate}%</span>
                    <span>Cond: {line.allocations?.[0]?.stockCondition || "RESTOCKED"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="py-2 border-b border-black border-dashed space-y-1 text-[11px]">
          <div className="flex justify-between text-[10px]">
            <span>Returned Subtotal:</span>
            <span>₹{saleReturn.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Tax Refunded:</span>
            <span>₹{saleReturn.taxAmount?.toFixed(2)}</span>
          </div>
          {saleReturn.roundOffAmount !== 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Round Off:</span>
              <span>₹{saleReturn.roundOffAmount?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-bold pt-1 border-t border-black/40">
            <span>TOTAL REFUND:</span>
            <span>₹{saleReturn.totalRefundAmount?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-700">
            <span>Refund Method:</span>
            <span className="font-semibold uppercase">{refund?.refundMethod || "CASH"}</span>
          </div>
          {refund?.transactionReference && (
            <div className="flex justify-between text-[9px] text-gray-600">
              <span>Reference:</span>
              <span>{refund.transactionReference}</span>
            </div>
          )}
        </div>

        {/* Footer Remarks */}
        <div className="pt-2 text-center text-[9px] text-gray-600 space-y-1">
          <p>Credit note issued for returned merchandise.</p>
          <p>Stock restored in accordance with pharmacy return policy.</p>
          <div className="pt-4 flex justify-between text-[9px] border-t border-black/20 mt-2">
            <span>Customer Sign: ____________</span>
            <span>Cashier Sign: ____________</span>
          </div>
        </div>
      </div>
    </div>
  );
};
