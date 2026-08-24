---
name: inventra-sync-offline
description: >
  Defines Inventra's offline-capable desktop and Android behavior, local
  persistence, cloud synchronization, device identity, transaction
  idempotency, sync queues, retries, acknowledgements, conflict detection,
  inventory synchronization, duplicate prevention, and recovery rules. Use
  this skill whenever implementing, modifying, reviewing, or testing offline
  functionality, local databases, synchronization, device state, or
  multi-device transaction consistency.
---

# Inventra Offline & Synchronization Rules

## 1. Purpose

Inventra supports three client types:

- Web
- Desktop
- Android

The Web application normally communicates with the cloud backend.

Desktop and Android must be capable of continuing important operational
workflows without internet connectivity.

At minimum, offline operation must support the core pharmacy workflow,
including:

- Billing
- Inventory operations
- Purchases
- Customers
- Suppliers
- Other approved operational workflows

The user should not need to understand the underlying synchronization
architecture.

---

# 2. User-Facing Principle

Offline capability is a feature.

It is not a separate operating mode that requires the cashier to learn a
different workflow.

The user should be able to:

```text
Open application
    ↓
Search
    ↓
Bill
    ↓
Complete
````

regardless of whether internet connectivity is currently available.

Do not force the user to select:

```text
ONLINE MODE
OFFLINE MODE
EMERGENCY MODE
```

before normal operations.

---

# 3. No Emergency Billing Mode

Inventra must NOT implement a separate:

```text
Emergency Billing
```

workflow.

Normal billing must be capable of operating without internet connectivity
on supported offline clients.

The cashier should not need to know whether the transaction is currently
being synchronized.

---

# 4. Client Architecture

The intended high-level architecture is:

```text
                    CLOUD
                      |
               Inventra Backend
                      |
        +-------------+-------------+
        |                           |
      WEB                    Sync/API Layer
                                    |
                         +----------+----------+
                         |                     |
                      DESKTOP                ANDROID
                         |                     |
                    Local DB              Local DB
```

The desktop and Android applications may maintain local databases.

The local databases are not replacements for the cloud database.

They exist to support:

* Offline operation
* Local responsiveness
* Pending synchronization
* Recovery from temporary connectivity loss

---

# 5. Cloud Database

The cloud database remains the central shared business data store when
connectivity exists.

It contains the synchronized business state for the tenant.

However, an offline client may temporarily contain business transactions
that have not yet reached the cloud.

The system must explicitly represent this state.

---

# 6. Local Database

Desktop and Android may maintain a local database.

The local database should contain only data required by the client.

Do not automatically copy the entire cloud database to every device.

The local database should be designed around:

* Operational needs
* Synchronization
* Storage efficiency
* Offline search
* Pending transactions

---

# 7. Local Database Is Not a Dump

Do not implement:

```text
Cloud PostgreSQL
      ↓
Copy everything
      ↓
Local database
```

as the synchronization strategy.

The client should receive the data it actually needs.

Examples:

* Products relevant to the store
* Inventory relevant to the store
* Customers needed by the client
* Suppliers needed by the client
* Relevant transaction history
* Pending synchronization records

---

# 8. Local Data Retention

The product should avoid unnecessarily consuming local storage.

The local database should have a deliberate retention strategy.

Potentially large historical datasets should not automatically remain on every
device forever.

Retention rules must not remove information that is required to:

* Complete offline operations
* Synchronize pending transactions
* Maintain local auditability
* Recover from failed synchronization

---

# 9. Connectivity

Connectivity must be treated as dynamic.

The client may transition between:

```text
CONNECTED
    ↓
DISCONNECTED
    ↓
CONNECTED
```

at any time.

The application must not assume that a network request will remain
available after it begins.

---

# 10. Network Failure

A network failure must not automatically mean:

```text
Transaction failed
```

Example:

```text
Client sends sale
    ↓
Server processes sale
    ↓
Network fails before response reaches client
```

The client may not know whether the server processed the transaction.

This is exactly why idempotency is mandatory.

---

# 11. Client Transaction ID

Every offline-capable business transaction must have a stable client-generated
transaction identifier.

Conceptually:

```text
client_transaction_id
```

This ID must be generated before synchronization.

Example:

```text
Desktop:
TXN-01JXYZ...
```

The exact ID format is an implementation decision.

The important requirement is:

> The identifier must remain stable across retries.

---

# 12. Device Identity

Each offline-capable installation must have a stable device identity.

Conceptually:

```text
device_id
```

Example:

```text
desktop-counter-01
android-device-02
```

Do not use a display name as the only identity.

The device identity must be generated and persisted securely.

---

# 13. Client Instance Identity

A device installation may need an additional installation/client-instance
identifier.

This prevents problems where an application is reinstalled or restored from
a backup.

The final identity model should distinguish:

```text
Tenant
    ↓
Device
    ↓
Application installation/client instance
```

where necessary.

---

# 14. Tenant Identity

Every synchronized business transaction belongs to a tenant.

The client must never be allowed to synchronize a transaction into another
tenant.

Tenant identity must be derived from authenticated application context and
validated by the server.

Never trust arbitrary client-supplied tenant IDs.

---

# 15. Local Transaction Lifecycle

An offline transaction may move through states such as:

```text
LOCAL_CREATED
      ↓
PENDING_SYNC
      ↓
SYNCING
      ↓
SYNCED
```

Failure may produce:

```text
SYNC_FAILED
      ↓
RETRY
```

Conflict may produce:

```text
CONFLICT
      ↓
RESOLUTION
```

The exact enum names may change.

The lifecycle must remain explicit.

---

# 16. Local Completed Sale

When the user completes an offline sale:

```text
Billing completed
      ↓
Local transaction committed
      ↓
Inventory updated locally
      ↓
Payment recorded locally
      ↓
Transaction marked pending sync
```

The user must not be forced to wait for cloud connectivity.

---

# 17. Local Transaction Atomicity

An offline sale must be locally atomic.

The local database must not end up with:

```text
Invoice exists
BUT
Inventory was not reduced
```

or:

```text
Inventory reduced
BUT
Invoice does not exist
```

or:

```text
Payment recorded
BUT
Invoice missing
```

unless the system has an explicitly modeled recoverable state.

---

# 18. Local Inventory

Offline inventory must follow the same business rules as normal inventory.

The local client must not implement a completely different inventory model.

The same concepts must remain recognizable:

* Product
* Batch
* Quantity
* Movement
* Sale
* Return
* Adjustment

---

# 19. Local Stock Is Not Globally Authoritative

When disconnected:

```text
Desktop local stock
```

does not necessarily represent:

```text
All devices' stock
```

Example:

```text
Cloud:
Dolo = 1

Desktop offline:
Dolo = 1

Mobile offline:
Dolo = 1
```

Both devices may believe they have the last unit.

This is a distributed-system conflict.

The architecture must handle it explicitly.

---

# 20. The "Last Dolo" Problem

Consider:

```text
Cloud stock:
1 Dolo

Desktop:
offline

Mobile:
offline
```

Desktop sells:

```text
Dolo × 1
```

Mobile also sells:

```text
Dolo × 1
```

Both transactions are locally valid.

After synchronization:

```text
Total demand = 2
Available stock = 1
```

The system cannot pretend both sales consumed the same physical unit without
consequence.

This must result in a defined conflict/reconciliation state.

---

# 21. Never Silently Delete One Sale

If two disconnected devices sell the same final unit:

Do NOT:

* Delete one invoice.
* Randomly cancel one invoice.
* Silently change historical quantities.
* Pretend stock was 2.
* Hide the conflict.

The system must preserve both transactions and surface the resulting
business conflict.

---

# 22. Conflict Principle

When offline transactions conflict:

> Preserve historical transactions first; reconcile the resulting business
> state explicitly.

The system must never solve a conflict by silently destroying history.

---

# 23. Inventory Conflict

A stock conflict may occur when:

```text
Local available quantity
>
Cloud available quantity
```

at synchronization time.

Example:

```text
Cloud:
10

Desktop offline:
sells 7

Mobile offline:
sells 6

Combined:
13
```

The cloud cannot accept both as though 13 units existed.

---

# 24. Conflict Resolution

Conflict resolution must be a business operation.

Potential outcomes may include:

* Marking one or more transactions for review
* Creating an inventory discrepancy
* Requiring owner action
* Applying a controlled adjustment
* Other approved resolution

Do not silently mutate completed invoices.

The exact conflict-resolution workflow will be implemented separately.

---

# 25. Conflict Status

A synchronized transaction that creates a business conflict should have an
explicit state.

Conceptually:

```text
SYNCED
CONFLICT
RESOLUTION_REQUIRED
RESOLVED
```

The exact state model may evolve.

The important requirement is that unresolved conflicts remain visible.

---

# 26. Conflict Visibility

The owner/authorized manager should be able to see:

* Which transaction conflicted
* Which device created it
* When it was created
* What product/batch was involved
* Expected stock
* Actual cloud stock
* What resolution is required

Do not expose low-level replication terminology to ordinary cashiers.

---

# 27. Cashier Experience

The cashier should not be forced to solve distributed synchronization
conflicts during ordinary billing.

For example, do not show:

```text
CRDT CONFLICT
REPLICATION VECTOR ERROR
DATABASE MERGE FAILURE
```

Instead, the system should keep the cashier workflow operational and surface
business issues to an authorized user.

---

# 28. Synchronization Queue

Offline clients should maintain a local synchronization queue.

Conceptually:

```text
sync_queue
    |
    +-- transaction A
    +-- transaction B
    +-- transaction C
```

The queue must preserve transaction identity and ordering information where
ordering matters.

---

# 29. Queue Durability

Pending synchronization records must survive:

* Application restart
* Device restart
* Power failure
* Temporary network failure

Do not store the queue only in memory.

---

# 30. Queue Deletion

Do not delete a pending transaction merely because:

```text
HTTP request failed
```

The client should retain it until:

* Successfully acknowledged
* Explicitly resolved
* Permanently rejected with a recoverable business state

---

# 31. Synchronization Retry

Failed synchronization should retry automatically when appropriate.

Retries must use the same:

```text
client_transaction_id
```

and idempotency information.

Do not create a new transaction for every retry.

---

# 32. Retry Backoff

Use controlled retry behavior.

For repeated failures, use backoff rather than:

```text
Retry continuously as fast as possible
```

The exact backoff strategy can be configured in the infrastructure layer.

---

# 33. Retry Classification

Not every error should be retried.

### Retryable

Examples:

* Network unavailable
* Timeout
* Temporary server failure
* Temporary service unavailable

### Usually not retryable without modification

Examples:

* Invalid request
* Unauthorized
* Forbidden
* Invalid business state
* Permanent validation failure

The client must distinguish these cases.

---

# 34. Synchronization Acknowledgement

The server must return an explicit acknowledgement.

Conceptually:

```text
ACCEPTED
PROCESSED
DUPLICATE_ALREADY_PROCESSED
CONFLICT
REJECTED
RETRY_LATER
```

The exact API representation belongs to the API contract.

---

# 35. Idempotency

Every retry-sensitive synchronization operation must be idempotent.

Example:

```text
Desktop:
TXN-123

First attempt:
server processes TXN-123

Response:
lost

Second attempt:
TXN-123
```

The second request must not create a second invoice.

---

# 36. Server Idempotency Record

The server should maintain enough information to identify previously
processed client transactions.

Potential key:

```text
tenant_id
+
device_id
+
client_transaction_id
```

The exact uniqueness model must be finalized with the database design.

---

# 37. Idempotency Scope

Idempotency keys must not collide between unrelated tenants.

A transaction from:

```text
Tenant A
```

must never be considered the same transaction as:

```text
Tenant B
```

merely because their client-generated IDs happen to match.

---

# 38. Sync Ordering

Not all transactions are independent.

Example:

```text
Purchase
    ↓
Inventory received
    ↓
Sale
```

If a sale depends on locally created inventory, synchronization may need
dependency/order information.

The synchronization system must preserve required causal relationships.

---

# 39. Dependency Metadata

Where necessary, a pending transaction may reference another local
transaction.

Example:

```text
SALE-200
depends on:
PURCHASE-100
```

Do not assume server arrival order always equals business creation order.

---

# 40. Pull Synchronization

Clients must also receive changes from the cloud.

Conceptually:

```text
Client
   ↓
Pull changes
   ↓
Apply remote changes locally
```

The exact mechanism may use:

* Cursor
* Sequence
* Version
* Timestamp plus deterministic ordering
* Change feed

Do not use timestamps alone if they cannot guarantee reliable ordering.

---

# 41. Sync Cursor

A client may maintain a synchronization cursor such as:

```text
last_server_version
```

The cursor represents the point through which the client has successfully
processed remote changes.

Do not advance the cursor until the corresponding changes are safely applied.

---

# 42. Pull Failure

If local application of remote changes fails:

Do not advance the cursor past the failed change.

Otherwise the client may permanently skip data.

---

# 43. Applying Remote Changes

Remote changes must be applied transactionally where required.

Example:

```text
Receive remote inventory update
      ↓
Validate
      ↓
Apply local state
      ↓
Commit
      ↓
Advance cursor
```

Do not update the cursor before local application succeeds.

---

# 44. Duplicate Remote Changes

The client must tolerate receiving the same remote change more than once if
the synchronization protocol permits retries.

Applying the same remote change twice must not corrupt local state.

---

# 45. Local vs Remote Changes

The client must distinguish:

```text
LOCAL CHANGE
```

from:

```text
REMOTE CHANGE
```

This prevents synchronization loops such as:

```text
Remote change
   ↓
Apply locally
   ↓
Detect as new local change
   ↓
Upload again
```

---

# 46. Sync Loop Prevention

Every synchronized record should have enough metadata to identify its origin.

Possible metadata:

```text
origin
origin_device_id
client_transaction_id
server_transaction_id
```

The exact model may differ.

The system must prevent echoing a remote change back to the server as a new
business transaction.

---

# 47. Server Authority

When connected and synchronized, the cloud backend is the shared authority
for tenant-wide state.

Clients must not permanently override cloud state merely because their local
copy is newer by timestamp.

Business conflicts must be resolved through business rules.

---

# 48. Do Not Use Last-Write-Wins for Business Transactions

Do NOT resolve inventory or financial conflicts with generic:

```text
last write wins
```

Example:

```text
Desktop stock = 1
Mobile stock = 1

Desktop sells
Mobile sells

```

A timestamp cannot determine which physical sale "really happened."

The system needs a business-aware reconciliation strategy.

---

# 49. Master Data Synchronization

Master/reference data such as products may be synchronized differently from
transactions.

For example:

```text
Product Master
```

may be primarily cloud-managed.

While:

```text
Sales transaction
```

is created by the local device.

Do not use the exact same synchronization semantics for every entity.

---

# 50. Product Master Offline Data

The client needs enough Product Master data to perform offline billing.

The exact subset should be determined by operational requirements.

Potential fields:

```text
product ID
name
generic name
strength
dosage form
manufacturer
barcode
SKU
MRP
selling information
prescription requirement
unit information
```

Do not download unnecessary global master data to every device.

---

# 51. Inventory Synchronization

Inventory synchronization must preserve:

* Product
* Batch
* Quantity
* Movement
* Transaction source
* Device
* Tenant

A local inventory balance must not overwrite cloud inventory merely because
the local number is different.

---

# 52. Inventory Movement Synchronization

Where possible, synchronize the business movement rather than blindly
synchronizing the resulting quantity.

Example:

```text
SALE -5
```

is more informative than:

```text
quantity = 95
```

because the movement explains why the quantity changed.

---

# 53. Event vs State

The synchronization model should distinguish:

```text
Business event/change
```

from:

```text
Current state
```

Example:

```text
SALE:
-5
```

is a business event.

```text
Current stock:
95
```

is state.

Both may be maintained, but they serve different purposes.

---

# 54. Local Transaction History

Offline clients should preserve enough local history to:

* Show completed local bills
* Recover pending transactions
* Retry synchronization
* Diagnose failures
* Provide operational continuity

Do not delete a local invoice immediately after attempting synchronization.

Retention rules should be explicit.

---

# 55. Sync Status UI

The application should provide a simple synchronization indicator.

Possible states:

```text
Synced
Syncing
Pending
Connection unavailable
Attention required
```

Avoid technical terminology.

---

# 56. Manual Sync Button

Desktop should provide a visible:

```text
Sync Now
```

or equivalent action.

The owner/user should be able to trigger synchronization manually.

Manual sync must not create duplicate transactions.

---

# 57. Automatic Sync

When connectivity exists, automatic synchronization should run periodically.

The exact interval is configurable.

An initial implementation may use a few-minute interval.

Do not hardcode the interval into business rules.

---

# 58. Real-Time Expectations

"Real-time synchronization" should not mean:

```text
Every client must receive every change within milliseconds
```

unless that is an explicit infrastructure requirement.

For Inventra, the important requirement is:

```text
When connectivity exists:
Changes should synchronize automatically and frequently.
```

The system should remain useful if there is a short synchronization delay.

---

# 59. Offline Duration

The system should support temporary connectivity outages.

Do not design the product assuming that devices are offline for weeks without
synchronizing.

The longer a device remains disconnected, the greater the potential for
cross-device conflicts.

The UI may warn authorized users about prolonged unsynchronized state.

---

# 60. Stale Local Data

Not all local data has the same freshness requirements.

Examples:

```text
Product Master
```

may tolerate some stale data.

But:

```text
Inventory
```

can become materially stale.

The synchronization system should understand these different freshness
requirements.

---

# 61. Stale Inventory Warning

If a client has not synchronized for a significant period, it may warn the
user:

```text
Inventory data may be outdated.
Last synchronized: ...
```

Do not prevent ordinary billing solely because the client is stale unless an
explicit business/legal requirement demands it.

---

# 62. Device Replacement

A user may replace a desktop or Android device.

The synchronization architecture must not make the business permanently
dependent on one physical device.

A replacement device must eventually be able to:

* Authenticate
* Register
* Download required data
* Continue operations

Pending transactions on the old device must remain recoverable according to
the synchronization design.

---

# 63. Reinstallation

If the application is uninstalled/reinstalled:

Do not assume the old local database still exists.

The cloud must remain capable of restoring synchronized business state.

Unsynchronized local transactions are a special recovery case and require an
explicit recovery strategy.

---

# 64. Backup and Restore

Local databases may be backed up where appropriate.

However:

```text
Local backup
≠
Cloud synchronization
```

A restored local database must not create duplicate transactions when
reconnected.

Idempotency and device/client identity must protect against this.

---

# 65. Clock Problems

Client clocks may be incorrect.

Do not use the client clock as the sole authority for ordering synchronized
transactions.

Use server timestamps/versioning where required.

Preserve client event time separately if the business needs it.

---

# 66. Time Metadata

Where useful, retain:

```text
client_created_at
server_received_at
server_processed_at
```

These have different meanings.

Do not overwrite the original transaction time merely because synchronization
happened later.

---

# 67. Sync Security

Synchronization APIs must use the same:

* Authentication
* Authorization
* Tenant isolation
* Input validation

as normal APIs.

Offline does not mean "trusted."

A compromised client must not be able to submit arbitrary transactions into
another tenant.

---

# 68. Sync Payloads

Synchronization payloads should contain business data required to process
the operation.

Do not send:

* Passwords
* Access tokens
* Secrets
* Unnecessary internal database data

---

# 69. Partial Synchronization Failure

Suppose:

```text
Transaction A → success
Transaction B → conflict
Transaction C → success
```

The client must know the status of each transaction.

Do not treat the entire batch as successful if one transaction failed.

The synchronization API may support per-item results.

---

# 70. Batch Synchronization

Batch synchronization is allowed and preferred where it improves efficiency.

Example:

```text
POST /api/v1/sync/push
```

containing multiple pending changes.

However, each business transaction must still have its own:

* Identity
* Result
* Idempotency
* Error/conflict status

---

# 71. Sync Payload Size

Do not create massive synchronization requests.

Large pending queues should be processed in manageable batches.

The exact batch size should be configurable and measured.

---

# 72. Sync Queue Ordering

Where transactions are independent:

```text
A
B
C
```

may be synchronized in parallel or batches.

Where dependencies exist:

```text
Purchase A
    ↓
Sale B
```

the system must preserve required dependency order.

---

# 73. Inventory Conflict Resolution Example

Example:

```text
Cloud:
Dolo Batch A = 1

Desktop offline:
Sale D1 = 1

Mobile offline:
Sale M1 = 1
```

After synchronization:

```text
Cloud stock cannot become -1
```

The system must:

1. Preserve D1.
2. Preserve M1.
3. Detect the conflict.
4. Identify the affected batch.
5. Record the discrepancy.
6. Surface the issue to an authorized user.
7. Apply an approved resolution.
8. Preserve the audit trail.

Do not silently delete either sale.

---

# 74. Resolution Must Be Explicit

Conflict resolution may eventually result in:

```text
Adjustment
Cancellation
Return
Manager review
Other approved resolution
```

The exact workflow belongs to the conflict-resolution module.

Do not hardcode an arbitrary choice into synchronization infrastructure.

---

# 75. Synchronization Is Not Accounting

The sync layer transports business changes.

It must not invent financial decisions.

For example, synchronization must not decide:

```text
Which customer's invoice should be cancelled?
```

That is a business decision.

The sync layer should detect and surface the conflict.

---

# 76. Synchronization Is Not Inventory Logic

The sync layer must not replace the inventory domain.

It should call the appropriate application/domain operations.

Bad:

```text
Sync engine:
UPDATE inventory SET quantity = ...
```

Better:

```text
Sync engine
    ↓
Application operation
    ↓
Inventory domain rules
    ↓
Persistence
```

---

# 77. Local Database and Domain Logic

The local client may implement a local version of required domain operations.

However, the behavior must remain consistent with the cloud backend.

Do not create:

```text
Desktop billing rules
≠
Android billing rules
≠
Cloud billing rules
```

without a deliberate reason.

---

# 78. Shared Contract

Web, Desktop, and Android should share the same conceptual API/business
contract.

Differences in UI or local persistence must not change business semantics.

---

# 79. Offline Search

Offline billing search must remain usable.

The client should maintain an appropriate local searchable product dataset.

Do not require a cloud request for every keystroke when offline.

---

# 80. Offline Product Data Updates

When connected:

```text
Cloud Product Master
       ↓
Sync
       ↓
Local Product Dataset
```

The client should receive updates efficiently.

Do not redownload one million products every few minutes.

---

# 81. Incremental Synchronization

Synchronization should be incremental.

Prefer:

```text
Changes since cursor/version
```

over:

```text
Download everything
```

The exact protocol may use a change sequence/cursor.

---

# 82. Sync Cursor Safety

A client should advance its synchronization cursor only after all changes
up to that point have been safely applied.

If change N fails:

```text
Cursor must not jump beyond N
```

and silently skip the failure.

---

# 83. Sync Recovery

After application restart:

```text
Load pending queue
Load sync cursor
Resume synchronization
```

Do not lose pending work because the application restarted.

---

# 84. Sync Monitoring

The system should track operational metrics such as:

* Pending transaction count
* Synchronization failures
* Conflict count
* Last successful synchronization
* Retry count
* Synchronization latency

These metrics are important for support.

---

# 85. Support Diagnostics

An authorized support/owner workflow should be able to identify:

```text
Device
Tenant
Transaction
Sync status
Last attempt
Failure reason
```

Do not expose sensitive payloads unnecessarily.

---

# 86. No Silent Data Loss

This is non-negotiable.

The system must never silently discard:

* Offline invoices
* Purchases
* Returns
* Adjustments
* Payments
* Other business transactions

If a transaction cannot synchronize:

```text
Pending
Failed
Conflict
Rejected
```

must be represented explicitly.

---

# 87. No Silent Data Rewriting

The sync system must not silently rewrite:

* Historical invoice totals
* Historical selling prices
* Historical payment allocations
* Original transaction times
* Original quantities

to make synchronization appear successful.

---

# 88. No Last-Write-Wins for Transactions

Generic conflict strategies such as:

```text
last_write_wins
```

must not be applied to completed financial or inventory transactions.

Transactions represent events/business actions, not arbitrary mutable documents.

---

# 89. Master Data Conflict

Master data may require different conflict rules.

Example:

```text
Product name changed
```

This is different from:

```text
Sale created
```

Master data conflict handling may use:

* Server authority
* Version checks
* Explicit review
* Other approved strategy

Do not apply transaction conflict logic blindly to master data.

---

# 90. Data Ownership

The synchronization system must know which side is authoritative for a
given data category.

Conceptually:

```text
Product Master
    → Cloud authoritative

Local Sale
    → Client creates
    → Cloud accepts/validates

Inventory
    → Derived from business transactions
    → Cloud reconciles shared state
```

The exact ownership matrix must be documented before implementing the final
sync engine.

---

# 91. Offline Feature Boundaries

Offline support does not mean every feature must work fully offline.

Features requiring cloud infrastructure may remain unavailable offline.

Examples may include:

* Certain global administration features
* Advanced cloud reporting
* Future AI features
* External integrations

Do not block basic pharmacy operations merely because an unrelated cloud
feature is unavailable.

---

# 92. Web Application

The Web application is not required to behave exactly like the offline
desktop/mobile clients.

The Web application may assume normal internet connectivity.

However, the business API contract remains shared.

---

# 93. Desktop Application

Desktop must support:

* Local persistence
* Offline billing
* Offline operational workflows
* Automatic synchronization
* Manual synchronization
* Pending queue
* Recovery after restart

The desktop must remain a normal Inventra client.

---

# 94. Android Application

Android must support the same core offline business workflows required of
the desktop application.

The mobile UI may differ significantly.

The business semantics must not.

---

# 95. Cross-Device Scenario

Example:

```text
Desktop:
Offline

Mobile:
Connected

Web:
Connected
```

The mobile and web clients may have newer cloud information than the desktop.

The desktop must synchronize when it reconnects.

The system must not pretend all devices have identical state while disconnected.

---

# 96. User Expectations

The UI should communicate simple states:

```text
Connected
Syncing
Pending
Offline
Attention required
```

Avoid exposing:

```text
Vector clocks
Replication offsets
Event sequence IDs
CRDT terminology
```

to ordinary users.

---

# 97. AI Implementation Rules

Before implementing offline functionality:

1. Identify the business transaction.
2. Identify local state.
3. Identify cloud state.
4. Identify transaction ID.
5. Identify device identity.
6. Identify tenant.
7. Identify idempotency strategy.
8. Identify retry behavior.
9. Identify acknowledgement behavior.
10. Identify conflict behavior.
11. Identify local transaction boundary.
12. Identify synchronization dependencies.
13. Identify pull/push behavior.
14. Identify cursor/version behavior.
15. Test restart recovery.
16. Test network loss.
17. Test retry.
18. Test duplicate submission.
19. Test multi-device conflict.
20. Test tenant isolation.

---

# 98. Required Offline Test Scenarios

Every offline-capable transaction must be tested against:

### Scenario 1 — Normal online operation

```text
Connected
    ↓
Create transaction
    ↓
Sync
    ↓
Success
```

### Scenario 2 — Offline operation

```text
Disconnected
    ↓
Create transaction
    ↓
Local success
```

### Scenario 3 — Reconnect

```text
Offline transaction
    ↓
Reconnect
    ↓
Sync
    ↓
Cloud success
```

### Scenario 4 — Retry

```text
First request
    ↓
Network failure
    ↓
Retry
    ↓
No duplicate transaction
```

### Scenario 5 — Application restart

```text
Pending transaction
    ↓
Application closes
    ↓
Application restarts
    ↓
Pending transaction still exists
```

### Scenario 6 — Power loss

```text
Transaction
    ↓
Power failure
    ↓
Restart
    ↓
Transaction is either safely committed or safely absent
```

### Scenario 7 — Duplicate submission

```text
Same transaction ID
    ↓
Submitted twice
    ↓
One business transaction
```

### Scenario 8 — Two-device conflict

```text
Desktop offline
+
Android offline
+
Same final stock
```

The system must detect and preserve the conflict.

---

# 99. Final Non-Negotiable Rules

The following must never be violated:

```text
1. Offline billing must be normal billing.

2. Offline transactions must survive application restart.

3. Pending transactions must not be silently deleted.

4. Retrying a transaction must not create duplicates.

5. Completed historical transactions must not be silently rewritten.

6. Inventory conflicts must not be resolved using last-write-wins.

7. Two disconnected devices may legitimately produce conflicting stock
   transactions; the system must detect this rather than pretending the
   conflict does not exist.

8. Synchronization must preserve tenant isolation.

9. Synchronization must preserve auditability.

10. Cloud synchronization must not be required for basic offline billing.

11. Local databases must not be treated as independent permanent sources of
    business truth.

12. The sync layer must not bypass domain/business rules.
```

---

# 100. Final Principle

Inventra's offline architecture exists for one reason:

> A temporary loss of internet connectivity must not stop a pharmacy from
> operating, but offline capability must never become an excuse for losing
> business truth.

The system must therefore optimize for:

```text
Local continuity
+
Reliable synchronization
+
Idempotency
+
Conflict detection
+
Auditability
+
Business correctness
```

rather than pretending distributed systems have no distributed-system
problems.

