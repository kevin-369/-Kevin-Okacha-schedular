# Kevin Scheduler — production build

This version replaces the fake Meet-link generator with a real Google Calendar + Google Meet flow and keeps booking data in Supabase.

## Before deploying

1. Keep the existing Vercel environment variables already created.
2. Make sure `google_oauth_tokens` exists in Supabase (you already ran that SQL).
3. Deploy this project.
4. Open `https://kevin-okacha-scheduler.vercel.app/api/auth/google/start` while signed into **kev.okacha@gmail.com**.
5. Approve Google Calendar access.
6. Return to the scheduler. The status chip should show Google Calendar connected.

## Important Google settings

OAuth redirect URI must be exactly:
`https://kevin-okacha-scheduler.vercel.app/api/auth/google/callback`

Google Calendar API must be enabled. The OAuth scope used by the app is:
`https://www.googleapis.com/auth/calendar.events`

## Environment variables

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID=primary`
- `HOST_EMAIL=kev.okacha@gmail.com`
- `APP_URL=https://kevin-okacha-scheduler.vercel.app`

Never commit `.env` files or Google secrets.
