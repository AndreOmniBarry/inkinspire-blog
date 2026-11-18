import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/server/env";

/**
 * Where media files live. Production: the owner's Cloudflare R2 bucket (S3 API, 10 GB free, no
 * download fees). Development: a local folder served by /media/[...key]. Same interface either way.
 */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  read?(key: string): Promise<Buffer>;
}

class R2Storage implements Storage {
  private client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
        ContentDisposition: "inline",
      }),
    );
  }
  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
  }
}

const LOCAL_ROOT = join(process.cwd(), ".local-media");
function localPath(key: string) {
  const p = normalize(join(LOCAL_ROOT, key));
  if (!p.startsWith(LOCAL_ROOT)) throw new Error("Invalid key");
  return p;
}
class LocalStorage implements Storage {
  async put(key: string, body: Buffer) {
    const p = localPath(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
  }
  async remove(key: string) {
    await rm(localPath(key), { force: true });
  }
  async read(key: string) {
    return readFile(localPath(key));
  }
}

export const r2Configured = () => !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET && env.R2_PUBLIC_URL);

let storage: Storage | undefined;
export function getStorage(): Storage {
  if (storage) return storage;
  if (r2Configured()) storage = new R2Storage();
  else if (env.NODE_ENV === "production") throw new Error("Media storage is not configured. Add the R2_* settings (see .env.example).");
  else storage = new LocalStorage();
  return storage;
}
