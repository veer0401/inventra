package com.inventra.inventra_backend.inventory.domain.model;

public enum StockMovementType {
    INITIAL_STOCK,
    PURCHASE_RECEIPT,
    PURCHASE_RETURN,
    SALE,
    SALE_RETURN,
    SALE_VOID,
    ADJUSTMENT_IN,
    ADJUSTMENT_OUT,
    TRANSFER_IN,
    TRANSFER_OUT,
    DAMAGE_WRITE_OFF,
    EXPIRY_WRITE_OFF,
    STOCK_AUDIT
}
