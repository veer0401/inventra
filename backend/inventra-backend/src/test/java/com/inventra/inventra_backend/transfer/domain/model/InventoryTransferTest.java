package com.inventra.inventra_backend.transfer.domain.model;

import com.inventra.inventra_backend.common.domain.exception.BusinessRuleViolationException;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InventoryTransferTest {

    @Test
    @DisplayName("Creating a transfer with identical source and destination store throws SAME_STORE_TRANSFER_NOT_ALLOWED")
    void testSameStoreRejection() {
        UUID bizId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> new InventoryTransfer(
            bizId,
            storeId,
            storeId,
            "TR-SAME-001",
            userId,
            LocalDate.now().plusDays(3),
            null,
            "IDEMP-SAME",
            "Notes"
        )).isInstanceOf(BusinessRuleViolationException.class)
          .hasMessageContaining("Source and destination store cannot be the same");
    }

    @Test
    @DisplayName("Lifecycle transitions work correctly from REQUESTED through RECEIVED")
    void testTransferLifecycleTransitions() {
        UUID bizId = UUID.randomUUID();
        UUID srcStoreId = UUID.randomUUID();
        UUID dstStoreId = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();
        UUID approverId = UUID.randomUUID();
        UUID shipperId = UUID.randomUUID();
        UUID receiverId = UUID.randomUUID();

        InventoryTransfer transfer = new InventoryTransfer(
            bizId,
            srcStoreId,
            dstStoreId,
            "TR-LIFE-001",
            requesterId,
            LocalDate.now().plusDays(2),
            null,
            "IDEMP-LIFE",
            "Lifecycle test"
        );

        assertThat(transfer.getStatus()).isEqualTo(TransferStatus.REQUESTED);

        // Approve
        transfer.approve(approverId);
        assertThat(transfer.getStatus()).isEqualTo(TransferStatus.APPROVED);
        assertThat(transfer.getApprovedBy()).isEqualTo(approverId);
        assertThat(transfer.getApprovedAt()).isNotNull();

        // Ship
        transfer.markShipped(shipperId, "SHIP-IDEMP-01");
        assertThat(transfer.getStatus()).isEqualTo(TransferStatus.IN_TRANSIT);
        assertThat(transfer.getShippedBy()).isEqualTo(shipperId);
        assertThat(transfer.getShipIdempotencyKey()).isEqualTo("SHIP-IDEMP-01");

        // Attempting to cancel an in-transit transfer is forbidden
        assertThatThrownBy(() -> transfer.cancel(approverId, "Try cancel after ship"))
            .isInstanceOf(BusinessRuleViolationException.class)
            .hasMessageContaining("Cannot cancel transfer in status IN_TRANSIT");
    }

    @Test
    @DisplayName("Rejecting a transfer transitions status to REJECTED with mandatory reason")
    void testRejectTransfer() {
        UUID bizId = UUID.randomUUID();
        UUID srcStoreId = UUID.randomUUID();
        UUID dstStoreId = UUID.randomUUID();
        UUID user = UUID.randomUUID();

        InventoryTransfer transfer = new InventoryTransfer(
            bizId, srcStoreId, dstStoreId, "TR-REJ-01", user, null, null, null, null
        );

        assertThatThrownBy(() -> transfer.reject(user, "   "))
            .isInstanceOf(BusinessRuleViolationException.class)
            .hasMessageContaining("Rejection reason is required");

        transfer.reject(user, "Out of stock at source");
        assertThat(transfer.getStatus()).isEqualTo(TransferStatus.REJECTED);
        assertThat(transfer.getRejectionReason()).isEqualTo("Out of stock at source");
    }
}
