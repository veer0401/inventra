package com.inventra.inventra_backend.common.domain.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends DomainException {

    public ResourceNotFoundException(String message) {
        super("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }

    public ResourceNotFoundException(String errorCode, String message) {
        super(errorCode, message, HttpStatus.NOT_FOUND);
    }

    public static ResourceNotFoundException forResource(String resourceName, Object identifier) {
        return new ResourceNotFoundException("RESOURCE_NOT_FOUND", "%s not found with identifier: %s".formatted(resourceName, identifier));
    }
}
