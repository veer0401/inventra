---
name: inventra-security-auth
description: >
  Defines the authoritative authentication, authorization, tenant isolation,
  password security, JWT, refresh token, device authentication, session,
  role, permission, account lifecycle, and security rules for Inventra
  Pharmacy ERP. Use this skill whenever implementing, modifying, reviewing,
  or testing login, signup, logout, password reset, JWT, refresh tokens,
  users, roles, permissions, tenant access, device registration, or security
  boundaries.
---

# Inventra Security & Authentication Rules

## 1. Purpose

This document defines the security model for Inventra.

Security must protect:

- User accounts
- Pharmacy tenants
- Business data
- Inventory
- Billing
- Payments
- Customer information
- Supplier information
- Offline devices
- Synchronization
- Administrative operations

The system must assume that clients can be compromised or manipulated.

The backend remains authoritative for security decisions.

---

# 2. Security Principle

Never trust the client.

The Web, Desktop, and Android applications are clients.

They may request an operation, but they do not decide whether the operation
is allowed.

The backend must independently verify:

- Authentication
- Tenant
- User
- Role
- Permission
- Resource ownership
- Business authorization

---

# 3. Authentication vs Authorization

Authentication answers:

> Who is this user?

Authorization answers:

> What is this user allowed to do?

Do not mix these concepts.

Example:

```text
Login
    ↓
Authentication
    ↓
Authenticated user
    ↓
Authorization
    ↓
Allowed operations
````

---

# 4. Authentication Technology

Inventra backend uses:

* Spring Security
* JWT-based authentication
* Secure password hashing
* Refresh-token based session renewal

Use the existing Spring Security skill as the technical implementation
reference.

This document defines Inventra-specific business/security rules.

---

# 5. Password Storage

Passwords must NEVER be stored as plain text.

Never store:

```text
password = "mypassword123"
```

or reversible encrypted passwords.

Use a strong adaptive password hashing algorithm supported by Spring Security,
such as BCrypt/Argon2 according to the final security configuration.

The database must store only the password hash and required metadata.

---

# 6. Password Requirements

Password requirements should provide reasonable protection without making
the pharmacy onboarding process unnecessarily difficult.

The exact password policy should be centralized.

Do not implement different password rules in:

* Web
* Desktop
* Android

The backend is authoritative.

---

# 7. Login

Login should accept the approved user identifier and password.

Conceptually:

```text
POST /api/v1/auth/login
```

The backend must:

1. Validate request.
2. Find account.
3. Verify account status.
4. Verify password.
5. Establish authenticated session/token state.
6. Return appropriate authentication information.

Do not reveal whether:

```text
email exists
```

or:

```text
password is wrong
```

in a way that enables easy account enumeration.

---

# 8. Authentication Failure

Invalid login attempts should produce a generic authentication failure.

Avoid responses such as:

```text
Email does not exist.
```

or:

```text
Password is incorrect.
```

Use a consistent message such as:

```text
Invalid credentials.
```

The exact wording is an API/UI decision.

---

# 9. Account Status

Users should have an explicit account lifecycle.

Potential states:

```text
ACTIVE
INACTIVE
LOCKED
SUSPENDED
```

The exact state model may evolve.

An inactive/locked/suspended user must not authenticate successfully.

---

# 10. Tenant Model

Inventra is multi-tenant.

Conceptually:

```text
Tenant
   |
   +-- Users
   +-- Stores
   +-- Products/settings where applicable
   +-- Suppliers
   +-- Customers
   +-- Purchases
   +-- Inventory
   +-- Sales
```

A user's tenant membership must be explicit.

Do not infer tenant ownership from arbitrary client input.

---

# 11. Tenant Context

For authenticated requests, tenant context must come from trusted server-side
authentication/session information.

Never trust:

```text
tenantId
```

sent by the client as proof that the user belongs to that tenant.

Example attack:

```text
Tenant A user

GET /api/v1/invoices?tenantId=Tenant-B
```

must not return Tenant B data.

---

# 12. Cross-Tenant Access

Cross-tenant access is forbidden unless an explicitly authorized platform
administration feature requires it.

Normal pharmacy users must never access another pharmacy's:

* Customers
* Suppliers
* Inventory
* Purchases
* Sales
* Reports
* Users
* Settings

---

# 13. Tenant Ownership

Every tenant-owned resource must be checked against the authenticated tenant.

For example:

```text
GET /api/v1/invoices/{id}
```

must verify:

```text
invoice.tenant == authenticatedTenant
```

before returning the resource.

Do not assume possession of an ID implies authorization.

---

# 14. User Roles

The initial role model may include:

```text
OWNER
MANAGER
CASHIER
INVENTORY_OPERATOR
```

The exact final role list may evolve.

Roles should represent meaningful responsibility boundaries.

Do not create dozens of roles merely to make the system look enterprise-grade.

---

# 15. Owner

The Owner should have broad control over the tenant.

Typical capabilities may include:

* Billing
* Purchases
* Inventory
* Customers
* Suppliers
* Reports
* User management
* Store settings
* Security settings
* Important corrections

The final permission matrix must be explicit.

---

# 16. Manager

Manager permissions should cover normal operational management.

Potential capabilities:

* Billing
* Purchases
* Inventory
* Returns
* Adjustments where permitted
* Reports
* Customer/supplier management

High-risk administrative actions may remain Owner-only.

---

# 17. Cashier

Cashier is primarily a billing role.

Typical capabilities:

* Product search
* Billing
* Customer selection
* Payment entry
* Invoice printing/viewing
* Approved returns where permitted

Cashier should not automatically receive:

* User administration
* Tenant settings
* Security configuration
* High-risk inventory adjustments
* Sensitive financial administration

---

# 18. Inventory Operator

Inventory Operator primarily handles:

* Inventory
* Purchases
* Stock receiving
* Batch information
* Adjustments where permitted
* Supplier operations

The exact permission matrix must be finalized before production.

---

# 19. Permissions

Roles should map to permissions.

Examples:

```text
invoice:create
invoice:complete
invoice:cancel

purchase:create
purchase:complete

inventory:view
inventory:adjust

customer:view
customer:create

supplier:view
supplier:create

report:view

user:view
user:create
user:disable
```

The final permission catalog should be centralized.

---

# 20. Permission Naming

Use consistent permission names.

Prefer:

```text
resource:action
```

Examples:

```text
invoice:create
invoice:complete
invoice:cancel
inventory:view
inventory:adjust
```

Avoid inconsistent names such as:

```text
CREATE_INVOICE
invoiceCreate
canCreateInvoice
```

within the same authorization model.

---

# 21. Backend Authorization

Every sensitive operation must be authorized by the backend.

Do not rely on:

```text
if (frontendButtonVisible)
```

as authorization.

A user who manually calls the API must still be rejected if unauthorized.

---

# 22. UI Permission Checks

The frontend may hide or disable controls based on permissions.

This is useful for UX.

However:

```text
UI permission check
≠
security boundary
```

The backend remains authoritative.

---

# 23. Authentication Token

Access tokens should be short-lived.

The exact expiration will be defined by the security configuration.

Do not create extremely long-lived access tokens merely to avoid refreshing.

---

# 24. Refresh Token

Refresh tokens may be used to obtain new access tokens.

Refresh tokens are sensitive credentials.

They must:

* Be protected
* Not be exposed unnecessarily
* Be revocable
* Be associated with appropriate session/device context

---

# 25. Refresh Token Storage

Do not store refresh tokens as plain text in the database if the chosen
security architecture supports secure hashing/token-family management.

The exact implementation must follow the Spring Security security design.

---

# 26. Refresh Token Rotation

Refresh token rotation should be considered to reduce replay risk.

If rotation is implemented:

```text
Refresh Token A
    ↓
Refresh
    ↓
Refresh Token B
```

Token A should no longer be usable according to the configured security
policy.

The implementation must safely handle retries and race conditions.

---

# 27. Logout

Logout should invalidate/revoke the appropriate session/refresh-token state.

For stateless access tokens, logout may primarily invalidate the refresh
session/token so that new access tokens cannot be issued.

Do not claim that an already-issued stateless JWT has magically disappeared
from the universe.

---

# 28. Multi-Device Sessions

A user may use:

* Desktop
* Android
* Web

at the same time.

Sessions should be tracked independently where required.

Example:

```text
User
 |
 +-- Desktop session
 +-- Android session
 +-- Web session
```

Do not force all devices to share one refresh token unless explicitly
designed that way.

---

# 29. Device Registration

Offline-capable Desktop and Android clients need stable device identity.

A device may be registered to a tenant/user context.

Potential metadata:

```text
device_id
device_type
installation_id
tenant_id
user_id
created_at
last_seen_at
status
```

The exact schema will be finalized with synchronization.

---

# 30. Device Trust

A registered device is not automatically permanently trusted.

The system should be capable of:

* Disabling a device
* Revoking its sessions
* Removing synchronization authorization
* Identifying its activity

This is important if a pharmacy device is lost or sold.

---

# 31. Lost Device

If an Android phone or desktop machine is lost:

An authorized user should eventually be able to disable/revoke that device.

The system must prevent the lost device from continuing to obtain new cloud
authorization.

Already-created offline transactions remain a synchronization/recovery
matter and must not be silently deleted.

---

# 32. Offline Authentication

Offline operation creates a special authentication requirement.

A device that has previously authenticated may need to continue operating
when the internet is unavailable.

The local authentication/session mechanism must therefore support controlled
offline operation.

However:

> Offline authentication must not become unrestricted permanent access.

The exact offline credential/cache design must be finalized before
implementation.

---

# 33. Offline User Access

The local client should know which user is authorized to operate that device.

Offline access should be limited to:

* The registered tenant
* The registered device
* Approved local users
* Approved offline permissions

Do not allow arbitrary offline user creation.

---

# 34. Offline Session Expiration

Offline authentication may use a controlled local session/cache.

The expiration policy must balance:

```text
Security
+
Pharmacy operational continuity
```

The exact duration must be explicitly configured.

Do not implement an infinite offline session.

---

# 35. Offline Owner/User Changes

If a user's account is disabled in the cloud while the device is offline,
the local device cannot know immediately.

When connectivity returns:

```text
Sync/authentication
    ↓
Server validates account
    ↓
Local session updated/revoked
```

The device must respect the server's latest security state.

---

# 36. Password Reset

Forgot-password functionality should be supported if account recovery is
part of the onboarding/authentication design.

Conceptually:

```text
Forgot Password
    ↓
Identity/recovery verification
    ↓
Reset credential
    ↓
Invalidate/review existing sessions
```

Do not implement password reset using security questions.

---

# 37. Password Reset Tokens

Password reset tokens must:

* Be random
* Be short-lived
* Be single-use
* Be revocable through completion
* Not expose account information unnecessarily

Never use:

```text
userId
+
timestamp
```

as a password reset token.

---

# 38. Session Revocation After Password Reset

After a successful password reset, existing sessions should be considered
for revocation.

The exact behavior must be defined by the security policy.

At minimum, the system must prevent an attacker who only knows an old
credential from continuing indefinitely.

---

# 39. Account Enumeration

Authentication and recovery endpoints must minimize account enumeration.

For example:

```text
Forgot password
```

should not reveal:

```text
This mobile number is registered.
```

versus:

```text
This mobile number does not exist.
```

Use consistent responses where appropriate.

---

# 40. Login Rate Limiting

Login endpoints should be protected against brute-force attacks.

Use appropriate controls such as:

* Rate limiting
* Account/device throttling
* Temporary lockout where justified

Do not permanently lock users after trivial mistakes.

---

# 41. Password Reset Rate Limiting

Password reset requests must also be rate-limited.

Otherwise attackers can abuse the endpoint for:

* Spam
* Enumeration
* Resource exhaustion

---

# 42. Token Leakage

Never log:

* Access tokens
* Refresh tokens
* Password reset tokens
* Passwords

Be careful with HTTP logging and debugging tools.

---

# 43. Sensitive Response Data

Authentication responses must not contain:

* Password hash
* Internal security fields
* Refresh-token internals
* Sensitive session metadata

Return only what the client needs.

---

# 44. JWT Claims

JWT claims should contain only information needed for authentication and
authorization.

Potential claims may include:

```text
sub
tenant
roles
permissions where appropriate
iat
exp
jti
```

Do not put large business objects into JWTs.

Do not put:

* Customer data
* Inventory data
* Product catalog
* Financial information

into JWTs.

---

# 45. JWT Authority

JWT claims are used as security input, but the server must still ensure that
the token is valid and current according to the security architecture.

Do not trust arbitrary decoded JWT payloads without signature/issuer/audience
validation.

---

# 46. JWT Validation

Validate appropriate:

* Signature
* Issuer
* Audience
* Expiration
* Not-before where used
* Token type where used

Do not merely decode a JWT and trust its contents.

---

# 47. Access Token Scope

Access tokens should have limited lifetime and appropriate scope.

Do not issue broad administrative permissions to every token.

---

# 48. API Authentication

Protected APIs must require appropriate authentication.

Examples:

```text
GET /api/v1/products
```

may require authenticated tenant context.

```text
POST /api/v1/invoices
```

must require authentication and appropriate billing permission.

---

# 49. Public APIs

Only deliberately public endpoints may be unauthenticated.

Examples may include:

```text
health
authentication endpoints
password recovery initiation
```

The exact public endpoint list must be explicit.

Do not accidentally expose business APIs publicly.

---

# 50. Health Endpoints

Health endpoints must not expose sensitive information.

Bad:

```text
Database password:
...
JWT secret:
...
```

Good:

```text
Application:
UP
```

and appropriate infrastructure health information.

---

# 51. CORS

CORS must be explicitly configured.

Do not allow:

```text
*
```

for credentialed production APIs without a deliberate security reason.

Only approved web origins should be allowed.

---

# 52. CSRF

CSRF protection strategy must match the authentication transport.

If authentication is implemented through browser cookies, CSRF protection is
important.

If the web client uses bearer tokens in a different architecture, the CSRF
strategy differs.

Do not blindly disable CSRF without understanding the authentication design.

---

# 53. Cookies

If cookies are used for authentication/session data:

Use appropriate:

```text
Secure
HttpOnly
SameSite
```

settings.

Do not store sensitive authentication credentials in insecure browser storage
without a deliberate security design.

---

# 54. Mobile Token Storage

Android authentication credentials must use secure platform storage.

Do not store refresh credentials in:

```text
plain text files
SharedPreferences without appropriate protection
logs
```

Use the platform's secure storage mechanism.

---

# 55. Desktop Token Storage

Desktop credentials must also be stored securely.

Do not store tokens in:

```text
plain text config files
logs
source code
environment files shipped to users
```

Use the platform's secure credential/key storage where available.

---

# 56. Secret Management

Secrets must not be committed to Git.

Examples:

```text
JWT signing keys
database passwords
API keys
SMTP credentials
cloud credentials
```

Use environment/configuration secret management.

---

# 57. Configuration

Never hardcode production secrets in:

* Java source
* YAML committed to Git
* Frontend source
* Android source
* Desktop source

Public configuration may be committed.

Secrets may not.

---

# 58. Tenant-Aware Authorization

Authorization must happen after authentication establishes tenant context.

Example:

```text
Authenticated User
        ↓
Tenant A
        ↓
Permission: invoice:create
        ↓
Invoice belongs to Tenant A
```

All layers must preserve this context.

---

# 59. Resource-Level Authorization

Having a permission such as:

```text
invoice:view
```

does not automatically mean the user can view every invoice in the system.

The resource must still belong to the user's authorized tenant/context.

---

# 60. High-Risk Operations

Operations such as:

* Invoice cancellation
* Inventory adjustment
* User management
* Permission changes
* Device revocation
* Security settings

should have stronger authorization requirements than ordinary viewing.

---

# 61. Owner Confirmation

Some high-risk operations may require explicit confirmation in the UI.

However:

```text
Confirmation dialog
≠
Authorization
```

The backend must still enforce permission.

---

# 62. Audit Security Actions

Security-sensitive events should be auditable.

Examples:

```text
Login success
Login failure where appropriate
Password reset
User creation
User disable
Role change
Permission change
Device registration
Device revocation
Session revocation
```

Do not log secrets.

---

# 63. Audit Business Actions

Business actions such as:

* Billing
* Cancellation
* Return
* Adjustment

also require business auditability.

Security audit and business audit may be implemented separately.

---

# 64. Authorization Changes

Permission changes must not silently alter historical transactions.

Example:

A cashier becomes manager.

This does not change:

```text
Who created yesterday's invoice.
```

Historical attribution remains intact.

---

# 65. Role Changes

Role changes should affect future authorization.

The system should not rewrite historical audit records.

---

# 66. User Deactivation

Deactivating a user should prevent new authenticated operations.

Existing historical transactions created by that user must remain intact.

Do not delete historical user references merely because the account is
disabled.

---

# 67. User Deletion

Do not physically delete users if doing so destroys required historical
attribution.

Prefer account deactivation where historical references are required.

---

# 68. Store Access

If a tenant eventually has multiple stores/locations, authorization may need
to consider:

```text
Tenant
   ↓
Store
   ↓
User access
```

A user may be allowed to operate only specific stores.

Do not assume all tenant users automatically have access to every store if the
final product supports store-level permissions.

---

# 69. Counter Access

Multiple billing counters may exist within one store.

A counter/device may have:

```text
device_id
counter_id
store_id
tenant_id
```

where required.

Counter identity must not be treated as a user identity.

---

# 70. Device and User Relationship

A device may be used by multiple authorized users depending on the product
workflow.

Do not permanently bind:

```text
device = user
```

unless the business explicitly requires it.

The system should preserve both:

```text
Who performed the action
```

and:

```text
Which device originated it
```

where appropriate.

---

# 71. Synchronization Security

Sync requests must be authenticated and authorized.

The backend must validate:

```text
token
tenant
device
transaction ownership
permissions
idempotency
```

Do not provide a secret "sync API" that bypasses normal authorization.

---

# 72. Device Revocation and Sync

If a device is revoked:

```text
Device
    ↓
No new cloud synchronization authorization
```

The device should not continue to submit new cloud transactions.

Pending local transactions require a recovery/review mechanism.

Do not silently destroy them.

---

# 73. Compromised Device

Assume a stolen/rooted/compromised device may attempt to manipulate local
data.

The server must validate synchronized transactions.

Never trust:

```text
local quantity
local price
local tenant ID
local user role
```

as authoritative.

---

# 74. Offline Price Manipulation

A malicious client may attempt:

```text
MRP = ₹100
Selling Price = ₹1
```

The cloud synchronization process must validate transaction pricing against
the approved business rules and permissions.

Offline support must not become a way to bypass pricing controls.

---

# 75. Offline Permission Manipulation

A malicious user must not modify local files to grant themselves:

```text
OWNER
```

and then synchronize privileged operations.

The server must authenticate and authorize the operation independently.

---

# 76. Offline Inventory Manipulation

A local client may contain:

```text
stock = 999999
```

after tampering.

The cloud must not blindly accept the resulting inventory state.

It should process the business transaction through normal inventory rules.

---

# 77. Security and Local Database

The local database may contain sensitive business data.

Protect it appropriately.

The exact mechanism depends on platform:

* Desktop
* Android

Encryption at rest should be considered where appropriate.

Do not assume local databases are automatically secure.

---

# 78. Database Access

Only the backend should have direct access to the cloud PostgreSQL database.

Web, Desktop, and Android must never connect directly to PostgreSQL.

---

# 79. SQL Injection

All backend database operations must use parameterized queries or safe ORM
mechanisms.

Never construct SQL using untrusted request strings.

---

# 80. Mass Assignment

Do not allow clients to submit arbitrary fields and automatically map them
onto entities.

Example:

```json
{
  "role": "OWNER"
}
```

must not automatically change a user's role merely because the field exists.

Sensitive fields require explicit commands/DTOs and authorization.

---

# 81. Sensitive Fields

Fields requiring special protection may include:

* Password hash
* Roles
* Permissions
* Tenant ID
* Account status
* Device status
* Security tokens

Do not expose these through generic CRUD APIs.

---

# 82. Generic CRUD Security Risk

Avoid generic endpoints such as:

```text
PATCH /users/{id}
```

that accept arbitrary user fields.

Prefer explicit operations:

```text
POST /users
POST /users/{id}/disable
POST /users/{id}/change-role
POST /users/{id}/reset-password
```

where the business/security semantics require it.

---

# 83. Security Headers

The web application and backend should use appropriate security headers.

The exact headers depend on deployment architecture.

Do not disable browser security protections merely to make development
convenient.

---

# 84. HTTPS

Production cloud communication must use HTTPS.

Credentials, tokens, and business data must not travel over plain HTTP.

---

# 85. Certificate Validation

Clients must not disable TLS/certificate validation merely to "make API
calls work."

Development exceptions must not leak into production builds.

---

# 86. Brute Force Protection

Authentication and sensitive endpoints should have appropriate throttling.

Potentially protected endpoints include:

```text
login
password reset
refresh token
device registration
```

Do not make rate limiting so aggressive that normal pharmacy operation is
disrupted.

---

# 87. Session Monitoring

The system should eventually provide enough information for authorized users
to understand active sessions/devices.

Potential information:

```text
Device
Platform
Last active
Approximate location where appropriate
Session status
```

Do not collect unnecessary personal data.

---

# 88. Privacy

Collect only data necessary for the product.

Do not collect:

* Contacts
* Location
* Camera data
* Microphone data
* Personal device data

unless a feature explicitly requires it.

---

# 89. Customer Data

Customer information must be tenant-isolated.

One pharmacy must never see another pharmacy's customers.

Do not expose customer information through global search endpoints.

---

# 90. Security Testing

Every protected endpoint should be tested for:

### Authentication

```text
No token
    ↓
401
```

### Authorization

```text
Valid user
+
Insufficient permission
    ↓
403
```

### Tenant isolation

```text
Tenant A
    ↓
Tenant B resource
    ↓
Rejected
```

### Resource ownership

```text
Correct tenant
+
Unauthorized resource
    ↓
Rejected
```

---

# 91. Authentication Testing

Test at minimum:

* Valid login
* Invalid password
* Unknown account
* Disabled account
* Expired access token
* Invalid JWT
* Invalid refresh token
* Revoked refresh token
* Logout
* Password reset
* Password reset token reuse
* Rate limiting

---

# 92. Offline Security Testing

Test:

* Offline login/session
* Device registration
* Revoked device
* Disabled user
* Reconnection after revocation
* Tampered local role
* Tampered tenant ID
* Tampered transaction owner
* Duplicate sync
* Unauthorized sync

---

# 93. Security Failure Principle

Security failures must fail closed.

Bad:

```text
Cannot verify permission
    ↓
Allow request
```

Correct:

```text
Cannot verify permission
    ↓
Reject request
```

---

# 94. Do Not Hide Security Failures

A security failure may be logged and surfaced appropriately.

Do not silently continue as if authorization succeeded.

---

# 95. AI Security Implementation Rules

Before implementing any security-sensitive feature:

1. Read this skill.
2. Identify authentication requirements.
3. Identify tenant context.
4. Identify authorization requirements.
5. Identify roles.
6. Identify permissions.
7. Identify resource ownership.
8. Identify offline implications.
9. Identify device implications.
10. Identify audit requirements.
11. Identify token/session lifecycle.
12. Identify abuse/rate-limiting requirements.
13. Implement backend enforcement.
14. Implement client UX.
15. Add security tests.
16. Test unauthorized access.
17. Test cross-tenant access.
18. Test token/session failure.
19. Test offline tampering scenarios.

---

# 96. Security Anti-Patterns

Never:

```text
Trust tenantId from frontend
```

Never:

```text
Trust role from frontend
```

Never:

```text
Trust permission from frontend
```

Never:

```text
Store passwords in plain text
```

Never:

```text
Log access tokens
```

Never:

```text
Put secrets in Git
```

Never:

```text
Expose JPA entities containing security fields
```

Never:

```text
Allow generic CRUD to modify roles or tenant ownership
```

Never:

```text
Allow offline clients to bypass backend authorization during synchronization
```

---

# 97. Final Security Principle

Inventra has three major client surfaces:

```text
Web
Desktop
Android
```

They may have different UI and local storage behavior.

They must NOT have different security truth.

The backend remains the final authority for:

```text
Identity
+
Tenant
+
Permissions
+
Resource ownership
+
Business authorization
```

Offline support must preserve operational continuity without creating a
security bypass.

> If a malicious client can change the request and the server simply
> believes it, the security model is broken.

