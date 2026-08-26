# Pool Service App — VS Code Starter

## Project goal

A very simple mobile-first pool-service app.

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

Recommended bucket:
`pool-photos`


## Security

Technician:
- can create visits
- can upload photos
- should not be able to read visit history
- should not access `/admin`

Owner:
- authenticated access to `/admin`
- can read all visits/photos/chemicals


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
- Unit: kg / oz / gal / other
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

