export type DosageForm =
  | "TABLET"
  | "CAPSULE"
  | "SYRUP"
  | "INJECTION"
  | "OINTMENT"
  | "DROPS"
  | "POWDER"
  | "DEVICE"
  | "GENERAL";

export type IdentifierType =
  | "BARCODE"
  | "SKU"
  | "EAN_13"
  | "UPC"
  | "MANUFACTURER_CODE";

export type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

export type CategoryStatus = "ACTIVE" | "INACTIVE";

export interface CategoryResponse {
  id: string;
  businessId: string;
  parentId?: string;
  name: string;
  code: string;
  description?: string;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  parentId?: string;
  name: string;
  code: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  status?: CategoryStatus;
}

export interface ProductIdentifierResponse {
  id: string;
  productId: string;
  identifierType: IdentifierType;
  identifierValue: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface AddProductIdentifierRequest {
  identifierType: IdentifierType;
  identifierValue: string;
  isPrimary?: boolean;
}

export interface ProductResponse {
  id: string;
  businessId: string;
  categoryId?: string;
  globalProductId?: string;
  name: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit: string;
  sellingUnit?: string;
  unitsPerSellingUnit: number;
  hsnCode?: string;
  taxRate?: number;
  isTaxInclusive: boolean;
  prescriptionRequired: boolean;
  status: ProductStatus;
  identifiers: ProductIdentifierResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummaryResponse {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit: string;
  sellingUnit?: string;
  unitsPerSellingUnit: number;
  taxRate?: number;
  prescriptionRequired: boolean;
  status: ProductStatus;
}

export interface CreateProductRequest {
  categoryId?: string;
  globalProductId?: string;
  name: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit: string;
  sellingUnit?: string;
  unitsPerSellingUnit?: number;
  hsnCode?: string;
  taxRate?: number;
  isTaxInclusive?: boolean;
  prescriptionRequired?: boolean;
  identifiers?: AddProductIdentifierRequest[];
}

export interface UpdateProductRequest {
  categoryId?: string;
  name?: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm?: DosageForm;
  strength?: string;
  baseUnit?: string;
  sellingUnit?: string;
  unitsPerSellingUnit?: number;
  hsnCode?: string;
  taxRate?: number;
  isTaxInclusive?: boolean;
  prescriptionRequired?: boolean;
  status?: ProductStatus;
}
