// Builds dist/index.html. No dependencies: `node build.mjs`.
// Source files are looked up in src/, src/assets/, assets/, public/ or the repository root,
// so the build also works when files were uploaded without their folders.
// Supabase config comes from environment variables (Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL       e.g. https://abcdefgh.supabase.co
//   SUPABASE_ANON_KEY  the public anon or publishable key (safe in browsers; data is protected by Row Level Security)
// Without them the game builds in offline mode (browser saves only).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIRS = ['./src/', './src/assets/', './assets/', './public/', './'];
const missing = [];
const find = name => {
  const dir = DIRS.find(d => existsSync(new URL(d + name, import.meta.url)));
  if (!dir) { missing.push(name); return null; }
  return new URL(dir + name, import.meta.url);
};
const read = name => { const p = find(name); return p ? readFileSync(p, 'utf8') : ''; };

const assets = ['shards', 'logo', 'stone', 'sigil', 'menu', 'bg', 'gear', 'manga', 'chbg', 'sheets', 'cards', 'story'].map(n => read(n + '.js')).join('\n');
const shellSrc = read('shell.html'), engine = read('engine.js'), bgs = read('bgs.js'), sprites = read('sprites.js'), cloud = read('cloud.js'), app = read('app.js');
if (missing.length) {
  console.error(`\nMissing files: ${missing.join(', ')}\nUpload them to the GitHub repository (in src/ or in the root).\n`);
  process.exit(1);
}

const config = { supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '' };
const shell = shellSrc
  .replace('/*ASSETS*/', () => assets)
  .replace('/*ENGINE*/', () => engine)
  .replace('/*SPRITES*/', () => bgs + '\n' + sprites)
  .replace('/*APP*/', () => `window.FFH_CONFIG = ${JSON.stringify(config)};\nwindow.FFH_BUILD = '@@BUILD@@';\n` + cloud + '\n' + app);

const head = `<!doctype html>
<html lang="en" style="background:#110e13">
<head>
<meta charset="utf-8">
<script>
// on a computer (a mouse or trackpad, no touch screen) the game plays inside a phone on its side (desktop.html), so it
// looks exactly as on a phone (always; the page inside the phone, ?inapp=1, stays where it is)
(function () { try {
  var q = location.search;
  if (location.protocol === 'file:' || window.top !== window.self || /[?&]inapp=1/.test(q)) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  location.replace('/desktop.html' + q + location.hash);
} catch (e) { /* play as it is */ } })();
</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Fate Forged Heroes: a turn-based fantasy RPG. Summon heroes at the Fate Altar, forge your team and fight through ten chapters and a hall of bosses.">
<meta name="theme-color" content="#110e13">
<meta property="og:title" content="Fate Forged Heroes">
<meta property="og:description" content="Turn-based fantasy RPG in your browser.">
<link rel="icon" href="/favicon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Fate Forged">
</head>
<body style="margin:0">
`;
const out = new URL('./dist/', import.meta.url);
mkdirSync(out, { recursive: true });
// Build id: a hash of the page (or FFH_BUILD from the environment), stamped into it as window.FFH_BUILD and written to
// version.json; an open game tab polls that file and offers a reload when a newer build is live (app.js checkVersion)
const page = head + shell + '\n</body>\n</html>\n';
const build = (process.env.FFH_BUILD || createHash('sha256').update(page).digest('hex').slice(0, 12)).replace(/[^\w.-]/g, '');
writeFileSync(new URL('index.html', out), page.replace("window.FFH_BUILD = '@@BUILD@@'", () => `window.FFH_BUILD = '${build}'`));
writeFileSync(new URL('version.json', out), JSON.stringify({ build }) + '\n');
// Static extras (optional)
// manifest.webmanifest + icon-192/512.png: installed on a home screen the game opens full screen and on its side
for (const f of ['privacy.html', 'desktop.html', 'favicon.png', 'email-logo.png', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']) {
  const dir = DIRS.find(d => existsSync(new URL(d + f, import.meta.url)));
  if (dir) copyFileSync(new URL(dir + f, import.meta.url), new URL(f, out));
  else console.warn(`Note: ${f} not found, skipped.`);
}
// Animated characters (sheets/<id>.js: every move), the sharp battle art of the manga characters (hi/<id>.js: the
// figure at k = 4 and its poses) and the painted chapter backgrounds (backgrounds/ch<n>.webp), loaded by the game when a
// battle needs them
for (const dirName of ['sheets', 'hi', 'backgrounds']) {
  const dir = DIRS.find(d => existsSync(new URL(d + dirName + '/', import.meta.url)));
  if (!dir) { console.warn(`Note: / not found, those characters use their still picture.`); continue; }
  mkdirSync(new URL(dirName + '/', out), { recursive: true });
  for (const f of readdirSync(new URL(dir + dirName + '/', import.meta.url))) if (/\.(js|webp)$/.test(f)) copyFileSync(new URL(dir + dirName + '/' + f, import.meta.url), new URL(dirName + '/' + f, out));
}
console.log(`Built dist/index.html, build ${build} (${config.supabaseUrl ? 'online: ' + config.supabaseUrl : 'offline mode, no SUPABASE_URL set'})`);
