// Builds dist/index.html from src/. No dependencies: `node build.mjs`.
// Supabase config comes from environment variables (set them in Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL       e.g. https://abcdefgh.supabase.co
//   SUPABASE_ANON_KEY  the project's public "anon" key (safe to ship to browsers; data is protected by Row Level Security)
// Without them the game builds in offline mode (browser saves only).
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';

const r = p => readFileSync(new URL(p, import.meta.url), 'utf8');
// Art files: normally in src/assets/, but also accepted in src/, assets/ or the repo root.
const ASSET_DIRS = ['./src/assets/', './src/', './assets/', './'];
const ASSETS = ['heroes', 'enemies', 'bosses', 'portraits', 'shards', 'logo', 'stone'];
const missing = [];
const assets = ASSETS.map(n => {
  const dir = ASSET_DIRS.find(d => existsSync(new URL(`${d}${n}.js`, import.meta.url)));
  if (!dir) { missing.push(`${n}.js`); return ''; }
  return r(`${dir}${n}.js`);
}).join('\n');
if (missing.length) {
  console.error(`\nMissing art files: ${missing.join(', ')}\nUpload them to src/assets/ (or src/) in the GitHub repository.\n`);
  process.exit(1);
}
const config = { supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '' };
const shell = r('./src/shell.html')
  .replace('/*ASSETS*/', () => assets)
  .replace('/*ENGINE*/', () => r('./src/engine.js'))
  .replace('/*SPRITES*/', () => r('./src/bgs.js') + '\n' + r('./src/sprites.js'))
  .replace('/*APP*/', () => `window.FFH_CONFIG = ${JSON.stringify(config)};\n` + r('./src/cloud.js') + '\n' + r('./src/app.js'));

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Fate Forged Heroes: a turn-based fantasy RPG. Summon heroes at the Fate Altar, forge your team and fight through ten chapters and a hall of bosses.">
<meta name="theme-color" content="#110e13">
<meta property="og:title" content="Fate Forged Heroes">
<meta property="og:description" content="Turn-based fantasy RPG in your browser.">
<link rel="icon" href="/favicon.png">
</head>
<body style="margin:0;background:#110e13">
`;
mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), head + shell + '\n</body>\n</html>\n');
if (existsSync(new URL('./public/', import.meta.url))) cpSync(new URL('./public/', import.meta.url), new URL('./dist/', import.meta.url), { recursive: true });
console.log(`Built dist/index.html (${config.supabaseUrl ? 'online: ' + config.supabaseUrl : 'offline mode, no SUPABASE_URL set'})`);
