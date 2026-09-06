export type OnboardingApplicationStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface SubmitOnboardingApplicationRequest {
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  businessName: string;
  tradeName?: string;
  drugLicenseNumber?: string;
  gstin?: string;
  storeName: string;
  storeCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface OnboardingApplicationSummaryResponse {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  businessName: string;
  storeName: string;
  status: OnboardingApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
}

export interface OnboardingApplicationDetailResponse {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  businessName: string;
  tradeName?: string;
  drugLicenseNumber?: string;
  gstin?: string;
  storeName: string;
  storeCode: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  status: OnboardingApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  activationCompletedAt?: string;
  createdBusinessId?: string;
  createdUserId?: string;
}

export interface RejectOnboardingApplicationRequest {
  rejectionReason: string;
}

export interface OnboardingApprovalResponse {
  applicationId: string;
  businessId: string;
  userId: string;
  status: OnboardingApplicationStatus;
  reviewedAt: string;
  devActivationToken?: string;
  devActivationUrl?: string;
}

export interface ActivateOwnerRequest {
  token: string;
  newPassword: string;
}
