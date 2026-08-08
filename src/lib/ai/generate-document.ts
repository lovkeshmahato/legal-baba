import "server-only";
import type { ClauseLibraryItem, DocumentLanguage, DocumentTemplate } from "@prisma/client";
import { anthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import { flagMissingRiskClauses, resolveActiveClauses } from "@/lib/template-engine";
import { buildDocFromSections } from "@/lib/tiptap/build-doc";
import { buildUserPrompt } from "@/lib/ai/build-prompt";
import type { AiFlag } from "@/types/template-engine";

const RETURN_DOCUMENT_TOOL = {
  name: "return_document",
  description:
    "Returns the drafted legal document as an ordered list of sections, plus any clarifying flags for missing or ambiguous input.",
  input_schema: {
    type: "object" as const,
    properties: {
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            clauseKey: {
              type: "string",
              description: "The [key] of the clause backbone this section drafts, if any.",
            },
            heading: { type: "string" },
            body: {
              type: "string",
              description:
                "Full clause text in formal legal register, as one or more paragraphs separated by a blank line.",
            },
          },
          required: ["heading", "body"],
        },
      },
      flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["missing_field", "ambiguous_input"] },
            fieldKey: { type: "string" },
            messageEn: { type: "string" },
            messageNp: { type: "string" },
          },
          required: ["type", "messageEn", "messageNp"],
        },
      },
    },
    required: ["sections", "flags"],
  },
};

interface GenerateDocumentParams {
  template: DocumentTemplate;
  clauses: ClauseLibraryItem[];
  formData: Record<string, unknown>;
  language: DocumentLanguage;
}

interface GenerateDocumentResult {
  content: Record<string, unknown>;
  aiFlags: AiFlag[];
}

interface ReturnDocumentInput {
  sections: { clauseKey?: string; heading: string; body: string }[];
  flags: { type: string; fieldKey?: string; messageEn: string; messageNp: string }[];
}

export async function generateDocument({
  template,
  clauses,
  formData,
  language,
}: GenerateDocumentParams): Promise<GenerateDocumentResult> {
  const activeClauses = resolveActiveClauses(clauses, formData);
  const riskFlags = flagMissingRiskClauses(clauses, activeClauses);

  const systemPrompt = language === "NP" ? template.systemPromptNp : template.systemPromptEn;
  const userPrompt = buildUserPrompt({ template, activeClauses, formData, language });

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: [RETURN_DOCUMENT_TOOL],
    tool_choice: { type: "tool", name: "return_document" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("AI generation failed: no structured response returned.");
  }

  const parsed = toolUse.input as ReturnDocumentInput;
  const content = buildDocFromSections(parsed.sections);

  const aiFlags: AiFlag[] = [
    ...riskFlags,
    ...parsed.flags.map((flag) => ({
      type: (flag.type === "ambiguous_input" ? "ambiguous_input" : "missing_field") as AiFlag["type"],
      fieldKey: flag.fieldKey,
      message: { en: flag.messageEn, np: flag.messageNp },
    })),
  ];

  return { content, aiFlags };
}
