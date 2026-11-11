# TravelPilot — Shared Project Specification

> **Document type:** Shared product and engineering specification  
> **Owner / delivery team:** Softilo  
> **Product:** AI Travel Sales & Operations Agent  
> **Deployment model:** **Single-client, custom software for one travel agency**  
> **Repositories:** `travelpilot-frontend` and `travelpilot-backend`  
> **Status:** Planning / subject to client discovery and approval  
> **Last updated:** 2026-11-11  
> **Version:** 0.1

## 0. Instructions for developers and coding agents

This exact `PROJECT.md` is the **shared source of truth** and must be committed to the root of **both** frontend and backend repositories. Read it before planning or implementing features.

- **This is NOT SaaS.** Serve **one contracted travel-agency client** and its authorized team. Do not implement multi-tenancy, tenant registration, subscriptions, public agency sign-up, per-tenant databases, SaaS billing, pricing plans, or a super-admin tenant control panel.
- Work only on the **currently approved release**: `MVP`, `V1`, `V2`, or `V3`. The initial active release is **MVP**. Later phases describe the roadmap, **not authorization to build them now**.
- An agency may have multiple **staff accounts and branches** later; that does not imply multiple customer organizations or tenancy.
- Do not invent confirmed client workflows, package prices, live inventory, channel permissions, regulatory approvals, deadlines, or integration credentials. Mark decisions as `TBD` until confirmed.
- Separate **facts** (approved catalog/verified data), **AI suggestions**, and **human-approved actions**.
- Repository-specific `AGENTS.md` files may add implementation rules but must not contradict this document. Update the shared specification in both repositories whenever product or API contracts change.
- No feature is considered complete until its acceptance criteria, authorization checks, error states, observability, and tests are covered.

## 1. Project summary

### 1.1 Problem
Travel agency staff receive inquiries through multiple channels and repeatedly answer questions about destinations, tour packages, prices, travel dates, and booking conditions. Manual lead tracking and quotation preparation can cause delays, inconsistent answers, and missed follow-ups.

### 1.2 Proposed solution
Build a **private, agency-branded web application** that centralizes travel packages, captures and organizes leads, drafts context-grounded responses with AI, produces staff-approved quotations, and gradually expands into messaging, bookings, payments, and operational insights.

### 1.3 Business goals
1. Reduce time to prepare accurate responses and quotations.
2. Keep all captured leads and their status in one controlled workspace.
3. Improve staff visibility into next actions and follow-ups.
4. Enforce human approval for price, inventory, booking, financial, and outbound messaging decisions.
5. Measure outcomes during a paid/approved pilot; do not promise conversion increases without evidence.

### 1.4 Non-goals
- Building a general travel marketplace or multi-agency platform.
- Direct airline ticket issuance, GDS, real-time hotel/transport availability, or external inventory synchronization without separate signed scope.
- A consumer mobile app in early releases.
- Unsupervised payments, refunds, booking confirmations, or price changes.
- Automatically sending bulk promotional messages.

## 2. Client and deployment assumptions

| Item | Decision |
|---|---|
| Client organization | One travel agency; legal/business name **TBD** |
| Ownership | Custom client project delivered by Softilo; IP, license, hosting, maintenance and data ownership decided in contract |
| Users | Agency owner/admin, sales/booking staff; additional roles when justified |
| End customers | Travel inquiries/leads; **no customer account required in MVP** |
| Deployment | One production environment for the client, plus non-production staging |
| Branding | Client logo, colors, contact details and document template |
| Language | Staff UI may be English-first; customer-facing outputs support Bangla/English/Banglish after testing |
| Data hosting region | TBD based on client agreement and provider capabilities |
| Messaging channels | Manual entry in MVP; official provider integrations only after approval |
| Payment collection | External/manual records initially; no payment processing in MVP |

**Single-client architecture note:** Use one logical agency configuration with `settings`, not a `Tenant`/`Organization` table for isolation. If branches become necessary, introduce `Branch` only after requirements are approved. Every authenticated staff member belongs to the same client environment; enforce permissions by role, not tenant IDs.

## 3. User roles and permissions

| Action | OWNER_ADMIN | SALES_AGENT | OPERATIONS *(V2, optional)* |
|---|---|---|---|
| Manage staff and roles | Yes | No | No |
| Manage agency settings | Yes | No | No |
| Create/update packages | Yes | Optional by permission | Optional by permission |
| Read assigned/accessible leads | Yes | Yes | Yes |
| Add/update lead and notes | Yes | Yes | Yes |
| Generate AI response draft | Yes | Yes | Yes |
| Approve/send quote | Yes | Yes, if authorized | Yes, if authorized |
| Confirm bookings | Yes | Only by assigned permission | Yes, if authorized |
| Verify payment records | Yes | No by default | Only by assigned permission |
| View sensitive analytics | Yes | Limited | Limited |

- Start MVP with `OWNER_ADMIN` and `SALES_AGENT`; add fine-grained permissions only where needed.
- Server-side role checks are mandatory. Hiding a button in the UI is not authorization.
- Maintain auditable actor, timestamp, and before/after values for sensitive state changes.

## 4. Release strategy

The releases are **sequential scope gates**, not fixed calendar commitments. Release dates, external integrations and commercial terms require client approval.

### MVP — Validated lead-to-quotation workflow **[ACTIVE]**

**Outcome:** A staff member can capture an inquiry, select or find approved package information, generate an AI-assisted response/quotation draft, edit it, approve it, export PDF, and track lead status.

**In scope**
- Agency-branded staff sign-in and secure session handling.
- Admin creates staff accounts (no public sign-up).
- Manage basic package catalog: name, destination, duration, description, inclusions, exclusions, base price, currency, validity dates/notes, status.
- CRUD leads: customer name/contact, source, destination, travel dates, traveler count, budget, requirements, owner, notes.
- Lead pipeline: `NEW`, `QUALIFIED`, `QUOTED`, `FOLLOW_UP`, `WON`, `LOST`.
- AI-assisted **draft only**: lead qualification, suggested questions, response draft, and package-based quotation text; grounded exclusively in approved data.
- Editable quotation with pricing breakdown and versioned snapshot; generate client-branded PDF.
- Staff approval and **manual sharing** of response/quotation (copy/download); record that a quote was shared manually.
- Dashboard: lead counts by status, quotes created, pending actions; basic audit trail.
- Validation of inputs, loading/error/empty states, logs, rate limiting and backup plan.

**Explicitly out of scope for MVP**
- Automatic WhatsApp/Facebook Messenger sends or reading live inboxes.
- Full bookings, reservation inventory, payment processing or automated payment reconciliation.
- Automated follow-up message delivery; only manual notes/tasks.
- Multi-client SaaS features, custom workflow designer, mobile app, advanced agent autonomy.

**MVP acceptance criteria**
1. Admin can invite/create an agent and disable their access.
2. Agent can create a lead and move it through statuses; all updates persist and are authorized.
3. Package editor can maintain approved price/inclusions and archive outdated packages.
4. AI must decline to invent unavailable prices, inventory, or terms; must request missing details or flag uncertainty.
5. Agent can edit an AI draft and generate a PDF reflecting **final approved** values.
6. Lead records link to one or more quotations; quote totals are calculated deterministically on the server.
7. A user without permission cannot alter package prices or access admin-only actions.
8. Functional tests cover a complete lead → draft → approval → PDF → status update flow.
9. The client approves the scope and sign-off checklist before production release.

### V1 — Connected sales inbox and collaboration **[FUTURE / NOT APPROVED]**

**Proposed scope**
- Integrate approved official channels: WhatsApp Business Platform and/or Messenger, depending on provider approvals and client's accounts.
- Unified inbound conversation timeline linked to leads; deduplication/identity handling.
- Draft and review AI replies in a team inbox; authorized staff sends messages.
- Assigned lead ownership, internal comments, notifications and SLA dashboard.
- Quote sharing through approved channels, with delivery state where provider supports it.
- Improved package search and knowledge management; message template management.

**Gate:** Verified provider access and compliance, clear consent/retention policy, evaluated AI answer quality, and signed channel-related scope/costs.

### V2 — Booking and payment operations **[FUTURE / NOT APPROVED]**

**Proposed scope**
- Booking records linked to leads and quotes; booking status and itinerary confirmation.
- Traveler information collection with field minimization and access restrictions.
- Manual payment entries, proof attachment, balance due and basic receipts.
- Booking operations board, due reminders, approval-based follow-up queue.
- Cancellation/change policy tracking, confirmation documents, operational reports.

**Gate:** Client-approved booking lifecycle, cancellation/refund policies, financial reconciliation rules, and explicit staff approval controls. Do **not** interpret a message or screenshot alone as proof of payment.

### V3 — Advanced AI and operations intelligence **[FUTURE / NOT APPROVED]**

**Proposed scope**
- AI-assisted sales prioritization and daily operations summaries with evidence links.
- More capable multi-step agent workflows with checkpoints and human approvals.
- Follow-up suggestions from historical activity; controlled schedule-based delivery if approved.
- Reporting on lead-to-quotation and quote-to-booking conversion; export.
- Selected integrations (accounting, hotel/transport partners) only when technically and commercially validated.
- Branch support or additional roles if the client actually operates branches.

**Gate:** Proven baseline measurements, unit economics, safety evaluations, data governance, and new scope agreement.

## 5. Functional workflow and state rules

### 5.1 MVP inquiry workflow
1. Sales agent receives inquiry on phone, web, Messenger, or WhatsApp **outside the app**.
2. Agent creates lead manually and captures consent/status where appropriate.
3. App lists relevant active packages using approved catalog information.
4. AI proposes missing questions, response drafts or a quotation explanation.
5. Agent verifies dates, price, package validity and terms; edits draft.
6. System calculates totals from structured quote line items, then creates a versioned quote.
7. Authorized staff approves, exports PDF and manually shares with customer.
8. Agent updates the lead status and records follow-up action.

### 5.2 Source-of-truth priority
1. Verified structured agency package and pricing data.
2. Staff-confirmed lead/quotation fields.
3. Approved agency policy documents.
4. General LLM language generation **only** for phrasing, summarizing and safe suggestions.

If a field is unknown, return `unknown` / request verification; never fabricate package price, discount, availability, hotel name, transfer schedule, visa advice or final booking status.

### 5.3 Price and quote invariants
- The backend calculates line totals, discounts, taxes and grand totals; never trust a model-generated total or only a frontend calculation.
- Quotes must snapshot item descriptions, quantity, currency, unit prices, discounts, validity and terms at creation time.
- Price changes to the package catalog must not silently mutate historical quotes.
- Approved quotations should be immutable or produce a new revision when edited.
- Customer-facing PDFs identify validity dates and terms as approved by the agency.

## 6. Proposed technical architecture

### 6.1 Stack (initial recommendation)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (App Router), React, TypeScript | Responsive internal dashboard |
| UI | Tailwind CSS, shadcn/ui | Accessible components, consistent states |
| Backend | NestJS, TypeScript | Modular monolith, REST API |
| ORM | Prisma | Migrations source-controlled in backend |
| Database | PostgreSQL | Managed provider; backups required |
| Auth | Server-managed secure sessions or short-lived access + rotated refresh tokens | Select one implementation and document cookie/token controls |
| AI | Provider-agnostic LLM adapter with tool contracts | Structured responses and evaluations |
| Background work | Queue only when needed | PDF generation/AI retries if necessary |
| Storage | Private object storage | For generated PDFs and future attachments |
| Deployment | Frontend and API deploy independently | Environment variables per environment |

Do not add Redis, vector DB, LangGraph, Kafka or microservices by default. Add only when proven necessary.

### 6.2 Repository ownership

**`travelpilot-frontend` owns:**
- Pages, navigation, client-side UI, forms, validation feedback, role-aware presentation.
- API client, auth UX and user-visible error handling.
- Accessible loading/empty/error states, responsive dashboard and integration tests.
- No direct database access; never expose AI or service credentials in browser code.

**`travelpilot-backend` owns:**
- Authentication, authorization, business rules, pricing calculations and approval enforcement.
- Lead/package/quotation APIs and Prisma models/migrations.
- AI orchestration, retrieval of approved context, input/output validation and prompt-injection defense.
- PDF generation or secure document-generation endpoints; storage authorization.
- API auditing, logging, monitoring, validation and background processing.

**Shared by contract, not a shared runtime package:**
- Public REST endpoint definitions and schemas, enum names, errors, pagination rules, and version lifecycle.
- The backend owns the OpenAPI specification. Frontend should generate or align types from it.
- No frontend import from backend source, and no backend import from frontend source.

## 7. Initial data model (MVP)

These are conceptual entities, not a finalized Prisma schema. Prefer clear constraints and migrations over speculative abstraction.

| Entity | Purpose / essential fields |
|---|---|
| `StaffUser` | id, name, email/login, passwordHash or auth identity, role, status, createdAt |
| `AgencySettings` | single configured agency, branding, contact details, default currency, document terms |
| `Package` | id, title, destination, duration, description, inclusions, exclusions, basePrice, currency, active/archived, validity info |
| `Lead` | id, contact details, source, preferences, traveler count, dates, budget, stage, assignedTo, createdAt |
| `LeadNote` | id, leadId, actorId, content, createdAt |
| `Quotation` | id, leadId, revision, status, pricing snapshot, subtotal, discount, taxes, grandTotal, validity, terms, approvedBy, approvedAt |
| `QuotationItem` | id, quotationId, label, qty, unitPrice, total, currency |
| `AiDraft` | id, leadId, source facts/refs, generated text, model metadata, review status, actor, createdAt |
| `AuditLog` | id, actorId, action, entityType, entityId, timestamp, safe metadata |
| `FollowUpTask` | id, leadId, assignedTo, dueAt, status, note; **manual task only in MVP** |

Potential enums:
- `StaffRole`: `OWNER_ADMIN`, `SALES_AGENT`
- `LeadStage`: `NEW`, `QUALIFIED`, `QUOTED`, `FOLLOW_UP`, `WON`, `LOST`
- `QuotationStatus`: `DRAFT`, `APPROVED`, `VOID`
- `FollowUpTaskStatus`: `OPEN`, `DONE`, `CANCELLED`

**Do not add:** `Tenant`, `TenantMembership`, `Subscription`, `Plan`, `UsageBilling`, `TenantDomain` or public onboarding tables. They belong to SaaS, not this project.

## 8. API contract — proposed MVP routes

API prefix: `/api/v1`. The backend will publish canonical OpenAPI before the frontend relies on implementations.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Staff sign-in |
| `POST` | `/auth/logout` | End session |
| `GET` | `/auth/me` | Current staff identity and permissions |
| `GET/POST` | `/staff` | List/create staff (admin) |
| `PATCH` | `/staff/:id` | Manage staff role/status (admin) |
| `GET/PATCH` | `/settings/agency` | Agency configuration |
| `GET/POST` | `/packages` | List/create packages |
| `GET/PATCH/DELETE` | `/packages/:id` | Get/update/archive package (`DELETE` is soft archive) |
| `GET/POST` | `/leads` | List/create leads |
| `GET/PATCH` | `/leads/:id` | Get/update lead |
| `GET/POST` | `/leads/:id/notes` | Lead notes |
| `GET/POST` | `/leads/:id/follow-ups` | Manual follow-up tasks |
| `POST` | `/ai/drafts` | Generate validated AI suggestion/draft |
| `GET/POST` | `/leads/:id/quotations` | List/create quotations |
| `GET/PATCH` | `/quotations/:id` | View/edit draft quotation |
| `POST` | `/quotations/:id/approve` | Authorized approval |
| `GET` | `/quotations/:id/pdf` | Authorized PDF export |
| `GET` | `/dashboard/summary` | Aggregate MVP counts |

Notes:
- Routes are **proposed**, not approved production contracts; align with OpenAPI during implementation.
- Consistent error shape: `{ code, message, details?, requestId }` (with no sensitive implementation details).
- Server-side filtering and pagination for list endpoints; whitelist sort keys.
- Write requests use DTO validation and explicit authorization.
- Use idempotency where duplicate request submission can create financial/approval side effects.
- Consider CSRF defenses if cookie-based auth is used, plus strict CORS allowlists.

## 9. AI agent behavior and safety policy

**AI role:** Assist staff with comprehension, drafting, and recommendations. Not a booking engine, payment verifier, or autonomous negotiator.

### Allowed in MVP
- Identify structured intent from a travel inquiry.
- Propose next clarifying questions.
- Search supplied active package facts using backend tools.
- Draft responses and quote descriptions; label all outputs as drafts.
- Summarize existing lead information without extrapolating unknown facts.

### Disallowed without authorized staff confirmation
- Send outbound messages, modify package prices, promise discounts, assert live availability.
- Confirm or cancel bookings, mark payments received, issue refunds.
- Change role permissions or agency business rules.
- Copy sensitive customer data into unrelated external tools.

### Required controls
1. **Grounding:** Use structured approved catalog and policy data; cite internal package IDs/versions in the AI result for reviewers.
2. **Structured output:** Validate generated data against a schema. Reject malformed or unauthorized tool parameters.
3. **Tool allowlist:** AI read tools in MVP; any proposed future write tools require purpose-specific authorization and confirmation.
4. **Prompt-injection resistance:** Treat customer text, PDFs, package notes and retrieved content as untrusted data, not system instructions.
5. **Redaction:** Avoid unnecessary PII in prompts/logs; mask contact details where feasible.
6. **Review:** Staff edit/approve before sharing; persist approval actor and timestamp.
7. **Fallback:** If provider is down, allow manual quoting and lead handling.
8. **Evaluation:** Test multilingual/Banglish inquiries, hallucinated prices, missing dates, sensitive data leakage, and malicious instructions.
9. **Cost controls:** Limit requests per staff/user, token budgets, retries and max context size; alert on anomalous costs.

## 10. Security, privacy and reliability

- Use hashed passwords (if password auth), strong password reset processes and secure, httpOnly session cookies where applicable.
- Apply least-privilege RBAC and object-level authorization on every endpoint.
- Secrets live in server environment configuration only; never commit API keys, customer PII or sample production data.
- Encrypt network traffic; use private storage for quotations/attachments and expiring signed access as needed.
- Log access and sensitive changes without storing unnecessary raw message contents.
- Define retention, deletion/export and lawful data-processing arrangements with the client before production.
- Treat travel document/identity information as sensitive; do not collect passport/NID scans in MVP.
- Use DB migrations, automated backups, restoration tests and a rollback plan.
- Protect forms and APIs with validation, rate limits, safe error responses and security headers.
- Do not claim WhatsApp/Messenger access until official provider onboarding succeeds.
- Require destination/package validity checks; never invent official restrictions or transport availability.

## 11. UX requirements

- Default workflow optimized for busy agency sales staff; minimize clicks from lead creation to quotation.
- Responsive layout for desktop and mobile browsers; no mobile app requirement.
- Core screens: Login, Dashboard, Leads List, Lead Detail, Packages, Package Editor, Quotation Editor/Preview, Settings/Staff.
- Show AI-generated content with an explicit **AI draft — review required** indicator.
- Make original package source and last-updated timestamp visible where relevant.
- Display loading, no results, validation errors, permission errors and network-failure states.
- Confirm high-impact changes; never make silent price or approval changes.
- Keep interface terminology consistent with the agency's actual workflow and language preference.

## 12. Testing and quality gates

**Frontend:** component/form tests, API error handling, accessibility checks, responsive checks, auth flow E2E.

**Backend:** DTO validation, permission boundaries, quote-calculation unit tests, transaction tests, API contract tests, PDF snapshot/content tests.

**AI:** curated evaluation dataset from client-approved/de-identified inquiries; tests for wrong prices, unsupported claims, Bangla/Banglish interpretation, prompt injection and safe fallback.

**Required release gate:**
- All acceptance scenarios pass in staging.
- No open critical/high-severity authorization vulnerabilities.
- No fabricated price/inventory in the approved AI evaluation suite.
- Client approves sample quotation PDF and operating workflow.
- Backup/restore and deployment rollback procedures documented.
- Client sign-off recorded for release scope and responsibilities.

## 13. Delivery roadmap and milestones

This is a **planning sequence, not an unconditional 90-day delivery promise**.

| Period | Milestone | Expected evidence |
|---|---|---|
| Days 1–10 | Client discovery + final MVP scope | Confirmed workflow, package examples, sample quote and required roles |
| Days 11–20 | UX + API/data contract | Screen flows, ERD, documented OpenAPI design |
| Days 21–45 | Core MVP implementation | Auth, packages, leads, quote CRUD, AI drafts |
| Days 46–60 | QA + PDF + security | End-to-end staging demo, test evidence, corrected issues |
| Days 61–75 | Pilot with agency staff | Realistic case evaluation, operational feedback, time-saved baseline |
| Days 76–90 | Stabilization + release decision | Client sign-off, training, issue backlog, V1 priority decision |

V1–V3 dates and budgets must be estimated **after** MVP findings. Do not promise all roadmap releases within the MVP schedule.

## 14. Client discovery checklist — unresolved decisions

- [ ] Agency legal/name, logo, owner representative and authorized sign-off contact.
- [ ] Exact inquiry sources, volume, languages and workflow.
- [ ] Existing package information source and authorized pricing owner.
- [ ] Quotation template, tax/discount rules, currency and validity policy.
- [ ] Lead stages, ownership and follow-up responsibilities.
- [ ] Staff roles, access constraints and reporting needs.
- [ ] Data-processing, retention, backups and data export requirements.
- [ ] AI model/provider constraints and expected monthly usage/cost budget.
- [ ] Hosting/domain ownership, deployment environment and support arrangement.
- [ ] Whether official WhatsApp/Messenger access is available (for V1 only).
- [ ] Signed MVP scope, timeline, change-request process and acceptance authority.

## 15. Decisions, change control and documentation synchronization

- Maintain a short dated decision log in both repositories (example below).
- If product requirements or endpoints change, edit `PROJECT.md` in **both** repositories in the same coordinated change and update the backend OpenAPI contract.
- If a request belongs to a future version, record it in the backlog. Do not silently include it in MVP.
- New features require: problem statement, owner approval, UI/API impacts, security review, test cases and acceptance criteria.
- Keep deployment credentials and private client information in secure, access-controlled systems; not in this file.

### Decision log

| Date | Decision | Status |
|---|---|---|
| 2026-11-11 | Product is for one travel-agency client; **not SaaS** | Confirmed by project owner |
| 2026-11-11 | Use separate frontend/backend repos with identical shared `PROJECT.md` | Confirmed by project owner |
| 2026-11-11 | MVP first, then independently approved V1/V2/V3 | Confirmed by project owner |
| TBD | Agency identity, commercial terms, production stack/provider selections | Pending client discovery |

## 16. Definition of Done

A release is done only when:
- Approved scope and UX behavior match the client-agreed workflows.
- Frontend and backend are integrated against an agreed API contract.
- Authorization, input validation, auditability and error handling are tested.
- AI suggestions are grounded, clearly labeled and cannot silently execute restricted actions.
- Staging review passes, deployment/backups are documented, and the client signs off.
- Both repositories carry the same `PROJECT.md` revision.

---

**Implementation reminder:** Implement **MVP only** until a documented decision activates V1. This is a **single-client custom application**, not a SaaS product.
