import crypto from 'node:crypto';
import { getCalendarClient, waitForMeet } from '../_lib/google.js';
import { supabaseAdmin } from '../_lib/supabase.js';
import { GOOGLE_CALENDAR_ID, HOST_EMAIL } from '../_lib/config.js';
import { json, parseBody } from '../_lib/http.js';

const TZ='Africa/Nairobi';
const TYPES={
  discovery:{name:'Discovery Call',duration:30},
  strategy:{name:'Strategy Session',duration:60},
  audit:{name:'Digital Audit',duration:45},
  kickoff:{name:'Project Kickoff',duration:60}
};
function clean(v,max=2000){return String(v??'').trim().slice(0,max)}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function ref(){return `EP-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`}

export default async function handler(req,res){
  let bookingId=null; let googleEventId=null;
  try{
    if(req.method!=='POST') return json(res,405,{error:'Method not allowed.'});
    const body=await parseBody(req);
    const type=clean(body.meetingType,40); const mt=TYPES[type];
    const name=clean(body.name,120), email=clean(body.email,180).toLowerCase();
    const company=clean(body.company,160), website=clean(body.website,240), phone=clean(body.phone,60);
    const notes=clean(body.notes,4000), goals=clean(body.goals,2000), projectDetails=clean(body.projectDetails,4000);
    const startAt=new Date(body.startAt);
    if(!mt) return json(res,400,{error:'Choose a valid meeting type.'});
    if(!name||!validEmail(email)||Number.isNaN(startAt.getTime())) return json(res,400,{error:'Please provide a name, valid email, and time.'});
    if(startAt <= new Date()) return json(res,400,{error:'That time has already passed. Please choose another slot.'});
    const endAt=new Date(startAt.getTime()+mt.duration*60000);
    const supabase=supabaseAdmin();
    const bookingRef=ref();
    const cancellationToken=crypto.randomUUID();
    const rescheduleToken=crypto.randomUUID();
    const insert={booking_reference:bookingRef,name,email,company,website,phone,meeting_type:type,meeting_duration:mt.duration,meeting_title:mt.name,start_time:startAt.toISOString(),end_time:endAt.toISOString(),timezone:TZ,notes,goals,project_details:projectDetails,status:'pending',cancellation_token:cancellationToken,reschedule_token:rescheduleToken};
    const {data:booking,error:insertError}=await supabase.from('bookings').insert(insert).select('*').single();
    if(insertError){
      if(insertError.code==='23P01') return json(res,409,{error:'That slot was just booked. Please choose another time.'});
      throw insertError;
    }
    bookingId=booking.id;

    const {calendar}=await getCalendarClient();
    const eventBody={
      summary:`${mt.name} · ${name}`,
      description:[`Booking reference: ${bookingRef}`,`Client: ${name}`,company?`Company: ${company}`:'',phone?`Phone: ${phone}`:'',website?`Website: ${website}`:'',goals?`Goals:\n${goals}`:'',projectDetails?`Project details:\n${projectDetails}`:'',notes?`Notes:\n${notes}`:''].filter(Boolean).join('\n'),
      start:{dateTime:startAt.toISOString(),timeZone:TZ},
      end:{dateTime:endAt.toISOString(),timeZone:TZ},
      attendees:[{email,displayName:name}],
      conferenceData:{createRequest:{requestId:crypto.randomUUID(),conferenceSolutionKey:{type:'hangoutsMeet'}}}
    };
    const created=await calendar.events.insert({calendarId:GOOGLE_CALENDAR_ID,conferenceDataVersion:1,sendUpdates:'all',requestBody:eventBody});
    googleEventId=created.data.id;
    const meet=await waitForMeet(calendar,googleEventId);
    if(!meet.meetUrl) throw new Error('Google Calendar created the event but did not return a Google Meet link yet. Please try the booking again.');
    const {error:updateError}=await supabase.from('bookings').update({google_event_id:googleEventId,google_calendar_id:GOOGLE_CALENDAR_ID,google_meet_url:meet.meetUrl,status:'confirmed',updated_at:new Date().toISOString()}).eq('id',bookingId);
    if(updateError) throw updateError;
    return json(res,200,{booking:{reference:bookingRef,name,email,company,meetingType:mt.name,duration:mt.duration,startAt:startAt.toISOString(),endAt:endAt.toISOString(),timeZone:TZ,meetUrl:meet.meetUrl,googleEventId,calendarLink:meet.event?.htmlLink||null}});
  }catch(error){
    try{
      const supabase=supabaseAdmin();
      if(bookingId) await supabase.from('bookings').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',bookingId);
      if(googleEventId){ const {calendar}=await getCalendarClient(); await calendar.events.delete({calendarId:GOOGLE_CALENDAR_ID,eventId:googleEventId,sendUpdates:'all'}); }
    }catch(_cleanup){}
    json(res,500,{error:error.message||'Booking could not be completed.'});
  }
}
