/**
 * Standard Inventra API Success Envelope
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * RFC 9457 Problem Details Error Envelope
 */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errorCode: string;
  timestamp: string;
  violations?: FieldErrorViolation[];
  properties?: Record<string, unknown>;
}

/**
 * Field-level validation violation
 */
export interface FieldErrorViolation {
  field: string;
  message: string;
  rejectedValue?: string;
}

/**
 * Spring Data Pageable metadata
 */
export interface PageableMetadata {
  pageNumber: number;
  pageSize: number;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

/**
 * Spring Data Page Envelope
 */
export interface Page<T> {
  content: T[];
  pageable: PageableMetadata;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
}
