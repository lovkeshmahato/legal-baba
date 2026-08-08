# Legal Baba — AI Legal Document Generator (Nepal)

A bilingual (English / नेपाली) SaaS platform that lets individuals and
businesses generate legally-structured documents through a guided
questionnaire, backed by lawyer-reviewed clause templates and Claude-drafted
language.

**Built so far (Phase 1–4):** project scaffold, database schema, the
template engine, auth, the questionnaire wizard, and Claude-backed
generation/review. Not yet built: PDF/DOCX export, dashboard, payments,
admin panel, e-sign — see "Next steps" below.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui-style primitives (Radix)
- **Data:** Prisma ORM + PostgreSQL
- **Auth:** NextAuth.js (Google + email/password), role-based session
- **AI:** Anthropic Claude API (server-only), tool-use for structured output
- **Editing:** Tiptap rich-text editor
- **State:** Zustand (per-instance wizard store)
- **i18n:** next-intl (`en` / `np`, locale-prefixed routes)
- **Dates:** `nepali-date-converter` for BS ⇄ AD

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, ANTHROPIC_API_KEY, etc.
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Visit `http://localhost:3000` — the locale middleware redirects to `/en` or
`/np`. Register an account, then **Documents → pick a template → fill the
wizard → Generate** produces an AI-drafted, editable document.

## Folder structure

```
prisma/
  schema.prisma            # full data model (see below)
  seed.ts                  # upserts plans, categories, templates, clauses
  seed-data/
    categories.ts           # the 6 document categories (A–F from the spec)
    employment.ts            # Offer Letter, Termination Letter templates
    rental.ts                 # Residential Rental Agreement template
    business.ts                # NDA, MOU templates
    plans.ts                    # Free / Individual / Business / Enterprise

src/
  app/
    [locale]/
      layout.tsx            # HTML shell, next-intl + session providers, header
      page.tsx               # landing page
      documents/
        page.tsx              # category/template picker grid
        [slug]/page.tsx        # questionnaire wizard (session-gated)
        review/[id]/page.tsx    # AI review/edit screen
      login/page.tsx, register/page.tsx
    api/
      auth/[...nextauth]/route.ts
      register/route.ts        # credentials sign-up
      documents/
        route.ts                # POST: validate + create a DRAFT
        [id]/route.ts             # PATCH: save edited Tiptap content
        [id]/generate/route.ts     # POST: Claude draft (+ regenerate-as-new-version)
        [id]/explain/route.ts       # POST: "explain this clause" in plain language
  components/
    ui/                       # Button, Input, Select, Card, Badge, …
    wizard/                   # WizardForm, DynamicField, PartyBlockInput, DateBsInput,
                               # Zustand store context (wizard-context.tsx)
    review/document-editor-client.tsx   # Tiptap editor + risk flags + disclaimer
    providers/session-provider.tsx, site-header.tsx, locale-switcher.tsx
  i18n/
    routing.ts, navigation.ts, request.ts
  lib/
    prisma.ts, session.ts, auth.ts, anthropic.ts, utils.ts, i18n-content.ts, prisma-json.ts
    template-engine/          # conditions.ts, validate.ts, clauses.ts
    ai/
      build-prompt.ts          # assembles the per-generation user prompt
      generate-document.ts      # Claude tool-use call → Tiptap JSON + flags
    tiptap/build-doc.ts        # AI sections → Tiptap JSON (+ disclaimer paragraph)
  stores/wizard-store.ts      # Zustand vanilla store factory
  types/
    template-engine.ts        # zod schema for the JSON-schema field types
    next-auth.d.ts             # session/JWT augmentation (role, id)

messages/
  en.json, np.json           # UI translation strings
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

## How generation works

1. `WizardForm` (`src/components/wizard/wizard-form.tsx`) walks the
   template's `fieldSchema` step by step (a Zustand store, scoped per
   wizard instance via React context, holds `formData`/`step`/`language`),
   validating each step with `validateFormData` before advancing.
2. On the final step, the client calls `POST /api/documents` (validates
   again server-side, persists a `DRAFT` `GeneratedDocument`), then
   `POST /api/documents/[id]/generate`.
3. The generate route resolves the active clause set for the given answers
   (`resolveActiveClauses`, honoring toggles/conditions), computes risk
   flags for clauses the user left out (`flagMissingRiskClauses`), and
   calls Claude with the template's system prompt plus a user prompt built
   by `buildUserPrompt` — the clause library entries act as a structural
   backbone the model fills in and expands, never inventing facts not in
   `formData`.
4. Claude responds via a forced `return_document` tool call (structured
   sections + clarifying flags), which `buildDocFromSections` turns into
   Tiptap JSON with the bilingual draft disclaimer appended as the final
   paragraph.
5. The review screen (`document-editor-client.tsx`) renders that in an
   editable Tiptap surface, surfaces every risk/AI flag, and offers
   **Explain this clause** (selects text → `POST .../explain` → plain-language
   explanation), **Regenerate** (creates a new *version* row via
   `previousVersionId`, preserving history), and **Save changes** (`PATCH`).

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
  requests), `AuditLog` (records draft creation, generation, and regeneration).

Seeded: all 6 categories from the spec, plus fully-fielded templates for
**Employment** (Offer Letter, Termination Letter), **Rental & Property**
(Residential Rental Agreement), and **Business & Commercial** (NDA, MOU).

## Guardrails already in place

- `src/lib/anthropic.ts` and `src/lib/ai/generate-document.ts` are
  `server-only` — importing either from a Client Component fails the build,
  so the Claude API key can never reach the browser bundle.
- `DocumentTemplate.requiresLawyerReview` and `.isGovernmentFormat` exist so
  no template can be silently presented as "ready to file" (the review page
  shows a draft-only banner when `isGovernmentFormat` is set).
- The bilingual draft disclaimer is baked into every seeded system prompt
  *and* appended to every generated document by `buildDocFromSections`, so
  it survives even if a template's prompt is edited.
- The AI is instructed never to fabricate facts not present in `formData`,
  and must return clarifying `flags` for anything missing or ambiguous
  rather than guessing.
- Every document route checks `document.userId === session.user.id` before
  reading or mutating — no cross-account access.

## Verified working end-to-end

`prisma migrate deploy`, `db:seed`, `tsc --noEmit`, and `next build` all
pass. Manually smoke-tested against a local Postgres instance: register →
sign in → create a draft (server-side validated against the template's
field schema) → call the generate endpoint (reaches the real Anthropic API;
fails cleanly with a 502 + JSON error on an invalid key, as expected in this
sandbox) → PATCH saved edits → review page renders. The document
picker, wizard, login, and register pages all render correctly in both
locales.

## Next steps (not yet built)

1. PDF/DOCX export with Nepali document formatting conventions (letterhead,
   witness/signature blocks, BS dates).
2. Dashboard (drafts, saved docs, folders/tags, share links, download
   history).
3. Nepal payment gateway integrations (eSewa, Khalti, Fonepay, ConnectIPS,
   IME Pay) + plan/usage enforcement — the `Plan`/`Subscription`/`Payment`
   schema is ready, no integration code yet.
4. Admin CRUD for categories/templates/clauses + moderation queue UI.
5. E-sign module (typed/drawn signature capture + IP/timestamp audit trail
   — `Signature` model exists, no UI yet).
