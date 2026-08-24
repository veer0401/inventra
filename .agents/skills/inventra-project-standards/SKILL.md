---
name: inventra-project-standards
description: >
  Defines Inventra's coding standards, project structure, package/module
  organization, naming conventions, dependency rules, DTO/entity separation,
  Git practices, documentation standards, configuration conventions, code
  quality rules, and AI implementation behavior. Use this skill whenever
  creating, modifying, reviewing, refactoring, or organizing Inventra code.
---

# Inventra Project Standards

## 1. Purpose

This document defines the project-wide engineering standards for Inventra.

The goal is to keep the codebase:

- Predictable
- Maintainable
- Testable
- Secure
- Modular
- Easy for multiple developers and AI agents to understand
- Resistant to accidental architectural drift

The project must not become a collection of individually reasonable files
that form an unreasonable system.

---

# 2. Source of Truth

Project-level rules have priority over personal coding preferences.

Before implementing a feature, the AI/developer should check:

```text
Relevant Inventra skill
        ↓
Existing architecture
        ↓
Existing module conventions
        ↓
Feature requirements
        ↓
Implementation
````

Do not introduce a new pattern merely because another pattern is personally
preferred.

---

# 3. Architecture First

Before writing code, identify:

* Module
* Domain
* Use case
* API
* Persistence requirements
* Security requirements
* Transaction requirements
* Offline/sync implications
* Tests required

Do not begin by creating random controllers/entities/repositories.

---

# 4. Backend Architecture

Inventra backend should follow the architecture defined by the architecture
skills.

The preferred organization is feature/domain-oriented rather than a giant
global folder structure.

Avoid:

```text
controller/
service/
repository/
entity/
dto/
```

containing hundreds of unrelated classes.

Prefer feature boundaries where practical.

Example:

```text
billing/
    domain/
    application/
    infrastructure/
    api/
```

---

# 5. Layer Responsibilities

The major backend responsibilities are:

```text
API
 ↓
Application
 ↓
Domain
 ↓
Infrastructure
```

The exact package structure may adapt to the selected architecture.

---

# 6. API Layer

The API layer is responsible for:

* HTTP requests
* Request DTOs
* Response DTOs
* Validation
* HTTP status mapping
* Authentication context
* Authorization integration

The API layer must not contain complex business logic.

Bad:

```java
@PostMapping
public InvoiceResponse complete(...) {
    // 200 lines of inventory/payment logic
}
```

The controller should delegate.

---

# 7. Application Layer

The application layer orchestrates use cases.

Examples:

```text
CreateInvoice
CompleteInvoice
CancelInvoice
CreatePurchase
ReceivePurchase
AdjustInventory
CreateCustomer
```

Application services coordinate:

* Domain operations
* Repositories
* Transactions
* External services
* Authorization checks where appropriate

---

# 8. Domain Layer

The domain layer owns business rules.

Examples:

```text
Invoice
InvoiceLine
Purchase
PurchaseLine
Inventory
Batch
Payment
Customer
Supplier
```

Domain logic must not depend unnecessarily on:

* HTTP
* Spring MVC
* Frontend
* PostgreSQL-specific APIs

---

# 9. Infrastructure Layer

Infrastructure contains implementations such as:

* JPA repositories
* Database adapters
* External API clients
* Messaging
* File storage
* Synchronization infrastructure

Infrastructure details must not leak unnecessarily into the domain.

---

# 10. Entity vs DTO

Never automatically expose JPA entities through REST APIs.

Use DTOs.

Example:

```text
HTTP Request
    ↓
Request DTO
    ↓
Application
    ↓
Domain
    ↓
Persistence
```

and:

```text
Persistence
    ↓
Domain
    ↓
Response DTO
    ↓
HTTP
```

---

# 11. Request DTOs

Request DTOs represent what the API accepts.

Example:

```java
CreateInvoiceRequest
```

should contain only fields the client is allowed to provide.

Do not expose internal fields such as:

```text
tenantId
createdBy
createdAt
status
```

unless explicitly part of the API contract.

---

# 12. Response DTOs

Response DTOs represent what the client is allowed to see.

Do not expose:

* Password hashes
* Internal security fields
* Database internals
* Unnecessary relationships
* Internal implementation details

---

# 13. Entity Exposure

Never do:

```java
return invoiceRepository.findById(id);
```

directly from a controller.

Map the entity/domain result to an appropriate response model.

---

# 14. Naming Convention

Use clear domain terminology.

Prefer:

```text
Invoice
Purchase
InventoryMovement
StockAdjustment
Customer
Supplier
Product
Batch
Payment
```

Avoid ambiguous names such as:

```text
Data
Info
Record
Object
Manager
Helper
Util
Processor
```

unless the name has a clear domain meaning.

---

# 15. Class Naming

Classes should represent their responsibility.

Good:

```text
CompleteInvoiceUseCase
InvoiceRepository
InvoiceController
InvoiceMapper
InventoryService
```

Bad:

```text
CommonService
MainService
DataManager
Helper
Utils
```

---

# 16. Method Naming

Methods should describe behavior.

Prefer:

```text
completeInvoice()
cancelInvoice()
allocateBatch()
recordPayment()
adjustStock()
```

Avoid:

```text
process()
handle()
doStuff()
executeThing()
```

unless the abstraction genuinely requires it.

---

# 17. Boolean Naming

Boolean methods/fields should communicate state.

Prefer:

```text
isActive()
isExpired()
hasPermission()
canCancel()
```

Avoid:

```text
activeFlag()
statusCheck()
check()
```

---

# 18. Package Naming

Use lowercase package names.

Example:

```text
com.inventra.billing
com.inventra.inventory
com.inventra.security
```

Never use:

```text
com.inventra.Billing
```

---

# 19. Feature Naming

Use the same terminology across:

```text
Database
Backend
API
Frontend
Documentation
Tests
```

If the domain calls something:

```text
InventoryMovement
```

do not randomly call it:

```text
StockHistory
InventoryLog
MovementRecord
```

in another layer.

---

# 20. Package Structure

A possible backend structure:

```text
src/main/java/com/inventra/

    common/

    security/

    billing/
        api/
        application/
        domain/
        infrastructure/

    inventory/
        api/
        application/
        domain/
        infrastructure/

    purchasing/
        api/
        application/
        domain/
        infrastructure/

    customer/
        api/
        application/
        domain/
        infrastructure/

    supplier/
        api/
        application/
        domain/
        infrastructure/
```

The exact structure may evolve.

Do not create empty architectural folders just to satisfy this example.

---

# 21. Common Package

The `common` area must remain small.

Use it only for truly shared infrastructure/concepts.

Do not dump random classes into:

```text
common/
```

because no better home was chosen.

---

# 22. Utility Classes

Avoid generic utility classes.

Bad:

```text
StringUtils
DateUtils
InvoiceUtils
CommonUtils
```

if the behavior actually belongs to a domain or infrastructure component.

---

# 23. Constants

Avoid giant global constants files.

Prefer constants close to the domain that owns them.

Bad:

```text
GlobalConstants.java
```

containing hundreds of unrelated values.

---

# 24. Enums

Enums should represent controlled domain states.

Examples:

```text
InvoiceStatus
PaymentMethod
AccountStatus
DeviceStatus
SyncStatus
```

Do not use raw strings everywhere for domain states.

---

# 25. Status Values

Status transitions should be explicit.

Do not allow arbitrary strings such as:

```text
status = "done"
status = "completed"
status = "complete"
```

for the same business concept.

Use the defined domain state model.

---

# 26. Null Handling

Avoid unnecessary null-heavy designs.

Use appropriate Java null-safety patterns.

Do not blindly replace every nullable value with an Optional in every class.

Use `Optional` primarily for APIs where it communicates absence meaningfully.

---

# 27. Collections

Do not return mutable internal collections directly.

Prefer controlled access or immutable views where appropriate.

---

# 28. Immutability

Use immutable objects where practical.

Especially consider immutability for:

* Value objects
* Commands
* Request DTOs
* Response DTOs

---

# 29. Value Objects

Use value objects when a domain concept has meaningful behavior/validation.

Examples:

```text
Money
Barcode
EmailAddress
Quantity
BatchNumber
```

Do not create value objects for every trivial string.

Use them when they improve correctness.

---

# 30. Money

Financial calculations must not rely on careless floating-point arithmetic.

Use appropriate monetary representations.

The backend is authoritative for financial calculations.

---

# 31. Quantity

Inventory quantities should use an appropriate numeric representation.

Do not use arbitrary floating-point behavior where precision matters.

---

# 32. Date and Time

Use explicit temporal types appropriate to the meaning.

Distinguish between:

```text
Instant
LocalDate
LocalDateTime
```

Do not treat all dates as the same type.

Example:

```text
Batch expiry
```

may be a date-only concept.

A transaction timestamp is an instant/time-based concept.

---

# 33. Time Zone

Do not hardcode a timezone throughout the application.

Centralize timezone configuration and distinguish:

```text
Business date
Transaction timestamp
User-local display time
```

---

# 34. Database Naming

Use consistent database naming conventions.

Prefer predictable snake_case where that is the project convention.

Example:

```text
invoice_id
created_at
tenant_id
product_id
```

Do not mix:

```text
invoiceId
invoice_id
InvoiceID
```

randomly.

---

# 35. Database Schema

Database schema design must follow the database skill.

Do not modify tables casually from application code.

Schema changes belong in migrations.

---

# 36. Migrations

All production schema changes must use Flyway migrations.

Never manually change production schema and assume the codebase will somehow
know what happened.

---

# 37. Migration Naming

Follow a consistent Flyway naming convention.

Example:

```text
V1__initial_schema.sql
V2__add_inventory_tables.sql
V3__add_invoice_status.sql
```

Do not create ambiguous names such as:

```text
update.sql
new.sql
fix.sql
```

---

# 38. Migration Rule

Once a migration has been applied to a shared/production environment:

Do not rewrite its contents to change history.

Create a new migration.

---

# 39. Repository Naming

Repositories should describe the aggregate/domain they operate on.

Examples:

```text
InvoiceRepository
ProductRepository
BatchRepository
InventoryMovementRepository
```

Avoid:

```text
DatabaseManager
GenericRepository
EverythingRepository
```

---

# 40. Repository Responsibility

Repositories handle persistence access.

They should not become business logic containers.

Bad:

```text
invoiceRepository.completeInvoice()
```

if completion requires complex business rules.

Prefer:

```text
CompleteInvoiceUseCase
    ↓
InvoiceRepository
```

---

# 41. Service Naming

Use services where they represent a meaningful application/infrastructure
responsibility.

Do not create:

```text
InvoiceService
```

merely because every controller "needs a service."

The service should represent a clear use case or responsibility.

---

# 42. Transaction Boundaries

Transactions should be defined around business operations.

Example:

```text
Complete Invoice
    |
    +-- invoice
    +-- payment
    +-- inventory movement
    +-- stock update
```

These operations must be coordinated according to the transaction design.

---

# 43. Transaction Annotation

Use Spring transaction management appropriately.

Do not place `@Transactional` randomly on every method.

The transaction boundary should represent a meaningful unit of work.

---

# 44. Read vs Write

Where useful, distinguish:

```text
Commands
Queries
```

Write operations change state.

Read operations retrieve state.

Do not force CQRS complexity everywhere.

---

# 45. Query Optimization

Optimize important queries based on evidence.

Do not introduce:

```text
Redis
Elasticsearch
Kafka
CQRS
Event sourcing
```

merely because they are popular technologies.

Use them when the product requires them.

---

# 46. Dependency Rules

Dependencies should flow inward according to the architecture.

Domain should not depend on:

```text
Controller
HTTP
Database implementation
Frontend
```

---

# 47. Spring Dependency Usage

Use Spring where it provides value.

Do not annotate every class automatically.

Examples of appropriate Spring usage:

```text
@Service
@Repository
@RestController
@Configuration
@Component
```

should represent actual framework responsibilities.

---

# 48. Dependency Injection

Prefer constructor injection.

Example:

```java
public InvoiceService(
    InvoiceRepository invoiceRepository,
    PaymentService paymentService
) {
    ...
}
```

Avoid field injection:

```java
@Autowired
private InvoiceRepository repository;
```

---

# 49. Interfaces

Do not create interfaces solely because "clean architecture requires one."

Create interfaces where they provide:

* Abstraction
* Replaceability
* Domain boundary
* External dependency isolation
* Testing value

---

# 50. Generic Interfaces

Avoid meaningless interfaces such as:

```text
IService
IRepository
IManager
```

without a real abstraction.

---

# 51. Exception Handling

Use meaningful domain/application exceptions.

Examples:

```text
InsufficientStockException
InvoiceNotFoundException
InvoiceAlreadyCompletedException
PaymentMismatchException
UnauthorizedOperationException
```

Do not throw generic:

```text
RuntimeException("Something went wrong")
```

for every failure.

---

# 52. Exception Mapping

Centralize API exception mapping.

Use a consistent error response format.

Do not repeat:

```java
try {
   ...
} catch (...) {
   return ResponseEntity...
}
```

in every controller.

---

# 53. Error Codes

Use stable machine-readable error codes.

Example:

```text
INVOICE_NOT_FOUND
INVOICE_ALREADY_COMPLETED
INSUFFICIENT_STOCK
PAYMENT_MISMATCH
UNAUTHORIZED_OPERATION
SYNC_CONFLICT
```

The frontend should rely on codes rather than parsing human-readable
messages.

---

# 54. Logging

Follow the observability skill.

Log:

* Important business events
* Errors
* Operational failures
* Synchronization failures

Do not log:

* Passwords
* Tokens
* Secrets

---

# 55. Logging Context

Where appropriate, include:

```text
requestId
tenantId
userId
deviceId
transactionId
```

without exposing unnecessary sensitive information.

---

# 56. Comments

Write comments to explain:

```text
Why
```

not:

```text
What the code obviously does
```

Bad:

```java
// Increment quantity by one
quantity++;
```

Better:

```java
// Preserve the original purchase quantity because historical
// inventory movements must remain immutable.
```

---

# 57. Avoid Commented-Out Code

Do not keep large blocks of dead code commented out.

Git already preserves history.

Delete obsolete code.

---

# 58. TODO Comments

Use TODOs sparingly.

A TODO should identify an actual future task.

Bad:

```text
TODO: improve this
```

Better:

```text
TODO(INV-123): replace temporary local conflict resolution
```

if the project issue-tracking convention supports it.

---

# 59. Magic Numbers

Avoid unexplained magic numbers.

Bad:

```java
if (retryCount > 7)
```

Prefer a named configuration value when appropriate.

---

# 60. Configuration

Environment-specific configuration should not be hardcoded.

Examples:

```text
Database URL
JWT configuration
Cloud endpoint
Sync interval
External service URL
```

must use appropriate configuration mechanisms.

---

# 61. Secrets

Never commit:

```text
Passwords
JWT secrets
API keys
Private keys
Database credentials
```

to Git.

---

# 62. Environment Files

Do not commit real production secrets in:

```text
.env
application-prod.yml
local secret files
```

Use safe examples/templates where needed.

---

# 63. Configuration Naming

Use consistent configuration names.

Example:

```text
inventra.sync.interval
inventra.security...
inventra.storage...
```

Do not scatter arbitrary property naming conventions.

---

# 64. Profiles

Use Spring profiles for environment-specific behavior where appropriate.

Typical environments:

```text
dev
test
staging
prod
```

Do not create dozens of profiles without a real need.

---

# 65. Production Defaults

Production configuration should favor:

* Secure settings
* Controlled logging
* HTTPS
* Appropriate timeouts
* Safe error responses

---

# 66. Dependency Management

Every dependency should have a reason.

Before adding a dependency ask:

1. Does the project already provide this capability?
2. Does Spring Boot already solve it?
3. Is the dependency actively maintained?
4. Does it increase security risk?
5. Does it significantly increase application complexity?
6. Is it actually needed?

---

# 67. Avoid Dependency Duplication

Do not introduce two libraries solving the same problem unless there is a
clear reason.

Example:

```text
Three JSON libraries
```

is generally unnecessary.

---

# 68. Spring Boot Version

The project targets the agreed Spring Boot version.

Do not silently downgrade or switch framework versions because a dependency
is inconvenient.

If a version change becomes necessary, explicitly evaluate the impact.

---

# 69. Java Version

Use the project's defined Java version consistently.

Do not introduce language features unsupported by the configured Java runtime.

---

# 70. Build Tool

Use the project's chosen build system consistently.

Do not mix Maven and Gradle casually.

---

# 71. Multi-Module Maven

If the project uses multi-module Maven, modules must have clear ownership.

Example:

```text
inventra/
├── inventra-api/
├── inventra-domain/
├── inventra-application/
├── inventra-infrastructure/
└── inventra-bootstrap/
```

The final structure depends on the architecture decision.

Do not create modules simply to increase the module count.

---

# 72. Module Boundaries

A module should represent a meaningful boundary.

Good:

```text
billing
inventory
sync
security
```

Bad:

```text
string-utils
date-utils
misc
```

unless there is a compelling architectural reason.

---

# 73. Circular Dependencies

Avoid circular dependencies.

Example:

```text
Billing → Inventory
Inventory → Billing
```

If a circular dependency appears, reconsider the boundary.

---

# 74. Cross-Module Communication

Prefer explicit application/domain interfaces.

Do not reach into another module's internal implementation.

Bad:

```text
billing
  ↓
inventory.internal.SomeRepositoryImpl
```

Prefer:

```text
billing
  ↓
inventory application/domain interface
```

---

# 75. Package Visibility

Keep implementation classes package-private where practical.

Do not expose everything as `public` merely because it compiles.

---

# 76. API Stability

Public APIs should be intentionally designed.

Before changing an API:

* Identify consumers.
* Check Web.
* Check Desktop.
* Check Android.
* Check tests.
* Check documentation.

---

# 77. Breaking Changes

Breaking API changes require:

```text
Impact analysis
+
Migration plan
+
Client updates
+
Testing
```

Do not casually rename or remove API fields.

---

# 78. Git Branches

Use a consistent branch strategy.

Example:

```text
main
develop
feature/...
fix/...
```

The exact workflow may be adapted to the team's Git process.

---

# 79. Commit Messages

Commit messages should explain the change.

Prefer:

```text
feat(billing): add invoice completion workflow
fix(inventory): prevent duplicate stock deduction
feat(sync): add idempotent transaction processing
```

Avoid:

```text
changes
update
fix
done
final
final2
```

---

# 80. Small Commits

Prefer focused commits.

A commit should ideally represent one logical change.

Avoid combining:

```text
Authentication
+
Inventory
+
UI redesign
+
Database migration
```

into one giant commit unless there is a strong reason.

---

# 81. Git History

Do not rewrite shared history casually.

Avoid force-pushing branches other developers depend on unless coordinated.

---

# 82. Pull Requests

A meaningful PR should describe:

* What changed
* Why
* Important architectural decisions
* Database changes
* API changes
* Security implications
* Testing performed

---

# 83. Code Review

Review should verify:

```text
Correctness
Security
Architecture
Testing
Performance
Maintainability
```

Not merely formatting.

---

# 84. Formatting

Use automated formatting/linting where available.

Do not spend code-review time arguing about whitespace.

Let tooling handle trivial formatting.

---

# 85. Static Analysis

Use appropriate static analysis tools.

Potential areas:

* Bugs
* Security
* Complexity
* Dead code
* Dependency vulnerabilities

Do not ignore serious warnings without justification.

---

# 86. Test Naming

Tests should describe behavior.

Prefer:

```text
shouldRejectInvoiceWhenStockIsInsufficient()
```

over:

```text
test1()
```

---

# 87. Test Organization

Keep tests close to their relevant source structure.

Example:

```text
src/main/java/...
src/test/java/...
```

Feature boundaries should remain understandable.

---

# 88. Test Data Builders

Use builders/factories for complex test data.

Avoid repeating huge object construction blocks across dozens of tests.

---

# 89. Test Fixtures

Test fixtures should be readable.

A test should make important assumptions obvious.

---

# 90. Integration Test Naming

Clearly distinguish:

```text
Unit
Integration
API
E2E
Security
Concurrency
```

where the project test organization benefits from it.

---

# 91. API Documentation

Important APIs should be documented.

OpenAPI should describe:

* Endpoint
* Request
* Response
* Errors
* Authentication
* Parameters

Do not document behavior that the implementation does not actually provide.

---

# 92. Architecture Documentation

Important architectural decisions should be recorded.

Examples:

```text
Why PostgreSQL?
Why local database?
Why sync queue?
Why chosen frontend architecture?
Why transaction strategy?
```

Use ADRs where appropriate.

---

# 93. Architecture Decision Records

For significant irreversible decisions, use ADRs.

Example:

```text
docs/adr/
    001-backend-architecture.md
    002-offline-sync.md
    003-authentication.md
```

An ADR should explain:

```text
Context
Decision
Consequences
```

---

# 94. Documentation Rule

Documentation should describe the current system.

Do not leave documentation claiming:

```text
Kafka synchronization
```

when the implementation uses:

```text
Database-backed sync queue
```

---

# 95. README

The root README should eventually explain:

* Project purpose
* Architecture
* Technology stack
* Local setup
* Running backend
* Running frontend
* Running tests
* Environment configuration

---

# 96. Setup Documentation

A new developer should be able to understand:

```text
Clone
 ↓
Install dependencies
 ↓
Configure environment
 ↓
Run database
 ↓
Run migrations
 ↓
Start backend
 ↓
Start frontend
```

without asking another developer for hidden steps.

---

# 97. AI-Generated Code

AI-generated code must follow existing project standards.

Do not accept AI output simply because:

```text
It compiles.
```

Review:

* Architecture
* Security
* Domain correctness
* Tests
* Naming
* Dependencies
* Performance

---

# 98. AI Must Read Skills

Before implementing a feature, the AI should identify relevant skills.

For example, billing may require:

```text
inventra-domain-rules
inventra-api-rules
inventra-database-rules
inventra-inventory-billing
inventra-security-auth
inventra-testing-quality
inventra-observability-operations
```

Do not implement from generic knowledge when project-specific rules exist.

---

# 99. AI Must Not Invent Requirements

If a requirement is unclear:

Do not silently invent a business rule.

Instead:

1. Check existing project documentation.
2. Check relevant skills.
3. Check existing implementation.
4. Ask for clarification if the decision materially affects behavior.

---

# 100. AI Must Not Rewrite Architecture Casually

Do not replace:

```text
Layered architecture
```

with:

```text
Hexagonal architecture
```

or:

```text
Microservices
```

or:

```text
Event sourcing
```

because it appears more sophisticated.

Architectural changes require explicit approval.

---

# 101. AI Must Prefer Existing Patterns

If the project already has:

```text
InvoiceController
InvoiceMapper
InvoiceRepository
```

then a new feature should follow the same pattern unless there is a justified
reason to change it.

---

# 102. AI Must Avoid Overengineering

Do not introduce:

* Microservices
* Kafka
* Redis
* Elasticsearch
* GraphQL
* Event sourcing
* CQRS
* Kubernetes

merely because they are technically interesting.

Inventra's MVP should remain operationally manageable.

---

# 103. AI Must Consider the Product Tier

Inventra targets smaller pharmacies and shops.

Implementation decisions should prioritize:

```text
Reliability
Simplicity
Low operational complexity
Low infrastructure cost
Fast workflows
Offline capability
Security
```

over unnecessary enterprise complexity.

---

# 104. AI Must Preserve Offline Capability

A refactor must not accidentally remove:

* Local persistence
* Transaction queue
* Sync state
* Idempotency
* Offline billing

unless explicitly approved.

---

# 105. AI Must Preserve Historical Data

Never casually modify historical transactions because a master record changed.

Examples:

```text
Product price changed
Supplier changed
Customer details changed
Product name changed
```

Historical transaction records must remain consistent with their original
business state.

---

# 106. AI Must Consider Concurrency

Before modifying:

```text
Inventory
Billing
Payments
Synchronization
```

consider concurrent operations.

Do not assume only one device is active.

---

# 107. AI Must Consider Multi-Device Operation

Inventra may have:

```text
Desktop
Android
Web
```

active simultaneously.

Changes must not assume:

```text
Only one client exists.
```

---

# 108. AI Must Consider Multi-Counter Operation

A pharmacy may have multiple billing counters.

Therefore:

```text
Counter A
Counter B
```

may modify the same inventory.

Concurrency and synchronization must be considered.

---

# 109. AI Must Not Use Client State as Authority

Never use:

```text
Frontend state
Local database
Cached role
Cached tenant
```

as the final authority for cloud authorization.

---

# 110. AI Must Not Expose Secrets

Before committing code, inspect for:

```text
Passwords
Tokens
API keys
Private keys
Database credentials
```

---

# 111. AI Must Add Tests With Features

When adding a meaningful feature:

```text
Implementation
+
Tests
```

should be created together.

Do not postpone all testing until the end of the project.

---

# 112. AI Must Update Documentation

If implementation changes:

* API
* Database
* Architecture
* Synchronization
* Security

update the relevant documentation.

---

# 113. AI Refactoring Rule

Refactoring should preserve behavior unless the purpose is explicitly to
change behavior.

Before refactoring:

```text
Existing behavior
```

must be understood.

After refactoring:

```text
Regression tests
```

must pass.

---

# 114. Small Refactoring

Prefer incremental refactoring.

Example:

```text
Large messy service
 ↓
Extract one responsibility
 ↓
Tests
 ↓
Next responsibility
```

Do not rewrite the entire module because one class is messy.

---

# 115. Large Refactoring

Large architectural changes require:

```text
Current architecture
+
Problem statement
+
Proposed architecture
+
Migration strategy
+
Compatibility plan
+
Approval
```

before implementation.

---

# 116. Dependency Updates

Dependency updates should be deliberate.

Before upgrading:

* Review breaking changes.
* Run tests.
* Check security advisories.
* Check compatibility.
* Verify production behavior.

---

# 117. Security Updates

Security vulnerabilities should receive priority over cosmetic refactoring.

Do not delay critical security updates because they are inconvenient.

---

# 118. Database Performance

Do not optimize the database by blindly adding indexes.

For every significant index ask:

* Which query benefits?
* How frequently is it used?
* What write overhead does it add?
* Does it duplicate another index?

---

# 119. API Performance

Do not optimize API performance through premature caching.

First identify:

```text
Slow query
Slow external dependency
Excessive serialization
N+1
Network latency
```

Then address the actual bottleneck.

---

# 120. Cache Rules

Caching must have:

```text
Source of truth
Expiration/invalidation strategy
Consistency expectations
Failure behavior
```

If these cannot be defined, do not add the cache.

---

# 121. Redis

Redis may be used when a real requirement exists.

Potential uses:

* Distributed caching
* Rate limiting
* Short-lived state
* Appropriate synchronization infrastructure

Do not add Redis merely because the Spring skill repository includes it.

---

# 122. Messaging

Messaging infrastructure should only be introduced when required.

Do not introduce Kafka/RabbitMQ merely for theoretical scalability.

---

# 123. External Services

External service integrations must have:

* Timeouts
* Error handling
* Retry policy where appropriate
* Observability
* Security
* Test strategy

---

# 124. HTTP Clients

Use the project's chosen Spring HTTP client approach consistently.

Do not introduce multiple HTTP client technologies without justification.

---

# 125. Resilience

External dependency failures must not unnecessarily crash unrelated
business functionality.

Use appropriate:

* Timeout
* Retry
* Circuit breaking where justified

Do not retry non-idempotent operations blindly.

---

# 126. Retry Rule

Before adding retry logic ask:

```text
Is the operation idempotent?
```

If not, implement idempotency before automatic retry.

---

# 127. API Idempotency

Critical operations should support stable idempotency semantics where
required.

Especially:

```text
Invoice completion
Payment recording
Synchronization
```

---

# 128. Database Transactions

Never assume API request success means database transaction success.

The application must define transaction boundaries explicitly.

---

# 129. Validation Location

Validate at the appropriate layers:

```text
Frontend:
UX validation

API:
Request validation

Application:
Use-case validation

Domain:
Business invariants

Database:
Structural integrity
```

Do not depend on only one layer.

---

# 130. Security Validation

Authorization belongs to the backend.

Do not rely on:

```text
Frontend hidden button
```

as a security control.

---

# 131. Database Constraints

Use database constraints to enforce structural invariants where appropriate.

Examples:

```text
NOT NULL
UNIQUE
FOREIGN KEY
CHECK
```

The application should still validate business behavior.

---

# 132. Soft Delete

Do not introduce soft delete automatically for every entity.

Use it when:

* Historical references matter
* Business requires restoration
* Auditability requires retention

---

# 133. Hard Delete

Hard deletion should be restricted where historical business data could be
affected.

Do not allow deletion of critical financial records merely to simplify UI.

---

# 134. API Deletion

Prefer explicit domain operations for important business state changes.

For example:

```text
POST /invoices/{id}/cancel
```

may be more appropriate than:

```text
DELETE /invoices/{id}
```

when cancellation must preserve history.

---

# 135. Database Deletion

Database deletion must respect:

* Foreign keys
* Historical records
* Audit requirements
* Tenant isolation

---

# 136. File Naming

Use predictable file/class names.

Avoid:

```text
InvoiceServiceNew.java
InvoiceServiceFinal.java
InvoiceServiceV2.java
```

Use versioning/architecture appropriately instead.

---

# 137. No Duplicate Implementations

Do not leave:

```text
OldBillingService
NewBillingService
BillingService2
```

after a migration unless there is an intentional transition.

Delete obsolete implementations after migration.

---

# 138. Temporary Code

Temporary code must be clearly identified.

Do not allow temporary shortcuts to become permanent architecture.

---

# 139. Feature Completion

A feature is complete only when:

```text
Code
+
Tests
+
API
+
Database
+
Security
+
Observability
+
Documentation
```

are aligned where applicable.

---

# 140. Review Checklist

Before considering a change complete:

### Architecture

* [ ] Correct module.
* [ ] Correct layer.
* [ ] No unnecessary dependency.
* [ ] No circular dependency.

### Code

* [ ] Naming is clear.
* [ ] Responsibilities are focused.
* [ ] No unnecessary utility classes.
* [ ] No dead code.
* [ ] No accidental duplication.

### Database

* [ ] Migration created if required.
* [ ] Constraints reviewed.
* [ ] Query behavior reviewed.

### API

* [ ] DTOs used.
* [ ] Validation implemented.
* [ ] Error contract followed.
* [ ] API compatibility reviewed.

### Security

* [ ] Authentication considered.
* [ ] Authorization enforced.
* [ ] Tenant isolation preserved.
* [ ] No secrets committed.
* [ ] Sensitive data not exposed.

### Testing

* [ ] Unit tests.
* [ ] Integration tests where required.
* [ ] Security tests.
* [ ] Regression tests.

### Operations

* [ ] Logging appropriate.
* [ ] Important failures observable.
* [ ] Metrics/tracing considered.

### Documentation

* [ ] Relevant documentation updated.
* [ ] ADR added if architectural decision is significant.

---

# 141. Final Engineering Principle

Inventra should be built as a product, not as a collection of code-generation
experiments.

Prefer:

```text
Simple
Predictable
Testable
Secure
Maintainable
```

over:

```text
Clever
Over-engineered
Distributed unnecessarily
Framework-heavy
Difficult to operate
```

---

# 142. Final AI Rule

Before writing code, ask:

```text
1. Where does this belong?
2. Which business rule does it implement?
3. Which existing pattern should it follow?
4. Which skills govern it?
5. Which API contract does it affect?
6. Which database changes are required?
7. What security implications exist?
8. What happens offline?
9. What happens with multiple devices?
10. How will we test it?
11. How will we diagnose it in production?
```

If these questions cannot be answered, implementation should not proceed
blindly.

> The best architecture is the simplest architecture that correctly handles
> the product's real constraints.

