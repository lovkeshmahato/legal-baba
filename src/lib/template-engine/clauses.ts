import type { ClauseLibraryItem } from "@prisma/client";
import type { AiFlag } from "@/types/template-engine";
import { evaluateCondition } from "./conditions";

/**
 * Resolves which clauses from a template's library are active for a given
 * set of answers: conditional clauses must satisfy conditionalOn, and
 * toggleable clauses must have their matching CLAUSE_TOGGLE field truthy.
 */
export function resolveActiveClauses(
  clauses: ClauseLibraryItem[],
  formData: Record<string, unknown>
): ClauseLibraryItem[] {
  return clauses
    .filter((clause) => {
      if (!evaluateCondition(clause.conditionalOn as any, formData)) {
        return false;
      }
      if (clause.isToggleable) {
        // A toggleable clause's own on/off state lives in formData under its key.
        const toggledOn = formData[clause.key];
        return toggledOn === undefined ? clause.isDefault : Boolean(toggledOn);
      }
      return clause.isDefault;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Builds risk-flag warnings for default-off / conditional clauses the user left out. */
export function flagMissingRiskClauses(
  clauses: ClauseLibraryItem[],
  activeClauses: ClauseLibraryItem[]
): AiFlag[] {
  const activeKeys = new Set(activeClauses.map((c) => c.key));
  const flags: AiFlag[] = [];

  for (const clause of clauses) {
    if (activeKeys.has(clause.key) || !clause.riskFlagIfMissing) continue;
    flags.push({
      type: "risk_clause_missing",
      clauseKey: clause.key,
      message: { en: clause.riskFlagIfMissing, np: clause.riskFlagIfMissing },
    });
  }

  return flags;
}
