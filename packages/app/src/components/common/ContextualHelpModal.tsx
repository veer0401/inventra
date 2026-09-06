import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Truck,
  PackageCheck,
  Boxes,
  ShoppingCart,
  RotateCcw,
  ArrowLeftRight,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@inventra/ui";

export type HelpTopic =
  | "purchase-orders"
  | "goods-receipts"
  | "inventory"
  | "pos"
  | "returns"
  | "transfers"
  | "reports";

export interface ContextualHelpModalProps {
  topic: HelpTopic;
  trigger?: React.ReactNode;
}

interface TopicContent {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  whatItIs: string;
  keySteps: { title: string; desc: string }[];
  proTip: string;
}

const TOPIC_DETAILS: Record<HelpTopic, TopicContent> = {
  "purchase-orders": {
    title: "How Purchase Orders (PO) Work",
    subtitle: "Ordering medicine inventory from pharmaceutical distributors.",
    icon: Truck,
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    whatItIs:
      "A Purchase Order (PO) is an official intent to buy medicines from a distributor. It locks in the medicines, ordered quantities, expected purchase rates, and delivery deadlines.",
    keySteps: [
      {
        title: "1. Create & Select Distributor",
        desc: "Choose your registered medicine supplier and set the expected delivery date.",
      },
      {
        title: "2. Add Medicines & Pack Quantities",
        desc: "Pick medicines from your catalog. Specify order quantities (e.g. 50 boxes) and expected purchase cost.",
      },
      {
        title: "3. Issue Order to Supplier",
        desc: "Click 'Issue Order'. The PO transitions from DRAFT to ISSUED. You can download the PDF or send it via WhatsApp/Email to your distributor rep.",
      },
      {
        title: "4. What to Do Next?",
        desc: "Wait for the distributor delivery truck. When the boxes arrive at your pharmacy, go to 'Goods Receipts' to inspect and receive the physical stock.",
      },
    ],
    proTip:
      "Always check distributor credit payment terms (e.g. 21 days credit) so your accounts payable balance stays organized.",
  },
  "goods-receipts": {
    title: "Goods Receipt (GRN) — What to Do When Delivery Arrives",
    subtitle: "The crucial pharmacy inward inspection checklist before stocking shelves.",
    icon: PackageCheck,
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    whatItIs:
      "A Goods Receipt Note (GRN) is the official verification that physical stock has entered your pharmacy. Creating a GRN is the EXACT moment inventory counts increase, batches are born, and distributor bills are matched.",
    keySteps: [
      {
        title: "1. Unpack & Verify Against Delivery Challan",
        desc: "Open the distributor's boxes. Check that the medicine names and physical quantities match what you ordered.",
      },
      {
        title: "2. Inspect Batch Numbers & Expiry Dates",
        desc: "Read the batch number and expiry printed on the blister/box. Reject any short-expiry medicines (e.g. expiring within 3 months) or damaged bottles.",
      },
      {
        title: "3. Record Free / Bonus Units & Actual Cost",
        desc: "Distributors often give '10 + 1 free' deals. Record the free units and the actual purchase price per pack from the supplier invoice.",
      },
      {
        title: "4. Set Retail Selling Price (MRP)",
        desc: "Verify or update the customer selling price and margin before medicines hit the counter.",
      },
      {
        title: "5. Click 'Post Goods Receipt'",
        desc: "Stock is instantly available for sale at your POS counter, batch barcodes are activated, and your supplier ledger is updated.",
      },
    ],
    proTip:
      "Never put medicines on shelves before posting the GRN, otherwise your POS cashiers will encounter 'Out of Stock' errors.",
  },
  "inventory": {
    title: "Inventory, Batches & FEFO Expiry Rules",
    subtitle: "How Inventra prevents expired medicine financial losses automatically.",
    icon: Boxes,
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    whatItIs:
      "Unlike regular retail, pharmacy inventory is organized into discrete BATCHES, each with an expiry date. Inventra enforces First-Expiry First-Out (FEFO) across all sales.",
    keySteps: [
      {
        title: "1. What is FEFO?",
        desc: "When a customer buys Dolo 650, Inventra automatically selects the batch that expires earliest, ensuring older stock is sold before newer stock.",
      },
      {
        title: "2. Color-Coded Expiry Warnings",
        desc: "Red badges alert you to medicines expiring within 30 days. Orange badges warn of 60-day expiry. Return them to distributors for full credit before they expire!",
      },
      {
        title: "3. Stock Movements & Audit Log",
        desc: "Every single tablet entering or leaving your store is recorded with timestamps, user names, and transaction IDs.",
      },
      {
        title: "4. Damaged / Quarantined Stock",
        desc: "If a bottle breaks or gets contaminated, use 'Stock Adjustment' to mark it as damaged so it is removed from active counter sales.",
      },
    ],
    proTip:
      "Run an Expiry Forecast report once a month to return near-expiry stock to distributors for credit notes.",
  },
  "pos": {
    title: "POS Counter Billing & Prescription Safety",
    subtitle: "Fast checkout, barcode scanning, doctor Rx alerts, and split payments.",
    icon: ShoppingCart,
    badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    whatItIs:
      "The Point of Sale (POS) is your frontline billing counter. It connects your barcode gun, customer records, batch deduction, and instant invoice printing.",
    keySteps: [
      {
        title: "1. Scan Barcode or Quick Search",
        desc: "Scan the barcode on the strip with your barcode gun, or type the brand name or generic salt. Items appear in the cart instantly.",
      },
      {
        title: "2. Automatic Batch Selection",
        desc: "Inventra selects the earliest-expiring batch automatically. Cashiers can override if the customer specifically requests a different batch.",
      },
      {
        title: "3. Schedule H/X Prescription Warning",
        desc: "If a medicine requires a prescription by law, a red Rx badge alerts the cashier to verify the prescribing doctor's name before completing checkout.",
      },
      {
        title: "4. Multi-Payment & Customer Credit",
        desc: "Split bills between Cash, UPI (GooglePay/PhonePe), Card, or add to a regular patient's store credit ledger.",
      },
    ],
    proTip:
      "Use keyboard shortcut F2 or Ctrl+K to jump to the search box without touching your mouse.",
  },
  "returns": {
    title: "Customer Returns & Refund Ledgers",
    subtitle: "Handling returned medicines, restocking checks, and customer credit.",
    icon: RotateCcw,
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    whatItIs:
      "Patients often return unneeded medicines. The Returns module safely logs the return, checks whether medicines can be returned to stock, and issues refunds.",
    keySteps: [
      {
        title: "1. Lookup Original Invoice",
        desc: "Search by bill invoice number or customer mobile to load the exact sale records and batches purchased.",
      },
      {
        title: "2. Physical Blister Inspection",
        desc: "Check that the return strips are intact, untampered, and not expired. Liquid syrups with broken seals must NEVER be restocked.",
      },
      {
        title: "3. Choose Restock vs Discard",
        desc: "Mark items as 'Restock to Inventory' (stock count increases) or 'Discard/Quarantine' (written off).",
      },
      {
        title: "4. Issue Refund",
        desc: "Refund cash, return to original UPI, or credit the patient's store ledger for future medicine purchases.",
      },
    ],
    proTip:
      "Restocked medicines are automatically returned to their original batch lot with preserved expiry dates.",
  },
  "transfers": {
    title: "Inter-Store Branch Transfers",
    subtitle: "Moving stock safely between your pharmacy locations.",
    icon: ArrowLeftRight,
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    whatItIs:
      "If you operate multiple pharmacy branches, you can shift surplus medicines from Branch A to Branch B without re-purchasing from distributors.",
    keySteps: [
      {
        title: "1. Create Transfer Request",
        desc: "Select the source store (sending branch) and destination store (receiving branch). Pick medicines and quantities.",
      },
      {
        title: "2. Dispatch & In-Transit",
        desc: "When items leave Branch A, stock is deducted and the transfer status changes to IN_TRANSIT.",
      },
      {
        title: "3. Receive & Acknowledge at Destination",
        desc: "When items arrive at Branch B, the destination manager inspects the delivery and clicks 'Acknowledge Receipt' to add stock to Branch B shelves.",
      },
    ],
    proTip:
      "Transit tracking ensures no medicines go missing between pharmacy branches.",
  },
  "reports": {
    title: "Reporting, GST & Regulatory Registers",
    subtitle: "Drug inspector compliance, GST filing, and business analytics.",
    icon: BarChart3,
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    whatItIs:
      "Reports help you pass regulatory inspections with ease and understand your pharmacy's sales, tax liabilities, and inventory health.",
    keySteps: [
      {
        title: "1. Schedule H / H1 / X Narcotic Registers",
        desc: "Export the mandatory government inspection register detailing prescribing doctors, patient details, and antibiotic/narcotic sales.",
      },
      {
        title: "2. GST Tax Breakdown (GSTR-1 / GSTR-3B)",
        desc: "Generate tax summaries split by 12% and 5% slabs, HSN summaries, and inward input tax credit.",
      },
      {
        title: "3. Expiry Risk & Dead Stock",
        desc: "Find medicines that have not sold in 90 days or are approaching expiry, so you can return them to distributors or discount them.",
      },
      {
        title: "4. Day-End Cashier Reconciliation",
        desc: "Compare physical cash in drawer against POS cash sales, UPI bank deposits, and card terminal slips before closing your pharmacy for the night.",
      },
    ],
    proTip:
      "Export your Schedule H1 register weekly to keep a printed log ready for routine FDA Drug Inspector visits.",
  },
};

export const ContextualHelpModal: React.FC<ContextualHelpModalProps> = ({
  topic,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const info = TOPIC_DETAILS[topic];
  const Icon = info.icon;

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer inline-flex">
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-subtle bg-surface hover:bg-surface-subtle text-secondary hover:text-primary transition-colors cursor-pointer shadow-xs"
          title={`How does this work? (${info.title})`}
          aria-label={`Help on ${info.title}`}
        >
          <HelpCircle className="h-4 w-4 text-primary" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-lg border ${info.badgeColor}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-primary">
                {info.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-secondary mt-0.5">
                {info.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {/* Overview */}
          <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1.5">
            <h4 className="font-semibold text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" /> Plain-English Overview
            </h4>
            <p className="text-secondary leading-relaxed">{info.whatItIs}</p>
          </div>

          {/* Actionable Steps */}
          <div className="space-y-2">
            <h4 className="font-semibold text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Operational Step-by-Step Flow
            </h4>
            <div className="space-y-2">
              {info.keySteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-subtle bg-surface space-y-1"
                >
                  <div className="font-semibold text-primary text-xs">{step.title}</div>
                  <p className="text-secondary text-2xs leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip */}
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1">
            <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" /> Pharmacist Pro-Tip
            </div>
            <p className="text-secondary text-2xs leading-relaxed">{info.proTip}</p>
          </div>

          {/* Full Guide Link */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
            <span className="text-xs text-primary font-medium">
              Want the complete pharmacy lifecycle handbook?
            </span>
            <Link
              to="/guide"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              Open Guide Center <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <DialogFooter>
          <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
};
