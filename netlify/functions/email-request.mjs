
import { json, preflight } from './_shared.mjs';
import { sendMail, ownerRequestEmail, clientRequestEmail, emailOk } from './_email.mjs';

export default async (req)=>{
  const pf=preflight(req);if(pf)return pf;
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const a=await req.json();
    if(!emailOk(a.email))throw new Error('Invalid client email');
    const required=['first_name','last_name','phone','address','city','state','zip','requested_date','requested_time'];
    if(required.some(k=>!String(a[k]||'').trim()))throw new Error('Missing required appointment information');
    await Promise.all([sendMail(ownerRequestEmail(a)),sendMail(clientRequestEmail(a))]);
    return json({ok:true});
  }catch(e){console.error(e);return json({error:e.message},400)}
};

export const config={
  rateLimit:{windowLimit:5,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}
};
