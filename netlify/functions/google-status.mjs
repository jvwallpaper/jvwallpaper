import { json, preflight, verifyOwner, getGoogleConnection } from './_shared.mjs';
export default async (req)=>{const pf=preflight(req);if(pf)return pf;try{await verifyOwner(req);const c=await getGoogleConnection();return json({connected:!!c?.refresh_token,connected_at:c?.connected_at||null});}catch(e){return json({error:e.message},401)}};
