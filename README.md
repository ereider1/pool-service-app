# Pool Service App — VS Code Starter

## Project goal

Build a very simple mobile-first pool-service app.

### Technician experience

The pool guy should see ONE screen only:

1. Enter pH
2. Enter chlorine
3. Upload a photo of the visual water test
4. Upload pool/filter/equipment photos
5. Enter chemicals added
6. Optional additional notes
7. Tap **SAVE VISIT**
8. See **Visit Saved!**
9. Start another blank visit

He should NOT see:
- visit history
- dashboard
- previous submissions
- navigation menus
- admin tools

Keep the technician workflow extremely fast and phone-friendly.

### Owner/admin experience

A separate private `/admin` area is for the owner.

Dashboard:
- Visits today
- Pools serviced this week
- Needs Review
- Chemical additions
- Search/filter visits
- Visit list, newest first
- Automatic status: Normal / Check / Needs Attention

Visit detail:
- Date/time
- Customer/pool
- Technician
- pH
- Chlorine
- Water-test strip photo
- Pool/filter/equipment photos
- Chemicals and amounts
- Notes

## Data model

Supabase/Postgres:

### customers
- id uuid primary key
- name text
- address text
- pool_name text
- created_at timestamptz

### visits
- id uuid primary key
- customer_id uuid nullable -> customers.id
- technician_id uuid nullable
- visited_at timestamptz
- ph numeric
- chlorine numeric
- notes text
- status text
- created_at timestamptz

### visit_chemicals
- id uuid primary key
- visit_id uuid -> visits.id
- chemical text
- amount numeric
- unit text

### visit_photos
- id uuid primary key
- visit_id uuid -> visits.id
- photo_type text
- storage_path text
- created_at timestamptz

photo_type values:
- test_strip
- pool
- filter
- equipment
- other

## Storage

Use Supabase Storage for images.

Recommended bucket:
`pool-photos`

Store files under:
`{visit_id}/{photo_type}/{unique_filename}`

Do NOT store image binary data in Postgres.

## Security

Technician:
- can create visits
- can upload photos
- should not be able to read visit history
- should not access `/admin`

Owner:
- authenticated access to `/admin`
- can read all visits/photos/chemicals

Use Supabase Auth + Row Level Security.

Never put a Supabase service-role/secret key in browser code.

## Water-test UI

The Water Test section must contain:
- pH numeric input
- Chlorine numeric input
- Required test-strip photo

Keep the test-strip photo visually separate from general service photos.

## General photo UI

Separate section:
**Pool & Filter Photos**

Technician can take multiple photos.

## Chemical UI

Repeatable rows:
- Chemical
- Amount
- Unit: lbs / oz / gal / other
- Remove row
- + Add Chemical

## Validation

Before SAVE VISIT:
- pH required, numeric, 0–14
- chlorine required, numeric, >= 0
- test-strip photo required

Then upload photos and insert visit + chemical rows.

On success:
**Visit Saved!**
"Everything has been recorded."
Button: **Start Another Visit**

## Initial preferred ranges

These are UI guidance only and should be configurable later:
- pH: 7.2–7.8
- Chlorine: 1.0–3.0 ppm

Status logic should be configurable rather than hard-coded permanently.

## Suggested stack

- Next.js + TypeScript
- Tailwind CSS
- Supabase JS client
- Supabase Postgres
- Supabase Storage
- Supabase Auth
- Vercel deployment

## Routes

`/`
- technician submission screen

`/admin`
- owner dashboard

`/admin/visits/[id]`
- visit detail

## UI direction

The prototype established:
- dark blue header
- bright blue primary action
- white cards
- rounded corners
- mobile-first layout
- large touch targets
- numbered sections
- minimal text

Do not add unnecessary navigation to the technician screen.

## Important product decision

The app is intentionally split into two experiences:

TECHNICIAN = capture data quickly
OWNER = review/manage data

Do not merge these into one dashboard.

## Next implementation steps

1. Create Next.js app.
2. Connect Supabase project.
3. Create database schema and RLS policies.
4. Create `pool-photos` storage bucket and policies.
5. Build technician form.
6. Implement image compression before upload.
7. Implement visit transaction/save flow.
8. Build owner authentication.
9. Build admin dashboard.
10. Build visit detail/photo gallery.
11. Test mobile camera/photo workflow.
12. Deploy to Vercel.

## Current Supabase project

Organization:
`ereider1`

Project:
`pool-service`

Region:
`ap-southeast-1`

The project was created at the $0/month plan confirmed during setup.

Use the project's Connect/API settings to obtain environment variables. Do not commit secrets.

## Suggested environment variables

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

Use server-only secret keys only in server-side code if ever required.

## Reference implementation notes

The prototype was designed to look approximately like:

Pool Service
New Pool Visit
[current date]

① Water Test
  pH              Chlorine (ppm)
  [ 7.4 ]         [ 2.0 ]
  Ideal...        Ideal...

  Test Strip Photo
  [ Take a photo of the visual test ]
  [ Add Test Photo ]

② Pool & Filter Photos
  [ Add Photo ] [photos...]

③ Chemicals Added
  [Chemical] [Amount] [Unit] [x]
  + Add Chemical

④ Additional Notes
  [ Anything worth noting... ]

  [ SAVE VISIT ]

After saving:
  ✓
  Visit Saved!
  Everything has been recorded.
  [ + Start Another Visit ]

## Development principle

Optimize for the technician's speed and reliability over feature count.
