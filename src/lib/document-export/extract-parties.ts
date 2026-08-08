import type { PartyValue, TemplateFieldSchema } from "@/types/template-engine";

export interface PartyInfo {
  key: string;
  labelEn: string;
  labelNp: string;
  value: Partial<PartyValue>;
}

/** Pulls every PARTY_BLOCK field's answered value out of formData, in field order. */
export function extractParties(
  fields: TemplateFieldSchema,
  formData: Record<string, unknown>
): PartyInfo[] {
  const parties: PartyInfo[] = [];
  for (const field of fields) {
    if (field.type !== "PARTY_BLOCK") continue;
    const value = formData[field.key];
    if (!value || typeof value !== "object") continue;
    parties.push({
      key: field.key,
      labelEn: field.label.en,
      labelNp: field.label.np,
      value: value as Partial<PartyValue>,
    });
  }
  return parties;
}
