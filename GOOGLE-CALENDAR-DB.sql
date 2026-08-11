alter table public.appointment_requests
add column if not exists google_event_id text;
