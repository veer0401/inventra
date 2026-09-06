export interface StoreCapacityResponse {
  storeId: string;
  storeName: string;
  storeCode: string;
  maxUsers: number;
  currentActiveUsers: number;
  atCapacity: boolean;
}

export interface UpdateStoreCapacityRequest {
  maxUsers: number;
}

export interface AssignStoreUserRequest {
  businessMembershipId: string;
  roleOverride?: string | null;
  isPrimaryStore?: boolean;
}
