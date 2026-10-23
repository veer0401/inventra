import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cmsApi, type CmsPage } from "../../services/cmsApi";
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  ChevronRight,
  Search,
  ShoppingCart,
  QrCode,
  FileCheck2,
  Layers,
  Printer,
} from "lucide-react";

export const HomePage: React.FC = () => {
  const [cmsData, setCmsData] = useState<CmsPage | null>(null);
  const [activeTab, setActiveTab] = useState<"pos" | "fefo" | "compliance" | "sync">("pos");

  useEffect(() => {
    let mounted = true;
    cmsApi.getPublicPage("HOME")
      .then((res) => {
        if (mounted) setCmsData(res);
      })
      .catch((err) => {
        console.warn("Could not load dynamic CMS for HOME, using default copy:", err);
      });
    return () => { mounted = false; };
  }, []);

  const hero = cmsData?.content?.hero || {
    badge: "Next-Generation Pharmacy Operating System",
    title: "Cloud POS & Intelligent FEFO Tracking for Modern Pharmacies",
    subtitle: "Inventra empowers retail chemist shops, dispensary clinics, and multi-store pharmacy chains with sub-second barcode billing, automated expiry control, and statutory CDSCO & GST compliance.",
    ctaPrimary: "Start Free 14-Day Trial",
    ctaSecondary: "Explore Feature Tour"
  };

  const stats = cmsData?.content?.stats || [
    { label: "Active Dispensaries", value: "2,500+", subtext: "across 28 states & UTs" },
    { label: "Prescriptions Billed", value: "14M+", subtext: "sub-second checkout latency" },
    { label: "Expiry Waste Reduction", value: "92%", subtext: "automated FEFO routing" },
    { label: "Sync & Uptime SLA", value: "99.99%", subtext: "continuous offline operation" }
  ];

  return (
    <div className="space-y-24 sm:space-y-32 py-8 sm:py-16 overflow-hidden">
      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center pt-4 sm:pt-10">
        {/* Soft Ambient Depth Backdrop */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[680px] h-[360px] bg-gradient-to-tr from-teal-100/50 via-emerald-50/40 to-indigo-50/30 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Feature Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200/90 text-teal-800 text-xs font-semibold tracking-wide mb-8 shadow-xs hover:bg-teal-100/60 transition-colors">
          <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
          <span>{hero.badge}</span>
          <ChevronRight className="w-3.5 h-3.5 text-teal-600/70" />
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.12]">
          Cloud POS & Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600">FEFO Tracking</span> for Modern Pharmacies
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
          {hero.subtitle}
        </p>

        {/* CTA Button Group */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/apply"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 active:from-teal-700 active:to-teal-800 text-white font-semibold text-base border border-teal-500/40 shadow-[0_1px_2px_0_rgba(15,23,42,0.1),0_4px_12px_0_rgba(15,118,110,0.25)] hover:shadow-[0_6px_20px_0_rgba(15,118,110,0.35)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            <span>{hero.ctaPrimary}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/features"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-slate-50/80 text-slate-800 font-semibold text-base border border-slate-200/90 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] hover:border-slate-300 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>{hero.ctaSecondary}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>

        {/* Micro Value Highlights */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-teal-600" /> No Credit Card Required
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-teal-600" /> Instant Cloud Activation
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-teal-600" /> Free Legacy Data Migration
          </span>
        </div>

        {/* ─── Interactive Designer Terminal Mockup ─────────────────────────────── */}
        <div className="mt-14 max-w-5xl mx-auto rounded-2xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden text-left ring-1 ring-slate-900/5">
          {/* Mockup Titlebar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-slate-700 ml-2">Inventra Smart Counter #01</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/90">
                LIVE TERMINAL
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Synced • FEFO Auto-Active</span>
            </div>
          </div>

          {/* Mockup POS Workstation Body */}
          <div className="p-4 sm:p-6 space-y-4 bg-white">
            {/* Search Input Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  readOnly
                  value="Amoxicillin + Clavulanic Acid 625mg (Augmentin)"
                  className="w-full h-10 pl-10 pr-24 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-500">
                  [F2 SEARCH]
                </span>
              </div>
              <button
                type="button"
                className="w-full sm:w-auto h-10 px-5 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Bill</span>
              </button>
            </div>

            {/* Live Basket Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Batch & Expiry</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">MRP</th>
                    <th className="py-2.5 px-3 text-right">Disc %</th>
                    <th className="py-2.5 px-3 text-right">Net (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  <tr>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">Augmentin 625 Duo Tab</div>
                      <div className="text-[11px] text-slate-500">GSK • Schedule H1 • Strip of 10</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        B#AG-9022 (Exp: 11/27)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">2</td>
                    <td className="py-3 px-3 text-right">₹204.50</td>
                    <td className="py-3 px-3 text-right text-emerald-600">5.0%</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">₹388.55</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">Pan-D Capsule</div>
                      <div className="text-[11px] text-slate-500">Alkem • Pantoprazole + Domperidone</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        B#PND-401 (Exp: 08/28)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">1</td>
                    <td className="py-3 px-3 text-right">₹199.00</td>
                    <td className="py-3 px-3 text-right text-emerald-600">5.0%</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">₹189.05</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Checkout Action Summary */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Printer className="w-3.5 h-3.5 text-teal-600" /> 80mm Thermal Ready
                </span>
                <span>•</span>
                <span className="font-mono text-slate-500">GSTIN: 27AABCI1234F1Z9</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Payable</div>
                  <div className="text-xl font-extrabold text-teal-800">₹577.60</div>
                </div>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>[ENTER] Pay UPI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metric Counter Strip ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-card grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((st: any, idx: number) => (
            <div key={idx} className="text-center space-y-1.5 p-2 rounded-xl hover:bg-slate-50/70 transition-colors">
              <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-800 to-teal-600">
                {st.value}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">{st.label}</div>
              {st.subtext && (
                <div className="text-[11px] text-slate-500 leading-tight">{st.subtext}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Interactive Workflow Capability Tabs ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Integrated Clinical Modules</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Engineered Specifically for High-Volume Pharmacies
          </h2>
          <p className="text-slate-600 text-base">
            Generic retail POS software causes costly inventory losses and regulatory compliance headaches. Inventra is purpose-built for pharmaceutical workflows.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
          {[
            { id: "pos", label: "Lightning POS & Thermal Billing", icon: Zap },
            { id: "fefo", label: "Automated FEFO Expiry Routing", icon: Clock },
            { id: "compliance", label: "CDSCO & Schedule H1 Registers", icon: FileCheck2 },
            { id: "sync", label: "Zero-Downtime Offline Sync", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border ${
                  isSel
                    ? "bg-teal-50 border-teal-200/90 text-teal-900 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSel ? "text-teal-700" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Detail Showcase Card */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            {activeTab === "pos" && (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  Sub-Second Billing Performance
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Eliminate Counter Queues with Keyboard-First POS
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Operate 100% without touching a mouse. Seamlessly search drugs by generic salt or brand name, scan GS1 2D DataMatrix barcodes, apply physician discounts, and trigger instant UPI dynamic QR codes on customer-facing screens.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Compatible with all standard 80mm ESC/POS thermal printers</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Multi-counter support with cashier shift handover reports</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Integrated WhatsApp and SMS invoice delivery</li>
                </ul>
              </>
            )}

            {activeTab === "fefo" && (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Zero Expired Stock Losses
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  First-Expiry-First-Out Batch Routing
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Inventra automatically reserves and dispenses medicines with the earliest expiration date. Proactive 90, 60, and 30-day radar notifications alert managers to initiate supplier return debit notes before products expire on shelves.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Automated non-negative inventory invariants</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Automated vendor debit note generation for near-expiry items</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Batch-level purchase cost versus selling price margin tracking</li>
                </ul>
              </>
            )}

            {activeTab === "compliance" && (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Statutory Drug Inspector Audit Ready
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Automated Schedule H, H1 & X Registers
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Eliminate manual red-book ledger entries. When dispensing restricted antibiotics or narcotics, Inventra prompts for prescribing doctor registration numbers and patient IDs, compiling audit-ready compliance registers automatically.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> 1-click CDSCO schedule H/H1 export for drug inspector inspections</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Tamper-evident immutable audit log of all sales and returns</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Auto-populated GSTR-1 and GSTR-3B B2B/B2C tax summaries</li>
                </ul>
              </>
            )}

            {activeTab === "sync" && (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  Uninterrupted Counter Continuity
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Zero Downtime Offline Sync Engine
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Broadband fiber cut? Router reboot? Your cashiers continue dispensing medicines without delay. Local SQLite offline persistence logs all billing transactions and reconciles automatically with the cloud server upon reconnection.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-600" /> Automatic conflict resolution with deterministic vector timestamps</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-600" /> Encrypted local database preventing unauthorized data tampering</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-600" /> Multi-device LAN synchronization across dispensary counters</li>
                </ul>
              </>
            )}

            <div className="pt-2">
              <Link
                to="/features"
                className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-900"
              >
                <span>Read Full Technical Architecture</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Graphical Feature Visual */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Operational Audit Checklist</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                100% COMPLIANT
              </span>
            </div>
            <div className="space-y-3">
              {[
                { title: "First-Expiry First-Out (FEFO) Allocation", desc: "Automated batch picking preventing expired medicine dispensing", status: "Active" },
                { title: "Non-Negative Inventory Lock", desc: "Physical inventory must exist before invoice confirmation", status: "Enforced" },
                { title: "CDSCO Form 20/21 Drug License Validation", desc: "Monitors dispensary and supplier license expiration", status: "Verified" },
                { title: "Automated GSTR-1 HSN 6-Digit Summaries", desc: "Statutory tax breakdowns computed real-time per transaction", status: "Calculated" },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-500 leading-normal">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Banner ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 border border-teal-700/80 p-10 sm:p-16 text-center space-y-6 relative overflow-hidden shadow-xl text-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 text-xs font-semibold uppercase tracking-wider">
            Limited Time Launch Offer
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white max-w-3xl mx-auto tracking-tight">
            Ready to Upgrade Your Pharmacy Counter?
          </h2>
          <p className="text-base text-teal-100/90 max-w-xl mx-auto leading-relaxed">
            Join thousands of pharmacies across India. Start with our Starter Dispensary plan or scale up to multi-store Pro with zero setup fees.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/apply"
              className="px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-teal-950 font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              Get Started with 50% Off
            </Link>
            <Link
              to="/plans"
              className="px-8 py-4 rounded-xl bg-teal-800/80 border border-teal-600 text-white font-semibold text-base hover:bg-teal-800 transition-all active:scale-[0.98]"
            >
              Compare All Pricing Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
