import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

export const SITE_URL = 'https://jv-wallpaper.netlify.app';
export const SUPABASE_URL = 'https://dzfnlyoztxibztnqnfbw.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_rGr5QIctEsAwfp3GfAmdrA_4gutV-vH';
export const OWNER_UID = '31b8b10f-dcaa-46d2-a489-573249209784';
export const GOOGLE_REDIRECT_URI = `${SITE_URL}/.netlify/functions/google-oauth-callback`;
export const TZ = 'America/New_York';
export const MEASUREMENT_MINUTES = 45;

export function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };
}
export function json(data, status=200){ return new Response(JSON.stringify(data), {status, headers:corsHeaders()}); }
export function preflight(req){ return req.method === 'OPTIONS' ? new Response('', {status:204, headers:corsHeaders()}) : null; }

export async function verifyOwner(req){
  const auth = req.headers.get('authorization') || '';
  if(!auth.startsWith('Bearer ')) throw new Error('Not signed in');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {headers:{apikey:SUPABASE_KEY, Authorization:auth}});
  if(!res.ok) throw new Error('Invalid session');
  const user = await res.json();
  if(user.id !== OWNER_UID) throw new Error('Not authorized');
  return { user, auth };
}

export function signState(payload){
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if(!secret) throw new Error('GOOGLE_CLIENT_SECRET is missing');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function verifyState(state){
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if(!secret || !state || !state.includes('.')) throw new Error('Invalid state');
  const [body,sig] = state.split('.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if(sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('Invalid state');
  const payload = JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
  if(payload.exp < Date.now()) throw new Error('Expired state');
  return payload;
}

function tokenStore(){ return getStore('jv-google-calendar'); }
export async function saveGoogleConnection(data){ await tokenStore().set('connection', JSON.stringify(data)); }
export async function getGoogleConnection(){
  const raw = await tokenStore().get('connection', {type:'text'});
  return raw ? JSON.parse(raw) : null;
}
export async function clearGoogleConnection(){ await tokenStore().delete('connection'); }

export async function refreshGoogleAccess(){
  const conn = await getGoogleConnection();
  if(!conn?.refresh_token) throw new Error('Google Calendar is not connected');
  if(conn.access_token && conn.expires_at && Date.now() < conn.expires_at - 60000) return {access_token:conn.access_token, conn};
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: conn.refresh_token,
    grant_type: 'refresh_token'
  });
  const res = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const data = await res.json();
  if(!res.ok) throw new Error(data.error_description || data.error || 'Could not refresh Google access');
  const next = {...conn, access_token:data.access_token, expires_at:Date.now()+(data.expires_in||3600)*1000};
  await saveGoogleConnection(next);
  return {access_token:data.access_token, conn:next};
}

export function parseDisplayTime(s){
  const m=String(s).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if(!m) throw new Error(`Invalid appointment time: ${s}`);
  let h=+m[1], min=+m[2]; const ap=m[3].toUpperCase();
  if(ap==='PM'&&h!==12)h+=12; if(ap==='AM'&&h===12)h=0;
  return {h,min};
}
function partsInTZ(date){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,+p.value]));
}
export function zonedDate(dateStr, timeStr){
  const [y,mo,d]=dateStr.split('-').map(Number); const {h,min}=parseDisplayTime(timeStr);
  const desired=Date.UTC(y,mo-1,d,h,min,0); let guess=desired;
  for(let i=0;i<3;i++){
    const p=partsInTZ(new Date(guess));
    const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second||0);
    guess += desired-represented;
  }
  return new Date(guess);
}

export async function supabaseSelectAppointment(id, auth){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/appointment_requests?id=eq.${encodeURIComponent(id)}&select=*`,{headers:{apikey:SUPABASE_KEY,Authorization:auth}});
  if(!res.ok) throw new Error(await res.text());
  const rows=await res.json(); if(!rows[0]) throw new Error('Appointment not found'); return rows[0];
}
export async function supabasePatchAppointment(id, patch, auth){
  const res=await fetch(`${SUPABASE_URL}/rest/v1/appointment_requests?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{apikey:SUPABASE_KEY,Authorization:auth,'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(patch)});
  if(!res.ok) throw new Error(await res.text());
  return await res.json();
}
