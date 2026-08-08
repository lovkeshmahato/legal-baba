import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const DEVANAGARI_FONT = "NotoSansDevanagari";
export const LATIN_FONT = "Helvetica";

let registered = false;

/** Registers the bundled Devanagari font once per process (react-pdf's Font registry is global). */
export function registerExportFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: DEVANAGARI_FONT,
    fonts: [
      {
        src: path.join(process.cwd(), "src/assets/fonts/NotoSansDevanagari-Regular.woff"),
        fontWeight: "normal",
      },
      {
        src: path.join(process.cwd(), "src/assets/fonts/NotoSansDevanagari-Bold.woff"),
        fontWeight: "bold",
      },
    ],
  });
}

const DEVANAGARI_RANGE = /[ऀ-ॿ]/;

/** Picks the Devanagari font for Nepali text, Helvetica otherwise — react-pdf's default font lacks Devanagari glyphs. */
export function pickFont(text: string): string {
  return DEVANAGARI_RANGE.test(text) ? DEVANAGARI_FONT : LATIN_FONT;
}
