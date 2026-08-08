import { createStore } from "zustand/vanilla";
import type { DocumentLanguage } from "@prisma/client";

export interface WizardState {
  step: number;
  language: DocumentLanguage;
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  setField: (key: string, value: unknown) => void;
  setLanguage: (language: DocumentLanguage) => void;
  setStep: (step: number) => void;
  setErrors: (errors: Record<string, string>) => void;
}

export type WizardStoreApi = ReturnType<typeof createWizardStore>;

export function createWizardStore(initialFormData: Record<string, unknown> = {}) {
  return createStore<WizardState>((set) => ({
    step: 0,
    language: "EN",
    formData: initialFormData,
    errors: {},
    setField: (key, value) =>
      set((state) => ({
        formData: { ...state.formData, [key]: value },
        errors: Object.fromEntries(
          Object.entries(state.errors).filter(([k]) => k !== key)
        ),
      })),
    setLanguage: (language) => set({ language }),
    setStep: (step) => set({ step }),
    setErrors: (errors) => set({ errors }),
  }));
}
