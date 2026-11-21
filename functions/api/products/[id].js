import { json, isAdmin, unauthorized, imageUrl, saveImage } from '../_lib.js';

export async function onRequestPut({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  const id = String(params.id || '');
  try {
    const existing = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
    if (!existing) return json({ error: 'Product not found.' }, 404);
    const form = await request.formData();
    const name = String(form.get('name') || '').trim();
    const category = String(form.get('category') || 'functional');
    const description = String(form.get('description') || '').trim();
    if (!name) return json({ error: 'Product name is required.' }, 400);
    if (name.length > 80 || description.length > 240) return json({ error: 'Product name or description is too long.' }, 400);
    if (!['functional', 'accessories', 'custom'].includes(category)) return json({ error: 'Invalid product category.' }, 400);
    const file = form.get('image');
    let imageKey = existing.image_key;
    if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
      imageKey = await saveImage(env, file, id);
    }
    await env.DB.prepare(
      `UPDATE products SET name = ?, category = ?, description = ?, image_key = ?, updated_at = ? WHERE id = ?`
    ).bind(name, category, description, imageKey, new Date().toISOString(), id).run();
    if (existing.image_key && existing.image_key !== imageKey) {
      await env.PRODUCT_IMAGES.delete(existing.image_key);
    }
    return json({ ok: true, image_url: imageUrl(imageKey) });
  } catch (error) {
    return json({ error: error.message || 'Could not update product.' }, 400);
  }
}

export async function onRequestDelete({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  const id = String(params.id || '');
  const existing = await env.DB.prepare('SELECT image_key FROM products WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Product not found.' }, 404);
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  if (existing.image_key) await env.PRODUCT_IMAGES.delete(existing.image_key);
  return json({ ok: true });
}
