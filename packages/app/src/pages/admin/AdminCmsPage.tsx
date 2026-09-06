import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cmsApi,
  type Coupon,
  type CreateCouponPayload,
} from "../../services/cmsApi";
import { useToast } from "@inventra/ui";
import {
  Layers,
  FileEdit,
  Plus,
  Trash2,
  Save,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  Clock,
  CreditCard,
  ArrowRight,
  Code2,
  AlignLeft,
  Info,
  Layout,
  BarChart3,
  Building2,
  ShieldCheck,
  Phone,
  Mail,
  Eye,
  ChevronUp,
  ChevronDown,
  FileText,
  Zap,
  Briefcase,
  Award,
  Users,
  CheckCircle2,
} from "lucide-react";

const DEFAULT_CMS_TEMPLATES: Record<string, { title: string; subtitle: string; content: any }> = {
  ABOUT: {
    title: "Transforming Healthcare Logistics & Pharmacy Retail Across India",
    subtitle: "Inventra was founded by healthcare technologists and retail pharmacists to replace obsolete desktop software with an intelligent, compliance-first operating platform.",
    content: {
      contactEmail: "support@inventra.in",
      contactPhone: "+91 80 4567 8900",
      supportHours: "Monday – Saturday: 8:00 AM – 10:00 PM IST (Emergency 24/7 Critical Triage)",
      story: {
        heading: "Empowering 1 Million Chemists Across Bharat",
        p1: "Founded by retail pharmacists and distributed systems engineers, Inventra was born out of a real dispensary counter in Mumbai.",
        p2: "We built Inventra from the ground up to be resilient, lightning-fast, and deeply aligned with Indian drug regulations like the Drugs and Cosmetics Act and Schedule H/H1 registers."
      },
      values: [
        { title: "Zero Data Loss", desc: "Local-first architecture ensures that offline cashier counters never lose a single rupee or transaction." },
        { title: "Statutory Compliance", desc: "Automated CDSCO Schedule H and GSTR-1 ledgers built directly into the core transaction engine." },
        { title: "Pharmacy Empathy", desc: "Every keyboard shortcut and button is optimized for high-speed counter rush hours." }
      ],
      offices: [
        {
          name: "Bengaluru Technology & Innovation Space",
          badge: "Global Headquarters",
          address: "Level 4, Inventra Cloud Tower, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
          city: "Bengaluru, Karnataka",
          googleSpaceUrl: "https://www.google.com/maps/search/?api=1&query=Inventra+Technologies+Indiranagar+Bengaluru",
          coordinates: "12.9716° N, 77.6412° E",
          phone: "+91 80 4567 8900",
          email: "bengaluru@inventra.in"
        },
        {
          name: "Mumbai Healthcare & Logistics Center",
          badge: "Regional Operations",
          address: "Suite 802, The Capital, G Block, Bandra Kurla Complex (BKC), Bandra East, Mumbai, Maharashtra 400051",
          city: "Mumbai, Maharashtra",
          googleSpaceUrl: "https://www.google.com/maps/search/?api=1&query=Bandra+Kurla+Complex+Mumbai",
          coordinates: "19.0657° N, 72.8687° E",
          phone: "+91 22 6789 0123",
          email: "mumbai@inventra.in"
        }
      ]
    }
  },
  PRIVACY: {
    title: "Inventra Privacy Policy & Data Governance",
    subtitle: "Our comprehensive commitment to patient data privacy, prescription confidentiality, and compliance with the Digital Personal Data Protection Act (DPDPA) 2023.",
    content: {
      lastUpdated: "September 2026",
      contactEmail: "privacy@inventra.in",
      grievanceOfficer: {
        name: "Arjun Sharma",
        designation: "Data Protection & Grievance Officer",
        email: "grievance@inventra.in",
        phone: "+91 80 4567 8905",
        address: "Inventra Cloud Tower, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038"
      },
      sections: [
        {
          id: "commitment",
          title: "1. Patient Confidentiality & Medical Records",
          content: "Inventra operates strictly as a B2B cloud software processor. We never sell, monetize, or harvest identifiable patient health records."
        },
        {
          id: "collection",
          title: "2. Information We Collect",
          content: "Pharmacy account credentials, store operational data (inventory, batches, supplier invoices), and metadata necessary for statutory GSTR-1 returns."
        },
        {
          id: "security",
          title: "3. Data Security & Encryption Standards",
          content: "All data in transit is encrypted using TLS 1.3 with HSTS. Data at rest is encrypted using AES-256 with hardware-backed key rotation."
        }
      ]
    }
  },
  TERMS: {
    title: "Terms and Conditions of Service",
    subtitle: "The legal agreement governing your subscription, use of Inventra cloud software, workstation licensing, and statutory compliance duties.",
    content: {
      lastUpdated: "September 2026",
      contactEmail: "legal@inventra.in",
      sections: [
        {
          id: "eligibility",
          title: "1. Eligibility & Pharmacy Licensing Verification",
          content: "Subscribers must possess valid Drug Licenses (Form 20, 20B, 21, or 21B) issued by the State Drugs Control Administration."
        },
        {
          id: "dispensation",
          title: "2. Dispensing Accountability & Schedule H Warning",
          content: "The legal responsibility for dispensing accurate medicines lies solely with the registered licensed pharmacist."
        },
        {
          id: "sla",
          title: "3. Service Availability & Offline Guarantees",
          content: "Inventra targets a 99.99% cloud API uptime. In the event of broadband outage, desktop cashier counters record sales locally and sync on reconnect."
        }
      ]
    }
  },
  REFUND: {
    title: "Cancellation, Refund & Proration Policy",
    subtitle: "Clear guidelines on subscription cancellations, pro-rated billing adjustments, cloud tier upgrades, and eligible refunds.",
    content: {
      lastUpdated: "September 2026",
      contactEmail: "billing@inventra.in",
      sections: [
        {
          id: "guarantee",
          title: "1. 14-Day Zero-Risk Money-Back Guarantee",
          content: "For first-time pharmacy subscribers, we offer an unconditional 14-day money-back guarantee on all SaaS subscriptions."
        },
        {
          id: "proration",
          title: "2. Mid-Cycle Plan Upgrades & Credit Proration",
          content: "When upgrading tiers mid-cycle, our billing engine credits the unused balance of your current period towards your new tier invoice."
        },
        {
          id: "cancellation",
          title: "3. Subscription Cancellation & Grace Period",
          content: "You may cancel auto-debit anytime. You retain a 60-day grace period to download all GST ledgers, purchase orders, and inventory audits."
        }
      ]
    }
  },
  SECURITY: {
    title: "Security, Compliance & Trust Center",
    subtitle: "How Inventra protects critical pharmacy records with bank-grade AES-256 encryption, role-based access control, and ISO 27001 certified cloud infrastructure.",
    content: {
      lastUpdated: "September 2026",
      contactEmail: "security@inventra.in",
      certifications: [
        { badge: "ISO 27001", label: "Information Security Management Certified" },
        { badge: "AES-256", label: "Hardware Encrypted Cloud & Local Storage" },
        { badge: "CDSCO Ready", label: "Schedule H & H1 Regulatory Audit Trail" },
        { badge: "DPDPA 2023", label: "Indian Data Protection Law Aligned" }
      ],
      sections: [
        {
          id: "cloud_arch",
          title: "1. Multi-Availability Zone Cloud Infrastructure",
          content: "Hosted in ISO 27001 and SOC 2 Type II certified data centers in Mumbai and Hyderabad with automated failover."
        },
        {
          id: "rbac",
          title: "2. Role-Based Access & Tamper-Evident Audit Trails",
          content: "Every discount override, bill cancellation, and stock adjustment is permanently recorded in an immutable audit ledger."
        }
      ]
    }
  },
  HOME: {
    title: "The Modern Operating System for Independent & Multi-Branch Pharmacies",
    subtitle: "High-speed POS billing, statutory Schedule H drug compliance, FEFO batch routing, and offline-first synchronization engineered for Indian pharmacy retail.",
    content: {
      heroBadge: "New: Integrated GST E-Invoicing & UPI Dynamic Payments",
      primaryCtaText: "Start 14-Day Free Trial",
      primaryCtaLink: "/apply",
      secondaryCtaText: "Explore Plans & Pricing",
      secondaryCtaLink: "/plans",
      stats: [
        { label: "Billing Speed", value: "< 300ms", subtext: "Counter checkout speed" },
        { label: "Active Stores", value: "2,400+", subtext: "Pan-India pharmacies" },
        { label: "Prescriptions Handled", value: "12M+", subtext: "Zero compliance errors" },
        { label: "Uptime Guarantee", value: "99.99%", subtext: "Offline resilient" }
      ],
      highlights: [
        { title: "Sub-Second Fast POS Billing", desc: "Process over 30 items per minute with barcode integration." },
        { title: "Smart FEFO & Expiry Routing", desc: "Dispense earliest expiring stock first automatically." }
      ]
    }
  },
  FEATURES: {
    title: "Everything You Need to Run a Modern Pharmacy",
    subtitle: "From independent single-counter chemists to multi-branch hospital dispensaries, explore the features that power high-concurrency Indian pharmacies.",
    content: {
      modules: [
        {
          title: "Lightning POS & Prescription Billing",
          desc: "Designed for high rush hours. Pure keyboard-driven navigation with F1-F12 shortcuts. Barcode scan with instant batch lookup, split payments across UPI QR & Cash, and 80mm ESC/POS thermal receipt printing.",
          iconKey: "Zap",
          bullets: [
            "Sub-200ms item barcode scanning & price resolution",
            "Dynamic UPI QR generation directly on counter screen",
            "Split payments: Cash, Card, UPI, and Store Credit",
            "Customizable 2-inch & 3-inch thermal printer slips"
          ]
        },
        {
          title: "Intelligent FEFO & Expiry Routing",
          desc: "Say goodbye to dead inventory write-offs. First-Expiry-First-Out automatically dispatches medicines expiring earliest first, with color-coded shelf badges and proactive vendor return workflows.",
          iconKey: "Clock",
          bullets: [
            "Automatic earliest-expiring batch allocation on bill entry",
            "30, 60, and 90-day proactive expiry risk notifications",
            "One-click supplier debit note and return generation",
            "Batch-wise MRP, Purchase Rate, and Margin tracking"
          ]
        },
        {
          title: "Multi-Store & Inter-Branch Transfers",
          desc: "Centralized visibility across primary dispensaries and secondary retail counters. Initiate stock transfers, track transit batches, and verify dispatched quantities with strict audit integrity.",
          iconKey: "Building2",
          bullets: [
            "Consolidated multi-store live stock search",
            "Automated inter-branch transfer notes & transit verification",
            "Branch-specific permissions, price lists, and cash ledgers",
            "Centralized procurement & bulk purchase order routing"
          ]
        },
        {
          title: "Statutory CDSCO & GSTR-1 Compliance",
          desc: "Never fear a drug inspector audit. Schedule H and H1 registers are populated automatically on prescription sales, and input tax credits (ITC) reconcile seamlessly with GSTR-1 formats.",
          iconKey: "ShieldCheck",
          bullets: [
            "Automated Schedule H & H1 register maintenance with doctor details",
            "HSN 997331 / 3004 tax classification & CGST/SGST breakdowns",
            "GSTR-1 JSON and Excel export ready for one-click CA upload",
            "Tamper-proof immutable billing ledger audit logs"
          ]
        }
      ]
    }
  },
  CAREERS: {
    title: "Shape the Future of Pharmacy Cloud Tech",
    subtitle: "Join our mission to build India's high-speed, clinical-grade pharmacy operating system. Work with high-concurrency architectures, offline-sync protocols, and mission-critical healthcare infrastructure.",
    content: {
      culture: "We value ownership, deep operational empathy for pharmacy owners, and rigorous engineering standards. We solve real-world problems that directly impact public healthcare accessibility.",
      perks: [
        "Competitive equity packages and comprehensive health coverage",
        "Flexible hybrid work environment (Bengaluru / Remote)",
        "Annual learning and conference stipends",
        "Wellness benefits and ergonomic home-office allowances"
      ],
      openings: [
        {
          id: "eng-01",
          title: "Senior Full-Stack Engineer (React / Java)",
          department: "Engineering",
          location: "Bengaluru / Hybrid",
          employmentType: "Full-Time",
          experienceLevel: "4-7 Years",
          summary: "Lead the architecture of our offline-first synchronization engine and high-throughput POS checkout client."
        },
        {
          id: "eng-02",
          title: "Backend Systems Architect (Spring Boot / PostgreSQL)",
          department: "Platform",
          location: "Bengaluru / Remote",
          employmentType: "Full-Time",
          experienceLevel: "5-8 Years",
          summary: "Scale our multi-tenant cloud backend processing millions of daily pharmacy ledger entries and automated GST reports."
        },
        {
          id: "prod-01",
          title: "Product Designer (Design Systems & POS UX)",
          department: "Design",
          location: "Bengaluru",
          employmentType: "Full-Time",
          experienceLevel: "3-5 Years",
          summary: "Design lightning-fast keyboard-first interfaces for retail cashiers and intuitive analytics dashboards for store owners."
        }
      ]
    }
  }
};

export const AdminCmsPage: React.FC = () => {
  const toast = useToast();
  const showToast = ({ type, title, message }: { type: "success" | "error" | "warning" | "info"; title?: string; message: string }) => {
    if (type === "success") toast.success(message, title);
    else if (type === "error") toast.error(message, title);
    else if (type === "warning") toast.warning(message, title);
    else toast.info(message, title);
  };
  const [activeTab, setActiveTab] = useState<"PAGES" | "COUPONS">("PAGES");

  // ─── Coupons State ────────────────────────────────────────────────────────
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState<CreateCouponPayload>({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    maxDiscountAmount: null,
    firstTimeOnly: false,
    minTier: null,
    minCycle: null,
    minOrderAmount: null,
    maxUses: null,
    validUntil: null,
    active: true,
  });
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // ─── CMS Pages State ──────────────────────────────────────────────────────
  const [selectedPageKey, setSelectedPageKey] = useState<string>("HOME");
  const [editorMode, setEditorMode] = useState<"VISUAL" | "JSON">("VISUAL");
  const [parsedContent, setParsedContent] = useState<any>({});
  const [cmsJsonString, setCmsJsonString] = useState("");
  const [cmsTitle, setCmsTitle] = useState("");
  const [cmsSubtitle, setCmsSubtitle] = useState("");
  const [savingCms, setSavingCms] = useState(false);

  // ─── Load Initial Data ───────────────────────────────────────────────────
  const fetchCoupons = async () => {
    try {
      const res = await cmsApi.getAllCoupons();
      setCoupons(res);
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to load coupons list." });
    }
  };

  const fetchCmsPage = async (key: string) => {
    try {
      const res = await cmsApi.getAdminPage(key);
      setCmsTitle(res.title);
      setCmsSubtitle(res.subtitle || "");
      const content = res.content || {};
      setParsedContent(content);
      setCmsJsonString(JSON.stringify(content, null, 2));
    } catch {
      showToast({ type: "error", title: "Error", message: `Failed to load CMS content for ${key}.` });
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchCmsPage(selectedPageKey);
  }, []);

  const updateContent = (mutator: (draft: any) => void) => {
    setParsedContent((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      mutator(copy);
      setCmsJsonString(JSON.stringify(copy, null, 2));
      return copy;
    });
  };

  const handleSwitchToVisual = () => {
    try {
      const parsed = JSON.parse(cmsJsonString);
      setParsedContent(parsed);
      setEditorMode("VISUAL");
    } catch {
      showToast({ type: "error", title: "JSON Syntax Error", message: "Cannot switch to Visual Form: fix JSON syntax errors first." });
    }
  };

  const handleLoadTemplate = () => {
    const template = DEFAULT_CMS_TEMPLATES[selectedPageKey];
    if (template) {
      if (!cmsTitle) setCmsTitle(template.title);
      if (!cmsSubtitle) setCmsSubtitle(template.subtitle);
      setParsedContent(template.content);
      setCmsJsonString(JSON.stringify(template.content, null, 2));
      showToast({ type: "info", title: "Template Loaded", message: `Loaded recommended schema template for ${selectedPageKey}.` });
    } else {
      showToast({ type: "warning", title: "No Template", message: `No pre-built template found for ${selectedPageKey}.` });
    }
  };

  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(cmsJsonString);
      setParsedContent(parsed);
      setCmsJsonString(JSON.stringify(parsed, null, 2));
      showToast({ type: "success", title: "Valid JSON", message: "Formatted JSON content successfully." });
    } catch {
      showToast({ type: "error", title: "Syntax Error", message: "Cannot format invalid JSON. Please check commas, quotes, and brackets." });
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      showToast({ type: "error", title: "Validation Error", message: "Coupon code is required." });
      return;
    }
    setCreatingCoupon(true);
    try {
      await cmsApi.createCoupon({
        ...couponForm,
        code: couponForm.code.trim().toUpperCase(),
      });
      showToast({ type: "success", title: "Coupon Created", message: `Coupon ${couponForm.code.toUpperCase()} is now active.` });
      setShowCreateCouponModal(false);
      setCouponForm({
        code: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: 10,
        maxDiscountAmount: null,
        firstTimeOnly: false,
        minTier: null,
        minCycle: null,
        minOrderAmount: null,
        maxUses: null,
        validUntil: null,
        active: true,
      });
      fetchCoupons();
    } catch (err: any) {
      showToast({ type: "error", title: "Failed to Create Coupon", message: err.response?.data?.message || err.message });
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;
    try {
      await cmsApi.deleteCoupon(code);
      showToast({ type: "success", title: "Coupon Deleted", message: `Coupon ${code} has been removed.` });
      fetchCoupons();
    } catch (err: any) {
      showToast({ type: "error", title: "Delete Failed", message: err.response?.data?.message || err.message });
    }
  };

  const handleSaveCmsPage = async (e: React.FormEvent) => {
    e.preventDefault();
    let contentToSave: any;
    if (editorMode === "VISUAL") {
      contentToSave = parsedContent;
    } else {
      try {
        contentToSave = JSON.parse(cmsJsonString);
      } catch {
        showToast({ type: "error", title: "JSON Syntax Error", message: "Please check your JSON format before saving." });
        return;
      }
    }

    setSavingCms(true);
    try {
      await cmsApi.updateAdminPage(selectedPageKey, {
        title: cmsTitle,
        subtitle: cmsSubtitle,
        content: contentToSave,
      });
      showToast({ type: "success", title: "Page Content Saved", message: `${selectedPageKey} copy has been updated live on the website.` });
      fetchCmsPage(selectedPageKey);
    } catch (err: any) {
      showToast({ type: "error", title: "Update Failed", message: err.response?.data?.message || err.message });
    } finally {
      setSavingCms(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* ─── Page Title Bar ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-teal-500" />
            Website CMS & Coupon Manager
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Dynamically update public marketing pages, tier features & pricing, and create conditional promotional discount codes.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-surface-raised p-1 rounded-xl border border-border self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("PAGES")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "PAGES"
                ? "bg-teal-500 text-slate-950 shadow-sm"
                : "text-secondary hover:text-primary hover:bg-surface-hover"
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Pages Content</span>
          </button>
          <button
            onClick={() => setActiveTab("COUPONS")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "COUPONS"
                ? "bg-teal-500 text-slate-950 shadow-sm"
                : "text-secondary hover:text-primary hover:bg-surface-hover"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coupons & Gift Codes</span>
          </button>
        </div>
      </div>

      {/* Canonical Plan Management Callout Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 text-xs text-secondary">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-primary text-sm">Managing Subscription Plans & Pricing?</p>
            <p className="text-secondary text-xs mt-0.5">
              Plan tiers, monthly rates, annual discounts, feature lists, and workstation quotas are centrally governed in Store Subscriptions.
            </p>
          </div>
        </div>
        <Link
          to="/admin/subscriptions?tab=pricing"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 shadow-md shadow-teal-500/20 transition-all shrink-0 self-start sm:self-auto"
        >
          <span>Configure Plans & Pricing</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ─── TAB: PAGES CONTENT ───────────────────────────────────────────── */}
      {activeTab === "PAGES" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-1 space-y-4 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
            <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
              <div>
                <h3 className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-2 px-1">Marketing Pages</h3>
                <div className="space-y-1">
                  {[
                    { key: "HOME", label: "Home Page" },
                    { key: "ABOUT", label: "About & Offices" },
                    { key: "FEATURES", label: "Features Page" },
                    { key: "CAREERS", label: "Careers Page" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedPageKey(key);
                        fetchCmsPage(key);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                        selectedPageKey === key
                          ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                          : "text-secondary hover:text-primary hover:bg-surface-hover border border-transparent"
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-[10px] font-mono opacity-60">{key}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <h3 className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-2 px-1">Legal & Compliance</h3>
                <div className="space-y-1">
                  {[
                    { key: "PRIVACY", label: "Privacy Policy" },
                    { key: "TERMS", label: "Terms of Service" },
                    { key: "REFUND", label: "Refund & Proration" },
                    { key: "SECURITY", label: "Security & Trust" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedPageKey(key);
                        fetchCmsPage(key);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                        selectedPageKey === key
                          ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                          : "text-secondary hover:text-primary hover:bg-surface-hover border border-transparent"
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-[10px] font-mono opacity-60">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-surface border border-border rounded-2xl p-6 space-y-6">
            {/* Editor Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <FileEdit className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                    <span>Editing {selectedPageKey} Page</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-raised border border-border font-mono text-secondary">
                      {selectedPageKey}
                    </span>
                  </h2>
                  <p className="text-[11px] text-secondary">
                    Changes will immediately publish live on the public storefront website.
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-app p-1 rounded-xl border border-border self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSwitchToVisual}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    editorMode === "VISUAL"
                      ? "bg-teal-500 text-slate-950 shadow-sm"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>Visual Form (Easy)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("JSON")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    editorMode === "JSON"
                      ? "bg-teal-500 text-slate-950 shadow-sm"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Raw JSON</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveCmsPage} className="space-y-6">
              {/* Page Title & Subtitle (Global for all pages) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-raised/50 border border-border">
                <div>
                  <label className="text-xs font-semibold text-secondary">Page Header Title</label>
                  <input
                    type="text"
                    value={cmsTitle}
                    onChange={(e) => setCmsTitle(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                    placeholder="Enter main page title"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Page Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={cmsSubtitle}
                    onChange={(e) => setCmsSubtitle(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                    placeholder="Enter brief description"
                  />
                </div>
              </div>

              {/* ─── VISUAL EDITOR MODE ────────────────────────────────────────── */}
              {editorMode === "VISUAL" ? (
                <div className="space-y-6">
                  {/* ────────────────── HOME PAGE VISUAL BUILDER ────────────────── */}
                  {selectedPageKey === "HOME" && (
                    <div className="space-y-6">
                      {/* Hero Announcement & CTAs */}
                      <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Hero Banner & CTA Actions</span>
                        </h3>
                        <div>
                          <label className="text-xs font-semibold text-secondary">Hero Top Announcement Pill</label>
                          <input
                            type="text"
                            value={parsedContent.heroBadge || ""}
                            onChange={(e) => updateContent((d) => { d.heroBadge = e.target.value; })}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                            placeholder="e.g. New: Integrated GST E-Invoicing & UPI Dynamic Payments"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-secondary">Primary CTA Button Text</label>
                            <input
                              type="text"
                              value={parsedContent.primaryCtaText || ""}
                              onChange={(e) => updateContent((d) => { d.primaryCtaText = e.target.value; })}
                              className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-secondary">Primary CTA Link</label>
                            <input
                              type="text"
                              value={parsedContent.primaryCtaLink || ""}
                              onChange={(e) => updateContent((d) => { d.primaryCtaLink = e.target.value; })}
                              className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-secondary">Secondary CTA Button Text</label>
                            <input
                              type="text"
                              value={parsedContent.secondaryCtaText || ""}
                              onChange={(e) => updateContent((d) => { d.secondaryCtaText = e.target.value; })}
                              className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-secondary">Secondary CTA Link</label>
                            <input
                              type="text"
                              value={parsedContent.secondaryCtaLink || ""}
                              onChange={(e) => updateContent((d) => { d.secondaryCtaLink = e.target.value; })}
                              className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                            />
                          </div>
                        </div>
                      </div>

                      {/* ─── REDESIGNED STATS & METRIC COUNTERS SECTION ─── */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-surface-raised via-surface to-surface-raised border border-border space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                              <BarChart3 className="w-4 h-4" />
                              <span>Homepage Metric Stats & Performance Strip</span>
                            </h3>
                            <p className="text-[11px] text-secondary mt-0.5">
                              Add, customize, or remove the prominent numerical stats that appear directly below the home hero banner.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateContent((d) => {
                              d.stats = [...(d.stats || []), { label: "New Metric", value: "100%", subtext: "Real-time accuracy" }];
                            })}
                            className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Metric Stat</span>
                          </button>
                        </div>

                        {/* Interactive Stat Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(parsedContent.stats || []).map((st: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-app border border-border hover:border-teal-500/30 transition-all space-y-2.5 relative group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-teal-400 font-mono">
                                  Metric #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateContent((d) => {
                                    d.stats = d.stats.filter((_: any, i: number) => i !== idx);
                                  })}
                                  className="p-1 rounded-lg text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Delete this stat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Metric Figure / Value</label>
                                  <input
                                    type="text"
                                    value={st.value || ""}
                                    onChange={(e) => updateContent((d) => { d.stats[idx].value = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-surface border border-border text-teal-400 focus:border-teal-500 focus:outline-none"
                                    placeholder="e.g. < 300ms, 2,400+"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Label / Title</label>
                                  <input
                                    type="text"
                                    value={st.label || ""}
                                    onChange={(e) => updateContent((d) => { d.stats[idx].label = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border text-primary focus:border-teal-500 focus:outline-none"
                                    placeholder="e.g. Billing Speed"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-secondary">Subtext / Explanatory Note</label>
                                <input
                                  type="text"
                                  value={st.subtext || ""}
                                  onChange={(e) => updateContent((d) => { d.stats[idx].subtext = e.target.value; })}
                                  className="mt-0.5 w-full px-2.5 py-1 text-[11px] rounded-lg bg-surface border border-border text-secondary focus:border-teal-500 focus:outline-none"
                                  placeholder="e.g. Counter checkout speed"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Live Strip Preview Box */}
                        <div className="pt-2">
                          <label className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <Eye className="w-3.5 h-3.5 text-teal-400" />
                            <span>Live Strip Preview (As Shown on Homepage)</span>
                          </label>
                          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {(parsedContent.stats || []).map((st: any, idx: number) => (
                              <div key={idx} className="text-center space-y-0.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/80">
                                <div className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
                                  {st.value || "—"}
                                </div>
                                <div className="text-xs font-bold text-slate-200 truncate">{st.label || "Metric"}</div>
                                <div className="text-[10px] text-slate-400 truncate">{st.subtext || ""}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Highlights Cards */}
                      <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                            Feature Highlights
                          </h3>
                          <button
                            type="button"
                            onClick={() => updateContent((d) => {
                              d.highlights = [...(d.highlights || []), { title: "New Feature Highlight", desc: "Detailed explanation of this capability." }];
                            })}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Highlight</span>
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(parsedContent.highlights || []).map((hl: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-app border border-border space-y-2 relative group">
                              <div className="flex items-center justify-between">
                                <input
                                  type="text"
                                  value={hl.title || ""}
                                  onChange={(e) => updateContent((d) => { d.highlights[idx].title = e.target.value; })}
                                  className="w-full px-2.5 py-1 text-xs font-bold rounded-lg bg-surface border border-border text-primary"
                                  placeholder="Highlight Title"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateContent((d) => {
                                    d.highlights = d.highlights.filter((_: any, i: number) => i !== idx);
                                  })}
                                  className="ml-2 p-1 rounded text-secondary hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <textarea
                                rows={2}
                                value={hl.desc || ""}
                                onChange={(e) => updateContent((d) => { d.highlights[idx].desc = e.target.value; })}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-secondary"
                                placeholder="Highlight description"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────── ABOUT US VISUAL BUILDER ─────────────────── */}
                  {selectedPageKey === "ABOUT" && (
                    <div className="space-y-6">
                      {/* Direct Support Contact Desk */}
                      <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                          <Phone className="w-4 h-4" />
                          <span>Direct Support Reachout Desk (Phone & Email)</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-secondary">Contact Email</label>
                            <input
                              type="email"
                              value={parsedContent.contactEmail || ""}
                              onChange={(e) => updateContent((d) => { d.contactEmail = e.target.value; })}
                              className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                              placeholder="support@inventra.in"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-secondary">Contact Phone Hotline</label>
                            <input
                              type="text"
                              value={parsedContent.contactPhone || ""}
                              onChange={(e) => updateContent((d) => { d.contactPhone = e.target.value; })}
                              className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                              placeholder="+91 80 4567 8900"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-secondary">Support Operating Schedule</label>
                            <input
                              type="text"
                              value={parsedContent.supportHours || ""}
                              onChange={(e) => updateContent((d) => { d.supportHours = e.target.value; })}
                              className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                              placeholder="e.g. Monday – Saturday: 8:00 AM – 10:00 PM IST"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Story Narrative */}
                      <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>Founder & Origin Story</span>
                        </h3>
                        <div>
                          <label className="text-xs font-semibold text-secondary">Story Heading</label>
                          <input
                            type="text"
                            value={parsedContent.story?.heading || ""}
                            onChange={(e) => updateContent((d) => {
                              if (!d.story) d.story = {};
                              d.story.heading = e.target.value;
                            })}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-secondary">Story Paragraph 1</label>
                          <textarea
                            rows={3}
                            value={parsedContent.story?.p1 || ""}
                            onChange={(e) => updateContent((d) => {
                              if (!d.story) d.story = {};
                              d.story.p1 = e.target.value;
                            })}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-secondary">Story Paragraph 2</label>
                          <textarea
                            rows={3}
                            value={parsedContent.story?.p2 || ""}
                            onChange={(e) => updateContent((d) => {
                              if (!d.story) d.story = {};
                              d.story.p2 = e.target.value;
                            })}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                          />
                        </div>
                      </div>

                      {/* Google Space / Office Hubs */}
                      <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4" />
                              <span>Google Space & Office Hub Locations</span>
                            </h3>
                            <p className="text-[11px] text-secondary mt-0.5">Offices and physical customer innovation hubs</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateContent((d) => {
                              d.offices = [
                                ...(d.offices || []),
                                {
                                  name: "New Office Hub",
                                  badge: "Regional Office",
                                  address: "Street Address, City, State PIN",
                                  city: "City Name",
                                  googleSpaceUrl: "https://www.google.com/maps/search/?api=1&query=Inventra",
                                  coordinates: "12.0000° N, 77.0000° E",
                                  phone: "+91 80 0000 0000",
                                  email: "office@inventra.in",
                                }
                              ];
                            })}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Office Location</span>
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(parsedContent.offices || []).map((of: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-app border border-border space-y-3 relative group">
                              <div className="flex items-center justify-between pb-2 border-b border-border">
                                <span className="text-xs font-bold text-teal-400">Office #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => updateContent((d) => {
                                    d.offices = d.offices.filter((_: any, i: number) => i !== idx);
                                  })}
                                  className="p-1 rounded text-secondary hover:text-red-400"
                                  title="Delete this office"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-semibold text-secondary">Office Name</label>
                                  <input
                                    type="text"
                                    value={of.name || ""}
                                    onChange={(e) => updateContent((d) => { d.offices[idx].name = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Category Badge</label>
                                  <input
                                    type="text"
                                    value={of.badge || ""}
                                    onChange={(e) => updateContent((d) => { d.offices[idx].badge = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                    placeholder="e.g. Global Headquarters"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-semibold text-secondary">Full Street Address</label>
                                  <input
                                    type="text"
                                    value={of.address || ""}
                                    onChange={(e) => updateContent((d) => { d.offices[idx].address = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">City & State</label>
                                  <input
                                    type="text"
                                    value={of.city || ""}
                                    onChange={(e) => updateContent((d) => { d.offices[idx].city = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                    placeholder="e.g. Bengaluru, Karnataka"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-semibold text-secondary">Google Space / Maps Directions URL</label>
                                  <input
                                    type="text"
                                    value={of.googleSpaceUrl || ""}
                                    onChange={(e) => updateContent((d) => { d.offices[idx].googleSpaceUrl = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-teal-400"
                                    placeholder="https://www.google.com/maps/search/?api=1&query=..."
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">GPS Coordinates</label>
                                  <input
                                    type="text"
                                    value={of.coordinates || ""}
                                    onChange={(e) => updateContent((d) => { d.offices[idx].coordinates = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-surface border border-border text-primary"
                                    placeholder="12.9716° N, 77.6412° E"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Direct Phone</label>
                                  <input
                                    type="text"
                                    value={of.phone || ""}
                                    onChange={(e) => updateContent((d) => { d.offices[idx].phone = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Direct Email</label>
                                  <input
                                    type="email"
                                    value={of.email || ""}
                                    onChange={(e) => updateContent((d) => { d.offices[idx].email = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── LEGAL & COMPLIANCE VISUAL BUILDER (PRIVACY, TERMS, REFUND, SECURITY) ─── */}
                  {["PRIVACY", "TERMS", "REFUND", "SECURITY"].includes(selectedPageKey) && (
                    <div className="space-y-6">
                      {/* Metadata */}
                      <div className="p-4 rounded-xl bg-surface-raised/40 border border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-secondary flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-teal-400" />
                            <span>Last Updated Month / Year</span>
                          </label>
                          <input
                            type="text"
                            value={parsedContent.lastUpdated || ""}
                            onChange={(e) => updateContent((d) => { d.lastUpdated = e.target.value; })}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                            placeholder="e.g. September 2026"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-secondary flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-teal-400" />
                            <span>Inquiries Contact Email</span>
                          </label>
                          <input
                            type="email"
                            value={parsedContent.contactEmail || ""}
                            onChange={(e) => updateContent((d) => { d.contactEmail = e.target.value; })}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                            placeholder="legal@inventra.in"
                          />
                        </div>
                      </div>

                      {/* Grievance Officer Details (Privacy / Legal) */}
                      {selectedPageKey === "PRIVACY" && (
                        <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Designated Data Protection & Grievance Officer (DPDPA 2023)</span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold text-secondary">Officer Name</label>
                              <input
                                type="text"
                                value={parsedContent.grievanceOfficer?.name || ""}
                                onChange={(e) => updateContent((d) => {
                                  if (!d.grievanceOfficer) d.grievanceOfficer = {};
                                  d.grievanceOfficer.name = e.target.value;
                                })}
                                className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-app border border-border text-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-secondary">Official Designation</label>
                              <input
                                type="text"
                                value={parsedContent.grievanceOfficer?.designation || ""}
                                onChange={(e) => updateContent((d) => {
                                  if (!d.grievanceOfficer) d.grievanceOfficer = {};
                                  d.grievanceOfficer.designation = e.target.value;
                                })}
                                className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-app border border-border text-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-secondary">Official Grievance Email</label>
                              <input
                                type="email"
                                value={parsedContent.grievanceOfficer?.email || ""}
                                onChange={(e) => updateContent((d) => {
                                  if (!d.grievanceOfficer) d.grievanceOfficer = {};
                                  d.grievanceOfficer.email = e.target.value;
                                })}
                                className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-app border border-border text-primary"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-secondary">Direct Phone Hotline</label>
                              <input
                                type="text"
                                value={parsedContent.grievanceOfficer?.phone || ""}
                                onChange={(e) => updateContent((d) => {
                                  if (!d.grievanceOfficer) d.grievanceOfficer = {};
                                  d.grievanceOfficer.phone = e.target.value;
                                })}
                                className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-app border border-border text-primary"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-semibold text-secondary">Postal Grievance Address</label>
                              <input
                                type="text"
                                value={parsedContent.grievanceOfficer?.address || ""}
                                onChange={(e) => updateContent((d) => {
                                  if (!d.grievanceOfficer) d.grievanceOfficer = {};
                                  d.grievanceOfficer.address = e.target.value;
                                })}
                                className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-app border border-border text-primary"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Security Trust Certifications (Security Page) */}
                      {selectedPageKey === "SECURITY" && (
                        <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                              Security Badges & Compliance Accreditations
                            </h3>
                            <button
                              type="button"
                              onClick={() => updateContent((d) => {
                                d.certifications = [...(d.certifications || []), { badge: "NEW BADGE", label: "Certification description" }];
                              })}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20"
                            >
                              <Plus className="w-3 h-3 inline mr-1" /> Add Badge
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(parsedContent.certifications || []).map((c: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg bg-app border border-border flex items-center gap-2">
                                <input
                                  type="text"
                                  value={c.badge || ""}
                                  onChange={(e) => updateContent((d) => { d.certifications[idx].badge = e.target.value; })}
                                  className="w-28 px-2 py-1 text-xs font-mono font-bold rounded bg-surface border border-border text-teal-400"
                                  placeholder="ISO 27001"
                                />
                                <input
                                  type="text"
                                  value={c.label || ""}
                                  onChange={(e) => updateContent((d) => { d.certifications[idx].label = e.target.value; })}
                                  className="flex-1 px-2 py-1 text-xs rounded bg-surface border border-border text-primary"
                                  placeholder="Description"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateContent((d) => {
                                    d.certifications = d.certifications.filter((_: any, i: number) => i !== idx);
                                  })}
                                  className="p-1 text-secondary hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Policy Sections (Clauses) */}
                      <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                              <FileText className="w-4 h-4" />
                              <span>Policy Clauses & Agreement Sections</span>
                            </h3>
                            <p className="text-[11px] text-secondary mt-0.5">
                              Easily add, edit, or reorganize legal clauses without modifying code.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateContent((d) => {
                              const num = (d.sections?.length || 0) + 1;
                              d.sections = [
                                ...(d.sections || []),
                                {
                                  id: `section_${num}`,
                                  title: `${num}. New Policy Clause`,
                                  content: "Enter the detailed explanation and legal terms for this clause here."
                                }
                              ];
                            })}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add New Policy Section</span>
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(parsedContent.sections || []).map((sec: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-app border border-border space-y-3 relative group">
                              <div className="flex items-center justify-between pb-2 border-b border-border">
                                <span className="text-xs font-bold text-teal-400">Section #{idx + 1}</span>
                                <div className="flex items-center gap-1">
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => updateContent((d) => {
                                        const temp = d.sections[idx - 1];
                                        d.sections[idx - 1] = d.sections[idx];
                                        d.sections[idx] = temp;
                                      })}
                                      className="p-1 rounded text-secondary hover:text-primary hover:bg-surface"
                                      title="Move up"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {idx < (parsedContent.sections || []).length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => updateContent((d) => {
                                        const temp = d.sections[idx + 1];
                                        d.sections[idx + 1] = d.sections[idx];
                                        d.sections[idx] = temp;
                                      })}
                                      className="p-1 rounded text-secondary hover:text-primary hover:bg-surface"
                                      title="Move down"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => updateContent((d) => {
                                      d.sections = d.sections.filter((_: any, i: number) => i !== idx);
                                    })}
                                    className="p-1 rounded text-secondary hover:text-red-400 hover:bg-red-500/10 ml-1"
                                    title="Delete this section"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-secondary">Section Title / Heading</label>
                                <input
                                  type="text"
                                  value={sec.title || ""}
                                  onChange={(e) => updateContent((d) => { d.sections[idx].title = e.target.value; })}
                                  className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-surface border border-border text-primary"
                                  placeholder="e.g. 1. Patient Confidentiality & Medical Records"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-secondary">Clause Legal Description</label>
                                <textarea
                                  rows={4}
                                  value={sec.content || ""}
                                  onChange={(e) => updateContent((d) => { d.sections[idx].content = e.target.value; })}
                                  className="mt-0.5 w-full px-2.5 py-2 text-xs rounded-lg bg-surface border border-border text-primary leading-relaxed"
                                  placeholder="Provide the complete legal text for this clause..."
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────── FEATURES PAGE VISUAL BUILDER ────────────────── */}
                  {selectedPageKey === "FEATURES" && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-surface-raised via-surface to-surface-raised border border-border space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                              <Zap className="w-4 h-4" />
                              <span>Core Feature Modules & Architecture Spotlight</span>
                            </h3>
                            <p className="text-[11px] text-secondary mt-0.5">
                              Configure the high-impact feature cards with headline descriptions, icons, and checkable capability bullet points.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateContent((d) => {
                              const list = d.modules || [];
                              d.modules = [
                                ...list,
                                {
                                  title: "New Pharmacy Module",
                                  desc: "Describe how this feature streamlines counter dispensing, inventory control, or statutory compliance.",
                                  iconKey: "Zap",
                                  bullets: [
                                    "Fast keyboard shortcut workflow",
                                    "Real-time synchronized data consistency"
                                  ]
                                }
                              ];
                            })}
                            className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Feature Module</span>
                          </button>
                        </div>

                        {/* Feature Modules List */}
                        <div className="space-y-4">
                          {((parsedContent.modules || parsedContent.categories) || []).map((mod: any, idx: number) => {
                            const bullets: string[] = mod.bullets || (mod.items?.map((it: any) => typeof it === "string" ? it : `${it.title}: ${it.desc}`)) || [];
                            return (
                              <div
                                key={idx}
                                className="p-4 rounded-xl bg-app border border-border hover:border-teal-500/30 transition-all space-y-3.5 relative group"
                              >
                                <div className="flex items-center justify-between pb-2 border-b border-border">
                                  <span className="text-xs font-bold text-teal-400 font-mono">
                                    Feature Module #{idx + 1}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {idx > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => updateContent((d) => {
                                          const mods = d.modules || d.categories || [];
                                          const temp = mods[idx - 1];
                                          mods[idx - 1] = mods[idx];
                                          mods[idx] = temp;
                                          d.modules = mods;
                                        })}
                                        className="p-1 rounded text-secondary hover:text-primary hover:bg-surface"
                                        title="Move up"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {idx < ((parsedContent.modules || parsedContent.categories) || []).length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => updateContent((d) => {
                                          const mods = d.modules || d.categories || [];
                                          const temp = mods[idx + 1];
                                          mods[idx + 1] = mods[idx];
                                          mods[idx] = temp;
                                          d.modules = mods;
                                        })}
                                        className="p-1 rounded text-secondary hover:text-primary hover:bg-surface"
                                        title="Move down"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => updateContent((d) => {
                                        const mods = (d.modules || d.categories || []).filter((_: any, i: number) => i !== idx);
                                        d.modules = mods;
                                        delete d.categories;
                                      })}
                                      className="p-1 rounded text-secondary hover:text-red-400 hover:bg-red-500/10 ml-1"
                                      title="Delete this module"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="sm:col-span-2">
                                    <label className="text-[10px] font-semibold text-secondary">Module Heading / Title</label>
                                    <input
                                      type="text"
                                      value={mod.title || mod.category || ""}
                                      onChange={(e) => updateContent((d) => {
                                        if (!d.modules) d.modules = d.categories || [];
                                        d.modules[idx].title = e.target.value;
                                      })}
                                      className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-surface border border-border text-primary focus:border-teal-500 focus:outline-none"
                                      placeholder="e.g. Lightning POS & Prescription Billing"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold text-secondary">Icon Badge</label>
                                    <select
                                      value={mod.iconKey || "Zap"}
                                      onChange={(e) => updateContent((d) => {
                                        if (!d.modules) d.modules = d.categories || [];
                                        d.modules[idx].iconKey = e.target.value;
                                      })}
                                      className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border text-teal-400 focus:border-teal-500 focus:outline-none"
                                    >
                                      <option value="Zap">⚡ Zap (Lightning Speed)</option>
                                      <option value="Clock">⏱️ Clock (FEFO / Expiry)</option>
                                      <option value="Building2">🏢 Building2 (Multi-Store)</option>
                                      <option value="ShieldCheck">🛡️ ShieldCheck (Compliance)</option>
                                      <option value="Layers">🥞 Layers (Architecture)</option>
                                      <option value="Sparkles">✨ Sparkles (Smart AI)</option>
                                      <option value="BarChart3">📊 BarChart3 (Analytics)</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Module Overview & Capabilities</label>
                                  <textarea
                                    rows={2}
                                    value={mod.desc || ""}
                                    onChange={(e) => updateContent((d) => {
                                      if (!d.modules) d.modules = d.categories || [];
                                      d.modules[idx].desc = e.target.value;
                                    })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-secondary focus:border-teal-500 focus:outline-none"
                                    placeholder="Explain this module's workflow and tangible pharmacist advantages..."
                                  />
                                </div>

                                {/* Capability Bullets */}
                                <div className="p-3 rounded-lg bg-surface-raised/40 border border-border/80 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-teal-400" />
                                      <span>Key Bullet Points ({bullets.length})</span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => updateContent((d) => {
                                        if (!d.modules) d.modules = d.categories || [];
                                        const currentBullets = d.modules[idx].bullets || [];
                                        d.modules[idx].bullets = [...currentBullets, "New capability benefit"];
                                      })}
                                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20"
                                    >
                                      + Add Bullet
                                    </button>
                                  </div>
                                  <div className="space-y-1.5">
                                    {bullets.map((bText: string, bIdx: number) => (
                                      <div key={bIdx} className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-teal-400 font-mono w-4">{bIdx + 1}.</span>
                                        <input
                                          type="text"
                                          value={bText}
                                          onChange={(e) => updateContent((d) => {
                                            if (!d.modules) d.modules = d.categories || [];
                                            if (!d.modules[idx].bullets) d.modules[idx].bullets = [...bullets];
                                            d.modules[idx].bullets[bIdx] = e.target.value;
                                          })}
                                          className="flex-1 px-2 py-1 text-xs rounded bg-surface border border-border text-primary focus:border-teal-500 focus:outline-none"
                                          placeholder="e.g. Sub-200ms item barcode scanning & price resolution"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => updateContent((d) => {
                                            if (!d.modules) d.modules = d.categories || [];
                                            d.modules[idx].bullets = bullets.filter((_: any, i: number) => i !== bIdx);
                                          })}
                                          className="p-1 text-secondary hover:text-red-400"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ────────────────── CAREERS PAGE VISUAL BUILDER ────────────────── */}
                  {selectedPageKey === "CAREERS" && (
                    <div className="space-y-6">
                      {/* Culture Narrative & Perks */}
                      <div className="p-4 rounded-xl bg-surface-raised/40 border border-border space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span>Culture Statement & Employee Perks</span>
                        </h3>
                        <div>
                          <label className="text-xs font-semibold text-secondary">Workplace Culture & Mission Pitch</label>
                          <textarea
                            rows={3}
                            value={parsedContent.culture || ""}
                            onChange={(e) => updateContent((d) => { d.culture = e.target.value; })}
                            className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                            placeholder="Describe your engineering standards, autonomy, and clinical healthcare impact..."
                          />
                        </div>

                        {/* Perks List */}
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                              Benefits & Perks ({((parsedContent.perks) || []).length})
                            </label>
                            <button
                              type="button"
                              onClick={() => updateContent((d) => {
                                d.perks = [...(d.perks || []), "New benefit or perk"];
                              })}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20"
                            >
                              + Add Perk
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {((parsedContent.perks) || []).map((pk: string, pIdx: number) => (
                              <div key={pIdx} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-app border border-border">
                                <Award className="w-3.5 h-3.5 text-teal-400 shrink-0 ml-1" />
                                <input
                                  type="text"
                                  value={pk}
                                  onChange={(e) => updateContent((d) => { d.perks[pIdx] = e.target.value; })}
                                  className="flex-1 px-2 py-1 text-xs rounded bg-surface border border-transparent focus:border-teal-500 text-primary focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateContent((d) => {
                                    d.perks = d.perks.filter((_: any, i: number) => i !== pIdx);
                                  })}
                                  className="p-1 text-secondary hover:text-red-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Job Openings List */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-surface-raised via-surface to-surface-raised border border-border space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                              <Briefcase className="w-4 h-4" />
                              <span>Dynamic Job Openings & Role Listings</span>
                            </h3>
                            <p className="text-[11px] text-secondary mt-0.5">
                              Add and manage job openings displayed directly to talent applying on the public Careers portal.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateContent((d) => {
                              const num = (d.openings?.length || 0) + 1;
                              d.openings = [
                                ...(d.openings || []),
                                {
                                  id: `role-${num}`,
                                  title: "New Role Opening",
                                  department: "Engineering",
                                  location: "Bengaluru / Hybrid",
                                  employmentType: "Full-Time",
                                  experienceLevel: "3-5 Years",
                                  summary: "Provide an overview of the key responsibilities and required background for this position."
                                }
                              ];
                            })}
                            className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Job Role</span>
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(parsedContent.openings || []).map((op: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl bg-app border border-border hover:border-teal-500/30 transition-all space-y-3.5 relative group"
                            >
                              <div className="flex items-center justify-between pb-2 border-b border-border">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-teal-400 font-mono">
                                    Role #{idx + 1}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-raised border border-border text-secondary font-mono">
                                    ID: {op.id || `role-${idx + 1}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => updateContent((d) => {
                                        const temp = d.openings[idx - 1];
                                        d.openings[idx - 1] = d.openings[idx];
                                        d.openings[idx] = temp;
                                      })}
                                      className="p-1 rounded text-secondary hover:text-primary hover:bg-surface"
                                      title="Move up"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {idx < (parsedContent.openings || []).length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => updateContent((d) => {
                                        const temp = d.openings[idx + 1];
                                        d.openings[idx + 1] = d.openings[idx];
                                        d.openings[idx] = temp;
                                      })}
                                      className="p-1 rounded text-secondary hover:text-primary hover:bg-surface"
                                      title="Move down"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => updateContent((d) => {
                                      d.openings = d.openings.filter((_: any, i: number) => i !== idx);
                                    })}
                                    className="p-1 rounded text-secondary hover:text-red-400 hover:bg-red-500/10 ml-1"
                                    title="Delete this role"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-semibold text-secondary">Job Title</label>
                                  <input
                                    type="text"
                                    value={op.title || ""}
                                    onChange={(e) => updateContent((d) => { d.openings[idx].title = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-surface border border-border text-primary focus:border-teal-500 focus:outline-none"
                                    placeholder="e.g. Senior Full-Stack Engineer (React / Java)"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Department</label>
                                  <input
                                    type="text"
                                    value={op.department || ""}
                                    onChange={(e) => updateContent((d) => { d.openings[idx].department = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border text-teal-400 focus:border-teal-500 focus:outline-none"
                                    placeholder="e.g. Engineering, Platform, Design"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Location</label>
                                  <input
                                    type="text"
                                    value={op.location || ""}
                                    onChange={(e) => updateContent((d) => { d.openings[idx].location = e.target.value; })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                    placeholder="e.g. Bengaluru / Hybrid"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Employment Type</label>
                                  <select
                                    value={op.employmentType || op.type || "Full-Time"}
                                    onChange={(e) => updateContent((d) => {
                                      d.openings[idx].employmentType = e.target.value;
                                      d.openings[idx].type = e.target.value;
                                    })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                  >
                                    <option value="Full-Time">Full-Time</option>
                                    <option value="Part-Time">Part-Time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-secondary">Experience Required</label>
                                  <input
                                    type="text"
                                    value={op.experienceLevel || op.experience || ""}
                                    onChange={(e) => updateContent((d) => {
                                      d.openings[idx].experienceLevel = e.target.value;
                                      d.openings[idx].experience = e.target.value;
                                    })}
                                    className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary"
                                    placeholder="e.g. 4-7 Years"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-secondary">Role Description & Responsibilities</label>
                                <textarea
                                  rows={2}
                                  value={op.summary || op.description || ""}
                                  onChange={(e) => updateContent((d) => {
                                    d.openings[idx].summary = e.target.value;
                                    d.openings[idx].description = e.target.value;
                                  })}
                                  className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface border border-border text-primary focus:border-teal-500 focus:outline-none"
                                  placeholder="Describe key responsibilities and impact..."
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback for other pages */}
                  {!["HOME", "ABOUT", "FEATURES", "CAREERS", "PRIVACY", "TERMS", "REFUND", "SECURITY"].includes(selectedPageKey) && (
                    <div className="p-6 rounded-2xl bg-surface-raised/30 border border-border text-center space-y-3">
                      <p className="text-xs text-secondary">
                        This page ({selectedPageKey}) currently uses custom structured data. Switch to <strong>Raw JSON</strong> mode to edit all attributes directly, or click <strong>Insert Starter Schema</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditorMode("JSON")}
                        className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
                      >
                        Switch to Raw JSON Editor
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── RAW JSON EDITOR MODE ─────────────────────────────────────── */
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>JSON Content Body</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrettifyJson}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-surface-raised border border-border text-secondary hover:text-primary hover:bg-surface-hover flex items-center gap-1.5 transition-all"
                        title="Format and validate JSON indentation"
                      >
                        <AlignLeft className="w-3 h-3 text-teal-400" />
                        <span>Format JSON</span>
                      </button>
                      {DEFAULT_CMS_TEMPLATES[selectedPageKey] && (
                        <button
                          type="button"
                          onClick={handleLoadTemplate}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-teal-500/10 border border-teal-500/25 text-teal-400 hover:bg-teal-500/20 flex items-center gap-1.5 transition-all"
                          title="Load recommended template schema for this page"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Insert Starter Schema</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={18}
                    value={cmsJsonString}
                    onChange={(e) => setCmsJsonString(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                    placeholder='{\n  "key": "value"\n}'
                  />
                  <p className="text-[11px] text-secondary flex items-center gap-1 pt-1">
                    <Info className="w-3 h-3 text-teal-400 shrink-0" />
                    <span>Valid JSON format required. You can click <strong>"Visual Form"</strong> above anytime to return to the interactive form builder.</span>
                  </p>
                </div>
              )}

              {/* Bottom Sticky Save Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-[11px] text-secondary hidden sm:block">
                  All updates are published immediately to the public storefront.
                </div>
                <button
                  type="submit"
                  disabled={savingCms}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-teal-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingCms ? "Publishing Changes..." : `Save ${selectedPageKey} Content`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 2: COUPONS & GIFT CODES MANAGEMENT ────────────────────────── */}
      {activeTab === "COUPONS" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-primary">Active Promotional Coupons & Gift Codes</h2>
              <p className="text-xs text-secondary">
                Configure conditional promotional codes (e.g. First-time payment only, minimum tier, or expiry date limits).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchCoupons}
                className="p-2 rounded-xl bg-surface border border-border text-secondary hover:text-primary transition-all"
                title="Refresh coupons"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCreateCouponModal(true)}
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Coupon</span>
              </button>
            </div>
          </div>

          {/* Coupons Table */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-raised text-secondary font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Discount</th>
                    <th className="p-3.5">Conditions & Rules</th>
                    <th className="p-3.5">Usage</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {coupons.map((c) => (
                    <tr key={c.code} className="hover:bg-surface-hover transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-teal-400 text-sm tracking-wide">{c.code}</div>
                        <div className="text-[11px] text-secondary mt-0.5">{c.description}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-primary">
                          {c.discountType === "PERCENTAGE" ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
                        </div>
                        {c.discountType === "PERCENTAGE" && c.maxDiscountAmount != null && c.maxDiscountAmount > 0 && (
                          <div className="text-[10px] text-teal-400 font-medium">
                            (Upto ₹{c.maxDiscountAmount})
                          </div>
                        )}
                        <span className="text-[10px] text-secondary uppercase">{c.discountType}</span>
                      </td>
                      <td className="p-3.5 space-y-1">
                        <div className="flex flex-wrap gap-1.5">
                          {c.firstTimeOnly && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              First-Time Customers Only
                            </span>
                          )}
                          {c.minTier && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              Min Tier: {c.minTier}
                            </span>
                          )}
                          {c.minCycle && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Min Cycle: {c.minCycle}
                            </span>
                          )}
                          {c.minOrderAmount && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              Min Subtotal: ₹{c.minOrderAmount}
                            </span>
                          )}
                        </div>
                        {c.validUntil && (
                          <div className="text-[11px] text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Valid until {new Date(c.validUntil).toLocaleDateString()}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono text-primary font-medium">
                          {c.currentUses} {c.maxUses ? `/ ${c.maxUses}` : "uses"}
                        </div>
                        {c.maxUses && c.currentUses >= c.maxUses && (
                          <span className="text-[10px] text-red-400 font-semibold">Exhausted</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                        }`}>
                          {c.active ? "ACTIVE" : "DISABLED"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(c.code)}
                          className="p-1.5 rounded-lg text-secondary hover:text-red-400 hover:bg-surface-raised transition-all"
                          title="Delete coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Coupon Modal */}
          {showCreateCouponModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    Create Conditional Coupon Code
                  </h3>
                  <button
                    onClick={() => setShowCreateCouponModal(false)}
                    className="text-secondary hover:text-primary text-sm font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-secondary">Coupon Code (Alphanumeric)</label>
                    <input
                      type="text"
                      required
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-app border border-border text-primary font-mono font-bold uppercase focus:border-teal-500 focus:outline-none"
                      placeholder="e.g. WELCOME50"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-secondary">Offer Description</label>
                    <input
                      type="text"
                      required
                      value={couponForm.description}
                      onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                      placeholder="e.g. 50% discount for first-time pharmacy subscribers"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-secondary">Discount Type</label>
                      <select
                        value={couponForm.discountType}
                        onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-app border border-border text-primary"
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FLAT">Flat Amount (INR ₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-secondary">
                        {couponForm.discountType === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={couponForm.discountValue}
                        onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-app border border-border text-primary"
                      />
                    </div>
                  </div>

                  {couponForm.discountType === "PERCENTAGE" && (
                    <div>
                      <label className="font-semibold text-secondary">
                        Maximum Discount Cap (Optional, e.g. ₹1,000 ceiling for 50% discount)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={couponForm.maxDiscountAmount ?? ""}
                        onChange={(e) => setCouponForm({ ...couponForm, maxDiscountAmount: e.target.value ? Number(e.target.value) : null })}
                        placeholder="No cap (Unlimited discount)"
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-app border border-border text-primary placeholder:text-muted"
                      />
                    </div>
                  )}

                  {/* Conditions & Restrictions */}
                  <div className="p-4 rounded-2xl bg-app border border-border space-y-3">
                    <div className="font-bold text-primary flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Eligibility Rules & Restrictions</span>
                    </div>

                    {/* First time only toggle */}
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={couponForm.firstTimeOnly}
                        onChange={(e) => setCouponForm({ ...couponForm, firstTimeOnly: e.target.checked })}
                        className="rounded border-border text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-secondary font-medium">
                        <strong>First-Time Payment Only</strong> (Reject if business already has prior invoices)
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] text-secondary">Min Plan Tier Required</label>
                        <select
                          value={couponForm.minTier || ""}
                          onChange={(e) => setCouponForm({ ...couponForm, minTier: e.target.value ? (e.target.value as any) : null })}
                          className="mt-0.5 w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-primary text-xs"
                        >
                          <option value="">Any Tier</option>
                          <option value="STARTER">Starter or above</option>
                          <option value="PRO">Pro or above</option>
                          <option value="ENTERPRISE">Enterprise only</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-secondary">Min Billing Cycle</label>
                        <select
                          value={couponForm.minCycle || ""}
                          onChange={(e) => setCouponForm({ ...couponForm, minCycle: e.target.value ? (e.target.value as any) : null })}
                          className="mt-0.5 w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-primary text-xs"
                        >
                          <option value="">Any Cycle</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="ANNUALLY">Annually Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-secondary">Max Total Uses</label>
                        <input
                          type="number"
                          min={1}
                          placeholder="No limit"
                          value={couponForm.maxUses || ""}
                          onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value ? Number(e.target.value) : null })}
                          className="mt-0.5 w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-primary text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-secondary">Min Subtotal (₹)</label>
                        <input
                          type="number"
                          min={0}
                          placeholder="None"
                          value={couponForm.minOrderAmount || ""}
                          onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value ? Number(e.target.value) : null })}
                          className="mt-0.5 w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-primary text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateCouponModal(false)}
                      className="px-4 py-2 rounded-xl text-secondary hover:text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingCoupon}
                      className="px-6 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 transition-all disabled:opacity-50"
                    >
                      {creatingCoupon ? "Creating..." : "Save Coupon"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
