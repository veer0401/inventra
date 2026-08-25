package com.inventra.inventra_backend.transfer.domain.model;

public enum TransferStatus {
    REQUESTED,
    APPROVED,
    REJECTED,
    IN_TRANSIT,
    PARTIALLY_RECEIVED,
    RECEIVED,
    CANCELLED
}
