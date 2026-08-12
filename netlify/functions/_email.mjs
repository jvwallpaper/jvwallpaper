
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
export function clientProposedEmail(a,date,time,token){
  const base=`${SITE_URL}/.netlify/functions/client-proposal-response`;
  const accept=`${base}?action=accept&token=${encodeURIComponent(token)}`;
  const decline=`${base}?action=decline&token=${encodeURIComponent(token)}`;
  const different=`${base}?action=new_request&token=${encodeURIComponent(token)}`;
  return {
    to:a.email,
    subject:'JV Wallpaper — New Measurement Time Proposed',
    text:`Hi ${a.first_name||''},

We’re unable to make the original requested time, but JV Wallpaper can offer:

${date} at ${time}

Accept new time: ${accept}
Decline this time: ${decline}
Request a different time: ${different}

JV Wallpaper
703-901-1064`,
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222">
      <h2>New Measurement Time Proposed</h2>
      <p>Hi ${esc(a.first_name)},</p>
      <p>We’re unable to make the original requested time, but we can offer:</p>
      <div style="padding:16px;background:#eef0f6;margin:18px 0"><b>${esc(date)} at ${esc(time)}</b></div>
      <p>Please choose one of the options below:</p>
      <p style="margin:22px 0">
        <a href="${esc(accept)}" style="display:inline-block;background:#48644b;color:#fff;text-decoration:none;padding:12px 16px;margin:0 8px 8px 0;border-radius:3px">Accept New Time</a>
        <a href="${esc(decline)}" style="display:inline-block;background:#fff;color:#7a3f39;text-decoration:none;padding:11px 16px;margin:0 8px 8px 0;border:1px solid #b99a95;border-radius:3px">Decline</a>
        <a href="${esc(different)}" style="display:inline-block;background:#26231e;color:#fff;text-decoration:none;padding:12px 16px;margin:0 8px 8px 0;border-radius:3px">Request a Different Time</a>
      </p>
      <p style="font-size:13px;color:#777">Accepting the new time will automatically confirm the appointment and update JV Wallpaper’s calendar.</p>
      <p style="margin-top:28px">JV Wallpaper<br>703-901-1064</p>
    </div>`
  };
}

export function ownerProposalResponseEmail(a,action,date,time){
  const client=`${a.first_name||''} ${a.last_name||''}`.trim();
  const labels={accept:'accepted the new time',decline:'declined the proposed time',new_request:'chose to request a different time'};
  const label=labels[action]||'responded to the proposed time';
  return {
    to:OWNER_EMAIL,
    replyTo:a.email,
    subject:`Measurement Update — ${client}`,
    text:`${client} ${label}.

Proposed time: ${date} at ${time}
Phone: ${a.phone||''}
Email: ${a.email||''}

Owner dashboard: ${SITE_URL}/#admin`,
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222">
      <h2>Measurement Appointment Update</h2>
      <p><b>${esc(client)}</b> ${esc(label)}.</p>
      <div style="padding:16px;background:#f5f3ee;margin:18px 0"><b>${esc(date)} at ${esc(time)}</b></div>
      <p>${esc(a.phone||'')}<br>${esc(a.email||'')}</p>
      <p style="margin-top:22px"><a href="${SITE_URL}/#admin" style="display:inline-block;background:#26231e;color:#fff;text-decoration:none;padding:12px 18px">Open Owner Dashboard</a></p>
    </div>`
  };
}

export function clientProposalDeclinedAckEmail(a){
  return {
    to:a.email,
    subject:'JV Wallpaper — We Received Your Response',
    text:`Hi ${a.first_name||''},

Thanks for letting us know the proposed measurement time does not work. JV Wallpaper has been notified.

You can submit another measurement request here: ${SITE_URL}/#schedule

JV Wallpaper
703-901-1064`,
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222"><h2>Thanks for letting us know</h2><p>Hi ${esc(a.first_name)},</p><p>We received your response that the proposed measurement time does not work. JV Wallpaper has been notified.</p><p><a href="${SITE_URL}/#schedule" style="display:inline-block;background:#26231e;color:#fff;text-decoration:none;padding:12px 16px">Request a Different Time</a></p><p style="margin-top:28px">JV Wallpaper<br>703-901-1064</p></div>`
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
