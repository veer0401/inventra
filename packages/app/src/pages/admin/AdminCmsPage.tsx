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
} from "lucide-react";

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
      setCmsJsonString(JSON.stringify(res.content, null, 2));
    } catch {
      showToast({ type: "error", title: "Error", message: `Failed to load CMS content for ${key}.` });
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchCmsPage(selectedPageKey);
  }, []);

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
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(cmsJsonString);
    } catch (err) {
      showToast({ type: "error", title: "JSON Syntax Error", message: "Please check your JSON format before saving." });
      return;
    }

    setSavingCms(true);
    try {
      await cmsApi.updateAdminPage(selectedPageKey, {
        title: cmsTitle,
        subtitle: cmsSubtitle,
        content: parsedContent,
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-surface border border-border rounded-2xl p-4">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 px-1">Editable Pages</h3>
              <div className="space-y-1">
                {(["HOME", "ABOUT", "PRICING", "CONTACT"] as string[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPageKey(key);
                      fetchCmsPage(key);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedPageKey === key
                        ? "bg-teal-500/10 text-teal-400"
                        : "text-secondary hover:text-primary hover:bg-surface-hover"
                    }`}
                  >
                    {key.charAt(0) + key.slice(1).toLowerCase()} Page
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-surface border border-border rounded-2xl p-6 space-y-4">
            <form onSubmit={handleSaveCmsPage} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-secondary">Page Title</label>
                  <input
                    type="text"
                    value={cmsTitle}
                    onChange={(e) => setCmsTitle(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary">Subtitle</label>
                  <input
                    type="text"
                    value={cmsSubtitle}
                    onChange={(e) => setCmsSubtitle(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">JSON Content Body</label>
                <textarea
                  rows={15}
                  value={cmsJsonString}
                  onChange={(e) => setCmsJsonString(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs font-mono rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingCms}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingCms ? "Saving..." : "Save Page Content"}</span>
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

      {/* ─── TAB 3: PUBLIC PAGES CONTENT CMS ───────────────────────────────── */}
      {activeTab === "PAGES" && (
        <div className="space-y-6">
          {/* Page Selector */}
          <div className="flex items-center gap-3">
            {["HOME", "ABOUT", "FEATURES", "CAREERS"].map((key) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedPageKey(key);
                  fetchCmsPage(key);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedPageKey === key
                    ? "bg-teal-500/10 border-teal-500 text-teal-400"
                    : "bg-surface border-border text-secondary hover:text-primary"
                }`}
              >
                {key} PAGE
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveCmsPage} className="bg-surface border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-primary">Editing {selectedPageKey} Content</h2>
                <p className="text-xs text-secondary">
                  Update title, subtitle, and dynamic JSON content structures. Changes appear immediately on the live website.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingCms}
                className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingCms ? "Saving Copy..." : "Save Live Content"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-secondary">Page Headline / Title</label>
                <input
                  type="text"
                  required
                  value={cmsTitle}
                  onChange={(e) => setCmsTitle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Subtitle / Meta Description</label>
                <input
                  type="text"
                  value={cmsSubtitle}
                  onChange={(e) => setCmsSubtitle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs rounded-xl bg-app border border-border text-primary focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-secondary">Dynamic JSON Content Structure</label>
                <span className="text-[11px] text-secondary">Valid JSON format required</span>
              </div>
              <textarea
                rows={16}
                required
                value={cmsJsonString}
                onChange={(e) => setCmsJsonString(e.target.value)}
                className="w-full font-mono text-xs p-3.5 rounded-xl bg-slate-950 border border-border text-teal-300 focus:border-teal-500 focus:outline-none leading-relaxed"
              />
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
