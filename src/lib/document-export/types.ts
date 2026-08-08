export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type DocBlock =
  | { type: "heading"; level: number; runs: TextRun[] }
  | { type: "paragraph"; runs: TextRun[] }
  | { type: "list-item"; ordered: boolean; runs: TextRun[] };

const DEVANAGARI_RANGE = /[ऀ-ॿ]/;

/** True if a block's text is (predominantly) Devanagari script, for per-block font selection. */
export function isDevanagariBlock(block: DocBlock): boolean {
  const text = block.runs.map((r) => r.text).join("");
  return DEVANAGARI_RANGE.test(text);
}
