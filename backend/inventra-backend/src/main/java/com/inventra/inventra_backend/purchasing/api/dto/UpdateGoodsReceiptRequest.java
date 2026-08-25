package com.inventra.inventra_backend.purchasing.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record UpdateGoodsReceiptRequest(
    @Size(max = 100, message = "Vendor delivery note cannot exceed 100 characters")
    String vendorDeliveryNote,

    LocalDate receivedDate,

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    String notes,

    @Valid
    List<CreateGoodsReceiptLineRequest> lines
) {}
