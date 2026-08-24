package com.inventra.inventra_backend.identity.domain.model;

public enum SecurityAuditEventType {
    LOGIN_SUCCESS,
    LOGIN_FAILURE,
    LOGOUT,
    LOGOUT_ALL,
    TOKEN_REFRESH,
    TOKEN_REUSE_DETECTED,
    PASSWORD_CHANGED,
    PASSWORD_RESET_REQUESTED,
    PASSWORD_RESET_COMPLETED,
    DEVICE_REGISTERED,
    DEVICE_REVOKED,
    ACCOUNT_LOCKED
}
