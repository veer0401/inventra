export type UserRole = "PLATFORM_ADMIN" | "OWNER" | "MANAGER" | "INVENTORY_OPERATOR" | "CASHIER";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "LOCKED" | "SUSPENDED";

export interface LoginRequest {
  email: string;
  password: string;
  deviceCode?: string;
  deviceName?: string;
  deviceType?: "DESKTOP" | "MOBILE_ANDROID" | "MOBILE_IOS" | "BROWSER";
}

export interface UserSummaryDto {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  status: AccountStatus;
  emailVerified: boolean;
}

export interface ActiveContextDto {
  businessId?: string;
  businessName: string;
  storeId?: string;
  storeName?: string;
  storeCode?: string;
  role: UserRole;
  deviceId?: string;
}

export interface StoreAssignmentSummaryDto {
  storeId: string;
  storeName: string;
  storeCode: string;
  roleOverride?: UserRole;
  isPrimaryStore: boolean;
}

export interface BusinessMembershipSummaryDto {
  businessId: string;
  businessName: string;
  role: UserRole;
  stores: StoreAssignmentSummaryDto[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserSummaryDto;
  activeContext: ActiveContextDto;
  memberships: BusinessMembershipSummaryDto[];
}

// Aliases for compatibility
export type LoginResponse = AuthResponse;
export type TokenRefreshResponse = AuthResponse;
export type BusinessMembershipSummary = BusinessMembershipSummaryDto;
export type StoreSummary = StoreAssignmentSummaryDto;

export interface RefreshTokenRequest {
  refreshToken: string;
}

export type TokenRefreshRequest = RefreshTokenRequest;

export interface SwitchContextRequest {
  businessId?: string;
  storeId?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  email: string;
}

export type ResetPasswordRequest = PasswordResetRequest;

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export type ResetPasswordConfirmRequest = PasswordResetConfirmRequest;

export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  status: AccountStatus;
  memberships: BusinessMembershipSummaryDto[];
}
