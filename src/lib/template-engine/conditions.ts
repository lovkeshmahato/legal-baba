import type { ConditionRule } from "@/types/template-engine";

/** Evaluates a visibleWhen/conditionalOn rule against already-collected form answers. */
export function evaluateCondition(
  rule: ConditionRule | undefined | null,
  formData: Record<string, unknown>
): boolean {
  if (!rule) return true;

  const value = formData[rule.field];

  if (rule.equals !== undefined && value !== rule.equals) return false;
  if (rule.notEquals !== undefined && value === rule.notEquals) return false;
  if (rule.in !== undefined && !rule.in.includes(value as string | number)) {
    return false;
  }

  return true;
}
