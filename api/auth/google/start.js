import crypto from 'node:crypto';
import { authUrl } from '../../_lib/google.js';
import { setCookie, json } from '../../_lib/http.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
    const state = crypto.randomBytes(24).toString('hex');
    setCookie(res, 'google_oauth_state', state, { maxAge: 600 });
    res.statusCode = 302;
    res.setHeader('Location', authUrl(state));
    res.end();
  } catch (error) {
    json(res, 500, { error: error.message || 'Unable to start Google authorization.' });
  }
}
