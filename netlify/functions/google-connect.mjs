import { json, preflight, verifyOwner, signState, GOOGLE_REDIRECT_URI } from './_shared.mjs';
export default async (req) => {
  const pf=preflight(req); if(pf)return pf;
  try{
    await verifyOwner(req);
    const clientId=process.env.GOOGLE_CLIENT_ID;
    if(!clientId) throw new Error('GOOGLE_CLIENT_ID is missing');
    const state=signState({uid:'owner',exp:Date.now()+10*60*1000,nonce:crypto.randomUUID()});
    const p=new URLSearchParams({
      client_id:clientId,
      redirect_uri:GOOGLE_REDIRECT_URI,
      response_type:'code',
      access_type:'offline',
      prompt:'consent',
      include_granted_scopes:'true',
      scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
      state
    });
    return json({url:`https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`});
  }catch(e){return json({error:e.message},401)}
};
