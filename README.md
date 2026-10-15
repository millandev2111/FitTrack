# FitTracker

**Your gym log, in your pocket.** FitTracker is an installable web app (PWA) for tracking your workouts: routines, sets, weights and reps, personal records, and your progress week by week. It's built mobile-first and works offline, so you can log every set even when the gym has no signal.

It installs on Android and iPhone straight from the browser, no app store required, and runs for free on Vercel and Supabase.

> The app's interface is in Spanish.

## Features

**Training**
- Routines as templates (Push, Pull, Legs…) with sets, rep ranges, rest times and supersets.
- A live session that **pre-fills what you did last time** and shows on every set whether you went up (**+2.5**), held steady or dropped.
- **Weight suggestions** using double progression: once you hit the top of the rep range on every set, it suggests adding weight.
- Automatic rest timer per exercise, plate calculator, and notes per exercise and per session.
- Keeps the screen awake while you train.

**Records and progress**
- **Automatic personal records** (heaviest weight, estimated 1RM and most reps), detected by the database as each set is saved.
- Per-exercise chart (estimated 1RM, top weight or volume) and session-by-session history.
- 20-week consistency map, streaks, weekly sets per muscle group against a target, and **plateau alerts**.
- Monthly recap: days trained, volume, records, your biggest jump and your star exercise, compared with the previous month.

**Beyond lifting**
- Logging for 17 sports (soccer, running, basketball, cycling, swimming…) with sport-specific fields and estimated calories. They count toward your streak.
- Body weight and measurements with a chart, plus **private progress photos** with a before/after comparison.
- Workout reminders via push notifications.

**Experience**
- Installable on Android and iOS, with its own icon and launch screens.
- Works offline: the active session lives on the phone and syncs on its own when the connection comes back.
- Light, dark or system theme, with three accent colors. Units in kg or lb.
- A catalog of 83 exercises with photos showing the movement, plus any exercises you create yourself.

## Tech stack

| Area | Tools |
|---|---|
| UI and server | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 4, Sora and DM Sans, [Lucide](https://lucide.dev) icons |
| Data and auth | [Supabase](https://supabase.com): Postgres with Row Level Security, Auth and Storage |
| Notifications | Web Push (VAPID) via `web-push`; `pg_cron` + `pg_net` in Supabase trigger the reminders |
| Hosting | [Vercel](https://vercel.com) |

## How it works

- **Offline support.** A custom service worker ([`public/sw.js`](public/sw.js)) caches the app on the phone. The active session is stored in `localStorage`, and every change goes into a queue ([`src/lib/live/outbox.ts`](src/lib/live/outbox.ts)) that uploads to Supabase once there's a connection. IDs are generated on the client, so retrying an upload never creates duplicates.
- **Records in the database.** A Postgres trigger compares each completed set with your history for that exercise and stores any new record. The estimated 1RM (Epley formula) is a generated column.
- **Security.** Every table uses Row Level Security, so each user can only read and write their own data. Progress photos live in a private bucket and are shown through short-lived signed URLs.
- **Weights in kg.** Everything is stored in kilograms and converted to pounds only for display.

## Running locally

You need Node.js 20.9 or later and a free Supabase project.

1. Set up Supabase by following [`docs/supabase-setup.md`](docs/supabase-setup.md) (in Spanish): create the project and run the SQL files in [`supabase/`](supabase/).
2. Copy `.env.example` to `.env.local` and fill in the values. The guide explains where each one comes from.
3. Install and start:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. To try it on your phone over the same Wi‑Fi network, use your computer's IP address (`http://192.168.x.x:3000`). Installing it as an app and receiving notifications on a phone requires HTTPS, which means the deployed version.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serves the production build |
| `npm run lint` | Lints the code with ESLint |

## Project structure

| Folder | Contents |
|---|---|
| `src/app/(auth)` | Sign in, sign up and password recovery |
| `src/app/(app)` | App screens: home, train, live session, history, progress, routines, body, sports, monthly recap, reminders, profile |
| `src/app/api/reminders/send` | Sends reminders (called by Supabase every 15 minutes) |
| `src/lib/live` | Live session: on-device state and the sync queue |
| `src/lib/progress.ts` | 1RM, session comparison, weight suggestions, streaks and plateau detection |
| `supabase/migrations` | SQL schema: tables, security, automatic records and views |
| `supabase/seed.sql` | Catalog of 83 exercises (Spanish names) |
| `supabase/templates` | Sign-up confirmation and password reset emails styled like the app |
| `public/sw.js` | Service worker: caching, offline mode and notifications |
| `design/mockups.html` | Original UI mockups |

## Credits

- Exercise photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), public domain (Unlicense).
