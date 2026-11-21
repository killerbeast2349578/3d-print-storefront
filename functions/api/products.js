import { json, isAdmin, unauthorized, imageUrl, saveImage } from './_lib.js';

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare(
    `SELECT id, name, category, description, image_key, created_at
     FROM products ORDER BY created_at DESC`
  ).all();
  const products = (result.results || []).map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description || '',
    image_url: imageUrl(row.image_key),
    created_at: row.created_at
  }));
  return json({ products });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const form = await request.formData();
    const name = String(form.get('name') || '').trim();
    const category = String(form.get('category') || 'functional');
    const description = String(form.get('description') || '').trim();
    if (!name) return json({ error: 'Product name is required.' }, 400);
    if (name.length > 80 || description.length > 240) return json({ error: 'Product name or description is too long.' }, 400);
    if (!['functional', 'accessories', 'custom'].includes(category)) return json({ error: 'Invalid product category.' }, 400);
    const id = crypto.randomUUID();
    const file = form.get('image');
    const imageKey = file && typeof file.arrayBuffer === 'function'
      ? await saveImage(env, file, id)
      : null;
    const createdAt = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO products (id, name, category, description, image_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, category, description, imageKey, createdAt, createdAt).run();
    return json({ ok: true, id }, 201);
  } catch (error) {
    return json({ error: error.message || 'Could not create product.' }, 400);
  }
}
