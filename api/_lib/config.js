export const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
export const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
export const HOST_EMAIL = process.env.HOST_EMAIL;
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

export function assertEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}
