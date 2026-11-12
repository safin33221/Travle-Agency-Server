# AGENTS.md — TravelPilot Backend

> **Repository:** `travelpilot-backend` (also known locally as `Travle-agency-server`)  
> **Owner / delivery team:** Softilo  
> **Project:** AI Travel Sales & Operations Management System  
> **Deployment:** Single-client custom software for **one travel agency** — **NOT SaaS**  
> **Framework:** NestJS + TypeScript + PostgreSQL + Prisma 7  
> **Active release:** **MVP**  
> **Shared specification:** `./PROJECT.md` (must match the frontend repository)  
> **Last updated:** 2026-11-11

This file is the **operating instruction manual for coding agents working in the backend repository**. Read it completely, along with `PROJECT.md`, before planning or modifying code. It is guidance for implementation; it does not claim any feature is already built.

---

## 1. Non-negotiable instructions

1. **Read `PROJECT.md` first.** It is the shared product source of truth. This file supplements but must not contradict it. If a requirement conflicts, explain the conflict before making changes.
2. **Single client only.** One travel agency has multiple authorized staff accounts. **Do not** implement `Tenant`, `Organization`, `TenantMembership`, public registration, multi-agency accounts, subscription plans, usage billing, agency onboarding, tenant IDs, or a SaaS super-admin dashboard.
3. **Only implement MVP until explicitly authorized otherwise.** V1, V2, V3 are roadmap descriptions, not permission to build them. Do not scaffold future integrations, speculative schemas, or empty endpoints.
4. **Backend is authoritative.** Authentication, authorization, persistence, package prices, quotation totals, approval state, audit records, and PDF contents must be enforced or produced server-side.
5. **AI only drafts in MVP.** It must not send messages, change prices, confirm bookings, verify payments, grant permissions, assert live inventory, or perform autonomous writes. Human review is mandatory.
6. **No invented facts.** Client legal name, branding, package details, rates, availability, taxes, policies, contacts, integration approvals, and production credentials remain `TBD` until supplied or approved.
7. **Never leak secrets or personal data.** No `.env` values, production contact lists, passwords, API tokens, private documents, raw user messages, or detailed PII in Git, logs, prompts, tests, or API errors.
8. **No destructive changes without explicit approval.** Do not reset production databases, drop existing data, force push, overwrite unrelated code, disable tests, or run risky migrations as a shortcut.
9. **Work incrementally.** Before writing code, inspect repository conventions, explain the requested MVP slice, implement the smallest correct change, run checks, and report any incomplete or unverified part.
10. **Do not claim success without evidence.** A generated controller is not a working feature. An endpoint is only complete when validated, authorized, tested, documented, and integrated with the agreed business contract.

**Required agent execution loop:**

```text
Read PROJECT.md + AGENTS.md
  -> inspect existing backend code / dependencies
  -> identify MVP requirement and affected API contracts
  -> write concise implementation plan
  -> implement one vertical feature slice
  -> run formatting, lint, tests, build and relevant integration checks
  -> update OpenAPI / docs / migrations as necessary
  -> report changed files, commands executed, test results, risks and next steps
```

When a requested task crosses into the frontend, describe the necessary API contract/UI behavior but do not edit frontend source from this repository.

---

## 2. Product context and boundaries

TravelPilot is a **private staff operations tool for one travel agency**. Agency team members enter inquiries received outside the application, manage verified tour package information, use AI to draft replies, create staff-approved quotations, download branded PDFs, and record manual follow-ups.

**MVP users:**

- `OWNER_ADMIN` — manages staff, agency settings, approved catalog and privileged actions.
- `SALES_AGENT` — handles leads, notes, AI drafts and quotation workflow within assigned permissions.
- End customers are **lead records**, not registered application users. There is **no customer portal or public signup** in MVP.

**MVP end-to-end path:**

```text
Authenticated Staff
  -> Create / update Lead (manually)
  -> Find ACTIVE approved Package(s)
  -> Request AI response / qualification DRAFT
  -> Staff edit and review
  -> Create quotation with server-calculated line items
  -> Staff approves quotation (permission checked)
  -> Generate/download approved branded PDF
  -> Staff shares manually outside the application
  -> Update Lead status + manual follow-up task
  -> Audit important state transitions
```

**Out of scope for MVP:** WhatsApp/Messenger API send/receive, live chat inbox, payment gateways, bookings, ticket issuance, GDS, hotel inventory sync, auto follow-up delivery, autonomous agent actions, customer sign-up, multiple agency organizations and subscription billing.

---

## 3. Releases and scope gates

| Release | Backend scope | State |
|---|---|---|
| **MVP** | Staff auth/RBAC, agency settings, packages, leads, notes, manual follow-up tasks, AI draft generation, quotation editing/approval/PDF, dashboard summary, audit | **ACTIVE** |
| **V1** | Approved WhatsApp/Messenger provider integration, inbound conversations, team inbox, controlled send, assignments/notifications | **FUTURE — NOT APPROVED** |
| **V2** | Bookings, traveler info, manual payment records, receipts, cancellation/change operations, approval-based follow-up queue | **FUTURE — NOT APPROVED** |
| **V3** | Evidence-linked AI insights, multi-step approved agents, advanced analytics, selected partner integrations, optional branches | **FUTURE — NOT APPROVED** |

A later release may begin **only after the project owner confirms scope**, API changes, responsibilities, security controls, acceptance criteria, budget and deployment readiness. Capture the decision in `PROJECT.md` in **both** repositories.

---

## 4. Recommended backend stack

| Concern | Preferred approach | Constraints |
|---|---|---|
| Framework | NestJS, TypeScript, modular monolith | Keep existing project module/ESM mode consistent |
| HTTP | NestJS default Express adapter | Do not switch to Fastify just for novelty |
| Persistence | PostgreSQL + Prisma ORM **7** | Version-match `prisma` and `@prisma/client` major versions |
| PostgreSQL driver | `pg` + `@prisma/adapter-pg` | Prisma 7 requires an adapter for direct DB connections |
| Configuration | `@nestjs/config` + validated env schema | Fail fast on required missing values |
| Authentication | JWT with secure HttpOnly cookies or approved server sessions | Choose one coherent, documented strategy |
| Authorization | NestJS Guards + role/ownership checks | Enforce per endpoint and object |
| Validation | `class-validator` / `class-transformer` DTOs | Global `ValidationPipe` and strict whitelist |
| OpenAPI | `@nestjs/swagger` | Canonical source of API contracts for frontend |
| AI | Provider adapter (e.g. OpenAI-compatible) + schema validation | Tool calls read-only for MVP; server-only secrets |
| PDFs | `pdf-lib` or already-approved library | Render **approved** server-calculated quote revision |
| Logging | Structured Nest/logger integration | Redact secrets, cookies, contact information |
| Tests | Existing project test runner: Vitest or Jest | Do not replace established runner without justification |
| Deployment | Persistent Node.js host + managed PostgreSQL | Hosting/provider chosen with client; not assumed |

Avoid adding Redis, BullMQ, LangGraph, vector databases, RabbitMQ, Kafka, microservices, event sourcing or CQRS packages until a measured requirement makes them necessary.

### Prisma 7 requirements (version-sensitive)

- Check the actual installed versions and generated files before modifying Prisma configuration.
- Prisma 7 uses a **generated Prisma Client** and a **driver adapter**. With standard PostgreSQL use `PrismaPg` and pass the adapter to `new PrismaClient({ adapter })`.
- Keep Prisma generator output explicit (for example, `../src/generated/prisma`), and import the client from the generated location; do not assume an old `@prisma/client` import pattern.
- Prisma CLI configuration may be named `prisma.config.ts` or (in Prisma 7.10+) `prisma7.config.ts`; use what the installed CLI actually generated. Do **not** create both competing config files.
- The CLI datasource URL for migrations is configured in Prisma config; the application runtime adapter also needs a connection URL. Load `.env` safely in local development.
- Do not mix CommonJS and ESM configuration patterns. Follow the installed NestJS template and Prisma 7 compatibility requirements; test the resulting build and runtime.
- Regenerate the client after schema changes and commit migration files, **not** generated secrets or local DB files.

Official references: https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql and https://docs.nestjs.com/

---

## 5. Backend repository organization

Adapt to the existing repository rather than recreating files just to match a diagram. Recommended modular layout:

```text
travelpilot-backend/
├── AGENTS.md
├── PROJECT.md
├── README.md
├── .env.example
├── .gitignore
├── package.json
├── prisma7.config.ts          # OR prisma.config.ts: inspect installed Prisma
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/                 # typed/validated environment config
│   ├── database/
│   │   ├── database.module.ts
│   │   └── prisma.service.ts
│   ├── generated/prisma/       # generated Prisma client, if configured here
│   ├── common/
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   └── modules/
│       ├── auth/
│       ├── staff/
│       ├── agency-settings/
│       ├── packages/
│       ├── leads/
│       ├── follow-ups/
│       ├── ai/
│       ├── quotations/
│       ├── dashboard/
│       └── audit/
└── test/
```

**Folder principles:**

- Prefer feature modules with `*.module.ts`, `*.controller.ts`, `*.service.ts`, DTOs, and focused tests.
- Controllers: routing, guards, DTO parsing, response mapping, status codes. **No** pricing or AI prompt logic.
- Services: business workflows, authorization-aware operations, transaction boundaries.
- Prisma/database layer: database access, migrations, client lifecycle; don't expose `PrismaClient` to HTTP controllers.
- Shared `common/` contains reusable cross-cutting mechanics only; avoid a giant `utils.ts` or `BaseService` hierarchy.
- AI-specific prompt templates, typed tools, evaluation cases and providers belong under `modules/ai/`; keep it separate from regular package/quotation business logic.
- Dependencies flow through Nest DI. Avoid circular module dependencies, singleton global mutable request data and excessive repository wrappers around Prisma.
- Do not generate every folder at once; add modules as development reaches them.

---

## 6. Core models and persistence rules (MVP)

Models below are **conceptual** until client requirements and schema are approved. Use `PROJECT.md` for final field definitions, enums and state rules.

| Model | Responsibility | Key invariants |
|---|---|---|
| `StaffUser` | Agency staff identity and authorization | Unique normalized login; hashed password; deactivation blocks access |
| `AgencySettings` | One agency's branding, quote terms and defaults | Single agency configuration record; no tenant hierarchy |
| `Package` | Approved tour/package catalog | Active/archived state, validity dates, verified pricing |
| `Lead` | Customer inquiry, trip requirements and owner | Accurate contact info; status transition checks |
| `LeadNote` | Human notes attached to leads | Actor/time recorded; sanitize rendered output |
| `FollowUpTask` | Manual follow-up to do | No automatic external delivery in MVP |
| `AiDraft` | Suggested reply/qualification/description | Persist review status and used source IDs/versions |
| `Quotation` | Versioned customer quote, approval state | Immutable approved revision; authoritative totals |
| `QuotationItem` | Quotation line-item snapshot | Quantity, price, currency, server-computed total |
| `AuditLog` | Sensitive action traceability | Actor, action, target, time, safe metadata |

**Required enums (align with frontend):**

```text
StaffRole:       OWNER_ADMIN | SALES_AGENT
LeadStage:       NEW | QUALIFIED | QUOTED | FOLLOW_UP | WON | LOST
QuotationStatus: DRAFT | APPROVED | VOID
FollowUpStatus:  OPEN | DONE | CANCELLED
```

**Data modeling rules:**

- Use stable UUIDs or similarly non-guessable IDs. Do not use a `tenantId` field anywhere in MVP.
- Add unique constraints and indexes based on actual queries (`email/login`, `leadId`, `assignedTo`, `status`, `createdAt` as appropriate).
- Keep created/updated timestamps. Record `approvedBy`, `approvedAt` and revision for approved quotations.
- Use numeric/decimal-safe monetary types (`Decimal`/`numeric` in PostgreSQL, with a deliberate precision and rounding policy). **Never calculate money with unguarded JS floating point or LLM output.**
- Establish currency and conversion rules with the client; do not assume all records are BDT or add currency exchange by default.
- Historical quotations must **snapshot** line items, descriptions, prices, discounts, taxes, validity and terms, and remain stable if a package later changes.
- Prefer soft archiving for packages and staff deactivation to destructive deletion that breaks history. Reject destructive operations on referenced data.
- Use transactions for multi-record quote create/revise/approve operations and any other invariant spanning tables.
- Keep PII minimal; do not collect passport/NID scans or full travel identity documents in MVP.
- Never store sensitive data in AI logs, unencrypted backups, or public object storage.

### Migration discipline

1. Review the current Prisma schema and database before proposing changes.
2. Modify `prisma/schema.prisma` and inspect migration SQL before applying.
3. In development: `npx prisma validate`, `npx prisma migrate dev --name meaningful_name`, `npx prisma generate` (when safe/appropriate).
4. In deployment: apply reviewed migrations with `npx prisma migrate deploy`; do not use `migrate dev` in production.
5. **Never** execute `prisma migrate reset`, `db push --force-reset` or destructive SQL on valuable data without explicit approval and backup.
6. Do not edit old applied migrations. Write forward-only corrective migrations and document any required backfill.
7. Ensure the app starts with the corresponding generated Prisma Client version.

---

## 7. Authentication, authorization and sessions

### MVP authentication

- **Private login** for admin-created staff. No self-registration and no public customer authentication.
- Store hashed passwords using a proven work factor (`bcrypt` if already installed); never log/store plaintext.
- Use a **single documented session strategy**. If JWT-based cookies are chosen, use short-lived access tokens, refresh token rotation/revocation, secure `httpOnly`, `sameSite` and production `secure` cookie settings as appropriate.
- On logout, revoke server-side refresh/session state where applicable; merely deleting a browser cookie is not sufficient for long-lived active refresh tokens.
- Define a safe staff invite / initial-password workflow; do not email plaintext passwords or seed known default admin credentials into production.
- Admin-created accounts are disabled immediately when deactivated; check account state on authentication and sensitive operations.
- Rate-limit login and other abuse-prone endpoints; return generic invalid-credential errors.
- If cookie authentication is cross-origin, explicitly design CORS, credential handling, CSRF protection and cookie domain/same-site behavior. Never use wildcard CORS with credentials.

### Authorization

- Role-check every admin-only endpoint in NestJS Guards **and** perform object-level permission checks in services.
- `OWNER_ADMIN` may manage staff, approved package prices, agency settings and privileged reporting.
- `SALES_AGENT` may handle assigned/authorized leads, notes, AI drafts and quotations; package editing and quote approval require explicit allowed permissions under the agreed policy.
- Do not trust frontend role flags, hidden buttons, route params, `userId` or `approvedBy` supplied in the request body. Derive the acting user from verified authentication context.
- Enforce lead assignment/access consistently; clarify whether all agents can see all leads before implementation (do not guess).
- Guard downloads and generated files, not just JSON APIs.
- Ensure at least one active `OWNER_ADMIN` remains; prevent accidental loss of administrative access.
- Log staff role/status changes and quote approval actions.

---

## 8. API design and frontend contract

**Base path:** `/api/v1` (unless the shared spec is intentionally revised in both repositories).

| Method | Path | Role of endpoint |
|---|---|---|
| `POST` | `/auth/login` | Staff sign-in |
| `POST` | `/auth/logout` | End staff session |
| `GET` | `/auth/me` | Authenticated identity and permissions |
| `GET`, `POST` | `/staff` | Admin list/create staff |
| `PATCH` | `/staff/:id` | Admin role/status updates |
| `GET`, `PATCH` | `/settings/agency` | Agency branding and approved defaults |
| `GET`, `POST` | `/packages` | Package list/create |
| `GET`, `PATCH`, `DELETE` | `/packages/:id` | Read/update/**soft archive** package |
| `GET`, `POST` | `/leads` | List/create manually recorded leads |
| `GET`, `PATCH` | `/leads/:id` | Read/update lead |
| `GET`, `POST` | `/leads/:id/notes` | Read/add lead notes |
| `GET`, `POST` | `/leads/:id/follow-ups` | Read/create manual tasks |
| `POST` | `/ai/drafts` | Generate AI suggestion for staff review |
| `GET`, `POST` | `/leads/:id/quotations` | List/create lead quotations |
| `GET`, `PATCH` | `/quotations/:id` | Get/edit **draft** quotation |
| `POST` | `/quotations/:id/approve` | Authorized explicit approval |
| `GET` | `/quotations/:id/pdf` | Authorized PDF for approved revision |
| `GET` | `/dashboard/summary` | Real MVP operational counts |
| `GET` | `/countries` | Public active destination countries |
| `GET` | `/countries/:slug` | Public country detail & published visa services |
| `GET` | `/visa-services` | Public published visa service catalog |
| `GET` | `/visa-services/:countrySlug/:serviceSlug` | Public visa service detail & requirements |
| `POST` | `/visa-inquiries` | Public visa inquiry linked to Lead CRM |
| `GET` | `/admin/visa-overview` | Visa & Immigration overview counts |
| `GET`, `POST` | `/admin/countries` | Admin country list/create |
| `GET`, `PATCH`, `DELETE` | `/admin/countries/:id` | Admin country detail/update/soft-archive |
| `GET`, `POST` | `/admin/visa-services` | Admin visa service list/create |
| `GET`, `PATCH`, `DELETE` | `/admin/visa-services/:id` | Admin visa service detail/update/soft-archive |
| `GET` | `/admin/visa-inquiries` | Admin visa inquiries list |
| `GET` | `/admin/visa-inquiries/:id` | Admin visa inquiry detail |

Routes are **proposals**, not a claim of an already implemented API. Document and approve changes before frontend integration.

**API conventions:**

- Use typed DTOs and `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` as a starting policy; review transformations for unsafe implicit coercions.
- Put input validation on all query params, route params, body DTOs and pagination. Validate dates as dates, not arbitrary strings; bound text length, array sizes, file size and numeric ranges.
- Use consistent JSON serialization for monetary values (prefer decimal strings) and ISO-8601 timestamps. For travel dates without time, preserve `YYYY-MM-DD` calendar semantics.
- Use query parameters for pagination/search/filters, with maximum page size and allowlisted sort fields. Never concatenate arbitrary SQL identifiers from user input.
- Use clear and stable status codes: `400`/`422` validation (choose one convention), `401` unauthenticated, `403` unauthorized, `404` missing or inaccessible, `409` state conflict, `429` rate-limited.
- Normalize error responses to `{ code, message, details?, requestId }`; do not return stack traces, SQL queries, provider errors or secrets.
- Generate and keep OpenAPI accurate (`@nestjs/swagger`), including request DTOs, authorization, pagination, response schemas and errors. Frontend must consume this contract, not undocumented backend internals.
- Add request correlation IDs and structured error logs (no raw credentials or customer messages).
- Retry-safe/idempotent handling is required for quote approval and other duplicate-prone state transitions; prevent duplicate revisions from repeated requests.
- Keep `GET` endpoints read-only and ensure state changes cannot occur accidentally through a URL visit.
- If introducing an endpoint not listed here, first justify its MVP business purpose and update the contract.

---

## 9. Domain workflows: packages, leads and follow-ups

### Package rules

- Catalog entries are created/edited by authorized staff, with audit history for changes to prices, status, validity or terms.
- Only **active, in-validity** catalog data may be used as a current offer; archived/expired packages stay available for historical quote display.
- `basePrice` is indicative only until a client-approved final pricing formula exists; never imply live seat/hotel availability.
- Inclusions, exclusions and terms must be rendered faithfully; AI cannot silently amend them.
- If the agency's real price structure requires traveler count, rooms, dates or tier-based rates, confirm those business rules before implementing calculations.

### Lead rules

- Capture source (`PHONE`, `WEBSITE`, `MESSENGER`, `WHATSAPP`, `OTHER` if approved), contact fields, preferences, destination, travel dates, traveler count, budget, assigned agent and notes according to validated DTOs.
- Only store required customer PII; verify permitted contact/consent procedures with the client.
- Use explicit lead stages from the shared spec: `NEW -> QUALIFIED -> QUOTED -> FOLLOW_UP -> WON/LOST`. Treat this as a **business guide**, not a strict transition machine until the client approves which moves are legal.
- Keep notes and manual follow-up tasks separate from automated outbound messaging. MVP can remind staff in-app, **not** automatically contact customers.
- Dashboard metrics must be derived from stored leads/quotes/tasks and scoped by staff permissions where appropriate.

---

## 10. Quotation and PDF invariants (critical)

Quotation pricing and approval are financially consequential. Treat this module as a safety boundary.

1. Validate agency-approved package references and all quote inputs.
2. Calculate `quantity × unitPrice`, discounts, tax and totals on the **server** using decimal-safe arithmetic and a documented rounding policy; never trust frontend-submitted totals or LLM calculations.
3. Snapshot customer/lead context, source package references/versions, quote line items, currency, terms, validity and final prices into the quotation revision.
4. Keep `DRAFT`, `APPROVED` and `VOID` transitions explicit. Authorization is mandatory for approval/voiding; approved revisions cannot be silently mutated.
5. If an approved quotation must change, create a **new revision** with independent approval, preserving the previous approved snapshot and audit trail.
6. PDF content must match the **approved revision**, including amounts, terms, version, validity and agency branding; prevent an unapproved draft from being presented as final.
7. Do not let user-supplied filenames or paths influence storage locations; escape user-controlled text, enforce size constraints and prevent path traversal.
8. Check auth and access before both PDF generation and download; private storage or short-lived signed links if persisted.
9. Manual sharing in MVP occurs outside the app. If a `sharedAt`/`sharedBy` event is recorded, it must mean **staff reported manual sharing**, not that a provider delivery was verified.
10. Create tests for arithmetic boundaries, discounts, rounding, expired packages, duplicate approval, unauthorized approval, quote revision and PDF content.

If the exact pricing/tax rules are unconfirmed, implement a transparent, limited approved formula or leave calculations blocked as `TBD`; never invent a tax rate or discount policy.

---

## 11. AI module: constrained staff copilot

### What AI is allowed to do in MVP

- Extract **suggested** destination, dates, traveler count, budget and missing requirements from an inquiry.
- Suggest clarifying questions and next staff actions.
- Search/read approved package/agency-policy facts through **read-only backend functions**.
- Draft Bangla, English or Banglish responses and quotation descriptions.
- Summarize existing lead context without inventing new facts.

### What AI must NOT do in MVP

- Send WhatsApp/Messenger/email/SMS messages or schedule autonomous sends.
- Create/approve bookings, mark payments paid, issue refunds or make discounts.
- Change package price, catalog validity, quotation totals, user permissions or client settings.
- Promise confirmed flights, hotel reservations, visas, schedules or live inventory without a verified source.
- Treat a customer instruction, retrieved passage or PDF as a higher-priority system instruction.

### Mandatory AI pipeline

```text
Staff request (authenticated, rate-limited)
  -> Validate + minimize input fields
  -> Load authorized Lead + approved Package/Policy facts
  -> Call provider with controlled prompt + read-only data/tools
  -> Parse schema-validated structured response
  -> Verify cited package IDs / facts / pricing consistency
  -> Store AiDraft: content + evidence + model/version + review status
  -> Return "AI draft — review required"
  -> Human edits/approves outside the LLM path
```

**AI reliability rules:**

- Use a provider abstraction and separate prompt/tool/evaluation code from controllers.
- Treat customer text, retrieved content, documents, tool results and model outputs as **untrusted**. Defend against instruction injection and content laundering.
- Strictly allowlist tools. Start with **read-only** retrieval; tool function arguments must pass schemas and object-level authorization.
- Use typed response schemas (e.g., Zod at boundary or class-based validation) and fail closed when schema validation fails.
- The model may **describe** a quote but must not be the mathematical source for totals. Final pricing comes from quotation service.
- Send only the minimum required personal information to providers. Do not include full customer phone/email by default, and document data-processing considerations.
- Save evidence IDs/source package versions, AI model/provider identifier, request timestamp, reviewer decision and safe cost metadata. Avoid storing sensitive raw prompts unless explicitly approved.
- Bound token usage, context size, duration, retries and per-staff quotas. Add timeouts and a clear provider-unavailable error/fallback.
- Evaluate Bengali/Banglish intent, invented price/inclusions, unsupported availability claims, missing info, PII leakage, malicious instructions and inconsistent package versions.
- Keep AI-generated copy distinguishable from approved quotation terms; human approval is never inferred from AI confidence.
- If inputs are insufficient, return questions or `needsHumanReview`, not an invented answer.

### Suggested draft result contract (illustrative, confirm with frontend)

```json
{
  "draftId": "uuid",
  "leadId": "uuid",
  "type": "CUSTOMER_REPLY",
  "language": "bn",
  "suggestedText": "...",
  "missingInformation": ["travelDate"],
  "sourcePackageIds": ["uuid"],
  "needsHumanReview": true,
  "status": "DRAFT"
}
```

This is an **example**, not a finalized API schema. Never expose internal prompt text or provider API keys in responses.

---

## 12. Configuration, security and privacy

Use a committed `.env.example` with placeholders only. Suggested names (adjust to verified code):

```dotenv
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
FRONTEND_URL=http://localhost:3001
JWT_ACCESS_SECRET=REPLACE_ME
JWT_REFRESH_SECRET=REPLACE_ME
OPENAI_API_KEY=
```

- **Never commit real `.env`, service keys or production database URLs.** Verify `.gitignore` actually excludes them.
- Fail fast for required environment variables, using validated config types. Do not demand `OPENAI_API_KEY` when AI is intentionally disabled for local tests.
- Configure secure headers with Helmet, request body size limits, strict CORS allowlist and appropriate request rate limits.
- Enforce HTTPS in production and configure proxy trust/cookie settings deliberately for the hosting platform.
- Decide session cookie path/domain/same-site and CSRF mitigation **as one coherent design** with the frontend repository.
- Avoid logging customer inquiries, full response bodies, password reset secrets, phone numbers and bearer/cookie tokens.
- Apply least privilege to DB credentials, object storage, deployment secrets and staff access.
- For quote documents, use private storage, randomized keys, file size limits and authorized downloads.
- Define client-agreed retention, privacy notices/consent, backup/export and deletion before production. Do not treat AI provider retention as automatically compliant.
- Avoid storing passports, NID scans, payment credentials or card details in MVP.
- Run dependency audits and update vulnerable dependencies with tested changes, not blind major upgrades.

---

## 13. Testing and quality gates

Match the project's installed test runner. Prefer focused unit tests and a few high-value integration/E2E flows over excessive mocking.

### Unit tests

- Auth token/session handling and deactivated-user cases.
- Role and object-level permission checks.
- Package validity and archive rules.
- Lead DTO validation, stage changes and allowed assignment.
- Quote currency/decimal arithmetic, discount/tax rounding and revision rules.
- AI output schema validation, missing-data behavior and unsafe claims.

### Integration/API tests

- Login → `/auth/me` → guarded resource access → logout.
- Admin creates/disables staff; disabled staff cannot access protected data.
- Agent creates a lead and attaches notes/follow-up task.
- Authorized package edit; unauthorized agent receives `403`.
- AI draft creation uses approved package facts and returns review-required status.
- Quote create → edit draft → approve → download PDF matches approved content.
- Repeated approval requests do not duplicate approved versions.
- Cross-role attempts to access/approve restricted quotes are rejected.
- Missing provider/database failures produce safe errors and log correlation IDs.

### AI evaluation dataset

Use **client-approved, redacted** inquiries and synthetic attacks. Include:

- Bangla, English and Banglish variations.
- Missing travel dates, traveler counts or budgets.
- Customer requests for unavailable packages or unsupported dates.
- Adversarial requests to invent a discount or override system instructions.
- Contradictory package price facts and stale catalog versions.
- Attempts to reveal system prompts, staff/customer data, keys or internal paths.

### Definition of Done per feature

- [ ] Fits the currently approved release and shared requirements.
- [ ] Routes/controllers/services use the project structure consistently.
- [ ] DTO validation, RBAC and object-level authorization are tested.
- [ ] DB schema/migration reviewed; no silent data loss.
- [ ] Business logic is deterministic where required (especially price and approval).
- [ ] Sensitive action recorded in audit log without leaking PII.
- [ ] Normal, invalid, unauthorized, missing, duplicate and failure cases covered.
- [ ] OpenAPI docs and `.env.example` updated when contracts/config changed.
- [ ] `npm run build`, relevant tests and lint/format checks pass (or failures reported).
- [ ] Frontend impact and migration/deployment notes documented.
- [ ] No unsupported claim of production readiness.

---

## 14. Implementation order for MVP

Implement in **vertical slices**, not a single large code generation pass.

1. **Foundation:** inspect NestJS template, configure env validation, global API prefix, validation pipe, CORS, logging/exception filter, Swagger, health endpoint if needed.
2. **Database:** verify Prisma 7 adapter/config/generated client, connect PostgreSQL, decide schema, review initial migrations, basic seed strategy without hardcoded production credentials.
3. **Auth & staff:** secure staff login, current user, logout, admin staff CRUD/deactivation, role/ownership guards, tests.
4. **Agency settings & packages:** branding/terms, approved package CRUD/archive/validity, authorization tests.
5. **Leads & notes:** CRUD, assignment/access rules, stage updates, notes and manual follow-up tasks, filters and pagination.
6. **Quote engine:** decimal-safe line items, draft editing, snapshots/revisions, approval transactions, audit tests.
7. **AI drafting:** read-only facts retrieval, provider abstraction, validated structured output, staff review state, eval tests.
8. **PDF export:** branded approved-revision PDF, authorized download and content tests.
9. **Dashboard & audit:** operational counts, actionable pending tasks, complete audit history.
10. **MVP stabilization:** integrated lead-to-PDF test, backup/restore procedure, observability, client pilot data, staging and sign-off checklist.

Order may be adjusted for dependencies, but **do not skip correctness/security gates to move faster**.

---

## 15. Frontend coordination and source-of-truth policy

Both repositories must contain **identical `PROJECT.md`**. Frontend has its own `AGENTS.md` focused on Next.js; backend has this file.

- Backend publishes **canonical OpenAPI** for `/api/v1`. Frontend consumes documented DTOs/enums/errors, never Prisma models directly.
- Agree on auth/session and cookie/CORS/CSRF behavior before implementing the two sides independently.
- Use identical enum wire values, decimal-string monetary serialization, API errors and date conventions.
- Do not rename endpoints or change response fields without updating OpenAPI, `PROJECT.md` copies and informing frontend implementers.
- Do not create a shared runtime monorepo package between independent repositories by default. A generated typed frontend client from OpenAPI is acceptable.
- Use test fixtures/mocks only for tests and local development, clearly tagged; never ship fabricated production responses.
- Breaking changes require a coordinated rollout or backward compatibility plan.

### Agent handoff template

```text
Task / release:
Relevant PROJECT.md requirements:
Assumptions requiring client/project-owner approval:
Backend files changed:
Prisma migration(s):
API/OpenAPI changes:
Auth/RBAC changes:
AI/safety implications:
Tests/build commands run and results:
Frontend coordination needed:
Unfinished work and risks:
```

---

## 16. Commands and operational discipline

Use the repository's actual `package.json` scripts. Typical commands, **only when they exist and are appropriate**:

```bash
npm install
npm run start:dev
npm run build
npm run test
npm run test:e2e
npm run lint
npx prisma validate
npx prisma generate
npx prisma migrate dev --name meaningful_name  # local development only
npx prisma migrate deploy                      # controlled deployment only
```

- Never assume a command succeeded. Read its output and verify the affected endpoint/behavior.
- Avoid silent dependency upgrades or global CLI changes that could break other local projects.
- Do not add extra services (Redis, brokers, vector DB) simply to satisfy an architecture diagram.
- Use temporary and synthetic seed data in development only. Never copy real client PII into fixtures.
- Record deployment prerequisites and rollback procedures before production release.

---

## 17. Release gate and decisions that must stay TBD

Before MVP production deployment, verify:

- [ ] Client has approved the workflow, staff roles and lead visibility rules.
- [ ] Approved package price/tax/discount/validity policies have been supplied.
- [ ] Agency brand assets, quotation PDF template, validity/terms and sample output are signed off.
- [ ] Hosting, database region, backups, privacy/retention and contract ownership are agreed.
- [ ] Authentication/session protection and privileged actions are tested.
- [ ] AI evaluation shows **no fabricated prices or availability** in the agreed test suite.
- [ ] Client can continue manually if AI provider is unavailable.
- [ ] E2E lead → AI draft → reviewed quote → approval → PDF → manual share recording passes.
- [ ] No unreviewed high-severity security issues remain; migration/rollback procedures are documented.
- [ ] Client signs off on the MVP acceptance criteria in `PROJECT.md`.

**Still TBD:** Exact agency identity, public/live domains, package source, payment terms, booking policy, tax rules, AI provider/limits, staff access model, actual channels, cloud region and commercial sign-off.

**Bottom line:** Build **one agency's reliable lead-to-quotation assistant first**. Protect client data, make quoted values deterministic, keep AI advisory, and only unlock later releases through explicit approval.
