import { json, preflight, refreshGoogleAccess, zonedDate, MEASUREMENT_MINUTES } from './_shared.mjs';
export default async (req)=>{
  const pf=preflight(req);if(pf)return pf;
  try{
    const {date,times=[]}=await req.json(); if(!date||!Array.isArray(times))return json({blocked:[]});
    let access_token; try{({access_token}=await refreshGoogleAccess())}catch{return json({blocked:[]})}
    const dayStart=zonedDate(date,'12:00 AM');
    const next=new Date(dayStart.getTime()+30*60*60*1000);
    const ymd=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(next);
    const dayEnd=zonedDate(ymd,'12:00 AM');
    const res=await fetch('https://www.googleapis.com/calendar/v3/freeBusy',{method:'POST',headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},body:JSON.stringify({timeMin:dayStart.toISOString(),timeMax:dayEnd.toISOString(),items:[{id:'primary'}]})});
    const data=await res.json(); if(!res.ok)throw new Error(data.error?.message||'Free/busy lookup failed');
    const busy=data.calendars?.primary?.busy||[];
    const blocked=times.filter(t=>{
      const s=zonedDate(date,t),e=new Date(s.getTime()+MEASUREMENT_MINUTES*60000);
      return busy.some(b=>s < new Date(b.end) && e > new Date(b.start));
    });
    return json({blocked});
  }catch(e){return json({blocked:[],warning:e.message})}
};
