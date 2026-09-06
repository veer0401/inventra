import { apiClient, baseUrl } from "./api";
import { useAuthStore } from "../stores/authStore";
import type { Page } from "@inventra/api-types";

export type PlanTier = "STARTER" | "PRO" | "ENTERPRISE";
export type BillingCycle = "MONTHLY" | "ANNUALLY";

export interface PlanQuotas {
  workstationsUsed: number;
  workstationsLimit: number;
  branchesUsed: number;
  branchesLimit: number;
  storageUsedGb: number;
  storageLimitGb: number;
  monthlyInvoicesUsed: number;
  monthlyInvoicesLimit: number;
  alertsUsed: number;
  alertsLimit: number;
}

export interface SubscriptionDetails {
  businessId: string;
  legalName: string;
  gstin: string;
  tier: PlanTier;
  planName: string;
  status: "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELLED";
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  daysRemaining: number;
  autoRenew: boolean;
  paymentMethodSummary: string;
  quotas: PlanQuotas;
  activeFeatures: string[];
}

export interface LicenseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  description: string;
  planTier: PlanTier;
  originalAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  couponDiscount?: number;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  paymentMethod: string;
  status: "PAID" | "PENDING" | "VOID";
  hsnSac: string;
  invoicePdfUrl?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
}

export interface ChangePlanPayload {
  tier: PlanTier;
  billingCycle: BillingCycle;
}

export interface UpgradePreview {
  currentTier: PlanTier;
  currentCycle: BillingCycle;
  currentPrice: number;
  daysRemaining: number;
  totalPeriodDays: number;
  dailyRate: number;
  unusedCredit: number;
  targetTier: PlanTier;
  targetCycle: BillingCycle;
  targetPrice: number;
  netSubtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  totalPayable: number;
}

export interface PaymentOrder {
  orderId: string;
  businessId: string;
  amount: number;
  currency: string;
  gatewayKey: string;
  description: string;
  upiQrString?: string;
  unusedCredit?: number;
  couponCode?: string;
  couponDiscount?: number;
}

// Admin-specific types
export interface AdminBusinessSubscription {
  businessId: string;
  legalName: string;
  gstin: string;
  tier: PlanTier;
  planName: string;
  status: string;
  billingCycle: BillingCycle;
  amount: number;
  daysRemaining: number;
  autoRenew: boolean;
  currentPeriodEnd: string;
  activeWorkstations: number;
  branchCount: number;
  userCount?: number;
}

export interface StoreUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
}

export interface StoreBranchSummary {
  id: string;
  name: string;
  code: string;
}

export interface AdminStoreDetails {
  businessId: string;
  legalName: string;
  tradeName?: string;
  gstin: string;
  drugLicenseNumber?: string;
  tier: PlanTier;
  planName: string;
  status: string;
  billingCycle: BillingCycle;
  amount: number;
  daysRemaining: number;
  autoRenew: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paymentMethod?: string;
  // Usage telemetry
  activeWorkstations: number;
  totalWorkstations: number;
  workstationLimit: number;
  branchCount: number;
  branchLimit: number;
  userCount: number;
  productCount: number;
  salesCount: number;
  alertsCount: number;
  alertsLimit: number;
  storageUsedGb: number;
  storageLimitGb: number;
  branches: StoreBranchSummary[];
  users: StoreUserSummary[];
  invoices: LicenseInvoice[];
}

export interface TierPricing {
  tier: PlanTier;
  planName: string;
  monthlyPrice: number;
  description: string;
  annualDiscountPct: number;
  features?: string[];
  workstationLimit?: number;
  branchLimit?: number;
  storageLimitGb?: number;
  alertLimit?: number;
}

export interface PricingConfig {
  tiers: TierPricing[];
  currentAnnualDiscountPct: number;
}

export interface UpdatePricingPayload {
  tier: PlanTier;
  planName?: string;
  monthlyPrice: number;
  description: string;
  annualDiscountPct: number;
  features?: string[];
  workstationLimit?: number;
  branchLimit?: number;
  storageLimitGb?: number;
  alertLimit?: number;
}

export const subscriptionApi = {
  // ── Owner endpoints ──────────────────────────────────────────────────────
  async getCurrentSubscription(): Promise<SubscriptionDetails> {
    const res = await apiClient.get<SubscriptionDetails>("/api/v1/subscription/current");
    return res.data;
  },

  async getInvoices(): Promise<LicenseInvoice[]> {
    const res = await apiClient.get<LicenseInvoice[]>("/api/v1/subscription/invoices");
    return res.data || [];
  },

  async getPublicPricing(): Promise<PricingConfig> {
    const res = await apiClient.get<PricingConfig>("/api/v1/public/pricing");
    return res.data;
  },

  async changePlan(payload: ChangePlanPayload): Promise<SubscriptionDetails> {
    const res = await apiClient.post<SubscriptionDetails>("/api/v1/subscription/change-plan", payload);
    return res.data;
  },

  async toggleAutopay(enabled: boolean): Promise<SubscriptionDetails> {
    const res = await apiClient.post<SubscriptionDetails>("/api/v1/subscription/autopay", { enabled });
    return res.data;
  },

  async getUpgradePreview(targetTier: PlanTier, targetBillingCycle: BillingCycle = "MONTHLY"): Promise<UpgradePreview> {
    const res = await apiClient.get<UpgradePreview>("/api/v1/subscription/upgrade-preview", {
      params: { targetTier, targetBillingCycle },
    });
    return res.data;
  },

  async initiatePayment(payload?: { targetTier?: PlanTier; targetBillingCycle?: BillingCycle; couponCode?: string }): Promise<PaymentOrder> {
    const res = await apiClient.post<PaymentOrder>("/api/v1/subscription/payment/initiate", payload || {});
    return res.data;
  },

  async verifyPayment(payload: {
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }): Promise<SubscriptionDetails> {
    const res = await apiClient.post<SubscriptionDetails>("/api/v1/subscription/payment/verify", payload);
    return res.data;
  },

  async downloadInvoicePdfBlob(invoiceId: string): Promise<Blob> {
    const token = useAuthStore.getState().accessToken;
    const res = await fetch(`${baseUrl}/api/v1/subscription/invoices/${invoiceId}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to download PDF invoice");
    return res.blob();
  },

  async adminDownloadInvoicePdfBlob(invoiceId: string): Promise<Blob> {
    const token = useAuthStore.getState().accessToken;
    const res = await fetch(`${baseUrl}/api/v1/admin/subscription/invoices/${invoiceId}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to download PDF invoice");
    return res.blob();
  },

  // ── Admin endpoints ──────────────────────────────────────────────────────
  async getAllBusinessSubscriptions(params?: {
    search?: string;
    page?: number;
    size?: number;
  }): Promise<Page<AdminBusinessSubscription>> {
    const res = await apiClient.get<Page<AdminBusinessSubscription>>("/api/v1/admin/subscription/businesses", {
      params: {
        search: params?.search || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    });
    return res.data;
  },

  async getStoreDetails(businessId: string): Promise<AdminStoreDetails> {
    const res = await apiClient.get<AdminStoreDetails>(`/api/v1/admin/subscription/businesses/${businessId}/details`);
    return res.data;
  },

  async getPricing(): Promise<PricingConfig> {
    const res = await apiClient.get<PricingConfig>("/api/v1/admin/subscription/pricing");
    return res.data;
  },

  async updatePricing(payload: UpdatePricingPayload): Promise<PricingConfig> {
    const res = await apiClient.put<PricingConfig>("/api/v1/admin/subscription/pricing", payload);
    return res.data;
  },

  async recordPayment(businessId: string, paymentReference: string, notes?: string): Promise<SubscriptionDetails> {
    const res = await apiClient.post<SubscriptionDetails>(
      `/api/v1/admin/subscription/businesses/${businessId}/payment`,
      { paymentReference, notes: notes ?? "" }
    );
    return res.data;
  },

  async adminToggleAutopay(businessId: string, enabled: boolean): Promise<SubscriptionDetails> {
    const res = await apiClient.post<SubscriptionDetails>(
      `/api/v1/admin/subscription/businesses/${businessId}/autopay`,
      { enabled }
    );
    return res.data;
  },
};
