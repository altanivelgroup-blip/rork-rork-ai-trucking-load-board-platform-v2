export type AnyImage =
  | File
  | Blob
  | string                       // data URL or http(s) URL or local file URL
  | { uri: string; name?: string; type?: string };

const isWeb = typeof window !== "undefined" && typeof document !== "undefined";

function inferExtFromMime(m?: string) {
  const mime = (m || "").toLowerCase();
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic") || mime.includes("heif")) return "heic";
  return "jpg";
}

function inferMimeFromName(name = "") {
  const n = name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".heic") || n.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

function blobToFile(b: Blob, name: string, type?: string) {
  return new File([b], name, { type: type || b.type || "image/jpeg" });
}

async function fetchToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.blob();
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return await fetch(dataUrl).then(r => r.blob());
}

export function humanSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function isImageMime(m?: string): boolean {
  return (m || "").toLowerCase().startsWith("image/");
}

export async function normalizeToFile(input: AnyImage): Promise<{ file: File | Blob, name: string, mime: string, ext: string }> {
  // Case 1: real File (web file picker)
  if (typeof File !== "undefined" && input instanceof File) {
    const mime = input.type || inferMimeFromName(input.name);
    const ext = inferExtFromMime(mime);
    return { file: input, name: input.name || `image.${ext}`, mime, ext };
  }

  // Case 2: Blob
  if (input instanceof Blob) {
    const mime = input.type || "image/jpeg";
    const ext = inferExtFromMime(mime);
    const f = isWeb ? blobToFile(input, `image.${ext}`, mime) : input;
    return { file: f, name: `image.${ext}`, mime, ext };
  }

  // Case 3: string
  if (typeof input === "string") {
    if (input.startsWith("data:")) {
      const b = await dataUrlToBlob(input);
      const mime = b.type || "image/jpeg";
      const ext = inferExtFromMime(mime);
      const f = isWeb ? blobToFile(b, `image.${ext}`, mime) : b;
      return { file: f, name: `image.${ext}`, mime, ext };
    }
    // http(s) or file:/content:
    const b = await fetchToBlob(input);
    const mime = b.type || "image/jpeg";
    const ext = inferExtFromMime(mime);
    const f = isWeb ? blobToFile(b, `image.${ext}`, mime) : b;
    return { file: f, name: `image.${ext}`, mime, ext };
  }

  // Case 4: RN asset-like { uri, name?, type? }
  if (input && typeof input === "object" && "uri" in input) {
    const name = (input as any).name || "image.jpg";
    const mime = (input as any).type || inferMimeFromName(name);
    const b = await fetchToBlob((input as any).uri);
    const ext = inferExtFromMime(mime || b.type);
    const f = isWeb ? blobToFile(b, name, mime) : b;
    return { file: f, name, mime: mime || b.type || "image/jpeg", ext };
  }

  throw new Error("Unsupported image input");
}

/** Resize/compress and return { blob, mime, ext, width, height, sizeBytes } */
export async function prepareForUpload(input: AnyImage): Promise<{ blob: Blob; mime: string; ext: string; width: number; height: number; sizeBytes: number }> {
  const { file, mime, ext } = await normalizeToFile(input);

  // Web: use canvas to downscale
  if (isWeb) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("File read failed"));
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(file as File);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Image decode failed"));
      im.src = dataUrl;
    });

    const MAX_W = 1920, MAX_H = 1080;
    let { width, height } = img;
    const scale = Math.min(1, MAX_W / width, MAX_H / height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);

    // Convert HEIC/HEIF to JPEG
    const targetMime = mime.startsWith("image/") ? (mime === "image/png" ? "image/png" : "image/jpeg") : "image/jpeg";
    const qualityList = targetMime === "image/png" ? [1] : [0.8, 0.7, 0.6];

    let out: Blob | null = null;
    for (const q of qualityList) {
      out = await new Promise<Blob | null>(res => canvas.toBlob(res, targetMime, q));
      if (out && out.size <= 8 * 1024 * 1024) break; // <= 8MB
    }
    if (!out) throw new Error("Photo too large after compression (max 8MB).");
    return { blob: out, mime: targetMime, ext: targetMime === "image/png" ? "png" : "jpg", width: w, height: h, sizeBytes: out.size };
  }

  // Native: keep blob; optional compression could be added via native libs
  const nativeBlob = file as Blob;
  if (nativeBlob.size > 10 * 1024 * 1024) throw new Error("File too large (>10MB)");
  return { blob: nativeBlob, mime: mime || "image/jpeg", ext: ext || "jpg", width: 0, height: 0, sizeBytes: nativeBlob.size };
}