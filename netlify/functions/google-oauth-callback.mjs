import { GOOGLE_REDIRECT_URI, SITE_URL, saveGoogleConnection, verifyState } from './_shared.mjs';
export default async (req) => {
  try{
    const u=new URL(req.url); const code=u.searchParams.get('code'); const state=u.searchParams.get('state');
    if(!code) throw new Error(u.searchParams.get('error')||'No authorization code returned');
    verifyState(state);
    const body=new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID||'',client_secret:process.env.GOOGLE_CLIENT_SECRET||'',redirect_uri:GOOGLE_REDIRECT_URI,grant_type:'authorization_code'});
    const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
    const data=await res.json(); if(!res.ok) throw new Error(data.error_description||data.error||'Google token exchange failed');
    if(!data.refresh_token) throw new Error('Google did not return a refresh token. Reconnect and approve access again.');
    await saveGoogleConnection({refresh_token:data.refresh_token,access_token:data.access_token,expires_at:Date.now()+(data.expires_in||3600)*1000,scope:data.scope||'',connected_at:new Date().toISOString()});
    return Response.redirect(`${SITE_URL}/?google=connected#admin`,302);
  }catch(e){
    return Response.redirect(`${SITE_URL}/?google=error&message=${encodeURIComponent(e.message)}#admin`,302);
  }
};
