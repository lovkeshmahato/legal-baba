import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Claude client. Never import this file from a Client Component —
 * the `server-only` guard above throws a build error if that happens, so the
 * API key can never leak to the browser bundle.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export const DRAFT_DISCLAIMER = {
  en: "AI-generated draft — not a substitute for legal advice. Have this reviewed by a licensed advocate before signing or notarizing.",
  np: "AI-निर्मित ड्राफ्ट — यो कानूनी सल्लाहको विकल्प होइन। हस्ताक्षर वा नोटरी गर्नुअघि लाइसेन्स प्राप्त अधिवक्ताबाट समीक्षा गराउनुहोस्।",
};
