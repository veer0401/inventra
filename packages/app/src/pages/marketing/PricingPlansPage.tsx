import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { subscriptionApi, type PricingConfig, type BillingCycle } from "../../services/subscriptionApi";
import { useAuthStore } from "../../stores/authStore";
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  Tag,
  Monitor,
  Building2,
  Database,
  BellRing,
} from "lucide-react";

export const PricingPlansPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.status === "AUTHENTICATED");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    let mounted = true;
    subscriptionApi.getPublicPricing()
      .then((res) => {
        if (mounted) setPricing(res);
      })
      .catch((err) => {
        console.warn("Could not load public pricing, using fallback defaults:", err);
      });
    return () => { mounted = false; };
  }, []);

  // Default fallback tiers if backend is starting
  const tiers = pricing?.tiers && pricing.tiers.length > 0 ? pricing.tiers : [
    {
      tier: "STARTER" as const,
      planName: "Inventra Starter Dispensary",
      monthlyPrice: 999,
      description: "Essential billing & inventory control for independent single-counter pharmacies.",
      annualDiscountPct: 20,
      workstationLimit: 1,
      branchLimit: 1,
      storageLimitGb: 2.0,
      alertLimit: 500,
      features: [
        "Single Workstation POS Billing",
        "Standard Product Catalog Management",
        "Direct Cash & UPI Invoice Receipts",
        "Daily Sales & Margin Summaries"
      ]
    },
    {
      tier: "PRO" as const,
      planName: "Inventra Pharmacy Pro",
      monthlyPrice: 2499,
      description: "High-speed multi-terminal sync, FEFO batch expiry control, and automated GST compliance.",
      annualDiscountPct: 20,
      workstationLimit: 5,
      branchLimit: 2,
      storageLimitGb: 10.0,
      alertLimit: 2000,
      features: [
        "Up to 5 Synchronized Workstation Terminals",
        "Dual Dispensary Branch Management",
        "Batch & Expiry Date (FEFO) Auto-Allocation",
        "Universal CSV / Excel Master Catalog Importer",
        "Automated Expiry Email & SMS Reminders",
        "Granular Operator Roles & Security Audit Log",
        "B2B Purchase Invoicing with Input GST Tracking"
      ]
    },
    {
      tier: "ENTERPRISE" as const,
      planName: "Inventra Enterprise Suite",
      monthlyPrice: 5999,
      description: "Unlimited terminals, multi-branch warehouse distribution, and dedicated account SLAs.",
      annualDiscountPct: 20,
      workstationLimit: 25,
      branchLimit: 10,
      storageLimitGb: 100.0,
      alertLimit: 10000,
      features: [
        "Unlimited High-Speed POS Counters",
        "Central Multi-Warehouse Stock Transfers",
        "Automated Expiry & Batch FEFO Routing",
        "Real-time Automated GST Filing Reports",
        "Enterprise Scheduled Email & SMS Dispatch",
        "Dedicated Account Manager & 99.99% Cloud SLA",
        "Zero Data-Loss Local Offline Sync Engine"
      ]
    }
  ];

  const discountPct = pricing?.currentAnnualDiscountPct ?? 20;

  return (
    <div className="space-y-20 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider">
          <Tag className="w-3.5 h-3.5" />
          <span>Simple, Transparent Licensing</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Invest in Your Pharmacy's Operational Speed
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          No hidden cloud hosting charges or device lock-ins. All plans include automated GST compliance, receipt thermal printing, and free catalog onboarding.
        </p>

        {/* Promo Code Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-slate-300">
              New Customer? Apply coupon <strong className="text-teal-300 font-mono bg-teal-900/60 px-2 py-0.5 rounded border border-teal-500/30">INVENTRAFIRST</strong> for <strong>50% OFF</strong> your first subscription payment!
            </span>
          </div>
          <span className="text-teal-400 font-medium">Valid across all tiers</span>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="pt-4 flex items-center justify-center">
          <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-2">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                billingCycle === "MONTHLY"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("ANNUALLY")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "ANNUALLY"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-400/30">
                SAVE {discountPct}%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {tiers.map((t) => {
          const isPro = t.tier === "PRO";
          const effectiveDiscount = t.annualDiscountPct ?? discountPct;
          const monthlyRate = t.monthlyPrice;
          const annualMonthlyEquivalent = Math.round(monthlyRate * (1 - effectiveDiscount / 100));
          const displayedPrice = billingCycle === "ANNUALLY" ? annualMonthlyEquivalent : monthlyRate;
          const billedTotalAnnual = Math.round(monthlyRate * 12 * (1 - effectiveDiscount / 100));

          const actionUrl = isAuthenticated
            ? `/settings?tab=billing`
            : `/apply?tier=${t.tier}&cycle=${billingCycle}`;

          return (
            <div
              key={t.tier}
              className={`rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all relative ${
                isPro
                  ? "bg-gradient-to-b from-slate-900 to-teal-950/60 border-2 border-teal-500 shadow-2xl shadow-teal-500/15 lg:-translate-y-2"
                  : "bg-slate-900/70 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 text-[11px] font-extrabold uppercase tracking-wider shadow-md">
                  Most Popular for Pharmacies
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{t.planName}</h3>
                  <p className="text-xs text-slate-400 mt-2 min-h-[36px] leading-relaxed">
                    {t.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="border-y border-slate-800 py-5 space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-extrabold text-white">₹{displayedPrice.toLocaleString("en-IN")}</span>
                    <span className="text-xs font-semibold text-slate-400">/ month</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {billingCycle === "ANNUALLY" ? (
                      <span className="text-emerald-400 font-medium">Billed annually at ₹{billedTotalAnnual.toLocaleString("en-IN")} + GST</span>
                    ) : (
                      <span>Billed monthly (+ 18% GST)</span>
                    )}
                  </div>
                </div>

                {/* Capacity Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>{t.workstationLimit || 1}</strong> Counter POS</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>{t.branchLimit || 1}</strong> {t.branchLimit === 1 ? "Branch" : "Branches"}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>{t.storageLimitGb || 2} GB</strong> Cloud Docs</span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                    <BellRing className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span><strong>{t.alertLimit || 500}</strong> Expiry SMS</span>
                  </div>
                </div>

                {/* Features List (Loaded Dynamically) */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">What's Included:</div>
                  <ul className="space-y-2.5">
                    {(t.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                        <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-6 border-t border-slate-800">
                <Link
                  to={actionUrl}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    isPro
                      ? "bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 hover:brightness-110 shadow-lg shadow-teal-500/20"
                      : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}
                >
                  <span>{isAuthenticated ? `Switch to ${t.planName.split(" ")[1] || t.tier}` : `Choose ${t.tier}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─── Transparent Proration & Policy FAQ ────────────────────────────── */}
      <section className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-12 space-y-8 backdrop-blur-xl">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <span>Fair Billing, Instant Prorated Upgrades & Invoices</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Everything you need to know about our billing terms and zero-risk policy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-300">
          <div className="space-y-2 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-400" /> How does plan upgrade proration work?
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              When you upgrade from Starter to Pro or Pro to Enterprise mid-cycle, we automatically calculate your remaining unused days on your current plan and deduct that exact credit from the new plan price. You only pay the net difference!
            </p>
          </div>

          <div className="space-y-2 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-teal-400" /> Are promotional coupon discounts shown on bills?
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              Yes! All invoices generated in the database, PDF downloads, and email receipts explicitly show your Base Plan Price, Less Prorated Credit, Less Coupon Code Discount, and the exact Net Amount Paid with GST breakdown.
            </p>
          </div>

          <div className="space-y-2 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-teal-400" /> Which payment methods are accepted?
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              Instant counter payment via Razorpay dynamic UPI QR code (GPay, PhonePe, Paytm), all major credit & debit cards (Visa, Mastercard, RuPay), and corporate net banking.
            </p>
          </div>

          <div className="space-y-2 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-teal-400" /> Can I claim Input Tax Credit (ITC) with GST?
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              Yes. When registering, enter your pharmacy GSTIN. All monthly and annual tax invoices will include your GSTIN, HSN/SAC code 997331, and itemized 9% CGST + 9% SGST so your accountant can claim 100% ITC.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
