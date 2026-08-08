/** Picks the bilingual DB field (titleEn/titleNp style columns) matching the active UI locale. */
export function pickLocalized(en: string, np: string, locale: string): string {
  return locale === "np" ? np : en;
}
