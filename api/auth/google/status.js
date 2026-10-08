import { supabaseAdmin } from '../../_lib/supabase.js';
import { json } from '../../_lib/http.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
    const { data, error } = await supabaseAdmin().from('google_oauth_tokens').select('id,updated_at').eq('id','primary').maybeSingle();
    if (error) throw error;
    json(res, 200, { connected: Boolean(data), updatedAt: data?.updated_at || null });
  } catch (error) { json(res, 500, { error: error.message || 'Unable to check Google connection.' }); }
}
