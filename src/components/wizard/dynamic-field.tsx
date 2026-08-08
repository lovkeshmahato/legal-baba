"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartyBlockInput } from "@/components/wizard/party-block-input";
import { DateBsInput } from "@/components/wizard/date-bs-input";
import type { TemplateField } from "@/types/template-engine";

interface DynamicFieldProps {
  field: TemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
  locale: string;
  error?: string;
}

export function DynamicField({ field, value, onChange, locale, error }: DynamicFieldProps) {
  const label = locale === "np" ? field.label.np : field.label.en;
  const helpText = field.helpText ? (locale === "np" ? field.helpText.np : field.helpText.en) : undefined;
  const placeholder = field.placeholder
    ? locale === "np"
      ? field.placeholder.np
      : field.placeholder.en
    : undefined;

  if (field.type === "PARTY_BLOCK") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>
          {label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <PartyBlockInput
          field={field}
          value={value as never}
          onChange={onChange}
          locale={locale}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (field.type === "CLAUSE_TOGGLE") {
    return (
      <div className="flex items-center justify-between rounded-md border border-border p-4">
        <div>
          <Label>{label}</Label>
          {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
        </div>
        <Switch
          checked={(value as boolean | undefined) ?? field.defaultOn}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  if (field.type === "CHECKBOX") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.key}
          checked={(value as boolean | undefined) ?? field.defaultChecked}
          onCheckedChange={onChange}
        />
        <Label htmlFor={field.key}>{label}</Label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.key}>
        {label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {field.type === "TEXT" && (
        <Input
          id={field.key}
          value={(value as string | undefined) ?? ""}
          placeholder={placeholder}
          maxLength={field.maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {(field.type === "TEXTAREA" || field.type === "FREE_TEXT_CLAUSE") && (
        <Textarea
          id={field.key}
          value={(value as string | undefined) ?? ""}
          placeholder={placeholder}
          maxLength={field.maxLength}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "NUMBER" && (
        <Input
          id={field.key}
          type="number"
          value={(value as number | undefined) ?? ""}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      )}

      {field.type === "CURRENCY" && (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            NPR
          </span>
          <Input
            id={field.key}
            type="number"
            min={field.min ?? 0}
            className="pl-12"
            value={(value as number | undefined) ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </div>
      )}

      {field.type === "DATE_AD" && (
        <Input
          id={field.key}
          type="date"
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "DATE_BS" && (
        <DateBsInput value={value as string | undefined} onChange={onChange} locale={locale} />
      )}

      {field.type === "SELECT" && (
        <Select value={(value as string | undefined) ?? ""} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {locale === "np" ? option.label.np : option.label.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "MULTI_SELECT" && (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          {field.options.map((option) => {
            const selected = Array.isArray(value) ? (value as string[]) : [];
            const checked = selected.includes(option.value);
            return (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.key}-${option.value}`}
                  checked={checked}
                  onCheckedChange={(next) => {
                    const nextSelected = next
                      ? [...selected, option.value]
                      : selected.filter((v) => v !== option.value);
                    onChange(nextSelected);
                  }}
                />
                <Label htmlFor={`${field.key}-${option.value}`}>
                  {locale === "np" ? option.label.np : option.label.en}
                </Label>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
