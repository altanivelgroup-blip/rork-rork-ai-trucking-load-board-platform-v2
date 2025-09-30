export const MAX_PHOTOS = 20;
const MAX_URL_BYTES = 1024;
const MAX_FIELD_BYTES = 1_000_000;

const byteLen = (s: string) => new TextEncoder().encode(s).length;
const isLikelyImageUrl = (u: string) =>
  /\.(png|jpe?g|webp|gif|heic|heif|bmp|tiff?)(\?.*)?$/i.test(u) ||
  /firebasestorage\.googleapis\.com/i.test(u);

export function sanitizePhotoUrls(urls?: string[]) {
  try {
    console.log('[photos] sanitizePhotoUrls start', { count: urls?.length ?? 0 });
    const filtered = (urls ?? [])
      .filter(Boolean)
      .map((u) => String(u).trim())
      .filter((u) => u.startsWith('https://'))
      .filter(isLikelyImageUrl)
      .filter((u) => byteLen(u) <= MAX_URL_BYTES)
      .slice(0, MAX_PHOTOS);

    const json = JSON.stringify(filtered);
    const totalArraySize = byteLen(json);
    const percentUsed = Math.min(100, Math.round((totalArraySize / MAX_FIELD_BYTES) * 100));

    console.log('[photos] sanitizePhotoUrls result', { filtered, totalArraySize, percentUsed });
    return { valid: filtered, totalArraySize, percentUsed } as const;
  } catch (err) {
    console.error('[photos] sanitizePhotoUrls error', err);
    return { valid: [], totalArraySize: 0, percentUsed: 0 } as const;
  }
}
