import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cmsApi, type CmsPage } from "../../services/cmsApi";
import {
  Award,
  HeartPulse,
  CheckCircle2,
  ArrowRight,
  Globe2,
} from "lucide-react";

export const AboutPage: React.FC = () => {
  const [cmsData, setCmsData] = useState<CmsPage | null>(null);

  useEffect(() => {
    let mounted = true;
    cmsApi.getPublicPage("ABOUT")
      .then((res) => { if (mounted) setCmsData(res); })
      .catch((err) => console.warn("Using default ABOUT CMS data:", err));
    return () => { mounted = false; };
  }, []);

  const story = cmsData?.content?.story || {
    heading: "Empowering 1 Million Chemists Across Bharat",
    p1: "Founded by pharmacists and distributed systems engineers, Inventra was born out of a real dispensary counter in Mumbai. We experienced first-hand the daily chaos: expired medicines lost in back drawers, long queues under spotty internet, and confusing GST filing reconciliation.",
    p2: "We built Inventra from the ground up to be resilient, lightning-fast, and deeply aligned with Indian drug regulations like the Drugs and Cosmetics Act and Schedule H/H1 registers."
  };

  const values = cmsData?.content?.values || [
    { title: "Zero Data Loss", desc: "Local-first architecture ensures that offline cashier counters never lose a single rupee or transaction." },
    { title: "Statutory Compliance", desc: "Automated CDSCO Schedule H and GSTR-1 ledgers built directly into the core transaction engine." },
    { title: "Pharmacy Empathy", desc: "Every keyboard shortcut and button is optimized for high-speed counter rush hours." }
  ];

  return (
    <div className="space-y-24 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider">
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Our Story & Mission</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Modernizing the Backbone of Healthcare Delivery
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
          Local pharmacies are India's primary health checkpoints. Inventra provides the mission-critical cloud software that keeps shelves stocked, billing instant, and communities healthy.
        </p>
      </section>

      {/* Origin Story */}
      <section className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-12 backdrop-blur-xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {story.heading}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {story.p1}
          </p>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            {story.p2}
          </p>
          <div className="pt-2 flex items-center gap-4 text-xs text-teal-400 font-semibold">
            <span className="flex items-center gap-1"><Award className="w-4 h-4" /> ISO 27001 Certified</span>
            <span className="flex items-center gap-1"><Globe2 className="w-4 h-4" /> Multi-DC Resilience</span>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-teal-950/80 to-slate-900 border border-teal-500/20 p-8 space-y-6">
          <h3 className="text-lg font-bold text-teal-300">Why Inventra Stands Apart</h3>
          <div className="space-y-4">
            {values.map((val: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white">{val.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{val.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership / Culture */}
      <section className="space-y-8 text-center max-w-4xl mx-auto">
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Built by Experienced Technologists & Pharmacists</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Our team brings together decades of experience from high-scale fintech, distributed cloud computing, and certified pharmaceutical management.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          {[
            { role: "Product & Regulatory", desc: "Ex-hospital pharmacy director with 15+ years managing high-volume tertiary care dispensaries." },
            { role: "Distributed Core Systems", desc: "Ex-cloud architects specialized in multi-tenant PostgreSQL, offline sync, and bank-grade encryption." },
            { role: "Customer Excellence", desc: "Dedicated on-ground implementation specialists available 7 days a week for training and migrations." }
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-left space-y-2 hover:border-slate-700 transition-colors">
              <h3 className="text-base font-bold text-white">{item.role}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center rounded-3xl bg-slate-900 border border-slate-800 p-10 space-y-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Join the Next Generation of Indian Pharmacies</h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">Get your dispensary onboarded in under 10 minutes with instant cloud activation.</p>
        <div className="pt-2">
          <Link to="/apply" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-400 text-slate-950 font-bold text-sm hover:brightness-110 transition-all">
            <span>Apply for Pharmacy License</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
