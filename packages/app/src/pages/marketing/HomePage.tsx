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
} from "lucide-react";

export const HomePage: React.FC = () => {
  const [cmsData, setCmsData] = useState<CmsPage | null>(null);

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
    title: "Revolutionize Your Pharmacy with Cloud POS & Intelligent FEFO Tracking",
    subtitle: "Inventra empowers modern chemist shops, dispensaries, and pharmacy chains with sub-second billing, automated expiry control, and statutory CDSCO & GST compliance.",
    ctaPrimary: "Start Free Trial",
    ctaSecondary: "Explore Features"
  };

  const stats = cmsData?.content?.stats || [
    { label: "Active Dispensaries", value: "2,500+" },
    { label: "Prescriptions Billed", value: "14M+" },
    { label: "Expiry Waste Reduction", value: "92%" },
    { label: "Uptime & Sync Reliability", value: "99.99%" }
  ];

  return (
    <div className="space-y-24 py-12">
      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center pt-8 sm:pt-16">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{hero.badge}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.15]">
          {hero.title}
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          {hero.subtitle}
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/apply"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold text-base hover:brightness-110 shadow-xl shadow-teal-500/25 transition-all flex items-center justify-center gap-2 group"
          >
            <span>{hero.ctaPrimary}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/features"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 border border-slate-700/80 text-white font-semibold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <span>{hero.ctaSecondary}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400" /> No Credit Card Required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400" /> Instant Cloud Activation
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400" /> Free Data Migration
          </span>
        </div>
      </section>

      {/* ─── Metric Counter Strip ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-10 backdrop-blur-xl grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((st: any, idx: number) => (
            <div key={idx} className="text-center space-y-1 p-2 rounded-2xl hover:bg-slate-900/40 transition-colors">
              <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
                {st.value}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-200">{st.label}</div>
              {st.subtext && (
                <div className="text-[11px] text-slate-400 leading-tight">{st.subtext}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Key Value Propositions ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Engineered Specifically for High-Volume Pharmacies
          </h2>
          <p className="text-slate-400 text-base">
            Generic retail POS software causes costly inventory losses and regulatory compliance headaches. Inventra is purpose-built for pharmaceutical workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 p-8 space-y-5 hover:border-teal-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Sub-Second Barcode POS</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Scan medicine barcodes, verify batch numbers, apply promotional discounts, and generate 80mm thermal receipts with integrated split UPI & Cash payments in under 3 seconds.
            </p>
            <Link to="/features" className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300">
              Learn about POS <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 p-8 space-y-5 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Automated FEFO Expiry Routing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              First-Expiry-First-Out algorithm automatically selects the earliest expiring batch during checkout. Receive 90, 60, and 30-day proactive expiry alerts to return near-expiry stock to vendors.
            </p>
            <Link to="/features" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              Explore Batch Engine <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 p-8 space-y-5 hover:border-cyan-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Zero Downtime Offline Sync</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Internet cuts out during rush hour? Keep printing bills on desktop terminals. Our background SQLite sync engine automatically reconciles transactions once connectivity resumes.
            </p>
            <Link to="/features" className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300">
              Read Sync Specs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Banner ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 border border-teal-500/30 p-10 sm:p-16 text-center space-y-6 relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
            Limited Time Offer
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white max-w-3xl mx-auto">
            Ready to Upgrade Your Pharmacy Counter?
          </h2>
          <p className="text-base text-slate-300 max-w-xl mx-auto">
            Join thousands of pharmacies across India. Start with our Starter Dispensary plan or scale up to multi-store Pro with zero setup fees.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/apply"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-bold text-base hover:brightness-110 shadow-xl shadow-teal-500/25 transition-all"
            >
              Get Started with 50% Off
            </Link>
            <Link
              to="/plans"
              className="px-8 py-4 rounded-2xl bg-slate-900/80 border border-slate-700 text-white font-semibold text-base hover:bg-slate-800 transition-all"
            >
              Compare All Pricing Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
