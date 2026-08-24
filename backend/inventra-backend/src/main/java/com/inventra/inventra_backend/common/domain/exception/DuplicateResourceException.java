package com.inventra.inventra_backend.common.domain.exception;

import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends DomainException {

    public DuplicateResourceException(String resourceName, String field, Object value) {
        super("DUPLICATE_RESOURCE", "%s already exists with %s: %s".formatted(resourceName, field, value), HttpStatus.CONFLICT);
    }

    public DuplicateResourceException(String errorCode, String message) {
        super(errorCode, message, HttpStatus.CONFLICT);
    }
}
