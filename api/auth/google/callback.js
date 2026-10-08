import { oauthClient, saveRefreshToken } from '../../_lib/google.js';
import { parseCookies, json } from '../../_lib/http.js';
import { APP_URL } from '../../_lib/config.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
    const { code, state, error: oauthError } = req.query || {};
    if (oauthError) return json(res, 400, { error: `Google authorization was not completed: ${oauthError}` });
    const cookies = parseCookies(req);
    if (!state || !cookies.google_oauth_state || state !== cookies.google_oauth_state) return json(res, 400, { error: 'Invalid OAuth state. Please start again.' });
    if (!code) return json(res, 400, { error: 'Missing authorization code.' });
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) return json(res, 400, { error: 'Google did not return a refresh token. Start authorization again and approve access.' });
    await saveRefreshToken(tokens.refresh_token, tokens.scope || '');
    res.statusCode = 302;
    res.setHeader('Location', `${APP_URL || ''}/?google=connected`);
    res.setHeader('Set-Cookie', 'google_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
    res.end();
  } catch (error) {
    json(res, 500, { error: error.message || 'Google authorization failed.' });
  }
}
