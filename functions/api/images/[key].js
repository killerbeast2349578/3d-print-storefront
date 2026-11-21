export async function onRequestGet({ env, params }) {
  const key = String(params.key || '');
  if (!/^[a-zA-Z0-9-]+\.(?:jpg|png|webp|gif|avif)$/.test(key)) {
    return new Response('Not found', { status: 404 });
  }
  const object = await env.PRODUCT_IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=86400');
  return new Response(object.body, { headers });
}
