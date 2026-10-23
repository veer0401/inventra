import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cmsApi, type CmsPage } from "../../services/cmsApi";
import {
  ShieldCheck,
  FileText,
  Clock,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Lock,
  RefreshCw,
  Scale,
  Sparkles,
} from "lucide-react";

interface LegalSection {
  id?: string;
  title: string;
  content: string;
}

interface GrievanceOfficer {
  name: string;
  designation: string;
  email: string;
  phone: string;
  address: string;
}

interface CertificationItem {
  badge: string;
  label: string;
}

interface LegalContentPageProps {
  pageKey: "PRIVACY" | "TERMS" | "REFUND" | "SECURITY";
}

export const LegalContentPage: React.FC<LegalContentPageProps> = ({ pageKey }) => {
  const [cmsData, setCmsData] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    cmsApi.getPublicPage(pageKey)
      .then((res) => {
        if (mounted) {
          setCmsData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn(`Could not load CMS content for ${pageKey}:`, err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pageKey]);

  // Fallback defaults if database has not migrated yet
  const pageIcons: Record<string, React.ReactNode> = {
    PRIVACY: <Lock className="w-5 h-5 text-teal-400" />,
    TERMS: <Scale className="w-5 h-5 text-teal-400" />,
    REFUND: <RefreshCw className="w-5 h-5 text-teal-400" />,
    SECURITY: <ShieldCheck className="w-5 h-5 text-teal-400" />,
  };

  const pageLabels: Record<string, string> = {
    PRIVACY: "Privacy Policy & Data Protection",
    TERMS: "Terms and Conditions of Service",
    REFUND: "Cancellation, Refund & Proration Policy",
    SECURITY: "Security, Compliance & Trust Center",
  };

  const title = cmsData?.title || pageLabels[pageKey];
  const subtitle =
    cmsData?.subtitle ||
    "Official policy governing Inventra cloud pharmacy software, regulatory safety, and subscriber accounts.";

  const content = cmsData?.content || {};
  const lastUpdated = content.lastUpdated || "September 2026";
  const contactEmail = content.contactEmail || "support@inventra.in";
  const sections: LegalSection[] = content.sections || [];
  const grievanceOfficer: GrievanceOfficer | undefined = content.grievanceOfficer;
  const certifications: CertificationItem[] | undefined = content.certifications;

  return (
    <div className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <section className="space-y-5 border-b border-slate-200 pb-8 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/90 text-teal-800 text-xs font-semibold tracking-wide shadow-xs">
            {pageIcons[pageKey]}
            <span>Legal & Regulatory Compliance</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Updated: {lastUpdated}</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
          {subtitle}
        </p>

        {/* Quick Nav Pill Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {[
            { key: "PRIVACY", label: "Privacy Policy", to: "/privacy" },
            { key: "TERMS", label: "Terms of Service", to: "/terms" },
            { key: "REFUND", label: "Refund & Cancellation", to: "/refund" },
            { key: "SECURITY", label: "Security Center", to: "/security" },
          ].map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                pageKey === item.key
                  ? "bg-teal-700 text-white font-bold shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Security Certifications Grid (if applicable) ─────────────────── */}
      {certifications && certifications.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {certifications.map((c, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 flex flex-col items-center text-center space-y-1.5 shadow-card"
            >
              <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 text-xs font-bold font-mono border border-teal-200">
                {c.badge}
              </span>
              <span className="text-xs text-slate-700 font-medium leading-snug pt-1">
                {c.label}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ─── Main Content Sections ─────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-6 bg-slate-100 rounded-lg w-1/3" />
          <div className="h-24 bg-slate-100 rounded-2xl w-full" />
          <div className="h-6 bg-slate-100 rounded-lg w-1/4" />
          <div className="h-24 bg-slate-100 rounded-2xl w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <article
              key={section.id || idx}
              className="rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-8 space-y-3.5 shadow-card hover:border-slate-300 transition-colors"
            >
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                <span>{section.title}</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed pl-7 whitespace-pre-line">
                {section.content}
              </p>
            </article>
          ))}
        </div>
      )}

      {/* ─── Grievance Officer Card (for Privacy / Legal) ──────────────────── */}
      {grievanceOfficer && (
        <section className="rounded-3xl bg-teal-50/70 border border-teal-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-teal-700">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-base font-bold text-teal-950 uppercase tracking-wider">
              Designated Grievance & Data Protection Officer
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            In compliance with the Information Technology Act 2000 and Digital Personal Data Protection Act (DPDPA) 2023, the details of our Grievance Officer are published below:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-white border border-teal-100 shadow-2xs space-y-1">
              <span className="text-slate-500">Name & Designation:</span>
              <p className="font-bold text-slate-900 text-sm">{grievanceOfficer.name}</p>
              <p className="text-teal-700 font-medium">{grievanceOfficer.designation}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-teal-100 shadow-2xs space-y-1">
              <span className="text-slate-500">Official Contact:</span>
              <p className="font-medium text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-600" />
                <a href={`mailto:${grievanceOfficer.email}`} className="hover:underline text-teal-700">
                  {grievanceOfficer.email}
                </a>
              </p>
              <p className="font-medium text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <a href={`tel:${grievanceOfficer.phone}`} className="hover:underline text-teal-700">
                  {grievanceOfficer.phone}
                </a>
              </p>
            </div>
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-white border border-teal-100 shadow-2xs flex items-start gap-2">
              <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500">Postal Address:</span>
                <p className="text-slate-700 mt-0.5">{grievanceOfficer.address}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Bottom Support & Inquiries Helpdesk Banner ─────────────────────── */}
      <section className="rounded-2xl bg-slate-50 border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>Have questions regarding our terms or legal compliance?</span>
          </h4>
          <p className="text-xs text-slate-600">
            Our legal and compliance team can be contacted directly at <strong className="text-teal-700">{contactEmail}</strong>.
          </p>
        </div>
        <a
          href={`mailto:${contactEmail}`}
          className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs transition-all shrink-0"
        >
          Contact Legal Desk
        </a>
      </section>
    </div>
  );
};

