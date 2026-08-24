---
name: inventra-development-workflow
description: >
  Defines the mandatory AI-assisted development workflow for Inventra.
  Establishes how an AI agent must inspect the repository, identify relevant
  skills, understand existing code, plan changes, implement incrementally,
  test, review, document, and stop safely. Prevents blind coding, unnecessary
  rewrites, scope creep, architectural drift, and destructive changes.
  Use this skill for every Inventra development task.
---

# Inventra Development Workflow

## 1. Purpose

This skill defines how Inventra must be developed.

The AI must not behave like:

```text
User asks for feature
        ↓
Generate code immediately
        ↓
Hope it works
````

Instead:

```text
Understand
   ↓
Inspect
   ↓
Identify constraints
   ↓
Plan
   ↓
Implement
   ↓
Test
   ↓
Review
   ↓
Document
   ↓
Verify
```

---

# 2. Mandatory Rule

Every meaningful development task must begin with repository inspection.

Before changing code, determine:

* What already exists?
* Where does the feature belong?
* Which architecture is being used?
* Which skills apply?
* Which APIs already exist?
* Which database structures already exist?
* Which tests already exist?
* Does the requested change conflict with an existing rule?

Do not start coding from the user's description alone.

---

# 3. Skill Discovery

Before implementing a feature, identify the relevant Inventra skills.

Examples:

### Authentication

```text
inventra-architecture
inventra-security-auth
inventra-api-rules
inventra-database-rules
inventra-testing-quality
inventra-observability-operations
```

### Billing

```text
inventra-domain-rules
inventra-inventory-billing
inventra-api-rules
inventra-database-rules
inventra-security-auth
inventra-sync-offline
inventra-testing-quality
inventra-observability-operations
```

### Frontend screen

```text
inventra-frontend-platform
inventra-api-rules
inventra-security-auth
inventra-mvp-scope
```

Read only the skills relevant to the task, but do not skip a skill when it
clearly governs the requested behavior.

---

# 4. Skill Priority

When multiple skills apply, resolve them in this order:

```text
Product/MVP scope
        ↓
Architecture
        ↓
Domain rules
        ↓
Security
        ↓
Database
        ↓
API
        ↓
Synchronization
        ↓
Frontend/platform
        ↓
Testing
        ↓
Observability
        ↓
Project standards
```

This is a reasoning order, not permission to violate a more specific rule.

---

# 5. Existing Code Comes First

Before creating a new implementation, search the repository.

Look for:

* Similar feature
* Existing service
* Existing DTO
* Existing repository
* Existing endpoint
* Existing database table
* Existing test
* Existing frontend component
* Existing utility

Do not create a duplicate implementation when an existing one can be
extended safely.

---

# 6. Do Not Assume the Repository Is Empty

Even when a feature appears new, inspect:

```text
src/
tests/
docs/
skills/
configuration/
migrations/
frontend/
```

before making structural decisions.

---

# 7. Understand the Current Architecture

Before modifying backend code, determine whether the relevant module currently
uses:

```text
Layered architecture
Hexagonal architecture
Feature-oriented organization
Modular monolith
```

Do not infer architecture solely from folder names.

Inspect actual dependencies.

---

# 8. Architecture Drift Detection

If existing code violates the intended architecture:

Do not automatically rewrite the entire area.

Instead:

1. Identify the violation.
2. Determine whether the requested feature depends on it.
3. Fix only what is necessary.
4. Preserve working behavior.
5. Record larger architectural debt separately.

---

# 9. Task Classification

Every task should first be classified.

Possible types:

```text
Feature
Bug fix
Refactor
Database change
API change
Security change
Frontend change
Synchronization change
Testing
Documentation
Infrastructure
```

This determines the review and testing requirements.

---

# 10. Scope Check

Before implementation, verify the feature against:

```text
inventra-mvp-scope
```

Determine:

```text
P0
P1
P2
Outside scope
```

If the feature is outside MVP:

Do not silently implement it.

---

# 11. Requirement Extraction

Extract explicit requirements from the request.

Separate:

```text
Must have
Should have
Nice to have
Unclear
```

Do not turn every possible interpretation into a requirement.

---

# 12. Ambiguity Rule

If an ambiguity materially affects:

* Data model
* Security
* Financial correctness
* Inventory correctness
* Synchronization
* API compatibility

stop and ask for clarification.

Do not invent a business rule.

---

# 13. Minor Ambiguity

If an ambiguity has a safe, reversible interpretation and does not affect
business correctness, use the existing project convention.

Document the assumption if it matters.

---

# 14. Plan Before Coding

For meaningful tasks, create a short implementation plan.

Example:

```text
1. Add domain model
2. Add repository
3. Add application use case
4. Add API DTO
5. Add endpoint
6. Add migration
7. Add tests
8. Update documentation
```

Do not produce an enormous plan for a one-line fix.

---

# 15. Plan Granularity

Plans should match task size.

### Small task

```text
1–3 steps
```

### Medium task

```text
3–8 steps
```

### Large task

Break into independently verifiable phases.

---

# 16. Large Feature Rule

Do not implement a large feature in one uncontrolled change.

Break it into:

```text
Foundation
 ↓
Domain
 ↓
Persistence
 ↓
API
 ↓
Frontend
 ↓
Offline/sync
 ↓
Testing
```

where appropriate.

---

# 17. Database-First Dependencies

If the feature requires database structures, determine the schema before
implementing persistence code.

Do not write repository logic against a schema that has not been designed.

---

# 18. API-First Dependencies

If multiple clients depend on an API:

```text
Web
Desktop
Android
```

define the contract before implementing platform-specific assumptions.

---

# 19. Screen-to-API Mapping

For frontend features, map:

```text
Screen
 ↓
User action
 ↓
Data required
 ↓
API call
 ↓
Request
 ↓
Response
 ↓
Error states
 ↓
Offline behavior
```

before final integration.

---

# 20. Backend-to-Screen Mapping

For backend endpoints, identify:

```text
Which screen consumes this?
Which action triggers it?
Which clients use it?
Does offline sync use it?
```

An API that no client needs should be questioned.

---

# 21. Implementation Order

Prefer this general backend sequence:

```text
Domain
 ↓
Application/use case
 ↓
Persistence
 ↓
API
 ↓
Tests
```

Adapt when the architecture requires a different order.

---

# 22. Frontend Implementation Order

Prefer:

```text
Screen structure
 ↓
State model
 ↓
API abstraction
 ↓
Data mapping
 ↓
Loading/error states
 ↓
User interactions
 ↓
Offline behavior
 ↓
Tests
```

---

# 23. Avoid Giant Files

If a file becomes responsible for:

```text
UI
API
Database
Business logic
Validation
Synchronization
```

stop and split responsibilities.

---

# 24. One Responsibility

Classes/components should have focused responsibilities.

This does not mean every class must contain exactly one method.

It means the abstraction should have a coherent reason to change.

---

# 25. Reuse Existing Abstractions

Before creating:

```text
NewService
NewRepository
NewMapper
NewUtils
NewApiClient
```

search for existing abstractions.

Extend them if appropriate.

---

# 26. Do Not Over-Abstract

Do not create interfaces, factories, adapters, or frameworks solely to make
the code look architecturally sophisticated.

Abstraction must solve a real problem.

---

# 27. Implement the Smallest Correct Change

Prefer:

```text
Smallest change
+
Correct architecture
+
Tests
```

over:

```text
Rewrite everything
```

---

# 28. No Unrelated Refactoring

While implementing a feature, do not casually refactor unrelated code.

If unrelated technical debt is discovered:

```text
Record it
```

rather than silently expanding the task.

---

# 29. Refactoring Exception

An unrelated refactor may be included only when:

* The feature cannot be safely implemented otherwise.
* The change is small and well understood.
* Existing behavior remains protected by tests.

---

# 30. Preserve Existing Behavior

Unless explicitly changing behavior:

```text
Existing behavior
        ↓
must remain intact
```

after refactoring.

---

# 31. Backward Compatibility

Before changing shared functionality, check:

```text
Web
Desktop
Android
API consumers
Offline clients
Synchronization
```

---

# 32. API Change Workflow

For an API change:

```text
1. Identify consumers
2. Identify breaking/non-breaking change
3. Update contract
4. Update backend
5. Update clients
6. Update tests
7. Update documentation
```

---

# 33. Database Change Workflow

For a schema change:

```text
1. Understand existing schema
2. Identify affected data
3. Design migration
4. Create Flyway migration
5. Update domain
6. Update persistence
7. Update API if required
8. Test migration
9. Test existing behavior
```

---

# 34. Migration Safety

Never modify an already-applied production migration to change history.

Create a new migration.

---

# 35. Data Migration

If a schema change requires existing data transformation:

Document:

```text
Source state
Target state
Transformation
Rollback/recovery considerations
```

Do not assume production data resembles development seed data.

---

# 36. Security Review

Every feature must ask:

```text
Who can access it?
Which tenant owns it?
Which role/permission is required?
Can another tenant access it?
Does it expose sensitive information?
```

---

# 37. Authentication Review

For authenticated endpoints verify:

```text
Unauthenticated request
Authenticated request
Expired session
Invalid credentials
```

where applicable.

---

# 38. Authorization Review

Test at least:

```text
Authorized user
Unauthorized user
Wrong role/permission
Wrong tenant
```

for sensitive operations.

---

# 39. Tenant Isolation Review

For tenant-scoped data verify:

```text
Tenant A can access A
Tenant A cannot access B
```

Do not assume a frontend tenant selector provides isolation.

---

# 40. Input Validation

Validate input at appropriate boundaries.

Check:

* Required fields
* Length
* Format
* Range
* Relationships
* Business constraints

---

# 41. Validation Duplication

Some validation may exist in:

```text
Frontend
API
Domain
Database
```

This is acceptable when each layer serves a different purpose.

Do not remove backend validation simply because frontend validation exists.

---

# 42. Billing Implementation Workflow

For billing changes, inspect:

```text
Product
Batch
Inventory
Invoice
Invoice lines
Payment
Customer
Synchronization
```

before modifying the flow.

---

# 43. Billing Critical Path

Billing should be treated as a critical transaction:

```text
Cart
 ↓
Validation
 ↓
Stock/business validation
 ↓
Payment
 ↓
Invoice completion
 ↓
Inventory movement
 ↓
Persistence
 ↓
Synchronization if offline
```

The exact transaction ordering follows the domain design.

---

# 44. Billing Testing

Any billing change should consider:

```text
Normal sale
Insufficient stock
Invalid quantity
Duplicate submission
Payment failure
Offline sale
Retry
Application restart
Synchronization
Cancellation
```

---

# 45. Inventory Implementation Workflow

Before modifying inventory:

Inspect:

```text
Product
Batch
Stock
Inventory movement
Purchase
Sale
Return
Adjustment
Sync
```

Do not modify stock directly without understanding the movement model.

---

# 46. Inventory Testing

Consider:

```text
Purchase adds stock
Sale reduces stock
Return changes stock correctly
Adjustment is auditable
Concurrent operations
Offline transaction
Synchronization
Duplicate processing
```

---

# 47. Purchase Implementation Workflow

Inspect:

```text
Supplier
Purchase
Purchase lines
Batch
Expiry
Inventory
Pricing
Tax behavior
```

before changing purchasing behavior.

---

# 48. Synchronization Implementation Workflow

Synchronization changes require extra caution.

Before modifying:

```text
Local transaction
Outbox/pending queue
Remote transaction
Idempotency
Conflict handling
Retry
Recovery
```

---

# 49. Sync Testing

Always consider:

```text
Offline creation
Online synchronization
Retry
Duplicate request
Network timeout
Partial failure
Conflict
Restart before sync
Restart during sync
Already-synced transaction
```

---

# 50. Frontend Workflow

For a new screen:

```text
1. Identify user goal
2. Identify route
3. Identify data
4. Identify API
5. Identify permissions
6. Identify states
7. Build UI
8. Connect API
9. Add offline behavior where required
10. Test
```

---

# 51. UI States

Every important screen should consider:

```text
Loading
Success
Empty
Validation error
Network error
Permission denied
Offline
Pending synchronization
```

where relevant.

---

# 52. Do Not Fake States

Do not create a UI state that does not correspond to real application state.

For example:

```text
"Synced"
```

must not be displayed merely because the API request was initiated.

---

# 53. Offline UI

Offline-capable screens must distinguish:

```text
Completed locally
```

from:

```text
Synchronized with cloud
```

where that distinction matters.

---

# 54. Testing Before Declaring Done

Do not say a feature is complete merely because:

```text
Application starts
```

The relevant workflow must be tested.

---

# 55. Test Pyramid

Use the project's testing strategy:

```text
Many unit tests
      ↓
Integration tests
      ↓
API tests
      ↓
Few high-value E2E tests
```

Do not make everything an E2E test.

---

# 56. Unit Test Rule

Business logic should be testable without requiring:

```text
Browser
Database
Network
```

where architecture permits.

---

# 57. Integration Test Rule

Use integration tests for:

* Database behavior
* Spring integration
* Security integration
* API persistence
* Transaction behavior

---

# 58. E2E Test Rule

Use E2E tests for critical user workflows.

Do not attempt to cover every edge case exclusively through E2E.

---

# 59. Test Failure Handling

When a test fails:

Do not immediately modify production code until the failure is understood.

Determine:

```text
Test bug?
Implementation bug?
Environment bug?
Data/setup bug?
Race condition?
```

---

# 60. No Test Suppression

Do not disable or weaken a failing test simply to make the build green.

If the requirement changed, update the test intentionally.

---

# 61. Build Verification

After implementation:

```text
Compile
 ↓
Run relevant tests
 ↓
Run broader tests
 ↓
Review build output
```

Do not assume compilation means correctness.

---

# 62. Static Checks

Where configured, run:

* Formatter
* Linter
* Static analysis
* Dependency vulnerability checks

---

# 63. Migration Verification

If database migrations changed:

Verify:

```text
Fresh database
Existing database upgrade
```

where practical.

---

# 64. Frontend Build Verification

For frontend changes:

```text
Type check
Lint
Unit/component tests
Build
```

where configured.

---

# 65. Cross-Platform Verification

If a shared API/backend behavior changes, check all affected clients:

```text
Web
Desktop
Android
```

Do not update only the currently open screen.

---

# 66. Observability Review

For meaningful backend changes, ask:

```text
What happens if this fails?
How will we diagnose it?
Is there enough context in logs?
Is a metric needed?
Is the business event auditable?
```

---

# 67. Documentation Review

After implementation determine whether the change affects:

```text
README
API docs
Architecture docs
ADR
Database docs
Sync docs
Frontend mapping
MVP scope
```

Update only what actually changed.

---

# 68. Git Review

Before committing:

```text
git status
```

Inspect changed files.

Do not blindly commit the entire repository.

---

# 69. Diff Review

Review:

```text
git diff
```

for unexpected:

* Deleted files
* Configuration changes
* Secrets
* Generated files
* Large unrelated changes

---

# 70. Generated Files

Do not commit generated build artifacts unless the repository explicitly
requires them.

Examples:

```text
target/
build/
dist/
node_modules/
```

follow the repository's `.gitignore`.

---

# 71. Temporary Files

Do not commit:

```text
.temp-*
debug files
local databases
IDE temporary files
logs
```

unless intentionally required.

---

# 72. Skills Directory

The project's `.agents/skills/` directory is part of the AI development
environment.

Do not delete or modify skills casually.

If a skill needs correction, make the change intentionally.

---

# 73. Temporary Skill Sources

Temporary cloned repositories such as:

```text
.temp-spring-boot-skills/
```

should not become accidental application dependencies.

They are development guidance, not runtime dependencies.

---

# 74. External Skill Conflicts

If an external skill recommends something that conflicts with an explicit
Inventra architecture decision:

Prefer the Inventra project decision.

Do not blindly copy external repository architecture.

---

# 75. AI Generated Dependencies

AI must not add a dependency simply because a generated example uses it.

Verify:

```text
Need
Compatibility
Security
Maintenance
License
Project conventions
```

---

# 76. No Blind Copy/Paste

External examples may provide guidance.

Before using them:

* Understand the code.
* Adapt it to Inventra.
* Check security.
* Check architecture.
* Check dependencies.

---

# 77. Search Before Create

Before creating a new class/function/component:

```text
Search repository
```

for equivalent functionality.

---

# 78. Search Before Modify

Before changing a public method/API/entity:

Search all usages.

Do not change a method signature without understanding its consumers.

---

# 79. Search After Modify

After a structural change:

Search for:

```text
Old class name
Old method name
Old API field
Old route
Old table name
```

to detect stale references.

---

# 80. Compile Early

For non-trivial changes:

```text
Implement small piece
 ↓
Compile/test
 ↓
Continue
```

Do not write 2,000 lines before discovering the first type/design error.

---

# 81. Incremental Commits

When practical:

```text
Foundation
 ↓
Domain
 ↓
API
 ↓
Tests
```

can be committed separately.

This makes rollback easier.

---

# 82. Stop Conditions

The AI should stop implementation when:

* The requested task is complete.
* Tests pass.
* Required documentation is updated.
* No unresolved critical issue remains.

Do not continue adding "nice improvements."

---

# 83. Scope Stop Condition

If implementation reveals a new feature opportunity:

```text
Record it
Stop
```

unless explicitly requested.

---

# 84. Refactoring Stop Condition

If a refactor begins expanding into:

```text
Architecture rewrite
Database redesign
API redesign
Frontend rewrite
```

stop and request explicit approval.

---

# 85. Security Stop Condition

If implementation reveals a potentially serious security issue:

Stop normal feature development and address the security issue first.

---

# 86. Data Integrity Stop Condition

If a change risks:

```text
Duplicate invoices
Lost transactions
Incorrect stock
Corrupted synchronization
```

do not proceed with a quick workaround.

Redesign the affected operation.

---

# 87. Ambiguous Database Stop Condition

If the database model cannot be determined without inventing business
behavior:

Stop and clarify.

---

# 88. Ambiguous API Stop Condition

If the API contract affects multiple clients and cannot be determined safely:

Stop and clarify before implementing a breaking contract.

---

# 89. Ambiguous Sync Stop Condition

If synchronization behavior is unclear:

Stop.

Do not invent conflict resolution.

Synchronization bugs can create real inventory/financial inconsistencies.

---

# 90. Review Before Completion

Before reporting completion, perform a mental review:

```text
Architecture
Domain
Security
Database
API
Frontend
Offline
Synchronization
Testing
Observability
Documentation
```

---

# 91. Completion Report

When a task is complete, report concisely:

```text
Implemented:
- ...

Changed:
- ...

Tests:
- ...

Database:
- ...

API:
- ...

Notes:
- ...
```

Do not claim tests were run if they were not.

---

# 92. Honest Status

Use accurate status:

```text
Implemented
Tested
Partially tested
Not tested
Blocked
Needs clarification
```

Never say:

```text
"Everything works"
```

without verification.

---

# 93. AI Must Not Pretend

The AI must never claim to have:

* Run a command it did not run.
* Read a file it did not read.
* Tested an endpoint it did not test.
* Verified a database migration it did not verify.
* Checked a deployment it did not check.

---

# 94. User Confirmation

Explicit confirmation should be requested before:

* Destructive migrations
* Data deletion
* Major architecture changes
* Large rewrites
* Production-impacting operations

---

# 95. Safe Defaults

When uncertain, prefer:

```text
Read
Inspect
Plan
Ask
```

over:

```text
Delete
Rewrite
Migrate
Assume
```

---

# 96. No Destructive Commands Without Intent

Do not casually execute:

```text
rm -rf
git reset --hard
DROP DATABASE
DROP TABLE
force push
```

or equivalent destructive operations.

---

# 97. Local Development Safety

Development commands should not accidentally target production.

Verify environment configuration before destructive database operations.

---

# 98. Production Safety

Never run production-impacting operations merely because they are convenient
for local development.

---

# 99. Database Reset

Database reset scripts must be clearly identified as development/test tools.

Never make production reset easy to invoke accidentally.

---

# 100. Secrets Safety

Before sharing output with the user, check that it does not expose:

```text
Passwords
Tokens
Private keys
Database credentials
API secrets
```

---

# 101. Logs Safety

Before sharing logs, redact sensitive information.

---

# 102. Code Generation Principle

Generated code must be treated as a draft until:

```text
Reviewed
Tested
Integrated
```

---

# 103. AI Context Management

Do not repeatedly reread the entire repository unnecessarily.

Start with:

```text
Relevant skill
Relevant files
Relevant tests
Relevant configuration
```

Expand only when necessary.

---

# 104. AI Search Strategy

Use targeted repository searches.

Search for:

```text
Class
Method
Endpoint
Table
Domain term
Configuration
```

before opening large unrelated files.

---

# 105. AI File Editing

When modifying a file:

1. Read the relevant section.
2. Understand surrounding code.
3. Make the smallest appropriate change.
4. Re-read the modified section.
5. Run relevant verification.

---

# 106. AI Code Review

After writing code, review it as if another engineer submitted it.

Ask:

```text
Would this survive another developer changing the feature six months later?
```

---

# 107. Complexity Review

Ask:

```text
Did this change make the system more complicated than necessary?
```

If yes, simplify.

---

# 108. Duplication Review

Ask:

```text
Did I duplicate an existing concept?
```

If yes, consolidate where safe.

---

# 109. Boundary Review

Ask:

```text
Did I put this logic in the correct layer/module?
```

If no, move it before completion.

---

# 110. Security Review

Ask:

```text
Can a malicious client bypass this by calling the API directly?
```

If yes, the backend authorization is incomplete.

---

# 111. Offline Review

For offline-capable features ask:

```text
What happens with no internet?
What happens after restart?
What happens after power loss?
What happens after reconnect?
What happens if sync retries?
```

---

# 112. Concurrency Review

For inventory/billing/sync ask:

```text
What if two devices perform this operation simultaneously?
```

---

# 113. Failure Review

Ask:

```text
What if the database fails?
What if the network times out?
What if the request succeeds but the response is lost?
What if the application crashes?
```

---

# 114. Idempotency Review

For retryable critical operations ask:

```text
Can this request safely run twice?
```

If not, establish idempotency.

---

# 115. Historical Data Review

Ask:

```text
Could this change rewrite history?
```

If yes, reconsider.

---

# 116. Tenant Review

Ask:

```text
Can this query accidentally return another tenant's data?
```

If yes, fix before proceeding.

---

# 117. API Contract Review

Ask:

```text
Would an older Desktop or Android client break?
```

If yes, plan compatibility.

---

# 118. Performance Review

Ask:

```text
Could this introduce:
N+1 queries?
Huge payloads?
Unbounded lists?
Excessive polling?
Slow startup?
```

---

# 119. Observability Review

Ask:

```text
If this fails in production, how will we know?
```

---

# 120. Documentation Review

Ask:

```text
Would another developer understand this six months later?
```

---

# 121. Definition of Done

A meaningful implementation is complete when:

* [ ] Requirement understood.
* [ ] Relevant skills reviewed.
* [ ] Existing implementation inspected.
* [ ] Scope confirmed.
* [ ] Plan created.
* [ ] Correct architecture used.
* [ ] Implementation completed.
* [ ] Tests added/updated.
* [ ] Relevant tests executed.
* [ ] Security reviewed.
* [ ] Database/API compatibility reviewed.
* [ ] Offline/sync implications reviewed.
* [ ] Observability considered.
* [ ] Documentation updated.
* [ ] Diff reviewed.
* [ ] No unrelated changes remain.
* [ ] Completion status reported honestly.

---

# 122. Final Development Loop

Every feature should follow:

```text
┌───────────────────────┐
│ 1. Understand         │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 2. Inspect repository │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 3. Read skills        │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 4. Check MVP scope    │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 5. Plan               │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 6. Implement          │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 7. Test               │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 8. Review              │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 9. Document           │
└──────────┬────────────┘
           ↓
┌───────────────────────┐
│ 10. Verify & stop     │
└───────────────────────┘
```

---

# 123. Final Principle

The AI is not rewarded for producing the most code.

It is rewarded for producing the smallest correct change that moves Inventra
forward without damaging:

```text
Architecture
+
Data integrity
+
Security
+
Offline operation
+
Synchronization
+
Maintainability
```

> Inspect first. Plan second. Code third. Verify before declaring victory.

