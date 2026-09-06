import React, { useState } from "react";
import { CheckCircle2, Printer, PlusCircle, FileText } from "lucide-react";
import { Button } from "@inventra/ui";
import type { SaleResponse, ReceiptResponse } from "@inventra/api-types";
import { formatCurrency } from "../../utils/formatters";
import { PosReceiptView } from "./PosReceiptView";
import { salesApi } from "../../services/salesApi";

export interface PosSaleSuccessModalProps {
  sale: SaleResponse;
  onNewSale: () => void;
  onViewDetails?: () => void;
}

export const PosSaleSuccessModal: React.FC<PosSaleSuccessModalProps> = ({
  sale,
  onNewSale,
  onViewDetails,
}) => {
  const [receiptData, setReceiptData] = useState<ReceiptResponse | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const handleFetchAndPrintReceipt = async () => {
    try {
      setIsLoadingReceipt(true);
      const data = await salesApi.getReceipt(sale.id);
      setReceiptData(data);
    } catch (err) {
      console.error("Failed to load receipt:", err);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  if (receiptData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <PosReceiptView receipt={receiptData} onClose={() => setReceiptData(null)} />
      </div>
    );
  }

  const primaryPayment = sale.payments?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden p-6 text-center space-y-5 animate-scale-up">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center text-success">
          <CheckCircle2 className="h-10 w-10 animate-bounce" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-black text-text-primary">Sale Completed!</h2>
          <p className="text-xs text-text-muted mt-1 font-mono">
            {sale.saleNumber} • {sale.invoiceNumber}
          </p>
        </div>

        {/* Summary Card */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2 text-xs">
          <div className="flex justify-between text-text-secondary">
            <span>Total Payable:</span>
            <span className="font-bold text-text-primary text-sm">{formatCurrency(sale.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Paid ({primaryPayment?.paymentMethod || "CASH"}):</span>
            <span className="font-semibold text-text-primary">{formatCurrency(sale.paidAmount)}</span>
          </div>
          {sale.changeAmount > 0 && (
            <div className="flex justify-between text-primary font-bold pt-1 border-t border-border">
              <span>Change Given:</span>
              <span>{formatCurrency(sale.changeAmount)}</span>
            </div>
          )}
          {sale.customerName && (
            <div className="flex justify-between text-text-muted pt-1 border-t border-border">
              <span>Customer:</span>
              <span className="font-medium text-text-primary">{sale.customerName}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full gap-2 justify-center"
            onClick={onNewSale}
            autoFocus
          >
            <PlusCircle className="h-4 w-4" />
            Start Next Sale (Enter)
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              className="flex-1 gap-1.5 justify-center"
              onClick={handleFetchAndPrintReceipt}
              disabled={isLoadingReceipt}
            >
              <Printer className="h-4 w-4" />
              {isLoadingReceipt ? "Loading..." : "Print Receipt"}
            </Button>

            {onViewDetails && (
              <Button
                variant="ghost"
                size="md"
                className="flex-1 gap-1.5 justify-center"
                onClick={onViewDetails}
              >
                <FileText className="h-4 w-4" />
                View Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
