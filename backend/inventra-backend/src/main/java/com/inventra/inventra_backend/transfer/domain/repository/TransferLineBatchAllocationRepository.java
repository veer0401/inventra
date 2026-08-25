package com.inventra.inventra_backend.transfer.domain.repository;

import com.inventra.inventra_backend.transfer.domain.model.TransferLineBatchAllocation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransferLineBatchAllocationRepository extends JpaRepository<TransferLineBatchAllocation, UUID> {

    List<TransferLineBatchAllocation> findByTransferIdAndBusinessId(UUID transferId, UUID businessId);

    List<TransferLineBatchAllocation> findByTransferLineIdAndBusinessId(UUID transferLineId, UUID businessId);

    Optional<TransferLineBatchAllocation> findByIdAndBusinessId(UUID id, UUID businessId);
}
