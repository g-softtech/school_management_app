# Master Architecture Requirements

This document serves as the **immutable truth** for the SmartSchool tech stack. Any modifications to the application must strictly adhere to the guidelines and locked constraints detailed below.

## 1. Locked Stack Matrix
To completely eliminate version incompatibility errors, build failures, and dependency hell, the following stack elements are permanently locked:

* **Prisma ORM**: Pinned permanently to version `5.12.0`.
  * `npm install prisma@5.12.0 @prisma/client@5.12.0 --save-exact`
* **UI & Frontend Frameworks**: React, React-DOM, and all current UI framework library versions must remain completely untouched and locked to their baseline states.
* **Database Engine**: PostgreSQL 16 hosted on Neon.

## 2. The Core Architecture Rules
The application enforces a strict multi-tenant request-response lifecycle across both the client and server:

* **Frontend Identity Resolution**: A 5-tier subdomain tenant resolver cleanly extracts the school identifier from `window.location.hostname`.
* **Axios Interceptor Gate**: An automated HTTP interceptor dynamically injects the `X-Tenant-ID` header into every outbound request.
* **Backend Authorization Gate**: The Express `tenantContext` middleware intercepts the request, maps the header against the active database, and strictly scopes the request context to `req.tenantId`.
* **Connection Management**: To prevent Neon PostgreSQL connection pool exhaustion, the backend utilizes a strict **Singleton Pattern** initialized in `prisma.js`. No isolated clients may be instantiated.

## 3. Data Isolation Guidelines (Multi-Tenant Constraints)
Data bleeding across schools is a critical vulnerability. The schema structure must strictly obey the following isolation patterns:

* **Mandatory Relation**: Every relational model in `schema.prisma` must contain a `tenantId` field linking it to the primary `Tenant` model.
* **Composite Uniqueness**: All uniqueness lookups must be scoped to the tenant. If a student's admission number is unique, the schema must enforce `@@unique([tenantId, admissionNumber])`. Global unique constraints are forbidden unless they belong to global platform infrastructure.
* **Pre-Query Scoping**: Every Prisma controller query (`findFirst`, `findMany`, `update`, `delete`) must strictly declare `where: { tenantId: req.tenantId }`.

---
**Rule of Engagement:** *Any agent, developer, or automated process interacting with this codebase is strictly forbidden from writing or modifying any code without first cross-referencing these constraints.*
