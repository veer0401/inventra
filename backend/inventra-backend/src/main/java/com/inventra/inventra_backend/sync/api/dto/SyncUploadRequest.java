package com.inventra.inventra_backend.sync.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.inventra.inventra_backend.sync.domain.model.SyncEventType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SyncUploadRequest(
    @NotNull UUID deviceId,
    @NotNull UUID syncSessionId,
    @Min(1) int protocolVersion,
    @NotNull Instant clientTimestamp,
    @NotEmpty @Size(max = 50) List<@Valid SyncOperationRequest> operations
) {}
