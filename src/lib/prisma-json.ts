import type { Prisma } from "@prisma/client";

/** Narrows an arbitrary value to Prisma's InputJsonValue for Json columns. */
export function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
