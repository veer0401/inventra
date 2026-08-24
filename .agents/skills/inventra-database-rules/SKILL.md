---
name: inventra-database-rules
description: >
  Defines the authoritative PostgreSQL database, schema design, tenancy,
  migration, indexing, inventory persistence, batch tracking, auditability,
  monetary precision, constraints, synchronization metadata, and query
  performance rules for Inventra Pharmacy ERP. Use this skill whenever
  designing, creating, modifying, reviewing, or migrating Inventra database
  schemas, entities, repositories, queries, indexes, or Flyway migrations.
---

# Inventra Database Rules

## 1. Purpose

This document defines the database rules for Inventra.

The database is a critical source of business truth.

Database design must protect:

- Data integrity
- Tenant isolation
- Inventory correctness
- Financial correctness
- Batch traceability
- Auditability
- Synchronization
- Query performance
- Migration safety

Do not design tables merely to mirror Java classes.

Design the database around business invariants and access patterns.

---

# 2. Primary Database

Inventra uses:

- PostgreSQL
- Flyway migrations
- Hibernate/JPA for persistence where appropriate

PostgreSQL is the authoritative cloud database.

The application must not depend on database-specific behavior without documenting
the dependency.

---

# 3. Database Is Not a CRUD Dump

Do not create tables simply because a Java object exists.

Every important table should answer:

1. What business concept does this represent?
2. Who owns it?
3. What is its lifecycle?
4. What records depend on it?
5. What must never change?
6. What must be auditable?
7. How will it be queried?
8. What indexes are required?
9. How does it behave during synchronization?

---

# 4. Naming Convention

Use consistent PostgreSQL naming.

Preferred:

```text
snake_case
````

Examples:

```text
product
product_category
inventory_batch
purchase_invoice
purchase_invoice_item
sales_invoice
sales_invoice_item
inventory_movement
stock_adjustment
customer
supplier
```

Do not mix:

```text
productId
product_id
ProductID
```

at the database level.

Java naming conventions may differ from database naming conventions.

---

# 5. Primary Keys

Every persistent business entity must have a stable primary key.

For synchronization-sensitive entities, prefer globally unique identifiers such
as UUID/ULID-style IDs.

Do not depend on local auto-increment sequences as the sole identifier for
offline-created business transactions.

Database-generated numeric IDs may still be used where appropriate for
non-synchronization/internal records.

The choice must be deliberate.

---

# 6. Business Identifier vs Database Identifier

Do not assume the primary key is the same thing as a human-visible business
identifier.

Example:

```text
Database ID:
01J...

Invoice Number:
INV-2026-000123
```

The invoice number may be human-friendly while the internal ID remains stable
for synchronization.

Both may exist.

Do not expose database implementation details as business identifiers.

---

# 7. Multi-Tenancy

Inventra is multi-tenant.

Tenant-owned tables must have an unambiguous tenant ownership relationship.

For directly tenant-owned records, prefer:

```text
tenant_id
```

where appropriate.

Examples:

```text
customer
supplier
purchase_invoice
sales_invoice
inventory
inventory_batch
stock_adjustment
store_settings
```

The exact ownership model may vary for master/reference data.

---

# 8. Tenant Isolation at Database Level

Tenant isolation must not depend exclusively on Java application filtering.

The application must always apply tenant-aware queries.

Where justified by the final architecture, PostgreSQL Row Level Security
may be considered.

Do not introduce RLS merely because it exists.

The chosen tenancy enforcement model must be documented and tested.

---

# 9. Master Data vs Tenant Data

The database must distinguish between authoritative master data and
tenant-owned operational data.

Conceptually:

```text
Global/Product Master
        |
        +-----------------------+
        |                       |
   Tenant A                  Tenant B
        |                       |
   Inventory A              Inventory B
   Purchases A              Purchases B
   Sales A                  Sales B
```

Do not duplicate global master data into every tenant unless there is a
specific performance or customization requirement.

---

# 10. Product Master

Product master should contain authoritative product information.

Examples:

```text
id
name
generic_name
manufacturer_id
strength
dosage_form
hsn_code
gst_rate
prescription_required
```

The exact columns will be determined by the approved domain model.

Do not put tenant-specific inventory quantities into the product master.

Do not put individual batch expiry dates into the product master.

---

# 11. Product Inventory Separation

Never store:

```text
product.quantity
```

as the sole representation of stock.

Inventory must be represented separately.

Conceptually:

```text
product
   |
   +---- inventory_batch
             |
             +---- inventory_movement
```

This allows batch-level tracking and auditability.

---

# 12. Batch Table

A batch should represent a distinct inventory lot.

Important fields may include:

```text
id
tenant_id
product_id
purchase_invoice_id
supplier_id
manufacturer_batch_number
internal_batch_identifier
expiry_date
quantity
purchase_price
mrp
selling_price
created_at
updated_at
```

The final schema must follow the approved domain model.

Do not duplicate the same business fact across multiple tables without a clear
reason.

---

# 13. Manufacturer Batch Number

Preserve the manufacturer's batch number exactly as supplied.

Do not overwrite it with an internal identifier.

If an internal identifier is required, store it separately.

The database must allow the system to answer:

> Which manufacturer batch did this stock come from?

---

# 14. Expiry

Expiry belongs to the batch/inventory context.

Do not put one expiry date on the Product Master when the same product may have
multiple batches.

Example:

```text
Product: Dolo

Batch A → expiry 2027-01-31
Batch B → expiry 2027-06-30
```

Both must remain independently queryable.

---

# 15. Quantity Storage

Quantity must use a type appropriate to the approved unit model.

If quantities are always whole units for a particular inventory unit, use an
appropriate integer/numeric representation.

If fractional quantities are required by a future approved business rule,
the schema must support them without redesigning unrelated tables.

Do not use floating-point database types for business quantities where exact
arithmetic is required.

---

# 16. Monetary Values

Never use floating-point types for monetary values.

Use:

```text
NUMERIC / DECIMAL
```

with deliberate precision and scale.

Examples:

```text
purchase_price
selling_price
mrp
discount_amount
tax_amount
total_amount
payment_amount
```

must use exact decimal arithmetic.

Do not use:

```text
FLOAT
REAL
DOUBLE PRECISION
```

for financial values.

---

# 17. Currency

Inventra initially targets India.

The primary currency is:

```text
INR
```

Do not build unnecessary multi-currency complexity into the MVP.

However, monetary calculations must not make future currency support
technically impossible.

---

# 18. Tax Values

Tax values must be stored with appropriate precision.

Do not recalculate historical tax values solely from today's configuration.

A completed transaction should preserve the tax values that were actually
used for that transaction.

---

# 19. Historical Transaction Immutability

Completed business transactions must not be casually overwritten.

Examples:

* Sales invoices
* Purchase invoices
* Returns
* Payments
* Inventory movements

If correction is required, use a controlled business operation.

The database must preserve historical truth.

---

# 20. Soft Delete

Do not automatically use soft deletion on every table.

Soft deletion should be used only where the business meaning requires
retaining a record while excluding it from normal active queries.

For historical transactions, do not use soft deletion as a substitute for
cancellation.

For example:

```text
sales_invoice
```

should not disappear because it was cancelled.

It should remain available with an appropriate lifecycle state.

---

# 21. Foreign Keys

Use foreign keys for important relational integrity.

Examples:

```text
purchase_invoice.supplier_id
purchase_invoice_item.product_id
inventory_batch.product_id
inventory_movement.batch_id
sales_invoice.customer_id
```

Do not rely solely on application code to maintain obvious relational
integrity.

---

# 22. Delete Rules

Deletion behavior must be deliberate.

Do not use cascading deletes on historical transaction relationships merely
for convenience.

For example, deleting a product must not accidentally delete:

* Historical sales
* Purchase records
* Inventory movements
* Audit records

Historical records must remain traceable.

---

# 23. Product Deletion

A product that has historical transactions generally should not be physically
deleted.

Use an appropriate active/inactive/archive state.

Historical transactions must continue referencing the product.

---

# 24. Supplier Deletion

A supplier with historical purchases generally should not be physically
deleted.

Use an appropriate active/inactive state.

Historical purchase records must remain intact.

---

# 25. Customer Deletion

Customer deletion must consider:

* Historical invoices
* Credit transactions
* Returns
* Audit history

Do not physically delete a customer if doing so destroys historical business
meaning.

---

# 26. Inventory Ledger

Inventory movement history is authoritative for understanding why stock
changed.

Movement types may include:

```text
PURCHASE_RECEIPT
SALE
SALES_RETURN
ADJUSTMENT
EXPIRY_WRITE_OFF
OTHER_APPROVED_MOVEMENT
```

Do not create arbitrary movement types without domain justification.

---

# 27. Inventory Movement

An inventory movement should preserve enough information to answer:

* What product changed?
* Which batch changed?
* How much changed?
* Why did it change?
* Which transaction caused it?
* Who performed it?
* When did it happen?
* Which tenant/store was involved?
* Which device created it, where applicable?

---

# 28. Inventory Balance vs Ledger

The system may maintain a current inventory balance for performance.

However:

```text
Current Balance
```

and:

```text
Movement History
```

serve different purposes.

A balance may be optimized for fast reads.

The movement history preserves traceability.

Do not remove movement history merely because a current balance exists.

---

# 29. Stock Adjustments

Stock adjustments must be represented explicitly.

Example:

```text
stock_adjustment
    |
    +-- product
    +-- batch
    +-- quantity_delta
    +-- reason
    +-- user
    +-- timestamp
```

The resulting inventory change should create an appropriate inventory movement.

Do not directly overwrite a balance without recording the adjustment.

---

# 30. Inventory Constraints

The database should enforce as many basic invariants as safely possible.

Examples:

```text
quantity >= 0
price >= 0
amount >= 0
```

However, do not use simplistic database constraints that prevent legitimate
business operations.

Business rules requiring transaction-level validation belong in the
application/domain layer as well.

---

# 31. Batch Expiry Constraints

Expiry dates should be valid dates.

The application should prevent obviously invalid expiry values.

Do not allow malformed or impossible dates merely because PostgreSQL accepts
the data type.

---

# 32. Unique Constraints

Use unique constraints where the business rule truly requires uniqueness.

Potential examples:

```text
manufacturer_batch_number
```

may NOT be globally unique because different products, suppliers, or tenants
may legitimately have the same manufacturer batch identifier.

Therefore uniqueness must be scoped correctly.

For example, a unique key might need:

```text
tenant_id + product_id + manufacturer_batch_number
```

depending on the final domain rule.

Never assume a field is globally unique because it "looks unique."

---

# 33. Customer Mobile Number

Customer mobile number must NOT be globally unique.

Multiple customers may legitimately share a mobile number.

Do not create:

```text
UNIQUE(mobile_number)
```

unless the domain requirements explicitly change.

---

# 34. Invoice Number

Human-visible invoice numbers must have an appropriate uniqueness scope.

The likely scope is:

```text
tenant/store
```

not necessarily the entire global system.

The final strategy must be documented before implementation.

---

# 35. Idempotency Records

Synchronization-sensitive operations may require a persistent idempotency
record.

The database should be capable of detecting:

```text
same tenant
+
same device/client
+
same transaction key
```

being submitted more than once.

An idempotency mechanism must prevent duplicate business transactions.

---

# 36. Offline Synchronization Metadata

Synchronization-relevant records may require metadata such as:

```text
client_id
device_id
created_at
updated_at
sync_status
sync_version
server_received_at
```

Do not add every field to every table automatically.

Add synchronization metadata where it is required by the final sync model.

---

# 37. Timestamps

Persistent business records should normally have timestamps such as:

```text
created_at
updated_at
```

where meaningful.

Transaction records should preserve the relevant business timestamp in
addition to server persistence timestamps where necessary.

Do not assume:

```text
created_at = transaction time
```

if offline operation allows a transaction to be created locally and
synchronized later.

---

# 38. Offline Transaction Time

For offline-created transactions, distinguish where necessary between:

```text
client_created_at
```

and:

```text
server_received_at
```

This prevents synchronization delay from corrupting business timelines.

---

# 39. User Attribution

Important business records should preserve who performed the operation.

Examples:

* Sale
* Purchase
* Return
* Adjustment
* Cancellation
* Important master-data change

Store a stable user reference.

Do not rely exclusively on free-text usernames.

---

# 40. Device Attribution

For synchronization-sensitive transactions, the system should be capable of
identifying the originating device.

Examples:

```text
desktop-counter-01
android-device-02
```

The final device identity strategy will be defined by the synchronization
architecture.

Do not use mutable device names as the only identity.

---

# 41. Audit Data

Audit information may be stored separately from the primary transaction
tables.

The audit model should support:

```text
who
what
when
tenant
device
entity
entity_id
old_value where applicable
new_value where applicable
reason where applicable
```

Do not store secrets in audit logs.

---

# 42. Indexing Philosophy

Indexes must be based on actual access patterns.

Do not create indexes on every column.

Every index has a cost:

* Storage
* Insert overhead
* Update overhead
* Maintenance cost

Create indexes where they materially improve important queries.

---

# 43. Million-Product Search

Product search is a critical performance requirement.

The database must be capable of handling more than one million products.

Minimum expectations:

* Appropriate B-tree indexes for exact identifiers
* Appropriate indexes for common filtering
* Search strategy designed around actual query patterns
* Pagination
* Projection-based queries

Do not rely on:

```text
SELECT * FROM product
```

followed by application-side filtering.

---

# 44. Product Search Index Strategy

Likely search fields include:

* Barcode
* SKU
* Product name
* Generic name
* Manufacturer
* Composition

Exact-match fields such as barcode should have highly efficient indexes.

Text search should use an appropriate PostgreSQL strategy.

Depending on requirements, this may include:

* Prefix search
* `pg_trgm`
* Full-text search
* Specialized indexes

Do not automatically introduce Elasticsearch.

First prove PostgreSQL is insufficient.

---

# 45. Billing Query Performance

Billing product lookup is a critical path.

Queries should:

* Return small result sets
* Select only required columns
* Avoid unnecessary joins
* Use indexes
* Avoid N+1 queries
* Avoid loading large entity graphs

A query returning 20 lightweight search results is preferable to loading
entire product objects.

---

# 46. Inventory Query Performance

Inventory screens may require filtering by:

* Product
* Batch
* Expiry
* Quantity
* Supplier
* Stock status

Indexes should support the most common combinations.

Do not create indexes based solely on table column order.

Use real query patterns.

---

# 47. Reporting Queries

Reports may scan large transaction datasets.

Do not optimize reports by corrupting transactional tables.

Potential strategies include:

* Appropriate indexes
* Query optimization
* Database views
* Materialized views where justified
* Precomputed aggregates later if required

Do not introduce a separate analytics database in the MVP without a real
requirement.

---

# 48. Pagination at Database Level

Pagination must happen in the database.

Do not retrieve millions of rows and paginate in Java.

Bad:

```text
Database → 1,000,000 rows
Java → first 20
```

Good:

```text
Database → 20 rows
Java → 20 rows
```

---

# 49. Query Projections

Use projections/DTO queries for read-heavy endpoints where appropriate.

Example:

```text
ProductSearchResult
```

rather than loading:

```text
Product
  + Manufacturer
  + Category
  + Supplier
  + Inventory
  + ...
```

when the UI only needs a handful of fields.

---

# 50. N+1 Query Prevention

Be particularly careful with:

* Product lists
* Purchase lists
* Invoice lists
* Inventory lists
* Customer history
* Reports

Do not allow one query per row.

Measure SQL generated by Hibernate during development/testing.

---

# 51. Transactions

Database transactions must correspond to business operations.

Examples:

```text
Complete Sale
Complete Purchase
Process Return
Create Adjustment
```

must maintain atomicity.

Do not split one business operation into multiple independently committed
database states unless the architecture explicitly requires it.

---

# 52. Locking and Concurrency

Inventory is concurrency-sensitive.

Example:

```text
Desktop sells final Dolo strip
        +
Mobile sells final Dolo strip
```

The system must not allow both operations to incorrectly consume the same
stock.

The final implementation should use appropriate concurrency control such as:

* Optimistic locking
* Pessimistic locking
* Atomic update strategies

depending on the operation.

Do not assume a simple read-then-write is safe.

---

# 53. Optimistic Locking

Optimistic locking should be considered for mutable records where concurrent
updates are possible.

Examples:

* Inventory balance
* Product configuration
* Store settings

The exact usage must be determined by the domain and access patterns.

---

# 54. Database-Level Atomicity

Where possible, critical operations should be protected by database
atomicity.

For example:

```text
Check stock
+
Reserve/decrement stock
```

must not have a race window that allows two concurrent transactions to both
believe the same quantity is available.

---

# 55. Flyway

All schema changes must be implemented through Flyway migrations.

Do not manually modify production databases.

Do not rely on Hibernate automatic schema generation for production.

Avoid:

```text
spring.jpa.hibernate.ddl-auto=create
```

in production.

Use Flyway as the schema authority.

---

# 56. Migration Naming

Use a consistent Flyway naming strategy.

Example:

```text
V1__create_tenant.sql
V2__create_product.sql
V3__create_supplier.sql
V4__create_purchase.sql
```

Exact numbering may differ.

Once a migration has been applied to a shared/production environment, do not
rewrite it.

Create a new migration.

---

# 57. Migration Safety

Every migration must be reviewed for:

* Existing data
* Foreign keys
* Indexes
* Constraints
* Locking behavior
* Runtime duration
* Backward compatibility
* Rollout order

Do not casually perform destructive operations.

---

# 58. Large Table Migrations

Tables such as:

* Product
* Sales invoice
* Sales invoice item
* Inventory movement
* Audit log

may eventually contain millions of rows.

Migrations affecting large tables must consider:

* Lock duration
* Index creation time
* Table rewrites
* Production traffic
* Backfill strategy

Do not assume a migration that works on an empty database is safe on a
production database.

---

# 59. Seed Data

Seed/reference data must be clearly distinguished from business data.

Examples:

* System roles
* Permission definitions
* Static reference values

Do not seed fake pharmacy transactions into production.

Do not hardcode tenant business data into schema migrations.

---

# 60. Development Data

Development/test data should be generated through controlled seed scripts,
fixtures, or test factories.

Do not rely on production-like data being permanently stored inside migration
files.

---

# 61. Database Constraints vs Application Rules

Use database constraints for fundamental structural invariants.

Examples:

```text
NOT NULL
FOREIGN KEY
UNIQUE
CHECK
```

Use application/domain logic for complex business rules.

Example:

```text
Return quantity cannot exceed eligible sold quantity.
```

This may require multiple records and belongs primarily in the domain/service
layer, with transaction protection.

---

# 62. JSON Columns

PostgreSQL JSON/JSONB may be used when appropriate.

Good candidates may include:

* Flexible metadata
* Audit snapshots
* External integration payloads
* Device/sync metadata where appropriate

Do not put core relational business data into JSON merely to avoid designing
tables.

Do not create:

```text
data JSONB
```

as a replacement for a properly modeled domain.

---

# 63. Enum Strategy

Database enum types should be used deliberately.

For business states that may evolve frequently, a controlled VARCHAR/string
representation may be easier to migrate.

The choice must be consistent within each domain.

Do not create PostgreSQL enums everywhere without considering migration cost.

---

# 64. Nullability

Prefer `NOT NULL` when a field is genuinely mandatory.

Avoid making everything nullable.

Nullability should communicate business meaning.

If a value is required for a valid record, enforce it.

---

# 65. Audit and History

Do not destroy historical information merely to simplify the current schema.

If a product's selling price changes, historical invoices must retain the
price actually charged.

If a supplier's name changes, historical purchase records must remain
meaningful.

If an inventory adjustment occurs, the adjustment must remain traceable.

---

# 66. Database and API Separation

Database schema must not dictate API design directly.

For example:

```text
purchase_invoice
purchase_invoice_item
```

does not automatically mean the API must expose those exact structures.

The API should represent business operations.

---

# 67. Database and Domain Separation

JPA entities are persistence models.

They are not automatically the domain model and are not API DTOs.

Avoid coupling:

```text
Database schema
    =
JPA entity
    =
API request
    =
API response
```

These layers may overlap in simple cases, but the architecture must not depend
on them being identical.

---

# 68. Repository Queries

Repositories must contain efficient persistence/query logic.

Avoid putting business workflows into repositories.

Bad:

```text
repository.completeSale(...)
```

unless the operation is specifically a persistence-level atomic operation
and the architecture explicitly approves it.

Business workflows belong above the repository.

---

# 69. Query Safety

Never construct SQL using untrusted string concatenation.

Use:

* Parameterized queries
* Spring Data query parameters
* Criteria/query APIs
* Safe native SQL where justified

Do not expose raw SQL query parameters through APIs.

---

# 70. Database Security

Never store:

* Plain-text passwords
* Authentication tokens
* Secrets
* API credentials

in ordinary business tables unless the specific security architecture
requires secure secret storage.

Sensitive values must use appropriate security mechanisms.

---

# 71. Backups and Recovery

The production database must eventually have:

* Automated backups
* Recovery strategy
* Restore testing
* Retention policy

The application architecture should not assume backups exist merely because
PostgreSQL supports them.

Backup/recovery is part of production readiness.

---

# 72. Database Monitoring

Production database monitoring should track:

* Query latency
* Slow queries
* Connection pool usage
* Lock contention
* Database size
* Index usage
* Error rates
* Transaction failures

Do not optimize blindly.

Measure first.

---

# 73. AI Database Implementation Rules

Before creating or modifying a database table:

1. Identify the business concept.
2. Identify ownership/tenant scope.
3. Identify lifecycle.
4. Identify relationships.
5. Identify invariants.
6. Identify indexes.
7. Identify historical/audit requirements.
8. Identify synchronization requirements.
9. Identify migration impact.
10. Check existing schema.
11. Check existing migrations.
12. Avoid duplicating existing concepts.
13. Create/update Flyway migration.
14. Update JPA mapping.
15. Update repository/query code.
16. Add tests where relevant.

Do not create tables simply because a UI field exists.

---

# 74. AI Migration Rules

Before writing a migration:

1. Inspect existing migrations.
2. Determine the next migration version.
3. Never edit an already-applied migration.
4. Check foreign-key ordering.
5. Check indexes.
6. Check constraints.
7. Consider existing data.
8. Consider production locking.
9. Consider rollback/recovery implications.
10. Validate the migration against a realistic database.

---

# 75. AI Query Optimization Rules

When a query is slow:

1. Reproduce the query.
2. Inspect generated SQL.
3. Measure execution time.
4. Inspect the query plan.
5. Check indexes.
6. Check joins.
7. Check returned columns.
8. Check pagination.
9. Check N+1 behavior.
10. Optimize the query.
11. Re-measure.

Do not immediately add Redis or Elasticsearch.

---

# 76. Million-Product Requirement

Inventra must be designed to support product catalogs exceeding:

```text
1,000,000 products
```

without making billing search unusable.

The database design must therefore support:

* Efficient product lookup
* Barcode lookup
* SKU lookup
* Text search
* Pagination
* Filtering
* Lightweight projections
* Appropriate indexing

The exact search implementation may evolve.

The requirement itself does not.

---

# 77. Critical Query Categories

Treat these as performance-critical:

### Product search

```text
Search by barcode
Search by SKU
Search by name
Search by composition
```

### Billing

```text
Find product
Find sellable batches
Check stock
Allocate inventory
```

### Inventory

```text
Current stock
Near expiry
Low stock
Batch lookup
```

### Customer

```text
Customer search
Credit balance
Purchase history
```

### Reports

```text
Sales
Purchases
Returns
Profit
Credit
Inventory
```

---

# 78. No Premature Distributed Database

Do not introduce:

* MongoDB
* Elasticsearch
* Cassandra
* DynamoDB
* Separate analytics database

unless a concrete requirement justifies it.

PostgreSQL should be the default transactional database.

---

# 79. No Premature Caching

Caching may be introduced later.

Do not cache mutable business truth blindly.

Especially avoid caching:

* Inventory quantities
* Payment state
* Invoice completion state

without a clear consistency strategy.

---

# 80. No Direct Database Access From Clients

Web, Desktop, and Android clients must never connect directly to the
PostgreSQL cloud database.

They communicate through the application/API layer.

Offline clients may have local databases, but those databases are internal
client persistence mechanisms.

---

# 81. Local Database

Desktop and Android may use local databases for offline operation.

The local database must:

* Store only required local data
* Preserve pending transactions
* Support synchronization
* Prevent duplicate submissions
* Preserve local transaction history as required
* Avoid exposing raw database operations to users

The exact local database technology will be finalized separately.

---

# 82. Cloud Synchronization

Cloud synchronization must not require copying the entire local database.

Synchronize business changes.

Conceptually:

```text
Local transaction
      ↓
Pending sync record
      ↓
Cloud API
      ↓
Acknowledgement
      ↓
Mark synchronized
```

---

# 83. Sync Database Design

Synchronization records should support:

* Unique client transaction ID
* Device identity
* Tenant identity
* Created timestamp
* Sync state
* Retry information where necessary
* Server acknowledgement
* Conflict information where necessary

Do not store sensitive payloads indefinitely without a retention strategy.

---

# 84. Data Integrity Priority

When optimizing storage, never sacrifice:

* Inventory correctness
* Transaction history
* Auditability
* Synchronization safety
* Tenant isolation

Storage savings are secondary to business correctness.

---

# 85. Database Design Principle

The database should make incorrect business behavior difficult.

Good schema design should prevent or reduce:

```text
Invalid foreign keys
Negative quantities where prohibited
Duplicate transaction identifiers
Cross-tenant relationships
Missing required data
Orphaned historical records
```

The application should then enforce the more complex business invariants.

---

# 86. Final Principle

Inventra's PostgreSQL database is not merely storage.

It is the persistent foundation for:

```text
Products
   ↓
Purchases
   ↓
Batches
   ↓
Inventory
   ↓
Billing
   ↓
Returns
   ↓
Adjustments
   ↓
Reports
```

The database must preserve the history and correctness of those relationships.

> Optimize reads aggressively where needed, but never optimize away the
> information required to explain why the current business state exists.

