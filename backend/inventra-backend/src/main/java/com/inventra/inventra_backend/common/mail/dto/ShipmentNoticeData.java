package com.inventra.inventra_backend.common.mail.dto;

import java.util.List;

public record ShipmentNoticeData(
    String transferNumber,
    String status, // "IN_TRANSIT", "ARRIVED", "DISPATCHED"
    String originStoreName,
    String destinationStoreName,
    String carrierName,
    String trackingNumber,
    List<ShipmentLineItem> lines
) {
    public record ShipmentLineItem(
        String productName,
        int requestedQuantity,
        int shippedQuantity
    ) {}
}
