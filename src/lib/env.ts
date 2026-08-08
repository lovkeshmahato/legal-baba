/**
 * Presence-only environment diagnostics — never returns secret values, only
 * whether they're set. Used by /api/health so a broken deploy can be
 * diagnosed without shell access to the host. Deliberately does not throw
 * or run at module-import time: a hard check here would risk failing
 * `next build` on platforms that don't inject runtime env vars at build
 * time (common on serverless/managed hosts).
 */
export function describeEnvStatus() {
  const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "ANTHROPIC_API_KEY"] as const;
  const optional = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "DIRECT_URL"] as const;

  const status = Object.fromEntries(
    [...required, ...optional].map((key) => [key, Boolean(process.env[key]?.trim())])
  ) as Record<(typeof required)[number] | (typeof optional)[number], boolean>;

  const missingRequired = required.filter((key) => !status[key]);

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    status,
    // Safe to expose — it's a public URL, not a secret.
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
  };
}
