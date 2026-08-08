import "server-only";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { DocumentLanguage } from "@prisma/client";
import { DEVANAGARI_FONT, LATIN_FONT, pickFont } from "./fonts";
import type { DocBlock } from "./types";
import type { PartyInfo } from "./extract-parties";

const styles = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 48, fontSize: 11, lineHeight: 1.5 },
  watermark: {
    position: "absolute",
    top: 360,
    left: 60,
    fontSize: 64,
    color: "#dddddd",
    opacity: 0.5,
    transform: "rotate(-35deg)",
  },
  title: { fontSize: 16, textAlign: "center", marginBottom: 4 },
  banner: {
    fontSize: 9,
    textAlign: "center",
    color: "#92400e",
    backgroundColor: "#fef3c7",
    padding: 4,
    marginBottom: 12,
  },
  partiesBox: { border: "1pt solid #d0d0d0", padding: 10, marginBottom: 16 },
  partyRow: { marginBottom: 6 },
  partyLabel: { fontSize: 9, color: "#555555" },
  heading: { fontSize: 12.5, marginTop: 14, marginBottom: 6 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  listItem: { marginBottom: 4, marginLeft: 12 },
  signatureSection: { marginTop: 28, flexDirection: "row", justifyContent: "space-between" },
  signatureBlock: { width: "45%" },
  signatureLine: { borderTop: "1pt solid #333333", marginTop: 36, marginBottom: 4 },
  witnessSection: { marginTop: 28 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7.5,
    color: "#777777",
    textAlign: "center",
    borderTop: "0.5pt solid #dddddd",
    paddingTop: 4,
  },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    right: 48,
    fontSize: 8,
    color: "#777777",
  },
});

// Kept as two separate strings (rather than one bilingual line) so each can be
// rendered with its own font — the bundled Devanagari font isn't used for the
// Latin line, and Helvetica has no Devanagari glyphs for the Nepali line.
const DISCLAIMER_FOOTER_EN =
  "AI-generated draft — not a substitute for legal advice. Have this reviewed by a licensed advocate before signing or notarizing.";
const DISCLAIMER_FOOTER_NP =
  "AI-निर्मित ड्राफ्ट — यो कानूनी सल्लाहको विकल्प होइन। हस्ताक्षर वा नोटरी गर्नुअघि लाइसेन्स प्राप्त अधिवक्ताबाट समीक्षा गराउनुहोस्।";

/**
 * Renders "English / नेपाली" with each half in its own font — a single
 * Devanagari-subset font has no Latin glyphs and vice versa, so mixing
 * scripts in one <Text> silently drops the unsupported half's glyphs.
 */
function Bilingual({ en, np, style }: { en: string; np: string; style?: Style }) {
  return (
    <Text style={style}>
      <Text style={{ fontFamily: LATIN_FONT }}>{en} / </Text>
      <Text style={{ fontFamily: DEVANAGARI_FONT }}>{np}</Text>
    </Text>
  );
}

function PartyDetails({ party }: { party: PartyInfo }) {
  const v = party.value;
  return (
    <View style={styles.partyRow}>
      <Bilingual en={party.labelEn} np={party.labelNp} style={styles.partyLabel} />
      <Text style={{ fontFamily: pickFont(v.fullName ?? "") }}>{v.fullName ?? "—"}</Text>
      {v.address && <Text style={{ fontFamily: pickFont(v.address), fontSize: 9.5 }}>{v.address}</Text>}
      <Text style={{ fontSize: 9, color: "#555555" }}>
        {[
          v.citizenshipNumber && `Citizenship No.: ${v.citizenshipNumber}`,
          v.panNumber && `PAN: ${v.panNumber}`,
          v.companyRegistrationNumber && `Reg. No.: ${v.companyRegistrationNumber}`,
        ]
          .filter(Boolean)
          .join("   ")}
      </Text>
    </View>
  );
}

function Block({ block }: { block: DocBlock }) {
  const font = pickFont(block.runs.map((r) => r.text).join(""));
  const style =
    block.type === "heading" ? styles.heading : block.type === "list-item" ? styles.listItem : styles.paragraph;

  return (
    <Text style={{ fontFamily: font, ...style }}>
      {block.type === "list-item" ? (block.ordered ? "• " : "– ") : ""}
      {block.runs.map((run, i) => {
        const runFont = pickFont(run.text);
        // The bundled Devanagari font only has normal/bold weights — no italic
        // glyphs are registered, so an italic mark on Nepali text falls back
        // to upright rather than crashing react-pdf's font resolver.
        const italic = run.italic && runFont !== DEVANAGARI_FONT;
        return (
          <Text
            key={i}
            style={{
              fontFamily: runFont,
              fontWeight: run.bold ? "bold" : "normal",
              fontStyle: italic ? "italic" : "normal",
            }}
          >
            {run.text}
          </Text>
        );
      })}
    </Text>
  );
}

interface DocumentPdfProps {
  title: string;
  language: DocumentLanguage;
  blocks: DocBlock[];
  parties: PartyInfo[];
  watermarked: boolean;
  isGovernmentFormat: boolean;
  draftOnlyLabel: string;
}

export function DocumentPdf({
  title,
  blocks,
  parties,
  watermarked,
  isGovernmentFormat,
  draftOnlyLabel,
}: DocumentPdfProps) {
  const titleFont = pickFont(title);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermarked && (
          <Text style={styles.watermark} fixed>
            DRAFT
          </Text>
        )}

        <Text style={{ fontFamily: titleFont, ...styles.title }}>{title}</Text>

        {isGovernmentFormat && <Text style={styles.banner}>{draftOnlyLabel}</Text>}

        {parties.length > 0 && (
          <View style={styles.partiesBox}>
            {parties.map((party) => (
              <PartyDetails key={party.key} party={party} />
            ))}
          </View>
        )}

        {blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}

        {parties.length > 0 && (
          <View style={styles.signatureSection}>
            {parties.slice(0, 2).map((party) => (
              <View key={party.key} style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Bilingual en={party.labelEn} np={party.labelNp} style={{ fontSize: 9.5 }} />
                <Text style={{ fontFamily: pickFont(party.value.fullName ?? ""), fontSize: 9, color: "#555555" }}>
                  {party.value.fullName ?? ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.witnessSection}>
          <Bilingual en="Witnesses" np="साक्षीहरू" style={{ fontSize: 9.5, marginBottom: 4 }} />
          {[1, 2].map((n) => (
            <View key={n} style={{ flexDirection: "row", marginTop: 20 }}>
              <Text style={{ fontSize: 9, width: 60 }}>{n}.</Text>
              <View style={{ flex: 1, borderTop: "1pt solid #333333" }} />
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          <Text style={{ fontFamily: LATIN_FONT }}>{DISCLAIMER_FOOTER_EN}</Text>
          {" / "}
          <Text style={{ fontFamily: DEVANAGARI_FONT }}>{DISCLAIMER_FOOTER_NP}</Text>
        </Text>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
