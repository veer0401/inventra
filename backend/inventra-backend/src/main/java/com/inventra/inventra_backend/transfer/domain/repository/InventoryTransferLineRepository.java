package com.inventra.inventra_backend.transfer.domain.repository;

import com.inventra.inventra_backend.transfer.domain.model.InventoryTransferLine;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryTransferLineRepository extends JpaRepository<InventoryTransferLine, UUID> {

    List<InventoryTransferLine> findByTransferIdAndBusinessIdOrderByLineNumberAsc(UUID transferId, UUID businessId);

    Optional<InventoryTransferLine> findByIdAndBusinessId(UUID id, UUID businessId);
}
