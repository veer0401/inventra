package com.inventra.inventra_backend.transfer.api.dto;

import jakarta.validation.Valid;
import java.util.List;

public record ApproveTransferRequest(
    String notes,
    @Valid
    List<ApproveTransferLineRequest> lines
) {}
