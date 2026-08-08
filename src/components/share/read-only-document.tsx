import type { DocBlock, TextRun } from "@/lib/document-export/types";

function Runs({ runs }: { runs: TextRun[] }) {
  return (
    <>
      {runs.map((run, i) => {
        let node: React.ReactNode = run.text;
        if (run.bold) node = <strong key={i}>{node}</strong>;
        if (run.italic) node = <em key={i}>{node}</em>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

/** Groups a flat DocBlock[] into renderable elements, wrapping consecutive list-items in a <ul>. */
export function ReadOnlyDocument({ blocks }: { blocks: DocBlock[] }) {
  const elements: React.ReactNode[] = [];
  let pendingList: DocBlock[] = [];

  function flushList() {
    if (pendingList.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`}>
        {pendingList.map((item, i) => (
          <li key={i}>
            <Runs runs={item.runs} />
          </li>
        ))}
      </ul>
    );
    pendingList = [];
  }

  for (const block of blocks) {
    if (block.type === "list-item") {
      pendingList.push(block);
      continue;
    }
    flushList();
    if (block.type === "heading") {
      elements.push(
        <h3 key={elements.length}>
          <Runs runs={block.runs} />
        </h3>
      );
    } else {
      elements.push(
        <p key={elements.length}>
          <Runs runs={block.runs} />
        </p>
      );
    }
  }
  flushList();

  return <div className="prose prose-sm max-w-none dark:prose-invert">{elements}</div>;
}
