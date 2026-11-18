import { NextResponse } from "next/server";
import { db, schema } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { processImage, MAX_UPLOAD_BYTES } from "@/server/media/process";
import { mediaSources } from "@/server/media/url";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/security/rate-limit";

/** Studio image upload. Staff with media.upload only; alt text is required. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !can(user.role, "media.upload") || !user.twoFactorEnabled || user.mustChangePassword) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (!(await rateLimit(`upload:${user.id}`, 60, 3600))) return NextResponse.json({ error: "Too many uploads. Please wait a little." }, { status: 429 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD_BYTES + 1024 * 64) return NextResponse.json({ error: "That image is larger than 15 MB." }, { status: 413 });
  const form = await req.formData();
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "").trim();
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!alt) return NextResponse.json({ error: "Please describe the image (alt text). It helps people who use screen readers, and search engines." }, { status: 400 });
  try {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()));
    const [row] = await db
      .insert(schema.media)
      .values({
        key: processed.key,
        filename: file.name.slice(0, 200),
        mime: processed.mime,
        bytes: processed.bytes,
        width: processed.width,
        height: processed.height,
        placeholder: processed.placeholder,
        variants: processed.variants,
        alt: alt.slice(0, 500),
        caption: String(form.get("caption") ?? "").slice(0, 500) || null,
        credit: String(form.get("credit") ?? "").slice(0, 200) || null,
        uploadedById: user.id,
      })
      .returning();
    await audit(user, "media.upload", `Uploaded “${row.filename}”`, { type: "media", id: row.id });
    return NextResponse.json({ media: { id: row.id, alt: row.alt, ...mediaSources(row) } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 422 });
  }
}
