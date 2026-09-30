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
| `shards.js logo.js stone.js sigil.js` | Fate Shard art (`SHARD_ART.<type><0-2>`), `LOGO_URL`, `STONE_ART`, `SIGIL_ART` (currency icon). |
| `home.js` | `HOME_ART`: the homebase map (1536×1024 WebP) used as the main menu. |
| `privacy.html favicon.png` | Copied into `dist/`. |
| `0001_saves.sql` | Supabase table `saves` (one row per user, RLS own-row only) + `delete_my_account()`. |
| `campaign-sim.cjs` | Test: for each of the 4 starters, a simulated new player (farms lower stages after a loss, upgrades gear, ascends, buys and summons shards, picks the best team per essence) must finish the campaign within 8,000 battles. Must print PASS 4×; the battle count shows how long the grind is. |

The currency is called **Sigils** in the game but stored as `S.silver` (and `winSilver`, `rankCost().silver`, `TUNE.silver` in the engine); keep those names, saves depend on them. Show it with `ic('coin')` / `sigils(n)` in app.js.

Internal ids are partly Dutch (legacy): enemy ids (`botkrijger`, `hellehond`…), gear slots (`wapen helm schild handschoenen borstpantser laarzen`), set ids (`krijger`, `levensbron`…), tabs (`campagne kerkers altaar`). Display names are English. Do not rename ids: saves depend on them.

## Navigation (app.js)

There is no tab bar (`#tabs` is hidden by CSS). The main menu is **Home** (`tab = 'home'`): the homebase map with clickable buildings (`HOME_ZONES`: building box + name plate in image pixels). Active: Campaign, Boss Halls, Summon Altar (Fate Altar), Heroes & Gear, Town Hall (profile). Zones without `go` show a "Coming soon" plate that covers the painted name, so those buildings (forge, arena, research, ship, market, challenge gate) can become any future mode: give the zone a `go`. Every other screen starts with `backBar()` ("‹ Home"; Heroes and Team share a switch). The logo also leads home.

## Game systems (engine.js)

- **Essences:** Ember → Verdant → Storm → Frost → Radiant → Umbral → Ember; Aether neutral. Strong Hit ×1.2 (crit ok, debuff ×1.15, 2 break), Normal ×1.0 (1 break), Weak ×0.75 (no crit, debuff ×0.5, 0 break).
- **Turn meter:** units fill by Speed to 100. `Battle.predict(n)` shows turn order.
- **Damage:** ATK × mult → crit (1 + cdmg%) → hit type → × 100/(100+DEF) → modifiers. Debuff chance: base × hitmod × (1 + (acc − res)/100), clamped.
- **Heroes:** 50 in `CHAMPS` (8 Uncommon, 14 Rare, 17 Epic, 11 Legendary). Heroes 26-50 (`kaelira` … `celesthyr`) are Fate Altar only and reuse existing passive ids (incl. boss passives); `harmony` (Liora) is theirs alone. Legendaries only from the Fate Altar, stat mult ×1.4. Level cap = min(rarity cap, stars × 10). Captured enemies become weak heroes (`captured: true`).
- **Bosses:** 25 in `BOSSES`, 2–3 phases, passive, Break Meter (Affinity Break = 2-turn stun, +15% damage taken). Per-boss power `BOSS_PW` was calibrated by simulation.
- **New players:** start with no heroes (`S.needStarter`) and pick one of `K.STARTERS` (Krothar, Drakulen, Zephara, Thalnir; all Epic). Chapter I builds the team: stage 1 is solo vs 1 enemy per phase, stages 2-3 are 2 enemies per phase (`CHAPTERS[0].shapes`), and first clears of stages 1-3 unlock Draelyn, Bromir and Skavren, who join the team while it has fewer than 4. Grythor, Vaessa and Brukkar unlock on stage 3 of Chapters II-IV.
- **Enemies:** 50 in `ENEMIES` (Common/Uncommon/Rare), all capturable via `CAPTURE_ROLE`. Enemies 26-50 have English ids (`gravestalker` … `thundergolem`). Each chapter has a themed `pool` (regular + elite, 8-11 distinct foes per chapter); `stageGroup` mixes them so the phases of a stage differ.
- **Campaign:** `CHAPTERS` (10 × 7 stages, names/desc/set per chapter). Stage 1–6 drop weapon/helmet/shield/gloves/chest/boots, stage 7 = chapter boss, random slot. Each chapter drops its own gear set.
- **Campaign difficulties** (`K.DIFFS`): Easy → Normal → Hard → Brutal → Nightmare, each the whole campaign again with enemies `lvl` levels higher and `f` times stronger (`stageUnits(st, lvl, p, d)`). A difficulty opens once all 70 stages of the previous one are cleared. Gear drops only the difficulty's `rars` (Easy Uncommon/Rare, Normal Rare/Epic, Hard Epic/Legendary, Brutal Legendary, Nightmare Legendary/Mythical); `stageLoot(st, d)` gives the chance of the higher rarity (grows per chapter and on boss stages). Hero unlocks only happen on Easy. Save: `S.cleared` = Easy progress, `S.dcl[d]` = progress on difficulty d ≥ 1, `S.diff` = selected (the old Brutal mode `S.clearedHard` became Normal progress in `fixup()`). Only Easy is balanced by `campaign-sim.cjs`; the higher difficulties are endgame and tuned by hand.
- **Gear:** rarities 0-5; index 5 **Mythical** (red, `--r5`) is gear only (Nightmare), 25% stronger substats (`subScale`). Loot tables: `genGear({ rars, up })`; without `rars` (starting gear) rarity rolls freely. Boss Hall loot: `bossLoot(n)` (Rare/Epic on levels 1-4, Epic/Legendary on 5-8, Legendary on 9-10). **Sets do not stack**: `activeSets` counts each set once. Crit rate is capped at `CRIT_CAP` (75%), also with buffs.
- **Phases:** every stage and Boss Hall level is `PHASES` (3) fights in a row. `STAGES[i].phases` holds 3 equal-size groups (`foes` = the last one; the chapter boss is in phase 3); `bossPhases(id, n)` = two groups of 3 minions sharing the boss's essence, then the boss. Between phases `phaseRest(heroes)`: survivors +15% HP, cooldowns reset, effects cleared, the fallen stay down. Rewards (`winXp`, `winSilver`, player XP) are per cleared stage and were doubled for this. The app walks survivors off to the right between phases (`nextPhase` in app.js).
- **Boss Hall:** 25 bosses × 10 levels, `bossLvl(i, n)`.
- **Fate Altar:** `FATE_SHARDS` (fate, greater, ancient, mythic, legendary) with drop chance per win and rarity table. A Fate Shard costs `SHARD_PRICE` (2500) Sigils. Pity: after `PITY_EPIC` (40) summons without an Epic or better, the next one is Epic (`S.pity`); only `PITY_SHARDS` (Ancient, Mythic, Legendary) count and trigger it.
- **Difficulty / grind:** `K.TUNE` in engine.js. `chDiff` makes campaign enemies stronger per chapter from Chapter III on (0.2 → Chapter X enemies ~2.6× their base), `bossWall` (1.05) extra for stage 7, `xp`/`silver` scale rewards. The game is meant to be a long grind (median ~2,800 battles for the Easy campaign); retune with `campaign-sim.cjs` after balance changes.
- **Player profile** (`S.p`, app.js): name (first change free, then `RENAME_COST` = 2500 silver; `S.p.renames` counts changes), avatar (a hero id), player level + XP, stats. Player XP comes from battles (`playerWinXp`, curve `pxNeed`); level-ups pay silver, every 5th level a Greater Fate Shard. `PLAYER_UNLOCK` gates tabs: Fate Altar at level 5, Boss Hall at level 10. The header `#account` button opens the profile screen (tab `profiel`), which also holds the cloud account section (`FFH_CLOUD.info()` / `openAccount()`).
- **Auto battle** (`S.auto`) is remembered: once switched on it stays on for every battle until turned off. Auto, speed and give up are small round icon buttons (`.b-ctl .rb`) over the top right of the battle view.
- **Battle speed** (app.js `SPEED_UNLOCK`): 2× from Chapter I · Stage 4, 3× from Chapter III · Stage 1, 5× from Chapter II · Stage 1 but only when replaying a cleared stage or beaten Boss Hall level. `S.speed` is the preferred speed; `spd` is what the current battle runs at. At 5× (`calm()`) there are no screen flashes or shakes, hit flashes are faint and combat sounds are throttled (`SFX.calm`).
- **Feeding and skills:** any hero outside the team, or a spare copy (`S.fodder[id]`: captured enemies and Fate Altar duplicates), can be fed for XP (`feedXp`, more for rarer and higher-level food; Rare+ asks "Are you sure?"). A spare copy of the same hero raises its lowest skill by one level instead (`skillUp`). Skills max at `SKILL_MAX` (5), +`SKILL_STEP` (8%) power per level, cooldown −1 at max.
- **Ascension Stones** (`S.stones`) buy stars. **Fodder** (`S.fodder`): 5% chance per stage win to capture a non-boss enemy.
- **Unlock messages:** `newUnlocks()` after a battle shows a popup for speed 3×, speed 5×, the Fate Altar and the Boss Hall, once each (`S.seen`).
- **Formation** (app.js `formation`): tanks (role or role2) and warriors stand in the front line (`HERO_POS` 0 and 2), everyone else in the back line (1 and 3); a line with more than two heroes spills over.
- **Hero Gear tab:** six tiles (one per slot) with an Upgrade button each; tapping a tile opens `gearPop(slot)` with the stats, Upgrade, Swap, Remove. "Upgrade all" (`upgradeAll`) spends Sigils on the worn gear, the most important piece for the hero's role first (`GEAR_PRI`, e.g. tanks HP/DEF), each as far as it goes.

## Save format (app.js)

`S` in localStorage key `ffh-save` (old key `kronen-van-as-v1` still read). Current version `v: 7`; `migrate()` upgrades older saves. When changing the save shape: bump `v`, add a migration step, keep old saves working. Small optional fields added within a version get a default in `fixup()`. Progress reset for everyone: `RESET` in app.js; any save (local or cloud) with a lower `reset` is replaced by `resetSave()` on load (keeps name and settings). Raising `RESET` wipes every player's progress once they open the game, so only do it on purpose. `save()` also queues a cloud upload.

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
