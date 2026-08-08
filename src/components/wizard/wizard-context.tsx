"use client";

import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { createWizardStore, type WizardState, type WizardStoreApi } from "@/stores/wizard-store";

const WizardStoreContext = createContext<WizardStoreApi | null>(null);

export function WizardStoreProvider({
  children,
  initialFormData,
}: {
  children: React.ReactNode;
  initialFormData?: Record<string, unknown>;
}) {
  const storeRef = useRef<WizardStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createWizardStore(initialFormData ?? {});
  }
  return (
    <WizardStoreContext.Provider value={storeRef.current}>
      {children}
    </WizardStoreContext.Provider>
  );
}

export function useWizardStore<T>(selector: (state: WizardState) => T): T {
  const store = useContext(WizardStoreContext);
  if (!store) {
    throw new Error("useWizardStore must be used within a WizardStoreProvider");
  }
  return useStore(store, selector);
}
