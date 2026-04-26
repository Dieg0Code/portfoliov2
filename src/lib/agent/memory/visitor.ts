import { randomUUID } from "node:crypto";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

const COOKIE_NAME = "archive-vid";
const MAX_AGE_S = 180 * 24 * 60 * 60; // 180 days
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ReadOnlyCookieStore = {
  get(name: string): { value: string } | undefined;
};

export type ResolvedVisitor = {
  id: string;
  setCookie?: Partial<ResponseCookie> & { name: string; value: string };
};

export function resolveVisitor(cookieStore: ReadOnlyCookieStore): ResolvedVisitor {
  const existing = cookieStore.get(COOKIE_NAME);
  if (existing?.value && UUID_RE.test(existing.value)) {
    return { id: existing.value };
  }
  const id = randomUUID();
  return {
    id,
    setCookie: {
      name: COOKIE_NAME,
      value: id,
      maxAge: MAX_AGE_S,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    }
  };
}

export function serializeSetCookie(c: NonNullable<ResolvedVisitor["setCookie"]>): string {
  const parts = [`${c.name}=${c.value}`];
  if (typeof c.maxAge === "number") parts.push(`Max-Age=${c.maxAge}`);
  if (c.path) parts.push(`Path=${c.path}`);
  if (c.httpOnly) parts.push("HttpOnly");
  if (c.secure) parts.push("Secure");
  if (c.sameSite) {
    const v = String(c.sameSite);
    parts.push(`SameSite=${v.charAt(0).toUpperCase()}${v.slice(1)}`);
  }
  return parts.join("; ");
}
