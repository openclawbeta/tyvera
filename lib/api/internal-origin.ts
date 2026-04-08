import { NextRequest } from "next/server";

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedOrigins(): string[] {
  const values = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    "https://tyvera.ai",
    "https://www.tyvera.ai",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  return Array.from(new Set(values.map(normalizeOrigin).filter((v): v is string => Boolean(v))));
}

export function isAllowedInternalOrigin(request: NextRequest): boolean {
  const origin = normalizeOrigin(request.headers.get("origin"));
  const referer = normalizeOrigin(request.headers.get("referer"));
  const allowed = allowedOrigins();

  if (origin && allowed.includes(origin)) return true;
  if (referer && allowed.includes(referer)) return true;

  return false;
}
