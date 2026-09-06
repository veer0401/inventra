export type ImportDomain = 'PRODUCT_CATALOG' | 'CUSTOMERS' | 'SUPPLIERS' | 'INVENTORY';

export type ImportJobStatus = 'PENDING_REVIEW' | 'POSTED' | 'PARTIALLY_POSTED' | 'CANCELLED' | 'FAILED';

export type ImportSource = 'CSV' | 'PDF' | 'EMAIL' | 'MANUAL';

export type ImportRowStatus = 'DRAFT' | 'VALID' | 'INVALID' | 'POSTED' | 'SKIPPED';

export type ValidationIssueSeverity = 'ERROR' | 'WARNING';

export interface ImportValidationIssueResponse {
  id: string;
  fieldName: string;
  errorCode: string;
  errorMessage: string;
  severity: ValidationIssueSeverity;
}

export interface ImportJobResponse {
  id: string;
  businessId: string;
  storeId?: string | null;
  importSource: ImportSource;
  importDomain: ImportDomain;
  status: ImportJobStatus;
  originalFilename: string;
  fileHash: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  skippedRows: number;
  createdBy: string;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRowResponse {
  id: string;
  importJobId: string;
  rowIndex: number;
  status: ImportRowStatus;
  rawData: Record<string, string>;
  normalizedData: Record<string, any>;
  matchedEntityId?: string | null;
  matchConfidence?: number | null;
  skippedBy?: string | null;
  skippedAt?: string | null;
  skipReason?: string | null;
  validationIssues: ImportValidationIssueResponse[];
  createdAt: string;
}

export interface TemplateColumnDefinition {
  fieldName: string;
  headerName: string;
  required: boolean;
  description: string;
  dataType: string;
  exampleValue: string;
  allowedValues?: string[] | null;
  headerAliases?: string[] | null;
}

export interface ImportTemplateMetadata {
  domain: ImportDomain;
  displayName: string;
  description: string;
  columns: TemplateColumnDefinition[];
  sampleCsvContent: string;
}

export interface ConfirmImportResponse {
  importJobId: string;
  status: ImportJobStatus;
  totalRows: number;
  postedRows: number;
  skippedRows: number;
  confirmedAt: string;
}

export interface UpdateImportRowRequest {
  fields: Record<string, string>;
}

export interface SkipImportRowRequest {
  skipReason: string;
}
