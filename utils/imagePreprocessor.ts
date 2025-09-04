import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export type AnyImage =
  | File
  | Blob
  | string
  | { uri: string; name?: string; type?: string };

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

export function isImageMime(m?: string): boolean {
  const m2 = (m || '').toLowerCase();
  return m2.startsWith('image/');
}

export function humanSize(bytes: number): string {
  if (!bytes && bytes !== 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(3, Math.floor(Math.log(Math.max(1, bytes)) / Math.log(k)));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(val >= 100 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function inferExtFromMime(m?: string) {
  const mime = (m || '').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic') || mime.includes('heif')) return 'heic';
  return 'jpg';
}

function inferMimeFromName(name = '') {
  const n = name.toLowerCase();
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.heic') || n.endsWith('.heif')) return 'image/heic';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.jfif')) return 'image/jpeg';
  return 'image/jpeg';
}

function blobToFile(b: Blob, name: string, type?: string) {
  return new File([b], name, { type: type || b.type || 'image/jpeg' });
}

async function fetchToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.blob();
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return await fetch(dataUrl).then((r) => r.blob());
}

export async function normalizeToFile(input: AnyImage): Promise<{ file: File | Blob; name: string; mime: string; ext: string }> {
  if (typeof File !== 'undefined' && input instanceof File) {
    const mime = input.type || inferMimeFromName(input.name);
    const ext = inferExtFromMime(mime);
    return { file: input, name: input.name || `image.${ext}`, mime, ext };
  }
  if (input instanceof Blob) {
    const mime = input.type || 'image/jpeg';
    const ext = inferExtFromMime(mime);
    const f = isWeb ? blobToFile(input, `image.${ext}`, mime) : input;
    return { file: f, name: `image.${ext}`, mime, ext };
  }
  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      const b = await dataUrlToBlob(input);
      const mime = b.type || 'image/jpeg';
      const ext = inferExtFromMime(mime);
      const f = isWeb ? blobToFile(b, `image.${ext}`, mime) : b;
      return { file: f, name: `image.${ext}`, mime, ext };
    }
    const b = await fetchToBlob(input);
    const mime = b.type || 'image/jpeg';
    const ext = inferExtFromMime(mime);
    const f = isWeb ? blobToFile(b, `image.${ext}`, mime) : b;
    return { file: f, name: `image.${ext}`, mime, ext };
  }
  if (input && typeof input === 'object' && 'uri' in input) {
    const name = (input as any).name || 'image.jpg';
    const mime = (input as any).type || inferMimeFromName(name);
    const b = await fetchToBlob((input as any).uri);
    const ext = inferExtFromMime(mime || b.type);
    const f = isWeb ? blobToFile(b, name, mime) : b;
    return { file: f, name, mime: mime || b.type || 'image/jpeg', ext };
  }
  throw new Error('Unsupported image input');
}

export type PrepareOptions = {
  maxWidth?: number;
  maxHeight?: number;
  baseQuality?: number;
  preferPngIfTransparent?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function webResize(blob: Blob, opts: Required<PrepareOptions>) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('File read failed'));
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob as File);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Image decode failed'));
    im.src = dataUrl;
  });
  const iw = Math.max(1, img.naturalWidth || img.width);
  const ih = Math.max(1, img.naturalHeight || img.height);
  const scale = Math.min(1, opts.maxWidth / iw, opts.maxHeight / ih);
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.drawImage(img, 0, 0, w, h);
  let hasAlpha = false;
  try {
    const imgData = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] < 255) {
        hasAlpha = true;
        break;
      }
    }
  } catch {}
  const tryMimes = opts.preferPngIfTransparent && hasAlpha ? ['image/png'] : ['image/jpeg'];
  const qualities = tryMimes[0] === 'image/png' ? [1] : [opts.baseQuality, clamp(opts.baseQuality - 0.1, 0.6, 0.9), clamp(opts.baseQuality - 0.2, 0.6, 0.9)];
  for (const targetMime of tryMimes) {
    for (const q of qualities) {
      const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, targetMime, q));
      if (!out) continue;
      if (out.size <= 8 * 1024 * 1024) {
        return { blob: out, mime: targetMime, ext: targetMime === 'image/png' ? 'png' : 'jpg', width: w, height: h, sizeBytes: out.size };
      }
    }
  }
  const fallback = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.6));
  if (fallback && fallback.size <= 8 * 1024 * 1024) {
    return { blob: fallback, mime: 'image/jpeg', ext: 'jpg', width: w, height: h, sizeBytes: fallback.size };
  }
  throw new Error('Photo too large after compression (max 8MB).');
}

async function nativeResize(uri: string, opts: Required<PrepareOptions>) {
  const actions: ImageManipulator.Action[] = [{ resize: { width: opts.maxWidth, height: opts.maxHeight } }];
  const saveFormat = ImageManipulator.SaveFormat.JPEG;
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: clamp(opts.baseQuality, 0.1, 1),
    format: saveFormat,
    base64: false,
  });
  const blob = await fetch(result.uri).then((r) => r.blob());
  if (blob.size > 2 * 1024 * 1024) {
    const tries = [opts.baseQuality, clamp(opts.baseQuality - 0.1, 0.6, 0.9), clamp(opts.baseQuality - 0.2, 0.6, 0.9)];
    for (const q of tries) {
      const r2 = await ImageManipulator.manipulateAsync(uri, actions, { compress: clamp(q, 0.1, 1), format: saveFormat });
      const b2 = await fetch(r2.uri).then((r) => r.blob());
      if (b2.size <= 8 * 1024 * 1024) {
        return { blob: b2, mime: 'image/jpeg', ext: 'jpg', width: r2.width ?? result.width ?? 0, height: r2.height ?? result.height ?? 0, sizeBytes: b2.size };
      }
    }
  }
  if (blob.size > 8 * 1024 * 1024) throw new Error('Photo too large after compression (max 8MB).');
  return { blob, mime: 'image/jpeg', ext: 'jpg', width: result.width ?? 0, height: result.height ?? 0, sizeBytes: blob.size };
}

export async function prepareForUpload(input: AnyImage, options?: PrepareOptions): Promise<{ blob: Blob; mime: string; ext: string; width: number; height: number; sizeBytes: number }> {
  const { file, name, mime } = await normalizeToFile(input);
  const opts: Required<PrepareOptions> = {
    maxWidth: options?.maxWidth ?? 1920,
    maxHeight: options?.maxHeight ?? 1080,
    baseQuality: clamp(options?.baseQuality ?? 0.8, 0.6, 0.9),
    preferPngIfTransparent: options?.preferPngIfTransparent ?? false,
  };
  if (isWeb) {
    const srcBlob = file as Blob;
    const out = await webResize(srcBlob, opts);
    return out;
  }
  const srcUri = 'uri' in (input as any) ? (input as any).uri : null;
  if (srcUri) {
    const out = await nativeResize(srcUri, opts);
    return out;
  }
  const tmp = await fetchToBlob(URL.createObjectURL(file as any));
  const out = await webResize(tmp, opts);
  return out;
}

const imagePreprocessor = { prepareForUpload, normalizeToFile, isImageMime, humanSize };
export default imagePreprocessor;
