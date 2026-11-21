export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAdmin(request, env) {
  const configured = env.ADMIN_TOKEN;
  const header = request.headers.get('Authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  return Boolean(configured && supplied && safeEqual(supplied, configured));
}

export function unauthorized() {
  return json({ error: 'Administrator authentication required.' }, 401);
}

export function imageUrl(key) {
  return key ? `/api/images/${encodeURIComponent(key)}` : null;
}

export function imageExtension(contentType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif'
  };
  return map[contentType] || null;
}

export async function saveImage(env, file, keyPrefix) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) return null;
  if (file.size > 12 * 1024 * 1024) throw new Error('Image must be 12 MB or smaller.');
  const type = file.type || 'application/octet-stream';
  const extension = imageExtension(type);
  if (!extension) throw new Error('Use a JPG, PNG, WebP, GIF, or AVIF image.');
  const key = `${keyPrefix}-${crypto.randomUUID()}.${extension}`;
  await env.PRODUCT_IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=86400' }
  });
  return key;
}

export async function saveDataUrlImage(env, dataUrl, keyPrefix) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif|avif));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('A product image in the backup has an unsupported format.');
  const contentType = match[1];
  const extension = imageExtension(contentType);
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.byteLength > 12 * 1024 * 1024) throw new Error('An imported image is larger than 12 MB.');
  const key = `${keyPrefix}-${crypto.randomUUID()}.${extension}`;
  await env.PRODUCT_IMAGES.put(key, bytes, {
    httpMetadata: { contentType, cacheControl: 'public, max-age=86400' }
  });
  return key;
}
