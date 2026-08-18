# Kaizen Spark

Build a mobile-first, bilingual "Shopfloor Kaizen & Suggestion App" connected to Supabase for the database/auth and Google Gemini API (AI Studio) for audio transcription/processing.

---

### 1. Architecture & Core Routing

The application must have two distinct flows/landing pages:

#### Page 1: Shopfloor Fast-Entry (Public / QR-Code Landing Page `/submit` or `/`)

- Designed for factory workers scanning a physical QR code on the production line.

- Mobile-optimized, ultra-simple, high-contrast UI with large tap targets.

- **Form Fields & Flow:**

  1. **Employee ID:** 4-digit numeric input with a clean on-screen numpad or standard number keyboard (validation: exactly 4 digits).

  2. **Voice Note (Primary Input):** - Big, prominent microphone recording button (Record, Stop, Re-record).

     - Records voice in Marathi, Hindi, or English.

     - Sends the audio to a Supabase Edge Function configured with the Google Gemini 1.5 Flash API key to transcribe and structure the Kaizen summary automatically.

     - Shows the transcribed text preview with an option to accept/re-record.

  3. **Photo Upload / Camera Capture:**

     - Direct camera capture/file upload button to attach a picture of the Kaizen/machine.

     - Uploads the image to a Supabase Storage bucket (`kaizen-attachments`).

  4. **Submit Button:** Submits the Kaizen to the Supabase `kaizens` table.

  5. **Submission Success Screen:** Displays a clear green checkmark with audio/visual feedback ("धन्यवाद / Submission Received!"), automatically resetting after 4 seconds for the next operator.

  6. **Privacy Rule:** Workers CANNOT view past Kaizens or search previous records on this page.

---

#### Page 2: Management & HR Portal (`/admin/login` & `/dashboard`)

- Standard email/password or username/password authentication using Supabase Auth.

- Role-based Access Control (RBAC) supporting two roles: `management` and `hr`.

- **Dashboard Features:**

  - **Data Table / Grid:** Shows all Kaizen submissions across the plant.

  - **Columns / Card Info:** Submission Date/Time, 4-digit Employee ID, Voice Note Audio playback, Transcribed Text (Marathi/Hindi/English translated preview), Attached Image thumbnail (clickable for full preview), Status (Pending Review, Approved, Implemented, Rejected).

  - **Filters & Search:** Filter by Date Range, Employee ID, or Status.

  - **Management Action:** Ability to update status, add review notes, and tag reward points.

  - **HR View:** Ability to export reports to CSV/Excel for monthly Kaizen reward tracking.

---

### 2. Database Schema (Supabase SQL)

Set up the following tables and Row Level Security (RLS) policies:

```sql

-- 1. Profiles / User Roles

create table profiles (

  id uuid references auth.users on delete cascade primary key,

  role text check (role in ('management', 'hr')) not null default 'management',

  full_name text,

  created_at timestamp with time zone default timezone('utc'::text, now())

);

-- 2. Kaizen Submissions Table

create table kaizens (

  id uuid default gen_random_uuid() primary key,

  employee_id varchar(4) not null,

  audio_url text,

  transcription text not null,

  image_url text,

  status text default 'pending' check (status in ('pending', 'approved', 'implemented', 'rejected')),

  management_notes text,

  created_at timestamp with time zone default timezone('utc'::text, now())

);

-- 3. Storage Bucket

-- Create a public or signed bucket named 'kaizen-attachments' for images and voice clips.

-- 4. RLS Policies

alter table kaizens enable row level security;

-- Allow anonymous/public insert (for QR code workers)

create policy "Allow public to insert kaizen"

on kaizens for insert

to anon, authenticated

with check (true);

-- Allow only authenticated Management/HR to view kaizens

create policy "Allow authenticated staff to select kaizens"

on kaizens for select

to authenticated

using (true);

-- Allow authenticated staff to update status

create policy "Allow authenticated staff to update kaizens"

on kaizens for update

to authenticated

using (true);

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://shopfloor-voice-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8d0b817c-338a-42ec-b559-2769f1f316c4).

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
