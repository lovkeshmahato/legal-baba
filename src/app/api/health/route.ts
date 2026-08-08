import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { describeEnvStatus } from "@/lib/env";

// Must run per-request, never at build time: without this, Next.js can
// statically prerender the route once during `next build` and bake in a
// stale (or build-environment-only) result forever.
export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated diagnostic endpoint. Exposes presence-only env
 * checks (never values, except NEXTAUTH_URL which is public by design) and a
 * live database round-trip, so a broken deploy can be diagnosed from the
 * browser without needing platform log access. If this route itself 500s,
 * that's informative too (the app can't even reach the route handler).
 */
export async function GET() {
  const env = describeEnvStatus();

  let database: { ok: boolean; error?: string } = { ok: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true };
  } catch (error) {
    database = { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }

  const ok = env.ok && database.ok;

  return NextResponse.json(
    {
      ok,
      env: { ok: env.ok, missingRequired: env.missingRequired, status: env.status },
      database,
      nextAuthUrl: env.nextAuthUrl,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
