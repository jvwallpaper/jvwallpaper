JV Wallpaper – Google Calendar Integration

This package contains the live website plus Netlify Functions for:
- Connect Google Calendar once from the Owner dashboard
- Add an approved measurement to Google Calendar automatically
- Hide Google Calendar busy times from customer appointment choices

BEFORE DEPLOYING
1) Netlify Environment Variables must already contain:
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
2) In Supabase SQL Editor, run GOOGLE-CALENDAR-DB.sql once.
3) Google OAuth redirect URI must be:
   https://jv-wallpaper.netlify.app/.netlify/functions/google-oauth-callback

DEPLOYMENT
Because this package contains Netlify Functions, use Netlify CLI rather than the normal single-file drag-and-drop.

On Mac Terminal:
  cd ~/Downloads/jv-calendar-package
  npm install
  npx netlify login
  npx netlify link --name jv-wallpaper
  npx netlify deploy --prod

When Netlify asks for a publish directory, use:
  .

After deployment:
1) Open https://jv-wallpaper.netlify.app
2) Owner -> sign in
3) Google Calendar -> Connect Google Calendar
4) Approve Google permissions
5) Submit a test appointment and approve it
6) Confirm the event appears in Google Calendar

Do not put your GOOGLE_CLIENT_SECRET in any HTML file or share it in chat.
