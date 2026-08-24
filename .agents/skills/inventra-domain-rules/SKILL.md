---
name: inventra-domain-rules
description: >
  Defines the authoritative business and domain rules for Inventra Pharmacy
  ERP. Use this skill whenever implementing, modifying, reviewing, or testing
  products, suppliers, purchases, inventory, batches, billing, payments,
  discounts, returns, adjustments, customers, credit, prescription warnings,
  reports, or other pharmacy business workflows.
---

# Inventra Domain Rules

## 1. Purpose

This document defines the business rules for Inventra.

These rules are more authoritative than generic ERP assumptions.

When implementing a feature:

1. Follow these rules.
2. Follow the architecture skill.
3. Follow the relevant technical skills.
4. Do not invent contradictory business behavior.
5. If a requirement is genuinely undefined, flag it instead of silently
   choosing a behavior that could affect business data.

Inventra is a pharmacy/medical-store ERP.

The primary users are:

- Pharmacy owners
- Store managers
- Cashiers
- Inventory operators

The system must optimize for:

- Fast billing
- Reliable stock
- Easy purchasing
- Batch traceability
- Simple operation
- Auditability
- Offline-capable operation

---

# 2. Product Master

The Product Master is authoritative master data.

It represents the product itself, not one pharmacy's inventory.

The Product Master must not be casually overwritten by tenants.

Examples of master information include:

- Product name
- Generic/composition
- Manufacturer
- Strength
- Dosage form
- HSN
- GST information
- Prescription requirement
- Other approved product attributes

The system must distinguish:

```text
Product Master
        ↓
Tenant/Store-specific information
        ↓
Inventory/Batches
````

A tenant's purchasing or selling behavior must not silently modify global
product truth.

---

# 3. Product Price Rules

The Product Master may contain the authoritative MRP.

MRP represents the actual product MRP and is not a tenant-specific selling
price.

A pharmacy may sell below MRP.

Therefore:

```text
MRP
≠
Selling Price
```

Selling price may vary by:

* Tenant
* Store
* Inventory
* Batch
* Business decision
* Discount

Example:

```text
Product MRP = ₹100

Store selling price = ₹95

Customer-specific negotiated price = ₹90
```

The Product Master must remain unchanged because a store sold the product
at ₹95 or ₹90.

Historical transactions must retain their actual transaction values.

---

# 4. Product and Supplier Relationship

The relationship between Product and Supplier is many-to-many.

A product may be purchased from multiple suppliers.

A supplier may supply many products.

Conceptually:

```text
Product
   ↕
Product-Supplier Relationship
   ↕
Supplier
```

Supplier-specific information must not overwrite Product Master information.

---

# 5. Supplier

Suppliers are tenant/business-owned records.

A supplier may have:

* Name
* Contact information
* Address
* Notes
* Other approved business fields

Do not require bank account or UPI details.

If the pharmacy owner wants to store payment-related information, notes may
be used.

Supplier information must be auditable where appropriate.

---

# 6. Purchase

Purchase is the process by which inventory enters the pharmacy.

A purchase belongs to:

* Tenant
* Store
* Supplier
* User/operator
* Purchase transaction

A purchase may contain multiple products.

Each purchase line may contain information such as:

* Product
* Quantity
* Purchase price
* MRP
* Selling price where applicable
* Batch
* Expiry
* Tax
* Discount
* Other approved purchase fields

---

# 7. Purchase Entry

When adding a product for a supplier during purchase entry:

The system should automatically fetch the previous relevant value when one
exists.

If no previous value exists:

```text
Previous value = empty
```

The user may then enter the new value.

This applies to approved supplier/product purchasing fields.

Do not invent a default value merely because the field is empty.

---

# 8. Purchase of Multiple Products

A pharmacy owner may receive a large purchase containing many products.

Example:

```text
Supplier
    |
    +-- Dolo       100
    +-- Crocin     100
    +-- Azithro     50
    +-- ...
    +-- 20 products
```

The system must support efficient bulk purchase entry.

The workflow should minimize repetitive data entry.

Previously known supplier/product information should be reused where
appropriate.

---

# 9. Batch Creation

Purchase receiving creates inventory batches where required.

A batch must preserve:

* Product
* Supplier/purchase context
* Batch number
* Expiry
* Quantity
* Purchase price
* MRP
* Selling price
* Relevant timestamps

A product may have many batches.

Do not collapse different batches into one undifferentiated quantity.

---

# 10. Batch Number

Batch numbers must be traceable.

The actual manufacturer batch number must be preserved when supplied on the
purchase invoice.

If Inventra also requires an internal identifier, maintain it separately.

Do not overwrite manufacturer batch information with an internal identifier.

---

# 11. Expiry

Expiry belongs to inventory/batch information.

The system must be capable of showing:

* Product
* Quantity expiring
* Expiry date
* Batch number
* Other relevant batch information

Example:

```text
Dolo

10 tablets expiring soon

Click
    ↓
Batch number
Expiry
Quantity
Other batch details
```

The owner should be able to identify exactly which stock is affected.

---

# 12. Inventory

Inventory is batch-aware.

Do not represent inventory only as:

```text
Product → Total Quantity
```

The system must preserve batch-level information.

Example:

```text
Dolo

Batch A
Expiry: Jan 2027
Quantity: 20

Batch B
Expiry: Jun 2027
Quantity: 100
```

The total product quantity may be 120, but the underlying batches remain
separate.

---

# 13. Inventory Adjustments

Inventory adjustments are the official mechanism for correcting stock.

Users must not directly edit historical stock quantities without an audit
record.

Example:

```text
System quantity: 100
Physical quantity: 98

Adjustment:
-2
Reason: Physical stock count
```

Adjustments must preserve:

* Previous quantity
* Adjustment quantity
* New quantity
* Reason
* User
* Timestamp
* Relevant product/batch
* Tenant/store

---

# 14. No Silent Inventory Mutation

Do not implement hidden operations such as:

```text
inventory.quantity = inventory.quantity - 1
```

without an appropriate business transaction and inventory movement.

Every meaningful inventory change must have a traceable reason.

---

# 15. Inventory Consumption

When a sale occurs, inventory must be consumed from the appropriate batch.

The exact allocation strategy must follow the approved Inventra inventory
policy.

Prefer the configured FEFO behavior where applicable:

```text
First Expiry
    ↓
First Out
```

The system must never consume more inventory than is available.

---

# 16. Billing

Billing is a primary workflow.

Billing must be fast.

A cashier should be able to:

1. Search product.
2. Add product.
3. Enter quantity.
4. Review price.
5. Apply discount where permitted.
6. Add another product.
7. Select payment method(s).
8. Complete invoice.

Do not introduce unnecessary confirmation screens.

---

# 17. Product Search

Product search is a critical path.

The product catalogue may contain more than one million records.

Search must therefore be optimized.

Never:

* Load all products into the browser.
* Load all products into memory.
* Filter one million products client-side.
* Execute unindexed wildcard searches indiscriminately.

Use:

* Indexed queries
* Pagination
* Search-specific endpoints
* Efficient projections
* Debounced input where appropriate
* Server-side filtering

The billing search experience should feel immediate.

---

# 18. Billing Quantity

The default billing model is product quantity.

Example:

```text
Dolo
Quantity: 2
```

Inventory is reduced according to the actual sellable unit represented by the
inventory model.

---

# 19. Prescription-Required Products

Products may be marked as prescription-required.

When a prescription-required product is added to billing:

```text
Prescription Required
        ↓
Warning
        ↓
Cashier reviews situation
        ↓
Transaction may proceed or be denied
```

The system should warn rather than unnecessarily interrupt the billing
workflow with an unconditional technical block.

The cashier must be able to recognize the warning.

---

# 20. Missing or Incorrect Batch/Expiry Information During Billing

Billing should not unnecessarily stop because the inventory information is
temporarily incomplete.

Example:

A new batch arrives but has not yet been correctly entered.

Or:

The expiry date was entered incorrectly.

The cashier may continue billing according to the approved operational
workflow.

The system must provide a mechanism to correct the underlying inventory
through **Adjustments**.

Do not allow the cashier to silently rewrite historical inventory data merely
to complete a sale.

---

# 21. Quick Add / Operational Continuity

Inventra may provide a quick operational mechanism for adding or recording
medicine/inventory information when normal inventory setup has not yet been
completed.

The purpose is:

> Keep billing operational without sacrificing auditability.

This must not become a backdoor that bypasses inventory rules.

Any resulting inventory correction must remain auditable.

---

# 22. Multiple Payment Methods

A single invoice may use multiple payment methods.

Example:

```text
Total: ₹1,000

Cash: ₹400
UPI:  ₹600
```

The system must preserve each payment allocation.

Do not store only:

```text
paymentMethod = "MIXED"
```

without the underlying amounts.

---

# 23. Bill Completion

The billing workflow must have a clear completion action.

The user may press Enter after entering/reviewing the required billing values
where the UI workflow supports keyboard completion.

Completion must be atomic.

A completed invoice must not exist without the corresponding required
inventory/payment state.

---

# 24. Draft Billing

Billing must support draft state.

Reason:

A device may:

* Crash
* Lose power
* Close unexpectedly
* Restart

A partially completed bill should not necessarily disappear.

Drafts must:

* Preserve entered billing values
* Be distinguishable from completed invoices
* Not reduce final inventory until completion
* Not be treated as completed sales
* Be recoverable after restart where supported

---

# 25. Invoice Immutability

Completed invoices should not be freely edited.

If a completed transaction is wrong, use an approved business mechanism such
as:

* Cancellation
* Sales return
* Adjustment where inventory is involved
* Other approved correction workflow

Do not directly rewrite historical transactions.

---

# 26. Invoice Cancellation

Invoice cancellation and sales return are different operations.

## Cancellation

Used when the invoice itself must be cancelled.

Example:

```text
Customer/order mistake
Incorrectly generated invoice
Other approved cancellation reason
```

Cancellation must be recorded.

Do not delete the invoice.

---

# 27. Sales Return

Sales return represents products being returned by a customer.

Returns are important for:

* Inventory
* Audit
* Analytics
* Customer history

A return must reference the original sale where applicable.

Do not delete or overwrite the original invoice to represent a return.

---

# 28. Return Search

The returns workflow should allow the user to locate an invoice using multiple
search methods.

Supported search dimensions include:

* Invoice number
* Customer name
* Customer mobile number
* Purchase date
* Medicine/product purchased

After locating the invoice:

```text
Invoice
   ↓
Select product
   ↓
Select return quantity
   ↓
Confirm return
```

The user should not need to manually recreate the original invoice.

---

# 29. Partial Returns

A customer may return only part of a purchased quantity.

Example:

```text
Original:
Dolo × 10

Returned:
Dolo × 2

Remaining:
Dolo × 8
```

The system must prevent returning more quantity than was originally sold and
not already returned.

---

# 30. Very Small Unit Sales

Some medicines/products may be physically sold in units smaller than the
packaging unit.

Example:

```text
One strip = 10 tablets

Customer requests:
1 tablet
```

Inventra should not force pharmacies to create a detailed transaction for
every negligible-value tablet when the operational cost outweighs the
business value.

However, the system architecture should not make unit-level inventory
impossible.

The sellable unit model must be capable of supporting:

* Pack
* Strip
* Tablet
* Other unit types

The exact operational policy for extremely small transactions may be
configurable later.

Do not hardcode assumptions that every product must always be sold only as a
full pack.

---

# 31. Discounts

Discounts may be applied:

* Per product
* At total bill level

Example:

```text
Medicine A: ₹100
Medicine B: ₹100
Medicine C: ₹130

Subtotal: ₹330

Customer negotiates:
Final amount: ₹300
```

The system must support a final negotiated bill amount.

---

# 32. Bill-Level Discount Allocation

When a bill-level discount changes the final payable amount, the discount
must be allocated across applicable products using a deterministic rule.

Example:

```text
Original total = ₹330
Final total    = ₹300
Discount       = ₹30
```

The system may allocate the ₹30 proportionally across applicable lines.

The allocation must be deterministic and auditable.

Do not invent a random allocation.

---

# 33. Historical Selling Price

When a sale is completed, preserve the actual price charged.

Do not recalculate old invoices based on the current product MRP or current
selling price.

Example:

```text
Today:
Selling price = ₹95

Tomorrow:
Selling price = ₹90

Yesterday's invoice must still show:
₹95
```

---

# 34. Customer Model

Customers may be:

1. Anonymous
2. Named
3. Credit customers

Anonymous billing should not require unnecessary customer information.

---

# 35. Duplicate Mobile Numbers

Duplicate mobile numbers are possible.

Therefore:

```text
Mobile number
```

must not always be treated as a globally unique customer identifier.

When identifying a named customer, the system may use:

* Name
* Mobile number
* Other approved customer information

Do not reject a legitimate customer merely because the mobile number already
exists.

---

# 36. Credit Customers

Credit sales are supported.

A credit customer should provide visibility into:

* Outstanding amount
* Previous credit transactions
* Payments
* Balance

Credit should be represented transactionally.

Do not manually overwrite the customer's outstanding amount.

---

# 37. Doctor Reference

Doctor reference is optional.

Do not require a doctor reference for normal billing.

The field may be captured where useful.

---

# 38. Customer Address

Customer address is optional.

Do not force an address for normal anonymous/cash billing.

---

# 39. Loyalty

Loyalty points are NOT part of the current MVP.

Do not implement loyalty points unless explicitly requested later.

Do not add loyalty-related tables, APIs, UI, or workflows merely because
other pharmacy ERPs provide them.

---

# 40. Supplier Financial Details

Supplier bank details and UPI information are not part of the current
required supplier model.

Use notes for optional information that the owner wants to remember.

Do not create unnecessary financial infrastructure.

---

# 41. Reports

Reports should support filtering.

The reporting system should allow users to:

* Select date ranges
* Filter relevant dimensions
* View results
* Use useful presets
* Create/use custom presets where supported

The interface should remain understandable for users who may not be highly
technical.

Reports may include:

* Sales
* Purchases
* Profit
* Inventory
* Low stock
* Near expiry
* Returns
* Credit outstanding
* Other approved operational reports

---

# 42. Near-Expiry Inventory

The system should expose actionable near-expiry information.

Example:

```text
10 Dolo tablets expiring soon
```

Clicking the information should reveal:

* Batch number
* Expiry date
* Quantity
* Other relevant inventory information

The owner should not need to search manually for the affected batch.

---

# 43. Low Stock

Low-stock information should be based on configured/relevant thresholds.

The system should distinguish:

```text
Healthy stock
Low stock
Out of stock
```

Do not treat these as merely UI colors.

The underlying inventory state must be correct.

---

# 44. Audit Principle

The general rule is:

> If a change affects business truth, it must be auditable.

Examples:

* Stock changes
* Invoice cancellation
* Returns
* Price changes where applicable
* Important customer credit changes
* Master data changes
* Permission changes

Do not provide uncontrolled direct database-style editing through the UI.

---

# 45. Offline Business Operations

The following workflows should be designed to continue operating without
internet connectivity on supported offline clients:

* Billing
* Purchase
* Inventory operations
* Customer operations
* Supplier operations
* Other approved operational workflows

The user should not be presented with unnecessary technical terminology.

Do not label ordinary UI actions as:

```text
Offline-first
Replication
Event sourcing
Conflict resolution
```

unless the user actually needs to know.

---

# 46. Synchronization Behavior

When connectivity exists:

* Synchronize automatically.
* Retry pending changes.
* Keep local pending records until successfully synchronized.
* Avoid duplicate transactions.
* Provide a manual synchronization action.
* Allow users to understand whether synchronization is healthy.

Suggested synchronization behavior:

```text
Transaction completed
        ↓
Saved locally
        ↓
Attempt synchronization
        ↓
Success
    OR
Retry later
```

Synchronization failure must not destroy the completed local transaction.

---

# 47. No Emergency Billing Mode

Do not create a separate "Emergency Billing" product mode.

Normal billing should work whether the device is connected or temporarily
offline.

The user should not need to learn a different billing workflow merely because
internet connectivity is unavailable.

---

# 48. WhatsApp

WhatsApp invoice delivery is NOT part of the current MVP.

Do not introduce WhatsApp messaging infrastructure into the core billing
workflow.

The architecture may leave room for future invoice delivery integrations.

---

# 49. Loyalty and AI Analytics

The following are outside the current MVP:

* Loyalty points
* AI analytics
* Advanced cloud analytics
* AI-powered recommendations
* Other advanced intelligence features

Do not introduce them into core modules unless explicitly requested.

---

# 50. Business Rule Priority

When implementing a feature, use this priority:

```text
1. Legal/safety requirement
        ↓
2. Explicit Inventra business rule
        ↓
3. Approved product requirement
        ↓
4. Existing domain invariant
        ↓
5. Technical best practice
        ↓
6. Developer assumption
```

Developer assumptions are the lowest priority.

If a business rule is unclear and materially affects data correctness,
stop and ask rather than inventing one.

---

# 51. AI Implementation Rules

Before implementing a business feature:

1. Identify the affected domain.
2. Read the relevant business rules.
3. Identify invariants.
4. Identify transaction boundaries.
5. Identify audit requirements.
6. Identify offline implications.
7. Identify synchronization implications.
8. Identify tenant isolation requirements.
9. Identify affected APIs.
10. Identify affected database records.
11. Implement.
12. Test the happy path.
13. Test invalid states.
14. Test duplicate/retry behavior where relevant.
15. Test tenant isolation where relevant.

---

# 52. Non-Negotiable Business Invariants

The following must never be violated:

### Inventory

```text
Available quantity cannot become negative
unless an explicitly approved business policy permits it.
```

### Returns

```text
Returned quantity cannot exceed eligible sold quantity.
```

### Payments

```text
Recorded payment allocations must reconcile with the invoice.
```

### Tenant isolation

```text
Tenant A cannot access Tenant B business data.
```

### Completed transactions

```text
Historical completed transactions cannot be silently overwritten.
```

### Audit

```text
Important business corrections must remain traceable.
```

### Synchronization

```text
Retrying the same transaction must not create duplicate business records.
```

### Product master

```text
Tenant-specific selling behavior must not overwrite authoritative
Product Master information.
```

---

# 53. Final Principle

Inventra is not merely a CRUD application.

The following are business-critical domains:

```text
Purchase
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

Every one of these must preserve:

* Correctness
* Traceability
* Tenant isolation
* Transaction integrity
* Auditability
* Offline safety
* Synchronization safety

When in doubt, protect business data first and optimize convenience second.
