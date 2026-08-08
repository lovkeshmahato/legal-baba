import { z } from "zod";

/**
 * The template engine drives the dynamic questionnaire wizard, the AI
 * generation prompt, and admin CRUD — all from a single JSON schema stored
 * per DocumentTemplate (see prisma/schema.prisma: DocumentTemplate.fieldSchema).
 * Adding a new document type means inserting rows, not writing code.
 */

export const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "CURRENCY",
  "DATE_AD",
  "DATE_BS",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "PARTY_BLOCK",
  "CLAUSE_TOGGLE",
  "FREE_TEXT_CLAUSE",
] as const;

export const FieldTypeEnum = z.enum(FIELD_TYPES);
export type FieldType = z.infer<typeof FieldTypeEnum>;

const bilingualLabel = z.object({
  en: z.string().min(1),
  np: z.string().min(1),
});

/** Visibility/requirement rule evaluated against previously answered fields. */
const conditionRule = z.object({
  field: z.string(),
  equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
  notEquals: z.union([z.string(), z.number(), z.boolean()]).optional(),
  in: z.array(z.union([z.string(), z.number()])).optional(),
});
export type ConditionRule = z.infer<typeof conditionRule>;

const baseFieldSchema = z.object({
  /** Stable key — used as the formData object key and referenced by clause conditionalOn rules. */
  key: z.string().min(1),
  type: FieldTypeEnum,
  label: bilingualLabel,
  helpText: z.optional(z.object({ en: z.string(), np: z.string() })),
  placeholder: z.optional(z.object({ en: z.string(), np: z.string() })),
  required: z.boolean().default(false),
  /** Which wizard step this field belongs to (steps render in ascending order). */
  step: z.number().int().min(0).default(0),
  sortOrder: z.number().int().default(0),
  /** Only render/require this field when the rule matches prior answers. */
  visibleWhen: z.optional(conditionRule),
});

const textField = baseFieldSchema.extend({
  type: z.literal("TEXT"),
  maxLength: z.number().int().positive().optional(),
});

const textareaField = baseFieldSchema.extend({
  type: z.literal("TEXTAREA"),
  maxLength: z.number().int().positive().optional(),
});

const numberField = baseFieldSchema.extend({
  type: z.literal("NUMBER"),
  min: z.number().optional(),
  max: z.number().optional(),
});

const currencyField = baseFieldSchema.extend({
  type: z.literal("CURRENCY"),
  currency: z.literal("NPR").default("NPR"),
  min: z.number().nonnegative().optional(),
});

const dateAdField = baseFieldSchema.extend({ type: z.literal("DATE_AD") });
const dateBsField = baseFieldSchema.extend({ type: z.literal("DATE_BS") });

const selectField = baseFieldSchema.extend({
  type: z.literal("SELECT"),
  options: z
    .array(z.object({ value: z.string(), label: bilingualLabel }))
    .min(1),
});

const multiSelectField = baseFieldSchema.extend({
  type: z.literal("MULTI_SELECT"),
  options: z
    .array(z.object({ value: z.string(), label: bilingualLabel }))
    .min(1),
});

const checkboxField = baseFieldSchema.extend({
  type: z.literal("CHECKBOX"),
  defaultChecked: z.boolean().default(false),
});

/** A named party (person/company) with the standard identity block used across Nepali legal drafting. */
const partyBlockField = baseFieldSchema.extend({
  type: z.literal("PARTY_BLOCK"),
  partyRole: z.string(), // e.g. "employer", "landlord", "first_party"
  includeCitizenshipNumber: z.boolean().default(true),
  includePanNumber: z.boolean().default(false),
  includeCompanyRegistration: z.boolean().default(false),
});

/**
 * Renders as an on/off switch in the wizard; toggles a matching
 * ClauseLibraryItem (by key) in or out of the generated document.
 */
const clauseToggleField = baseFieldSchema.extend({
  type: z.literal("CLAUSE_TOGGLE"),
  clauseKey: z.string(),
  defaultOn: z.boolean().default(true),
});

/** Free-text box where the user describes a custom clause in plain language for the AI to draft. */
const freeTextClauseField = baseFieldSchema.extend({
  type: z.literal("FREE_TEXT_CLAUSE"),
  insertAfterClauseKey: z.string().optional(),
  maxLength: z.number().int().positive().default(2000),
});

export const templateFieldSchema = z.discriminatedUnion("type", [
  textField,
  textareaField,
  numberField,
  currencyField,
  dateAdField,
  dateBsField,
  selectField,
  multiSelectField,
  checkboxField,
  partyBlockField,
  clauseToggleField,
  freeTextClauseField,
]);
export type TemplateField = z.infer<typeof templateFieldSchema>;

export const templateFieldSchemaArray = z.array(templateFieldSchema).superRefine((fields, ctx) => {
  const seen = new Set<string>();
  for (const [i, f] of fields.entries()) {
    if (seen.has(f.key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate field key "${f.key}"`,
        path: [i, "key"],
      });
    }
    seen.add(f.key);
  }
});
export type TemplateFieldSchema = z.infer<typeof templateFieldSchemaArray>;

// ─────────────────────────────────────────────────────────────────────────
// Clause library conditional rule (mirrors ClauseLibraryItem.conditionalOn)
// ─────────────────────────────────────────────────────────────────────────

export const clauseConditionalOnSchema = conditionRule;
export type ClauseConditionalOn = z.infer<typeof clauseConditionalOnSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Party block value shape (what a PARTY_BLOCK field produces in formData)
// ─────────────────────────────────────────────────────────────────────────

export const partyValueSchema = z.object({
  fullName: z.string().min(1),
  address: z.string().min(1),
  citizenshipNumber: z.string().optional(),
  panNumber: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  representativeName: z.string().optional(), // when the party is a company
});
export type PartyValue = z.infer<typeof partyValueSchema>;

// ─────────────────────────────────────────────────────────────────────────
// AI generation flags returned alongside a draft
// ─────────────────────────────────────────────────────────────────────────

export const aiFlagSchema = z.object({
  type: z.enum(["missing_field", "ambiguous_input", "risk_clause_missing"]),
  fieldKey: z.string().optional(),
  clauseKey: z.string().optional(),
  message: z.object({ en: z.string(), np: z.string() }),
});
export type AiFlag = z.infer<typeof aiFlagSchema>;
export const aiFlagsSchema = z.array(aiFlagSchema);
