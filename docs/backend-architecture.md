# Inventra Backend Architecture

This document defines the foundational architecture, modular design, engineering rules, security models, and technical conventions for the **Inventra Pharmacy ERP** backend.

---

## 1. Architectural Style

Inventra employs a **Modular Layered Architecture** with **Domain-Driven Design (DDD)** principles and **Hexagonal (Ports & Adapters)** boundaries where appropriate.

The backend serves three primary client platforms:
- **Web Application** (Cloud-connected React / Vite SPA)
- **Desktop Application** (Tauri + React with offline local persistence & cloud synchronization)
- **Android Application** (React Native with offline local persistence & cloud synchronization)

All business rules and validation invariants are centralized in the backend domain/application layers. Clients act as presentation, local cache, and synchronization agents, never as independent sources of pharmacy business truth.

```text
┌─────────────────────────────────────────────────────────────┐
│                       Client Tier                           │
│           Web (SPA)  │  Desktop (Tauri)  │  Mobile (Android)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    API / Web Layer                          │
│     Controllers, Request/Response DTOs, RFC 9457 Errors     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Application Layer                         │
│   Use Cases, Application Services, Transaction Boundaries   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     Domain Layer                            │
│ Aggregates, Value Objects, Domain Events, Invariants, Rules │
└──────────────────────────────▲──────────────────────────────┘
                               │ Implements Domain Ports
┌──────────────────────────────┴──────────────────────────────┐
│                  Infrastructure Layer                       │
│    Spring Data JPA, PostgreSQL, Flyway, Security, Sync     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Package Structure & Modular Boundaries

The backend code is organized under base package `com.inventra.inventra_backend`.

### 2.1 Foundational / Shared Common Structure
Shared capabilities live in `com.inventra.inventra_backend.common`:

```text
com.inventra.inventra_backend.common/
├── api/
│   ├── ApiResponse.java             # Success response envelope
│   └── PageResponse.java            # Pagination response model
├── config/
│   ├── JpaAuditingConfig.java       # Enables JPA auditing
│   └── TimezoneConfig.java          # Canonical Asia/Kolkata timezone & Clock bean
├── domain/
│   ├── BaseAuditableEntity.java     # @MappedSuperclass with createdAt/updatedAt
│   └── exception/
│       ├── DomainException.java              # Base domain exception with errorCode & HttpStatus
│       ├── ResourceNotFoundException.java    # 404 Not Found
│       ├── BusinessRuleViolationException.java# 422 / 409 Violation
│       ├── TenantAccessDeniedException.java  # 403 Forbidden
│       └── DuplicateResourceException.java   # 409 Conflict
├── exception/
│   └── GlobalExceptionHandler.java  # RFC 9457 ProblemDetail exception handler
├── multitenancy/
│   ├── TenantId.java                # Value object representing Tenant identity
│   ├── TenantContext.java           # Context model (tenant, store, user)
│   ├── TenantContextHolder.java     # ThreadLocal context manager with safe lifecycle
│   ├── TenantResolver.java          # Context resolution strategy interface
│   └── TenantFilter.java            # Scoped filter with guaranteed ThreadLocal cleanup
├── security/
│   ├── SecurityConfig.java          # Spring Security 7 Lambda DSL configuration
│   ├── JwtTokenProvider.java        # Minimal claims JWT generator and SHA-256 token hasher
│   ├── JwtAuthenticationFilter.java # Stateless JWT authentication filter with TenantContext sync
│   ├── RestAuthenticationEntryPoint.java # RFC 9457 401 Unauthorized handler
│   └── RestAccessDeniedHandler.java      # RFC 9457 403 Access Denied handler
└── util/
    └── UuidUtils.java               # RFC 9562 UUIDv7 generator
```

### 2.2 Identity & Tenancy Modules

```text
com.inventra.inventra_backend.identity/
├── api/
│   ├── AuthController.java          # Login, register-owner, refresh, switch-context, password lifecycle
│   └── dto/                         # DTOs: LoginRequest, RegisterOwnerRequest, AuthResponse, etc.
├── application/
│   ├── AuthService.java             # Core authentication, session management, token rotation
│   ├── PasswordService.java         # BCrypt hashing & strength validation
│   └── SecurityAuditService.java    # Security audit event logging
├── domain/
│   ├── model/
│   │   ├── User.java                # JPA Entity / Global Identity
│   │   ├── AccountStatus.java       # ACTIVE, INACTIVE, LOCKED, SUSPENDED
│   │   ├── Role.java                # OWNER, MANAGER, CASHIER, INVENTORY_OPERATOR
│   │   ├── RefreshToken.java        # Rotating token family with SHA-256 hash
│   │   ├── PasswordResetToken.java  # Single-use reset token with SHA-256 hash
│   │   ├── SecurityAuditLog.java    # Security audit log entity
│   │   └── SecurityAuditEventType.java
│   └── repository/
│       ├── UserRepository.java
│       ├── RefreshTokenRepository.java
│       ├── PasswordResetTokenRepository.java
│       └── SecurityAuditLogRepository.java
└── infrastructure/
    └── security/
        └── LoginRateLimiter.java    # Caffeine in-memory brute-force protection

com.inventra.inventra_backend.tenant/
├── api/
│   ├── DeviceController.java        # Device registration, listing, and remote revocation
│   └── dto/                         # RegisterDeviceRequest, DeviceResponse
├── application/
│   └── DeviceService.java           # Device lifecycle management & audit recording
├── domain/
│   ├── model/
│   │   ├── Business.java            # Tenant Root Entity
│   │   ├── BusinessStatus.java      # ACTIVE, INACTIVE, SUSPENDED
│   │   ├── Store.java               # Branch Entity
│   │   ├── StoreStatus.java         # ACTIVE, INACTIVE
│   │   ├── BusinessMembership.java  # User-to-Business link
│   │   ├── MembershipStatus.java    # ACTIVE, INVITED, REVOKED
│   │   ├── StoreAssignment.java     # User-to-Store link with optional roleOverride
│   │   ├── AssignmentStatus.java    # ACTIVE, REVOKED
│   │   ├── Device.java              # Physical/browser registered terminal
│   │   ├── DeviceType.java          # DESKTOP, ANDROID, WEB
│   │   └── DeviceStatus.java        # ACTIVE, SUSPENDED, REVOKED
│   └── repository/
│       ├── BusinessRepository.java
│       ├── StoreRepository.java
│       ├── BusinessMembershipRepository.java
│       ├── StoreAssignmentRepository.java
│       └── DeviceRepository.java
```

---

## 3. Security, Authentication & Session Architecture

### 3.1 Dual-Layer Security Model
1. **Cloud Authentication (Online)**:
   - **Access Token**: Stateless JWT (15-minute validity) containing minimal claims: `iss`, `sub` (userId), `aud`, `jti`, `iat`, `exp`, `did` (deviceId), `tid` (tenantId), `sid` (storeId), `role`.
   - **Refresh Token**: 256-bit cryptographically secure random token string (30-day sliding expiry). Stored exclusively as **SHA-256 hashes** in `refresh_tokens`.
   - **Token Family Rotation**: Every refresh generates a new token in the same `family_id` and marks the previous token as `used`. If an already-used token is replayed, the server revokes all tokens in the entire family and logs a security incident (`TOKEN_REUSE_DETECTED`).
2. **Offline Authentication (Bounded-Risk 72-Hour Lease)**:
   - Client terminals (Desktop / Android) maintain an encrypted local vault (Windows DPAPI / Android Keystore) unlocked by a local PIN or biometric scan.
   - The local vault is valid for a maximum of **72 hours** from the last online sync.
   - **Bounded-Risk Model**: The server cannot enforce revocation while a device is physically disconnected. Client enforces the 72h lease; server-side revocation is enforced immediately upon network reconnection (`403 DEVICE_REVOKED` triggers local credential wipe).

### 3.2 Context Switching
Users belonging to multiple businesses or managing multiple stores can switch active context via `POST /api/v1/auth/switch-context`. The server validates active membership and store assignment, resolves store-specific role overrides, and issues a fresh 15-minute JWT without re-prompting for passwords.

---

## 4. Device Identity Architecture

- **Permanent Identity (`deviceId`)**: UUIDv7 is the permanent device identifier.
- **Human-Readable Code (`device_code`)**: Display string for staff/owners (e.g. `POS-01`).
- **Remote Revocation**: Owners can revoke devices remotely. Revocation sets `devices.status = 'REVOKED'`, invalidates all refresh tokens for that device, and rejects subsequent sync/refresh attempts.

---

## 5. Database Schema & Flyway Migrations

- **Flyway V1 (`V1__init_identity_and_tenancy.sql`)**: `users`, `businesses`, `stores`, `business_memberships`, `store_assignments`.
- **Flyway V2 (`V2__init_auth_and_device_identity.sql`)**: `devices`, `refresh_tokens`, `password_reset_tokens`, `security_audit_logs`.
- **Validation**: Hibernate `spring.jpa.hibernate.ddl-auto=validate` validates all JPA entity mappings against PostgreSQL 17 on startup.

---

## 6. Testing Strategy

- **Unit Tests**: Password strength & BCrypt cost 12, JWT claim generation and SHA-256 token hashing, Caffeine rate limiting, domain invariants, UUIDv7 version 7 compliance.
- **Integration Tests (`@SpringBootTest` + `@AutoConfigureMockMvc`)**: Full owner onboarding, login, token rotation, token reuse attack detection, context switching, password change session invalidation, password reset, device registration, and remote revocation.
