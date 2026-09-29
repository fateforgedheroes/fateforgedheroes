# Fate Forged Heroes

Turn-based fantasy RPG for the browser. Static site (one HTML page, no dependencies) with optional Supabase accounts and cloud saves.

- **Hosting:** Vercel (builds with `npm run build`, serves `dist/`)
- **Accounts + saves:** Supabase (Google login, email + password, one save row per player)
- **Code:** this repository

## Project layout

| Path | What |
| --- | --- |
| `src/engine.js` | Combat engine and all game data: heroes, enemies, bosses, chapters, gear, Fate Shards. No DOM. |
| `src/app.js` | Screens, battle view, effects, sound, local saves |
| `src/cloud.js` | Sign-in and cloud saves (Supabase REST API via `fetch`) |
| `src/sprites.js`, `src/bgs.js` | Sprite frames and backgrounds |
| `src/shell.html` | Page layout and CSS |
| `src/assets/*.js` | Art as data URLs (hero, enemy and boss sprites, portraits, shards, logo) |
| `public/` | Copied as-is into the site (`privacy.html`, `favicon.png`) |
| `supabase/migrations/` | Database setup (run once in Supabase) |
| `tests/campaign-sim.cjs` | Balance smoke test: auto-plays the whole campaign |

## Run locally

```bash
npm run build        # writes dist/index.html
npm test             # campaign simulation, must print PASS
npx serve dist       # or open dist/index.html directly
```

Without `SUPABASE_URL` and `SUPABASE_ANON_KEY` the build runs in offline mode (browser saves only).

---

## Setup (one time)

### 1. Supabase

1. Create a project at supabase.com (region: close to your players, e.g. Frankfurt). Store the database password in a password manager.
2. **SQL Editor → New query**: paste `supabase/migrations/0001_saves.sql` and run it.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key. (Never use the `service_role` key in the game.)
4. **Authentication → Providers → Email**: enabled by default. Keep "Confirm email" on.
5. **Authentication → URL Configuration**:
   - Site URL: `https://www.fateforgedheroes.com` (until the domain exists: your `*.vercel.app` address)
   - Redirect URLs: add the Vercel address and, later, `https://www.fateforgedheroes.com` and `https://fateforgedheroes.com`.

### 2. Google sign-in

1. Go to console.cloud.google.com → create a project "Fate Forged Heroes".
2. **APIs & Services → OAuth consent screen**: External, app name "Fate Forged Heroes", your support email, add the privacy policy URL (`/privacy.html`).
3. **Credentials → Create credentials → OAuth client ID** → Web application.
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (shown in Supabase under Authentication → Providers → Google).
4. Copy the Client ID and Client secret into Supabase → **Authentication → Providers → Google** and enable it.

### 3. Vercel

1. **Add New → Project → Import** this GitHub repository. Framework preset: **Other**. Vercel reads `vercel.json`.
2. **Settings → Environment Variables** (Production and Preview):
   - `SUPABASE_URL` = the Project URL
   - `SUPABASE_ANON_KEY` = the anon public key
3. Redeploy. Every push to `main` now goes live automatically; every pull request gets a preview link.

### 4. Domain (when bought)

Vercel → Project → **Settings → Domains** → add `fateforgedheroes.com` and `www.fateforgedheroes.com`, then add the DNS records Vercel shows at your registrar (Cloudflare: set the records to "DNS only"). Then update the Site URL and Redirect URLs in Supabase (step 1.5).

### 5. Before going public

- Fill in the placeholders (`[YOUR NAME]`, `[EMAIL ADDRESS]`, …) in `public/privacy.html`.
- Supabase → Authentication → Emails: optionally set up your own SMTP sender so confirmation emails come from your domain.

---

## How saves work

- Every change is saved in the browser (`localStorage`, key `ffh-save`) and, when signed in, uploaded to the `saves` table a few seconds later (plus every 30 s and when the tab is hidden).
- On sign-in: no cloud save yet → the local save is uploaded. Otherwise the newer save wins; a fresh local game always takes the cloud save.
- Row Level Security: a player can only read and write their own row. `delete_my_account()` lets players delete their account (GDPR).

## Roadmap

1. Leaderboards (server-verified via Supabase Edge Functions)
2. Move rewards, summons and drops server-side (anti-cheat)
3. Guilds, guild chat (Supabase Realtime), guild boss
4. Arena against other players' saved teams
