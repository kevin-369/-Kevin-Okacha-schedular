import { supabaseAdmin } from './_lib/supabase.js';
import { json } from './_lib/http.js';

export default async function handler(req, res) {
  const { error } = await supabaseAdmin().from('bookings').select('id', { head: true, count: 'exact' }).limit(1);
  json(res, error ? 500 : 200, { ok: !error });
}