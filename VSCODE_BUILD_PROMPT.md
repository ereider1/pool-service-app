# VS Code / Codex build prompt

You are continuing development of the Pool Service app.

Read README.md and supabase/schema.sql first.

Build this as a production-quality Next.js + TypeScript + Tailwind + Supabase app.

CRITICAL UX:
The technician route `/` must be one extremely simple mobile-first form. No history, dashboard, menu, or previous visits.

Required technician fields:
- pH
- chlorine ppm
- REQUIRED water-test strip photo
- multiple pool/filter/equipment photos
- repeatable chemicals (name, amount, unit)
- optional notes

Save flow:
1. Validate fields.
2. Create visit.
3. Upload test-strip photo to Supabase Storage.
4. Upload general photos.
5. Insert photo metadata.
6. Insert chemical rows.
7. Show success state.
8. Allow starting another blank visit.

Do not expose historical data to the technician.

Admin:
Create `/admin` behind Supabase Auth.
Show:
- visits today
- visits this week
- needs review
- chemical additions
- newest visits
- search/filter
- status badges

Create `/admin/visits/[id]` with all measurements, test-strip image, service photos, chemicals, notes, and timestamp.

Use RLS. Do not expose service-role keys in client code.

For photo uploads:
- compress/resize images client-side before upload where appropriate
- use unique paths
- store only paths/metadata in Postgres

Keep the existing visual direction:
dark navy header, bright blue CTA, white rounded cards, numbered sections, large touch targets, clean mobile-first layout.

Do not add features not requested without first preserving the simple technician workflow.

After implementation, test:
- mobile layout
- camera upload
- multiple photo upload
- required test-strip photo
- invalid pH
- invalid chlorine
- chemicals
- notes
- successful save
- technician cannot read history
- admin can view visit and photos
