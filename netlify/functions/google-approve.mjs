import { json, preflight, verifyOwner, refreshGoogleAccess, supabaseSelectAppointment, supabasePatchAppointment, zonedDate, MEASUREMENT_MINUTES, TZ } from './_shared.mjs';
export default async (req)=>{
  const pf=preflight(req);if(pf)return pf;
  try{
    const {auth}=await verifyOwner(req); const {appointment_id}=await req.json();
    let appt=await supabaseSelectAppointment(appointment_id,auth);
    if(appt.google_event_id){ if(appt.status!=='confirmed')await supabasePatchAppointment(appt.id,{status:'confirmed'},auth); return json({ok:true,event_id:appt.google_event_id,already_exists:true}); }
    let date=appt.requested_date,time=appt.requested_time;
    if(appt.proposed_date&&appt.proposed_time){date=appt.proposed_date;time=appt.proposed_time;}
    const start=zonedDate(date,time), end=new Date(start.getTime()+MEASUREMENT_MINUTES*60000);
    const {access_token}=await refreshGoogleAccess();
    const event={
      summary:`JV Wallpaper Measurement – ${appt.first_name} ${appt.last_name}`,
      location:`${appt.address}, ${appt.city}, ${appt.state} ${appt.zip}`,
      description:[
        `Client: ${appt.first_name} ${appt.last_name}`,
        `Phone: ${appt.phone}`,
        `Email: ${appt.email}`,
        `Service: ${appt.service_type||''}`,
        `Room/Area: ${appt.room_type||''}`,
        `Wallpaper status: ${appt.wallpaper_status||''}`,
        `Project notes: ${appt.project_notes||''}`,
        `Appointment ID: ${appt.id}`
      ].join('\n'),
      start:{dateTime:start.toISOString(),timeZone:TZ},
      end:{dateTime:end.toISOString(),timeZone:TZ}
    };
    const gres=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',{method:'POST',headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},body:JSON.stringify(event)});
    const g=await gres.json(); if(!gres.ok)throw new Error(g.error?.message||'Could not create Google Calendar event');
    const patch={status:'confirmed',google_event_id:g.id};
    if(appt.proposed_date&&appt.proposed_time){patch.requested_date=date;patch.requested_time=time;patch.proposed_date=null;patch.proposed_time=null;}
    await supabasePatchAppointment(appt.id,patch,auth);
    return json({ok:true,event_id:g.id,html_link:g.htmlLink||null});
  }catch(e){return json({error:e.message},400)}
};
