import { json, isAdmin, unauthorized } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  return json({ ok: true });
}
