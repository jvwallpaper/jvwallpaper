
import { json, preflight, verifyOwner, supabaseSelectAppointment, supabasePatchAppointment } from './_shared.mjs';
import { sendMail, clientProposedEmail, clientDeclinedEmail } from './_email.mjs';

export default async (req)=>{
  const pf=preflight(req);if(pf)return pf;
  try{
    const {auth}=await verifyOwner(req);
    const {appointment_id,action,proposed_date,proposed_time}=await req.json();
    const a=await supabaseSelectAppointment(appointment_id,auth);
    if(action==='propose'){
      if(!proposed_date||!proposed_time)throw new Error('New date and time are required');
      await supabasePatchAppointment(a.id,{status:'alternative_proposed',proposed_date,proposed_time},auth);
      await sendMail(clientProposedEmail(a,proposed_date,proposed_time));
      return json({ok:true});
    }
    if(action==='decline'){
      await supabasePatchAppointment(a.id,{status:'declined'},auth);
      await sendMail(clientDeclinedEmail(a));
      return json({ok:true});
    }
    throw new Error('Unsupported action');
  }catch(e){console.error(e);return json({error:e.message},400)}
};
