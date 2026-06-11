# PartyPop 🍭 — Vercel production-ready

Mobile-first, RTL Hebrew, dark-neon SaaS for micro-event attractions.
Booking in 30 seconds · Ambassador referral links · Parent (PIN) admin mode.

## Pages
- `/` landing + packages
- `/book` 3-step booking wizard (saves referral code automatically)
- `/a/[slug]` ambassador referral landing (e.g. `/a/dani`)
- `/ambassador` ambassador hub: personal link, QR, WhatsApp share, tiers & wallet
- `/admin` parent control mode (PIN, default 2468)
- `POST/GET /api/bookings` API (Supabase if configured, in-memory demo otherwise)

## Auth (Google + SMS)
Login lives at `/login` and uses Supabase Auth:
- Google: enable the Google provider in Supabase → Authentication → Providers (paste OAuth client ID/secret from Google Cloud Console).
- SMS: enable Phone provider in Supabase and connect Twilio (or another SMS provider).
Without Supabase the page runs in demo mode (code 1234) so the flow is always testable.

## Commission rules
- 30₪ to the direct ambassador, 10₪ to whoever recruited that ambassador.
- Created ONLY when admin marks a booking "paid & completed" — never before.
- Admin → Ambassadors tab shows pending payouts and a one-tap "mark as paid".

## Deploy to Vercel (5 minutes)
1. Push this folder to GitHub.
2. In Vercel: New Project → import the repo → Framework: Next.js → Deploy.
3. (Optional, for persistence) Create a Supabase project, run `supabase/schema.sql`
   in the SQL editor, then add Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PIN` (your parent-mode PIN)
   - `NEXT_PUBLIC_WHATSAPP_PHONE` (e.g. 9725XXXXXXXX)
4. Redeploy. Done. Without Supabase the app still works in demo mode.

## Local dev
```bash
npm install
npm run dev
```

## Maintenance-friendly by design
- One small codebase, no custom server, no passwords to manage.
- All prices/packages in `lib/data.ts` (move to the `packages` table later).
- Design tokens centralised in `tailwind.config.ts` + `app/globals.css`.
