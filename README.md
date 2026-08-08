# Legal Baba — AI Legal Document Generator (Nepal)

A bilingual (English / नेपाली) SaaS platform that lets individuals and
businesses generate legally-structured documents through a guided
questionnaire, backed by lawyer-reviewed clause templates and Claude-drafted
language.

This is **Phase 1–2** of the build: project scaffold, database schema, and
the template engine. The questionnaire wizard UI, AI generation endpoint,
PDF/DOCX export, payments, and admin panel come next.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS (+ shadcn/ui primitives)
- **Data:** Prisma ORM + PostgreSQL
- **Auth:** NextAuth.js (Google + email/password), role-based access
- **AI:** Anthropic Claude API (server-only)
- **i18n:** next-intl (`en` / `np`, locale-prefixed routes)

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, ANTHROPIC_API_KEY, etc.
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Visit `http://localhost:3000` — the locale middleware redirects to `/en` or
`/np`.

## Folder structure

```
prisma/
  schema.prisma          # full data model (see below)
  seed.ts                # upserts plans, categories, templates, clauses
  seed-data/
    categories.ts         # the 6 document categories (A–F from the spec)
    employment.ts          # Offer Letter, Termination Letter templates
    rental.ts               # Residential Rental Agreement template
    business.ts              # NDA, MOU templates
    plans.ts                  # Free / Individual / Business / Enterprise

src/
  app/
    [locale]/
      layout.tsx          # root HTML shell, next-intl provider
      page.tsx             # landing page stub
    api/auth/[...nextauth]/route.ts
    globals.css
  i18n/
    routing.ts            # locales, default locale, prefix strategy
    navigation.ts           # locale-aware Link/router
    request.ts               # next-intl server config
  lib/
    prisma.ts              # singleton Prisma client
    auth.ts                  # NextAuth options (Google + credentials)
    anthropic.ts               # server-only Claude client + disclaimer text
    utils.ts                     # cn() class helper
    template-engine/
      conditions.ts         # evaluates visibleWhen / conditionalOn rules
      validate.ts             # parses + validates a template's fieldSchema
      clauses.ts                # resolves active clauses from formData
      index.ts
  types/
    template-engine.ts     # zod schema for the JSON-schema field types
    next-auth.d.ts           # session/JWT augmentation (role, id)

messages/
  en.json, np.json         # UI translation strings
```

## The template engine

Document types are **data, not code**. Each `DocumentTemplate` row stores:

- `fieldSchema` (JSON) — an array of typed questionnaire fields (`TEXT`,
  `CURRENCY`, `DATE_BS`, `PARTY_BLOCK`, `CLAUSE_TOGGLE`,
  `FREE_TEXT_CLAUSE`, …), each with a bilingual label, a wizard `step`, and
  an optional `visibleWhen` rule. Shape and validation live in
  `src/types/template-engine.ts` and `src/lib/template-engine/validate.ts`.
- `systemPromptEn` / `systemPromptNp` — the per-template Claude system
  prompt (editable from the admin panel once built, not hardcoded).
- A related `ClauseLibraryItem[]` — the clause backbone, each with
  bilingual title/body, a `conditionalOn` rule or `isToggleable` flag, and
  an optional `riskFlagIfMissing` message surfaced in the AI review step.

Adding a new document type (e.g. "Vehicle Sale Agreement") means inserting
rows via the seed script or (later) the admin CRUD UI — no code changes.

## Data model highlights (`prisma/schema.prisma`)

- **Identity:** `User`, `Organization`, `OrgMember` (org roles), NextAuth's
  `Account`/`Session`/`VerificationToken`.
- **Billing:** `Plan` (Free/Individual/Business/Enterprise), `Subscription`,
  `Payment` (supports both recurring and pay-per-document), `CouponCode`.
  `PaymentGateway` enum covers eSewa, Khalti, Fonepay, ConnectIPS, IME Pay.
- **Template engine:** `DocumentCategory`, `DocumentTemplate`,
  `ClauseLibraryItem`.
- **Documents:** `GeneratedDocument` (versioned via self-relation, stores
  `formData` + Tiptap `content` JSON + `aiFlags`), `Signature` (typed/drawn
  e-sign with IP/timestamp audit trail, explicitly not an ETA-certified
  digital signature).
- **Trust & safety:** `ModerationQueueItem` (flagged free-text clause
  requests), `AuditLog`.

Seeded today: all 6 categories from the spec, plus fully-fielded templates
for **Employment** (Offer Letter, Termination Letter), **Rental & Property**
(Residential Rental Agreement), and **Business & Commercial** (NDA, MOU) —
the four categories called out as the starting point for admin CRUD.

## Guardrails already in the schema/lib layer

- `src/lib/anthropic.ts` is `server-only` — importing it from a Client
  Component fails the build, so the Claude API key can never reach the
  browser bundle.
- `DocumentTemplate.requiresLawyerReview` and `.isGovernmentFormat` exist so
  no template can be silently presented as "ready to file."
- The standard draft disclaimer (`DRAFT_DISCLAIMER`, bilingual) lives
  alongside the Claude client and is baked into every seeded system prompt.

## Next steps (not yet built)

1. Dynamic questionnaire wizard UI reading `fieldSchema`, with BS/AD date
   pickers.
2. `/api/generate` — Claude Messages call per template, returning Tiptap
   JSON + `aiFlags`.
3. Admin CRUD for categories/templates/clauses.
4. PDF/DOCX export, dashboard, payments, e-sign.
