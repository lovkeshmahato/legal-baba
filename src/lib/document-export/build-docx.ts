import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { DocBlock } from "./types";
import type { PartyInfo } from "./extract-parties";

const DISCLAIMER_FOOTER =
  "AI-generated draft — not a substitute for legal advice. Have this reviewed by a licensed advocate before " +
  "signing or notarizing. / AI-निर्मित ड्राफ्ट — यो कानूनी सल्लाहको विकल्प होइन। हस्ताक्षर वा नोटरी गर्नुअघि " +
  "लाइसेन्स प्राप्त अधिवक्ताबाट समीक्षा गराउनुहोस्।";

function blockToParagraph(block: DocBlock): Paragraph {
  const runs = block.runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold,
        italics: run.italic,
      })
  );

  if (block.type === "heading") {
    return new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 },
      children: runs,
    });
  }
  if (block.type === "list-item") {
    return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 80 },
      children: runs,
    });
  }
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160 },
    children: runs,
  });
}

function partyParagraphs(party: PartyInfo): Paragraph[] {
  const v = party.value;
  const detail = [
    v.citizenshipNumber && `Citizenship No.: ${v.citizenshipNumber}`,
    v.panNumber && `PAN: ${v.panNumber}`,
    v.companyRegistrationNumber && `Reg. No.: ${v.companyRegistrationNumber}`,
  ]
    .filter(Boolean)
    .join("   ");

  return [
    new Paragraph({
      children: [new TextRun({ text: `${party.labelEn} / ${party.labelNp}`, size: 18, color: "555555" })],
    }),
    new Paragraph({ children: [new TextRun({ text: v.fullName ?? "—", bold: true })] }),
    ...(v.address ? [new Paragraph({ children: [new TextRun({ text: v.address, size: 20 })] })] : []),
    ...(detail ? [new Paragraph({ children: [new TextRun({ text: detail, size: 18, color: "555555" })] })] : []),
    new Paragraph({ text: "" }),
  ];
}

interface BuildDocxParams {
  title: string;
  blocks: DocBlock[];
  parties: PartyInfo[];
  isGovernmentFormat: boolean;
  draftOnlyLabel: string;
}

export async function buildDocx({
  title,
  blocks,
  parties,
  isGovernmentFormat,
  draftOnlyLabel,
}: BuildDocxParams): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title })],
    }),
  ];

  if (isGovernmentFormat) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: draftOnlyLabel, italics: true, color: "92400e" })],
      })
    );
  }

  for (const party of parties) {
    children.push(...partyParagraphs(party));
  }

  for (const block of blocks) {
    children.push(blockToParagraph(block));
  }

  if (parties.length > 0) {
    children.push(new Paragraph({ text: "", spacing: { before: 400 } }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: parties.slice(0, 2).map(
              (party) =>
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ text: "" }),
                    new Paragraph({
                      border: { top: { style: BorderStyle.SINGLE, size: 6, color: "333333" } },
                      children: [new TextRun({ text: `${party.labelEn} / ${party.labelNp}`, size: 18 })],
                    }),
                    new Paragraph({ children: [new TextRun({ text: party.value.fullName ?? "", size: 18 })] }),
                  ],
                })
            ),
          }),
        ],
      })
    );
  }

  children.push(new Paragraph({ text: "", spacing: { before: 400 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: "Witnesses / साक्षीहरू" })] }));
  for (const n of [1, 2]) {
    children.push(
      new Paragraph({
        spacing: { before: 300 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "333333" } },
        children: [new TextRun({ text: `${n}.` })],
      })
    );
  }

  const document = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: DISCLAIMER_FOOTER, size: 14, color: "777777" })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
