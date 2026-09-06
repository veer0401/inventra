import type { ProblemDetail, FieldErrorViolation } from "@inventra/api-types";

export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly problem?: ProblemDetail;
  public readonly violations?: FieldErrorViolation[];

  constructor(status: number, message: string, problem?: ProblemDetail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = problem?.errorCode ?? `HTTP_${status}`;
    this.problem = problem;
    this.violations = problem?.violations;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public isUnauthorized(): boolean {
    return this.status === 401;
  }

  public isForbidden(): boolean {
    return this.status === 403;
  }

  public isNotFound(): boolean {
    return this.status === 404;
  }

  public isConflict(): boolean {
    return this.status === 409;
  }

  public isValidationError(): boolean {
    return this.status === 400 && (this.violations !== undefined || this.errorCode === "VALIDATION_FAILED");
  }

  public isBusinessRuleViolation(): boolean {
    return this.status === 422;
  }
}
