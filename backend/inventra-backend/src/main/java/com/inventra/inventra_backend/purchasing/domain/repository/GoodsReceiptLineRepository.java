package com.inventra.inventra_backend.purchasing.domain.repository;

import com.inventra.inventra_backend.purchasing.domain.model.GoodsReceiptLine;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GoodsReceiptLineRepository extends JpaRepository<GoodsReceiptLine, UUID> {

    Optional<GoodsReceiptLine> findByIdAndBusinessId(UUID id, UUID businessId);

    List<GoodsReceiptLine> findByGoodsReceiptIdAndBusinessId(UUID goodsReceiptId, UUID businessId);
}
