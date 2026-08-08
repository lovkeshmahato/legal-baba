"use client";

import { useMemo } from "react";
import NepaliDate from "nepali-date-converter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS_EN = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];
const MONTHS_NP = [
  "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
  "कार्तिक", "मंसिर", "पुष", "माघ", "फाल्गुण", "चैत",
];

const CURRENT_BS_YEAR = new NepaliDate().getYear();
const YEAR_RANGE = Array.from({ length: 20 }, (_, i) => CURRENT_BS_YEAR - 10 + i);

interface DateBsInputProps {
  /** Stored as "YYYY-MM-DD" in Bikram Sambat. */
  value: string | undefined;
  onChange: (value: string) => void;
  locale: string;
}

export function DateBsInput({ value, onChange, locale }: DateBsInputProps) {
  const parsed = useMemo(() => {
    if (!value) return null;
    const [year, month, date] = value.split("-").map(Number);
    if (!year || !month || !date) return null;
    return { year, month, date };
  }, [value]);

  const months = locale === "np" ? MONTHS_NP : MONTHS_EN;

  function update(part: Partial<{ year: number; month: number; date: number }>) {
    const next = {
      year: parsed?.year ?? CURRENT_BS_YEAR,
      month: parsed?.month ?? 1,
      date: parsed?.date ?? 1,
      ...part,
    };
    onChange(`${next.year}-${String(next.month).padStart(2, "0")}-${String(next.date).padStart(2, "0")}`);
  }

  const adEquivalent = useMemo(() => {
    if (!parsed) return null;
    try {
      const nd = new NepaliDate(parsed.year, parsed.month - 1, parsed.date);
      return nd.toJsDate().toLocaleDateString(locale === "np" ? "ne-NP" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }, [parsed, locale]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <Select value={String(parsed?.year ?? "")} onValueChange={(v) => update({ year: Number(v) })}>
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEAR_RANGE.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={parsed ? String(parsed.month) : ""}
          onValueChange={(v) => update({ month: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={parsed ? String(parsed.date) : ""} onValueChange={(v) => update({ date: Number(v) })}>
          <SelectTrigger>
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {adEquivalent && (
        <p className="text-xs text-muted-foreground">
          {locale === "np" ? "इ.सं." : "A.D."}: {adEquivalent}
        </p>
      )}
    </div>
  );
}
