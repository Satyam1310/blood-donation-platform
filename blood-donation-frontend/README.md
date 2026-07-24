# Blood Donation Frontend

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` — update `VITE_API_URL` if your backend runs somewhere other than `http://localhost:5000/api`
3. `npm run dev`
4. Open `http://localhost:5173` (make sure the backend is running too)

## Pages

- `/` — landing page
- `/signup`, `/login` — auth (single "donor" role — no separate recipient account)
- `/dashboard` (protected) — profile summary (name, blood group, city, availability),
  editable profile (update city/pincode/availability — e.g. after moving cities),
  donation history with add/edit/delete, milestones, next-eligible-date calculator.
  Blood group is no longer asked for when logging a donation — it's read from your
  profile automatically. Logging blocks a duplicate entry for the same calendar date.
- `/start-request` (protected) — the "become a recipient" flow: pick blood type, drop a
  pin on a map, and attach a hospital document. The request goes live immediately —
  no admin approval.
- `/search` — multi-filter donor search (blood group, city, availability, eligibility)
- `/requests` — browse open blood requests, respond as a donor, or report a request
  as fake/spam. A request auto-removes itself once it collects 10 reports — moderation
  is fully public, not admin-gated.
- `/benefits` — static content page
- `/myths` — static myths vs. facts page

## Map

`LocationPicker` uses `react-leaflet` with free OpenStreetMap tiles — no API key
required. It centers on India by default, supports "use my location" via the
browser's geolocation API, and drops a pin wherever the user clicks.

## Design tokens

Defined in `tailwind.config.js`:
- Colors: `crimson` (primary/urgent), `amber` (medium urgency), `teal` (available/eligible), `ink` (text), `bg` (background)
- Fonts: `font-display` (Fraunces, headings), `font-body` (Inter), `font-mono` (IBM Plex Mono, for stats/dates/blood-group codes)
- Signature element: `<PulseLine />` — an ECG-style divider used on the hero and dashboard eligibility card

## Notes

- Auth token is stored in `localStorage` and attached automatically via the Axios interceptor in `src/api/axios.js`
- `ProtectedRoute` redirects to `/login` if there's no valid session
- The donor search and request-browsing pages work without login; posting a request or responding to one requires auth
