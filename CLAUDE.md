# Fate Forged Heroes: notes for Claude Code

Turn-based fantasy RPG in the browser (inspired by RAID: Shadow Legends). Owner: Jelte. Talk to him in **Dutch**; everything in the game is **English**.

Live: https://www.fateforgedheroes.com (Vercel, auto-deploys from `main`). Accounts and cloud saves: Supabase.

## How it is built

- No framework, no dependencies. `node build.mjs` concatenates the sources into `dist/index.html` (one ~8 MB page).
- `build.mjs` looks for each source in `src/`, `src/assets/`, `assets/`, `public/` or the repo root (the repo was once uploaded flat, so files may sit in the root).
- Vercel env vars `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected at build time as `window.FFH_CONFIG`. Without them the game runs offline (localStorage only).

| File | Role |
| --- | --- |
| `engine.js` | Global `K`. Combat engine and all game data. No DOM; also runs in Node for simulations. |
| `app.js` | Screens, battle view (480×270 canvas + DOM overlay), VFX, WebAudio SFX, saves, migrations. |
| `cloud.js` | Supabase auth (email/password, Google if enabled) and cloud save via plain `fetch` to the REST API. |
| `sprites.js`, `bgs.js` | Sprite frames (`SPR`), backgrounds. |
| `shell.html` | Layout + all CSS (tokens on `:root`, fonts Cinzel / Crimson Pro). Placeholders `/*ASSETS*/ /*ENGINE*/ /*SPRITES*/ /*APP*/`. |
| `heroes.js enemies.js bosses.js` | Battle sprites as data URLs (`HERO_ART`, `ENEMY_ART`, `BOSS_ART`). Per hero: `body` (battle sprite, ~75 px tall, transparent), `full` (2×, detail/summon), `face` (64 px, used until `HERO_POR` has a portrait). |
| `portraits.js` | `HERO_POR` painted portraits for heroes, enemies and bosses (128 px JPEG). |
| `shards.js logo.js stone.js` | Fate Shard art (`SHARD_ART.<type><0-2>`), `LOGO_URL`, `STONE_ART`. |
| `privacy.html favicon.png` | Copied into `dist/`. |
| `0001_saves.sql` | Supabase table `saves` (one row per user, RLS own-row only) + `delete_my_account()`. |
| `campaign-sim.cjs` | Test: auto-plays the full campaign with the starter team. Must print PASS. |

Internal ids are partly Dutch (legacy): enemy ids (`botkrijger`, `hellehond`…), gear slots (`wapen helm schild handschoenen borstpantser laarzen`), set ids (`krijger`, `levensbron`…), tabs (`campagne kerkers altaar`). Display names are English. Do not rename ids: saves depend on them.

## Game systems (engine.js)

- **Essences:** Ember → Verdant → Storm → Frost → Radiant → Umbral → Ember; Aether neutral. Strong Hit ×1.2 (crit ok, debuff ×1.15, 2 break), Normal ×1.0 (1 break), Weak ×0.75 (no crit, debuff ×0.5, 0 break).
- **Turn meter:** units fill by Speed to 100. `Battle.predict(n)` shows turn order.
- **Damage:** ATK × mult → crit (1 + cdmg%) → hit type → × 100/(100+DEF) → modifiers. Debuff chance: base × hitmod × (1 + (acc − res)/100), clamped.
- **Heroes:** 50 in `CHAMPS` (8 Uncommon, 14 Rare, 17 Epic, 11 Legendary). Heroes 26-50 (`kaelira` … `celesthyr`) are Fate Altar only and reuse existing passive ids (incl. boss passives); `harmony` (Liora) is theirs alone. Legendaries only from the Fate Altar, stat mult ×1.4. Level cap = min(rarity cap, stars × 10). Captured enemies become weak heroes (`captured: true`).
- **Bosses:** 25 in `BOSSES`, 2–3 phases, passive, Break Meter (Affinity Break = 2-turn stun, +15% damage taken). Per-boss power `BOSS_PW` was calibrated by simulation.
- **Campaign:** `CHAPTERS` (10 × 7 stages, names/desc/set per chapter). Stage 1–6 drop weapon/helmet/shield/gloves/chest/boots, stage 7 = chapter boss, random slot. Each chapter drops its own gear set.
- **Boss Hall:** 25 bosses × 10 levels, `bossLvl(i, n)`.
- **Fate Altar:** `FATE_SHARDS` (fate, greater, ancient, mythic, legendary) with drop chance per win and rarity table.
- **Player profile** (`S.p`, app.js): name (first change free, then `RENAME_COST` = 2500 silver; `S.p.renames` counts changes), avatar (a hero id), player level + XP, stats. Player XP comes from battles (`playerWinXp`, curve `pxNeed`); level-ups pay silver, every 5th level a Greater Fate Shard. `PLAYER_UNLOCK` gates tabs: Fate Altar at level 5, Boss Hall at level 10. The header `#account` button opens the profile screen (tab `profiel`), which also holds the cloud account section (`FFH_CLOUD.info()` / `openAccount()`).
- **Battle speed** (app.js `SPEED_UNLOCK`): 2× from Chapter I · Stage 4, 3× from Chapter III · Stage 1, 5× from Chapter II · Stage 1 but only when replaying a cleared stage or beaten Boss Hall level. `S.speed` is the preferred speed; `spd` is what the current battle runs at.
- **Ascension Stones** (`S.stones`) buy stars. **Fodder** (`S.fodder`): 5% chance per stage win to capture a non-boss enemy.

## Save format (app.js)

`S` in localStorage key `ffh-save` (old key `kronen-van-as-v1` still read). Current version `v: 7`; `migrate()` upgrades older saves. When changing the save shape: bump `v`, add a migration step, keep old saves working. Small optional fields added within a version get a default in `fixup()`. `save()` also queues a cloud upload.

Cloud sync (cloud.js): one row per account in `saves`. Each device stores in localStorage `ffh-cloud-base` which cloud version (`updated_at` string as returned by the server) its save is based on, plus a hash of the save at that moment. Uploads are a `PATCH … &updated_at=eq.<base>`; 0 rows updated means another device saved in between, so `sync()` runs: local unchanged → take the cloud silently; cloud unchanged → upload; both changed → the player picks a save in a dialog. Never upload without a base, and never decide by `savedAt` (it changes on every boot).

## Working rules

- After changing balance or engine: run `node campaign-sim.cjs` (or `npm test`) and keep it passing.
- Test in a browser (build, then open `dist/index.html`) before pushing; check the console for errors, also at 390 px width.
- Never put the Supabase service_role/secret key, Google client secret or database password in code.
- Anti-cheat is not solved yet: all logic runs client-side. Leaderboards/guilds/arena need server-side checks (Supabase Edge Functions) before rewards count.

## Roadmap

1. Tidy repo layout (sources in `src/`, art in `src/assets/`); `build.mjs` already supports it.
2. Google sign-in (enable provider in Supabase; button appears automatically).
3. Feedback button → Supabase table.
4. Leaderboards (server-verified), then guilds with chat and a guild boss, then arena vs saved teams.
5. Art still missing for heroes Caelwyn, Ravelyn, Torvane.
