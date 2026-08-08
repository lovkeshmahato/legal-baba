import type { ClauseLibraryItem, DocumentLanguage, DocumentTemplate } from "@prisma/client";
import type { PartyValue } from "@/types/template-engine";

function isPartyValue(value: unknown): value is Partial<PartyValue> {
  return typeof value === "object" && value !== null && "fullName" in value;
}

function formatValue(value: unknown): string {
  if (isPartyValue(value)) {
    return [
      value.fullName && `Name: ${value.fullName}`,
      value.address && `Address: ${value.address}`,
      value.citizenshipNumber && `Citizenship No.: ${value.citizenshipNumber}`,
      value.panNumber && `PAN No.: ${value.panNumber}`,
      value.companyRegistrationNumber && `Company Registration No.: ${value.companyRegistrationNumber}`,
      value.representativeName && `Authorized Representative: ${value.representativeName}`,
    ]
      .filter(Boolean)
      .join("; ");
  }
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value ?? "");
}

const LANGUAGE_INSTRUCTIONS: Record<DocumentLanguage, string> = {
  EN: "Write the entire document in formal English.",
  NP: "Write the entire document in formal, legally-registered Nepali (नेपाली). Do not produce casual translation.",
  BILINGUAL: "Write each section in English immediately followed by its formal Nepali translation, clearly separated.",
};

export function buildUserPrompt({
  template,
  activeClauses,
  formData,
  language,
}: {
  template: DocumentTemplate;
  activeClauses: ClauseLibraryItem[];
  formData: Record<string, unknown>;
  language: DocumentLanguage;
}): string {
  const answers = Object.entries(formData)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `- ${key}: ${formatValue(value)}`)
    .join("\n");

  const clauseBackbone = activeClauses
    .map(
      (clause) =>
        `[${clause.key}] ${clause.titleEn} / ${clause.titleNp}\n  EN template: ${clause.bodyEn}\n  NP template: ${clause.bodyNp}`
    )
    .join("\n\n");

  const customClauseText =
    typeof formData.customClause === "string" && formData.customClause.trim().length > 0
      ? `\n\nThe user also described this additional clause in plain language — draft it in formal legal language and include it as its own section: "${formData.customClause}"`
      : "";

  return `Document type: ${template.titleEn} (${template.titleNp})

${LANGUAGE_INSTRUCTIONS[language]}

Answered fields (use these values exactly; never invent facts not listed here):
${answers || "(none provided)"}

Clause backbone to draft from, in this order (each [key] template below is a starting structure — expand it into full, formally-worded legal prose using the answered field values; do not leave {{placeholder}} syntax in the output):
${clauseBackbone}${customClauseText}

Return your response using the return_document tool. One section per clause (set clauseKey to the matching [key] where applicable; omit clauseKey for the custom clause). List any fields you found missing or ambiguous in the flags array — do not guess on their behalf.`;
}
