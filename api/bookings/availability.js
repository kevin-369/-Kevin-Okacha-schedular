import { getCalendarClient } from '../_lib/google.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { GOOGLE_CALENDAR_ID } from '../_lib/config.js';
import { json } from '../_lib/http.js';

const TZ = 'Africa/Nairobi';
const WORK_START = 9;
const WORK_END = 17;
const INTERVAL = 30;

function dayBounds(date) {
  return { start: new Date(`${date}T00:00:00+03:00`), end: new Date(`${date}T23:59:59+03:00`) };
}
function slotDate(date, minutes) { return new Date(`${date}T00:00:00+03:00`).getTime() + minutes * 60000; }
function overlap(aStart,aEnd,bStart,bEnd) { return aStart < bEnd && aEnd > bStart; }

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res,405,{error:'Method not allowed.'});
    const date = String(req.query?.date || '');
    const duration = Math.max(15, Number(req.query?.duration || 30));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(res,400,{error:'Use date=YYYY-MM-DD.'});

    const { start, end } = dayBounds(date);
    const supabase = supabaseAdmin();
    const { data: rows, error } = await supabase.from('bookings').select('start_time,end_time,status').in('status',['pending','confirmed']).lt('start_time',end.toISOString()).gt('end_time',start.toISOString());
    if (error) throw error;

    const busy = (rows || []).map(x => [new Date(x.start_time), new Date(x.end_time)]);
    try {
      const { calendar } = await getCalendarClient();
      const fb = await calendar.freebusy.query({ requestBody: { timeMin: start.toISOString(), timeMax: end.toISOString(), timeZone: TZ, items: [{ id: GOOGLE_CALENDAR_ID }] } });
      const googleBusy = fb.data.calendars?.[GOOGLE_CALENDAR_ID]?.busy || [];
      for (const x of googleBusy) busy.push([new Date(x.start), new Date(x.end)]);
    } catch (e) {
      // Before Google is connected, the database remains usable for the first setup screen.
      if (!String(e.message).includes('not connected')) throw e;
    }

    const slots=[];
    for(let m=WORK_START*60;m+duration<=WORK_END*60;m+=INTERVAL){
      const s=new Date(slotDate(date,m));
      const e=new Date(s.getTime()+duration*60000);
      const isBusy=busy.some(([bs,be])=>overlap(s,e,bs,be));
      if(!isBusy && s > new Date()) slots.push({time:s.toISOString(), label:s.toLocaleTimeString('en-KE',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:TZ})});
    }
    json(res,200,{date,duration,timeZone:TZ,slots});
  } catch(error){ json(res,500,{error:error.message||'Unable to load availability.'}); }
}
