# Blood Donation Backend

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `MONGO_URI` — get a free cluster at https://www.mongodb.com/cloud/atlas
   - `JWT_SECRET` — any long random string
3. `npm run dev` (requires nodemon) or `npm start`
4. Server runs at `http://localhost:5000`, health check at `/api/health`

## API Endpoints

### Auth
- `POST /api/auth/signup` — body: `{ name, email, password, phone, role, bloodGroup, city, pincode }`
  `role` is `"donor"` (default), `"hospital"`, or `"admin"`. There is no separate "recipient"
  role — any donor can start their own blood request from the dashboard.
  (bloodGroup/city only needed if role is "donor" — creates their DonorProfile automatically)
- `POST /api/auth/login` — body: `{ email, password }`
- `GET /api/auth/me` — requires `Authorization: Bearer <token>` header

### Donors
- `GET /api/donors/search?bloodGroup=O+&city=Delhi&availableOnly=true&eligibleOnly=true` — public
- `GET /api/donors/me` — auth required
- `PUT /api/donors/me` — auth required, update profile (blood group, city, pincode,
  availability — use this when a donor moves to a different city)
- `POST /api/donors/history` — auth required, body: `{ date, location, hospital, unitsGiven, bloodGroup? }`.
  `bloodGroup` is optional — if omitted, it's pulled from the donor's profile automatically.
  Rejects with 409 if a record already exists for the same calendar date (duplicate prevention).
- `PUT /api/donors/history/:id` — auth required, edit one of your own records
- `DELETE /api/donors/history/:id` — auth required, delete one of your own records
  (also useful for manually clearing out any duplicate entries)
- `GET /api/donors/history` — auth required, returns donor summary (name, blood group, city),
  records, milestones, and eligibility

### Requests
- `GET /api/requests?status=open&bloodGroup=A+&city=Delhi` — public
- `POST /api/requests` — auth required, **multipart/form-data** (not JSON):
  fields `bloodGroup`, `hospital`, `city`, `unitsNeeded`, `urgency`, `lat`, `lng`,
  plus a file field named `document` (PDF/JPG/PNG, max 5MB) — the hospital
  proof for the request. Requests go **live immediately** — there is no admin
  approval step.
- `PUT /api/requests/:id/respond` — auth required, donor responds to a request
- `PUT /api/requests/:id/status` — auth required, requester updates status
- `PUT /api/requests/:id/report` — auth required, any user (except the requester)
  can report a request. Once a request collects 10 unique reports, it's
  automatically set to `status: "removed"` — moderation is entirely public/community-driven.
- Uploaded documents are served statically at `/uploads/verification-docs/<filename>`

## Testing

Use Postman or Thunder Client. Typical flow:
1. Signup a donor → copy the returned `token`
2. Add `Authorization: Bearer <token>` header for protected routes
3. Add a donation record (blood group can be omitted — it's read from your profile),
   then GET `/api/donors/history` to see milestones
4. Try adding a second record for the same date — should get a 409 duplicate error
5. POST `/api/requests` as `multipart/form-data` with a map lat/lng and a document file attached
6. Search donors, respond to the request as another user
7. Report the request from a few different accounts and confirm it auto-removes at 10 reports
