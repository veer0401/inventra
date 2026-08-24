---
name: inventra-api-rules
description: >
  Defines the mandatory API design, request/response, validation, pagination,
  filtering, authentication, authorization, error handling, idempotency,
  versioning, synchronization, and compatibility rules for the Inventra
  Pharmacy ERP backend. Use this skill whenever creating, modifying, reviewing,
  testing, or documenting Inventra REST APIs.
---

# Inventra API Rules

## 1. Purpose

Inventra has multiple clients:

- Web
- Desktop
- Android

All clients must communicate with a consistent backend API.

The API is a contract between:

```text
Web
Desktop
Android
   ↓
Inventra API
   ↓
Application / Domain
   ↓
Persistence
````

The API must therefore prioritize:

1. Correctness
2. Consistency
3. Security
4. Backward compatibility
5. Predictability
6. Performance
7. Offline/synchronization support
8. Developer usability

---

# 2. API Style

Inventra uses RESTful HTTP APIs.

Prefer resource-oriented endpoints.

Examples:

```text
GET    /api/v1/products
GET    /api/v1/products/{id}
POST   /api/v1/products
PATCH  /api/v1/products/{id}

GET    /api/v1/customers
POST   /api/v1/customers

GET    /api/v1/purchases
POST   /api/v1/purchases

GET    /api/v1/invoices
POST   /api/v1/invoices
```

Do not create RPC-style endpoints unnecessarily.

Avoid patterns such as:

```text
POST /api/createProduct
POST /api/doPurchase
POST /api/getProducts
```

Use HTTP semantics appropriately.

---

# 3. API Versioning

The initial public API version is:

```text
/api/v1
```

Example:

```text
/api/v1/products
/api/v1/purchases
/api/v1/invoices
```

Do not introduce `/v2` merely because an implementation changes internally.

A new API version should only be introduced when there is a genuine
compatibility-breaking change.

---

# 4. API Contract Is Shared Infrastructure

The API contract must be treated as a first-class artifact.

The contract should define:

* Request structure
* Response structure
* Required fields
* Optional fields
* Validation rules
* Error responses
* Pagination
* Filtering
* Authentication requirements

OpenAPI should be used to document the contract.

Do not allow each frontend to invent its own interpretation of an API.

---

# 5. Request DTOs

Never accept JPA entities directly from API requests.

Use request DTOs.

Example:

```text
CreateProductRequest
UpdateProductRequest
CreateCustomerRequest
CreatePurchaseRequest
CompleteInvoiceRequest
CreateAdjustmentRequest
```

Request DTOs should represent the operation being performed.

Do not create one enormous DTO containing every possible field for every
operation.

---

# 6. Response DTOs

Never expose JPA entities directly from controllers.

Use response DTOs.

Examples:

```text
ProductResponse
CustomerResponse
PurchaseResponse
InvoiceResponse
InventoryBatchResponse
AdjustmentResponse
```

Responses should contain only information required by the client/use case.

Avoid exposing:

* Internal database fields
* Password hashes
* Internal security data
* Hibernate implementation details
* Unnecessary relationships
* Sensitive infrastructure information

---

# 7. API Layer Responsibilities

Controllers should:

* Receive HTTP requests.
* Validate request structure.
* Resolve authenticated context.
* Call application services.
* Return appropriate HTTP responses.

Controllers must NOT:

* Implement inventory algorithms.
* Calculate complex business rules.
* Directly manipulate repositories.
* Perform database transactions manually.
* Implement tenant isolation through ad-hoc filters.

Business logic belongs in the application/domain layers.

---

# 8. HTTP Methods

Use HTTP methods consistently.

| Operation           | Method                                      |
| ------------------- | ------------------------------------------- |
| List                | GET                                         |
| Get single resource | GET                                         |
| Create              | POST                                        |
| Partial update      | PATCH                                       |
| Full replacement    | PUT where genuinely appropriate             |
| Delete              | DELETE where deletion is actually permitted |

Do not use DELETE for business cancellation.

For example:

```text
DELETE /invoices/{id}
```

must not be used to cancel a completed invoice.

Use a business operation appropriate to the domain.

---

# 9. HTTP Status Codes

Use meaningful HTTP status codes.

Common responses:

| Status | Meaning                                                |
| ------ | ------------------------------------------------------ |
| 200    | Successful operation                                   |
| 201    | Resource created                                       |
| 202    | Accepted for asynchronous processing where appropriate |
| 204    | Successful operation with no response body             |
| 400    | Invalid request                                        |
| 401    | Unauthenticated                                        |
| 403    | Authenticated but unauthorized                         |
| 404    | Resource not found                                     |
| 409    | Business/state conflict                                |
| 422    | Semantically invalid request where appropriate         |
| 429    | Rate limited                                           |
| 500    | Unexpected server error                                |

Do not return `200 OK` for every failure.

---

# 10. Error Response Standard

Use RFC 9457 Problem Details.

Errors should have a consistent structure.

Conceptually:

```json
{
  "type": "https://api.inventra.example/problems/...",
  "title": "Inventory Conflict",
  "status": 409,
  "detail": "Insufficient stock for the requested quantity.",
  "instance": "/api/v1/invoices/...",
  "code": "INSUFFICIENT_STOCK"
}
```

The exact fields may evolve, but the API must remain consistent.

Never return raw stack traces.

Never expose SQL errors directly.

Never expose internal exception messages if they reveal sensitive
implementation details.

---

# 11. Business Error Codes

Important business failures should have stable machine-readable codes.

Examples:

```text
PRODUCT_NOT_FOUND
INSUFFICIENT_STOCK
BATCH_NOT_FOUND
BATCH_EXPIRED
INVOICE_NOT_FOUND
INVOICE_ALREADY_CANCELLED
RETURN_QUANTITY_EXCEEDED
PAYMENT_MISMATCH
TENANT_ACCESS_DENIED
DUPLICATE_TRANSACTION
INVALID_STATE
```

Clients should be able to respond to stable error codes rather than parsing
human-readable error messages.

---

# 12. Validation

Validate requests at the API boundary.

Examples:

* Required fields
* String length
* Number ranges
* Date validity
* Quantity positivity
* Email format where applicable
* Mobile format where applicable

However:

> API validation is not the same thing as business validation.

Example:

```text
quantity > 0
```

is structural validation.

But:

```text
requested quantity <= available inventory
```

is business validation.

Both must exist at the appropriate layers.

---

# 13. Authentication

Protected APIs must require authentication.

Authentication should be handled through Spring Security.

Do not allow controllers to implement their own token parsing.

Do not trust:

```text
userId
tenantId
role
```

provided by a client as proof of identity or authorization.

Those values must come from trusted security context and server-side checks.

---

# 14. Tenant Isolation

Tenant isolation is mandatory.

Every tenant-owned API operation must operate within the authenticated
tenant context.

Example:

```text
Tenant A
GET /api/v1/inventory
        ↓
Only Tenant A inventory
```

A malicious request such as:

```text
GET /api/v1/inventory?tenantId=B
```

must not expose Tenant B data to a Tenant A user.

Never rely on the frontend to enforce tenant boundaries.

---

# 15. Authorization

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

Both must be enforced.

Examples:

```text
OWNER
MANAGER
CASHIER
INVENTORY_OPERATOR
```

The exact role set may evolve.

Do not hardcode authorization rules in controllers when a reusable security
policy is more appropriate.

---

# 16. Resource Ownership

Tenant membership alone may not always be sufficient.

For sensitive operations, verify that the authenticated user is permitted to
operate on the requested resource.

Example:

```text
GET /api/v1/invoices/{invoiceId}
```

must verify:

```text
invoice.tenant == authenticatedTenant
```

and any additional permission requirements.

---

# 17. Pagination

Collection APIs must not return unlimited datasets.

Use pagination for potentially large collections.

Example:

```text
GET /api/v1/products?page=0&size=25
```

The response should provide enough metadata for the client to navigate the
result set.

Conceptually:

```json
{
  "content": [],
  "page": 0,
  "size": 25,
  "totalElements": 1000000,
  "totalPages": 40000
}
```

The exact response format may be standardized later.

---

# 18. Product Search

Product search is one of the most performance-sensitive APIs in Inventra.

The product catalogue may contain more than one million products.

Never expose:

```text
GET /api/v1/products
```

as a mechanism for downloading the entire product catalogue to the billing
client.

Product search must support server-side filtering.

Example:

```text
GET /api/v1/products/search?q=dolo&page=0&size=20
```

Search should be optimized for billing.

Potential search fields:

* Product name
* Generic/composition
* Brand
* Barcode
* SKU
* Other approved identifiers

---

# 19. Product Search Response

Billing search responses should be lightweight.

Do not return the entire Product entity graph.

A billing search result may contain only:

```text
id
name
strength
dosageForm
manufacturer
mrp
sellingPrice
availableQuantity
prescriptionRequired
```

Only return fields actually required for the search experience.

---

# 20. Debouncing

The frontend may debounce search input.

Example:

```text
User types:
D
Do
Dol
Dolo

Server request:
Dolo
```

Do not require the backend to process every individual keystroke as a
separate expensive query.

However, correctness must not depend on client-side debouncing.

---

# 21. Sorting

Collection APIs should support controlled sorting where useful.

Example:

```text
?sort=name,asc
```

Do not allow arbitrary SQL fragments through query parameters.

Only expose approved sortable fields.

---

# 22. Filtering

Filtering should use explicit parameters.

Example:

```text
/api/v1/inventory?
productId=...
&expiryBefore=...
&status=LOW_STOCK
```

Do not expose raw SQL-like filters.

---

# 23. Date and Time

Use ISO-8601 formats in APIs.

Dates:

```text
2026-08-25
```

Date-times:

```text
2026-08-25T14:30:00Z
```

The backend should define timezone behavior explicitly.

Do not send ambiguous date strings such as:

```text
25/08/26
```

---

# 24. Money

Money must not be represented using floating-point types.

Do not use:

```java
double
float
```

for monetary values.

Use appropriate decimal types such as:

```java
BigDecimal
```

API representations must preserve monetary precision.

Currency should be explicit where necessary.

---

# 25. Quantity

Quantity types must match the business model.

Do not assume every quantity is an integer if the domain eventually supports
fractional units.

However, do not introduce fractional quantities everywhere without a real
business requirement.

The API contract should reflect the approved inventory unit model.

---

# 26. Product Units

The API must distinguish between:

* Product
* Unit
* Pack
* Strip
* Tablet
* Other supported units

The exact conversion model belongs to the domain.

Do not duplicate unit-conversion logic across frontend applications.

---

# 27. Purchase APIs

Purchase APIs should represent purchase transactions rather than individual
database mutations.

Preferred conceptual flow:

```text
POST /api/v1/purchases
        ↓
Purchase created/drafted
        ↓
Complete purchase
        ↓
Inventory created/updated
```

Do not expose a public API that requires the frontend to manually perform
ten database-style calls to create one purchase transaction unless there is a
specific reason.

---

# 28. Billing APIs

Billing must support a clear lifecycle.

Conceptually:

```text
DRAFT
   ↓
COMPLETED
   ↓
CANCELLED
```

Other states may be introduced if justified.

Do not allow clients to arbitrarily change lifecycle state.

Use business operations.

For example:

```text
POST /api/v1/invoices
```

may create a draft.

A dedicated completion operation may complete the invoice.

The exact endpoint structure should remain consistent across clients.

---

# 29. Invoice Completion

Invoice completion must be transactional.

The backend must validate:

* Invoice state
* Products
* Quantities
* Inventory
* Pricing
* Discounts
* Payments
* Tenant
* User permissions
* Other relevant business rules

Then perform the required business operations atomically.

---

# 30. Payment APIs

Multiple payments are supported.

A completed invoice may contain:

```text
Cash
UPI
Card
Other supported methods
```

Each payment allocation must have:

* Method
* Amount
* Relevant metadata
* Timestamp
* Invoice association

The API must validate that payment allocations reconcile with the final
invoice amount.

---

# 31. Discount APIs

Discount information must preserve enough information to understand:

* Original amount
* Discount
* Final amount

For line-level discounts:

```text
lineSubtotal
discount
finalLineAmount
```

For invoice-level discounts:

```text
invoiceSubtotal
invoiceDiscount
finalInvoiceAmount
```

Do not silently replace the original amount with the final amount.

---

# 32. Inventory APIs

Inventory APIs should expose business operations rather than raw quantity
mutation.

Avoid:

```text
PATCH /inventory/{id}
{
  "quantity": 98
}
```

for ordinary stock correction.

Prefer:

```text
POST /api/v1/inventory-adjustments
```

with:

```text
product
batch
adjustment quantity
reason
```

The backend calculates the resulting inventory state.

---

# 33. Sales Return APIs

Returns should reference the original invoice.

Conceptually:

```text
POST /api/v1/sales-returns
```

Request should identify:

* Original invoice
* Product
* Batch where applicable
* Return quantity
* Reason where required

The backend must validate that the return quantity is eligible.

---

# 34. Cancellation APIs

Cancellation must be a business operation.

Do not physically delete completed invoices.

Example conceptual operation:

```text
POST /api/v1/invoices/{id}/cancel
```

The backend must:

* Validate state
* Record cancellation
* Reverse relevant business effects according to domain rules
* Preserve audit history

---

# 35. Idempotency

Operations that may be retried must support idempotency.

This is particularly important for offline synchronization.

Potentially idempotent operations include:

* Completing invoices
* Recording payments
* Creating purchases
* Creating returns
* Creating adjustments
* Synchronizing transactions

A repeated request must not create duplicate business transactions.

---

# 36. Idempotency Key

Where appropriate, clients may send:

```text
Idempotency-Key: <unique-client-generated-key>
```

The server must safely recognize previously processed requests.

Alternatively, an immutable client-generated transaction ID may be used when
that is more appropriate.

Do not blindly accept duplicate POST requests as separate business
transactions.

---

# 37. Offline Synchronization APIs

Synchronization APIs are different from ordinary interactive APIs.

They may need to support:

* Batch submission
* Idempotency
* Partial success
* Retry
* Conflict detection
* Server acknowledgements

Conceptually:

```text
POST /api/v1/sync/push
GET  /api/v1/sync/pull
```

Exact endpoint design must be finalized in the synchronization architecture.

Do not implement a synchronization API by simply replacing cloud database
tables with local tables.

---

# 38. Sync Acknowledgement

A synchronization request should provide enough information for the client
to know:

```text
Accepted
Processed
Rejected
Conflict
Retry required
```

The client must not delete local pending data until the server has safely
acknowledged the transaction.

---

# 39. API Compatibility

Never casually break an existing API.

Before changing:

* Field names
* Types
* Required/optional status
* Response structures
* Enum values
* Endpoint paths
* Error codes

check all clients and API contracts.

Breaking changes require an explicit decision.

---

# 40. Optional vs Required Fields

Do not make fields required merely because they exist in the database.

API requirements should reflect actual business requirements.

Examples:

Optional:

* Customer address
* Doctor reference
* Supplier notes

Required only where business rules require them.

---

# 41. Null Handling

The API should distinguish between:

```text
field absent
```

and:

```text
field explicitly null
```

where that distinction matters.

Do not randomly convert all missing values to empty strings.

---

# 42. API Naming

Use consistent naming.

Prefer:

```text
productId
supplierId
customerId
invoiceId
batchId
```

Avoid mixing:

```text
product_id
productID
productIdentifier
```

unless an explicit external contract requires it.

---

# 43. IDs

Use stable identifiers.

API clients must not depend on database row ordering.

Offline-created entities should use IDs suitable for synchronization.

Do not expose internal database sequencing assumptions as business logic.

---

# 44. API Responses Must Be Predictable

A client should not have to guess the shape of a response.

For example, if a collection endpoint returns:

```json
{
  "content": [],
  "page": 0,
  "size": 20
}
```

other collection endpoints should follow the same established convention unless
there is a clear reason not to.

Consistency is more important than personal preference.

---

# 45. API Documentation

Every public API must be documented through OpenAPI.

Documentation should include:

* Summary
* Description where needed
* Request parameters
* Request body
* Response
* Error responses
* Authentication requirements
* Example payloads where useful

Do not leave APIs undocumented because "the frontend knows how it works."

---

# 46. API Testing

Every important API should have tests covering:

## Happy path

```text
Valid request
    ↓
Expected response
```

## Validation

```text
Invalid request
    ↓
400/422
```

## Authentication

```text
Unauthenticated
    ↓
401
```

## Authorization

```text
Authenticated but unauthorized
    ↓
403
```

## Tenant isolation

```text
Tenant A → Tenant B resource
    ↓
Rejected
```

## Business conflict

```text
Insufficient stock
    ↓
409
```

---

# 47. API Security Testing

For every new endpoint, verify:

* Authentication
* Authorization
* Tenant isolation
* Input validation
* Resource ownership
* Sensitive field exposure
* Mass assignment risks
* ID enumeration concerns where applicable

Do not assume a route is secure merely because it is under `/api`.

---

# 48. Performance

Before adding infrastructure, optimize the API/database boundary.

For high-volume APIs:

* Use indexes
* Use pagination
* Use projections
* Avoid N+1 queries
* Avoid loading unnecessary relationships
* Avoid returning unnecessary fields
* Use appropriate caching only when justified

The first optimization target should generally be:

```text
Correct query
+
Correct index
+
Correct response size
```

Do not introduce Redis or Elasticsearch simply because the dataset is large.

---

# 49. API Logging

Log useful operational information.

Do not log:

* Passwords
* Access tokens
* Refresh tokens
* Sensitive customer information unnecessarily
* Payment secrets

Logs should help answer:

```text
What happened?
When?
For which tenant?
For which transaction?
Was it successful?
```

Use correlation/request identifiers where appropriate.

---

# 50. API Observability

Important requests should be observable through:

* Logs
* Metrics
* Traces where appropriate

Pay particular attention to:

* Billing completion
* Purchase completion
* Synchronization
* Product search
* Authentication failures
* Database errors

---

# 51. API Error Philosophy

Errors should help the client recover.

Bad:

```json
{
  "message": "Something went wrong"
}
```

Better:

```json
{
  "code": "INSUFFICIENT_STOCK",
  "title": "Insufficient Stock",
  "detail": "Requested quantity exceeds available inventory."
}
```

Do not expose internal implementation details.

---

# 52. No Frontend Business Logic Leakage

Frontend applications may perform:

* UI validation
* Formatting
* Local state management
* User experience decisions

But the backend remains authoritative for:

* Stock
* Prices used in transactions
* Discounts
* Payments
* Returns
* Permissions
* Tenant isolation
* Invoice lifecycle
* Inventory movement
* Business invariants

Never trust the frontend to enforce business truth.

---

# 53. API Contract Changes

Before changing an API:

1. Identify all consumers.
2. Identify whether the change is backward compatible.
3. Update OpenAPI.
4. Update backend.
5. Update Web.
6. Update Desktop.
7. Update Android.
8. Update tests.
9. Document the change.

Never change an API simply to make one screen easier to implement without
considering all clients.

---

# 54. AI API Implementation Rules

Before creating an API:

1. Read this skill.
2. Read `inventra-architecture`.
3. Read `inventra-domain-rules`.
4. Identify the business operation.
5. Identify the resource.
6. Identify authentication requirements.
7. Identify tenant requirements.
8. Identify authorization requirements.
9. Identify request DTO.
10. Identify response DTO.
11. Identify validation.
12. Identify error codes.
13. Identify transaction boundaries.
14. Identify idempotency requirements.
15. Update OpenAPI.
16. Write tests.
17. Verify all affected clients.

Do not generate a controller first and figure out the domain behavior later.

---

# 55. API Anti-Patterns

Do not create:

```text
GenericController
GenericService
GenericResponse
GenericRequest
```

for unrelated domains.

Do not create endpoints such as:

```text
/api/updateAnything
/api/saveData
/api/process
/api/execute
```

without a clear resource/business meaning.

Do not expose database tables directly as APIs.

Do not create one giant API endpoint that performs unrelated business
operations.

---

# 56. API Design Principle

The API should expose **business capabilities**, not database mechanics.

Bad:

```text
PATCH /inventory/123
{
  "quantity": 42
}
```

Better:

```text
POST /inventory-adjustments
{
  "batchId": "...",
  "quantity": -3,
  "reason": "PHYSICAL_COUNT"
}
```

Bad:

```text
DELETE /invoice/123
```

Better:

```text
POST /invoices/123/cancel
```

The API should make invalid business behavior difficult to express.

---

# 57. Final API Principle

Inventra's API is not simply a transport layer.

It is the controlled boundary through which Web, Desktop, Android, and
synchronization clients interact with the business domain.

Therefore:

> The API must protect business truth, tenant isolation, transaction
> integrity, auditability, and compatibility while remaining simple for
> clients to consume.

