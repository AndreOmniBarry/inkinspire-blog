import "server-only";
import sharp from "sharp";
import { v7 as uuidv7 } from "uuid";
import { getStorage } from "./storage";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic"] as const;

/** Identify by content, never by file name or browser-supplied type. */
export function sniffImage(buf: Buffer): (typeof ACCEPTED)[number] | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (["heic", "heix", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
}

export type Processed = {
  key: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  placeholder: string;
  variants: Record<string, Record<string, string>>;
};

const WIDTHS = [480, 960, 1600, 2400];

/**
 * Upload pipeline (ADR-006): sniff → decode → auto-rotate → re-encode from pixels (EXIF and GPS are
 * dropped; any payload hidden in the original file cannot survive) → responsive WebP + AVIF
 * variants → a ~300-byte blurred placeholder. The original upload is never stored.
 */
export async function processImage(buf: Buffer): Promise<Processed> {
  if (buf.length > MAX_UPLOAD_BYTES) throw new Error("That image is larger than 15 MB. Please choose a smaller one.");
  const sniffed = sniffImage(buf);
  if (!sniffed) throw new Error("That file isn’t an image we can use. Please upload a JPEG, PNG, WebP, GIF, AVIF or HEIC photo.");
  const base = sharp(buf, { failOn: "error", limitInputPixels: 50_000_000, animated: false }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("We couldn’t read that image. It may be damaged.");
  const orientedW = meta.orientation && meta.orientation >= 5 ? meta.height : meta.width;
  const orientedH = meta.orientation && meta.orientation >= 5 ? meta.width : meta.height;

  const id = uuidv7();
  const now = new Date();
  const prefix = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}`;
  const storage = getStorage();
  const variants: Processed["variants"] = { webp: {}, avif: {} };
  const widths = WIDTHS.filter((w) => w < orientedW).concat(orientedW <= 2400 ? [orientedW] : []).filter((w, i, a) => a.indexOf(w) === i);
  let mainKey = "";
  let mainBytes = 0;
  for (const w of widths) {
    const webp = await sharp(buf, { failOn: "error", limitInputPixels: 50_000_000 }).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).toBuffer();
    const k = `${prefix}-${w}.webp`;
    await storage.put(k, webp, "image/webp");
    variants.webp[String(w)] = k;
    mainKey = k;
    mainBytes = webp.length;
    if (w === 960 || w === 1600 || (w === widths[widths.length - 1] && w < 960)) {
      const avif = await sharp(buf, { failOn: "error", limitInputPixels: 50_000_000 }).rotate().resize({ width: w, withoutEnlargement: true }).avif({ quality: 55, effort: 3 }).toBuffer();
      const ak = `${prefix}-${w}.avif`;
      await storage.put(ak, avif, "image/avif");
      variants.avif[String(w)] = ak;
    }
  }
  const tiny = await sharp(buf).rotate().resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer();
  return {
    key: mainKey,
    mime: "image/webp",
    bytes: mainBytes,
    width: Math.min(orientedW, 2400),
    height: Math.round((Math.min(orientedW, 2400) / orientedW) * orientedH),
    placeholder: `data:image/webp;base64,${tiny.toString("base64")}`,
    variants,
  };
}
