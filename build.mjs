// Builds dist/index.html. No dependencies: `node build.mjs`.
// Source files are looked up in src/, src/assets/, assets/, public/ or the repository root,
// so the build also works when files were uploaded without their folders.
// Supabase config comes from environment variables (Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL       e.g. https://abcdefgh.supabase.co
//   SUPABASE_ANON_KEY  the public anon or publishable key (safe in browsers; data is protected by Row Level Security)
// Without them the game builds in offline mode (browser saves only).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';

const DIRS = ['./src/', './src/assets/', './assets/', './public/', './'];
const missing = [];
const find = name => {
  const dir = DIRS.find(d => existsSync(new URL(d + name, import.meta.url)));
  if (!dir) { missing.push(name); return null; }
  return new URL(dir + name, import.meta.url);
};
const read = name => { const p = find(name); return p ? readFileSync(p, 'utf8') : ''; };

const assets = ['heroes', 'enemies', 'bosses', 'portraits', 'shards', 'logo', 'stone', 'sigil', 'home', 'gear', 'devhero', 'manga', 'chbg', 'sheets'].map(n => read(n + '.js')).join('\n');
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
  .replace('/*APP*/', () => `window.FFH_CONFIG = ${JSON.stringify(config)};\n` + cloud + '\n' + app);

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Fate Forged Heroes: a turn-based fantasy RPG. Summon heroes at the Fate Altar, forge your team and fight through ten chapters and a hall of bosses.">
<meta name="theme-color" content="#110e13">
<meta property="og:title" content="Fate Forged Heroes">
<meta property="og:description" content="Turn-based fantasy RPG in your browser.">
<link rel="icon" href="/favicon.png">
</head>
<body style="margin:0;background:#110e13">
`;
const out = new URL('./dist/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('index.html', out), head + shell + '\n</body>\n</html>\n');
// Static extras (optional)
for (const f of ['privacy.html', 'favicon.png', 'email-logo.png']) {
  const dir = DIRS.find(d => existsSync(new URL(d + f, import.meta.url)));
  if (dir) copyFileSync(new URL(dir + f, import.meta.url), new URL(f, out));
  else console.warn(`Note: ${f} not found, skipped.`);
}
// Animated heroes (sheets/<id>.js: every move) and characters with pose pictures (poses/<id>.js), loaded by the game when
// that character is in a battle
for (const dirName of ['sheets', 'poses']) {
  const dir = DIRS.find(d => existsSync(new URL(d + dirName + '/', import.meta.url)));
  if (!dir) { console.warn(`Note: / not found, those characters use their still picture.`); continue; }
  mkdirSync(new URL(dirName + '/', out), { recursive: true });
  for (const f of readdirSync(new URL(dir + dirName + '/', import.meta.url))) if (f.endsWith('.js')) copyFileSync(new URL(dir + dirName + '/' + f, import.meta.url), new URL(dirName + '/' + f, out));
}
console.log(`Built dist/index.html (${config.supabaseUrl ? 'online: ' + config.supabaseUrl : 'offline mode, no SUPABASE_URL set'})`);
