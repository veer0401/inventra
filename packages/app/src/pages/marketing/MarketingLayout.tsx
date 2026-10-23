import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  Layers,
  Award,
  Menu,
  X,
  LogIn,
} from "lucide-react";
import { BrandLogo } from "../../components/common/BrandLogo";

export const MarketingLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.status === "AUTHENTICATED");
  const user = useAuthStore((s) => s.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route navigation
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/features", label: "Features" },
    { to: "/plans", label: "Plans & Pricing" },
    { to: "/about", label: "About Us" },
    { to: "/careers", label: "Careers" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-teal-700 selection:text-white font-sans overflow-x-hidden">
      {/* ─── Top Announcement Bar ─────────────────────────────────────────── */}
      <div className="bg-teal-50 border-b border-teal-200/70 px-4 py-2.5 text-center text-xs font-medium text-teal-900 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse shrink-0" />
        <span>Use coupon code <strong className="text-teal-950 font-bold bg-white px-2.5 py-0.5 rounded-full border border-teal-300/80 shadow-xs font-mono">INVENTRAFIRST</strong> for 50% OFF your first pharmacy subscription!</span>
        <Link to="/plans" className="underline hover:text-teal-950 font-semibold ml-1 inline-flex items-center gap-0.5">
          View Plans <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* ─── Sticky Designer Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200/80 transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 lg:h-22 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <BrandLogo size="md" showText badgeText="ERP" subtitle="Smart Pharmacy Cloud OS" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navLinks.map((nav) => (
              <NavLink
                key={nav.to}
                to={nav.to}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                    isActive
                      ? "text-teal-900 bg-teal-50 border-teal-200/90 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-transparent hover:border-slate-200/60"
                  }`
                }
              >
                {nav.label}
              </NavLink>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3 lg:gap-4 shrink-0">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-semibold text-sm shadow-[0_1px_2px_0_rgba(15,23,42,0.08),0_2px_4px_0_rgba(15,118,110,0.18)] hover:shadow-[0_4px_12px_0_rgba(15,118,110,0.25)] border border-teal-500/30 transition-all active:scale-[0.98]"
              >
                <span>Dashboard ({user?.fullName?.split(" ")[0] || "Account"})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200/90 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] hover:border-slate-300 transition-all group shrink-0 active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4 text-teal-700 group-hover:scale-110 transition-transform" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/apply"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-semibold text-sm shadow-[0_1px_2px_0_rgba(15,23,42,0.08),0_2px_4px_0_rgba(15,118,110,0.18)] hover:shadow-[0_4px_12px_0_rgba(15,118,110,0.25)] border border-teal-500/30 transition-all shrink-0 active:scale-[0.98]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-2xl px-4 py-4 space-y-3 animate-in fade-in-50 duration-150 shadow-lg">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((nav) => (
                <NavLink
                  key={nav.to}
                  to={nav.to}
                  className={({ isActive }) =>
                    `px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between border ${
                      isActive
                        ? "text-teal-900 bg-teal-50 border-teal-200 font-semibold"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-transparent"
                    }`
                  }
                >
                  <span>{nav.label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </NavLink>
              ))}
            </nav>

            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-semibold text-sm shadow-[0_1px_2px_0_rgba(15,23,42,0.08),0_2px_4px_0_rgba(15,118,110,0.18)] border border-teal-500/30"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white rounded-xl border border-slate-200/90 transition-all shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]"
                  >
                    <LogIn className="w-4 h-4 text-teal-700" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/apply"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-semibold text-sm shadow-[0_1px_2px_0_rgba(15,23,42,0.08),0_2px_4px_0_rgba(15,118,110,0.18)] border border-teal-500/30"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ─── Main Content Container ────────────────────────────────────────── */}
      <main className="flex-1">
        {children || <Outlet />}
      </main>

      {/* ─── Rich Designer Footer ──────────────────────────────────────────── */}
      <footer className="bg-slate-50 border-t border-slate-200/80 pt-16 pb-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-200/80">
            {/* Col 1: Brand & Mission */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <BrandLogo size="sm" showText badgeText="ERP" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
                India's premier high-concurrency cloud pharmacy management platform. Designed for retail chemists, multi-counter dispensaries, and hospital pharmacies.
              </p>
              <div className="flex items-center gap-3 pt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> CDSCO Schedule H Compliant
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-teal-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" /> GST GSTR-1 Ready
                </span>
              </div>
            </div>

            {/* Col 2: Platform Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link to="/features" className="hover:text-teal-700 transition-colors">POS & Billing Engine</Link></li>
                <li><Link to="/features" className="hover:text-teal-700 transition-colors">Batch & FEFO Expiry</Link></li>
                <li><Link to="/features" className="hover:text-teal-700 transition-colors">Multi-Store Transfers</Link></li>
                <li><Link to="/features" className="hover:text-teal-700 transition-colors">Offline Sync Daemon</Link></li>
                <li><Link to="/plans" className="hover:text-teal-700 transition-colors">Subscription Plans</Link></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link to="/about" className="hover:text-teal-700 transition-colors">About Inventra</Link></li>
                <li><Link to="/careers" className="hover:text-teal-700 transition-colors">Careers & Hiring</Link></li>
                <li><Link to="/plans" className="hover:text-teal-700 transition-colors">Pricing Calculator</Link></li>
                <li><Link to="/apply" className="hover:text-teal-700 transition-colors">Partner Pharmacy Program</Link></li>
              </ul>
            </div>

            {/* Col 4: Support & Compliance */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Compliance & Trust</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-teal-700" /> ISO 27001 Certified Cloud</li>
                <li className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-teal-700" /> 99.99% Guaranteed SLA</li>
                <li className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-teal-700" /> support@inventra.io</li>
                <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-700" /> Mumbai & Bengaluru, India</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Inventra Technologies Pvt Ltd. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link to="/privacy" className="hover:text-teal-700 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-teal-700 transition-colors">Terms of Service</Link>
              <Link to="/refund" className="hover:text-teal-700 transition-colors">Refund & Cancellation</Link>
              <Link to="/security" className="hover:text-teal-700 transition-colors">Security & Trust</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
