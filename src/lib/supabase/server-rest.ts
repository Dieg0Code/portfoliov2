type Locale = "es" | "en";

type CvLeadInput = {
  name: string;
  email: string | null;
  phone: string | null;
  locale: Locale;
};

type CvLeadRow = {
  id: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration is missing.");
  }

  return { key, url };
}

function createHeaders(key: string, includeJson = false) {
  const headers: Record<string, string> = {
    apikey: key,
    Prefer: "return=representation"
  };

  if (!key.startsWith("sb_")) {
    headers.Authorization = `Bearer ${key}`;
  }

  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

async function parseSupabaseError(response: Response) {
  const message = await response.text();
  return new Error(
    `Supabase request failed (${response.status}): ${message.slice(0, 240)}`
  );
}

export async function upsertCvLead(input: CvLeadInput) {
  const { key, url } = getSupabaseConfig();
  const matchField = input.email ? "email" : "phone";
  const matchValue = input.email ?? input.phone;
  const search = new URLSearchParams({
    select: "id",
    [matchField]: `eq.${matchValue}`
  });
  const existingResponse = await fetch(
    `${url}/rest/v1/portfolio_cv_leads?${search}`,
    {
      headers: createHeaders(key),
      cache: "no-store"
    }
  );

  if (!existingResponse.ok) throw await parseSupabaseError(existingResponse);
  const existing = (await existingResponse.json()) as CvLeadRow[];
  const now = new Date().toISOString();

  if (existing[0]) {
    const updateParams = new URLSearchParams({ id: `eq.${existing[0].id}` });
    const updateResponse = await fetch(
      `${url}/rest/v1/portfolio_cv_leads?${updateParams}`,
      {
        method: "PATCH",
        headers: createHeaders(key, true),
        body: JSON.stringify({
          name: input.name,
          locale: input.locale,
          consented_at: now,
          last_requested_at: now
        }),
        cache: "no-store"
      }
    );

    if (!updateResponse.ok) throw await parseSupabaseError(updateResponse);
    return existing[0].id;
  }

  const insertResponse = await fetch(`${url}/rest/v1/portfolio_cv_leads`, {
    method: "POST",
    headers: createHeaders(key, true),
    body: JSON.stringify({
      ...input,
      consented_at: now,
      first_requested_at: now,
      last_requested_at: now
    }),
    cache: "no-store"
  });

  if (!insertResponse.ok) throw await parseSupabaseError(insertResponse);
  const inserted = (await insertResponse.json()) as CvLeadRow[];
  if (!inserted[0]?.id) throw new Error("Supabase did not return a lead id.");
  return inserted[0].id;
}

export async function markCvDownloaded(leadId: string) {
  const { key, url } = getSupabaseConfig();
  const params = new URLSearchParams({ id: `eq.${leadId}` });
  const response = await fetch(
    `${url}/rest/v1/portfolio_cv_leads?${params}`,
    {
      method: "PATCH",
      headers: createHeaders(key, true),
      body: JSON.stringify({ downloaded_at: new Date().toISOString() }),
      cache: "no-store"
    }
  );

  if (!response.ok) throw await parseSupabaseError(response);
}
