---
name: inventra-mvp-scope
description: >
  Defines the strict MVP scope for Inventra, including supported platforms,
  core pharmacy workflows, modules, priorities, exclusions, release phases,
  product boundaries, and rules preventing unauthorized feature expansion.
  Use this skill whenever planning, implementing, reviewing, or proposing
  Inventra features.
---

# Inventra MVP Scope

## 1. Purpose

This document defines what Inventra is building first.

The MVP must be:

- Reliable
- Simple to operate
- Affordable to deploy
- Useful for small pharmacies/medical shops
- Capable of working without internet for supported workflows
- Available across Web, Desktop, and Android
- Secure
- Maintainable

The MVP is not intended to be a complete enterprise ERP.

---

# 2. Target Customer

Inventra primarily targets:

- Small pharmacies
- Independent medical shops
- Tier-2 and Tier-3 market businesses
- Shops currently using notebooks, paper, Excel, or basic/manual systems
- Businesses that want affordable digital billing and inventory management

The product must not assume:

```text
Large enterprise IT teams
Dedicated infrastructure staff
Complex server rooms
Expensive hardware
High technical expertise
````

---

# 3. Core Product Promise

Inventra should solve the fundamental problem:

> Run a pharmacy/medical-shop business digitally without requiring the owner
> to become an IT administrator.

The product should make it easy to:

```text
Sell
Buy
Track stock
Manage products
Manage customers
Manage suppliers
Track transactions
Operate without internet
Synchronize when connectivity returns
```

---

# 4. Supported Platforms

Inventra MVP has three client platforms:

```text
Web
Desktop
Android
```

These are part of the product strategy.

Do not remove one platform from the MVP merely to simplify development unless
explicitly approved.

---

# 5. Platform Responsibilities

## Web

Primary use cases:

* Business management
* Owner access
* Inventory management
* Purchases
* Customer/supplier management
* Reports
* Settings
* Administrative operations

The Web application primarily assumes internet connectivity.

---

## Desktop

Primary use cases:

* Billing
* Inventory
* Purchases
* Product search
* Customer operations
* Supplier operations

Desktop must support supported workflows without internet connectivity.

---

## Android

Primary use cases:

* Billing
* Product search
* Inventory access
* Customer access
* Supported purchase operations
* Owner access
* Operational management

Android must support supported local/offline workflows.

---

# 6. Offline Requirement

Offline capability is a core MVP feature.

Users must be able to continue supported business operations even when the
internet is unavailable.

At minimum, this includes:

```text
Billing
Product lookup
Required inventory operations
Supported purchase operations
```

The exact offline dataset is determined by synchronization requirements.

---

# 7. Offline Is Not a Separate Emergency Mode

Do not design offline operation as:

```text
Emergency Billing
```

or:

```text
Emergency Mode
```

Offline capability is part of normal application behavior.

The user should be able to operate normally whether connectivity is available
or temporarily unavailable.

---

# 8. Synchronization

When internet connectivity exists:

```text
Local changes
    ↓
Synchronization
    ↓
Cloud backend
```

and relevant cloud changes:

```text
Cloud backend
    ↓
Synchronization
    ↓
Local clients
```

should be synchronized according to the application's synchronization
strategy.

---

# 9. Automatic Synchronization

The MVP should support automatic synchronization when connectivity is
available.

The exact interval/configuration should be defined by the synchronization
architecture.

Do not hardcode a business requirement such as:

```text
Exactly 5 minutes
```

unless explicitly decided.

---

# 10. Manual Synchronization

Desktop and Android should provide a manual synchronization action where
appropriate.

Example:

```text
Sync Now
```

This is important because users may want to immediately verify that changes
have reached the cloud.

---

# 11. Synchronization Status

The UI should make synchronization state understandable.

Possible states:

```text
Synced
Syncing
Pending
Offline
Attention Required
```

Do not expose unnecessary technical terminology to normal users.

---

# 12. Multiple Devices

Inventra must support multiple client devices belonging to the same business.

Example:

```text
Owner Android
Counter 1 Desktop
Counter 2 Desktop
Web Browser
```

The system must account for multiple clients changing shared data.

---

# 13. Multiple Counters

The MVP must not assume that only one billing device exists.

A pharmacy may have:

```text
Counter A
Counter B
Counter C
```

Inventory and transaction correctness must account for concurrent activity.

---

# 14. Cloud Backend

The backend provides the shared business system.

It is responsible for:

* Authentication
* Authorization
* Tenant isolation
* Business rules
* Inventory correctness
* Billing correctness
* Purchase correctness
* Synchronization
* Persistent cloud data

---

# 15. Local Database

Desktop and Android may maintain local databases required for offline
operation.

Local storage is not a replacement for the cloud system.

It exists to support:

```text
Offline operation
Local transaction persistence
Synchronization
Fast local access
```

---

# 16. No Hardware Dependency in MVP

Do not design the MVP around:

```text
Dedicated mini PC
Local network server
NAS
Custom hardware
POS terminal
Specialized pharmacy hardware
```

The product is software-first.

Hardware integrations may be added later.

---

# 17. MVP Authentication

Authentication is required.

MVP includes:

* Login
* Logout
* Session management
* Password reset
* User registration/onboarding where applicable
* Authorization
* Role/permission handling

Do not implement social login unless explicitly required.

---

# 18. User Management

MVP should support appropriate business users.

Initial roles may include:

```text
Owner/Admin
Manager
Cashier/Staff
```

The final permission matrix should be defined by the security/domain rules.

Do not create dozens of roles unnecessarily.

---

# 19. Tenant Isolation

Each business must have isolated data.

A user belonging to Business A must not access Business B's:

* Products
* Customers
* Suppliers
* Inventory
* Purchases
* Invoices
* Payments

Tenant isolation is an MVP security requirement.

---

# 20. Product Management

MVP includes product master management.

A product should support the information required by the pharmacy workflow.

Potential information:

```text
Product name
Generic name where applicable
Barcode
SKU
Category
Unit
MRP
Selling price
Purchase price where appropriate
Tax information where required
```

The final schema follows the domain/database design.

---

# 21. Batch Management

Batch-level inventory is important for pharmacy operations.

MVP should support where required:

```text
Batch number
Expiry date
Quantity
Purchase price
Selling price/MRP
```

Do not reduce pharmacy inventory to a simplistic:

```text
Product → Quantity
```

model if batch/expiry tracking is required.

---

# 22. Expiry Tracking

MVP should support identifying products/batches approaching or passing expiry.

The exact alert/report experience can evolve.

Do not build an advanced notification platform for this.

---

# 23. Inventory

MVP includes inventory management.

Core capabilities:

* View stock
* Search products
* Batch visibility
* Stock movements
* Stock adjustments
* Purchase stock addition
* Sales stock deduction
* Returns where supported
* Expiry handling where required

---

# 24. Inventory History

Inventory changes must be traceable.

Examples:

```text
Purchase
Sale
Return
Adjustment
Expiry/write-off
```

Do not maintain inventory only as a mutable quantity with no movement history.

---

# 25. Billing

Billing is a core MVP module.

Minimum workflow:

```text
Search product
 ↓
Select product
 ↓
Quantity
 ↓
Cart
 ↓
Customer where applicable
 ↓
Payment
 ↓
Complete invoice
 ↓
Receipt/invoice
```

---

# 26. Billing Must Be Fast

Billing is one of the highest-frequency workflows.

The interface must prioritize:

* Fast search
* Quick quantity changes
* Clear totals
* Minimal clicks
* Keyboard support on Desktop
* Touch support on Android

Do not sacrifice billing speed for decorative UI.

---

# 27. Invoice

Completed billing transactions must have stable business identity.

An invoice should preserve its historical transaction values.

Changing a product's current price must not rewrite old invoices.

---

# 28. Invoice Cancellation

MVP should support controlled invoice cancellation where required.

Cancellation must preserve historical transaction information.

Do not implement cancellation as simply deleting the invoice.

---

# 29. Payment

MVP should support the payment methods required for the initial product.

At minimum, the architecture must allow the selected payment methods to be
recorded accurately.

Do not build a payment gateway ecosystem into the MVP unless explicitly
required.

---

# 30. Purchase Management

MVP includes purchase management.

Core workflow:

```text
Supplier
 ↓
Purchase invoice/reference
 ↓
Products
 ↓
Batch
 ↓
Expiry
 ↓
Quantity
 ↓
Purchase price
 ↓
Taxes where applicable
 ↓
Complete purchase
 ↓
Inventory update
```

---

# 31. Supplier Management

MVP includes supplier management.

Core information may include:

```text
Name
Contact information
Address
Tax/business information where required
```

Do not build supplier CRM functionality.

---

# 32. Customer Management

MVP includes basic customer management.

Potential information:

```text
Name
Phone
Address where required
Transaction history
```

Do not build a marketing CRM into the MVP.

---

# 33. Customer History

Authorized users should be able to view relevant transaction history.

The system must respect tenant and permission boundaries.

---

# 34. Dashboard

MVP should have a useful operational dashboard.

It should prioritize information such as:

```text
Today's sales
Pending sync
Low stock
Expiring stock
Recent transactions
```

Do not turn the dashboard into an analytics platform.

---

# 35. Reporting

MVP should include basic operational reports.

Examples:

```text
Sales
Purchases
Inventory
Stock movements
Expiry
Basic financial summaries
```

Reports should answer practical shop-owner questions.

---

# 36. Advanced Analytics

Not MVP.

Do not build:

```text
Predictive analytics
AI forecasting
Business intelligence platform
Advanced cohort analysis
Customer segmentation
```

unless explicitly approved later.

---

# 37. AI

AI is not part of the core MVP.

Do not add:

```text
AI assistant
AI stock forecasting
AI recommendations
AI invoice interpretation
AI chatbot
```

merely because the project is technically capable of supporting AI.

---

# 38. WhatsApp

WhatsApp integration is not part of the core MVP.

Do not build:

```text
WhatsApp invoice delivery
WhatsApp marketing
WhatsApp reminders
WhatsApp customer support
```

unless explicitly approved.

---

# 39. Cloud Analytics

Advanced cloud analytics is not part of MVP.

The backend may collect operational metrics for system reliability, but this is
different from a customer-facing analytics platform.

---

# 40. Notifications

Only essential product notifications should be considered.

Do not build a generic notification platform in MVP.

---

# 41. Email Marketing

Not MVP.

Do not build:

```text
Campaigns
Mailing lists
Promotional emails
Marketing automation
```

---

# 42. Loyalty Programs

Not MVP.

Do not build:

```text
Points
Rewards
Membership tiers
Coupons ecosystem
```

unless explicitly approved.

---

# 43. CRM

Not MVP.

Basic customer records are required.

Full CRM functionality is not.

---

# 44. Accounting ERP

Inventra is not initially a complete accounting ERP.

Do not build a full:

```text
General ledger
Accounts payable system
Accounts receivable platform
Balance sheet engine
Profit/loss accounting suite
```

unless explicitly added to product scope.

---

# 45. Payroll

Not MVP.

---

# 46. HR

Not MVP.

---

# 47. Manufacturing

Not MVP.

---

# 48. E-Commerce

Not MVP.

Do not build:

```text
Online store
Shopping cart website
Marketplace
Delivery platform
```

as part of the core MVP.

---

# 49. Multi-Location Enterprise

Basic support for business/store context may be designed into the architecture.

But full enterprise multi-branch management is not an MVP priority.

Do not build complex:

```text
Branch hierarchy
Regional management
Franchise management
```

without approval.

---

# 50. Advanced Procurement

Basic purchasing is MVP.

Do not build:

```text
Supplier bidding
Purchase auctions
Complex procurement workflows
Vendor portals
```

---

# 51. Advanced Warehouse Management

Basic inventory is MVP.

Do not build a complete warehouse-management platform.

Avoid unnecessary:

```text
Warehouse wave picking
Bin optimization
Route optimization
Advanced fulfillment
```

---

# 52. Delivery Management

Not MVP.

---

# 53. Fleet Management

Not MVP.

---

# 54. Hardware Integration

Basic standard peripherals may eventually be supported.

But custom hardware is not an MVP requirement.

Potential later integrations:

```text
Barcode scanner
Printer
Cash drawer
Biometric device
```

Do not design the entire architecture around them now.

---

# 55. Barcode Scanner

Barcode scanning is useful for the MVP where available.

It should integrate with the existing product search/billing flow.

It must not create a separate billing business process.

---

# 56. Printing

Invoice/receipt printing is an important operational capability.

The implementation may differ by platform.

Do not make printing a prerequisite for completing a transaction.

---

# 57. PDF

Invoice/receipt PDF generation may be supported.

The document must use authoritative transaction data.

---

# 58. Security

MVP security includes:

* Authentication
* Authorization
* Password security
* Session security
* Tenant isolation
* Secure API communication
* Secret management
* Auditability of critical actions

Security is not a later-phase feature.

---

# 59. Audit Trail

Critical operations must be auditable.

Examples:

```text
Invoice cancellation
Inventory adjustment
User changes
Permission changes
Device changes
Important financial operations
```

---

# 60. Observability

Production observability is part of MVP engineering.

At minimum:

```text
Structured logs
Health checks
Error tracking
Request correlation
Synchronization monitoring
Basic metrics
```

Do not build a giant analytics dashboard.

---

# 61. Testing

MVP must include meaningful automated tests.

Priority:

```text
Business rules
Authentication
Authorization
Billing
Inventory
Purchases
Synchronization
Critical API behavior
```

---

# 62. End-to-End Testing

Critical workflows should eventually have end-to-end coverage.

Examples:

```text
Login
 ↓
Search product
 ↓
Create invoice
 ↓
Complete payment
 ↓
Inventory changes
```

and:

```text
Offline transaction
 ↓
Reconnect
 ↓
Synchronize
 ↓
Verify cloud transaction
```

---

# 63. Performance

MVP must be performant enough for the target environment.

Priorities:

* Fast billing
* Fast product search
* Responsive inventory
* Reasonable API latency
* Reliable synchronization

Do not prematurely optimize every endpoint.

---

# 64. Low-End Hardware

The MVP should remain usable on reasonably modest hardware.

Do not assume every customer has:

```text
High-end laptop
16+ GB RAM
Dedicated GPU
Fast SSD
High-speed internet
```

---

# 65. Internet Connectivity

The product must tolerate unreliable internet connectivity.

The solution should not assume:

```text
Permanent broadband
Perfect Wi-Fi
Zero packet loss
```

---

# 66. Mobile Connectivity

Android users may switch between:

```text
Wi-Fi
4G
5G
No connectivity
```

The application must handle connectivity changes safely.

---

# 67. Power Outage

Power loss must not corrupt completed local transactions.

Desktop/Android local persistence should ensure that supported completed
operations are not simply lost because the device shuts down.

---

# 68. Application Restart

After application restart:

```text
Pending transactions
Local data
Sync state
```

must remain recoverable.

Do not rely solely on in-memory state.

---

# 69. Crash Recovery

If the application crashes during a transaction, the system should be able
to determine whether the operation:

```text
Was not started
Was persisted locally
Was submitted
Was completed
Is pending synchronization
```

where applicable.

---

# 70. Duplicate Transactions

The architecture must prevent duplicate invoices caused by:

```text
Network timeout
Retry
App restart
Double click
Synchronization retry
```

---

# 71. Data Integrity

Inventory and billing correctness take priority over UI convenience.

Never introduce a shortcut that can cause:

```text
Incorrect stock
Duplicate invoice
Incorrect payment
Lost transaction
Cross-tenant data
```

---

# 72. MVP Pricing Philosophy

The architecture should support an affordable product.

Avoid infrastructure that creates unnecessary operational cost.

Examples to avoid prematurely:

```text
Many microservices
Complex message brokers
Multiple databases
Large analytics infrastructure
Heavy AI infrastructure
```

---

# 73. Deployment Philosophy

MVP deployment should be as simple as practical.

Prefer:

```text
One primary backend
One primary database
Simple supporting infrastructure
```

rather than a distributed system with many independently deployed services.

---

# 74. Microservices

Microservices are not an MVP requirement.

Do not split Inventra into microservices merely because multiple modules exist.

Modules can exist inside a modular monolith.

---

# 75. Modular Monolith

The preferred MVP backend approach is a modular monolith unless a concrete
requirement proves otherwise.

Conceptually:

```text
                 Inventra Backend
                       |
       +---------------+---------------+
       |               |               |
    Billing        Inventory        Purchasing
       |               |               |
       +---------------+---------------+
                       |
                   Database
```

---

# 76. Why Modular Monolith

It provides:

* Lower deployment complexity
* Lower infrastructure cost
* Easier transactions
* Easier local development
* Easier debugging
* Clear module boundaries
* Future extraction options

---

# 77. Future Extraction

Modules should be designed so that high-scale components can eventually be
extracted if necessary.

But do not build microservices now simply to prepare for a hypothetical
future.

---

# 78. Database Strategy

MVP should use a relational database appropriate for transactional workloads.

The final database choice is governed by the database architecture decision.

Do not introduce multiple primary databases without an explicit requirement.

---

# 79. Cloud Data

Cloud persistence is the shared synchronized data source.

Clients should synchronize required data rather than downloading everything.

---

# 80. Local Data

Local databases should contain only what is necessary to operate and
synchronize.

Do not replicate the entire cloud database onto every device.

---

# 81. Synchronization Scope

Synchronize:

```text
Required master data
Required transactional data
Required state changes
```

Do not synchronize unrelated data.

---

# 82. Synchronization Reliability

Synchronization must support:

* Retry
* Idempotency
* Failure visibility
* Conflict detection
* Recovery after restart
* Partial failure handling

---

# 83. Conflict Handling

The MVP must have an explicit conflict strategy.

Do not silently overwrite another device's changes.

The exact conflict rules belong to the synchronization/domain design.

---

# 84. Inventory Conflict

Inventory is especially sensitive.

Example:

```text
Desktop:
1 strip remaining
 ↓
Sale
 ↓
0 remaining

Android:
Stale data:
1 strip remaining
```

The system must not allow stale local state to silently become the new global
truth.

---

# 85. Transaction Identity

Offline-created transactions must have stable identifiers.

Synchronization must recognize:

```text
Same transaction
```

rather than:

```text
Another transaction
```

when a retry occurs.

---

# 86. Source of Truth

For synchronized cloud data:

```text
Backend/domain rules
```

are authoritative.

For an offline transaction before synchronization:

```text
Local persisted transaction
```

is the device's operational record.

After synchronization, it becomes part of the shared cloud transaction state.

---

# 87. No Three-Database Business Logic

Do not implement three independent business engines:

```text
Web business rules
Desktop business rules
Android business rules
```

The business semantics must remain aligned through the backend/domain model.

---

# 88. Web Offline

Full Web offline support is not required to the same extent as Desktop/Android
unless explicitly added to the product scope.

The primary offline clients are:

```text
Desktop
Android
```

---

# 89. Desktop Offline

Desktop must support the defined offline workflows.

At minimum:

```text
Billing
Product lookup
Required inventory data
Pending synchronization
```

---

# 90. Android Offline

Android must support the defined offline workflows.

At minimum:

```text
Billing
Product lookup
Required inventory data
Pending synchronization
```

---

# 91. Owner Visibility

Owners should be able to determine whether devices have synchronized.

This helps avoid situations where:

```text
Desktop sold stock
Owner checks Android
Android has stale inventory
```

without any indication that synchronization is pending.

---

# 92. Sync Timestamp

Clients should display the last successful synchronization time where useful.

Example:

```text
Last synced: 10:42 AM
```

This is more useful than pretending all local data is always current.

---

# 93. Manual Verification

The owner should be able to manually trigger synchronization when immediate
verification is needed.

---

# 94. No Manual Duplicate Billing Workflow

Do not solve synchronization problems by introducing:

```text
Emergency bill
Offline bill
Cloud bill
Phone bill
```

as separate business concepts.

There should be one billing concept.

---

# 95. Business Cancellation

If duplicate/incorrect transactions occur despite system protections, the
system should provide controlled cancellation/void workflows.

Do not solve data integrity problems through silent deletion.

---

# 96. MVP UI Principle

The UI should be:

```text
Clear
Fast
Readable
Touch-friendly
Keyboard-friendly where applicable
Consistent
```

It does not need to be visually extravagant.

---

# 97. Design System

Use the project's approved brand/design system.

Do not create random colors or components per screen.

---

# 98. UI Consistency

The following must remain consistent:

```text
Buttons
Forms
Tables
Dialogs
Status indicators
Errors
Success states
Navigation
```

---

# 99. Dashboard Scope

Dashboard should remain operational.

Do not build:

```text
AI dashboard
BI platform
Complex predictive charts
```

into the MVP.

---

# 100. Reports Scope

Reports should answer practical questions.

Examples:

```text
How much did we sell?
What was purchased?
What stock is available?
Which stock is expiring?
What transactions occurred?
```

---

# 101. Export

Basic export may be supported where useful.

Do not build a universal data export framework before the relevant business
requirements exist.

---

# 102. Import

Basic product/master-data import may be useful.

Potential later capability:

```text
Excel/CSV import
```

Do not make complex migration tooling part of the first implementation unless
required for onboarding.

---

# 103. Onboarding

MVP should make initial setup practical.

Potential setup flow:

```text
Create business
 ↓
Create owner
 ↓
Configure business
 ↓
Add/import products
 ↓
Add staff
 ↓
Start billing
```

---

# 104. Product Import

If bulk product onboarding is supported, it should be simple.

Do not require the shop owner to understand database concepts.

---

# 105. Demo Data

Development environments may include demo data.

Production must never accidentally initialize with fake demo transactions.

---

# 106. Seed Data

Only seed data that is intentionally required.

Do not seed:

```text
Fake customers
Fake invoices
Fake payments
```

into production.

---

# 107. Localization

The MVP should be architected so localization can be added without rewriting
the application.

Do not hardcode business terminology in a way that prevents localization.

---

# 108. India-Specific Requirements

Inventra is initially targeted at the Indian pharmacy/medical-shop market.

The product should account for relevant Indian business workflows.

However:

Do not assume every shop has identical tax, invoice, or regulatory
requirements.

Regulatory behavior must be explicitly defined before implementation.

---

# 109. GST

GST-related functionality should only be implemented according to explicitly
defined product requirements and applicable regulations.

Do not invent tax behavior.

---

# 110. Prescription Handling

Prescription-related functionality must not be invented without a clear
requirement.

Basic product/billing functionality is not automatically a prescription
management system.

---

# 111. Controlled Medicines

If controlled-drug workflows become required, they must be explicitly scoped.

Do not invent legal compliance behavior.

---

# 112. Regulatory Compliance

Compliance requirements must be identified explicitly.

Do not claim:

```text
"Fully legally compliant"
```

without verified requirements and implementation.

---

# 113. MVP Feature Priority

Features should be classified:

```text
P0 = Required for MVP
P1 = Important shortly after MVP
P2 = Later
```

---

# 114. P0 — Core MVP

The following are P0:

```text
Authentication
User/role management
Tenant isolation
Product management
Batch-aware inventory
Billing
Payments
Purchase management
Supplier management
Customer management
Inventory adjustments
Invoice history
Basic reports
Offline Desktop operation
Offline Android operation
Synchronization
Conflict/error handling
Audit trail for critical operations
Observability
Testing
```

---

# 115. P1 — Early Post-MVP

Potential P1 features:

```text
Advanced reports
Better import/export
More printing options
Additional payment integrations
Advanced expiry alerts
Expanded device management
More detailed owner dashboards
Additional business settings
```

These require explicit prioritization before implementation.

---

# 116. P2 — Later

Potential P2 features:

```text
AI
Advanced analytics
WhatsApp
Marketing
CRM
Loyalty
E-commerce
Advanced accounting
Multi-branch enterprise features
Advanced warehouse management
Hardware ecosystem
```

These are not part of the MVP.

---

# 117. Feature Gate

Before implementing a new feature, ask:

```text
Is it P0?
```

If not:

```text
Is there an explicit approval to implement it now?
```

If neither is true:

Do not build it.

---

# 118. No Scope Creep

The following reasoning is not sufficient:

```text
"It will only take a few hours."
```

or:

```text
"Since we already have the API, let's add it."
```

or:

```text
"AI can generate it quickly."
```

A feature still increases:

* Code
* Testing
* Maintenance
* Security surface
* Support burden
* Product complexity

---

# 119. No Premature Infrastructure

Do not add infrastructure because it might be useful someday.

Examples:

```text
Kafka
Redis
Elasticsearch
Kubernetes
Service mesh
Complex event platform
AI infrastructure
```

Require a concrete product/technical need.

---

# 120. No Premature Microservices

The MVP backend should remain a modular monolith unless explicitly changed.

---

# 121. No Premature Multi-Cloud

Do not design/deploy across:

```text
AWS
Azure
GCP
```

simultaneously.

Choose a practical deployment strategy.

---

# 122. No Premature Analytics Platform

Operational metrics are required.

A customer-facing analytics platform is not.

---

# 123. No Premature AI

AI must not become an excuse to avoid solving:

```text
Billing
Inventory
Synchronization
Reliability
```

correctly.

---

# 124. No Premature Marketplace

Inventra is software for the shop.

It is not initially:

```text
Pharmacy marketplace
Supplier marketplace
Consumer shopping platform
```

---

# 125. No Premature Ecosystem

Do not build an ecosystem before the core product is reliable.

Core product first:

```text
Billing
Inventory
Purchasing
Synchronization
```

---

# 126. MVP Release Gate

Before MVP release:

```text
Authentication works
Billing works
Inventory works
Purchases work
Customers work
Suppliers work
Offline operation works
Synchronization works
Multiple devices work
Critical permissions work
Critical audit trails work
Backups work
Monitoring works
Critical tests pass
```

---

# 127. MVP Stability Rule

A feature that works 95% of the time is not acceptable for:

```text
Billing
Payments
Inventory
Synchronization
```

These areas require stronger reliability expectations.

---

# 128. Data Loss Rule

Any feature that can cause:

```text
Lost invoice
Lost payment
Lost inventory movement
Lost offline transaction
```

must be treated as a critical defect.

---

# 129. Duplicate Transaction Rule

Any feature that can cause duplicate:

```text
Invoice
Payment
Inventory movement
Purchase
```

must be treated as a critical defect.

---

# 130. Security Rule

Any feature that can cause cross-tenant access is a critical security defect.

---

# 131. Offline Rule

Any change that can cause an offline transaction to disappear after:

```text
Restart
Crash
Power loss
Reconnect
```

must be treated as a critical defect.

---

# 132. Synchronization Rule

Any change that can silently overwrite another device's transaction or
inventory state is a critical defect.

---

# 133. Backward Compatibility

Before changing shared backend behavior, check:

```text
Web
Desktop
Android
Existing offline clients
Synchronization protocol
```

---

# 134. Database Compatibility

Before changing database structures:

```text
Check existing clients
Check migrations
Check historical data
Check synchronization
Check reports
```

---

# 135. Historical Data Rule

Never rewrite historical transactions simply because current master data has
changed.

Historical transaction data must remain historically accurate.

---

# 136. Product Master vs Transaction Data

Keep the distinction clear:

```text
Master Data
    ↓
Product
Customer
Supplier

Transactional Data
    ↓
Invoice
Purchase
Payment
Inventory Movement
```

A change to master data should not casually mutate historical transactions.

---

# 137. MVP Development Order

Recommended implementation order:

```text
1. Project foundation
2. Database foundation
3. Authentication
4. Tenant/user model
5. Product master
6. Inventory foundation
7. Billing
8. Purchase
9. Customers
10. Suppliers
11. Synchronization
12. Offline Desktop
13. Offline Android
14. Web workflows
15. Reports
16. Hardening
17. MVP release
```

The exact order may change if dependency analysis requires it.

---

# 138. Screen-First Mapping

Before implementing a major module:

```text
Screen
 ↓
User action
 ↓
Required data
 ↓
API
 ↓
Backend use case
 ↓
Database
 ↓
Offline behavior
 ↓
Synchronization
```

This prevents screens from being built without understanding their backend
requirements.

---

# 139. Backend-First Where Necessary

For critical domain behavior such as:

```text
Inventory
Billing
Payments
Synchronization
```

the domain and transaction model must be defined before finalizing the
frontend behavior.

---

# 140. Frontend-First Where Useful

For visual/interaction-heavy workflows, initial screens can be mapped before
backend completion.

However, the final implementation must integrate with the real API.

---

# 141. No Fake Backend

Mock APIs may be used during early UI development.

They must not be mistaken for completed backend functionality.

---

# 142. No Fake Offline

An offline screen that merely displays cached static data is not sufficient.

Offline support requires:

```text
Local persistence
Transaction safety
Pending state
Synchronization
Recovery
```

---

# 143. No Fake Sync

A button that says:

```text
Sync Complete
```

without actually synchronizing data is unacceptable.

---

# 144. No Fake Security

A hidden admin button is not security.

The backend must enforce authorization.

---

# 145. No Fake Inventory

A frontend quantity counter is not inventory management.

Inventory state must be backed by proper domain and persistence rules.

---

# 146. No Fake Billing

A UI that produces a PDF without creating a proper transaction is not billing.

Billing must create a valid business transaction.

---

# 147. Definition of Done — MVP Module

A module is MVP-ready only when:

* [ ] User workflow defined.
* [ ] Screens mapped.
* [ ] API contract defined.
* [ ] Domain rules defined.
* [ ] Database model defined.
* [ ] Authorization defined.
* [ ] Offline behavior defined where required.
* [ ] Synchronization behavior defined where required.
* [ ] Error states defined.
* [ ] Tests implemented.
* [ ] Observability implemented.
* [ ] Documentation updated.

---

# 148. Final Scope Principle

When deciding whether to build something:

Ask:

> Does this materially help a small pharmacy sell, buy, manage inventory, or
> operate reliably?

If the answer is no, it probably does not belong in the MVP.

---

# 149. Final AI Rule

The AI must not expand Inventra's scope by default.

If a requested feature is outside MVP scope:

1. Identify that it is outside MVP.
2. Explain where it belongs: P1/P2/later.
3. Do not implement it automatically.
4. Ask for explicit approval if implementation is requested.

---

# 150. Final Product Principle

Inventra wins by doing the fundamentals exceptionally well:

```text
Fast billing
+
Correct inventory
+
Simple purchasing
+
Reliable offline operation
+
Reliable synchronization
+
Affordable deployment
+
Simple user experience
```

Not by having the longest feature list.

> Build the pharmacy system that small shops actually need before building
> the ERP that sounds impressive in a sales presentation.
