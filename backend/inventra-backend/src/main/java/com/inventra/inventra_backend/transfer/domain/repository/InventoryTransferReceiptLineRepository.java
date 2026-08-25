package com.inventra.inventra_backend.transfer.domain.repository;

import com.inventra.inventra_backend.transfer.domain.model.InventoryTransferReceiptLine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryTransferReceiptLineRepository extends JpaRepository<InventoryTransferReceiptLine, UUID> {

    List<InventoryTransferReceiptLine> findByTransferReceiptIdAndBusinessId(UUID transferReceiptId, UUID businessId);
}
