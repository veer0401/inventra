---
name: inventra-observability-operations
description: >
  Defines Inventra's production observability, structured logging, metrics,
  distributed tracing, health checks, audit trails, error handling, alerting,
  backup and recovery, operational diagnostics, synchronization monitoring,
  and production support rules. Use this skill whenever implementing,
  modifying, reviewing, or operating logging, monitoring, tracing, health,
  audit, backup, recovery, or production diagnostics.
---

# Inventra Observability & Operations Rules

## 1. Purpose

Inventra must be operable after deployment.

The system must allow us to answer:

- Is the application healthy?
- Is the database healthy?
- Are APIs responding?
- Are users experiencing errors?
- Are synchronizations failing?
- Are offline transactions accumulating?
- Are inventory operations failing?
- Are payments failing?
- Which request caused a problem?
- Which transaction was affected?
- Which device generated it?
- Which tenant was affected?
- What happened immediately before the failure?

Observability is not optional infrastructure decoration.

It is part of the product's operational correctness.

---

# 2. Three Observability Pillars

Inventra should use:

```text
Logs
Metrics
Traces
````

These answer different questions.

### Logs

What happened?

### Metrics

How often/how much?

### Traces

Where did the request spend time or fail?

Do not attempt to solve every operational problem with logs alone.

---

# 3. Structured Logging

Application logs must be structured.

Prefer:

```json
{
  "timestamp": "...",
  "level": "INFO",
  "service": "inventra-api",
  "event": "invoice.completed",
  "tenantId": "...",
  "invoiceId": "...",
  "requestId": "..."
}
```

over large unstructured text strings.

---

# 4. Log Levels

Use appropriate levels.

Typical levels:

```text
TRACE
DEBUG
INFO
WARN
ERROR
```

Production should not run with unrestricted DEBUG logging.

---

# 5. INFO Logs

Use INFO for meaningful operational events.

Examples:

```text
Application started
Synchronization completed
Invoice completed
Device registered
Scheduled synchronization executed
```

Do not log every database query at INFO level in production.

---

# 6. WARN Logs

Use WARN for unusual but recoverable situations.

Examples:

```text
Repeated synchronization failure
Stale device
Retryable external service failure
Unexpected but recoverable business condition
```

WARN should not become the normal application control flow.

---

# 7. ERROR Logs

Use ERROR when an operation failed and requires investigation.

Examples:

```text
Unexpected database failure
Unhandled application exception
Synchronization permanently failed
Infrastructure dependency unavailable
```

Do not log expected validation errors as ERROR.

---

# 8. Expected Business Errors

A normal business rejection such as:

```text
Insufficient stock
Unauthorized operation
Invalid quantity
```

is not necessarily an ERROR.

Use appropriate API response handling and only log at the appropriate level
if operational investigation benefits from it.

---

# 9. Never Log Secrets

Never log:

* Passwords
* Access tokens
* Refresh tokens
* Password reset tokens
* API keys
* Database credentials
* Private keys
* Encryption keys

This rule applies to:

* Backend logs
* Frontend logs
* Desktop logs
* Android logs
* Synchronization logs

---

# 10. Sensitive Business Data

Do not unnecessarily log:

* Full customer information
* Personal phone numbers
* Payment credentials
* Sensitive prescription information
* Full request payloads containing personal data

Log identifiers rather than entire business objects where possible.

---

# 11. Request ID

Every backend request should have a traceable request identifier.

Conceptually:

```text
request_id
```

Example:

```text
REQ-01JXYZ...
```

The request ID should appear in:

* Logs
* Error responses where appropriate
* Traces
* Support diagnostics

---

# 12. Correlation ID

For distributed workflows, use a correlation identifier where useful.

Example:

```text
User request
    ↓
API
    ↓
Database
    ↓
Sync
    ↓
External service
```

The correlation ID allows these operations to be connected.

---

# 13. Business Transaction ID

Business transactions should have their own identifiers.

Examples:

```text
invoice_id
purchase_id
return_id
adjustment_id
sync_transaction_id
```

Do not use request ID as a replacement for business transaction identity.

---

# 14. Device ID

Offline-capable operations should retain device identity where applicable.

Example:

```text
device_id
```

This helps answer:

> Which device created this transaction?

---

# 15. Tenant ID

Operational logs may need tenant context.

However, tenant identifiers must be handled carefully.

Do not expose tenant-sensitive information to unauthorized users merely
because it exists in logs.

---

# 16. User ID

Where appropriate, retain the authenticated user identifier in operational
logs.

This allows support to determine:

```text
Who performed the operation?
```

Do not log authentication secrets.

---

# 17. Event Naming

Use consistent event names.

Prefer:

```text
invoice.completed
invoice.cancelled
payment.recorded
purchase.completed
inventory.adjusted
sync.started
sync.completed
sync.failed
device.registered
```

Avoid random naming conventions.

---

# 18. Business Events vs Logs

A business event and a log are not the same thing.

Example:

```text
invoice.completed
```

may be a business event.

A log such as:

```text
Completed invoice processing in 120ms
```

is operational telemetry.

Do not treat logs as the authoritative business transaction history.

---

# 19. Audit Trail

Critical business actions require persistent auditability.

Examples:

```text
Invoice cancellation
Inventory adjustment
User role change
User deactivation
Device revocation
Security changes
```

Audit information should survive ordinary log rotation.

---

# 20. Audit Record

An audit record should capture enough information to answer:

```text
Who?
What?
When?
Which tenant?
Which resource?
What changed?
Why?
From which device?
```

The exact schema is defined by the domain/database design.

---

# 21. Audit Is Not Debug Logging

Do not implement business audit history solely by writing:

```text
INFO: user changed inventory
```

to an application log.

Logs may be:

* Rotated
* Deleted
* Aggregated
* Lost
* Inaccessible to business users

Business audit records require durable persistence.

---

# 22. Immutable Audit History

Audit records should generally be append-oriented.

Do not allow ordinary users to modify historical audit records.

If an audit correction is required, create an additional audit event explaining
the correction.

---

# 23. Inventory Audit

Important inventory operations should be traceable.

Examples:

```text
Purchase receipt
Sale
Return
Adjustment
Expiry write-off
```

The inventory movement history remains the primary business inventory trail.

Operational logs supplement it.

---

# 24. Financial Audit

Important financial operations should be traceable.

Examples:

```text
Invoice completion
Payment
Refund/return where applicable
Cancellation
Credit transaction
```

Do not use application logs as the financial ledger.

---

# 25. Synchronization Observability

Synchronization is one of Inventra's most operationally important systems.

Track:

```text
Last successful sync
Pending transaction count
Failed transaction count
Conflict count
Retry count
Sync latency
```

---

# 26. Sync Metrics

Useful metrics include:

```text
inventra_sync_transactions_total
inventra_sync_failures_total
inventra_sync_conflicts_total
inventra_sync_pending
inventra_sync_duration
```

Exact metric names may change.

Use consistent naming.

---

# 27. Sync Failure Visibility

A synchronization failure must not disappear into logs.

The system should expose operationally useful information such as:

```text
Device
Last sync
Pending count
Failure count
Attention required
```

to authorized users/support tooling.

---

# 28. Sync Conflict Visibility

A conflict should be visible to authorized users.

The system should identify:

* Transaction
* Product/batch where applicable
* Device
* Time
* Conflict type
* Current status

Do not hide conflicts merely because the cashier does not need to solve them.

---

# 29. Application Health

The backend should expose health information.

Use Spring Boot Actuator where appropriate.

Health endpoints should distinguish:

```text
Application healthy
Database unavailable
Dependency unavailable
```

where operationally useful.

---

# 30. Liveness

Liveness answers:

> Is the application process alive enough to continue running?

A liveness failure should generally indicate that the process should be
restarted by the orchestration/deployment environment.

Do not make liveness depend on every external dependency.

---

# 31. Readiness

Readiness answers:

> Is this application instance ready to serve traffic?

Readiness may consider required dependencies such as:

* Database
* Critical infrastructure

according to deployment architecture.

---

# 32. Health Endpoint Security

Health endpoints must not expose:

* Passwords
* Connection strings
* Secrets
* Internal credentials

Only expose information appropriate for the endpoint's audience.

---

# 33. Database Health

Database connectivity should be observable.

Important failures include:

```text
Connection exhaustion
Timeouts
Unavailable database
Slow queries
Migration failures
```

---

# 34. Migration Health

A deployment must not be considered healthy if required database migrations
have failed.

Migration execution should be observable.

---

# 35. Application Startup

Startup should fail clearly when required configuration is invalid.

Examples:

```text
Missing database configuration
Invalid security configuration
Invalid required environment variable
Migration failure
```

Do not allow the application to start in a misleading half-configured state.

---

# 36. Configuration Validation

Required configuration should be validated at startup.

Do not discover missing critical configuration only after the first customer
tries to use the application.

---

# 37. Metrics

Track metrics that help understand product health.

Examples:

```text
HTTP request count
HTTP error count
HTTP latency
Database latency
Authentication failures
Invoice completion count
Purchase completion count
Inventory adjustment count
Sync failures
Sync conflicts
```

---

# 38. Business Metrics

Business metrics should not be confused with analytics.

Operational business counters can help determine whether the system is working.

Examples:

```text
Invoices completed
Invoices failed
Purchases completed
Returns completed
Sync transactions processed
```

Advanced analytics can be added later.

---

# 39. Avoid Metric Explosion

Do not create a metric label for every possible:

```text
tenant
user
invoice
customer
product
```

This can create enormous metric cardinality.

Use high-cardinality identifiers in logs/traces rather than metric labels where
appropriate.

---

# 40. HTTP Metrics

Track:

* Request count
* Response status
* Latency
* Endpoint
* HTTP method

Avoid creating a unique metric series for every dynamic resource ID.

---

# 41. Database Metrics

Where available, monitor:

* Connection pool utilization
* Active connections
* Query latency
* Transaction failures
* Slow queries

---

# 42. JVM Metrics

Spring Boot applications should expose useful JVM metrics such as:

* Heap usage
* Non-heap usage
* Garbage collection
* Threads
* CPU

Use these for diagnosing infrastructure problems.

---

# 43. Application Metrics

Useful application metrics include:

```text
Active requests
Error rate
Request latency
Background job failures
Sync queue size
```

---

# 44. Distributed Tracing

Use distributed tracing where the architecture benefits from it.

For example:

```text
Desktop
   ↓
API
   ↓
Application service
   ↓
Database
```

or:

```text
Android
   ↓
Sync API
   ↓
Transaction processing
   ↓
Database
```

Tracing should allow us to identify where latency or failure occurs.

---

# 45. Trace Sampling

Do not necessarily trace every production request at full detail forever.

Use appropriate sampling.

However, critical errors should remain observable.

---

# 46. Trace Security

Do not place secrets or sensitive payloads into trace attributes.

Tracing systems can have broad access.

Treat trace data as operational data.

---

# 47. Error Responses

Production APIs must return controlled errors.

Do not expose:

```text
Stack trace
SQL query
Database hostname
Java class names
Internal filesystem paths
```

to clients.

---

# 48. Error Codes

Business/API errors should have stable machine-readable codes.

Example:

```text
INVENTORY_INSUFFICIENT
INVOICE_ALREADY_COMPLETED
PAYMENT_MISMATCH
UNAUTHORIZED_OPERATION
SYNC_CONFLICT
```

The exact catalog is defined by the API rules.

---

# 49. Error Correlation

When returning an unexpected server error, provide a safe reference such as:

```text
request_id
```

This allows support to find the corresponding server-side logs.

---

# 50. Exception Handling

Use centralized exception handling.

Do not duplicate random exception-to-response mappings across every controller.

Spring's problem-details approach may be used where appropriate.

---

# 51. Expected vs Unexpected Exceptions

Expected business exceptions:

```text
InsufficientStockException
InvalidPaymentException
UnauthorizedOperation
```

should map to predictable client errors.

Unexpected infrastructure failures should map to controlled server errors.

---

# 52. Stack Traces

Stack traces belong in controlled server logs.

They do not belong in normal production API responses.

---

# 53. Log Correlation

When an exception occurs, logs should include enough context to connect:

```text
request
user
tenant
device
transaction
exception
```

without exposing sensitive data.

---

# 54. Background Jobs

Background processes must be observable.

Examples:

```text
Synchronization
Cleanup
Scheduled maintenance
Report generation
```

Each should provide:

* Start
* Success
* Failure
* Duration
* Relevant identifiers

---

# 55. Scheduled Job Failure

A background job failure must not disappear.

Track:

```text
last_run
last_success
last_failure
failure_count
```

where useful.

---

# 56. Synchronization Worker

The synchronization worker should expose operational status.

Example:

```text
Running
Idle
Retrying
Blocked
Attention required
```

---

# 57. Sync Queue Monitoring

Monitor queue growth.

Example:

```text
Pending:
10
20
50
100
1000
```

A rapidly growing queue may indicate:

* Network failure
* Server failure
* Authentication failure
* Conflict accumulation
* Client bug

---

# 58. Alerting

Alerting should focus on actionable conditions.

Examples:

```text
Database unavailable
High API error rate
Synchronization failures above threshold
Large sync backlog
Repeated inventory processing failures
Migration failure
```

Do not alert on every minor validation failure.

---

# 59. Alert Severity

Use meaningful severity.

Example:

```text
Critical:
Production database unavailable

High:
Synchronization backlog growing rapidly

Medium:
Repeated non-critical external dependency failures
```

The exact thresholds should be configured operationally.

---

# 60. Alert Fatigue

If everything is an alert, nothing is an alert.

Alerts must be:

* Actionable
* Meaningful
* Deduplicated
* Threshold-based where appropriate

---

# 61. Backup Strategy

The cloud database must have a proper backup strategy.

Backups must not rely solely on:

```text
Developer laptop
```

or:

```text
Local desktop database
```

---

# 62. Database Backups

Backups should support recovery from:

* Hardware failure
* Data corruption
* Accidental deletion
* Deployment mistakes
* Security incidents

The exact retention schedule is an operations decision.

---

# 63. Backup Verification

A backup that has never been restored is not proven reliable.

Regular restore testing should verify:

```text
Backup
    ↓
Restore
    ↓
Database usable
    ↓
Application usable
```

---

# 64. Recovery Point Objective

The project should define an acceptable:

```text
RPO
Recovery Point Objective
```

meaning:

> How much recently created cloud data could theoretically be lost after a
> catastrophic failure?

This is an operational/product decision.

---

# 65. Recovery Time Objective

The project should define:

```text
RTO
Recovery Time Objective
```

meaning:

> How quickly should the service be restored after a major failure?

Do not invent production numbers before infrastructure requirements are known.

---

# 66. Local Data and Backup

Desktop/Android local data may assist recovery of unsynchronized transactions,
but must not be treated as the primary cloud backup.

The cloud backup strategy remains independent.

---

# 67. Disaster Recovery

The system should eventually document:

```text
Database recovery
Application redeployment
Configuration recovery
Secret recovery
DNS/domain recovery where applicable
Synchronization recovery
```

---

# 68. Disaster Recovery Test

A disaster recovery plan should eventually be tested.

Do not assume:

```text
"We have backups."
```

means:

```text
"We can recover."
```

---

# 69. Data Corruption Detection

Where practical, use constraints and consistency checks to detect impossible
states.

Examples:

```text
Negative stock where prohibited
Payment mismatch
Invalid foreign key
Duplicate transaction
Broken tenant ownership
```

---

# 70. Operational Diagnostics

Support should be able to answer:

```text
Why did this invoice fail?
```

using:

```text
Invoice ID
Request ID
User ID
Device ID
Timestamp
Error code
```

rather than requiring direct database investigation for every incident.

---

# 71. Support-Friendly Error Messages

User-facing errors should be understandable.

Bad:

```text
org.hibernate.exception.ConstraintViolationException...
```

Better:

```text
Unable to complete the invoice. Please try again.
Reference: REQ-123
```

The support team can use the reference to investigate.

---

# 72. Operational Admin

The product may eventually have an operational administration area.

Potential information:

```text
Application status
Connected devices
Sync status
Recent errors
Pending sync
System health
```

Only authorized users should see it.

---

# 73. Device Health

For offline-capable devices, track useful operational information such as:

```text
Last synchronization
Application version
Device status
Pending transactions
```

Do not collect unnecessary personal device information.

---

# 74. Application Version

Requests should be traceable to client version where appropriate.

Example:

```text
client_version = 1.4.2
platform = ANDROID
```

This is useful when a bug affects only one client version.

---

# 75. API Version

Requests should also be traceable to API version where appropriate.

This helps diagnose compatibility problems between:

```text
Old Desktop
+
New Backend
```

---

# 76. Client Compatibility

Operational diagnostics should make it possible to determine:

```text
Which application version?
Which API version?
Which device?
Which tenant?
```

was involved in an incident.

---

# 77. Sync Compatibility

If a synchronization payload is incompatible with the current backend version,
the system should reject it clearly rather than corrupting data.

Use explicit protocol/version handling.

---

# 78. Deployment Observability

Deployments should make it possible to determine:

```text
Application version
Database migration version
Deployment timestamp
```

---

# 79. Migration Monitoring

After deployment:

```text
Migration
    ↓
Application startup
    ↓
Health check
    ↓
Smoke test
```

should verify that the new version is operational.

---

# 80. Smoke Tests

A deployment smoke test should verify at minimum:

```text
Application starts
Database reachable
Authentication endpoint works
Protected API works
Basic product retrieval works
```

For appropriate environments, also test a safe business workflow.

---

# 81. Production Logging Retention

Log retention must be defined separately from business data retention.

Do not retain every log forever.

Retain enough operational history for:

* Troubleshooting
* Security investigation
* Compliance where applicable

---

# 82. Audit Retention

Business audit history may require longer retention than operational logs.

Do not delete audit records simply because old logs were rotated.

---

# 83. Privacy and Retention

Observability data must follow data minimization.

Do not retain sensitive personal information in logs just because storage is
cheap.

---

# 84. Development vs Production

Development may have:

```text
DEBUG logs
Detailed errors
Local tracing
```

Production should use controlled:

```text
INFO/WARN/ERROR
Safe error responses
Appropriate tracing
```

Do not accidentally deploy development logging settings to production.

---

# 85. Test Environment Observability

Tests should be able to expose useful failure context.

For example:

```text
Test failed
+
Request ID
+
SQL/container logs
+
Application logs
```

when appropriate.

---

# 86. Observability Anti-Patterns

Never:

```text
Log passwords.
```

Never:

```text
Log JWT tokens.
```

Never:

```text
Return stack traces to users.
```

Never:

```text
Treat logs as financial/audit history.
```

Never:

```text
Create unlimited high-cardinality metrics.
```

Never:

```text
Ignore growing sync queues.
```

Never:

```text
Assume backups work without restore testing.
```

Never:

```text
Expose health endpoints with secrets.
```

Never:

```text
Silently swallow background job failures.
```

---

# 87. Minimum Production Dashboard

The initial operational dashboard should eventually show:

```text
Application Health
Database Health
API Error Rate
API Latency
Active/Recent Deployments
Sync Pending Count
Sync Failure Count
Sync Conflict Count
Recent Critical Errors
Connected/Recently Seen Devices
```

Do not build advanced analytics yet.

This is operational monitoring.

---

# 88. Minimum Support Information

For a failed business operation, support should be able to identify:

```text
Tenant
User
Device
Application version
Request ID
Business transaction ID
Timestamp
Error code
Failure reason
```

without manually reconstructing everything from raw database tables.

---

# 89. Incident Workflow

When a production problem occurs:

```text
Detect
    ↓
Identify
    ↓
Correlate
    ↓
Contain
    ↓
Recover
    ↓
Verify
    ↓
Document
    ↓
Prevent recurrence
```

A production incident should ideally result in a regression test or
engineering improvement where applicable.

---

# 90. Operational Principle

Observability should answer:

```text
What happened?
Why?
Who/which device?
Which tenant?
Which transaction?
How many users?
How often?
Is it still happening?
```

If the system cannot answer these questions, the observability layer is
incomplete.

---

# 91. AI Implementation Workflow

When implementing a new backend feature:

1. Identify business events.
2. Identify important logs.
3. Identify metrics.
4. Identify trace boundaries.
5. Identify audit requirements.
6. Identify failure conditions.
7. Identify health implications.
8. Identify support diagnostics.
9. Avoid sensitive data leakage.
10. Add tests for important failure paths.
11. Verify production-safe behavior.

---

# 92. Definition of Done

Observability for a module is complete when:

* [ ] Important business events are traceable.
* [ ] Errors have meaningful codes.
* [ ] Request IDs are available.
* [ ] Critical operations are observable.
* [ ] Sensitive data is not logged.
* [ ] Relevant metrics exist.
* [ ] Important background jobs are observable.
* [ ] Audit requirements are satisfied.
* [ ] Health checks are appropriate.
* [ ] Failure behavior is diagnosable.

---

# 93. Final Principle

A production system is not finished when it works.

It is finished when:

```text
It works
+
We can tell when it stops working
+
We can determine why
+
We can identify what was affected
+
We can recover safely
```

For Inventra, this matters particularly because the system handles:

```text
Money
+
Inventory
+
Authentication
+
Offline transactions
+
Multiple devices
```

> If the application breaks at 2:00 AM and the only diagnostic information is
> "500 Internal Server Error," the application is not operationally mature.

