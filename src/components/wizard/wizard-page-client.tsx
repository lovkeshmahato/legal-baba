"use client";

import type { DocumentLanguage } from "@prisma/client";
import { useRouter } from "@/i18n/navigation";
import { WizardForm } from "@/components/wizard/wizard-form";
import type { TemplateFieldSchema } from "@/types/template-engine";

interface WizardPageClientProps {
  fields: TemplateFieldSchema;
  locale: string;
  templateSlug: string;
}

export function WizardPageClient({ fields, locale, templateSlug }: WizardPageClientProps) {
  const router = useRouter();

  async function onComplete(formData: Record<string, unknown>, language: DocumentLanguage) {
    const draftRes = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateSlug, language, formData }),
    });
    if (!draftRes.ok) {
      const body = await draftRes.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not save your answers.");
    }
    const draft = await draftRes.json();

    const generateRes = await fetch(`/api/documents/${draft.id}/generate`, {
      method: "POST",
    });
    if (!generateRes.ok) {
      const body = await generateRes.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not generate the document.");
    }

    router.push(`/documents/review/${draft.id}`);
  }

  return <WizardForm fields={fields} locale={locale} onComplete={onComplete} />;
}
