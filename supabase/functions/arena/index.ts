// Supabase Edge Function `arena`: the only place where arena fights are decided.
// Deployed by .github/workflows/arena-function.yml, which first writes engine.mjs (engine.js + `export default K`)
// next to this file, so the server always runs the same engine as the game.
// Env (set by Supabase itself, never in code): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import K from './engine.mjs';
import { handle } from './logic.js';

const URL0 = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// REST call with the service role (bypasses row level security; stays on the server)
async function rest(path: string, opts: { method?: string; body?: unknown; prefer?: string } = {}) {
  const headers: Record<string, string> = { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' };
  if (opts.prefer) headers.Prefer = opts.prefer;
  const res = await fetch(URL0 + '/rest/v1/' + path, { method: opts.method || 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const text = await res.text();
  if (!res.ok) throw new Error('db ' + res.status + ': ' + text);
  return text ? JSON.parse(text) : null;
}
const eq = (v: string) => 'eq.' + encodeURIComponent(v);

const db = {
  async getPlayer(id: string) { return (await rest('arena_players?select=*&user_id=' + eq(id)))[0] || null; },
  async createPlayer(id: string, f: Record<string, unknown>) {
    await rest('arena_players?on_conflict=user_id', { method: 'POST', body: { user_id: id, ...f }, prefer: 'resolution=ignore-duplicates' });
    return db.getPlayer(id);
  },
  async updatePlayer(id: string, f: Record<string, unknown>) {
    return (await rest('arena_players?user_id=' + eq(id), { method: 'PATCH', body: { ...f, updated_at: new Date().toISOString() }, prefer: 'return=representation' }))[0];
  },
  // players with a defense team near this rating (widening when there are few)
  async opponents(id: string, rating: number) {
    const sel = 'arena_players?select=user_id,name,avatar,rating,defense_power,defense&defense=not.is.null&user_id=neq.' + encodeURIComponent(id);
    let rows = await rest(sel + '&rating=gte.' + (rating - 250) + '&rating=lte.' + (rating + 250) + '&order=updated_at.desc&limit=30');
    if (rows.length < 3) rows = await rest(sel + '&order=updated_at.desc&limit=30');
    return rows;
  },
  async takeToken(id: string, perMin: number, max: number) { return rest('rpc/arena_take_token', { method: 'POST', body: { uid: id, per_min: perMin, max_tokens: max } }); },
  async apply(att: string, def: string | null, attDelta: number, defDelta: number, won: boolean) {
    return (await rest('rpc/arena_apply', { method: 'POST', body: { att, def, att_delta: attDelta, def_delta: defDelta, won } }))[0];
  },
  async log(row: Record<string, unknown>) { await rest('arena_log', { method: 'POST', body: row }); },
  async unclaimed(id: string) { return (await rest('arena_rewards?select=id&claimed=is.false&user_id=' + eq(id))).length; },
  // guild boss (0006_guilds.sql)
  async guildOf(id: string) { const r = await rest('guild_members?select=guild_id&user_id=' + eq(id)); return r[0] ? r[0].guild_id : null; },
  async progress(id: string) { const r = await rest('saves?select=cleared:data->cleared,dcl:data->dcl&user_id=' + eq(id)); return r[0] || null; },
  async keysUsed(id: string) { return rest('rpc/gboss_keys_used', { method: 'POST', body: { uid: id } }); },
  async gbossHit(row: Record<string, unknown>) { await rest('guild_boss_hits', { method: 'POST', body: row }); },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  // who is calling: the player's own access token, checked by Supabase Auth
  const auth = req.headers.get('Authorization') || '';
  const who = await fetch(URL0 + '/auth/v1/user', { headers: { apikey: ANON, Authorization: auth } });
  if (!who.ok) return json({ error: 'Please sign in again.' }, 401);
  const user = await who.json();
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  try {
    const out = await handle(K, db, user, body);
    return json(out, out.status || 200);
  } catch (e) {
    console.error(e);
    return json({ error: 'The arena is not available right now.' }, 500);
  }
});
