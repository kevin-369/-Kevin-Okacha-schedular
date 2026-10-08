import { google } from 'googleapis';
import { GOOGLE_REDIRECT_URI, GOOGLE_CALENDAR_ID, assertEnv } from './config.js';
import { supabaseAdmin } from './supabase.js';

export function oauthClient() {
  assertEnv(['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI']);
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export function authUrl(state) {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state,
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.freebusy'
    ]
  });
}

export async function saveRefreshToken(refreshToken, scope = '') {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from('google_oauth_tokens').upsert({
    id: 'primary', refresh_token: refreshToken, scope, token_type: 'Bearer', updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if (error) throw error;
}

export async function getCalendarClient() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('google_oauth_tokens').select('refresh_token,scope').eq('id','primary').maybeSingle();
  if (error) throw error;
  if (!data?.refresh_token) throw new Error('Google Calendar is not connected yet. Open /api/auth/google/start first.');
  const client = oauthClient();
  client.setCredentials({ refresh_token: data.refresh_token });
  return { auth: client, calendar: google.calendar({ version: 'v3', auth: client }) };
}

export async function waitForMeet(calendar, eventId, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const { data } = await calendar.events.get({ calendarId: GOOGLE_CALENDAR_ID, eventId });
    const video = data.conferenceData?.entryPoints?.find(x => x.entryPointType === 'video')?.uri;
    if (video) return { event: data, meetUrl: video };
    await new Promise(r => setTimeout(r, 700));
  }
  return { event: null, meetUrl: null };
}
