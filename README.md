# Fate Forged Heroes

A turn-based fantasy hero collector for the browser, made for phones held sideways. One static page without dependencies, with optional Supabase accounts, cloud saves and online modes (arena, guilds, chat).

- **Play:** https://www.fateforgedheroes.com
- **Hosting:** Vercel (`npm run build`, serves `dist/`, deploys every push to `main`)
- **Accounts, saves and online modes:** Supabase

## Files

| Path | What |
| --- | --- |
| `engine.js` | Combat engine and all game data. No DOM; also runs in Node. |
| `app.js` | Screens, the battle view, effects, sound, music, saves |
| `cloud.js` | Accounts and cloud saves (Supabase REST API via `fetch`) |
| `sprites.js`, `bgs.js` | Character pictures and battle backgrounds |
| `shell.html` | Page layout and styles |
| `story.js` | The campaign story |
| `manga.js`, `sheets.js`, `shards.js`, `menu.js`, `bg.js`, `chbg.js`, `gear.js`, `cards.js`, … | Art as data URLs |
| `hi/`, `sheets/`, `backgrounds/` | Larger art, loaded when a battle needs it |
| `desktop.html` | The phone frame the game plays in on computers and tablets |
| `privacy.html`, `favicon.png`, `manifest.webmanifest`, `icon-*.png` | Copied into the site as they are |
| `0001_*.sql` … `0029_*.sql` | Database setup, run once each, in order, in the Supabase SQL Editor |
| `supabase/functions/arena/` | The server for the arena and the guild boss (Edge Function) |
| `build.mjs`, `strip.mjs` | Build: puts the page together and takes the comments out |
| `campaign-sim.cjs` | Balance test: auto-plays the whole campaign for every class |

## Run locally

```bash
npm run build        # writes dist/index.html
npm test             # campaign simulation, must print PASS for every class
npx serve dist       # then open the address it shows
```

Without `SUPABASE_URL` and `SUPABASE_ANON_KEY` the build runs offline (saves stay in the browser).

## Setup (one time)

### Supabase

1. Create a project (a region close to your players). Keep the database password in a password manager.
2. **SQL Editor**: run `0001_saves.sql`, then the other `.sql` files in order.
3. **Project Settings → API**: copy the Project URL and the anon public key. Never put the `service_role` key in the game.
4. **Authentication → URL Configuration**: Site URL `https://www.fateforgedheroes.com`; add it (and `https://fateforgedheroes.com`) to the Redirect URLs.
5. **Authentication → Email Templates**: paste `supabase/email/confirm-signup.html` as the "Confirm signup" template.

### Google sign-in (optional)

Create an OAuth client (Web application) in the Google Cloud console with the redirect URI Supabase shows under Authentication → Providers → Google, and paste its Client ID and secret there. The game shows the Google button once the provider is on.

### Vercel

Import this repository, framework preset **Other**. Under Settings → Environment Variables set `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Every push to `main` goes live.

### Arena server

The GitHub Action in `.github/workflows/arena-function.yml` deploys the Edge Function when the engine or the function changes. It needs the repository secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF`.

## Saves

Every change is saved in the browser (`localStorage`, key `ffh-save`) and, with an account, uploaded to the `saves` table a few seconds later. Each device remembers which cloud version its save is based on, so two devices never overwrite each other silently; when both changed, the player picks which save to keep. Row Level Security lets a player read and write only their own row, and `delete_my_account()` deletes an account with its data.
