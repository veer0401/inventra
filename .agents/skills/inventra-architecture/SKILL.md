---
name: inventra-architecture
description: >
  Defines the mandatory architecture, technology boundaries, deployment model,
  layering, modularity, multi-tenancy, offline capability, synchronization
  principles, and engineering constraints for the Inventra Pharmacy ERP.
  Use this skill whenever creating, modifying, reviewing, or refactoring
  Inventra backend architecture, modules, APIs, persistence, synchronization,
  or cross-platform application behavior.
---

# Inventra Architecture Skill

## 1. Purpose

Inventra is a multi-platform Pharmacy ERP designed primarily for independent
pharmacies and medical stores.

The system must support:

- Desktop application
- Web application
- Android application

The same business system must be usable across all supported platforms.

The product must support normal operation without requiring a continuous
internet connection for day-to-day pharmacy operations on supported offline
clients.

The complexity required to achieve this must remain invisible to the end user.

The user should experience:

> "Inventra works normally. Internet is not required for billing and
> day-to-day operations."

The architecture must therefore prioritize:

1. Correctness
2. Data integrity
3. Auditability
4. Offline capability
5. Synchronization reliability
6. Security
7. Maintainability
8. Performance
9. Extensibility

Do not optimize for architectural novelty.

Optimize for a reliable pharmacy ERP.

---

# 2. Mandatory Technology Stack

## Backend

The backend is Java-based.

Required stack:

- Java 21+
- Spring Boot 4.x
- Spring Framework 7.x
- Spring Security
- Spring Data JPA
- Hibernate
- PostgreSQL
- Flyway
- Maven
- OpenAPI
- Bean Validation
- MapStruct where appropriate

Do not introduce another backend framework unless explicitly approved.

Do not replace Spring Boot with:

- Node.js
- .NET
- Django
- Laravel
- Quarkus

unless an explicit architectural decision is made later.

---

# 3. Frontend Platform Architecture

Inventra consists of three client platforms.

## 3.1 Web

Technology:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- React Hook Form
- Zod
- React Router
- Lucide React

The web application is primarily cloud-connected.

---

## 3.2 Desktop

Technology:

- React
- TypeScript
- Tauri

The desktop application must provide local operation.

The desktop client must be capable of:

- Billing
- Purchases
- Inventory
- Returns
- Customers
- Suppliers
- Reports
- Other approved day-to-day operations

without requiring continuous internet access.

The desktop application must have local persistence.

---

## 3.3 Android

Technology:

- React Native
- TypeScript

The Android application must also support local persistence and offline
operation for approved workflows.

Mobile must not be treated only as a dashboard.

Billing and other operational workflows must be supported where the product
requirements permit them.

---

# 4. One Product, Multiple Clients

The three clients are different interfaces to the same business system.

Conceptually:

```text
                    Inventra
                       |
        +--------------+--------------+
        |              |              |
       Web          Desktop         Android
        |              |              |
        +--------------+--------------+
                       |
                  Business API
                       |
                Spring Boot Core
                       |
                  PostgreSQL
````

Do not create separate business rules for:

* Web
* Desktop
* Android

Business rules belong to the backend/domain/application layer.

Client applications should primarily:

* Collect input
* Validate basic input
* Display state
* Invoke application APIs
* Handle local persistence where required
* Handle synchronization state

They must not independently implement critical pharmacy business rules.

---

# 5. Architecture Style

Inventra uses a modular layered architecture.

Preferred structure:

```text
Interface / Presentation
        ↓
Application
        ↓
Domain
        ↓
Infrastructure
```

The exact package structure may be adapted to the selected module structure,
but the dependency direction must remain controlled.

---

# 6. Dependency Direction

The architecture must prevent infrastructure concerns from leaking into
business logic.

Preferred dependency direction:

```text
Controller
   ↓
Application Service
   ↓
Domain
   ↑
Infrastructure
```

Infrastructure implements interfaces required by the application/domain.

Avoid:

```text
Controller
   ↓
Repository
```

for business operations.

Controllers must not contain business logic.

Repositories must not contain business workflows.

Entities must not be used as API response models.

---

# 7. Module-Based Architecture

Inventra must be organized by business capability rather than one enormous
technical package.

Preferred conceptual modules include:

```text
identity
tenant
store
user
product
category
manufacturer
unit
supplier
customer
purchase
inventory
billing
sales-return
adjustment
report
notification
synchronization
audit
```

The exact module list may evolve.

Adding a new module must not require rewriting unrelated modules.

---

# 8. Pharmacy Business Domains

The most important domains are:

## Product

Represents the product/master medicine definition.

Product master data is authoritative and must not be casually overwritten by
individual tenants.

Examples:

* Product name
* Generic/composition
* Manufacturer
* Strength
* Dosage form
* HSN
* GST information where applicable
* Prescription requirement
* Other approved master attributes

---

## Supplier

Suppliers are tenant-owned business entities.

A product may have multiple suppliers.

Supplier-specific purchasing information must not overwrite global product
master truth.

---

## Purchase

A purchase invoice represents stock received from one supplier.

One purchase invoice:

* Belongs to one tenant/store
* Belongs to one supplier
* Can contain multiple medicines/products
* Creates or updates inventory batches
* Must be auditable

---

## Inventory

Inventory is batch-aware.

Important concepts include:

* Product
* Batch
* Expiry
* Quantity
* Purchase price
* MRP
* Selling price
* Inventory movement
* Stock adjustment
* Audit history

Do not treat inventory as simply:

```text
product.quantity
```

Inventory must preserve movement history.

---

## Billing

A sale can contain:

* Multiple medicines/products
* Multiple batches
* Multiple quantities
* Multiple payment methods
* Product-level discounts
* Bill-level discount

One invoice may consume multiple inventory batches.

Batch allocation must follow the approved inventory policy.

---

# 9. Batch Rules

Batch numbers are system-generated.

Users should not manually create arbitrary batch numbers during normal
purchase receiving.

The generated batch identifier must be:

* Unique
* Traceable
* Human-readable where practical
* Associated with supplier/purchase context
* Stable after creation

Do not change an existing batch identifier casually.

---

# 10. Product Master vs Tenant Data

The product master represents authoritative master information.

Tenant-specific values must be stored separately.

For example:

```text
Product Master
    |
    +-- Product Name
    +-- Composition
    +-- Manufacturer
    +-- MRP / authoritative master information
    +-- HSN
    +-- GST
    |
    +-----------------------------+
                                  |
                        Tenant Inventory
                                  |
                         +--------+--------+
                         |                 |
                    Purchase Price   Selling Price
                         |                 |
                      Batch A           Batch B
```

A tenant must not modify authoritative global product information merely
because its local selling price or purchasing price changes.

Tenant-specific selling prices belong to tenant/store/inventory configuration
as defined by the domain model.

---

# 11. Multi-Tenancy

Inventra is a multi-tenant application.

Tenant isolation is mandatory.

Every tenant-owned business record must be associated with the correct tenant
context either directly or through a clearly defined ownership relationship.

Examples:

* Customers
* Suppliers
* Purchases
* Inventory
* Bills
* Returns
* Adjustments
* Reports
* Users
* Store settings

A request authenticated for Tenant A must never retrieve or mutate Tenant B
data.

Never rely solely on frontend filtering for tenant isolation.

Tenant boundaries must be enforced server-side.

---

# 12. Tenant Context

Every authenticated request must have an unambiguous tenant context.

The backend must derive tenant identity from trusted authentication/security
context.

Do not trust arbitrary:

```text
tenantId
```

sent by an untrusted client as the sole authorization mechanism.

If a tenant identifier is accepted from a request, it must be validated against
the authenticated user's authorized tenant context.

---

# 13. Authentication and Authorization

Authentication uses Spring Security.

Authorization must be explicit.

The system must distinguish between:

* Authentication
* Tenant authorization
* Role authorization
* Resource ownership

Do not assume:

```text
authenticated = authorized
```

Every protected business operation must verify that the current user is
allowed to perform it.

---

# 14. Business Transactions

Business-critical operations must be transactional.

Examples:

## Completing a Sale

Conceptually:

```text
Validate invoice
    ↓
Validate inventory
    ↓
Allocate batches
    ↓
Create invoice
    ↓
Create payment records
    ↓
Create inventory movements
    ↓
Update inventory state
    ↓
Create audit information
    ↓
Commit
```

A partial sale must never leave the system in an invalid state.

---

## Completing a Purchase

Conceptually:

```text
Validate purchase
    ↓
Create purchase
    ↓
Generate batches
    ↓
Create inventory
    ↓
Create inventory movements
    ↓
Commit
```

Use proper transaction boundaries.

Do not create a transaction boundary simply because a method contains
multiple lines of code.

Define transactions around business operations.

---

# 15. Inventory Is Ledger-Driven

Inventory changes must be auditable.

Do not silently mutate stock quantities without recording why the quantity
changed.

Important inventory events include:

* Purchase receipt
* Sale
* Sales return
* Purchase cancellation where supported
* Stock adjustment
* Expiry/write-off where supported
* Other approved inventory movements

Every movement should be attributable to:

* Product
* Batch where applicable
* Quantity
* Movement type
* Source transaction
* User
* Device where applicable
* Timestamp
* Tenant/store

---

# 16. Adjustments

Inventory adjustments are the official mechanism for correcting physical
stock differences.

Do not create hidden stock mutations.

If an operator discovers:

```text
System = 20
Physical = 18
```

the correction should be represented as an adjustment.

The adjustment must be auditable.

Do not allow random direct quantity editing simply to "fix the number."

---

# 17. Billing Cancellation vs Sales Return

These are different business concepts.

## Invoice Cancellation

Used when the invoice itself was created incorrectly or the transaction
needs to be cancelled according to business rules.

## Sales Return

Used when a customer returns previously sold products.

Returns must be represented independently because they are meaningful for:

* Inventory
* Audit
* Analytics
* Customer history

Never implement a sales return merely by deleting the original invoice.

---

# 18. Draft Billing

Billing must support drafts/temporary state where appropriate.

Reason:

A billing session can be interrupted by:

* Application crash
* Power loss
* Accidental close
* Device restart

A partially entered bill should not necessarily disappear.

Draft data must be distinguishable from completed invoices.

A draft must never be treated as a completed sale.

---

# 19. Payment Architecture

An invoice may contain multiple payment methods.

Examples:

* Cash
* Card
* UPI
* Other supported methods

Payment records must be represented separately from the invoice total.

The system must be able to calculate:

```text
Invoice Total
        -
Discounts
        =
Amount Due
```

and reconcile the payment allocations against the final payable amount.

---

# 20. Discounts

Discounts may exist at:

* Product level
* Invoice level

The system must preserve sufficient information to understand the final
selling amount.

Do not destroy auditability by silently overwriting historical prices.

Historical transactions must remain immutable after completion except through
approved correction mechanisms such as cancellation, return, or adjustment.

---

# 21. Customer Model

Customers may be:

* Named customers
* Anonymous customers
* Credit customers

Anonymous billing must be supported.

Duplicate mobile numbers may exist when the business rules allow them.

If duplicate mobile numbers are used for identifiable customers, the system
must use the customer's name and other available identity information to
distinguish them.

Do not force unnecessary customer data for ordinary cash sales.

---

# 22. Credit Customers

Credit customers are a first-class business capability.

The system should be able to show:

* Outstanding credit
* Credit transactions
* Payments
* Remaining balance
* Customer history

Credit calculations must be based on transactional records.

Do not maintain a manually editable "credit amount" without supporting
transactions.

---

# 23. Prescription-Required Products

The system should support prescription-required product flags.

During billing:

```text
Prescription Required
        ↓
Warning
        ↓
Cashier decides whether the transaction can proceed
```

Do not unnecessarily hard-block normal billing unless the approved business
or legal requirement explicitly requires it.

The warning must not silently disappear from audit-relevant workflows.

---

# 24. Search and Performance

Product search is a critical workflow.

The system may eventually contain more than one million product records.

Product lookup must therefore be designed for high performance.

Requirements:

* Proper database indexes
* Pagination
* Search-specific queries
* Avoid loading the entire product table
* Avoid N+1 queries
* Avoid unnecessary entity graphs
* Use projections/DTO queries where appropriate
* Use database-supported search strategies
* Keep billing search latency low

Never implement:

```text
SELECT * FROM products
```

and filter the result in application memory.

---

# 25. API Design

All clients communicate through documented APIs.

API behavior must be:

* Consistent
* Versionable
* Validated
* Secure
* Observable
* Idempotent where appropriate

Do not expose JPA entities directly through REST.

Use request and response DTOs.

---

# 26. Error Handling

Use standardized API error responses.

Errors should be:

* Machine-readable
* Human-understandable
* Consistent
* Safe

Never expose:

* Stack traces
* SQL statements
* Database credentials
* Internal implementation details

to clients.

---

# 27. Offline Architecture

Offline operation is a product requirement.

However, offline complexity must remain internal.

Users should not need to understand:

* Local databases
* Synchronization queues
* Event sourcing
* Conflict resolution
* Replication

The product should simply continue operating.

---

# 28. Local Persistence

Desktop and Android clients require local persistence for supported offline
workflows.

Local persistence must be treated as an implementation concern.

The architecture must distinguish:

```text
Local state
```

from:

```text
Synchronized cloud state
```

Do not assume local and cloud state are always identical at every instant.

---

# 29. Synchronization

Synchronization must be:

* Automatic
* Retryable
* Idempotent
* Auditable
* Resilient

Normal operation should attempt synchronization automatically.

Recommended triggers:

1. Immediately after a completed transaction.
2. Periodically for pending changes.
3. Manually through a Sync Now action.

Synchronization must never unnecessarily block billing.

If synchronization fails:

```text
Transaction remains safely stored locally.
        ↓
Retry later.
```

Do not delete local pending data merely because synchronization failed.

---

# 30. Sync Identity

Offline-created records must have globally unique identifiers.

Prefer UUID/ULID-style identifiers for synchronization-sensitive entities.

Do not depend exclusively on sequential numeric database IDs for identifying
offline-created transactions.

Every synchronization-relevant record should be attributable to:

* Tenant/store
* Device
* User
* Creation time
* Unique transaction identifier

---

# 31. Synchronization Is Not Table Copying

Do not design synchronization as:

```text
Copy entire local table
        ↓
Overwrite cloud table
```

Instead, synchronize meaningful changes/transactions.

Examples:

```text
SALE_COMPLETED
PURCHASE_COMPLETED
RETURN_COMPLETED
STOCK_ADJUSTED
CUSTOMER_CREATED
CUSTOMER_UPDATED
```

The exact event model may evolve.

The principle remains:

> Synchronize business changes, not blind table snapshots.

---

# 32. Conflict Handling

Offline operation means conflicting changes are theoretically possible.

The system must detect conflicts rather than silently overwriting data.

Examples:

* Concurrent inventory changes
* Duplicate business operations
* Stale master data
* Repeated synchronization attempts

Conflict resolution must preserve:

* Audit history
* Original transactions
* User/device attribution

Never silently delete one user's transaction to resolve a conflict.

---

# 33. Idempotency

Synchronization endpoints must be idempotent where required.

If the same transaction is submitted twice because of a network retry:

```text
Request 1 → processed
Request 2 → retry
```

the second request must not create a duplicate business transaction.

Use an appropriate idempotency key or immutable transaction identifier.

This is mandatory for:

* Sales synchronization
* Purchase synchronization
* Returns
* Payments
* Other externally retried operations

---

# 34. Auditability

Important business operations must be auditable.

Audit information should capture, where appropriate:

* Who performed the operation
* What happened
* When it happened
* Which tenant/store
* Which device
* Which business record
* Previous value where relevant
* New value where relevant
* Reason where required

Do not make historical transactions freely editable.

Use controlled business operations.

---

# 35. Reports

Reports should derive from transactional data.

Do not create independent manually maintained report values.

Examples:

* Sales
* Purchases
* Profit
* Inventory
* Near expiry
* Low stock
* Credit outstanding
* Returns

Filtering and presets should be supported where defined by the product
requirements.

---

# 36. Scheduling and Background Processing

Schedulers/background jobs may be used for:

* Synchronization retries
* Cleanup
* Notifications
* Report generation where appropriate
* Maintenance operations
* Periodic consistency checks

Do not introduce Spring Batch merely because it exists.

Use Spring Batch only when the workload genuinely requires batch processing.

Do not use Kafka merely because Inventra has events.

Use Kafka only when scale and operational requirements justify it.

For the initial product, prefer simpler mechanisms unless a concrete
requirement demands distributed infrastructure.

---

# 37. Infrastructure Principle

Do not require customers to configure:

* Local servers
* Mini PCs
* LAN servers
* Docker
* Kubernetes
* PostgreSQL manually
* Spring Boot manually

The product must be installable as a normal application.

Infrastructure complexity belongs to the product, not the pharmacy owner.

---

# 38. Security Rules

Never:

* Store passwords in plain text.
* Trust client-provided tenant IDs without authorization checks.
* Expose database entities.
* Log passwords.
* Log authentication tokens.
* Return stack traces to clients.
* Disable authorization for convenience.
* Use insecure default credentials.

Security must be considered for every new endpoint.

---

# 39. Performance Rules

Before optimizing, measure.

However, the following are mandatory design considerations:

* Database indexing
* Pagination
* Query projections
* Efficient joins
* Avoid N+1 queries
* Connection pooling
* Transaction boundaries
* Product search performance
* Inventory query performance

Do not prematurely introduce Redis, Elasticsearch, Kafka, or other
infrastructure without evidence that PostgreSQL and proper indexing are
insufficient.

---

# 40. Testing

Critical business logic must have automated tests.

Priority:

1. Domain/business rules
2. Application services
3. Repository/query behavior
4. API integration
5. Security
6. Synchronization
7. End-to-end workflows

Billing and inventory must receive particularly strong test coverage.

---

# 41. Code Quality

All implementation must prioritize:

* Readability
* Explicit business rules
* Small cohesive classes
* Clear naming
* Testability
* Maintainability

Avoid:

* God classes
* God services
* Massive controllers
* Generic "Utils" classes containing unrelated behavior
* Static global state
* Hidden side effects
* Copy-pasted business rules

---

# 42. AI Coding Rules

When modifying Inventra:

1. Read this skill before making architectural changes.
2. Inspect existing code before creating new code.
3. Reuse existing abstractions.
4. Do not introduce a new pattern without justification.
5. Do not rewrite unrelated modules.
6. Do not silently change database behavior.
7. Do not silently change API contracts.
8. Do not remove auditability.
9. Do not bypass tenant isolation.
10. Do not disable security to make development easier.
11. Do not invent business rules.
12. Ask for clarification when a business rule is genuinely undefined.
13. Prefer the simplest architecture that satisfies the requirement.
14. Keep the implementation consistent across modules.
15. Run relevant tests after modifications.

---

# 43. Change Management

Architecture is considered frozen unless a real technical or business blocker
is discovered.

Before changing an architectural decision:

1. Identify the problem.
2. Explain why the current architecture cannot solve it.
3. Propose alternatives.
4. Explain trade-offs.
5. Obtain approval.
6. Document the decision as an ADR.
7. Only then modify the architecture.

Do not redesign the system simply because another technology appears more
interesting.

---

# 44. What Inventra Is NOT

Do not introduce requirements merely because other ERPs contain them.

Inventra is not initially intended to become:

* A general accounting suite
* A CRM platform
* A hospital management system
* An e-commerce platform
* A logistics platform
* An AI platform
* A social application

The system should remain focused on pharmacy operations.

---

# 45. Core Product Principle

The most important architectural principle is:

> Complex technology should produce simple user experience.

The pharmacy owner should not care whether Inventra uses:

* Spring Boot
* PostgreSQL
* React
* Tauri
* React Native
* synchronization queues
* local databases
* background workers

They should experience:

> Fast billing, reliable inventory, simple purchasing, useful reports, and
> continued operation even when the internet is unavailable.

That is the standard against which architectural decisions should be evaluated.
