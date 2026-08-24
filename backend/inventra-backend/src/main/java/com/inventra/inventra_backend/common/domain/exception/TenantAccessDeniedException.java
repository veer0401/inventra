package com.inventra.inventra_backend.common.domain.exception;

import org.springframework.http.HttpStatus;

public class TenantAccessDeniedException extends DomainException {

    public TenantAccessDeniedException(String message) {
        super("TENANT_ACCESS_DENIED", message, HttpStatus.FORBIDDEN);
    }

    public TenantAccessDeniedException(String message, String errorCode) {
        super(errorCode, message, HttpStatus.FORBIDDEN);
    }

    public TenantAccessDeniedException() {
        super("TENANT_ACCESS_DENIED", "Access to the requested tenant resource is denied", HttpStatus.FORBIDDEN);
    }
}
