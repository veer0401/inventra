import { apiClient } from "./api";

export interface CmsPage {
  pageKey: string;
  title: string;
  subtitle?: string;
  content: Record<string, any>;
  contentData?: Record<string, any>;
  updatedAt?: string;
  updatedBy?: string;
}

export type DiscountType = "PERCENTAGE" | "FLAT";

export interface Coupon {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  firstTimeOnly: boolean;
  minTier: "STARTER" | "PRO" | "ENTERPRISE" | null;
  minCycle: "MONTHLY" | "ANNUALLY" | null;
  minOrderAmount: number | null;
  maxUses: number | null;
  currentUses: number;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
}

export interface CreateCouponPayload {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  firstTimeOnly?: boolean;
  minTier?: string | null;
  minCycle?: string | null;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  validUntil?: string | null;
  active?: boolean;
}

export interface UpdateCouponPayload {
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  maxDiscountAmount?: number | null;
  firstTimeOnly?: boolean;
  minTier?: string | null;
  minCycle?: string | null;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  validUntil?: string | null;
  active?: boolean;
}

export interface ValidateCouponPayload {
  code: string;
  tier?: string;
  billingCycle?: string;
  subtotal?: number;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  message: string;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: number;
  originalSubtotal: number;
  discountedSubtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  totalPayable: number;
}

export const cmsApi = {
  // Public CMS
  async getPublicPage(pageKey: string): Promise<CmsPage> {
    const res = await apiClient.get<any>(`/api/v1/public/content/${pageKey}`);
    const data = res.data || {};
    const content = data.content || data.contentData || {};
    return {
      ...data,
      content,
      contentData: content,
    };
  },

  // Admin CMS
  async getAdminPage(pageKey: string): Promise<CmsPage> {
    const res = await apiClient.get<any>(`/api/v1/admin/content/${pageKey}`);
    const data = res.data || {};
    const content = data.content || data.contentData || {};
    return {
      ...data,
      content,
      contentData: content,
    };
  },

  async updateAdminPage(
    pageKey: string,
    payload: { title: string; subtitle?: string; content?: Record<string, any>; contentData?: Record<string, any> }
  ): Promise<CmsPage> {
    const content = payload.content || payload.contentData || {};
    const res = await apiClient.put<any>(`/api/v1/admin/content/${pageKey}`, {
      title: payload.title,
      subtitle: payload.subtitle,
      contentData: content,
      content: content,
    });
    const data = res.data || {};
    const resContent = data.content || data.contentData || {};
    return {
      ...data,
      content: resContent,
      contentData: resContent,
    };
  },

  // Coupon validation
  async validateCoupon(payload: ValidateCouponPayload): Promise<CouponValidationResult> {
    const res = await apiClient.post<CouponValidationResult>("/api/v1/subscription/coupon/validate", payload);
    return res.data;
  },

  // Admin Coupon Management
  async getAllCoupons(): Promise<Coupon[]> {
    const res = await apiClient.get<Coupon[]>("/api/v1/admin/subscription/coupons");
    return res.data || [];
  },

  async createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
    const res = await apiClient.post<Coupon>("/api/v1/admin/subscription/coupons", payload);
    return res.data;
  },

  async updateCoupon(code: string, payload: UpdateCouponPayload): Promise<Coupon> {
    const res = await apiClient.put<Coupon>(`/api/v1/admin/subscription/coupons/${encodeURIComponent(code)}`, payload);
    return res.data;
  },

  async deleteCoupon(code: string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/subscription/coupons/${encodeURIComponent(code)}`);
  },
};
