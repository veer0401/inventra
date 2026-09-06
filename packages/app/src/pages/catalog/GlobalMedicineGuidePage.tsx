import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  DollarSign,
  Layers,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Package,
  Barcode,
  Percent,
  Pill,
  Building2,
  Lock,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
} from "@inventra/ui";

export const GlobalMedicineGuidePage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<
    "overview" | "workflow" | "comparison" | "suggestions" | "dictionary" | "faq"
  >("overview");

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-subtle shadow-card">
        <div className="flex items-start gap-3">
          <Link to="/catalog/global">
            <Button
              variant="outline"
              size="sm"
              className="mt-0.5 px-2.5"
              title="Back to Global Directory"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-primary">
                Global Medicine Master Guide
              </h1>
              <span className="text-xs font-mono text-primary bg-primary-subtle px-2 py-0.5 rounded border border-primary-border font-semibold">
                FUNCTIONAL HANDBOOK
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Everything you need to know about standard formulations, 1-click store additions, private pricing, and field definitions in simple pharmacy language.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link to="/catalog/global">
            <Button variant="primary" size="sm" leftIcon={<Globe className="h-4 w-4" />}>
              Open Global Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-subtle text-xs">
        {[
          { id: "overview", label: "1. Why Global Medicines?", icon: Globe },
          { id: "workflow", label: "2. The 3-Step Store Workflow", icon: Plus },
          { id: "comparison", label: "3. Shared vs Private Data", icon: Lock },
          { id: "suggestions", label: "4. Custom Medicines & Review", icon: Send },
          { id: "dictionary", label: "5. Field-by-Field Dictionary", icon: Pill },
          { id: "faq", label: "6. Frequently Asked Questions", icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
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

      {/* SECTION 1: Why Global Medicines? */}
      {(activeSection === "overview" || activeSection === "workflow") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Globe className="h-5 w-5 text-primary" />
              1. What is the Global Medicine Database & Why Do We Have It?
            </CardTitle>
            <CardDescription className="text-xs text-secondary">
              A shared national medicine repository designed to eliminate repetitive typing and billing errors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-secondary">
            <p>
              In traditional pharmacy software, every retail owner had to manually type in thousands of medicine names, drug salts, HSN codes, and tax rates one by one. This led to misspelled drug names, missing generic salts, wrong GST rates, and delayed counter billing.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Save Countless Hours
                </div>
                <p className="text-muted text-2xs">
                  Zero manual data entry for common medicines. One click pulls in the formulation name, strength, pack size, and GST rate.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5 text-sm">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Accurate Generic Salts
                </div>
                <p className="text-muted text-2xs">
                  Every medicine is bound to its standardized therapeutic salt (e.g., Paracetamol), allowing pharmacists to suggest substitutes when a brand is out of stock.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5 text-sm">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  Regulatory & Tax Safety
                </div>
                <p className="text-muted text-2xs">
                  Correct 8-digit HSN codes and government GST slabs (12% vs 5%) are pre-verified, protecting you from tax audit penalties.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: Store Owner Workflow */}
      {(activeSection === "workflow" || activeSection === "overview") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Plus className="h-5 w-5 text-emerald-500" />
              2. The Store Owner's 3-Step Journey
            </CardTitle>
            <CardDescription className="text-xs text-secondary">
              How easy it is to stock and sell medicines in your store using the Global Directory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                    Step 1
                  </span>
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-primary text-sm">Search the Directory</h3>
                <p className="text-secondary text-xs leading-relaxed">
                  Go to <Link to="/catalog/global" className="text-primary font-medium underline">Global Medicines</Link>. Type the medicine name, salt, or scan the barcode. Use filters to quickly narrow by Tablets, Syrups, or Injections.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                    Step 2
                  </span>
                  <Plus className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-primary text-sm">Click "Add to Store"</h3>
                <p className="text-secondary text-xs leading-relaxed">
                  Click the <strong>Add to Store</strong> button. <strong>No form will pop up.</strong> The medicine is instantly imported into your store's master catalog and marked as <strong>✓ In Store</strong>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                    Step 3
                  </span>
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-primary text-sm">Receive Inventory & Set Prices</h3>
                <p className="text-secondary text-xs leading-relaxed">
                  When stock arrives from your distributor, enter your purchase invoice in <Link to="/goods-receipts/new" className="text-primary font-medium underline">Goods Receipts</Link>. Add batch lots, expiry dates, and your private selling price!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: Shared vs Private Data */}
      {(activeSection === "comparison" || activeSection === "overview") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Lock className="h-5 w-5 text-amber-500" />
              3. Shared Formulations vs. 100% Private Store Data
            </CardTitle>
            <CardDescription className="text-xs text-secondary">
              Why the Global Database never dictates your prices, profits, or distributor relationships.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-subtle rounded-lg overflow-hidden">
                <thead className="bg-surface-subtle border-b border-subtle text-secondary uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-1/2">
                      <span className="flex items-center gap-1.5 text-primary">
                        <Globe className="h-4 w-4 text-primary" /> Global Master (Shared Library)
                      </span>
                    </th>
                    <th className="py-3 px-4 w-1/2">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <Lock className="h-4 w-4 text-emerald-600" /> Your Pharmacy (100% Private to You)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-primary">Medicine Trade & Brand Name</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-medium">Purchase Rate from Distributor (Never Shared)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-primary">Generic Active Salt Composition</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-medium">Retail Selling Price / MRP (Set by you)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-primary">Dosage Form & Active Strength</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-medium">Current Stock Quantities & Shelf Locations</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-primary">Standard Packaging Units (Base & Selling)</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-medium">Batch Numbers & Expiration Dates</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-primary">Government HSN Code & GST Slab (12% / 5%)</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-medium">Vendor / Supplier Ledgers & Invoices</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-primary">Prescription Required (Schedule H/X Flag)</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-medium">Customer Credit, Sales Invoices & Profits</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-2xs text-muted italic">
              * Note: Other pharmacy stores on Inventra can NEVER see your purchase costs, inventory counts, or retail profit margins.
            </p>
          </CardContent>
        </Card>
      )}

      {/* SECTION 4: Custom Medicines & Silent Suggestions */}
      {(activeSection === "suggestions" || activeSection === "overview") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Send className="h-5 w-5 text-blue-500" />
              4. What Happens When You Add a Custom Medicine?
            </CardTitle>
            <CardDescription className="text-xs text-secondary">
              How your store stays completely unblocked while helping build the platform catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-secondary">
            <p>
              If you stock a specialized ayurvedic tonic, a rare antibiotic, or a newly released drug that isn't yet in the Global Directory, you can click <strong>"Create Custom Product"</strong> and add it immediately.
            </p>
            <div className="p-4 rounded-lg border border-subtle bg-surface-subtle space-y-3">
              <h4 className="font-semibold text-primary text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                The Silent Proposal Journey:
              </h4>
              <ol className="space-y-2 list-decimal list-inside text-secondary">
                <li>
                  <strong className="text-primary">Instant Store Availability:</strong> The custom medicine is saved directly to your store catalog. You can generate barcodes, receive stock, and bill customers with zero delay.
                </li>
                <li>
                  <strong className="text-primary">Silent Proposal:</strong> In the background, Inventra safely queues a copy of your formulation into the Platform Admin review pipeline. You will never see annoying popups asking for permission.
                </li>
                <li>
                  <strong className="text-primary">Platform Verification:</strong> Our pharmacist admins verify the generic salt and drug schedule against CDSCO regulatory databases.
                </li>
                <li>
                  <strong className="text-primary">Community Promotion:</strong> Once approved, the formulation is promoted to the Global Medicine Database. Your product is automatically linked, and all other pharmacies can now find it too!
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 5: Field Dictionary */}
      {(activeSection === "dictionary" || activeSection === "overview") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Pill className="h-5 w-5 text-primary" />
              5. Illustrated Field Dictionary (What Each Field Means)
            </CardTitle>
            <CardDescription className="text-xs text-secondary">
              Every input box explained in plain, practical pharmacy terms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-primary" /> Product Trade / Display Name
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  The branded commercial name printed on the packaging (e.g., <strong>Augmentin 625 Duo Tablet</strong> or <strong>Dolo 650</strong>). This is what cashiers and patients see on bills.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Generic / Salt Composition
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  The active therapeutic chemical ingredients (e.g., <strong>Amoxicillin (500mg) + Clavulanic Acid (125mg)</strong>). Crucial for pharmacists to find identical substitutes when a customer's prescribed brand is unavailable.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-500" /> Manufacturer / Pharma Lab
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  The pharmaceutical enterprise manufacturing or marketing the formulation (e.g., <strong>GlaxoSmithKline</strong>, <strong>Cipla</strong>, <strong>Sun Pharma</strong>).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-purple-500" /> Dosage Form
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  The physical form of the drug (e.g., <strong>Tablet</strong>, <strong>Capsule</strong>, <strong>Syrup</strong>, <strong>Injection</strong>, <strong>Ointment</strong>, <strong>Drops</strong>). Controls how stock is measured and counted.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-rose-500" /> Active Strength
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  The concentration or potency per unit dose (e.g., <strong>625mg</strong>, <strong>500mg</strong>, <strong>10mg/5ml</strong>, <strong>0.5% w/v</strong>).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-emerald-500" /> Base Dispensing Unit
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  The smallest single individual unit that can be dispensed or counted in stock (e.g., <strong>1 Tablet</strong>, <strong>1 Bottle</strong>, <strong>1 Tube</strong>, <strong>1 Ampoule</strong>).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-teal-500" /> Selling Packaging Unit
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  How the medicine is typically packaged and handed to the retail patient (e.g., <strong>Strip of 10</strong>, <strong>Box of 100</strong>, <strong>100ml Bottle</strong>).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-indigo-500" /> Units per Selling Pack
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  The conversion ratio: how many base dispensing units are inside 1 selling pack (e.g., <strong>10</strong> for a strip of 10 tablets, or <strong>1</strong> for a syrup bottle).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-amber-500" /> HSN Code & GST Slab
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  <strong>HSN Code:</strong> The 8-digit government tax classification (usually <strong>30049099</strong> for formulations).<br />
                  <strong>GST %:</strong> Standard tax percentage (typically <strong>12%</strong> for general medicines, <strong>5%</strong> for vaccines/insulin).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-500" /> Prescription Required (Rx Only)
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  When enabled, flags this medicine as a <strong>Schedule H, H1, or X drug</strong>. At POS checkout, the cashier will be alerted to verify the prescribing doctor's prescription.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-subtle bg-surface space-y-1 md:col-span-2">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Barcode className="h-4 w-4 text-primary" /> Barcodes & Packaging Identifiers
                </div>
                <p className="text-secondary text-2xs leading-relaxed">
                  The 12- or 13-digit EAN/UPC barcode printed on the medicine strip or outer box. When saved here, you can scan the box with your USB/Bluetooth barcode gun to add it to a customer's cart in less than a second!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 6: FAQ */}
      {(activeSection === "faq" || activeSection === "overview") && (
        <Card className="shadow-card border-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <HelpCircle className="h-5 w-5 text-primary" />
              6. Frequently Asked Questions (FAQ)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed">
            <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
              <h4 className="font-semibold text-primary text-sm">
                Can I edit or customize a medicine after importing it from the Global list?
              </h4>
              <p className="text-secondary">
                Yes, absolutely! Once you click "Add to Store", the product is copied into your store catalog. You can edit the display name, add custom barcodes, attach store categories, or change the packaging units anytime.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
              <h4 className="font-semibold text-primary text-sm">
                What if I sell loose tablets (cut strips)?
              </h4>
              <p className="text-secondary">
                Inventra natively supports unit conversion! Set your <strong>Base Unit</strong> to "Tablet" and <strong>Selling Unit</strong> to "Strip of 10" with <strong>Units per Selling Unit = 10</strong>. You can sell either complete strips or individual tablets, and Inventra will accurately deduct stock.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
              <h4 className="font-semibold text-primary text-sm">
                How does CSV bulk import work for Platform Admins?
              </h4>
              <p className="text-secondary">
                Platform Admins can go to <Link to="/admin/medicines" className="text-primary font-medium underline">Admin Medicines</Link>, click <strong>"Import CSV"</strong>, and upload a spreadsheet containing thousands of medicines. The system automatically upserts them in seconds and immediately publishes them to the national catalog.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-subtle bg-surface-subtle space-y-1">
              <h4 className="font-semibold text-primary text-sm">
                What happens if I accidentally click "Add to Store" twice?
              </h4>
              <p className="text-secondary">
                Inventra includes built-in duplicate prevention. Once an item is added, the button turns into a green <strong>"✓ In Store"</strong> badge and disables itself. Even if triggered concurrently, the backend prevents duplicate rows from being inserted.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Call to Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-primary/5 rounded-lg border border-primary/20">
        <div className="space-y-1">
          <h3 className="font-bold text-primary text-sm">Ready to stock your pharmacy?</h3>
          <p className="text-xs text-secondary">
            Head to the Global Medicine Directory and start building your store catalog in 1-click.
          </p>
        </div>
        <Link to="/catalog/global">
          <Button variant="primary" size="sm" leftIcon={<Globe className="h-4 w-4" />}>
            Go to Global Directory
          </Button>
        </Link>
      </div>
    </div>
  );
};
