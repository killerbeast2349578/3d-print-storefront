import { json, isAdmin, unauthorized, saveDataUrlImage } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const body = await request.json();
    const product = body.product;
    if (!product || typeof product !== 'object') return json({ error: 'Missing product record.' }, 400);
    const id = String(product.id || crypto.randomUUID());
    const name = String(product.name || '').trim();
    const category = String(product.category || 'functional');
    const description = String(product.description || '').trim();
    if (!name) return json({ error: 'An imported product is missing its name.' }, 400);
    if (name.length > 80 || description.length > 240) return json({ error: 'An imported product has a name or description that is too long.' }, 400);
    if (!['functional', 'accessories', 'custom'].includes(category)) return json({ error: 'An imported product has an invalid category.' }, 400);

    let imageKey = null;
    if (typeof product.image === 'string' && product.image.startsWith('data:image/')) {
      imageKey = await saveDataUrlImage(env, product.image, id);
    }
    const existing = await env.DB.prepare('SELECT image_key FROM products WHERE id = ?').bind(id).first();
    if (!imageKey && existing) imageKey = existing.image_key;
    const createdAt = String(product.createdAt || new Date().toISOString());
    await env.DB.prepare(
      `INSERT INTO products (id, name, category, description, image_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         category = excluded.category,
         description = excluded.description,
         image_key = excluded.image_key,
         updated_at = excluded.updated_at`
    ).bind(id, name, category, description, imageKey, createdAt, new Date().toISOString()).run();
    if (existing?.image_key && imageKey && existing.image_key !== imageKey) {
      await env.PRODUCT_IMAGES.delete(existing.image_key);
    }
    return json({ ok: true, id });
  } catch (error) {
    return json({ error: error.message || 'Could not import product.' }, 400);
  }
}
