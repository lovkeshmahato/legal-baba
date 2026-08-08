"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { DocumentLanguage } from "@prisma/client";
import { useWizardStore } from "@/components/wizard/wizard-context";
import { DynamicField } from "@/components/wizard/dynamic-field";
import { Button } from "@/components/ui/button";
import {
  groupFieldsByStep,
  resolveVisibleFields,
  validateFormData,
} from "@/lib/template-engine";
import type { TemplateFieldSchema } from "@/types/template-engine";

interface WizardFormProps {
  fields: TemplateFieldSchema;
  locale: string;
  onComplete: (formData: Record<string, unknown>, language: DocumentLanguage) => Promise<void>;
}

const LANGUAGE_OPTIONS: { value: DocumentLanguage; labelKey: "en" | "np" | "bilingual" }[] = [
  { value: "EN", labelKey: "en" },
  { value: "NP", labelKey: "np" },
  { value: "BILINGUAL", labelKey: "bilingual" },
];

export function WizardForm({ fields, locale, onComplete }: WizardFormProps) {
  const t = useTranslations("wizard");
  const step = useWizardStore((s) => s.step);
  const setStep = useWizardStore((s) => s.setStep);
  const formData = useWizardStore((s) => s.formData);
  const setField = useWizardStore((s) => s.setField);
  const language = useWizardStore((s) => s.language);
  const setLanguage = useWizardStore((s) => s.setLanguage);
  const errors = useWizardStore((s) => s.errors);
  const setErrors = useWizardStore((s) => s.setErrors);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const visibleFields = useMemo(() => resolveVisibleFields(fields, formData), [fields, formData]);
  const stepGroups = useMemo(() => groupFieldsByStep(visibleFields), [visibleFields]);
  const templateStepNumbers = useMemo(
    () => Array.from(stepGroups.keys()).sort((a, b) => a - b),
    [stepGroups]
  );

  const totalSteps = templateStepNumbers.length + 1; // +1 for the language step
  const isLanguageStep = step === 0;
  const currentTemplateStep = isLanguageStep ? undefined : templateStepNumbers[step - 1];
  const currentFields =
    currentTemplateStep !== undefined ? stepGroups.get(currentTemplateStep) ?? [] : [];

  async function goNext() {
    if (!isLanguageStep) {
      const stepErrors = validateFormData(currentFields, formData);
      if (stepErrors.length > 0) {
        setErrors(Object.fromEntries(stepErrors.map((e) => [e.fieldKey, e.message])));
        return;
      }
    }
    setErrors({});

    if (step === totalSteps - 1) {
      setSubmitting(true);
      setSubmitError(null);
      try {
        await onComplete(formData, language);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setStep(step + 1);
  }

  function goBack() {
    setStep(Math.max(0, step - 1));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("step", { current: step + 1, total: totalSteps })}</span>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {isLanguageStep ? (
        <div className="flex flex-col gap-3">
          <p className="font-medium">{t("language.label")}</p>
          <div className="flex flex-wrap gap-3">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                className={`rounded-md border px-4 py-3 text-sm transition-colors ${
                  language === option.value
                    ? "border-primary bg-secondary font-medium"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                {t(`language.${option.labelKey}`)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {currentFields.map((field) => (
            <DynamicField
              key={field.key}
              field={field}
              value={formData[field.key]}
              onChange={(value) => setField(field.key, value)}
              locale={locale}
              error={errors[field.key]}
            />
          ))}
        </div>
      )}

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={goBack} disabled={step === 0 || submitting}>
          {t("back")}
        </Button>
        <Button onClick={goNext} disabled={submitting}>
          {step === totalSteps - 1 ? t("generate") : t("next")}
        </Button>
      </div>
    </div>
  );
}
