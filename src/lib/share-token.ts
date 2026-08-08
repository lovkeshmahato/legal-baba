import { randomBytes } from "node:crypto";

/** URL-safe token for view-only share links — unguessable, not sequential. */
export function generateShareToken(): string {
  return randomBytes(18).toString("base64url");
}
