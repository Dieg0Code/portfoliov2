import { readFile } from "node:fs/promises";
import path from "node:path";
import { verifyCvDownloadToken } from "@/lib/cv/download-token";
import { markCvDownloaded } from "@/lib/supabase/server-rest";

export const runtime = "nodejs";

async function readCvPdf() {
  const encoded = process.env.CV_PDF_BASE64?.trim();
  const file = encoded
    ? Buffer.from(encoded, "base64")
    : await readFile(path.join(process.cwd(), "private", "cv-diego-obando.pdf"));

  if (file.subarray(0, 4).toString("ascii") !== "%PDF") {
    throw new Error("CV_PDF_BASE64 does not contain a valid PDF.");
  }

  return file;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? verifyCvDownloadToken(token) : null;

  if (!payload) {
    return new Response("El enlace de descarga no es válido o ya expiró.", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, max-age=0"
      }
    });
  }

  try {
    const file = await readCvPdf();
    await markCvDownloaded(payload.leadId);

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="CV-Diego-Obando.pdf"',
        "Content-Length": file.byteLength.toString(),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("CV download failed", error);
    return new Response("La descarga no está disponible en este momento.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, max-age=0"
      }
    });
  }
}
