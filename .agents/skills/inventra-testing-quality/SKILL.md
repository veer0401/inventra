---
name: inventra-testing-quality
description: >
  Defines Inventra's testing strategy, quality gates, test pyramid, domain
  tests, application tests, integration tests, API tests, database tests,
  security tests, concurrency tests, offline synchronization tests,
  contract tests, acceptance criteria, regression protection, and definition
  of done. Use this skill whenever implementing, modifying, reviewing, or
  declaring complete any Inventra feature or module.
---

# Inventra Testing & Quality Rules

## 1. Purpose

Testing is part of implementation, not a final cleanup step.

Every Inventra module must have enough automated coverage to prove:

- Business rules work.
- Invalid operations are rejected.
- Tenant boundaries are enforced.
- Database constraints work.
- APIs behave according to their contracts.
- Transactions remain atomic.
- Concurrent operations do not corrupt business state.
- Offline transactions synchronize safely.
- Authentication and authorization work.
- Existing functionality does not regress.

A feature is not complete merely because:

```text
Application starts
+
UI looks correct
````

---

# 2. Definition of Done

A feature is considered complete only when:

```text
Implementation
+
Validation
+
Automated tests
+
Integration verification
+
Security verification
+
Relevant documentation
```

are complete.

---

# 3. Test Pyramid

Inventra should generally follow:

```text
              E2E
             /   \
          API / Integration
         /           \
      Application / Database
     /                   \
         Domain / Unit
```

The majority of tests should be fast unit/domain tests.

Slower tests should validate integration and critical user workflows.

Do not attempt to test everything through browser automation.

---

# 4. Domain Tests

Domain/business rules should be tested independently of:

* HTTP
* Controllers
* PostgreSQL
* JWT
* Frontend
* External services

Example:

```text
Sale
+
Insufficient stock
    ↓
Rejected
```

This should be testable without starting the entire application.

---

# 5. Domain Test Principle

A domain test should answer:

> Does the business rule behave correctly?

It should not primarily answer:

> Did Spring MVC map this JSON correctly?

Those are different test layers.

---

# 6. Application-Service Tests

Application/service tests verify orchestration.

Examples:

```text
Complete Sale
    ↓
Validate
    ↓
Allocate batches
    ↓
Create invoice
    ↓
Create payment
    ↓
Create inventory movement
```

Test that the application layer invokes the required domain operations and
repositories correctly.

---

# 7. Integration Tests

Integration tests verify that multiple components work together.

Examples:

```text
Service
+
Repository
+
PostgreSQL
```

or:

```text
Controller
+
Security
+
Service
+
Database
```

Use integration tests for behavior that cannot be reliably proven with unit
tests.

---

# 8. Database Integration

Important database behavior must be tested against a real database engine.

Do not rely exclusively on mocked repositories for:

* Constraints
* Index behavior
* Transactions
* Locking
* Unique constraints
* Foreign keys
* Query behavior
* PostgreSQL-specific behavior

---

# 9. PostgreSQL

Inventra's production database behavior should be validated against the same
database family used in production.

If PostgreSQL is the production database:

```text
Production:
PostgreSQL

Integration tests:
PostgreSQL-compatible test environment
```

Prefer Testcontainers where appropriate.

---

# 10. Testcontainers

Testcontainers should be considered for integration tests requiring:

* PostgreSQL
* Redis where used
* Other infrastructure dependencies

Avoid fragile developer-machine assumptions such as:

```text
localhost:5432
```

with an undocumented local database.

---

# 11. Repository Tests

Repository tests should verify important persistence behavior.

Examples:

* Product search
* Batch lookup
* FEFO ordering
* Tenant filtering
* Invoice lookup
* Customer search
* Inventory queries

Do not create a test for every trivial getter/setter.

---

# 12. Tenant Isolation Tests

Every tenant-owned repository/query must be tested for isolation.

Example:

```text
Tenant A:
Invoice A

Tenant B:
Invoice B
```

A Tenant A query must never return Invoice B.

This is a mandatory security test category.

---

# 13. Cross-Tenant Test

At minimum:

```text
Authenticate as Tenant A
        ↓
Request Tenant B resource
        ↓
Rejected
```

Test both:

* Direct resource access
* Collection/search access

---

# 14. Authorization Tests

For protected operations test:

```text
Authenticated + permitted
    → success

Authenticated + not permitted
    → rejected

Unauthenticated
    → rejected
```

Do not test only the happy path.

---

# 15. Authentication Tests

Test:

* Valid credentials
* Invalid credentials
* Disabled account
* Expired access token
* Invalid token
* Refresh token
* Revoked refresh token
* Logout
* Password reset
* Password reset token expiry
* Password reset token reuse

---

# 16. Password Tests

Test that:

* Passwords are not stored in plaintext.
* Correct passwords authenticate.
* Incorrect passwords fail.
* Password changes work.
* Old credentials stop working according to policy.

Never place real production passwords in test source.

---

# 17. API Tests

Every important endpoint should have tests for:

### Success

```text
Valid request
    ↓
Expected response
```

### Validation failure

```text
Invalid request
    ↓
4xx
```

### Authentication failure

```text
No/invalid authentication
    ↓
401
```

### Authorization failure

```text
Insufficient permission
    ↓
403
```

### Resource access failure

```text
Unauthorized resource
    ↓
Rejected
```

---

# 18. API Contract Tests

API responses must conform to the defined contract.

Verify:

* Status code
* Response structure
* Required fields
* Field types
* Error format
* Pagination metadata where applicable

Do not allow frontend assumptions to silently become backend contracts.

---

# 19. Error Contract Tests

All expected API errors should use the standard Inventra error format.

Tests should verify:

```text
status
code
message
details where applicable
timestamp/request ID where applicable
```

The exact format is defined by the API rules.

---

# 20. Validation Tests

Test invalid inputs such as:

* Missing required field
* Null value
* Empty string
* Invalid quantity
* Negative quantity
* Invalid price
* Invalid date
* Invalid UUID
* Invalid enum
* Excessive length

Do not rely exclusively on frontend validation.

---

# 21. Business Rule Tests

Every important business rule needs at least one positive and one negative
test.

Example:

```text
Stock = 10

Sell 5
→ success

Sell 11
→ rejected
```

---

# 22. Inventory Tests

Minimum inventory scenarios:

* Purchase increases stock.
* Sale decreases stock.
* Return increases stock where appropriate.
* Adjustment changes stock.
* Expired batch cannot be sold according to policy.
* Inactive batch cannot be sold.
* Insufficient stock is rejected.
* Inventory movement is created.
* Current balance remains correct.

---

# 23. FEFO Tests

Example:

```text
Batch A:
Expiry = 2027-01
Stock = 10

Batch B:
Expiry = 2027-06
Stock = 10

Sale = 5
```

Expected:

```text
Batch A:
5 remaining

Batch B:
10 remaining
```

Test multi-batch allocation:

```text
Batch A = 3
Batch B = 10

Sale = 8

Expected:
Batch A = 0
Batch B = 5
```

---

# 24. Expiry Tests

Test:

```text
Expired batch
    ↓
Sale rejected
```

and:

```text
Non-expired batch
    ↓
Sale allowed
```

where the product policy allows it.

Test boundary dates carefully.

---

# 25. Batch Tests

Test:

* Multiple batches for same product.
* Different expiry dates.
* Different purchase prices.
* Different MRP.
* Different quantities.
* Batch-specific inventory.
* Batch-specific sale allocation.

---

# 26. Multi-Batch Sale Tests

Example:

```text
Requested:
15

Batch A:
10

Batch B:
20
```

Expected allocation:

```text
A = 10
B = 5
```

The invoice must remain traceable to both batches.

---

# 27. Billing Tests

Test:

* Create draft.
* Add product.
* Change quantity.
* Remove product.
* Apply discount.
* Complete invoice.
* Record payment.
* Multiple payment methods.
* Credit sale where supported.
* Cancellation.
* Return.

---

# 28. Double-Completion Test

Given:

```text
Draft invoice = D1
```

Submit completion twice.

Expected:

```text
Exactly one completed sale.
```

Not:

```text
Two invoices.
```

---

# 29. Idempotency Tests

Example:

```text
client_transaction_id = TXN-123
```

Send the same transaction twice.

Expected:

```text
One business transaction.
```

The second request must return the appropriate idempotent result.

---

# 30. Retry Test

Simulate:

```text
Server processes transaction
        ↓
Response lost
        ↓
Client retries
```

Expected:

```text
No duplicate transaction.
```

This is mandatory for offline-capable financial transactions.

---

# 31. Payment Tests

Test:

```text
Invoice = ₹1000

Cash = ₹400
UPI = ₹600
```

Expected:

```text
Payment total = ₹1000
```

Also test invalid totals.

Example:

```text
Invoice = ₹1000

Cash = ₹400
UPI = ₹500
```

Expected:

```text
Rejected
```

unless the transaction is explicitly a supported credit sale.

---

# 32. Discount Tests

Test:

```text
Product discount
```

and:

```text
Invoice-level discount
```

Verify:

```text
Subtotal
-
Discount
=
Final amount
```

after defined rounding.

---

# 33. Rounding Tests

Use values that expose rounding problems.

Example:

```text
Multiple lines
+
percentage discount
+
tax/rounding where applicable
```

Verify:

```text
Sum(lines)
=
invoice total
```

according to the defined financial calculation rules.

---

# 34. Historical Price Test

Create invoice:

```text
Product price = ₹100
```

Change Product Master:

```text
Product price = ₹90
```

Expected:

```text
Existing invoice = ₹100
```

Historical transactions must not change.

---

# 35. Cancellation Tests

Test:

```text
Completed invoice
    ↓
Cancel
```

Expected:

* Invoice remains historically visible.
* Cancellation is recorded.
* Inventory effects are correctly reversed where applicable.
* Financial effects are correctly represented.
* Audit information remains.

Also test:

```text
Already cancelled
    ↓
Cancel again
```

Expected:

```text
Rejected/idempotent according to defined contract.
```

---

# 36. Return Tests

Test:

```text
Sold = 10
Return = 3
```

Expected:

```text
Eligible remaining return = 7
```

Then:

```text
Return another 7
```

Expected:

```text
Total returned = 10
```

Then:

```text
Return 1 more
```

Expected:

```text
Rejected.
```

---

# 37. Partial Return Tests

Verify that:

```text
Original invoice
```

remains unchanged.

The return is represented separately.

Do not modify the original sold quantity to make the return appear correct.

---

# 38. Adjustment Tests

Test:

```text
Current = 100
Adjustment = -2
```

Expected:

```text
Current = 98
```

and:

```text
Inventory movement = -2
Reason retained
User retained
Timestamp retained
```

---

# 39. Adjustment Authorization

Test that unauthorized users cannot perform high-risk adjustments.

Example:

```text
Cashier
    ↓
Inventory adjustment
```

Expected:

```text
Rejected
```

if the permission matrix disallows it.

---

# 40. Transaction Atomicity Tests

Force a failure after one operation in a business transaction.

Example:

```text
Invoice creation
    ↓
Payment creation
    ↓
Intentional failure
```

Expected:

```text
No invalid partial transaction
```

The exact rollback/recovery behavior must match the transaction design.

---

# 41. Inventory Concurrency Tests

This is mandatory.

Example:

```text
Stock = 1

Request A:
Sell 1

Request B:
Sell 1

Run concurrently.
```

Expected:

```text
Only one sale consumes the final unit.
```

The second operation must be rejected or handled according to the defined
concurrency/conflict policy.

---

# 42. Concurrency Test Implementation

Use real database concurrency where possible.

Do not merely mock:

```text
quantity = 1
```

and call the service twice sequentially.

The purpose is to expose actual race conditions.

---

# 43. Lost Update Test

Test:

```text
Thread A reads stock
Thread B reads stock
Thread A writes
Thread B writes
```

The application must not silently overwrite the result.

---

# 44. Offline Tests

Offline-capable clients must test:

* Billing without internet.
* Local inventory update.
* Local transaction persistence.
* Restart recovery.
* Network reconnect.
* Queue processing.
* Retry.
* Duplicate submission.
* Pull synchronization.
* Cursor recovery.

---

# 45. Offline Restart Test

Scenario:

```text
Internet unavailable

Complete sale

Close application unexpectedly

Restart application
```

Expected:

```text
Completed local sale still exists.
```

---

# 46. Power-Loss Test

Where practical, simulate interruption during a transaction.

Expected:

```text
Either:
transaction safely committed

OR:
transaction safely absent

but never:
impossible partial state
```

---

# 47. Sync Queue Tests

Test:

```text
Pending = 3

Sync

A → success
B → retryable failure
C → success
```

Expected:

```text
A = synced
B = pending/failed
C = synced
```

Do not mark the entire queue successful because A and C succeeded.

---

# 48. Sync Cursor Tests

Test:

```text
Remote changes:
1
2
3
```

If applying change 2 fails:

```text
Cursor must not advance past 2.
```

After retry:

```text
2
3
```

must still be processed correctly.

---

# 49. Duplicate Sync Tests

Submit:

```text
TXN-123
```

multiple times.

Expected:

```text
One transaction.
```

Test both:

* Immediate duplicate
* Duplicate after application restart
* Duplicate after network timeout
* Duplicate after restoring local state

---

# 50. Cross-Device Conflict Test

Example:

```text
Cloud stock = 1

Desktop offline:
sell 1

Android offline:
sell 1

Reconnect both.
```

Expected:

```text
Both transactions preserved.
Conflict detected.
Business resolution required.
```

Do not silently delete either transaction.

---

# 51. Synchronization Security Tests

Attempt:

```text
Tenant A transaction
```

using:

```text
Tenant B authentication
```

Expected:

```text
Rejected.
```

Attempt to alter:

```text
device_id
user_id
tenant_id
```

inside the payload.

Expected:

```text
Unauthorized/tampered request rejected.
```

---

# 52. Offline Tampering Tests

Modify local data where practical.

Examples:

```text
role = OWNER
stock = 999999
sellingPrice = 1
tenantId = another tenant
```

After synchronization:

```text
Server must validate and reject unauthorized manipulation.
```

---

# 53. API Security Regression

Whenever an endpoint is added or modified, verify:

* Authentication
* Authorization
* Tenant isolation
* Validation
* Resource ownership
* Error behavior

Do not rely on a single global security test.

---

# 54. Migration Tests

Every database migration must be tested.

At minimum:

```text
Clean database
    ↓
Run all migrations
    ↓
Application starts
```

and:

```text
Previous version database
    ↓
Run migration
    ↓
Application starts
```

---

# 55. Migration Safety

Never test migrations only by deleting the database and recreating it.

Existing production data matters.

Test representative existing schemas/data.

---

# 56. Migration Rollback Philosophy

Flyway migrations are normally forward-only.

Do not rely on:

```text
ROLLBACK EVERYTHING
```

as the production migration strategy.

If a migration is wrong, create a corrective migration according to the
project migration policy.

---

# 57. API Regression Tests

When changing an existing API:

```text
Old behavior
```

must remain valid unless the change is intentionally breaking.

Breaking changes require:

* Versioning strategy
* Updated clients
* Migration plan
* Tests

---

# 58. Contract Compatibility

Web, Desktop, and Android clients may not update simultaneously.

Therefore, API changes should consider mixed client versions.

Avoid immediately removing a response field used by an older client unless the
migration strategy explicitly permits it.

---

# 59. Frontend Tests

Frontend testing should focus on:

* User interactions
* Form validation
* Permission-based UI
* API error handling
* Loading states
* Offline state
* Sync state
* Critical workflows

Do not test implementation details unnecessarily.

---

# 60. Billing UI Test

Critical billing flow:

```text
Search
→ Select
→ Quantity
→ Discount
→ Payment
→ Complete
```

must have at least one automated end-to-end or high-level workflow test.

---

# 61. Login UI Test

Test:

```text
Valid login
Invalid login
Disabled account
Forgot password
Session expiry
Logout
```

where those features exist.

---

# 62. Accessibility Tests

Critical UI should be checked for:

* Keyboard navigation
* Form labels
* Focus state
* Readable error messages
* Reasonable contrast
* Accessible controls

Do not treat visual polish as the only frontend quality criterion.

---

# 63. Performance Tests

Performance testing should target business-critical paths.

Important areas:

* Product search
* Billing
* Inventory lookup
* Invoice retrieval
* Synchronization
* Login

Do not optimize random code without evidence.

---

# 64. Product Search Performance

Test with a realistic catalogue size.

Do not validate product search only against:

```text
50 products
```

when production may contain hundreds of thousands or more.

The test dataset should represent realistic scale.

---

# 65. Database Query Performance

Important queries should be evaluated for:

* Index usage
* Execution time
* Pagination
* N+1 behavior
* Excessive joins

Performance tests should use realistic data volumes.

---

# 66. N+1 Detection

Repository/service tests should identify accidental N+1 behavior in important
list endpoints.

Example:

```text
100 invoices
    ↓
100 additional customer queries
```

should be detected and corrected where appropriate.

---

# 67. Pagination Tests

Test:

```text
page 0
page 1
last page
empty page
invalid page
large page size
```

Do not allow endpoints to accidentally return millions of records.

---

# 68. Search Tests

Test:

* Exact barcode
* Exact SKU
* Product name
* Partial name
* Case differences
* Empty search
* Special characters
* No results
* Large result set

---

# 69. Error Handling Tests

Test unexpected failures.

Example:

```text
Database unavailable
```

Expected:

```text
Controlled API error
```

not:

```text
Stack trace exposed to client
```

---

# 70. Logging Tests

Do not log:

* Passwords
* Access tokens
* Refresh tokens
* Reset tokens
* Sensitive customer information unnecessarily

Logs should contain enough diagnostic context without leaking secrets.

---

# 71. Observability Tests

Critical operations should provide traceable identifiers where appropriate.

Example:

```text
Request ID
Transaction ID
Invoice ID
Sync transaction ID
```

This allows support to trace failures.

---

# 72. Test Data

Test data should be deterministic where possible.

Avoid tests that depend on:

```text
Current random database state
```

or:

```text
Developer's local machine
```

---

# 73. Test Isolation

A test should not depend on another test running first.

Bad:

```text
testA creates product
testB assumes product exists
```

Each test should establish the state it requires.

---

# 74. Database Cleanup

Integration tests must reliably clean or isolate their data.

Do not allow one test's tenant/inventory/invoice state to contaminate another.

---

# 75. Test Naming

Test names should describe behavior.

Prefer:

```text
shouldRejectSaleWhenBatchHasInsufficientStock
```

over:

```text
testSale1
```

---

# 76. Arrange / Act / Assert

Use a clear structure:

```text
Arrange
    ↓
Act
    ↓
Assert
```

Example:

```java
// Arrange
given stock = 5

// Act
sell quantity = 6

// Assert
operation rejected
```

---

# 77. Avoid Over-Mocking

Do not mock every class.

If the purpose is to verify:

```text
Domain behavior
```

use real domain objects.

If the purpose is to verify:

```text
Database behavior
```

use a real database integration test.

Mocks should isolate true external dependencies, not hide the system under
test.

---

# 78. Test Business Invariants

Important invariants should have explicit tests.

Examples:

```text
Stock cannot become negative.

Completed invoice total must reconcile.

Payment allocations must reconcile.

Returned quantity cannot exceed eligible quantity.

Historical invoices do not change when current prices change.

One idempotency key cannot create multiple business transactions.

Tenant A cannot access Tenant B data.
```

---

# 79. Regression Test Rule

Whenever a production bug is fixed:

```text
Bug
 ↓
Regression test
 ↓
Fix
```

The test must remain permanently unless the underlying behavior is
intentionally removed.

---

# 80. Definition of Done Per Module

For every module:

### Domain

* [ ] Business rules implemented.
* [ ] Positive cases tested.
* [ ] Negative cases tested.
* [ ] Invariants tested.

### Application

* [ ] Service/application flow tested.
* [ ] Transaction boundaries tested.
* [ ] Error handling tested.

### Database

* [ ] Repository behavior tested.
* [ ] Constraints tested.
* [ ] Important queries tested.
* [ ] Migration tested.

### API

* [ ] Request validation tested.
* [ ] Success response tested.
* [ ] Error response tested.
* [ ] Authentication tested.
* [ ] Authorization tested.
* [ ] Tenant isolation tested.

### Security

* [ ] Unauthorized access rejected.
* [ ] Cross-tenant access rejected.
* [ ] Sensitive fields protected.

### Offline

Where applicable:

* [ ] Local transaction tested.
* [ ] Restart tested.
* [ ] Retry tested.
* [ ] Duplicate submission tested.
* [ ] Sync tested.
* [ ] Conflict tested.

### Frontend

* [ ] Main workflow tested.
* [ ] Error states tested.
* [ ] Loading states tested.
* [ ] Permission UI tested.
* [ ] Offline state tested where applicable.

---

# 81. CI Quality Gate

Pull requests should not be considered complete if required tests fail.

The CI pipeline should eventually include:

```text
Compile
    ↓
Unit tests
    ↓
Integration tests
    ↓
Security tests
    ↓
API/contract tests
    ↓
Build
```

Additional tests may run separately depending on execution time.

---

# 82. Test Categories

Use clear test categories where useful:

```text
unit
integration
api
security
database
concurrency
offline
sync
e2e
performance
```

This allows CI to run appropriate subsets.

---

# 83. Fast Feedback

Developers should be able to run fast tests locally.

A typical development loop:

```text
Change code
    ↓
Run unit/domain tests
    ↓
Run relevant integration tests
    ↓
Run broader suite before commit
```

Do not require the entire end-to-end suite for every tiny domain change.

---

# 84. Full Validation Before Merge

Before merging a major feature:

```text
Unit
+
Integration
+
API
+
Security
+
Relevant E2E
```

must pass.

---

# 85. Production Readiness

Before production release, verify:

* Database migrations
* Security
* Authentication
* Authorization
* Tenant isolation
* Billing
* Inventory
* Payments
* Returns
* Synchronization
* Error handling
* Logging
* Monitoring
* Backup/recovery strategy
* Performance
* Regression suite

---

# 86. Never Declare "Done" Because the UI Works

The following is NOT sufficient:

```text
Screen works
+
API returns 200
```

A feature is not done until the underlying business state is correct.

---

# 87. Never Declare "Done" Because Tests Are Green

Tests can be incomplete.

Before declaring a feature done, verify:

```text
Requirements
+
Domain rules
+
Security
+
Data integrity
+
Tests
```

all agree.

---

# 88. AI Implementation Workflow

When implementing a new feature:

```text
1. Read relevant Inventra skills.

2. Identify business rules.

3. Identify domain model.

4. Identify API contract.

5. Implement domain/application logic.

6. Implement persistence.

7. Implement API.

8. Implement frontend.

9. Add unit tests.

10. Add integration tests.

11. Add security tests.

12. Add concurrency/offline tests where relevant.

13. Run relevant tests.

14. Fix failures.

15. Run regression suite.

16. Review Definition of Done.

17. Only then declare the feature complete.
```

---

# 89. Test Coverage

Coverage percentage is useful but is not the definition of quality.

Do not write meaningless tests merely to increase:

```text
coverage = 90%
```

A smaller set of meaningful tests is better than a large collection of
assertions that never exercise important business behavior.

---

# 90. Critical Business Paths

Highest testing priority:

```text
Authentication
Billing
Inventory
Payments
Returns
Purchases
Synchronization
Tenant isolation
Concurrency
```

These paths directly affect:

```text
Money
Stock
Security
Business continuity
```

---

# 91. Critical Invariants

The following invariants should be treated as first-class test targets:

```text
1. Stock must not be incorrectly consumed twice.

2. Completed invoice totals must reconcile.

3. Payments must reconcile with invoice obligations.

4. Returned quantity must not exceed eligible quantity.

5. Completed transaction history must remain traceable.

6. Tenant data must remain isolated.

7. Duplicate synchronization must not duplicate transactions.

8. Offline transactions must survive restart.

9. Concurrent sales must not create impossible inventory state.

10. Unauthorized users must not perform protected operations.
```

---

# 92. Test Failure Policy

Do not weaken business rules merely to make tests pass.

If a test fails:

```text
Understand failure
    ↓
Determine whether implementation or test is wrong
    ↓
Fix correct layer
    ↓
Run regression
```

Do not blindly modify assertions.

---

# 93. Flaky Tests

Flaky tests must be treated as defects.

Do not normalize:

```text
"Run it again; it usually passes."
```

Investigate:

* Race conditions
* Timing
* Randomness
* External dependencies
* Test isolation
* Database cleanup

---

# 94. Time-Based Tests

Use controllable clocks where appropriate.

Avoid tests that depend directly on the actual current time when deterministic
behavior is possible.

This is particularly important for:

* JWT expiration
* Password reset expiration
* Batch expiry
* Synchronization
* Audit timestamps

---

# 95. Random IDs in Tests

Random IDs may be used where appropriate, but tests must remain reproducible.

If a random value causes failure, the test should provide enough information
to reproduce the case.

---

# 96. Testing Offline Time

Offline synchronization tests should simulate:

```text
Offline duration
Reconnect
Retry
Server processing
```

Do not require real waiting for minutes merely to test retry behavior.

Use controllable clocks/backoff where possible.

---

# 97. Contract Evolution Tests

When API contracts evolve:

```text
Old client
+
New backend
```

should be considered.

For critical clients:

```text
Desktop
Android
Web
```

verify compatibility during the transition.

---

# 98. Migration Regression

When changing entities or database structure:

```text
Existing migration history
+
New migration
+
Representative existing data
```

must be tested.

Do not simply delete the database and start again.

---

# 99. Final Quality Principle

Inventra is a business system.

A passing UI test does not prove:

```text
Inventory is correct.
Money is correct.
Security is correct.
Synchronization is correct.
```

The testing strategy must therefore prove the actual business invariants.

> Test the things that would cost the pharmacy money, lose stock, expose
> another tenant's data, or duplicate a transaction first.

---

# 100. Final Rule

No module is "done" until its Definition of Done has been satisfied.

```text
Code complete
    ↓
Tests complete
    ↓
Security verified
    ↓
Data integrity verified
    ↓
Relevant offline/concurrency behavior verified
    ↓
Regression suite passes
    ↓
DONE
```

