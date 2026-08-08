import {
  templateFieldSchemaArray,
  partyValueSchema,
  type TemplateField,
  type TemplateFieldSchema,
} from "@/types/template-engine";
import { evaluateCondition } from "./conditions";

/** Parses and validates a DocumentTemplate.fieldSchema JSON value. Throws on malformed schemas. */
export function parseTemplateFieldSchema(raw: unknown): TemplateFieldSchema {
  return templateFieldSchemaArray.parse(raw);
}

export interface FieldValidationError {
  fieldKey: string;
  message: string;
}

/**
 * Validates user-submitted formData against a template's field schema,
 * honoring `required` and `visibleWhen` (a hidden field is never required).
 */
export function validateFormData(
  fields: TemplateFieldSchema,
  formData: Record<string, unknown>
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  for (const field of fields) {
    if (!evaluateCondition(field.visibleWhen, formData)) continue;

    const value = formData[field.key];
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);

    if (field.required && isEmpty) {
      errors.push({ fieldKey: field.key, message: "This field is required." });
      continue;
    }

    if (isEmpty) continue;

    errors.push(...validateFieldValue(field, value));
  }

  return errors;
}

function validateFieldValue(
  field: TemplateField,
  value: unknown
): FieldValidationError[] {
  switch (field.type) {
    case "TEXT":
    case "TEXTAREA":
    case "FREE_TEXT_CLAUSE": {
      const maxLength = "maxLength" in field ? field.maxLength : undefined;
      if (typeof value === "string" && maxLength && value.length > maxLength) {
        return [
          {
            fieldKey: field.key,
            message: `Must be ${maxLength} characters or fewer.`,
          },
        ];
      }
      return [];
    }
    case "NUMBER":
    case "CURRENCY": {
      const num = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(num)) {
        return [{ fieldKey: field.key, message: "Must be a number." }];
      }
      if ("min" in field && field.min !== undefined && num < field.min) {
        return [{ fieldKey: field.key, message: `Must be at least ${field.min}.` }];
      }
      if ("max" in field && field.max !== undefined && num > field.max) {
        return [{ fieldKey: field.key, message: `Must be at most ${field.max}.` }];
      }
      return [];
    }
    case "PARTY_BLOCK": {
      const result = partyValueSchema.safeParse(value);
      if (!result.success) {
        return [{ fieldKey: field.key, message: "Party details are incomplete." }];
      }
      return [];
    }
    case "SELECT": {
      const valid = field.options.some((o) => o.value === value);
      return valid ? [] : [{ fieldKey: field.key, message: "Invalid selection." }];
    }
    case "MULTI_SELECT": {
      const values = Array.isArray(value) ? value : [];
      const allValid = values.every((v) =>
        field.options.some((o) => o.value === v)
      );
      return allValid ? [] : [{ fieldKey: field.key, message: "Invalid selection." }];
    }
    default:
      return [];
  }
}

/** Returns only the fields currently visible given the answers collected so far. */
export function resolveVisibleFields(
  fields: TemplateFieldSchema,
  formData: Record<string, unknown>
): TemplateFieldSchema {
  return fields.filter((f) => evaluateCondition(f.visibleWhen, formData));
}

/** Groups visible fields by wizard step, in sortOrder. */
export function groupFieldsByStep(
  fields: TemplateFieldSchema
): Map<number, TemplateFieldSchema> {
  const steps = new Map<number, TemplateField[]>();
  for (const field of [...fields].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const bucket = steps.get(field.step) ?? [];
    bucket.push(field);
    steps.set(field.step, bucket);
  }
  return steps;
}
