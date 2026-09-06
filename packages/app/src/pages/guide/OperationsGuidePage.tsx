import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Truck,
  PackageCheck,
  Boxes,
  ShoppingCart,
  RotateCcw,
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Percent,
  Layers,
  Plus,
  Clock,
  Pill,
  DollarSign,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
} from "@inventra/ui";

type GuideTab =
  | "all"
  | "lifecycle"
  | "purchasing"
  | "receiving"
  | "inventory"
  | "pos"
  | "returns"
  | "transfers"
  | "reports";

export const OperationsGuidePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GuideTab>("all");

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-subtle shadow-card">
        <div className="flex items-start gap-3.5">
          <span className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
            <BookOpen className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                Inventra Pharmacy Operations Handbook
              </h1>
              <span className="text-xs font-mono text-primary bg-primary-subtle px-2.5 py-0.5 rounded border border-primary-border font-bold">
                END-TO-END FLOW
              </span>
            </div>
            <p className="text-xs text-secondary mt-1.5 max-w-2xl leading-relaxed">
              The non-technical functional guide for pharmacy owners, pharmacists, and cashiers. Learn how medicine moves through your store—from distributor orders, loading dock inspection, FEFO batches, counter sales, to customer returns and drug inspector registers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link to="/pos">
            <Button variant="primary" size="sm" leftIcon={<ShoppingCart className="h-4 w-4" />}>
              Open POS Counter
            </Button>
          </Link>
        </div>
      </div>

      {/* Visual Medicine Lifecycle Journey */}
      <Card className="shadow-card border-subtle overflow-hidden">
        <CardHeader className="bg-surface-subtle border-b border-subtle pb-4">
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            The Complete Pharmacy Medicine Lifecycle (How Medicine Comes & Goes)
          </CardTitle>
          <CardDescription className="text-xs text-secondary">
            Visual flowchart of inventory flow from order placement to counter sale.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
            {/* Step 1 */}
            <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold font-mono text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                  STEP 1
                </span>
                <Truck className="h-4 w-4 text-blue-600" />
              </div>
              <h4 className="font-semibold text-primary text-xs">Distributor Order (PO)</h4>
              <p className="text-2xs text-secondary leading-relaxed">
                Draft & issue order to distributor rep with quantities and expected rates.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  STEP 2
                </span>
                <PackageCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-primary text-xs">Inward Delivery (GRN)</h4>
              <p className="text-2xs text-secondary leading-relaxed">
                Delivery arrives! Inspect boxes, verify batch numbers & expiry, post GRN to unlock stock.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold font-mono text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  STEP 3
                </span>
                <Boxes className="h-4 w-4 text-purple-600" />
              </div>
              <h4 className="font-semibold text-primary text-xs">Inventory & FEFO Batches</h4>
              <p className="text-2xs text-secondary leading-relaxed">
                Store shelves organized. Earliest-expiring batches are automatically prioritized for sale.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-lg border border-teal-500/20 bg-teal-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold font-mono text-teal-600 bg-teal-500/10 px-1.5 py-0.5 rounded">
                  STEP 4
                </span>
                <ShoppingCart className="h-4 w-4 text-teal-600" />
              </div>
              <h4 className="font-semibold text-primary text-xs">POS Counter Billing</h4>
              <p className="text-2xs text-secondary leading-relaxed">
                Scan barcode, verify doctor's Rx warning, apply discount, split payment (Cash/UPI/Credit).
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold font-mono text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">
                  STEP 5
                </span>
                <RotateCcw className="h-4 w-4 text-rose-600" />
              </div>
              <h4 className="font-semibold text-primary text-xs">Returns & Restock</h4>
              <p className="text-2xs text-secondary leading-relaxed">
                Inspect returned strips: resellable stock returns to inventory, or discard damaged items.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-subtle text-xs">
        {[
          { id: "all", label: "All Operations", icon: BookOpen },
          { id: "purchasing", label: "1. Placing Orders (PO)", icon: Truck },
          { id: "receiving", label: "2. Delivery Arrival (GRN)", icon: PackageCheck },
          { id: "inventory", label: "3. Inventory & FEFO", icon: Boxes },
          { id: "pos", label: "4. POS Counter Sales", icon: ShoppingCart },
          { id: "returns", label: "5. Customer Returns", icon: RotateCcw },
          { id: "transfers", label: "6. Branch Transfers", icon: ArrowLeftRight },
          { id: "reports", label: "7. Reports, Tax & Compliance", icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as GuideTab)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-surface text-secondary hover:text-primary hover:bg-subtle border border-subtle"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: Ordering Medicines (Purchase Orders) */}
      {(activeTab === "all" || activeTab === "purchasing") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  1. How to Place Orders with Medicine Distributors (Purchase Orders)
                </CardTitle>
                <CardDescription className="text-xs text-secondary mt-0.5">
                  Ordering stock efficiently without over-purchasing or running out of critical drugs.
                </CardDescription>
              </div>
              <Link to="/purchase-orders/new">
                <Button variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Create Purchase Order
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-secondary">
            <p>
              When store stock drops below reorder levels, you place a <strong>Purchase Order (PO)</strong> with your registered pharmaceutical distributor.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1.5">
                <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" /> Select Distributor
                </div>
                <p className="text-2xs text-secondary">
                  Choose the distributor who offers the best credit terms and stock availability for the requested drug line.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1.5">
                <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" /> Add Quantities & Rates
                </div>
                <p className="text-2xs text-secondary">
                  Specify how many boxes you want and the agreed purchase rate. Inventra calculates GST and order totals automatically.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1.5">
                <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" /> Issue Order
                </div>
                <p className="text-2xs text-secondary">
                  Click <strong>Issue Order</strong>. Status changes from DRAFT to ISSUED. Export PDF or email the PO to your distributor rep!
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 text-xs flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> What Happens Right After Placing the Order?
              </h4>
              <p className="text-2xs text-secondary leading-relaxed">
                Your order is now waiting for dispatch. <strong>Inventory does NOT increase yet</strong> because the physical medicines have not arrived at your shop. Once the distributor's delivery van arrives, you proceed to the next step: <strong>Goods Receipt (GRN)</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: What to Do When Delivery Arrives (Goods Receipt) */}
      {(activeTab === "all" || activeTab === "receiving") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-emerald-500" />
                  2. What to Do When the Delivery Van Arrives (Goods Receipt / GRN)
                </CardTitle>
                <CardDescription className="text-xs text-secondary mt-0.5">
                  The mandatory 5-step checklist every pharmacist must follow upon receiving stock.
                </CardDescription>
              </div>
              <Link to="/goods-receipts/new">
                <Button variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Create Goods Receipt
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-secondary">
            <p>
              A <strong>Goods Receipt Note (GRN)</strong> is the official entry gate for all medicines. Posting a GRN is the <strong>exact moment stock is added to your shelves</strong>, batches are registered, and distributor bills are matched.
            </p>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <h4 className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-2xs flex items-center justify-center">1</span>
                  Physically Open & Inspect the Boxes
                </h4>
                <p className="text-2xs text-secondary leading-relaxed pl-6.5">
                  Count the boxes against the driver's delivery challan. Check for physical damage, broken glass ampoules, leaked syrup bottles, or broken seal strips.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <h4 className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-2xs flex items-center justify-center">2</span>
                  Verify Batch Numbers & Expiration Dates
                </h4>
                <p className="text-2xs text-secondary leading-relaxed pl-6.5">
                  Inspect the batch code and expiry date printed on the foil blister or bottle. Never accept medicines expiring within 90 days unless previously agreed for rapid clearance.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <h4 className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-2xs flex items-center justify-center">3</span>
                  Record Received Quantities & Free Bonus Units
                </h4>
                <p className="text-2xs text-secondary leading-relaxed pl-6.5">
                  Distributors often provide "scheme bonus" (e.g. buy 10 strips, get 1 free). Enter the free units in the GRN line so your cost-per-tablet adjusts accurately!
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <h4 className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-2xs flex items-center justify-center">4</span>
                  Confirm Retail Selling Price (MRP)
                </h4>
                <p className="text-2xs text-secondary leading-relaxed pl-6.5">
                  Enter your counter selling price / MRP. You can set any price you want—your commercial margin is completely private to your pharmacy.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <h4 className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold font-mono text-2xs flex items-center justify-center">5</span>
                  Click "Post Goods Receipt"
                </h4>
                <p className="text-2xs text-secondary leading-relaxed pl-6.5">
                  Click <strong>Post Goods Receipt</strong>. The items instantly appear in your active inventory, barcodes can be scanned at the counter, and your vendor bill balance updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: In-Store Inventory & FEFO Batches */}
      {(activeTab === "all" || activeTab === "inventory") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-purple-500" />
                  3. In-Store Inventory & FEFO Expiry Rules
                </CardTitle>
                <CardDescription className="text-xs text-secondary mt-0.5">
                  How First-Expiry First-Out prevents expired drug write-offs and protects patient health.
                </CardDescription>
              </div>
              <Link to="/inventory">
                <Button variant="outline" size="sm" leftIcon={<Boxes className="h-3.5 w-3.5" />}>
                  View Store Inventory
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-secondary">
            <p>
              Unlike a grocery store where products are interchangeable, pharmacy inventory requires tracking every single batch lot with an expiration date.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-1.5">
                <h4 className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-purple-600" /> Automatic FEFO Routing
                </h4>
                <p className="text-2xs text-secondary">
                  When a cashier scans Dolo 650, Inventra automatically deducts from the batch that expires earliest (e.g. expiring Oct 2026 before Dec 2027).
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1.5">
                <h4 className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Color-Coded Warnings
                </h4>
                <p className="text-2xs text-secondary">
                  Batches expiring in 30 days are flagged in bright red; 60 days in orange. This gives you time to return them to suppliers for full credit notes.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1.5">
                <h4 className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-500" /> Damaged & Quarantine
                </h4>
                <p className="text-2xs text-secondary">
                  If an item is compromised, use <strong>Stock Adjustment</strong> to write it off as damaged. It will be immediately blocked from being sold at the counter.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 4: POS Counter Billing */}
      {(activeTab === "all" || activeTab === "pos") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-teal-500" />
                  4. POS Counter Billing & Prescription Safety (How Medicine Leaves the Store)
                </CardTitle>
                <CardDescription className="text-xs text-secondary mt-0.5">
                  Fast counter checkout, barcode scanning, doctor Rx compliance, and flexible payment methods.
                </CardDescription>
              </div>
              <Link to="/pos">
                <Button variant="outline" size="sm" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}>
                  Open Billing Terminal
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-secondary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-primary text-xs uppercase tracking-wider">
                  Cashier Workflow at Checkout:
                </h4>
                <ol className="space-y-2 list-decimal list-inside text-secondary text-2xs">
                  <li>
                    <strong className="text-primary">Scan or Search:</strong> Point your barcode scanner at the strip or type the brand name/salt. Items are added in 1 millisecond.
                  </li>
                  <li>
                    <strong className="text-primary">FEFO Allocated:</strong> The system picks the oldest valid batch automatically.
                  </li>
                  <li>
                    <strong className="text-primary">Prescription Warning (Rx):</strong> If a medicine is a Schedule H/X drug, an orange/red alert pops up requiring the cashier to confirm the prescribing doctor's name.
                  </li>
                  <li>
                    <strong className="text-primary">Customer Lookup:</strong> Enter the patient's 10-digit mobile number to record their purchase history and award loyalty points.
                  </li>
                  <li>
                    <strong className="text-primary">Split Payments:</strong> Settle the bill using Cash, UPI QR code, Credit Card, or Patient Credit balance.
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-lg border border-teal-500/20 bg-teal-500/5 space-y-2">
                <h4 className="font-semibold text-teal-700 dark:text-teal-400 text-xs flex items-center gap-1.5">
                  <Percent className="h-4 w-4" /> Selling Loose Tablets vs. Full Strips
                </h4>
                <p className="text-2xs text-secondary leading-relaxed">
                  If a customer only needs 3 tablets from a strip of 10, Inventra handles the math automatically! Cashiers can enter fractional quantities (e.g. 3 tablets), and Inventra computes the exact price and deducts 3 single units from stock.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 5: Customer Returns & Refunds */}
      {(activeTab === "all" || activeTab === "returns") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-rose-500" />
                  5. Customer Sales Returns & Refunds
                </CardTitle>
                <CardDescription className="text-xs text-secondary mt-0.5">
                  Inspecting returned strips, restocking shelf inventory, and customer refund ledgers.
                </CardDescription>
              </div>
              <Link to="/returns">
                <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
                  View Returns Registry
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-secondary">
            <p>
              When a patient brings back unused medicines (e.g. patient recovered or prescription changed), use the <strong>Sales Return Workflow</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary text-xs">1. Bill Lookup</div>
                <p className="text-2xs text-secondary">
                  Search by bill invoice number or patient mobile to load the exact sale records and batches purchased.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary text-xs">2. Restock vs. Discard</div>
                <p className="text-2xs text-secondary">
                  Inspect the packaging. If untampered and sealed, choose <strong>Restock</strong> to put it back on shelves. If opened or expired, choose <strong>Discard</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary text-xs">3. Issue Refund</div>
                <p className="text-2xs text-secondary">
                  Return cash or credit the customer's account so they can use it against their next prescription.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 6: Inter-Store Branch Transfers */}
      {(activeTab === "all" || activeTab === "transfers") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-indigo-500" />
                  6. Inter-Store Branch Transfers
                </CardTitle>
                <CardDescription className="text-xs text-secondary mt-0.5">
                  Moving medicines safely between multiple pharmacy locations.
                </CardDescription>
              </div>
              <Link to="/transfers/new">
                <Button variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Create Branch Transfer
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed text-secondary">
            <p>
              If your Branch A is running low on an antibiotic while Branch B has surplus stock, create an <strong>Inter-Store Transfer</strong>:
            </p>
            <ol className="space-y-2 list-decimal list-inside text-2xs">
              <li>
                <strong className="text-primary">Initiate Transfer:</strong> Branch A requests 20 boxes from Branch B.
              </li>
              <li>
                <strong className="text-primary">Dispatch:</strong> Branch B packs the medicines and marks status as <strong>IN_TRANSIT</strong>. Stock is deducted from Branch B.
              </li>
              <li>
                <strong className="text-primary">Inward Acknowledgment:</strong> When the box arrives at Branch A, the manager checks the batch numbers and clicks <strong>Acknowledge Receipt</strong>. Stock is unlocked at Branch A.
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* SECTION 7: Reports, Tax & Regulatory Compliance */}
      {(activeTab === "all" || activeTab === "reports") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-500" />
                  7. Reports, Tax & Regulatory Compliance
                </CardTitle>
                <CardDescription className="text-xs text-secondary mt-0.5">
                  Government drug inspector inspection logs, GST tax filing, and cash drawer reconciliations.
                </CardDescription>
              </div>
              <Link to="/reports">
                <Button variant="outline" size="sm" leftIcon={<BarChart3 className="h-3.5 w-3.5" />}>
                  Open Reports
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-secondary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-500" /> Schedule H / H1 / X Inspection Register
                </div>
                <p className="text-2xs text-secondary">
                  Whenever an FDA Drug Inspector visits your pharmacy, export this report. It lists patient names, prescribing doctors, batch numbers, and exact dispensed dates for all regulated antibiotics and narcotics.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-emerald-500" /> GST Tax Filing Reports (GSTR-1 & 3B)
                </div>
                <p className="text-2xs text-secondary">
                  Instantly calculate outward retail sales tax and inward input tax credit (ITC) across 12% and 5% slabs with 8-digit HSN summaries for your monthly GST accountant.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" /> Expiry Risk & Dead Stock Forecast
                </div>
                <p className="text-2xs text-secondary">
                  Generates an advance list of medicines expiring in the next 30, 60, or 90 days, enabling store managers to return them to distributors for full credit notes before they expire.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-blue-500" /> Day-End Cashier Reconciliation
                </div>
                <p className="text-2xs text-secondary">
                  Reconciles physical cash in the drawer against recorded POS transactions, UPI bank settlements, and card machine receipts before night closing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Whole-Site Form Field Guide Card */}
      <Card className="shadow-card border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Quick Reference: What Do the Common Input Boxes Mean?
          </CardTitle>
          <CardDescription className="text-xs text-secondary">
            Every form on Inventra is equipped with plain-English helper descriptions. Here is a quick summary:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-2xs">
            <div className="p-3 bg-surface rounded-lg border border-subtle space-y-1">
              <strong className="text-primary">Order / Invoice Number:</strong> The distributor's printed bill number used for accounts payable tracking.
            </div>
            <div className="p-3 bg-surface rounded-lg border border-subtle space-y-1">
              <strong className="text-primary">Batch Number:</strong> The manufacturing lot code printed on the blister/box (e.g. B2409).
            </div>
            <div className="p-3 bg-surface rounded-lg border border-subtle space-y-1">
              <strong className="text-primary">Expiry Date (MM/YY):</strong> The legal expiration date after which the drug must not be dispensed.
            </div>
            <div className="p-3 bg-surface rounded-lg border border-subtle space-y-1">
              <strong className="text-primary">Free / Bonus Quantity:</strong> Units provided without charge under supplier schemes (e.g. 10 + 1 free).
            </div>
            <div className="p-3 bg-surface rounded-lg border border-subtle space-y-1">
              <strong className="text-primary">Purchase Rate:</strong> Your net buying price per pack from the distributor (kept 100% private to your store).
            </div>
            <div className="p-3 bg-surface rounded-lg border border-subtle space-y-1">
              <strong className="text-primary">Selling Price / MRP:</strong> The retail price printed on the box charged to counter patients.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
