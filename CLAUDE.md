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
| `heroes.js enemies.js bosses.js` | Battle sprites as data URLs (`HERO_ART`, `ENEMY_ART`, `BOSS_ART`). |
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
- **Heroes:** 25 in `CHAMPS` (8 Uncommon, 7 Rare, 6 Epic, 4 Legendary). Legendaries only from the Fate Altar, stat mult ×1.4. Level cap = min(rarity cap, stars × 10). Captured enemies become weak heroes (`captured: true`).
- **Bosses:** 25 in `BOSSES`, 2–3 phases, passive, Break Meter (Affinity Break = 2-turn stun, +15% damage taken). Per-boss power `BOSS_PW` was calibrated by simulation.
- **Campaign:** `CHAPTERS` (10 × 7 stages, names/desc/set per chapter). Stage 1–6 drop weapon/helmet/shield/gloves/chest/boots, stage 7 = chapter boss, random slot. Each chapter drops its own gear set.
- **Boss Hall:** 25 bosses × 10 levels, `bossLvl(i, n)`.
- **Fate Altar:** `FATE_SHARDS` (fate, greater, ancient, mythic, legendary) with drop chance per win and rarity table.
- **Player profile** (`S.p`, app.js): name, avatar (a hero id), player level + XP, stats. Player XP comes from battles (`playerWinXp`, curve `pxNeed`); level-ups pay silver, every 5th level a Greater Fate Shard. `PLAYER_UNLOCK` gates tabs: Fate Altar at level 5, Boss Hall at level 10. The header `#account` button opens the profile screen (tab `profiel`), which also holds the cloud account section (`FFH_CLOUD.info()` / `openAccount()`).
- **Ascension Stones** (`S.stones`) buy stars. **Fodder** (`S.fodder`): 5% chance per stage win to capture a non-boss enemy.

## Save format (app.js)

`S` in localStorage key `ffh-save` (old key `kronen-van-as-v1` still read). Current version `v: 7`; `migrate()` upgrades older saves. When changing the save shape: bump `v`, add a migration step, keep old saves working. `save()` also queues a cloud upload.

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
