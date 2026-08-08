"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PartyValue, TemplateField } from "@/types/template-engine";

interface PartyBlockInputProps {
  field: Extract<TemplateField, { type: "PARTY_BLOCK" }>;
  value: Partial<PartyValue> | undefined;
  onChange: (value: Partial<PartyValue>) => void;
  locale: string;
}

export function PartyBlockInput({ field, value, onChange, locale }: PartyBlockInputProps) {
  const v = value ?? {};

  function set<K extends keyof PartyValue>(key: K, val: PartyValue[K]) {
    onChange({ ...v, [key]: val });
  }

  const t = (en: string, np: string) => (locale === "np" ? np : en);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
      <div className="col-span-full flex flex-col gap-1.5">
        <Label>{t("Full name", "पूरा नाम")}</Label>
        <Input value={v.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
      </div>
      <div className="col-span-full flex flex-col gap-1.5">
        <Label>{t("Address", "ठेगाना")}</Label>
        <Input value={v.address ?? ""} onChange={(e) => set("address", e.target.value)} />
      </div>
      {field.includeCitizenshipNumber && (
        <div className="flex flex-col gap-1.5">
          <Label>{t("Citizenship number", "नागरिकता नम्बर")}</Label>
          <Input
            value={v.citizenshipNumber ?? ""}
            onChange={(e) => set("citizenshipNumber", e.target.value)}
          />
        </div>
      )}
      {field.includePanNumber && (
        <div className="flex flex-col gap-1.5">
          <Label>{t("PAN number", "प्यान नम्बर")}</Label>
          <Input value={v.panNumber ?? ""} onChange={(e) => set("panNumber", e.target.value)} />
        </div>
      )}
      {field.includeCompanyRegistration && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>{t("Company registration no.", "कम्पनी दर्ता नम्बर")}</Label>
            <Input
              value={v.companyRegistrationNumber ?? ""}
              onChange={(e) => set("companyRegistrationNumber", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("Authorized representative", "अधिकृत प्रतिनिधि")}</Label>
            <Input
              value={v.representativeName ?? ""}
              onChange={(e) => set("representativeName", e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}
