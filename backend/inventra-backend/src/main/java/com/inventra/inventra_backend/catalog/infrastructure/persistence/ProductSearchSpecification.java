package com.inventra.inventra_backend.catalog.infrastructure.persistence;

import com.inventra.inventra_backend.catalog.domain.model.DosageForm;
import com.inventra.inventra_backend.catalog.domain.model.IdentifierType;
import com.inventra.inventra_backend.catalog.domain.model.Product;
import com.inventra.inventra_backend.catalog.domain.model.ProductIdentifier;
import com.inventra.inventra_backend.catalog.domain.model.ProductQueryCondition;
import com.inventra.inventra_backend.catalog.domain.model.QueryOperator;
import com.inventra.inventra_backend.inventory.domain.model.BatchStatus;
import com.inventra.inventra_backend.inventory.domain.model.InventoryBatch;
import com.inventra.inventra_backend.inventory.domain.model.InventoryItem;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

import com.inventra.inventra_backend.catalog.api.dto.ProductSearchRequest;

/**
 * Dynamic JPA Specification for structured product queries.
 * Enforces strict business tenant isolation and combines conditions with AND.
 */
public class ProductSearchSpecification implements Specification<Product> {

    private final UUID businessId;
    private final UUID storeId;
    private final List<ProductQueryCondition> conditions;
    private final String freeTextQuery;

    public ProductSearchSpecification(
        UUID businessId,
        UUID storeId,
        ProductSearchRequest request
    ) {
        this(
            businessId,
            storeId,
            request != null ? request.conditions() : null,
            request != null ? request.query() : null
        );
    }

    public ProductSearchSpecification(
        UUID businessId,
        UUID storeId,
        List<ProductQueryCondition> conditions,
        String freeTextQuery
    ) {
        this.businessId = businessId;
        this.storeId = storeId;
        this.conditions = conditions != null ? conditions : List.of();
        this.freeTextQuery = freeTextQuery != null && !freeTextQuery.isBlank() ? freeTextQuery.trim() : null;
    }

    @Override
    public Predicate toPredicate(Root<Product> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
        List<Predicate> predicates = new ArrayList<>();

        // 1. Mandatory Business Tenant Isolation
        predicates.add(cb.equal(root.get("businessId"), businessId));

        // 2. Free-text query if provided (cross-field name, genericName, brand, identifier)
        if (freeTextQuery != null) {
            String term = "%" + freeTextQuery.toLowerCase(Locale.ROOT) + "%";

            Subquery<UUID> idSubquery = query.subquery(UUID.class);
            Root<ProductIdentifier> pi = idSubquery.from(ProductIdentifier.class);
            idSubquery.select(pi.get("productId"));
            idSubquery.where(
                cb.equal(pi.get("productId"), root.get("id")),
                cb.equal(pi.get("businessId"), businessId),
                cb.like(cb.lower(pi.get("identifierValue")), term)
            );

            predicates.add(cb.or(
                cb.like(cb.lower(root.get("name")), term),
                cb.like(cb.lower(root.get("genericName")), term),
                cb.like(cb.lower(root.get("brandName")), term),
                cb.exists(idSubquery)
            ));
        }

        // 3. Evaluate structured conditions
        for (ProductQueryCondition cond : conditions) {
            switch (cond.field()) {
                case NAME -> predicates.add(buildTextPredicate(cb, root.get("name"), cond.operator(), cond.value()));
                case GENERIC_NAME -> predicates.add(buildTextPredicate(cb, root.get("genericName"), cond.operator(), cond.value()));
                case BRAND -> predicates.add(buildTextPredicate(cb, root.get("brandName"), cond.operator(), cond.value()));
                case DOSAGE_FORM -> {
                    DosageForm form = DosageForm.valueOf(cond.value().toUpperCase(Locale.ROOT));
                    predicates.add(cb.equal(root.get("dosageForm"), form));
                }
                case SKU -> {
                    Subquery<UUID> skuSubquery = query.subquery(UUID.class);
                    Root<ProductIdentifier> pi = skuSubquery.from(ProductIdentifier.class);
                    skuSubquery.select(pi.get("productId"));
                    skuSubquery.where(
                        cb.equal(pi.get("productId"), root.get("id")),
                        cb.equal(pi.get("businessId"), businessId),
                        cb.equal(pi.get("identifierType"), IdentifierType.SKU),
                        buildTextPredicate(cb, pi.get("identifierValue"), cond.operator(), cond.value())
                    );
                    predicates.add(cb.exists(skuSubquery));
                }
                case PRICE -> {
                    Subquery<UUID> batchSub = query.subquery(UUID.class);
                    Root<InventoryBatch> batch = batchSub.from(InventoryBatch.class);
                    batchSub.select(batch.get("productId"));

                    List<Predicate> batchPreds = new ArrayList<>();
                    batchPreds.add(cb.equal(batch.get("productId"), root.get("id")));
                    batchPreds.add(cb.equal(batch.get("businessId"), businessId));
                    if (storeId != null) {
                        batchPreds.add(cb.equal(batch.get("storeId"), storeId));
                    }
                    batchPreds.add(cb.equal(batch.get("status"), BatchStatus.ACTIVE));

                    BigDecimal val = new BigDecimal(cond.value());
                    BigDecimal secVal = cond.secondaryValue() != null ? new BigDecimal(cond.secondaryValue()) : null;
                    batchPreds.add(buildNumericPredicate(cb, batch.get("sellingPrice"), cond.operator(), val, secVal));

                    batchSub.where(batchPreds.toArray(new Predicate[0]));
                    predicates.add(cb.exists(batchSub));
                }
                case STOCK -> {
                    Subquery<UUID> itemSub = query.subquery(UUID.class);
                    Root<InventoryItem> item = itemSub.from(InventoryItem.class);
                    itemSub.select(item.get("productId"));

                    List<Predicate> itemPreds = new ArrayList<>();
                    itemPreds.add(cb.equal(item.get("productId"), root.get("id")));
                    itemPreds.add(cb.equal(item.get("businessId"), businessId));
                    if (storeId != null) {
                        itemPreds.add(cb.equal(item.get("storeId"), storeId));
                    }

                    BigDecimal val = new BigDecimal(cond.value());
                    BigDecimal secVal = cond.secondaryValue() != null ? new BigDecimal(cond.secondaryValue()) : null;
                    itemPreds.add(buildNumericPredicate(cb, item.get("currentStock"), cond.operator(), val, secVal));

                    itemSub.where(itemPreds.toArray(new Predicate[0]));
                    predicates.add(cb.exists(itemSub));
                }
                case REORDER_LEVEL -> {
                    Subquery<UUID> itemSub = query.subquery(UUID.class);
                    Root<InventoryItem> item = itemSub.from(InventoryItem.class);
                    itemSub.select(item.get("productId"));

                    List<Predicate> itemPreds = new ArrayList<>();
                    itemPreds.add(cb.equal(item.get("productId"), root.get("id")));
                    itemPreds.add(cb.equal(item.get("businessId"), businessId));
                    if (storeId != null) {
                        itemPreds.add(cb.equal(item.get("storeId"), storeId));
                    }

                    BigDecimal val = new BigDecimal(cond.value());
                    BigDecimal secVal = cond.secondaryValue() != null ? new BigDecimal(cond.secondaryValue()) : null;
                    itemPreds.add(buildNumericPredicate(cb, item.get("reorderLevel"), cond.operator(), val, secVal));

                    itemSub.where(itemPreds.toArray(new Predicate[0]));
                    predicates.add(cb.exists(itemSub));
                }
                case STRENGTH -> {
                    predicates.add(buildStrengthPredicate(cb, root.get("strength"), cond));
                }
            }
        }

        query.distinct(true);
        return cb.and(predicates.toArray(new Predicate[0]));
    }

    private static Predicate buildTextPredicate(
        CriteriaBuilder cb,
        Expression<String> path,
        QueryOperator operator,
        String value
    ) {
        String lowerVal = value.toLowerCase(Locale.ROOT);
        Expression<String> lowerPath = cb.lower(path);
        return switch (operator) {
            case EQUALS -> cb.equal(lowerPath, lowerVal);
            case CONTAINS -> cb.like(lowerPath, "%" + lowerVal + "%");
            case STARTS_WITH -> cb.like(lowerPath, lowerVal + "%");
            case ENDS_WITH -> cb.like(lowerPath, "%" + lowerVal);
            default -> throw new IllegalArgumentException("Unsupported text operator: " + operator);
        };
    }

    private static Predicate buildNumericPredicate(
        CriteriaBuilder cb,
        Expression<? extends Number> path,
        QueryOperator operator,
        BigDecimal value,
        BigDecimal secondaryValue
    ) {
        return switch (operator) {
            case EQUALS -> cb.equal(path, value);
            case GREATER_THAN -> cb.gt(path, value);
            case GREATER_THAN_OR_EQUAL -> cb.ge(path, value);
            case LESS_THAN -> cb.lt(path, value);
            case LESS_THAN_OR_EQUAL -> cb.le(path, value);
            case BETWEEN -> cb.and(cb.ge(path, value), cb.le(path, secondaryValue));
            default -> throw new IllegalArgumentException("Unsupported numeric operator: " + operator);
        };
    }

    private static Predicate buildStrengthPredicate(
        CriteriaBuilder cb,
        Expression<String> strengthPath,
        ProductQueryCondition cond
    ) {
        List<Predicate> preds = new ArrayList<>();
        // Must not be null
        preds.add(cb.isNotNull(strengthPath));

        // Optional unit filter
        if (cond.unit() != null && !cond.unit().isBlank()) {
            preds.add(cb.like(cb.lower(strengthPath), "%" + cond.unit().toLowerCase(Locale.ROOT) + "%"));
        }

        // Safe numeric extraction using PostgreSQL regexp_substr(string, '^[0-9]+(\.[0-9]+)?')
        Expression<String> numStr = cb.function(
            "regexp_substr",
            String.class,
            strengthPath,
            cb.literal("^[0-9]+(\\.[0-9]+)?")
        );
        preds.add(cb.isNotNull(numStr));

        // Convert to numeric via PostgreSQL to_number(text, text)
        Expression<BigDecimal> numVal = cb.function(
            "to_number",
            BigDecimal.class,
            numStr,
            cb.literal("999999999.99")
        );
        BigDecimal targetVal = new BigDecimal(cond.value());
        BigDecimal targetSecVal = cond.secondaryValue() != null ? new BigDecimal(cond.secondaryValue()) : null;

        preds.add(buildNumericPredicate(cb, numVal, cond.operator(), targetVal, targetSecVal));

        return cb.and(preds.toArray(new Predicate[0]));
    }
}
