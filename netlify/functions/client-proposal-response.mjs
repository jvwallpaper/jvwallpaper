import { verifyState, refreshGoogleAccess, zonedDate, MEASUREMENT_MINUTES, TZ, SUPABASE_URL } from './_shared.mjs';
import { sendMail, clientConfirmedEmail, ownerProposalResponseEmail, clientProposalDeclinedAckEmail } from './_email.mjs';

const SITE_URL='https://jv-wallpaper.netlify.app';

function page(title,message,buttonLabel='Back to JV Wallpaper',buttonUrl=SITE_URL){
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body style="margin:0;background:#f3f0e9;color:#24211d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:70px auto;padding:34px;background:#fff;border:1px solid #ddd7cc"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#766d62">JV Wallpaper</div><h1 style="font-family:Georgia,serif;font-weight:500;font-size:36px;margin:10px 0 16px">${esc(title)}</h1><p style="font-size:17px;line-height:1.55">${esc(message)}</p><a href="${esc(buttonUrl)}" style="display:inline-block;margin-top:16px;background:#26231e;color:#fff;text-decoration:none;padding:13px 18px">${esc(buttonLabel)}</a></main></body></html>`,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

function serviceHeaders(extra={}){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in Netlify');
  return {apikey:key,Authorization:`Bearer ${key}`,...extra};
}

async function getAppointment(id){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/appointment_requests?id=eq.${encodeURIComponent(id)}&select=*`,{headers:serviceHeaders()});
  if(!r.ok) throw new Error('Could not load appointment');
  const rows=await r.json();
  if(!rows[0]) throw new Error('Appointment not found');
  return rows[0];
}

async function patchAppointment(id,patch){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/appointment_requests?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:serviceHeaders({'Content-Type':'application/json','Prefer':'return=representation'}),body:JSON.stringify(patch)});
  if(!r.ok) throw new Error('Could not update appointment');
  return await r.json();
}

async function upsertCalendarEvent(a,date,time){
  const start=zonedDate(date,time);
  const end=new Date(start.getTime()+MEASUREMENT_MINUTES*60000);
  const {access_token}=await refreshGoogleAccess();
  const event={
    summary:`JV Wallpaper Measurement – ${a.first_name} ${a.last_name}`,
    location:`${a.address}, ${a.city}, ${a.state} ${a.zip}`,
    description:[`Client: ${a.first_name} ${a.last_name}`,`Phone: ${a.phone}`,`Email: ${a.email}`,`Service: ${a.service_type||''}`,`Room/Area: ${a.room_type||''}`,`Wallpaper status: ${a.wallpaper_status||''}`,`Project notes: ${a.project_notes||''}`,`Appointment ID: ${a.id}`].join('\n'),
    start:{dateTime:start.toISOString(),timeZone:TZ},
    end:{dateTime:end.toISOString(),timeZone:TZ}
  };
  const hasEvent=Boolean(a.google_event_id);
  const url=hasEvent
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(a.google_event_id)}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const r=await fetch(url,{method:hasEvent?'PATCH':'POST',headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},body:JSON.stringify(event)});
  const data=await r.json();
  if(!r.ok) throw new Error(data.error?.message||'Could not update Google Calendar');
  return data;
}

export default async (req)=>{
  try{
    if(req.method!=='GET') return new Response('Method not allowed',{status:405});
    const url=new URL(req.url);
    const action=url.searchParams.get('action');
    const token=url.searchParams.get('token');
    if(!['accept','decline','new_request'].includes(action)) throw new Error('Invalid response');
    const state=verifyState(token);
    if(state.purpose!=='proposal-response') throw new Error('Invalid response link');
    const a=await getAppointment(state.appointment_id);
    const date=state.proposed_date;
    const time=state.proposed_time;

    // Links are tied to the exact proposal so an old email cannot change a newer proposal.
    if(a.proposed_date!==date || a.proposed_time!==time){
      if(action==='accept' && a.status==='confirmed' && a.requested_date===date && a.requested_time===time){
        return page('Appointment already confirmed',`Your measurement is already confirmed for ${date} at ${time}.`);
      }
      return page('This link is no longer active','A newer appointment update has already been made. Please use the most recent email from JV Wallpaper.');
    }

    if(action==='accept'){
      if(a.status!=='alternative_proposed') return page('This proposal is no longer pending','This appointment has already been updated.');
      const g=await upsertCalendarEvent(a,date,time);
      const patch={status:'confirmed',requested_date:date,requested_time:time,proposed_date:null,proposed_time:null,google_event_id:g.id||a.google_event_id||null};
      await patchAppointment(a.id,patch);
      const finalAppt={...a,...patch};
      try{await sendMail(clientConfirmedEmail(finalAppt));}catch(e){console.error('client confirmation email',e)}
      try{await sendMail(ownerProposalResponseEmail(a,'accept',date,time));}catch(e){console.error('owner response email',e)}
      return page('Your appointment is confirmed',`Thank you, ${a.first_name}. Your JV Wallpaper measurement is confirmed for ${date} at ${time}.`);
    }

    if(a.status==='alternative_proposed'){
      await patchAppointment(a.id,{status:'proposal_declined'});
    }
    try{await sendMail(ownerProposalResponseEmail(a,action,date,time));}catch(e){console.error('owner response email',e)}

    if(action==='new_request'){
      return Response.redirect(`${SITE_URL}/?reschedule=1#schedule`,302);
    }

    try{await sendMail(clientProposalDeclinedAckEmail(a));}catch(e){console.error('client decline ack email',e)}
    return page('Thanks for letting us know','JV Wallpaper has been notified that the proposed time does not work. You can request another time whenever you’re ready.','Request a Different Time',`${SITE_URL}/?reschedule=1#schedule`);
  }catch(e){
    console.error(e);
    return page('We could not process this response','The response link may have expired or the appointment may already have been updated. Please contact JV Wallpaper at 703-901-1064.');
  }
};
