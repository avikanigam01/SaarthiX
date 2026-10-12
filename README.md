# SaarthiX — Feature 1: real facility directory and admin management

This patch implements the first step only: populate the facility directory from public sources and make facility details editable in the existing admin facility detail screen. It does not implement the queue or patient QR features.

## Files and exact locations

Copy files into the repository root while preserving these paths:

- `supabase/migrations/20261012000200_facility_directory_provenance.sql`
- `supabase/seed/kanpur_facilities.sql`
- `src/pages/admin/facility-detail.tsx` (replace existing file)
- `src/types/database.ts` (replace existing file)

## Included

- Source URL, source check timestamp and source notes stored with each facility.
- Publicly sourced Kanpur Nagar facility entries (KPM Hospital, LLR Hospital, Regency Tower 1, Regency Tower 2, Regency Renal Sciences Hospital, The Panacea Multi Super Specialty Hospital, UHM Government Hospital).
- Imported facilities remain unverified. The patient-facing existing RLS/search is designed to show only active, verified facilities.
- Admin can edit facility details from the existing facility detail page.
- Existing admin verification and suspend/reactivate workflow is retained. Suspending hides a facility without breaking historical referrals/visits; this is safer than hard deletion of records referenced elsewhere.
- No patients, doctors, schedules, medicine stocks or service availability are invented.

## Apply safely

1. Create a Git branch and back up Supabase first.
2. Apply the migration `20261012000200_facility_directory_provenance.sql` in staging.
3. Run `supabase/seed/kanpur_facilities.sql` only after migration succeeds. It avoids inserting a duplicate with the same name/district/state.
4. Copy the two `src` files to the exact locations above.
5. Run the project's checks (`bun run lint` and `bun run build` based on the repo's `package.json`).
6. Test as a platform admin: add facility, edit details, verify/unverify, suspend/reactivate. Test as patient: only active, verified records should be searchable.
7. Deploy only after staging checks pass.

## Source quality

Official Kanpur Nagar district directory: https://kanpurnagar.nic.in/public-utility-category/hospitals/

Official UHM listing: https://kanpurnagar.nic.in/public-utility/uhm-govt-hospital-kanpur/

Regency official contact page: https://regencyhealthcare.in/contact-us/

The public directory supports only the stated names and contact/location details. It does not confirm current service availability, doctor rosters, stock, facility partnership, or registration status. Admin must independently validate these before verification. Publicly listed data is not a substitute for confirmation from the facility.

## Deletion policy

This patch intentionally retains the existing safe archive behavior (suspend/reactivate) instead of hard deleting facilities. Historical visits/referrals and audit trails can reference facility IDs; hard delete could damage records. If a legal deletion requirement arises, implement a separate reviewed retention workflow rather than cascading deletion.
