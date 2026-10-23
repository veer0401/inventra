import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cmsApi, type CmsPage } from "../../services/cmsApi";
import {
  Award,
  HeartPulse,
  CheckCircle2,
  ArrowRight,
  Globe2,
  Mail,
  Phone,
  Clock,
  MapPin,
  ExternalLink,
  Building2,
  Compass,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface OfficeLocation {
  name: string;
  badge: string;
  address: string;
  city: string;
  googleSpaceUrl: string;
  coordinates: string;
  phone: string;
  email: string;
}

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

  const contactEmail = cmsData?.content?.contactEmail || "support@inventra.in";
  const contactPhone = cmsData?.content?.contactPhone || "+91 80 4567 8900";
  const supportHours = cmsData?.content?.supportHours || "Monday – Saturday: 8:00 AM – 10:00 PM IST (Emergency 24/7 Critical Triage)";

  const offices: OfficeLocation[] = cmsData?.content?.offices || [
    {
      name: "Bengaluru Technology & Innovation Space",
      badge: "Global Headquarters",
      address: "Level 4, Inventra Cloud Tower, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
      city: "Bengaluru, Karnataka",
      googleSpaceUrl: "https://www.google.com/maps/search/?api=1&query=Inventra+Technologies+Indiranagar+Bengaluru",
      coordinates: "12.9716° N, 77.6412° E",
      phone: "+91 80 4567 8900",
      email: "bengaluru@inventra.in",
    },
    {
      name: "Mumbai Healthcare & Logistics Center",
      badge: "Regional Operations",
      address: "Suite 802, The Capital, G Block, Bandra Kurla Complex (BKC), Bandra East, Mumbai, Maharashtra 400051",
      city: "Mumbai, Maharashtra",
      googleSpaceUrl: "https://www.google.com/maps/search/?api=1&query=Bandra+Kurla+Complex+Mumbai",
      coordinates: "19.0657° N, 72.8687° E",
      phone: "+91 22 6789 0123",
      email: "mumbai@inventra.in",
    },
    {
      name: "New Delhi Regulatory & Government Affairs Hub",
      badge: "Regulatory Office",
      address: "Regus Cyber City, DLF Phase 2, Gurugram, Delhi-NCR 122002",
      city: "Delhi-NCR",
      googleSpaceUrl: "https://www.google.com/maps/search/?api=1&query=DLF+Cyber+City+Gurugram",
      coordinates: "28.4906° N, 77.0886° E",
      phone: "+91 11 4321 9876",
      email: "delhi@inventra.in",
    },
  ];

  return (
    <div className="space-y-24 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/90 text-teal-800 text-xs font-semibold tracking-wide shadow-xs">
          <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
          <span>Our Story & Mission</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Modernizing the Backbone of Healthcare Delivery
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Local pharmacies are India's primary health checkpoints. Inventra provides the mission-critical cloud software that keeps shelves stocked, billing instant, and communities healthy.
        </p>
      </section>

      {/* Origin Story */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center shadow-card">
        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {story.heading}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {story.p1}
          </p>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
            {story.p2}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-teal-800 font-semibold">
            <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-teal-600" /> ISO 27001 Certified</span>
            <span className="flex items-center gap-1.5"><Globe2 className="w-4 h-4 text-teal-600" /> Multi-DC Resilience</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-600" /> CDSCO Schedule H Compliant</span>
          </div>
        </div>
        <div className="rounded-2xl bg-teal-50/70 border border-teal-200/80 p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-700" />
            <h3 className="text-lg font-bold text-teal-950">Why Inventra Stands Apart</h3>
          </div>
          <div className="space-y-4">
            {values.map((val: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-teal-100 shadow-2xs hover:border-teal-200 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{val.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{val.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Direct Contact & Support Reachout Section */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/90 text-teal-800 text-xs font-semibold tracking-wide shadow-xs">
            <Phone className="w-3.5 h-3.5 text-teal-600" />
            <span>Direct Support & Inquiries</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">We're Here for Your Pharmacy 24/7</h2>
          <p className="text-sm text-slate-600">
            Reach out to our clinical engineering and support teams anytime. All channels are monitored by live specialists.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Email Support */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-6 flex flex-col justify-between shadow-card hover:shadow-card-hover hover:border-teal-200 transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 group-hover:scale-105 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Email Us Directly</h3>
              <p className="text-xs text-slate-600">
                For sales demos, onboarding inquiries, and technical pharmacy integrations.
              </p>
            </div>
            <div className="pt-5 border-t border-slate-100 mt-4">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900 transition-colors"
              >
                <span>{contactEmail}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Phone Hotline */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-6 flex flex-col justify-between shadow-card hover:shadow-card-hover hover:border-emerald-200 transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Direct Phone Line</h3>
              <p className="text-xs text-slate-600">
                Speak immediately with our priority onboarding and pharmacy operations desk.
              </p>
            </div>
            <div className="pt-5 border-t border-slate-100 mt-4">
              <a
                href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                <span>{contactPhone}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="rounded-2xl bg-white border border-slate-200/90 p-6 flex flex-col justify-between shadow-card hover:shadow-card-hover hover:border-indigo-200 transition-all group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Support Schedule</h3>
              <p className="text-xs text-slate-600">
                Standard counter support hours with emergency triage for critical dispensaries.
              </p>
            </div>
            <div className="pt-5 border-t border-slate-100 mt-4">
              <p className="text-xs font-semibold text-indigo-800">
                {supportHours}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Google Space / Office Hub Locations Section */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/90 text-teal-800 text-xs font-semibold tracking-wide shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Google Space & Office Centers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Our Innovation & Operations Spaces</h2>
          <p className="text-sm text-slate-600">
            Visit our state-of-the-art office spaces and regional support hubs across India or connect with our regional representatives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {offices.map((office, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white border border-slate-200/90 p-6 flex flex-col justify-between hover:border-teal-200 hover:shadow-card-hover transition-all shadow-card group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/80">
                    {office.badge}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <Compass className="w-3 h-3 text-slate-400" />
                    <span>{office.city}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                    {office.name}
                  </h3>
                  <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                    <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{office.address}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <a href={`tel:${office.phone.replace(/\s+/g, "")}`} className="text-slate-700 hover:text-teal-700 font-medium">
                      {office.phone}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email:</span>
                    <a href={`mailto:${office.email}`} className="text-slate-700 hover:text-teal-700 font-medium">
                      {office.email}
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">GPS:</span>
                    <span className="font-mono text-slate-600">{office.coordinates}</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-5">
                <a
                  href={office.googleSpaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-teal-700 hover:text-white text-slate-800 text-xs font-semibold border border-slate-200 transition-all shadow-xs"
                >
                  <span>Open in Google Space / Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership / Culture */}
      <section className="space-y-8 text-center max-w-4xl mx-auto">
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Built by Experienced Technologists & Pharmacists</h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Our team brings together decades of experience from high-scale fintech, distributed cloud computing, and certified pharmaceutical management.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          {[
            { role: "Product & Regulatory", desc: "Ex-hospital pharmacy director with 15+ years managing high-volume tertiary care dispensaries." },
            { role: "Distributed Core Systems", desc: "Ex-cloud architects specialized in multi-tenant PostgreSQL, offline sync, and bank-grade encryption." },
            { role: "Customer Excellence", desc: "Dedicated on-ground implementation specialists available 7 days a week for training and migrations." }
          ].map((item, idx) => (
            <div key={idx} className="rounded-2xl bg-white border border-slate-200/90 p-6 text-left space-y-2 shadow-card hover:border-slate-300 transition-colors">
              <h3 className="text-base font-bold text-slate-900">{item.role}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center rounded-3xl bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 border border-teal-700/80 p-10 space-y-5 shadow-lg text-white">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Join the Next Generation of Indian Pharmacies</h2>
        <p className="text-sm text-teal-100/90 max-w-lg mx-auto">Get your dispensary onboarded in under 10 minutes with instant cloud activation.</p>
        <div className="pt-2">
          <Link to="/apply" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-teal-950 font-bold text-sm transition-all shadow-md">
            <span>Apply for Pharmacy License</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
