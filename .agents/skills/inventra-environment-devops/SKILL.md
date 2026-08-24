---
name: inventra-environment-devops
description: >
  Defines Inventra's local development, environment configuration, Docker,
  PostgreSQL, Flyway, Spring Boot profiles, secrets handling, build processes,
  Web/Desktop/Android development environments, CI/CD, staging, production,
  deployment, backup, recovery, and operational safety rules. Use this skill
  whenever configuring, running, building, packaging, testing, deploying, or
  troubleshooting Inventra environments.
---

# Inventra Environment & DevOps

## 1. Purpose

This document defines how Inventra is developed, configured, built, tested,
packaged, deployed, and operated.

The goal is:

- Reproducible development
- Safe configuration
- Simple deployment
- Clear environment separation
- Reliable database management
- Safe migrations
- Secure secret handling
- Predictable builds
- Recoverable production systems

The MVP should remain operationally simple.

---

# 2. Environment Model

Inventra uses separate environments.

Minimum:

```text
local
test
staging
production
````

Each environment must have independent configuration.

---

# 3. Environment Separation

Never assume:

```text
local == staging == production
```

Configuration, databases, credentials, external services, and secrets must be
environment-specific.

---

# 4. Local Development

A developer should be able to run the core backend locally without depending
on production infrastructure.

Expected local components:

```text
Inventra Backend
    ↓
PostgreSQL
```

Additional infrastructure should only be started when required.

---

# 5. Local Development Principle

Local development must be simple.

Avoid requiring developers to run:

```text
Kafka
Redis
Elasticsearch
Kubernetes
Multiple databases
Multiple backend services
```

unless the feature genuinely requires them.

---

# 6. Docker

Docker may be used to make local infrastructure reproducible.

Preferred local approach:

```text
Developer machine
        ↓
Docker Compose
        ↓
PostgreSQL
```

The backend may run directly from the IDE/terminal when useful.

---

# 7. Docker Is Not the Architecture

Docker is an environment/tooling mechanism.

Do not create unnecessary containers merely because Docker makes it easy.

---

# 8. Docker Compose

If Docker Compose is used, it should primarily provide local dependencies.

Example:

```text
docker-compose.yml
```

may contain:

```text
postgres
```

and future dependencies only when required.

---

# 9. PostgreSQL

PostgreSQL is the primary relational database for the application unless an
explicit architecture decision changes it.

Use PostgreSQL for transactional business data.

---

# 10. Local PostgreSQL

Local PostgreSQL should be reproducible.

Prefer:

```text
Docker
```

or an explicitly documented local installation.

Do not make development depend on one developer's undocumented local setup.

---

# 11. Database Credentials

Local credentials must not be production credentials.

Example:

```text
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventra
DB_USERNAME=inventra
DB_PASSWORD=local-development-password
```

The actual local values may differ.

Never commit real production credentials.

---

# 12. Database Naming

Use explicit environment-specific database names.

Example:

```text
inventra_local
inventra_test
inventra_staging
inventra_prod
```

Do not accidentally point local development at production.

---

# 13. Database Port

The default PostgreSQL port may be:

```text
5432
```

unless local machine configuration requires another port.

Do not hardcode the port throughout the application.

---

# 14. Spring Boot Configuration

Use Spring Boot configuration files appropriately.

Typical structure:

```text
application.yml
application-local.yml
application-test.yml
application-staging.yml
application-prod.yml
```

Avoid duplicating the same configuration unnecessarily.

---

# 15. Configuration Hierarchy

Use:

```text
Application defaults
        ↓
Environment profile
        ↓
Environment variables/secrets
```

for environment-specific configuration.

---

# 16. Profiles

Use Spring profiles for environment behavior.

Example:

```text
local
test
staging
prod
```

Do not create a profile for every developer.

---

# 17. Active Profile

The active profile should be explicit.

For local development:

```text
SPRING_PROFILES_ACTIVE=local
```

The exact mechanism may differ depending on the deployment environment.

---

# 18. Production Profile

Production configuration must never depend on local defaults.

Production must explicitly configure:

* Database
* Security
* Logging
* External services
* CORS
* Storage
* Synchronization
* Observability

---

# 19. Secrets

Never commit:

```text
Passwords
API keys
JWT secrets
Private keys
Database credentials
Cloud credentials
Encryption keys
```

to Git.

---

# 20. Secret Storage

Production secrets should be supplied through an appropriate secret mechanism.

Examples:

```text
Environment variables
Secret manager
Platform secret storage
```

The exact provider is a deployment decision.

---

# 21. `.env`

`.env` may be used locally if the project's tooling requires it.

Never commit real secrets.

Provide:

```text
.env.example
```

when useful.

---

# 22. `.env.example`

Example:

```text
DATABASE_URL=
DATABASE_USERNAME=
DATABASE_PASSWORD=
JWT_SECRET=
```

The example must contain placeholders, not real credentials.

---

# 23. Git Ignore

The repository must ignore sensitive/local files.

Typical examples:

```text
.env
.env.*
!.env.example

*.log

target/
build/
node_modules/
```

The exact `.gitignore` depends on the repository.

---

# 24. Local Files

Do not commit:

```text
Local databases
IDE metadata
Temporary logs
OS files
Build output
Personal configuration
```

unless intentionally required.

---

# 25. Java Version

The project must use one defined Java version.

The version must be consistent across:

```text
Local
CI
Docker
Staging
Production
```

Do not allow developers to unknowingly build with different Java versions.

---

# 26. Spring Boot Version

Inventra targets the agreed Spring Boot version.

Do not silently change Spring Boot versions.

Framework upgrades require:

```text
Compatibility review
Dependency review
Testing
Migration planning
```

---

# 27. Maven

If Maven is the chosen build system, Maven configuration must be centralized
and reproducible.

Use:

```text
mvnw
mvnw.cmd
```

where appropriate so developers do not need a globally installed Maven
version.

---

# 28. Maven Wrapper

Prefer the Maven Wrapper for project builds.

Example:

```text
./mvnw clean test
```

Windows:

```text
.\mvnw.cmd clean test
```

---

# 29. Dependency Versions

Dependency versions should be managed centrally.

Do not randomly specify versions throughout modules.

Use Spring Boot dependency management where appropriate.

---

# 30. Dependency Updates

Before upgrading a dependency:

1. Check compatibility.
2. Check security issues.
3. Check breaking changes.
4. Run tests.
5. Build the application.
6. Review runtime behavior.

---

# 31. Build Reproducibility

A clean checkout should be able to produce the same application using the
documented toolchain.

Avoid dependencies on:

```text
Developer-specific paths
Global environment hacks
Manual IDE configuration
Untracked files
```

---

# 32. Backend Build

The backend must have a documented build command.

Example:

```text
.\mvnw clean verify
```

The exact command may change with the project configuration.

---

# 33. Backend Run

Local development should have a documented run command.

Example:

```text
.\mvnw spring-boot:run
```

with the appropriate local profile.

---

# 34. Backend Health

The backend should expose an appropriate health mechanism.

The health endpoint must not expose sensitive information.

---

# 35. Application Port

The backend should use a configurable port.

A common local default:

```text
8080
```

Do not hardcode client assumptions around a development-only port.

---

# 36. API Base URL

Clients should obtain the backend URL from environment/platform configuration.

Do not scatter:

```text
http://localhost:8080
```

through frontend code.

---

# 37. CORS

CORS must be configured intentionally.

Do not use:

```text
allow all origins
```

in production.

Local development may use explicitly configured development origins.

---

# 38. HTTPS

Production traffic must use HTTPS.

Do not expose production authentication or business APIs over plain HTTP.

---

# 39. TLS Termination

TLS may be terminated at:

```text
Reverse proxy
Load balancer
Cloud platform
```

The application architecture must know whether requests arrive directly or
through a proxy.

---

# 40. Reverse Proxy

A reverse proxy may handle:

* TLS
* Routing
* Compression
* Security headers
* Static frontend delivery

Do not introduce a reverse proxy unless deployment architecture requires it.

---

# 41. Web Deployment

The Web application should be deployable independently from the backend
when practical.

Typical flow:

```text
Web build
    ↓
Static assets / frontend hosting
    ↓
Backend API
```

The exact hosting provider is not part of this skill.

---

# 42. Desktop Application

The Desktop application is a real installable application.

It must not depend on a developer machine being available.

---

# 43. Desktop Architecture

Desktop consists conceptually of:

```text
Desktop UI
    ↓
Local application/runtime
    ↓
Local database
    ↓
Cloud synchronization
```

The exact runtime technology is defined by the frontend platform architecture.

---

# 44. Desktop Backend

The Desktop application may package or run a local backend/runtime if that is
part of the chosen architecture.

Do not assume the production cloud backend must be embedded unchanged inside
the Desktop application.

---

# 45. Desktop `.exe`

The Desktop product must eventually produce an installable Windows package.

Examples:

```text
Inventra-Setup.exe
Inventra.msi
```

The exact packaging format is a release decision.

---

# 46. Desktop Installation

Installation must not require developers to manually:

```text
Install Java
Configure PostgreSQL
Run Spring Boot manually
Set environment variables
```

for normal end users.

The production desktop package should bundle or manage required runtime
dependencies appropriately.

---

# 47. Desktop Local Database

The Desktop application must use a local database for supported offline
operations.

The exact database technology is defined by the offline architecture.

---

# 48. Desktop Data Location

User data should be stored in an appropriate application data directory.

Do not store business data inside:

```text
Application installation directory
```

unless the platform architecture explicitly requires it.

---

# 49. Desktop Updates

The architecture should allow application updates.

Do not require users to manually replace application files for every release.

Automatic updates may be implemented later if not required for MVP.

---

# 50. Desktop Crash Recovery

Desktop must persist critical transaction state.

Do not rely on process memory for completed business transactions.

---

# 51. Android Build

Android builds must be reproducible through the project's configured Android
toolchain.

Do not depend on one developer's Android Studio setup.

---

# 52. Android Application ID

The Android application ID must be stable once released.

Do not casually change it after production distribution.

---

# 53. Android Environments

Android should support appropriate environment configuration.

At minimum:

```text
Development
Production
```

Staging may be added if needed.

---

# 54. Android API Configuration

The API endpoint must be configurable.

Do not hardcode a developer's local machine IP into the production build.

---

# 55. Android Offline Database

The Android application must persist required offline data locally.

The local database must survive:

```text
App restart
Temporary network loss
Normal background/foreground transitions
```

---

# 56. Android Sync

Synchronization must be resilient to:

```text
Wi-Fi switching
Mobile data switching
Background restrictions
Temporary network loss
Application restart
```

The exact implementation belongs to the sync architecture.

---

# 57. Android Release Signing

Production Android builds must use controlled signing credentials.

Never commit signing keys to Git.

---

# 58. Web Environment Configuration

Do not expose secrets in frontend environment variables.

Anything bundled into a browser application should be assumed publicly
visible.

---

# 59. Public vs Secret Configuration

Safe frontend configuration:

```text
API base URL
Public application settings
Feature flags intended for clients
```

Unsafe:

```text
Database password
JWT signing secret
Cloud private key
Internal API secret
```

---

# 60. Database Migrations

Flyway is the source of truth for schema evolution.

Migrations must be versioned and committed.

---

# 61. Local Migration

Local application startup may execute Flyway migrations automatically if this
is the chosen configuration.

The exact startup behavior must be consistent and documented.

---

# 62. Production Migration

Production migrations must be controlled.

Do not run arbitrary SQL manually against production as part of normal
deployment.

---

# 63. Migration Order

Migrations must execute in deterministic order.

Never rely on:

```text
Developer execution order
```

to produce a valid production schema.

---

# 64. Backward-Compatible Migrations

When possible, use an expand/contract approach.

Example:

```text
Release A:
Add new nullable column

Release B:
Write both representations

Release C:
Migrate existing data

Release D:
Remove old representation
```

This is especially important when multiple client versions may exist.

---

# 65. Destructive Migrations

Destructive database changes require explicit review.

Examples:

```text
DROP COLUMN
DROP TABLE
Data deletion
Type conversion with data loss
```

---

# 66. Database Backup

Production database backups are mandatory.

Backups must be:

* Automated
* Tested
* Retained according to policy
* Protected
* Recoverable

---

# 67. Backup Is Not Recovery

A successful backup does not prove recovery works.

Recovery procedures must be tested.

---

# 68. Restore Testing

Periodically verify that a backup can actually restore a usable database.

---

# 69. Recovery Point Objective

The deployment plan should define an acceptable maximum data-loss window.

This is especially important for:

```text
Billing
Payments
Inventory
```

---

# 70. Recovery Time Objective

The deployment plan should define how quickly the service needs to be
restored after a major failure.

The MVP should choose a practical target rather than enterprise-level
guarantees it cannot afford.

---

# 71. Production Database

Production database access must be restricted.

Application users should not have unnecessary administrative privileges.

---

# 72. Database Roles

Separate responsibilities where practical:

```text
Application user
Migration user
Administrative user
```

Do not run the application as PostgreSQL superuser.

---

# 73. Database Connection Pool

Use an appropriate connection pool.

Do not increase pool size arbitrarily.

Database capacity must be considered before increasing connections.

---

# 74. Database Timeouts

Configure appropriate connection and query timeouts.

Do not allow requests to hang indefinitely.

---

# 75. Database Monitoring

Monitor at least:

```text
Connection usage
Query failures
Slow queries
Database availability
Storage
Backup status
```

---

# 76. Storage Monitoring

Monitor disk usage.

A database running out of disk space is a critical operational failure.

---

# 77. Logs

Production logs must be structured where practical.

Logs should include enough context to diagnose failures.

---

# 78. Log Levels

Use appropriate levels:

```text
DEBUG
INFO
WARN
ERROR
```

Do not run verbose debug logging indefinitely in production.

---

# 79. Sensitive Logs

Never log:

```text
Passwords
Access tokens
Refresh tokens
Secrets
Full payment credentials
```

---

# 80. Request Correlation

Backend requests should have a correlation/request ID where practical.

This helps trace:

```text
Client request
 ↓
Backend
 ↓
Database
 ↓
External service
```

---

# 81. Synchronization Logs

Synchronization failures must contain enough context to identify:

```text
Device
Tenant
Transaction
Operation
Failure reason
Retry state
```

without exposing sensitive data.

---

# 82. Metrics

Basic production metrics should include:

```text
Request rate
Error rate
Latency
Database health
Sync success/failure
Pending sync volume
```

---

# 83. Alerts

Alerting should prioritize:

```text
Service unavailable
Database unavailable
High error rate
Synchronization failures
Backup failures
Storage exhaustion
```

Do not create alerts for every informational event.

---

# 84. Health Checks

Health checks should distinguish:

```text
Application process is alive
```

from:

```text
Application can actually serve business requests
```

where appropriate.

---

# 85. Readiness

If deployed in an orchestrated environment, readiness should reflect whether
the application is ready to receive traffic.

---

# 86. Liveness

Liveness should indicate whether the process is functioning.

Do not make liveness depend on every external dependency if doing so can cause
unnecessary restart loops.

---

# 87. CI

Continuous integration should run automatically on changes.

At minimum:

```text
Compile
Tests
Static checks
```

---

# 88. CI Pipeline

A basic pipeline:

```text
Checkout
   ↓
Install dependencies
   ↓
Compile
   ↓
Unit tests
   ↓
Integration tests
   ↓
Static analysis
   ↓
Build artifact
```

---

# 89. CI Database

Integration tests requiring PostgreSQL should use an isolated test database.

Possible approaches:

```text
Docker
Testcontainers
Dedicated CI database
```

Use the project-approved approach.

---

# 90. CI Secrets

CI secrets must be stored in the CI platform's secure secret mechanism.

Do not commit them.

---

# 91. Pull Request Checks

Pull requests should pass required checks before merge.

At minimum:

```text
Build
Tests
Static checks
```

---

# 92. Branch Protection

Production branches should be protected from accidental direct changes.

The exact Git workflow is project-specific.

---

# 93. Build Artifacts

Build artifacts should be identifiable.

Example:

```text
inventra-backend-1.0.0.jar
inventra-web-1.0.0
inventra-desktop-1.0.0.exe
inventra-android-1.0.0.apk
```

Exact naming may evolve.

---

# 94. Versioning

Use a consistent application version.

The version should be visible in release artifacts.

---

# 95. Release Version

Do not create meaningless versions:

```text
1.0-final-final
1.0-new
1.0-final2
```

Use a consistent versioning strategy.

---

# 96. Release Notes

Each release should document:

```text
New features
Bug fixes
Breaking changes
Database changes
Migration requirements
Known issues
```

---

# 97. Staging

Staging should resemble production where practical.

It should validate:

```text
Backend
Database
Authentication
Web
Synchronization
Deployment configuration
```

---

# 98. Staging Data

Do not use real customer production data in staging unless there is an
explicit approved and secured process.

Prefer synthetic/anonymized data.

---

# 99. Production Deployment

Production deployment must be deliberate.

Recommended:

```text
Build
 ↓
Test
 ↓
Artifact
 ↓
Deploy staging
 ↓
Verify
 ↓
Deploy production
 ↓
Health check
 ↓
Monitor
```

---

# 100. Deployment Rollback

Every production release should have a rollback/recovery strategy.

Application rollback may be straightforward.

Database rollback may not be.

Therefore database changes must be designed carefully.

---

# 101. Database Rollback Principle

Do not assume every database migration can simply be reversed.

For destructive/data-transforming migrations, recovery may require:

```text
Backup restore
Forward migration
Data recovery
```

---

# 102. Blue/Green Deployment

Not required for MVP.

Do not implement complex deployment strategies without a concrete
availability requirement.

---

# 103. Kubernetes

Not required for MVP.

Do not introduce Kubernetes merely because the system may scale later.

---

# 104. Cloud Provider

The MVP does not require commitment to a specific cloud provider inside
application code.

Keep deployment configuration portable where practical.

---

# 105. Cloud Architecture

The initial production system should prefer a simple architecture:

```text
             Internet
                 |
          Reverse Proxy
                 |
          Inventra Backend
                 |
             PostgreSQL
```

Additional services should be introduced only when required.

---

# 106. Object Storage

Object storage may be used for:

```text
PDFs
Documents
Images
Backups
```

when required.

Do not use object storage as a substitute for transactional database data.

---

# 107. File Uploads

Uploaded files must have:

* Validation
* Size limits
* Safe filenames
* Access control
* Malware/security consideration where appropriate

---

# 108. CDN

CDN usage is optional.

Do not introduce a CDN before there is a real performance/distribution need.

---

# 109. Email

Email infrastructure is not a core MVP dependency unless required for:

```text
Password reset
Critical account communication
```

Use a proper transactional email provider when needed.

---

# 110. SMS

SMS is not a core infrastructure dependency unless explicitly required.

---

# 111. WhatsApp

WhatsApp infrastructure is not an MVP dependency.

---

# 112. AI Infrastructure

AI infrastructure is not an MVP dependency.

---

# 113. Redis

Redis is not required for MVP by default.

Introduce it only when a concrete requirement exists.

---

# 114. Kafka

Kafka is not required for MVP by default.

Do not introduce Kafka for simple database-backed workflows.

---

# 115. Elasticsearch

Elasticsearch is not required for MVP.

Use PostgreSQL search/indexing capabilities first.

---

# 116. Monitoring

Monitoring must be proportional to the product.

At MVP:

```text
Application health
Database health
Errors
Latency
Synchronization
Backups
```

are more important than building a giant observability platform.

---

# 117. Local Development Commands

Document common commands in the repository.

Example:

```text
Start database:
docker compose up -d postgres

Run backend:
.\mvnw.cmd spring-boot:run

Run tests:
.\mvnw.cmd test

Full verification:
.\mvnw.cmd clean verify
```

Exact commands depend on the final repository configuration.

---

# 118. Windows Support

Because the Desktop MVP targets Windows, development documentation should
include Windows-compatible commands.

Do not document only Linux/macOS commands.

---

# 119. PowerShell

Where practical, provide PowerShell equivalents for common development
commands.

---

# 120. Cross-Platform Scripts

If a command is important enough to document repeatedly, prefer a project
script/tool over long platform-specific instructions.

---

# 121. Local Development Documentation

The README should eventually explain:

```text
Prerequisites
Environment setup
Database startup
Backend startup
Frontend startup
Testing
Build
```

---

# 122. Developer Onboarding

A new developer should be able to reach:

```text
Application running
```

without undocumented tribal knowledge.

---

# 123. Troubleshooting

Document common failures:

```text
Database unavailable
Port already in use
Migration failure
Wrong profile
Missing environment variable
Frontend API connection failure
Android emulator API failure
```

---

# 124. Port Conflicts

Do not solve port conflicts by changing hardcoded ports throughout the code.

Use configuration.

---

# 125. Local Database Reset

Provide a safe documented development reset mechanism.

It must be clearly marked:

```text
DEVELOPMENT ONLY
```

---

# 126. Seed Data

Development seed data may be provided for:

```text
Products
Users
Customers
Suppliers
```

where useful.

Do not confuse seed data with production migration data.

---

# 127. Production Seed Data

Production initialization should use controlled setup/migrations.

Do not automatically create fake customers or invoices.

---

# 128. Test Data

Test data should be deterministic.

Tests should not depend on data left behind by a previous developer/test run.

---

# 129. Local Time

Development environments should use explicitly understood timezone behavior.

Do not allow local machine timezone differences to create inconsistent tests.

---

# 130. Clock-Dependent Tests

Avoid tests that depend directly on the actual current time.

Use injectable/fixed clocks where appropriate.

---

# 131. Randomness

Tests requiring randomness must use deterministic seeds or controlled fixtures
where reproducibility matters.

---

# 132. File Paths

Do not hardcode Windows paths into application logic.

Bad:

```text
D:\inventra\data
```

Use platform/application configuration.

---

# 133. Application Data

Desktop local application data should use platform-appropriate application
data directories.

---

# 134. Android Storage

Android storage must follow Android platform requirements.

Do not assume arbitrary filesystem access.

---

# 135. Web Storage

Browser storage must not be treated as secure secret storage.

Do not store sensitive credentials carelessly in local storage.

---

# 136. JWT/Session Storage

The authentication architecture defines the correct token/session strategy.

Do not choose browser token storage merely because it is convenient.

---

# 137. Encryption

Sensitive local data may require encryption depending on the final security
architecture.

Do not invent cryptographic implementations.

Use established libraries/platform mechanisms.

---

# 138. Cryptographic Keys

Keys must have:

* Secure storage
* Rotation strategy where required
* Environment separation
* Access restrictions

---

# 139. Backup Encryption

Production backups containing sensitive business data should be protected.

---

# 140. Production Access

Production access must be restricted to authorized personnel.

Do not share production credentials through chat or source control.

---

# 141. Admin Access

Administrative access should be auditable where practical.

---

# 142. Emergency Operations

Production emergency procedures must be documented.

Examples:

```text
Database restore
Application rollback
Disable synchronization
Investigate stuck sync
Rotate secret
```

Do not improvise destructive emergency operations.

---

# 143. Synchronization Operations

Operators should be able to inspect:

```text
Pending synchronization
Failed synchronization
Retry state
Device status
```

without directly editing production database records.

---

# 144. Manual Data Modification

Direct database modification should be a last resort.

If required:

```text
Backup
Document
Review
Execute carefully
Verify
```

---

# 145. Production SQL

Never execute unreviewed SQL against production.

---

# 146. Migration Failure

If a migration fails:

Do not blindly rerun random SQL.

Determine:

```text
What failed?
Was the transaction rolled back?
What schema state exists?
Can the migration be safely rerun?
```

---

# 147. Deployment Failure

If deployment fails:

```text
Stop
Inspect logs
Determine failure
Decide rollback/recovery
```

Do not repeatedly deploy blindly.

---

# 148. Observability During Deployment

Monitor:

```text
Startup
Health
Error rate
Latency
Database connectivity
Synchronization
```

after production deployment.

---

# 149. Post-Deployment Verification

After deployment verify:

```text
Login
Core API
Database
Billing
Inventory
Synchronization
```

at minimum for a relevant release.

---

# 150. Release Gate

A production release should not proceed if:

```text
Critical tests fail
Migration is unsafe
Secrets are missing
Database is unavailable
Critical security issue exists
Synchronization is broken
```

---

# 151. Disaster Recovery

Document recovery for:

```text
Application failure
Database failure
Host failure
Credential compromise
Data corruption
Synchronization failure
```

---

# 152. Disaster Recovery Principle

The recovery system should be simpler than the failure it is designed to
handle.

Do not create an extremely complicated disaster-recovery architecture for an
MVP.

---

# 153. Production Data Priority

The most critical data includes:

```text
Invoices
Payments
Purchases
Inventory movements
Product master
Customer records
Supplier records
```

Backup and recovery priorities should reflect this.

---

# 154. Data Retention

Retention policies must be explicitly defined.

Do not automatically delete historical business data.

---

# 155. Log Retention

Log retention should balance:

```text
Debugging needs
Storage cost
Privacy
Security
```

---

# 156. Build Reproducibility Rule

A release artifact should be produced from:

```text
Source
+
Pinned dependencies
+
Known toolchain
```

not from an individual developer's machine state.

---

# 157. Environment Drift

If staging and production differ materially, document why.

Avoid:

```text
"It works in staging but production is configured differently."
```

as a normal operating model.

---

# 158. Infrastructure as Code

Infrastructure-as-code may be introduced when production infrastructure
becomes substantial.

For the MVP, keep it proportional.

Do not create hundreds of infrastructure files for a simple deployment.

---

# 159. Containerized Backend

The backend may eventually be packaged as a container.

The container should:

* Be reproducible
* Use a defined Java runtime
* Avoid storing persistent business data internally
* Receive configuration externally
* Expose health information

---

# 160. Container Rule

Do not store PostgreSQL production data inside a disposable backend container.

---

# 161. Container Logs

Applications should log to stdout/stderr in container environments where
appropriate.

---

# 162. Container Security

Do not run containers with unnecessary privileges.

---

# 163. Production Container

Production containers should not contain:

```text
Development secrets
Source control metadata
Unnecessary build tools
Debug artifacts
```

---

# 164. Image Versioning

Production images must be versioned/identifiable.

Do not deploy an ambiguous:

```text
latest
```

without traceability.

---

# 165. Android Distribution

The production Android application may eventually be distributed through:

```text
Google Play
```

or another controlled distribution mechanism.

The release process must preserve application identity and signing.

---

# 166. Desktop Distribution

Desktop releases should have identifiable versions and controlled packaging.

---

# 167. Web Distribution

Web releases should be traceable to a specific source/build version.

---

# 168. Client Compatibility

Because Web, Desktop, and Android may not update simultaneously:

API changes must consider version compatibility.

---

# 169. API Versioning

Use API versioning where the project architecture requires it.

Do not create a new API version for every small non-breaking change.

---

# 170. Sync Protocol Compatibility

Synchronization requires special compatibility consideration.

A new client must not corrupt synchronization with an older client.

---

# 171. Offline Client Updates

Do not assume every offline client updates immediately.

The sync protocol must tolerate supported client-version differences.

---

# 172. Feature Flags

Feature flags may be used for:

```text
Controlled rollout
Platform-specific behavior
Staging testing
```

Do not create hundreds of permanent feature flags.

---

# 173. Feature Flag Cleanup

Temporary flags must have a removal plan.

---

# 174. Configuration vs Feature Flag

Use configuration for:

```text
Environment behavior
```

Use feature flags for:

```text
Controlled feature availability
```

Do not mix the two arbitrarily.

---

# 175. Operational Simplicity

Every new infrastructure component must answer:

```text
Why do we need it?
Who operates it?
What happens when it fails?
What does it cost?
Can PostgreSQL/backend already solve the requirement?
```

If those questions cannot be answered, do not add it.

---

# 176. Final MVP Infrastructure

The preferred initial production shape is approximately:

```text
                    Users
                      |
          +-----------+-----------+
          |           |           |
         Web       Desktop      Android
          |           |           |
          +-----------+-----------+
                      |
                 HTTPS/API
                      |
              Inventra Backend
                      |
                PostgreSQL
                      |
             Backup / Storage
```

Desktop and Android additionally maintain local data required for offline
operation and synchronization.

---

# 177. What We Are NOT Building

The MVP infrastructure does not require:

```text
Kubernetes
Microservices
Kafka
Redis
Elasticsearch
Service Mesh
Multi-cloud
Dedicated hardware server
Mini-PC deployment
Complex data lake
AI infrastructure
Large analytics platform
```

unless an explicit requirement later changes the decision.

---

# 178. Environment Checklist

Before local development:

* [ ] Correct Java version.
* [ ] Maven wrapper works.
* [ ] PostgreSQL available.
* [ ] Correct Spring profile.
* [ ] Required environment variables configured.
* [ ] No production credentials.
* [ ] Flyway migrations work.
* [ ] Backend starts.

---

# 179. Backend Release Checklist

Before release:

* [ ] Build passes.
* [ ] Tests pass.
* [ ] Static checks pass.
* [ ] Database migration reviewed.
* [ ] Security reviewed.
* [ ] Configuration reviewed.
* [ ] Secrets available securely.
* [ ] Health check verified.
* [ ] Artifact version identified.
* [ ] Rollback plan understood.

---

# 180. Desktop Release Checklist

Before Desktop release:

* [ ] Production API configured.
* [ ] Local database works.
* [ ] Offline billing tested.
* [ ] Restart recovery tested.
* [ ] Synchronization tested.
* [ ] Duplicate transaction handling tested.
* [ ] Packaging works.
* [ ] Installer works.
* [ ] Version displayed correctly.

---

# 181. Android Release Checklist

Before Android release:

* [ ] Production API configured.
* [ ] Signing configured securely.
* [ ] Offline billing tested.
* [ ] Sync tested.
* [ ] App restart tested.
* [ ] Network switching tested.
* [ ] Permissions reviewed.
* [ ] Release build tested.

---

# 182. Web Release Checklist

Before Web release:

* [ ] Production API configured.
* [ ] No secrets bundled.
* [ ] Build succeeds.
* [ ] Authentication works.
* [ ] Authorization works.
* [ ] Critical workflows tested.
* [ ] Error handling verified.

---

# 183. Production Checklist

Before production deployment:

* [ ] Database backup verified.
* [ ] Migration reviewed.
* [ ] Artifact identified.
* [ ] Environment variables configured.
* [ ] Secrets configured.
* [ ] Health checks configured.
* [ ] Monitoring active.
* [ ] Rollback plan available.
* [ ] Critical workflows verified.

---

# 184. Final Principle

Inventra's infrastructure should be:

```text
Simple enough to operate
+
Strong enough to protect business data
+
Flexible enough to support Web/Desktop/Android
+
Reliable enough for billing and inventory
```

Do not confuse infrastructure complexity with product maturity.

> A small reliable system is better than a giant architecture nobody can
> operate.
