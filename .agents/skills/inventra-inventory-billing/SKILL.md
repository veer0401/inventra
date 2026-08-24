---
name: inventra-inventory-billing
description: >
  Defines the authoritative inventory, batch, stock movement, billing,
  payment, discount, return, cancellation, adjustment, quantity, concurrency,
  and transaction rules for Inventra Pharmacy ERP. Use this skill whenever
  implementing or modifying billing, inventory, batch allocation, sales,
  payments, returns, cancellations, stock adjustments, or related
  synchronization-sensitive business operations.
---

# Inventra Inventory & Billing Rules

## 1. Purpose

This skill defines the business-critical rules governing:

- Inventory
- Inventory batches
- Stock movements
- Billing
- Invoice lifecycle
- Payments
- Discounts
- Returns
- Cancellations
- Adjustments
- Quantity handling
- Concurrency
- Transaction integrity

These rules protect the two most important forms of business truth in Inventra:

```text
Inventory truth
+
Financial transaction truth
````

A feature that makes the UI convenient but corrupts either of these is
incorrect.

---

# 2. Core Principle

Inventra must never silently lose the relationship between:

```text
Purchase
    ↓
Batch
    ↓
Inventory
    ↓
Sale
    ↓
Payment
    ↓
Return / Cancellation / Adjustment
```

Every meaningful inventory or financial change must be explainable.

---

# 3. Inventory Is Not a Single Number

Never model inventory as only:

```text
Product → Quantity
```

A product can have multiple batches.

Example:

```text
Dolo

Batch A
Expiry: 2027-01
Quantity: 20

Batch B
Expiry: 2027-06
Quantity: 100
```

Total quantity:

```text
120
```

But the system must retain the two batches separately.

---

# 4. Batch Is a First-Class Inventory Concept

A batch may contain:

* Product
* Manufacturer batch number
* Internal batch identifier where applicable
* Expiry date
* Purchase reference
* Supplier
* Purchase price
* MRP
* Selling price
* Quantity
* Tenant/store
* Creation timestamp

A sale must be traceable to the inventory batch from which stock was
consumed.

---

# 5. Manufacturer Batch Number

Preserve the manufacturer's batch number exactly.

Do not replace the manufacturer batch number with an Inventra-generated
identifier.

If Inventra needs an internal identifier:

```text
manufacturer_batch_number
+
internal_batch_id
```

may coexist.

---

# 6. Batch Expiry

Expiry is a batch property.

Two batches of the same product may have different expiry dates.

Never store only one expiry date at Product level when batch-level expiry
exists.

---

# 7. Batch Quantity

Current batch quantity represents the current available quantity for that
batch according to the approved inventory model.

However, current quantity is not the entire historical truth.

Stock movements must preserve why the quantity changed.

---

# 8. Inventory Ledger

Every important inventory change should produce an inventory movement.

Examples:

```text
PURCHASE_RECEIPT
SALE
SALES_RETURN
ADJUSTMENT
EXPIRY_WRITE_OFF
OTHER_APPROVED_MOVEMENT
```

Each movement should identify, where applicable:

* Tenant
* Store
* Product
* Batch
* Quantity delta
* Movement type
* Source transaction
* User
* Device
* Timestamp

---

# 9. Positive and Negative Movements

Conceptually:

```text
Purchase:
+100

Sale:
-5

Sales Return:
+2

Adjustment:
-3
```

The movement history explains how the current stock was reached.

---

# 10. Current Balance

The system may maintain a current balance for fast reads.

For example:

```text
inventory_batch.quantity
```

However, this does not replace the inventory movement history.

The architecture may use:

```text
Current Balance
+
Immutable/traceable Movement History
```

for both performance and auditability.

---

# 11. No Silent Stock Mutation

Never implement business stock changes as an arbitrary field update.

Bad:

```java
batch.setQuantity(batch.getQuantity() - quantity);
```

without:

* Business validation
* Transaction boundary
* Inventory movement
* Source transaction
* Audit information where required

The resulting stock state must be explainable.

---

# 12. Stock Cannot Become Negative

By default:

```text
available stock >= 0
```

A sale must not consume more available inventory than permitted by the
approved business policy.

If negative inventory is ever permitted as a deliberate business decision,
that must be an explicit product decision.

Do not silently enable negative inventory because it makes billing easier.

---

# 13. Product Search During Billing

Billing product search is a critical path.

The catalogue may contain more than:

```text
1,000,000 products
```

Therefore:

* Search must be server-side.
* Search must use indexes.
* Results must be paginated.
* Results must be lightweight.
* Do not load the full catalogue.
* Do not filter millions of products in the client.
* Avoid unnecessary joins.

The billing UI should be able to quickly find a product by:

* Name
* Barcode
* SKU
* Composition/generic name
* Other approved identifiers

---

# 14. Search Priority

Exact identifiers should be optimized heavily.

For example:

```text
Barcode
    ↓
Exact lookup

SKU
    ↓
Exact/controlled lookup

Product name
    ↓
Text/prefix search

Composition
    ↓
Text search
```

Do not use one expensive generic search query for every search type if
specialized queries are more appropriate.

---

# 15. Billing Product Result

Billing does not need the entire product entity.

A search result should contain only fields needed for the billing workflow.

Potential fields:

```text
productId
name
strength
dosageForm
manufacturer
mrp
sellingPrice
availableQuantity
prescriptionRequired
```

The exact response is defined by the API contract.

---

# 16. Billing Workflow

The normal billing workflow is:

```text
Search product
    ↓
Select product
    ↓
Select/confirm batch where required
    ↓
Enter quantity
    ↓
Review price
    ↓
Apply product discount where applicable
    ↓
Add additional products
    ↓
Apply bill-level discount where applicable
    ↓
Review total
    ↓
Add payment method(s)
    ↓
Complete invoice
```

Do not introduce unnecessary screens between these steps.

---

# 17. Keyboard-First Billing

Billing must be efficient for keyboard users.

Where the UI supports it:

```text
Enter
```

after completing the required billing information should initiate invoice
completion.

The frontend may support keyboard shortcuts.

The backend must still perform complete validation.

A keyboard shortcut must never bypass business rules.

---

# 18. Billing Drafts

A billing session may exist as a draft.

Draft billing exists to protect the user against:

* Browser/application crash
* Power loss
* Accidental application closure
* Device restart

A draft:

* Is not a completed sale.
* Does not finalize revenue.
* Does not finalize payment.
* Must not permanently reduce inventory.
* Must be recoverable where supported.

---

# 19. Draft Persistence

A draft may be persisted locally and/or remotely depending on the client
architecture.

The important rule is:

```text
Partially entered billing data must not be treated as a completed sale.
```

The system must distinguish:

```text
DRAFT
COMPLETED
CANCELLED
```

and any additional approved lifecycle states.

---

# 20. Completing an Invoice

Invoice completion is a business transaction.

The backend must validate all relevant information before completion.

Validation may include:

* Invoice state
* Tenant
* User authorization
* Product validity
* Batch validity
* Quantity
* Stock
* Pricing
* Discounts
* Payment allocations
* Prescription warning requirements
* Other business rules

---

# 21. Invoice Completion Must Be Atomic

The following operations should form one coherent business transaction:

```text
Validate sale
    ↓
Determine/validate batches
    ↓
Validate stock
    ↓
Calculate final amounts
    ↓
Validate payments
    ↓
Create invoice
    ↓
Create invoice lines
    ↓
Create payment records
    ↓
Create inventory movements
    ↓
Update inventory balances
    ↓
Record required audit information
    ↓
Commit
```

If a critical operation fails:

```text
Rollback
```

Do not leave a partially completed invoice.

---

# 22. Invoice State

A completed invoice is different from a draft.

Conceptually:

```text
DRAFT
  |
  | Complete
  v
COMPLETED
  |
  +----> CANCELLED
```

A completed invoice must not be casually edited.

---

# 23. Completed Invoice Immutability

Once completed:

* Product quantities must not be casually edited.
* Prices must not be silently changed.
* Payments must not be silently rewritten.
* Historical inventory movements must not be deleted.

Corrections must use controlled business workflows.

---

# 24. Invoice Cancellation

Cancellation is not deletion.

A cancellation must preserve the original invoice.

Conceptually:

```text
Original Invoice
       ↓
Cancellation
       ↓
Audit/history retained
```

The system must reverse the appropriate business effects according to the
approved cancellation rules.

Do not use:

```text
DELETE invoice
```

as a cancellation mechanism.

---

# 25. Sales Return

A sales return represents a customer returning sold products.

It is not the same thing as cancellation.

Example:

```text
Original sale:
Dolo × 10

Customer returns:
Dolo × 2

Remaining sold quantity:
8
```

The original invoice remains.

A return transaction is created.

Inventory is updated through the return workflow.

---

# 26. Return Eligibility

The system must prevent:

```text
Returned quantity
>
Eligible sold quantity
```

For example:

```text
Sold: 10
Already returned: 3
Maximum additional return: 7
```

A request to return 8 must be rejected.

---

# 27. Return Search

The returns screen should allow locating invoices through:

* Invoice number
* Customer name
* Customer mobile number
* Purchase date
* Medicine/product purchased

After selecting an invoice:

```text
Invoice
    ↓
Product
    ↓
Return quantity
    ↓
Confirm
```

---

# 28. Partial Return

Partial returns are supported.

The original invoice line must remain intact.

The return transaction records the returned quantity.

Do not rewrite the original invoice quantity.

---

# 29. Return Inventory Movement

A valid sales return normally creates a positive inventory movement.

Conceptually:

```text
SALE:
-10

RETURN:
+2
```

Whether returned stock is immediately sellable may depend on additional
business conditions and should be represented explicitly if required.

Do not automatically mark questionable returned medicine as sellable without
an approved rule.

---

# 30. Multiple Payment Methods

One invoice may have multiple payment allocations.

Example:

```text
Invoice Total: ₹1,000

Cash: ₹400
UPI:  ₹600
```

The invoice must retain the underlying payment records.

Do not collapse multiple methods into one `"MIXED"` value.

---

# 31. Payment Reconciliation

The final payment allocations must reconcile with the invoice's payable
amount according to the approved payment policy.

Example:

```text
Invoice payable:
₹1,000

Payments:
₹400 cash
₹600 UPI

Total:
₹1,000
```

Valid.

Example:

```text
Invoice payable:
₹1,000

Payments:
₹400 cash
₹500 UPI

Total:
₹900
```

Invalid unless the invoice is intentionally a credit transaction and the
domain explicitly supports the remaining balance.

---

# 32. Credit Sale

Credit customers are supported.

For an approved credit transaction:

```text
Invoice Total
-
Immediate Payments
=
Credit Outstanding
```

The credit balance must be represented through transactions.

Do not simply mutate:

```text
customer.outstanding = 5000
```

without a corresponding financial transaction.

---

# 33. Discount Types

Discounts may be applied:

1. Per product
2. At invoice level

Both must remain auditable.

---

# 34. Product-Level Discount

A billing line may contain:

```text
quantity
unit price
line subtotal
discount
final line amount
```

The exact representation may use percentage, amount, or both where required.

The final charged value must be preserved.

---

# 35. Invoice-Level Negotiated Discount

A customer may negotiate the final bill.

Example:

```text
Medicine A = ₹100
Medicine B = ₹100
Medicine C = ₹130

Subtotal = ₹330

Customer negotiates:
Final bill = ₹300
```

The system must support this.

The resulting:

```text
₹30 discount
```

must not disappear without an allocation.

---

# 36. Discount Allocation

When an invoice-level discount is applied, the system must use a deterministic
allocation strategy to attribute the discount across eligible invoice lines.

A proportional allocation is acceptable where appropriate.

Example:

```text
Original total = ₹330
Discount = ₹30
Final total = ₹300
```

The allocation must satisfy:

```text
Sum(line discounts) = invoice discount
```

subject to rounding rules.

---

# 37. Rounding

Money calculations must use deterministic rounding.

The system must ensure that:

```text
sum(line final amounts)
=
invoice final amount
```

after approved rounding rules.

Do not allow one-cent/one-paise equivalent discrepancies to accumulate
silently.

---

# 38. Historical Price

The completed invoice must preserve the actual price charged.

If today's selling price is:

```text
₹95
```

and tomorrow it becomes:

```text
₹90
```

yesterday's invoice must still show:

```text
₹95
```

Historical invoices must not recalculate using current product pricing.

---

# 39. MRP

MRP and actual selling price are distinct.

Example:

```text
MRP:
₹100

Selling price:
₹95
```

The invoice should preserve the relevant transaction values.

Do not mutate Product Master MRP because a customer received a discount.

---

# 40. Prescription-Required Product

When a prescription-required product is added to billing:

```text
Prescription required
        ↓
Warning shown
        ↓
Cashier reviews
        ↓
Proceed or deny
```

The normal billing workflow should not be unnecessarily replaced by a separate
"prescription mode."

The warning should be prominent enough for a new cashier to understand.

---

# 41. Prescription Warning Is Not Inventory Logic

Prescription handling must not be mixed into stock calculation.

A prescription warning determines whether the cashier should review the sale.

Inventory allocation and payment logic remain separate concerns.

---

# 42. New/Incorrect Batch During Billing

Operational reality may produce cases where:

* A new batch arrived.
* Inventory was not fully updated.
* An expiry date was entered incorrectly.
* A batch needs correction.

Billing should not unnecessarily become unusable.

The system may provide an approved operational path to continue billing.

However:

```text
Operational continuity
≠
Uncontrolled data mutation
```

Corrections must remain auditable.

---

# 43. Adjustments

Adjustments are the official stock correction mechanism.

Example:

```text
System:
100

Physical:
98

Adjustment:
-2

Reason:
Physical stock count
```

The adjustment must create an appropriate inventory movement.

Do not directly edit the inventory balance from arbitrary UI fields.

---

# 44. Adjustment Audit

An adjustment must retain:

* Product
* Batch
* Quantity delta
* Previous quantity where applicable
* Resulting quantity where applicable
* Reason
* User
* Timestamp
* Tenant/store
* Device where applicable

---

# 45. Adjustment Is Not a Sale

Do not use adjustments to represent sales.

A sale must be represented as a sale.

Adjustments exist for legitimate inventory corrections.

---

# 46. Adjustment Is Not a Return

Do not use adjustments to represent customer returns.

A customer return must be represented as a sales return.

---

# 47. Purchase Receipt

Receiving purchased stock should create appropriate inventory state.

Conceptually:

```text
Purchase Invoice
       ↓
Purchase Items
       ↓
Batch Creation/Update
       ↓
Inventory Movement
       ↓
Current Inventory
```

A purchase must not appear completed while its required inventory state is
missing.

---

# 48. Purchase Cancellation

If purchase cancellation is supported, it must be a controlled business
operation.

Do not simply delete purchase rows.

The system must determine the inventory consequences and preserve the
historical transaction.

---

# 49. Batch Allocation

When selling a product with multiple batches, the allocation strategy must
be deterministic.

Preferred policy:

```text
FEFO
First Expiry, First Out
```

where the batch is eligible for sale.

Conceptually:

```text
Batch A → expires Jan 2027 → 10
Batch B → expires Jun 2027 → 20

Sell 5

Consume:
Batch A → 5
```

Do not randomly select a batch.

---

# 50. FEFO Eligibility

A batch may be excluded from normal sale if:

* It is expired.
* It is inactive.
* It is quarantined where such a state exists.
* It has no available quantity.
* Other approved business conditions apply.

Do not sell expired inventory simply because it has stock.

---

# 51. FEFO and User Selection

If the UI allows explicit batch selection, the backend must still validate
that the selected batch is eligible.

The frontend cannot override backend inventory rules.

---

# 52. Multi-Batch Sale

One invoice line/product may consume multiple batches if the quantity
requires it.

Example:

```text
Requested:
15

Batch A:
10

Batch B:
20
```

The sale may consume:

```text
Batch A → 10
Batch B → 5
```

The transaction must preserve the batch allocations.

---

# 53. Batch Allocation Records

If a single invoice line consumes multiple batches, the database must be able
to represent:

```text
Invoice Line
   |
   +-- Batch A → 10
   +-- Batch B → 5
```

Do not force one batch ID onto the invoice line if that prevents legitimate
multi-batch allocation.

---

# 54. Concurrency Problem

Inventory is shared mutable state.

Example:

```text
Available:
1 strip

Desktop:
Sell 1

Mobile:
Sell 1
```

Both clients may see:

```text
Available = 1
```

The backend must prevent both transactions from successfully consuming the
same unit.

---

# 55. Concurrency Protection

Inventory consumption must use an appropriate concurrency strategy.

Possible mechanisms include:

* Optimistic locking
* Pessimistic locking
* Atomic conditional updates
* Other database-safe strategies

The implementation must be selected based on actual transaction behavior.

Never implement:

```text
read quantity
↓
if enough
↓
write quantity - requested
```

without concurrency protection.

---

# 56. Transaction Isolation

Use the least restrictive transaction isolation level that still guarantees
correct business behavior.

Do not increase isolation globally merely to solve one inventory race.

Critical operations may require stronger locking locally.

---

# 57. Double Completion

A cashier may accidentally press Complete twice.

The system must prevent:

```text
One draft
    ↓
Complete
    ↓
Complete again
```

from creating two sales.

Invoice lifecycle state and idempotency must protect the operation.

---

# 58. Network Retry

A client may submit a sale successfully and then fail to receive the response
because the network disappears.

The client may retry.

The backend must recognize the transaction as already processed.

This is one reason client-generated transaction IDs/idempotency keys are
important.

---

# 59. Offline Sale

A supported offline client may complete a sale without internet connectivity.

The sale must:

* Be stored locally.
* Receive a stable client transaction ID.
* Update local inventory according to the local transaction model.
* Enter a pending synchronization state.
* Eventually synchronize with the cloud.
* Not be duplicated when retried.

---

# 60. Offline Stock Visibility

Offline inventory is local operational state.

When disconnected, the client cannot know about transactions that happened
on another disconnected device.

This is an inherent distributed-system limitation.

Do not pretend the client has real-time knowledge of disconnected devices.

When connectivity returns, synchronization must reconcile the authoritative
business state according to the synchronization architecture.

---

# 61. Synchronization Must Not Duplicate Sales

Example:

```text
Desktop creates:
SALE-123

Cloud receives:
SALE-123

Desktop retries:
SALE-123
```

The second submission must not create another invoice.

---

# 62. Sync Failure

If synchronization fails:

```text
Local completed transaction
        ↓
Pending sync
        ↓
Retry
```

Do not:

* Delete the transaction.
* Revert the local completed sale merely because the cloud is unavailable.
* Create another transaction automatically.

---

# 63. Manual Synchronization

The desktop application should expose a synchronization action.

The user may manually request:

```text
Sync Now
```

This should trigger synchronization of pending local changes and retrieval
of relevant remote changes.

---

# 64. Automatic Synchronization

When connected, synchronization should also occur automatically.

The exact interval is configurable.

A reasonable initial target may be:

```text
Every few minutes
```

but the interval should be configurable rather than hardcoded into business
logic.

---

# 65. Billing Should Not Wait for Cloud Sync

A completed offline transaction should not be blocked merely because the
cloud is unavailable.

The user should be able to continue normal operations.

Synchronization is a separate reliability concern.

---

# 66. Mobile and Desktop Are Normal Clients

Do not create an "Emergency Billing" workflow.

Offline billing is still normal billing.

The application should hide synchronization complexity from the cashier.

---

# 67. Small Unit Sales

Some pharmacies may sell a unit smaller than the package.

Example:

```text
1 strip = 10 tablets

Customer asks for:
1 tablet
```

The inventory model must be capable of representing sellable units and
conversion rules where required.

However, extremely low-value transactions may not be logged by the shop if
the operational cost exceeds their practical value.

The MVP should not force excessive transaction entry for negligible-value
transactions unless the owner chooses to use it.

Do not hardcode a blanket rule that prevents unit-level sales.

---

# 68. Unit Conversion

If a product supports:

```text
Pack
→ Strip
→ Tablet
```

the conversion must be explicit.

Example:

```text
1 strip = 10 tablets
```

The system must not infer arbitrary conversion values from product names.

---

# 69. Inventory and Unit Precision

Inventory quantities must use the unit model defined for the product.

If the inventory is stored in base units:

```text
1 strip = 10 tablets
```

then:

```text
1 strip
=
10 base units
```

The exact storage strategy must be standardized before implementation.

Do not mix:

```text
quantity = strips
```

in one table with:

```text
quantity = tablets
```

in another without an explicit conversion model.

---

# 70. Customer Bargaining

Pharmacy billing may involve negotiated prices.

The system must support the real-world case where:

```text
Subtotal:
₹330

Customer negotiates:

Final:
₹300
```

The system must preserve:

```text
Original subtotal
Discount
Final amount
```

and allocate the discount deterministically.

---

# 71. Invoice Total Must Reconcile

For a completed invoice:

```text
Sum(line final amounts)
+
applicable invoice-level adjustments
=
invoice total
```

and:

```text
Payments + approved credit balance
=
invoice payable
```

The exact accounting formula depends on the final financial model.

The invariant is that amounts must reconcile.

---

# 72. No Floating Point Money

Never calculate:

```java
double total
```

for invoice totals.

Use exact decimal arithmetic.

Rounding must be deterministic.

---

# 73. Transaction Boundary Principle

A transaction boundary should represent a business operation.

Examples:

```text
Complete Sale
Complete Purchase
Complete Return
Complete Adjustment
Cancel Invoice
```

Do not put the entire application behind one giant transaction.

Do not split one atomic business operation into unrelated transactions unless
the architecture explicitly requires it.

---

# 74. Failure Handling

If a critical step fails:

```text
Invoice creation
Inventory deduction
Payment recording
```

the system must not leave an impossible intermediate state.

The failure must either:

```text
Rollback
```

or:

```text
Move to an explicitly modeled recoverable state
```

depending on the operation.

Never leave silent partial state.

---

# 75. Audit

Inventory and billing actions should retain enough audit information to answer:

```text
Who did it?
What happened?
When?
Which tenant?
Which device?
Which invoice?
Which batch?
Why?
```

Do not rely exclusively on application logs for business audit history.

---

# 76. Reporting Consequences

Billing, returns, purchases, and adjustments must create transactional records
that reports can use later.

Do not update reporting totals manually.

For example:

```text
Sales Report
```

should derive from sales transactions.

```text
Return Report
```

should derive from return transactions.

```text
Inventory Report
```

should derive from inventory state and movement history.

---

# 77. Business Operation Separation

Do not merge:

```text
Sale
Return
Adjustment
Cancellation
```

into one generic:

```text
InventoryMutation
```

internal concept unless the domain model still preserves the exact business
meaning and auditability of each operation.

Business semantics must remain visible.

---

# 78. AI Implementation Checklist

Before implementing any inventory or billing operation, verify:

### Inventory

* [ ] Product exists.
* [ ] Product belongs to the correct scope.
* [ ] Batch exists.
* [ ] Batch is eligible.
* [ ] Quantity is valid.
* [ ] Stock is sufficient.
* [ ] Concurrency is protected.
* [ ] Inventory movement is created.
* [ ] Current balance is updated safely.

### Billing

* [ ] Invoice state is valid.
* [ ] Products are valid.
* [ ] Quantities are valid.
* [ ] Prices are determined correctly.
* [ ] Discounts reconcile.
* [ ] Payment allocations reconcile.
* [ ] Prescription warning is handled where required.
* [ ] Batch allocation is deterministic.
* [ ] Inventory is updated atomically.
* [ ] Invoice is persisted.
* [ ] Audit information is retained.

### Returns

* [ ] Original invoice exists.
* [ ] Return quantity is eligible.
* [ ] Already-returned quantity is considered.
* [ ] Batch information is handled.
* [ ] Inventory movement is created.
* [ ] Return transaction is persisted.

### Adjustments

* [ ] Adjustment reason exists.
* [ ] User is authorized.
* [ ] Quantity change is valid.
* [ ] Inventory movement is created.
* [ ] Audit information is retained.

---

# 79. AI Anti-Patterns

Never implement:

```text
PATCH /inventory/{id}
quantity = x
```

as a generic stock correction.

Never implement:

```text
DELETE invoice
```

as cancellation.

Never implement:

```text
UPDATE invoice
```

to rewrite completed transaction history.

Never implement:

```text
SELECT stock
IF stock >= requested
UPDATE stock
```

without concurrency protection.

Never implement:

```text
POST sale
```

without idempotency considerations for retry-sensitive clients.

Never implement:

```text
sale → inventory update
```

as two unrelated commits when the business operation requires atomicity.

Never trust frontend-calculated totals without backend validation.

Never trust frontend-selected batches without backend validation.

---

# 80. Final Principle

Billing and inventory are not ordinary CRUD modules.

They represent:

```text
Money
+
Stock
+
Audit
+
Customer history
+
Business truth
```

The implementation must therefore make incorrect states difficult to create.

> Fast billing is important, but a fast system that says the pharmacy has
> stock it does not actually have is a broken system.
