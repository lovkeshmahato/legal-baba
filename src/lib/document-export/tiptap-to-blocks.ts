import type { DocBlock, TextRun } from "./types";

interface TiptapMark {
  type: string;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

function extractRuns(node: TiptapNode): TextRun[] {
  if (!node.content) return [];
  const runs: TextRun[] = [];
  for (const child of node.content) {
    if (child.type === "text" && child.text) {
      runs.push({
        text: child.text,
        bold: child.marks?.some((m) => m.type === "bold") ?? false,
        italic: child.marks?.some((m) => m.type === "italic") ?? false,
      });
    } else if (child.type === "hardBreak") {
      runs.push({ text: "\n" });
    }
  }
  return runs;
}

/** Flattens Tiptap JSON (doc/heading/paragraph/bulletList/orderedList) into export-ready blocks. */
export function tiptapToBlocks(doc: unknown): DocBlock[] {
  const root = doc as TiptapNode;
  if (!root?.content) return [];

  const blocks: DocBlock[] = [];

  function visit(node: TiptapNode, listOrdered?: boolean) {
    switch (node.type) {
      case "heading":
        blocks.push({
          type: "heading",
          level: Number(node.attrs?.level ?? 3),
          runs: extractRuns(node),
        });
        break;
      case "paragraph":
        blocks.push({ type: "paragraph", runs: extractRuns(node) });
        break;
      case "bulletList":
      case "orderedList":
        for (const item of node.content ?? []) {
          visit(item, node.type === "orderedList");
        }
        break;
      case "listItem":
        for (const child of node.content ?? []) {
          if (child.type === "paragraph") {
            blocks.push({
              type: "list-item",
              ordered: Boolean(listOrdered),
              runs: extractRuns(child),
            });
          } else {
            visit(child, listOrdered);
          }
        }
        break;
      case "blockquote":
        for (const child of node.content ?? []) visit(child, listOrdered);
        break;
      default:
        break;
    }
  }

  for (const node of root.content) visit(node);
  return blocks;
}
