package com.inventra.inventra_backend.purchasing.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoodsReceiptTest {

    @Test
    @DisplayName("Calculates line totals and goods receipt header totals")
    void testGoodsReceiptTotals() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID supplierId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        GoodsReceipt gr = new GoodsReceipt(
            businessId,
            storeId,
            supplierId,
            null,
            "GRN-MAIN-00001",
            "DC-1234",
            LocalDate.now(),
            "Good condition",
            null
        );

        GoodsReceiptLine line1 = new GoodsReceiptLine(
            businessId,
            gr.getId(),
            null,
            productId,
            1,
            new BigDecimal("5.000"), // 5 boxes
            "BOX",
            10, // 10 strips per box
            BigDecimal.ZERO,
            "LOT-777",
            LocalDate.now().minusMonths(1),
            LocalDate.now().plusMonths(24),
            new BigDecimal("80.0000"), // cost per box
            new BigDecimal("12.00"), // mrp per strip
            new BigDecimal("11.50"), // selling price per strip
            new BigDecimal("5.00") // 5% tax
        );

        gr.addLine(line1);

        assertThat(line1.getReceivedBaseQuantity()).isEqualByComparingTo("50.000");
        assertThat(line1.getBaseUnitCost()).isEqualByComparingTo("8.0000");
        assertThat(line1.getTaxAmount()).isEqualByComparingTo("20.0000");
        assertThat(line1.getLineTotal()).isEqualByComparingTo("420.0000");

        assertThat(gr.getTotalItems()).isEqualTo(1);
        assertThat(gr.getTotalReceivedQuantity()).isEqualByComparingTo("50.000");
        assertThat(gr.getTotalAmount()).isEqualByComparingTo("420.0000");
        assertThat(gr.getStatus()).isEqualTo(GoodsReceiptStatus.DRAFT);
    }

    @Test
    @DisplayName("Posting goods receipt changes status to POSTED and sets audit fields")
    void testPostAndCancelGoodsReceipt() {
        UUID businessId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID supplierId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        GoodsReceipt gr = new GoodsReceipt(
            businessId,
            storeId,
            supplierId,
            null,
            "GRN-MAIN-00002",
            null,
            LocalDate.now(),
            null,
            null
        );

        GoodsReceiptLine line = new GoodsReceiptLine(
            businessId,
            gr.getId(),
            null,
            productId,
            1,
            new BigDecimal("10.000"),
            "STRIP",
            1,
            BigDecimal.ZERO,
            null,
            null,
            null,
            new BigDecimal("5.0000"),
            null,
            null,
            BigDecimal.ZERO
        );
        gr.addLine(line);

        gr.post(userId);
        assertThat(gr.getStatus()).isEqualTo(GoodsReceiptStatus.POSTED);
        assertThat(gr.getPostedBy()).isEqualTo(userId);
        assertThat(gr.getPostedAt()).isNotNull();

        // Posting an already posted receipt fails
        assertThatThrownBy(() -> gr.post(userId))
            .isInstanceOf(IllegalStateException.class);

        // Cancelling a posted receipt fails
        assertThatThrownBy(gr::cancel)
            .isInstanceOf(IllegalStateException.class);
    }
}
