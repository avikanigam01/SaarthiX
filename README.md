# Saarthi Care Navigator

PROJECT NAME:

SaarthiX

BUILD TYPE:

Production-ready healthcare access and journey coordination platform.

IMPORTANT:

This is NOT a UI mockup, prototype, showcase website, or demo application.

The application must be designed as a real production system.

There must be:

- NO mock data

- NO fake hospitals

- NO fake doctors

- NO fake patients

- NO fake medicines

- NO fake appointments

- NO fake referrals

- NO hardcoded statistics

- NO fake availability

- NO hardcoded healthcare records

- NO sample/demo users

- NO fake success metrics

All dynamic application data must eventually come from Supabase.

If there is no data in the database, show proper empty states instead of inventing data.

==================================================

1. PRODUCT PURPOSE

==================================================

SaarthiX is an AI-assisted healthcare access and patient journey coordination platform for underserved communities.

The platform helps a patient:

1. Tell SaarthiX what healthcare help they need.

2. Perform an initial urgency assessment.

3. Identify an appropriate care level / department.

4. Find an appropriate healthcare facility.

5. Check actual facility/service/doctor/diagnostic availability.

6. Avoid unnecessary travel and repeated visits.

7. Receive a structured referral when required care is unavailable.

8. Track the referral.

9. Record/track the hospital visit.

10. Receive follow-up reminders.

11. Complete the healthcare journey.

CORE JOURNEY:

Need

→ Urgency Assessment

→ Right Facility

→ Availability Confirmation

→ Receive Care

→ Referral if required

→ Follow-up

→ Journey Complete

==================================================

2. SAFETY / MEDICAL POSITIONING

==================================================

SaarthiX MUST NOT present itself as an AI doctor.

AI must NOT:

- diagnose diseases

- prescribe medication

- autonomously make treatment decisions

- replace clinicians

- tell patients to stop prescribed treatment

AI is decision support only.

Every relevant AI screen must display a clear disclaimer such as:

"SaarthiX provides decision-support and care coordination. It does not provide a medical diagnosis or replace a qualified healthcare professional."

For emergency-like situations, the application must clearly advise the user to seek immediate professional medical care.

Do not present AI output as medically confirmed diagnosis.

==================================================

3. TECHNOLOGY

==================================================

Use:

- React

- TypeScript

- Tailwind CSS

- shadcn/ui

- Lucide Icons

- Vite-compatible structure

- Responsive design

- Component architecture

- Accessible UI

- Form validation

- Error boundaries

- Loading states

- Empty states

- Error states

- Success states

The application must be compatible with deployment on Vercel.

Environment variables must be used for external services.

Never expose secret keys in frontend code.

Use environment variables such as:

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

If an AI provider is required, never expose the provider's secret API key in frontend code.

AI requests must go through a secure server-side/API/Edge Function layer.

==================================================

4. DESIGN SYSTEM

==================================================

Create a professional healthcare technology design.

Brand:

SaarthiX

Suggested tagline:

"Right Care. Right Place. Right Time."

Visual principles:

- trustworthy

- accessible

- calm

- modern

- clean

- healthcare-oriented

- government/public-health compatible

- mobile-first

- readable for users with limited digital literacy

Avoid:

- neon colors

- cyberpunk UI

- excessive glassmorphism

- excessive animations

- overly complex dashboards

- tiny typography

- unnecessary decorative elements

Use:

- clear cards

- large touch targets

- accessible contrast

- clear status badges

- timeline components

- structured forms

- responsive tables

- charts only when real data exists

==================================================

5. DATA RULE

==================================================

CRITICAL:

Do not create mock data to make the UI look populated.

Do not use arrays such as:

const hospitals = [

  { name: "District Hospital" }

]

Do not create fake patients, fake doctors, fake medicines, fake referrals or fake metrics.

All data must come from the backend.

If backend data is unavailable:

Display:

"No data available yet."

or an appropriate contextual empty state.

Examples:

"No verified healthcare facilities are currently available for this area."

"No doctors have been added for this department."

"No referrals found."

"No follow-ups scheduled."

"No inventory records available."

==================================================

6. PUBLIC WEBSITE

==================================================

Routes:

/

 /how-it-works

 /about

 /contact

 /privacy

 /terms

 /login

 /register

 /forgot-password

==================================================

7. LANDING PAGE

==================================================

Create a professional homepage.

Hero:

Headline:

"Healthcare access should not require unnecessary journeys."

Description:

"SaarthiX helps patients identify appropriate care, verify real service availability, navigate referrals and stay connected after their healthcare visit."

CTA:

"Find Care"

Secondary CTA:

"For Healthcare Institutions"

Do NOT display fake statistics.

Instead use feature/value sections.

==================================================

8. LANDING PAGE SECTIONS

==================================================

SECTION:

The Problem

Explain:

- unnecessary travel

- waiting

- repeated visits

- unavailable services

- difficult referrals

- missed follow-ups

SECTION:

How SaarthiX Works

Show:

01

Tell us what you need

02

Understand urgency

03

Find appropriate care

04

Confirm availability

05

Receive care

06

Complete follow-up

SECTION:

Core Capabilities

1. AI-Assisted Need & Urgency Assessment

2. Right Facility & Service Check

3. Structured Referral / Next-Step Guidance

4. After-Hospital Follow-up

SECTION:

For Patients

Explain how patients can:

- assess their healthcare need

- find suitable facilities

- check service availability

- receive referral guidance

- track healthcare journey

- receive follow-up reminders

SECTION:

For Healthcare Institutions

Explain:

- manage facility information

- manage departments

- manage doctors

- manage diagnostics

- manage medicine inventory

- manage referrals

- support patient continuity

SECTION:

Safety

Display:

"SaarthiX is a coordination and decision-support platform, not a diagnostic or autonomous treatment system."

==================================================

9. AUTHENTICATION UI

==================================================

Routes:

/login

/register

/forgot-password

/reset-password

Registration should support the correct user role workflow.

DO NOT allow users to arbitrarily register themselves as admin.

Roles must be controlled by backend authorization.

Potential roles:

patient

hospital_staff

referral_coordinator

hospital_admin

government_admin

super_admin

The actual role model will be implemented in Phase 2 using Supabase.

==================================================

10. PATIENT APPLICATION

==================================================

Patient routes:

/patient/dashboard

/patient/assessment

/patient/facilities

/patient/facilities/:id

/patient/journey

/patient/journey/:id

/patient/referrals

/patient/referrals/:id

/patient/visits

/patient/followups

/patient/notifications

/patient/profile

/patient/settings

==================================================

11. PATIENT DASHBOARD

==================================================

Create a simple accessible dashboard.

Show real database-driven sections:

- Active healthcare journey

- Active referral

- Upcoming follow-up

- Recent visits

- Notifications

If there is no data:

Show empty states.

Example:

"No active healthcare journey."

CTA:

"Start Care Assessment"

Do not populate dashboard with fake information.

==================================================

12. PATIENT CARE ASSESSMENT

==================================================

Route:

/patient/assessment

Create a multi-step assessment.

Step 1:

"What do you need help with?"

Options may include:

- Symptoms

- Specialist consultation

- Diagnostic test

- Medicine availability

- Existing treatment follow-up

- Other healthcare need

Step 2:

Basic symptom/information input.

Step 3:

Duration.

Step 4:

Severity.

Step 5:

Relevant safety/emergency questions.

Step 6:

Location / preferred service area where applicable.

Do not collect unnecessary personal health information.

Only collect information required for the actual workflow.

Show progress:

Step 1 of 5

Step 2 of 5

etc.

==================================================

13. AI ASSESSMENT RESULT

==================================================

Show:

Assessment Result

Urgency category:

- routine

- moderate

- urgent

Appropriate care level:

based on backend/AI decision-support output.

Suggested department/service:

based on assessment.

Show:

"Decision-support only. This is not a medical diagnosis."

Buttons:

"Find Appropriate Facility"

"Start Over"

The UI must not say:

"You have [disease]."

It must not prescribe medication.

==================================================

14. FACILITY SEARCH

==================================================

Route:

/patient/facilities

Facility data must come from Supabase.

Never hardcode facilities.

Search/filter options:

- location

- district

- facility type

- department

- service

- diagnostic availability

- medicine availability where applicable

- doctor availability

- distance where location functionality is implemented

Facility cards should display actual backend information.

Example structure:

Facility Name

Facility Type

Verified Status

Address

Available Services

Available Departments

Doctor Availability

Diagnostic Availability

Distance if available

CTA:

"View Facility"

==================================================

15. FACILITY DETAILS

==================================================

Route:

/patient/facilities/:id

Display real information:

- facility name

- verified status

- address

- contact

- operating information

- departments

- services

- doctors

- diagnostics

- medicine availability where permitted

- referral information

Availability must be based on actual records and timestamps.

Show:

"Last updated"

for availability information.

If data is stale, display an appropriate stale-data warning instead of pretending it is current.

==================================================

16. CARE JOURNEY

==================================================

Route:

/patient/journey/:id

Create a beautiful healthcare journey timeline.

Stages:

1. Need Submitted

2. Assessment Completed

3. Facility Identified

4. Availability Confirmed

5. Visit

6. Referral if required

7. Follow-up

8. Journey Completed

Each stage must be driven by real database status.

Do not display completed stages unless the corresponding real record exists.

==================================================

17. REFERRALS

==================================================

Routes:

/patient/referrals

/patient/referrals/:id

Show:

- referral ID

- originating facility

- destination facility

- department/service

- reason

- created date

- status

- next step

- destination response

- appointment/visit information if available

Statuses:

PENDING

ACCEPTED

REJECTED

SCHEDULED

COMPLETED

CANCELLED

Use real database records.

==================================================

18. PATIENT VISITS

==================================================

Route:

/patient/visits

Display actual visits associated with authenticated patient.

Fields:

- facility

- visit date

- department

- referral reference if applicable

- status

Do not expose unauthorized medical notes.

==================================================

19. FOLLOW-UP

==================================================

Routes:

/patient/followups

/patient/followups/:id

Display:

- follow-up date

- follow-up type

- instructions if authorized

- status

- related visit

- related referral

Statuses:

SCHEDULED

COMPLETED

MISSED

RESCHEDULED

CANCELLED

Provide:

"Mark as completed"

only where backend permission allows it.

==================================================

20. NOTIFICATIONS

==================================================

Route:

/patient/notifications

Real notifications only.

Examples of legitimate events:

- referral accepted

- referral rejected

- follow-up scheduled

- follow-up reminder

- journey status updated

No fake notifications.

==================================================

21. PATIENT PROFILE

==================================================

Route:

/patient/profile

Display/edit only permitted personal information.

Sections:

Personal Information

Contact Information

Location

Emergency Contact if required

Account Security

Do not allow patient to edit authorization role.

==================================================

22. HOSPITAL PORTAL

==================================================

Routes:

/hospital/dashboard

/hospital/profile

/hospital/departments

/hospital/services

/hospital/doctors

/hospital/diagnostics

/hospital/medicines

/hospital/referrals

/hospital/patients

/hospital/visits

/hospital/followups

/hospital/notifications

/hospital/settings

==================================================

23. HOSPITAL DASHBOARD

==================================================

All dashboard numbers must be calculated from real database records.

Show:

- active referrals

- pending referrals

- today's visits

- upcoming follow-ups

- services requiring availability update

- low medicine stock alerts if inventory exists

Do not show zero as a fake metric if the corresponding data has not been loaded.

Use loading states while fetching.

==================================================

24. HOSPITAL PROFILE

==================================================

Authorized hospital users can view/edit permitted information.

Fields:

- facility name

- facility type

- address

- district

- state

- contact

- operating hours

- verification status

Verification status must be controlled by authorized admin users.

==================================================

25. DEPARTMENTS

==================================================

Route:

/hospital/departments

Show actual departments belonging to the authenticated hospital.

Actions based on permission:

- add department

- edit department

- activate/deactivate department

Department status:

AVAILABLE

LIMITED

UNAVAILABLE

Every change must show:

- updated timestamp

- updated by user

==================================================

26. SERVICES

==================================================

Route:

/hospital/services

Manage actual services.

Examples are not to be seeded as fake records.

Authorized staff can create records such as:

Diagnostic services

Consultation services

Other facility services

Status:

AVAILABLE

LIMITED

UNAVAILABLE

==================================================

27. DOCTORS

==================================================

Route:

/hospital/doctors

Authorized hospital staff can:

- add doctor

- edit doctor

- deactivate doctor

- manage department assignment

- manage availability

Doctor data must come from Supabase.

Do not hardcode doctors.

==================================================

28. DOCTOR AVAILABILITY

==================================================

Create schedule UI.

Allow authorized users to manage:

- date

- start time

- end time

- availability status

Show actual availability to patients.

All modifications must be permission controlled.

==================================================

29. DIAGNOSTICS

==================================================

Route:

/hospital/diagnostics

Manage actual diagnostic services.

Statuses:

AVAILABLE

LIMITED

UNAVAILABLE

Show last updated time.

==================================================

30. MEDICINE INVENTORY

==================================================

Route:

/hospital/medicines

Authorized users can:

- add medicine

- update stock

- update minimum stock threshold

- record stock movement

- mark medicine inactive

Inventory status:

IN_STOCK

LOW_STOCK

OUT_OF_STOCK

Never fabricate medicine inventory.

==================================================

31. REFERRAL MANAGEMENT

==================================================

Route:

/hospital/referrals

Hospital staff can see referrals relevant to their facility.

Actions depend on role:

- review

- accept

- reject

- schedule

- mark completed

Referral workflow must be visible as a timeline.

==================================================

32. PATIENT MANAGEMENT

==================================================

Route:

/hospital/patients

Hospital users must NOT have unrestricted access to every patient.

Only show patients and information that the authenticated user is authorized to access.

Use minimum necessary data.

==================================================

33. HOSPITAL VISITS

==================================================

Route:

/hospital/visits

Authorized staff can:

- create/confirm visit

- update visit status

- associate visit with referral

- create follow-up where authorized

==================================================

34. HOSPITAL FOLLOW-UP

==================================================

Route:

/hospital/followups 

Authorized staff can:

- schedule follow-up

- reschedule

- mark completed

- mark missed

All actions must be permission controlled.

==================================================

35. REFERRAL COORDINATOR PORTAL

==================================================

Routes:

/coordinator/dashboard

/coordinator/referrals

/coordinator/referrals/:id

/coordinator/patients

/coordinator/facilities

/coordinator/notifications

Dashboard:

- pending referrals

- accepted referrals

- rejected referrals

- scheduled referrals

- completed referrals

No fake metrics.

==================================================

36. GOVERNMENT ADMIN PORTAL

==================================================

Routes:

/admin/dashboard

/admin/facilities

/admin/users

/admin/referrals

/admin/services

/admin/inventory

/admin/analytics

/admin/audit-logs

/admin/settings

==================================================

37. ADMIN DASHBOARD

==================================================

All numbers must come from database aggregation.

Possible metrics:

- verified facilities

- active facilities

- referrals

- referral completion

- follow-up completion

- service availability

- inventory risk

Only show metrics for which real records exist.

==================================================

38. FACILITY MANAGEMENT

==================================================

Admin can:

- create facility

- edit facility

- verify facility

- suspend facility

- reactivate facility

Every sensitive administrative action requires confirmation.

==================================================

39. USER MANAGEMENT

==================================================

Admin UI:

- search users

- view user

- activate/deactivate account where authorized

- assign approved roles

- associate hospital staff with facility

- manage permissions

Never allow frontend-only role escalation.

Authorization must be enforced in backend/RLS.

==================================================

40. ANALYTICS

==================================================

Route:

/admin/analytics

Create analytics components that query actual data.

Possible metrics:

- unnecessary journeys avoided

- referral completion

- follow-up completion

- service availability

- stockout days

- forecast accuracy when forecasting module exists

- medicine wastage when inventory movement data exists

If insufficient data exists:

Display:

"Insufficient data for this metric."

Never generate fake charts.

==================================================

41. AUDIT LOG UI

==================================================

Route:

/admin/audit-logs

Display authorized audit information:

- actor

- action

- entity

- timestamp

- relevant record identifier

Do not expose sensitive information unnecessarily.

==================================================

42. RESPONSIVE DESIGN

==================================================

The application must work on:

- mobile phones

- tablets

- laptops

- desktop monitors

Patient interface should prioritize mobile usability.

Hospital/admin interfaces should support desktop/tablet dashboards.

==================================================

43. ACCESSIBILITY

==================================================

Implement:

- keyboard navigation

- semantic HTML

- accessible labels

- aria attributes where needed

- readable typography

- sufficient contrast

- clear error messages

- large touch targets

- accessible form validation

==================================================

44. LOADING / ERROR / EMPTY STATES

==================================================

Every database-driven screen must have:

Loading state

Error state

Empty state

Success state

Examples:

Loading:

"Loading facility information..."

Empty:

"No verified facilities found."

Error:

"We couldn't load this information. Please try again."

Never substitute fake data.

==================================================

45. ROUTE PROTECTION

==================================================

Public routes:

accessible without authentication.

Patient routes:

patient authentication required.

Hospital routes:

authorized hospital user required.

Coordinator routes:

referral coordinator permission required.

Admin routes:

admin permission required.

Unauthorized users must receive a proper 403/access denied page.

==================================================

46. UI IMPLEMENTATION RULE

==================================================

Build reusable components.

Suggested structure:

src/

  components/

  components/ui/

  layouts/

  pages/

  routes/

  hooks/

  lib/

  services/

  types/

  utils/

Keep business logic separate from UI.

Create clear TypeScript types.

Do not put sensitive business authorization logic only in frontend.

==================================================

47. VERCEL READINESS

==================================================

Ensure:

- production build works

- no hardcoded localhost URLs

- environment variables are supported

- no secret API keys in client

- SPA routing works on Vercel

- proper error pages

- favicon

- page titles

- metadata

- responsive viewport

- production-safe console usage

==================================================

48. FINAL PHASE 1 REQUIREMENT

==================================================

Build the complete SaarthiX frontend and application shell.

Do NOT create fake records.

Do NOT seed demo records.

Do NOT invent statistics.

Use empty states where backend data does not yet exist.

Prepare all pages and components so Phase 2 can connect the complete application to Supabase.

The final UI must look like a real production SaaS healthcare coordination platform, not a hackathon mockup.

first complete phases 1 then i give you phases 2 prompt

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://saarthix-health-care.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b91b6cbe-fb45-489c-9f51-ec3c222359f8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
#   S a a r t h i X 
 
 
