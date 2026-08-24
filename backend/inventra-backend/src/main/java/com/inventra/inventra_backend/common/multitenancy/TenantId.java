package com.inventra.inventra_backend.common.multitenancy;

import java.io.Serializable;
import java.util.Objects;

public record TenantId(String value) implements Serializable {

    public TenantId {
        Objects.requireNonNull(value, "Tenant ID cannot be null");
        value = value.trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException("Tenant ID cannot be empty");
        }
    }

    public static TenantId of(String value) {
        return new TenantId(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
