import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
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
} from "lucide-react";
import { BrandLogo } from "../../components/common/BrandLogo";

export const MarketingLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.status === "AUTHENTICATED");
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white font-sans overflow-x-hidden">
      {/* ─── Top Announcement Bar ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-teal-900/80 via-emerald-900/80 to-teal-900/80 border-b border-teal-500/20 px-4 py-2 text-center text-xs font-medium text-teal-200 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
        <span>Use coupon code <strong className="text-white tracking-wide bg-teal-800/60 px-2 py-0.5 rounded border border-teal-400/30">INVENTRAFIRST</strong> for 50% OFF your first pharmacy subscription!</span>
        <Link to="/plans" className="underline hover:text-white font-semibold ml-1 inline-flex items-center gap-0.5">
          View Plans <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* ─── Sticky Glassmorphism Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <BrandLogo size="md" showText badgeText="ERP" subtitle="Smart Pharmacy Cloud OS" />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {[
              { to: "/", label: "Home" },
              { to: "/features", label: "Features" },
              { to: "/plans", label: "Plans & Pricing" },
              { to: "/about", label: "About Us" },
              { to: "/careers", label: "Careers" },
            ].map((nav) => (
              <NavLink
                key={nav.to}
                to={nav.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-teal-400 bg-teal-500/10 shadow-inner"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`
                }
              >
                {nav.label}
              </NavLink>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold text-sm hover:brightness-110 shadow-lg shadow-teal-500/25 transition-all"
              >
                <span>Dashboard ({user?.fullName?.split(" ")[0] || "Account"})</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/apply"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold text-sm hover:brightness-110 shadow-lg shadow-teal-500/25 transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ────────────────────────────────────────── */}
      <main className="flex-1">
        {children || <Outlet />}
      </main>

      {/* ─── Rich Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-800/80 pt-16 pb-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-800/60">
            {/* Col 1: Brand & Mission */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <BrandLogo size="sm" showText badgeText="ERP" />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                India's premier high-concurrency cloud pharmacy management platform. Designed for retail chemists, multi-counter dispensaries, and hospital pharmacies.
              </p>
              <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" /> CDSCO Schedule H Compliant
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-teal-400">
                  <CheckCircle2 className="w-4 h-4" /> GST GSTR-1 Ready
                </span>
              </div>
            </div>

            {/* Col 2: Platform Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/features" className="hover:text-teal-400 transition-colors">POS & Billing Engine</Link></li>
                <li><Link to="/features" className="hover:text-teal-400 transition-colors">Batch & FEFO Expiry</Link></li>
                <li><Link to="/features" className="hover:text-teal-400 transition-colors">Multi-Store Transfers</Link></li>
                <li><Link to="/features" className="hover:text-teal-400 transition-colors">Offline Sync Daemon</Link></li>
                <li><Link to="/plans" className="hover:text-teal-400 transition-colors">Subscription Plans</Link></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/about" className="hover:text-teal-400 transition-colors">About Inventra</Link></li>
                <li><Link to="/careers" className="hover:text-teal-400 transition-colors">Careers & Hiring</Link></li>
                <li><Link to="/plans" className="hover:text-teal-400 transition-colors">Pricing Calculator</Link></li>
                <li><Link to="/apply" className="hover:text-teal-400 transition-colors">Partner Pharmacy Program</Link></li>
              </ul>
            </div>

            {/* Col 4: Support & Compliance */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Compliance & Trust</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-teal-400" /> ISO 27001 Certified Cloud</li>
                <li className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-teal-400" /> 99.99% Guaranteed SLA</li>
                <li className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-teal-400" /> support@inventra.io</li>
                <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-400" /> Mumbai & Bengaluru, India</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Inventra Technologies Pvt Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/about" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
              <Link to="/about" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
              <Link to="/plans" className="hover:text-slate-400 transition-colors">Refund & Proration Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
