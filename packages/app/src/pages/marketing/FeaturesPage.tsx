import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cmsApi, type CmsPage } from "../../services/cmsApi";
import {
  Zap,
  Clock,
  ShieldCheck,
  Building2,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Zap,
  Clock,
  Building2,
  ShieldCheck,
  Layers,
};

export const FeaturesPage: React.FC = () => {
  const [cmsData, setCmsData] = useState<CmsPage | null>(null);

  useEffect(() => {
    let mounted = true;
    cmsApi.getPublicPage("FEATURES")
      .then((res) => { if (mounted) setCmsData(res); })
      .catch((err) => console.warn("Using default FEATURES CMS data:", err));
    return () => { mounted = false; };
  }, []);

  const rawModules = cmsData?.content?.modules || (cmsData?.content?.categories?.map((c: any) => ({
    title: c.category || c.title,
    desc: c.desc || (c.items?.[0]?.desc ? `${c.items.length} core capabilities in ${c.category}` : ""),
    bullets: c.items?.map((it: any) => typeof it === "string" ? it : `${it.title}: ${it.desc}`) || c.bullets || [],
    iconKey: "Zap"
  })));

  const featureGroups = rawModules || [
    {
      icon: Zap,
      title: "Lightning POS & Prescription Billing",
      desc: "Designed for high rush hours. Pure keyboard-driven navigation with F1-F12 shortcuts. Barcode scan with instant batch lookup, split payments across UPI QR & Cash, and 80mm ESC/POS thermal receipt printing.",
      bullets: [
        "Sub-200ms item barcode scanning & price resolution",
        "Dynamic UPI QR generation directly on counter screen",
        "Split payments: Cash, Card, UPI, and Store Credit",
        "Customizable 2-inch & 3-inch thermal printer slips"
      ]
    },
    {
      icon: Clock,
      title: "Intelligent FEFO & Expiry Routing",
      desc: "Say goodbye to dead inventory write-offs. First-Expiry-First-Out automatically dispatches medicines expiring earliest first, with color-coded shelf badges and proactive vendor return workflows.",
      bullets: [
        "Automatic earliest-expiring batch allocation on bill entry",
        "30, 60, and 90-day proactive expiry risk notifications",
        "One-click supplier debit note and return generation",
        "Batch-wise MRP, Purchase Rate, and Margin tracking"
      ]
    },
    {
      icon: Building2,
      title: "Multi-Store & Inter-Branch Transfers",
      desc: "Centralized visibility across primary dispensaries and secondary retail counters. Initiate stock transfers, track transit batches, and verify dispatched quantities with strict audit integrity.",
      bullets: [
        "Consolidated multi-store live stock search",
        "Automated inter-branch transfer notes & transit verification",
        "Branch-specific permissions, price lists, and cash ledgers",
        "Centralized procurement & bulk purchase order routing"
      ]
    },
    {
      icon: ShieldCheck,
      title: "Statutory CDSCO & GSTR-1 Compliance",
      desc: "Never fear a drug inspector audit. Schedule H and H1 registers are populated automatically on prescription sales, and input tax credits (ITC) reconcile seamlessly with GSTR-1 formats.",
      bullets: [
        "Automated Schedule H & H1 register maintenance with doctor details",
        "HSN 997331 / 3004 tax classification & CGST/SGST breakdowns",
        "GSTR-1 JSON and Excel export ready for one-click CA upload",
        "Tamper-proof immutable billing ledger audit logs"
      ]
    }
  ];

  return (
    <div className="space-y-24 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          <span>Full Architecture Spotlight</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          {cmsData?.title || "Everything You Need to Run a Modern Pharmacy"}
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          {cmsData?.subtitle || "From independent single-counter chemists to multi-branch hospital dispensaries, explore the features that power high-concurrency Indian pharmacies."}
        </p>
      </section>

      {/* Feature Modules Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {featureGroups.map((mod: any, idx: number) => {
          const Icon = (typeof mod.icon === "string" ? ICON_MAP[mod.icon] : mod.icon) ||
            (mod.iconKey ? ICON_MAP[mod.iconKey] : null) ||
            Zap;
          return (
            <div
              key={idx}
              className="rounded-3xl bg-slate-900/70 border border-slate-800 p-8 sm:p-10 space-y-6 backdrop-blur-xl hover:border-teal-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">{mod.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{mod.desc}</p>

                <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                  {mod.bullets.map((b: string, bIdx: number) => (
                    <div key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Link
                  to="/apply"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300"
                >
                  <span>Experience this in demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* Bottom CTA */}
      <section className="text-center rounded-3xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-emerald-950/80 border border-teal-500/30 p-12 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Compare Plans & Pricing</h2>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          Explore transparent pricing tiers with workstation quotas and promotional launch coupons.
        </p>
        <div>
          <Link
            to="/plans"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal-400 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-teal-500/20 transition-all"
          >
            <span>View All Plans</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
