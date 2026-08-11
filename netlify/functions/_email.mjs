
import nodemailer from 'nodemailer';

const SITE_URL = 'https://jv-wallpaper.netlify.app';
const OWNER_EMAIL = 'jvillatoro86@gmail.com';

function esc(s=''){
  return String(s ?? '').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
export function emailOk(v=''){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}
function getTransport(){
  const user=process.env.GMAIL_USER;
  const pass=process.env.GMAIL_APP_PASSWORD;
  if(!user || !pass) throw new Error('Email is not configured');
  return nodemailer.createTransport({
    host:'smtp.gmail.com',
    port:465,
    secure:true,
    auth:{user,pass}
  });
}
export async function sendMail({to,subject,html,text,replyTo}){
  if(!emailOk(to)) throw new Error('Invalid recipient email');
  const user=process.env.GMAIL_USER;
  return await getTransport().sendMail({
    from:`"JV Wallpaper" <${user}>`,
    to,
    subject,
    html,
    text,
    replyTo:replyTo||user
  });
}
export function ownerRequestEmail(a){
  const client=`${a.first_name||''} ${a.last_name||''}`.trim();
  const when=`${a.requested_date||''} at ${a.requested_time||''}`;
  const address=`${a.address||''}, ${a.city||''}, ${a.state||''} ${a.zip||''}`;
  return {
    to:OWNER_EMAIL,
    replyTo:a.email,
    subject:`New Measurement Request — ${client}`,
    text:`New JV Wallpaper measurement request

Client: ${client}
Phone: ${a.phone||''}
Email: ${a.email||''}
Requested: ${when}
Address: ${address}
Service: ${a.service_type||''}
Room/Area: ${a.room_type||''}
Wallpaper status: ${a.wallpaper_status||''}
Project notes: ${a.project_notes||''}

Review: ${SITE_URL}/#admin`,
    html:`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222">
      <h2>New Measurement Request</h2>
      <p>A new request was submitted through JV Wallpaper.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#777">Client</td><td><b>${esc(client)}</b></td></tr>
        <tr><td style="padding:8px 0;color:#777">Phone</td><td>${esc(a.phone)}</td></tr>
        <tr><td style="padding:8px 0;color:#777">Email</td><td>${esc(a.email)}</td></tr>
        <tr><td style="padding:8px 0;color:#777">Requested</td><td><b>${esc(when)}</b></td></tr>
        <tr><td style="padding:8px 0;color:#777">Address</td><td>${esc(address)}</td></tr>
        <tr><td style="padding:8px 0;color:#777">Service</td><td>${esc(a.service_type)}</td></tr>
        <tr><td style="padding:8px 0;color:#777">Room / Area</td><td>${esc(a.room_type)}</td></tr>
        <tr><td style="padding:8px 0;color:#777">Wallpaper</td><td>${esc(a.wallpaper_status)}</td></tr>
      </table>
      ${a.project_notes?`<div style="margin-top:18px;padding:14px;background:#f5f3ee"><b>Project notes</b><br>${esc(a.project_notes)}</div>`:''}
      <p style="margin-top:22px"><a href="${SITE_URL}/#admin" style="display:inline-block;background:#26231e;color:#fff;text-decoration:none;padding:12px 18px">Open Owner Dashboard</a></p>
    </div>`
  };
}
export function clientRequestEmail(a){
  const when=`${a.requested_date||''} at ${a.requested_time||''}`;
  return {
    to:a.email,
    subject:'JV Wallpaper — Measurement Request Received',
    text:`Hi ${a.first_name||''},

Thank you for contacting JV Wallpaper. We received your measurement request for ${when}.

Status: Pending Approval

Your selected time is not confirmed yet. We will review your request and send you another email once it is approved or if another time is proposed.

JV Wallpaper
703-901-1064`,
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222">
      <h2>Measurement Request Received</h2>
      <p>Hi ${esc(a.first_name)},</p>
      <p>Thank you for contacting JV Wallpaper. We received your measurement request for:</p>
      <div style="padding:16px;background:#f5f3ee;margin:18px 0">
        <b>${esc(when)}</b><br><span style="color:#805b21">Status: Pending Approval</span>
      </div>
      <p>Your selected time is <b>not confirmed yet</b>. We’ll review your request and email you once it is approved or if another time is proposed.</p>
      <p style="margin-top:28px">JV Wallpaper<br>703-901-1064</p>
    </div>`
  };
}
export function clientConfirmedEmail(a){
  const date=a.proposed_date||a.requested_date||'';
  const time=a.proposed_time||a.requested_time||'';
  const address=`${a.address||''}, ${a.city||''}, ${a.state||''} ${a.zip||''}`;
  return {
    to:a.email,
    subject:'JV Wallpaper — Your Measurement Is Confirmed',
    text:`Hi ${a.first_name||''},

Your JV Wallpaper measurement appointment is confirmed.

Date: ${date}
Time: ${time}
Address: ${address}

Please make sure we can access the areas being measured. If you already have your wallpaper, samples, specifications, or installation information, please have them available.

JV Wallpaper
703-901-1064`,
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222">
      <h2>Your Measurement Is Confirmed</h2>
      <p>Hi ${esc(a.first_name)},</p>
      <p>Your JV Wallpaper measurement appointment is confirmed.</p>
      <div style="padding:16px;background:#edf3ea;margin:18px 0">
        <b>${esc(date)} at ${esc(time)}</b><br>${esc(address)}
      </div>
      <p>Please make sure we can access the areas being measured. If you already have your wallpaper, samples, specifications, or installation information, please have them available.</p>
      <p style="margin-top:28px">JV Wallpaper<br>703-901-1064</p>
    </div>`
  };
}
export function clientProposedEmail(a,date,time){
  return {
    to:a.email,
    subject:'JV Wallpaper — New Measurement Time Proposed',
    text:`Hi ${a.first_name||''},

We’re unable to make the original requested time, but JV Wallpaper can offer:

${date} at ${time}

Please contact us to confirm whether the new time works for you.

JV Wallpaper
703-901-1064`,
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222">
      <h2>New Measurement Time Proposed</h2>
      <p>Hi ${esc(a.first_name)},</p>
      <p>We’re unable to make the original requested time, but we can offer:</p>
      <div style="padding:16px;background:#eef0f6;margin:18px 0"><b>${esc(date)} at ${esc(time)}</b></div>
      <p>Please contact JV Wallpaper to confirm whether the new time works for you.</p>
      <p style="margin-top:28px">JV Wallpaper<br>703-901-1064</p>
    </div>`
  };
}
export function clientDeclinedEmail(a){
  return {
    to:a.email,
    subject:'JV Wallpaper — Measurement Request Update',
    text:`Hi ${a.first_name||''},

Thank you for contacting JV Wallpaper. We’re unable to confirm the measurement request you submitted at this time.

If you’d like to discuss another date or your project directly, please contact us at 703-901-1064.

JV Wallpaper`,
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222">
      <h2>Measurement Request Update</h2>
      <p>Hi ${esc(a.first_name)},</p>
      <p>Thank you for contacting JV Wallpaper. We’re unable to confirm the measurement request you submitted at this time.</p>
      <p>If you’d like to discuss another date or your project directly, please call <b>703-901-1064</b>.</p>
      <p style="margin-top:28px">JV Wallpaper</p>
    </div>`
  };
}
