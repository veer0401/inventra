---
name: inventra-frontend-platform
description: >
  Defines the frontend architecture and platform rules for Inventra Web,
  Desktop, and Android applications. Establishes the client/backend boundary,
  shared API contracts, authentication, offline capabilities, synchronization
  behavior, state management, error handling, permissions, responsive design,
  platform-specific UI responsibilities, and cross-platform consistency.
  Use this skill whenever implementing, modifying, reviewing, or testing any
  Inventra frontend, including Web, Desktop, or Android.
---

# Inventra Frontend Platform Rules

## 1. Purpose

Inventra has three client applications:

```text
Web
Desktop
Android
````

All three are clients of the Inventra backend.

They may have different:

* UI
* Navigation
* Screen layouts
* Input methods
* Local storage
* Platform integrations

But they must follow the same:

* Business rules
* API contracts
* Authentication model
* Authorization model
* Tenant boundaries
* Transaction semantics
* Inventory rules
* Billing rules
* Synchronization rules

---

# 2. Core Architecture

The overall relationship is:

```text
                    Inventra Backend
                          |
          +---------------+---------------+
          |               |               |
         Web           Desktop         Android
```

The clients must not directly access the cloud database.

Correct:

```text
Client
  ↓
API
  ↓
Backend
  ↓
Database
```

Incorrect:

```text
Client
  ↓
PostgreSQL
```

---

# 3. Platform Independence

The frontend platforms should not be forced to share UI code merely for the
sake of code reuse.

Shared behavior is more important than identical implementation.

The goal is:

```text
Same business behavior
+
Same API contracts
+
Same security rules
+
Platform-appropriate UI
```

not:

```text
One UI implementation everywhere
```

---

# 4. Web Application

The Web application is primarily designed for:

* Browser-based access
* Internet-connected operation
* Multi-device access
* Administrative workflows
* Reporting
* Management workflows

The Web application does not need to replicate every desktop/Android local
storage behavior unless explicitly required.

---

# 5. Desktop Application

The Desktop application is intended for pharmacy/shop operations such as:

* Billing
* Inventory
* Purchases
* Customer management
* Supplier management

It must support working without an active internet connection where the
feature has been designed for offline operation.

---

# 6. Android Application

The Android application must support the operational workflows that make sense
on mobile/tablet devices.

Important examples include:

* Billing
* Product search
* Inventory access
* Customer access
* Purchase-related operations where appropriate

Android must also support local operation for workflows explicitly designed
to work without internet connectivity.

---

# 7. Offline Capability

Offline operation is a product feature.

Do not present the architecture to users using unnecessary technical terms
such as:

```text
offline-first
online-second
```

The user-facing behavior is simply:

> Billing and supported operations can continue even when the internet is
> unavailable.

---

# 8. Offline Does Not Mean Unlimited Local Authority

Offline clients can perform approved local operations.

They must not become an independent security authority.

The backend remains authoritative when connectivity exists.

The local application must not be allowed to manufacture:

```text
OWNER permissions
Another tenant
Fake stock
Fake prices
Fake transactions
```

and then expect the backend to trust them.

---

# 9. Local Database

Desktop and Android may maintain a local database/cache to support offline
operation.

The local database may contain:

* Required product data
* Required inventory data
* Local transaction data
* Pending synchronization records
* User/device information
* Required configuration

Do not copy the entire cloud database unnecessarily.

Only synchronize data required by the client and its authorized scope.

---

# 10. Cloud Database

The cloud database remains the shared source for synchronized business data.

The clients communicate through APIs.

The clients must not directly modify cloud database records.

---

# 11. Local Data Scope

Local data should be scoped to:

```text
Tenant
+
Store where applicable
+
Device
+
User permissions
```

Do not download unrelated tenant data merely because the device could store
it.

---

# 12. Data Minimization

A local client should store only the data necessary for:

* Current operation
* Offline functionality
* Synchronization
* Required local history
* User experience

Avoid unnecessarily replicating:

```text
Entire customer database
Entire transaction history
Entire analytics dataset
```

if the application does not need it.

---

# 13. API Boundary

The backend owns:

* Business rules
* Validation
* Authorization
* Tenant isolation
* Inventory correctness
* Financial correctness
* Transaction semantics

The frontend owns:

* Presentation
* User interaction
* Local state
* Local persistence where required
* Input assistance
* API communication
* UX error handling

---

# 14. Do Not Duplicate Business Rules Blindly

Frontend validation is useful.

Example:

```text
Quantity must be greater than 0.
```

The frontend may reject this immediately.

But the backend must validate it again.

Frontend validation improves UX.

Backend validation protects correctness.

---

# 15. API Contract

All clients must consume the defined backend API contract.

Do not invent client-specific versions of business behavior.

For example:

```text
Web:
POST /api/v1/invoices

Desktop:
POST /api/v1/invoices

Android:
POST /api/v1/invoices
```

unless there is an explicit platform-specific requirement.

---

# 16. API Versioning

Clients must use the API version they support.

Do not silently break older Desktop or Android applications because the Web
application was updated.

API changes must follow the API versioning rules.

---

# 17. DTOs

Frontend models should correspond to API DTOs.

Do not assume backend database entities are frontend models.

The frontend should not depend on:

```text
JPA Entity
Hibernate proxy
Database schema
```

---

# 18. API Error Handling

Clients must understand standard backend errors.

Example:

```text
API
 ↓
400 / 401 / 403 / 404 / 409 / 422 / 500
 ↓
Frontend
 ↓
User-appropriate message
```

Do not show raw server exceptions to users.

---

# 19. Error Categories

Frontend should distinguish between:

```text
Validation error
Authentication error
Authorization error
Conflict
Network failure
Server failure
Offline state
```

These should not all display the same generic message.

---

# 20. Network Failure

If the network is unavailable:

```text
Desktop/Android
    ↓
Supported offline operation
    ↓
Local database
    ↓
Pending synchronization
```

The UI should clearly indicate the operational state without blocking
supported offline workflows.

---

# 21. Online State

When connectivity exists:

```text
Client
 ↓
Backend
```

The client should synchronize according to the configured synchronization
behavior.

Do not require users to manually manage technical synchronization details for
normal operation.

---

# 22. Synchronization Indicator

Desktop and Android should provide a simple operational indicator such as:

```text
Synced
Syncing
Pending
Attention required
Offline
```

The user should be able to understand whether their data has synchronized.

---

# 23. Manual Sync

The application should provide a manual synchronization action where the
product design requires it.

Example:

```text
Sync now
```

This is especially useful for:

* Troubleshooting
* Owner verification
* Immediately pushing important transactions
* Pulling recent cloud changes

Manual synchronization does not replace automatic synchronization.

---

# 24. Automatic Sync

When connectivity exists, supported clients should automatically synchronize
according to the configured synchronization strategy.

The exact interval is a configuration decision.

Do not hardcode a magic interval throughout the frontend.

---

# 25. Sync UX

The UI should not make users understand:

```text
cursor
event log
outbox
inbox
idempotency key
```

unless they are viewing an advanced diagnostics area.

Normal users should see:

```text
Synced
Syncing...
Pending changes
Could not sync
```

---

# 26. Pending Transactions

When a transaction is created offline:

```text
Local transaction
    ↓
Persist locally
    ↓
Pending sync
```

The UI should not falsely claim:

```text
Cloud synchronized
```

when it has not yet synchronized.

---

# 27. Completed Offline Billing

If a billing transaction completes successfully while offline, the local
application should clearly indicate that the bill has been completed locally.

The transaction should retain its stable local/business identifier.

When synchronized, it must not become a second invoice.

---

# 28. Duplicate Prevention

Clients must use the synchronization/idempotency mechanisms defined by the
backend.

Never implement:

```text
if (internet available)
    create invoice
else
    create another invoice
```

without a stable transaction identity.

The same logical transaction must remain the same transaction.

---

# 29. Retry

Network failures should be retryable where appropriate.

Retry behavior must not create duplicate business transactions.

Example:

```text
Send invoice
 ↓
Timeout
 ↓
Retry
 ↓
Same transaction ID
```

---

# 30. Retry UX

The user should not be forced to repeatedly click:

```text
Complete
Complete
Complete
Complete
```

because the application cannot determine whether the first request succeeded.

The client should handle retry semantics appropriately.

---

# 31. Billing UX

Billing is one of the most important workflows.

The typical flow:

```text
Search product
 ↓
Select product
 ↓
Enter quantity
 ↓
Review cart
 ↓
Apply discount where allowed
 ↓
Select customer where applicable
 ↓
Payment
 ↓
Complete
 ↓
Invoice
```

The exact UI can differ between platforms.

---

# 32. Billing Speed

The billing UI should optimize for fast repetitive use.

Important characteristics:

* Fast product search
* Keyboard support on Desktop
* Touch-friendly controls on Android
* Clear totals
* Minimal unnecessary navigation
* Easy quantity editing
* Clear payment workflow

Do not prioritize decorative UI over transaction speed.

---

# 33. Barcode Scanning

Where platform hardware supports it, barcode scanning may be integrated.

The scanner should feed the same product lookup/business flow.

Do not create a completely separate billing logic path for scanning.

---

# 34. Product Search

Product search should support the fields defined by the product/API design.

Potential identifiers:

```text
Barcode
SKU
Product name
Generic name where supported
```

The exact search behavior must follow the product requirements.

---

# 35. Inventory UI

Inventory screens should expose operationally useful information.

Potential information:

```text
Product
Batch
Quantity
Expiry
Purchase price
Selling price
MRP
Stock status
```

Do not overload the normal billing interface with unnecessary inventory
information.

---

# 36. Purchase UI

Purchase workflows may involve:

```text
Supplier
Invoice/reference
Products
Batches
Expiry
Purchase price
Quantity
Taxes where applicable
```

The UI should make batch-level entry efficient.

---

# 37. Form State

Forms should have explicit states:

```text
Initial
Editing
Saving
Saved
Validation error
Server error
Offline pending
```

Do not allow users to accidentally submit the same operation repeatedly.

---

# 38. Loading States

Every network-dependent operation needs an appropriate loading state.

Examples:

```text
Searching
Loading products
Saving invoice
Synchronizing
Loading customer
```

Avoid frozen-looking screens.

---

# 39. Empty States

Empty states must explain what the user can do.

Bad:

```text
No data
```

Better:

```text
No suppliers found.
Add a supplier to start recording purchases.
```

---

# 40. Error States

Error states should tell the user:

1. What happened.
2. Whether the operation succeeded.
3. What they can do next.

Example:

```text
The invoice could not be synchronized.
Your local bill is محفوظ and will retry automatically.
```

Use the project's actual language/localization strategy rather than hardcoding
messages everywhere.

---

# 41. Authentication State

Clients must manage:

```text
Logged out
Authenticating
Authenticated
Refreshing session
Session expired
Offline authenticated
```

where applicable.

---

# 42. Session Expiry

If the access token expires:

```text
Access token expired
 ↓
Refresh if allowed
 ↓
Continue
```

If refresh fails:

```text
Session expired
 ↓
Require login
```

Do not silently perform operations using an invalid session.

---

# 43. Offline Authentication

Desktop and Android may allow previously authorized users to continue
supported operations without internet access.

The offline authentication mechanism must follow the security skill.

It must not provide unrestricted permanent access.

---

# 44. Logout

Logout should clear the appropriate local session state.

For offline-capable applications, define carefully what logout means when
there is no network.

Do not accidentally leave credentials available after logout.

---

# 45. User Switching

If the product supports multiple users on the same device, user switching
must respect:

```text
User permissions
Tenant
Store
Device
Offline authorization
```

Do not simply switch a username in local UI state.

---

# 46. Permission-Based UI

Frontend may use permissions to:

```text
Show
Hide
Disable
```

controls.

Example:

```text
Cashier:
No inventory adjustment button
```

But the backend must still enforce the permission.

---

# 47. Role-Based UI

Roles may be used as a convenient UI abstraction.

However, permissions are the stronger authorization concept.

Prefer:

```text
Can user perform invoice.cancel?
```

over:

```text
Is user OWNER?
```

when the permission model supports it.

---

# 48. Tenant Switching

If multi-tenant switching is ever supported, it must be explicit and securely
authorized.

Do not allow:

```text
tenantId = anotherTenant
```

to change the user's current tenant.

---

# 49. Navigation

Navigation should reflect the product modules.

Initial conceptual navigation:

```text
Dashboard
Billing
Purchases
Inventory
Customers
Suppliers
Reports
Settings
```

The final navigation may vary by role/platform.

---

# 50. Sidebar

The Web/Desktop applications may use a persistent sidebar.

The sidebar should:

* Reflect permissions
* Preserve active state
* Support future modules
* Use stable route names
* Avoid hardcoded links scattered across components

---

# 51. Android Navigation

Android may use:

* Bottom navigation
* Drawer
* Tabs
* Stack navigation

depending on workflow.

Do not force Desktop sidebar behavior onto Android.

---

# 52. Routing

Routes should be centralized.

Avoid scattering raw route strings throughout the application.

Prefer a central route definition.

---

# 53. Deep Links

Where useful, important screens should support stable deep-linking.

Example:

```text
/invoices/{id}
```

The exact route structure follows the frontend implementation.

---

# 54. State Management

Use state management appropriate to the frontend technology.

Separate:

```text
Server state
Local UI state
Form state
Offline persistence state
Authentication state
```

Do not place everything into one global state object.

---

# 55. Server State

Server state includes:

* Products
* Customers
* Suppliers
* Invoices
* Purchases
* Inventory
* Reports

The client should handle loading, stale, success, and error states.

---

# 56. Local UI State

Local UI state includes:

* Modal open/closed
* Selected tab
* Search field
* Temporary form state
* Sidebar state

Do not persist every UI variable into the database.

---

# 57. Offline State

Offline state is separate from normal UI state.

It may include:

```text
Pending transactions
Sync status
Last successful sync
Local data version
Conflict status
```

---

# 58. Cache Strategy

Cache only what provides measurable value.

Potential candidates:

```text
Products
Product search
Customers
Suppliers
Configuration
```

Do not cache sensitive or large datasets unnecessarily.

---

# 59. Cache Invalidation

When server data changes, the client must have a defined invalidation or
synchronization strategy.

Do not allow stale product or inventory data to remain indefinitely.

---

# 60. Inventory Freshness

Inventory is especially sensitive to stale data.

The UI should communicate freshness appropriately when relevant.

For example:

```text
Last synced: 2 minutes ago
```

may be more useful than silently showing potentially stale inventory.

---

# 61. Price Freshness

Prices may change.

When online, clients should use current authorized pricing.

Offline transactions must follow the offline pricing policy.

Do not silently overwrite historical transaction prices when new master data
arrives.

---

# 62. Historical Data

Frontend screens displaying completed transactions must use historical
transaction values.

Do not recalculate old invoices using current product prices.

---

# 63. Forms and DTO Mapping

Frontend forms should map explicitly to API request DTOs.

Avoid sending entire local objects to the API.

Example:

```json
{
  "productId": "...",
  "quantity": 2
}
```

is preferable to sending a huge local product object when only the ID and
quantity are required.

---

# 64. Optimistic UI

Optimistic UI may be used for low-risk operations.

Do not use optimistic updates blindly for critical financial/inventory
operations.

For billing/inventory:

```text
User action
 ↓
Transaction processing
 ↓
Confirmed state
```

must remain reliable.

---

# 65. Critical Transaction UI

For:

* Complete invoice
* Cancel invoice
* Record payment
* Inventory adjustment
* Complete purchase

the UI should clearly distinguish:

```text
Action requested
```

from:

```text
Action confirmed
```

---

# 66. Double Click Protection

Critical buttons should prevent accidental repeated submissions.

Examples:

```text
Complete invoice
Pay
Cancel invoice
Complete purchase
Save adjustment
```

Disable appropriately while the operation is being processed.

This does not replace backend idempotency.

---

# 67. Confirmation Dialogs

Use confirmations for high-impact destructive actions.

Examples:

```text
Cancel invoice
Delete/dismiss important data
Inventory adjustment
Remove user
Revoke device
```

Do not require confirmations for every trivial action.

---

# 68. Localization

The application should be designed so text can eventually be localized.

Do not scatter hardcoded user-facing strings throughout business logic.

---

# 69. Currency

Currency display must follow the product's configured currency.

The UI should not perform independent financial calculations that disagree
with the backend.

---

# 70. Date and Time

The frontend should correctly handle:

* Local timezone
* Server timestamps
* Date-only values
* Expiry dates
* Invoice timestamps

Do not blindly parse every date as a local date.

---

# 71. Numeric Input

Quantity and monetary inputs must use appropriate numeric handling.

Avoid floating-point calculations for critical monetary logic where the
frontend could display a value inconsistent with the backend.

The backend remains authoritative.

---

# 72. Accessibility

Critical workflows must be usable.

Desktop:

* Keyboard navigation
* Clear focus
* Shortcuts where useful

Android:

* Touch-friendly targets
* Readable text
* Accessible controls

Web:

* Keyboard navigation
* Semantic structure
* Appropriate focus management

---

# 73. Responsive Design

Web/Desktop layouts should adapt to reasonable screen sizes.

Do not assume:

```text
1920x1080
```

is the only environment.

---

# 74. Desktop Window Sizes

Desktop application workflows should remain usable at smaller window sizes.

Do not create screens that require an enormous monitor to complete billing.

---

# 75. Android Screen Sizes

Android UI must account for:

* Phone
* Tablet
* Different aspect ratios
* Portrait
* Landscape where supported

---

# 76. Touch vs Mouse

Desktop:

```text
Mouse
Keyboard
Barcode scanner
```

Android:

```text
Touch
Camera/barcode scanner where supported
```

The workflow can adapt to input method without changing the business rule.

---

# 77. Keyboard Shortcuts

Desktop may provide shortcuts for high-frequency actions.

Examples may include:

```text
Search
Add item
Complete bill
```

Do not create shortcuts that conflict with common operating-system behavior.

---

# 78. Print Support

Desktop/Web may support invoice printing where required.

Printing must use the same invoice data as the backend transaction.

Do not generate a different invoice total locally.

---

# 79. PDF/Invoice Generation

If invoices are generated on the client, the data must come from the
authoritative transaction response.

For legally/operationally sensitive documents, consider server-generated
documents where appropriate.

The exact implementation is a product decision.

---

# 80. File Handling

Clients should validate:

* File type
* File size
* Upload state
* Failure state

Never assume the extension alone proves a file's safety.

---

# 81. Camera Permissions

Android should request camera permissions only when a feature requires them,
such as barcode scanning.

Do not request permissions unnecessarily.

---

# 82. Local Storage Security

Local storage may contain sensitive data.

Do not store:

```text
Passwords
Raw access tokens
Raw refresh tokens
```

in insecure plain-text storage.

Follow the security skill.

---

# 83. Local Database Security

The local database must be protected appropriately for the platform.

The frontend must not expose database files through user-accessible APIs or
downloads.

---

# 84. Application Updates

Desktop and Android clients will eventually have different release cycles.

The backend must tolerate supported client versions.

Do not assume:

```text
Backend v2
```

means every device instantly runs:

```text
Client v2
```

---

# 85. Minimum Supported Client Version

The backend may eventually enforce minimum client versions for security or
protocol compatibility.

If implemented, the API should return a clear machine-readable error.

Example:

```text
CLIENT_VERSION_UNSUPPORTED
```

---

# 86. Forced Upgrade

Do not force upgrades for ordinary feature changes unless necessary.

Forced upgrades are appropriate when:

* Security vulnerability exists
* API compatibility breaks
* Data corruption risk exists
* Critical synchronization protocol changes

---

# 87. Feature Flags

Feature flags may be used for controlled rollout.

Example:

```text
new_purchase_flow
```

Do not scatter random boolean checks throughout business logic.

Centralize feature flag evaluation.

---

# 88. Feature Flag Security

Never use frontend-only feature flags to protect privileged functionality.

A hidden button is not authorization.

---

# 89. Platform-Specific Features

Platform-specific capabilities may exist.

Examples:

```text
Desktop:
Printing
Keyboard shortcuts
Local filesystem integration where appropriate

Android:
Camera
Barcode scanning
Mobile notifications where appropriate

Web:
Browser navigation
Responsive layout
Web-based reporting
```

These should remain platform adapters rather than changing business rules.

---

# 90. Shared Design System

All three platforms should share the same product visual language where
practical:

* Brand colors
* Typography principles
* Status semantics
* Form behavior
* Error terminology
* Button hierarchy
* Data terminology

However, exact components may differ by platform.

---

# 91. Brand Consistency

The same concept should look semantically consistent.

Example:

```text
Success
Warning
Error
Pending
Offline
Synced
```

should use consistent meaning across Web/Desktop/Android.

---

# 92. UI Does Not Define Business State

Do not infer business state from UI labels.

Example:

```text
Green button
```

does not mean:

```text
Invoice completed
```

The backend/local transaction state determines the actual state.

---

# 93. Frontend Security

Never rely on frontend hiding to protect:

* Routes
* APIs
* Tenant data
* Permissions
* Admin features

All sensitive operations must be protected by backend authorization.

---

# 94. Frontend Environment Variables

Frontend configuration must not contain:

* Database credentials
* JWT signing keys
* Private API secrets

Anything shipped to the browser/mobile/desktop client should be assumed
potentially discoverable by the user.

---

# 95. API Base URL

API endpoints should be configured per environment.

Examples:

```text
Development
Staging
Production
```

Do not hardcode production URLs throughout source code.

---

# 96. Environment Separation

The frontend should support distinct environments.

Example:

```text
dev
staging
production
```

Do not accidentally point development clients to production data.

---

# 97. Logging on Clients

Client logging is useful for diagnostics.

However:

* Do not log secrets.
* Do not log unnecessary personal data.
* Production logging should be controlled.
* Diagnostic logs should not expose business information unnecessarily.

---

# 98. Crash Reporting

Desktop and Android may eventually use crash reporting.

Crash reports must be reviewed for sensitive data leakage.

Web errors may be captured through the chosen observability system.

---

# 99. Frontend Performance

Optimize actual bottlenecks.

Important areas:

* Product search
* Billing
* Inventory lists
* Large tables
* Initial application startup
* Synchronization

Do not add complex optimization infrastructure prematurely.

---

# 100. Large Lists

Do not render enormous datasets into the UI simultaneously.

Use:

* Pagination
* Virtualization
* Server-side filtering
* Search

where appropriate.

---

# 101. Billing Product Search

Billing product search must feel immediate.

Potential approach:

```text
User types
 ↓
Local searchable cache where available
 ↓
Cloud search when needed
 ↓
Display results
```

The exact implementation depends on the platform and synchronization model.

---

# 102. Offline Search

Desktop/Android should support product search offline when the required product
catalogue is available locally.

The local search must use the user's authorized local dataset.

---

# 103. Offline Inventory

Inventory displayed offline must be clearly understood as local/current-known
inventory.

Do not claim it is globally current when synchronization has not occurred.

---

# 104. Conflict UX

Conflicts should not be presented as:

```text
Something went wrong.
```

when the system can explain:

```text
This transaction requires synchronization review.
```

The exact wording should remain user-friendly.

---

# 105. Sync Failure UX

When sync fails:

```text
Transaction completed locally.
Sync pending.
```

is fundamentally different from:

```text
Transaction failed.
```

Do not confuse these states.

---

# 106. Transaction State Model

Frontend should distinguish states such as:

```text
Draft
Processing
Completed
Pending synchronization
Synchronized
Failed
Cancelled
Conflict
```

The exact state machine follows the backend/domain design.

---

# 107. State Transitions

Do not allow the frontend to arbitrarily transition business states.

Example:

```text
Cancelled
```

must not become:

```text
Completed
```

simply because the UI changed a variable.

The backend/domain rules control valid transitions.

---

# 108. Navigation After Transaction

After completing billing:

```text
Complete
 ↓
Confirmed transaction
 ↓
Invoice/receipt
```

The UI should provide a clear path to:

* Print
* Share where supported
* New bill
* View transaction

---

# 109. Unsaved Changes

Forms with important unsaved changes should warn users before navigation.

Especially:

* Purchase entry
* Inventory adjustment
* Complex settings

Do not interrupt simple search/filter operations unnecessarily.

---

# 110. Accessibility of Errors

Validation errors should be attached to the relevant fields where possible.

Do not display:

```text
Invalid form
```

without identifying what needs correction.

---

# 111. Empty Inventory States

If there are no products:

```text
No products found.
```

should explain the next useful action where appropriate.

---

# 112. Permission Empty States

If a user cannot access a module:

Do not display an empty module and make them think the system is broken.

Hide or clearly deny access according to the navigation/security design.

---

# 113. API Timeout

Clients should have sensible timeout handling.

A timeout does not automatically mean:

```text
Transaction failed.
```

For critical operations, the client must determine transaction state using
idempotency/status mechanisms before allowing a duplicate retry.

---

# 114. Network Reconnection

When the device reconnects:

```text
Connectivity restored
 ↓
Synchronize pending operations
 ↓
Pull relevant changes
 ↓
Update UI
```

The UI should not require a full application restart.

---

# 115. Background Sync

Desktop/Android may synchronize in the background when supported by the
platform.

Background synchronization must respect:

* Battery
* Network conditions
* Security
* Platform restrictions

---

# 116. Battery Awareness

Android background sync must not unnecessarily drain battery.

Use platform-appropriate background scheduling.

Do not implement an aggressive infinite polling loop.

---

# 117. Polling

When polling is required, use centralized configurable intervals.

Avoid:

```text
setInterval(..., 1000)
```

throughout multiple components.

---

# 118. Realtime Updates

Realtime updates may be used where valuable.

Examples:

```text
Inventory changes
Sync status
Multi-counter updates
```

Do not introduce WebSockets/realtime infrastructure merely because it is
technically possible.

---

# 119. Multi-Counter Awareness

If multiple counters operate in the same pharmacy:

```text
Counter A
Counter B
Counter C
```

clients should synchronize shared business state.

The UI may show current-known inventory freshness.

The backend remains authoritative for conflict handling.

---

# 120. Avoid Duplicate Business Logic

Do not implement:

```text
Billing rules in Web
Billing rules differently in Desktop
Billing rules differently in Android
```

Business rules belong in the backend/domain.

Client code should focus on presentation, interaction, and local operation
requirements.

---

# 121. Shared API Client

Each frontend should have a clear API client abstraction.

Avoid scattering:

```text
fetch(...)
axios(...)
httpClient(...)
```

through every component.

---

# 122. API Client Responsibilities

The API client layer should handle:

* Base URL
* Authentication headers
* Token refresh
* Standard errors
* Request IDs where applicable
* Serialization
* Timeout
* Retry policy where appropriate

---

# 123. Business Service Layer

Frontend may have application services such as:

```text
BillingService
InventoryService
PurchaseService
CustomerService
```

These should orchestrate frontend behavior without duplicating backend
business rules.

---

# 124. Component Responsibilities

UI components should focus on:

* Rendering
* User interaction
* Local presentation state

Avoid putting large business workflows directly inside UI components.

---

# 125. Screen Responsibilities

Screens should orchestrate:

```text
Route
 ↓
Data loading
 ↓
UI state
 ↓
User interaction
 ↓
Service/API call
 ↓
Result handling
```

They should not become giant files containing the entire application.

---

# 126. Shared Terminology

Use the same domain terms across:

```text
Backend
Web
Desktop
Android
Database
Documentation
```

Examples:

```text
Invoice
Purchase
Batch
Supplier
Customer
Inventory
Stock Adjustment
```

Do not call the same entity:

```text
Bill
Receipt
Sale
Invoice
```

randomly across different clients.

---

# 127. API Documentation

Frontend developers should consume the API documentation rather than
guessing request/response structures.

OpenAPI should be treated as the contract where applicable.

---

# 128. Mock Data

Mock data may be used during UI development.

However, mock data must not become an accidental permanent API contract.

Before integration, verify against the actual backend contract.

---

# 129. Development Without Backend

Frontend screens may initially use mocked APIs.

Once the backend endpoint exists:

```text
Mock
 ↓
Real API
```

must be a controlled transition.

Do not maintain two divergent business implementations.

---

# 130. Screen-First Development

For complex modules, screens can be built before backend completion to map:

```text
Screen
 ↓
Required data
 ↓
Required actions
 ↓
Required API
 ↓
Backend implementation
```

This is encouraged during early product development.

---

# 131. Screen Mapping

Each major screen should document:

```text
Route
Purpose
Inputs
API calls
Data displayed
Actions
Permissions
Offline behavior
Loading state
Error state
Empty state
```

This becomes the bridge between frontend and backend implementation.

---

# 132. Login Screen

Login must support:

* User identifier
* Password
* Validation
* Loading state
* Authentication error
* Forgot password where supported
* Session handling

Do not implement security decisions solely in the screen.

---

# 133. Signup

Signup should use the backend registration contract.

The frontend must not assume that creating a user automatically creates an
authorized tenant/admin relationship unless the backend contract explicitly
defines that behavior.

---

# 134. Dashboard

Dashboard should consume backend data.

Do not calculate authoritative financial or inventory values independently from
partial frontend state.

---

# 135. Billing

Billing must be treated as a critical workflow.

The frontend must preserve:

```text
Transaction identity
Payment information
Line items
Quantities
Discounts
Customer
```

until the transaction is safely completed.

---

# 136. Purchase

Purchase screens should support batch-level data where required.

The UI must not hide important fields merely to make the screen simpler.

---

# 137. Inventory

Inventory UI must distinguish:

```text
Available quantity
Reserved/committed quantity where applicable
Pending synchronization
```

according to the final domain model.

---

# 138. Customer

Customer screens must respect tenant authorization and privacy rules.

Do not expose customer data globally.

---

# 139. Supplier

Supplier screens must remain tenant-scoped.

Purchase history must retain historical supplier references.

---

# 140. Reports

Reports may use backend aggregation.

Do not load huge raw datasets into the frontend simply to calculate totals
locally.

---

# 141. Settings

Settings should be divided into logical categories.

Potential categories:

```text
Business
Billing
Inventory
Users
Security
Device
Synchronization
```

Only show settings the user is authorized to modify.

---

# 142. Device Settings

Desktop/Android may expose:

```text
Device name
Sync status
Last sync
Application version
```

Security-sensitive device actions require backend authorization.

---

# 143. Support Diagnostics

An authorized diagnostic screen may show:

```text
App version
API version
Last successful sync
Pending sync count
Device ID
Connection status
Recent sync errors
```

Never expose secrets.

---

# 144. Frontend Architecture Principle

Keep the frontend layered.

Conceptually:

```text
UI
 ↓
Application/Feature Layer
 ↓
API/Repository Layer
 ↓
Local Storage / Network
```

Do not let every component directly manage HTTP, local database, and business
state simultaneously.

---

# 145. Platform Adapters

Platform-specific behavior should be isolated.

Examples:

```text
PrintingAdapter
BarcodeScanner
SecureStorage
ConnectivityMonitor
LocalDatabase
```

The feature logic should consume abstractions where practical.

---

# 146. Desktop Local Storage

Desktop-specific local persistence should be hidden behind a storage
abstraction.

Do not let every screen execute raw SQL.

---

# 147. Android Local Storage

Android-specific local persistence should likewise be hidden behind a data
layer.

Do not put database operations directly inside UI components.

---

# 148. Web Storage

Web storage should be used carefully.

Do not place sensitive authentication material into insecure storage merely
because it is convenient.

Follow the security architecture.

---

# 149. Frontend Testing

Each frontend should include:

```text
Unit tests
Component tests
Integration tests
Critical workflow tests
```

where appropriate.

---

# 150. Frontend Critical Tests

At minimum test:

```text
Login
Billing
Payment
Purchase
Inventory
Offline transaction
Sync
Logout
Permission-based UI
```

according to platform support.

---

# 151. Cross-Platform Consistency Testing

The exact UI does not need to match.

The business behavior must.

Example:

```text
Desktop billing
Android billing
Web billing
```

must ultimately produce the same backend business semantics.

---

# 152. Frontend Definition of Done

A screen/module is complete when:

* [ ] UI implemented.
* [ ] API mapped.
* [ ] Loading state implemented.
* [ ] Empty state implemented.
* [ ] Error state implemented.
* [ ] Permission behavior implemented.
* [ ] Offline behavior defined where applicable.
* [ ] Synchronization behavior defined where applicable.
* [ ] Critical interaction tested.
* [ ] API integration verified.
* [ ] Responsive/platform behavior verified.

---

# 153. AI Implementation Workflow

When implementing a frontend feature:

1. Read this skill.
2. Read the relevant domain skill.
3. Read the API skill.
4. Identify the screen.
5. Identify required API calls.
6. Identify required permissions.
7. Identify online/offline behavior.
8. Identify loading/error/empty states.
9. Implement API abstraction.
10. Implement feature state.
11. Implement UI.
12. Implement platform-specific behavior where required.
13. Add tests.
14. Verify backend integration.
15. Verify offline/sync behavior where applicable.
16. Verify security boundaries.
17. Review Definition of Done.

---

# 154. Final Principle

Inventra is one product with three client platforms.

It should feel like:

```text
One Inventra
```

not:

```text
Three unrelated applications.
```

But that does not mean every platform must look identical.

The correct model is:

```text
                Shared Backend
                     |
          Shared Domain Semantics
                     |
       +-------------+-------------+
       |             |             |
      Web         Desktop       Android
       |             |             |
   Browser UI    Local UI      Mobile UI
```

> Share the rules and contracts. Adapt the experience to the device.

