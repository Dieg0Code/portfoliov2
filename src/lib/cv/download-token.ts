import {
  createHmac,
  timingSafeEqual
} from "node:crypto";

const TOKEN_TTL_MS = 10 * 60 * 1000;

type DownloadTokenPayload = {
  leadId: string;
  expiresAt: number;
};

function getSecret() {
  const secret = process.env.CV_DOWNLOAD_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CV_DOWNLOAD_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createCvDownloadToken(leadId: string) {
  const payload: DownloadTokenPayload = {
    leadId,
    expiresAt: Date.now() + TOKEN_TTL_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyCvDownloadToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = Buffer.from(sign(encodedPayload));
  const received = Buffer.from(signature);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as DownloadTokenPayload;

    if (
      typeof payload.leadId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
