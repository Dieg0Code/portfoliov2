import { NextResponse } from "next/server";
import { createCvDownloadToken } from "@/lib/cv/download-token";
import { upsertCvLead } from "@/lib/supabase/server-rest";

export const runtime = "nodejs";

type RequestBody = {
  name?: unknown;
  contactKind?: unknown;
  contact?: unknown;
  consent?: unknown;
  locale?: unknown;
  company?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 100);
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 254);
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "").slice(0, 15);
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const name = normalizeName(body.name);
  const contactKind = body.contactKind === "phone" ? "phone" : "email";
  const email =
    contactKind === "email" ? normalizeEmail(body.contact) : null;
  const phone =
    contactKind === "phone" ? normalizePhone(body.contact) : null;
  const locale = body.locale === "en" ? "en" : "es";

  if (name.length < 2) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const phoneDigits = phone?.replace(/\D/g, "").length ?? 0;
  if (phone && (phoneDigits < 8 || phoneDigits > 15)) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  if ((!email && !phone) || body.consent !== true) {
    return NextResponse.json(
      { error: body.consent === true ? "invalid_contact" : "consent_required" },
      { status: 400 }
    );
  }

  try {
    const leadId = await upsertCvLead({
      name,
      email,
      phone,
      locale
    });
    const token = createCvDownloadToken(leadId);

    return NextResponse.json(
      { downloadUrl: `/api/cv/download?token=${encodeURIComponent(token)}` },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  } catch (error) {
    console.error("CV request failed", error);
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
