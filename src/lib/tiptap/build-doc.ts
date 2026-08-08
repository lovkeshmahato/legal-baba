import { DRAFT_DISCLAIMER } from "@/lib/anthropic";

interface DocSection {
  heading: string;
  body: string;
}

/** Builds a Tiptap JSON document from AI-drafted sections, with the mandatory draft disclaimer appended. */
export function buildDocFromSections(sections: DocSection[]): Record<string, unknown> {
  const content: Record<string, unknown>[] = [];

  for (const section of sections) {
    if (section.heading) {
      content.push({
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: section.heading }],
      });
    }
    for (const paragraph of section.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: paragraph }],
      });
    }
  }

  content.push({
    type: "paragraph",
    content: [
      {
        type: "text",
        text: `${DRAFT_DISCLAIMER.en} / ${DRAFT_DISCLAIMER.np}`,
        marks: [{ type: "italic" }],
      },
    ],
  });

  return { type: "doc", content };
}
