// ================= CLOUD: Supabase accounts + cloud saves (no dependencies, plain fetch) =================
// Reads window.FFH_CONFIG = { supabaseUrl, supabaseAnonKey } (injected at build time).
// Without config the game runs fully offline with browser saves only.
(function () {
  const CFG = window.FFH_CONFIG || {};
  const URL0 = (CFG.supabaseUrl || '').replace(/\/$/, '');
  const KEY = CFG.supabaseAnonKey || '';
  const enabled = !!(URL0 && KEY);
  const SESSION_KEY = 'ffh-session';
  const GUEST_KEY = 'ffh-guest';
  let session = null, api = null, pushT = 0, lastPushed = '', busy = false, googleOn = false, expired = null;

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const now = () => Math.floor(Date.now() / 1000);

  async function req(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, opts.headers || {});
    if (opts.auth !== false && session) headers.Authorization = 'Bearer ' + session.access_token;
    const res = await fetch(URL0 + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) { const msg = (data && (data.msg || data.error_description || data.message || data.error)) || ('HTTP ' + res.status); const err = new Error(msg); err.status = res.status; throw err; }
    return data;
  }

  // ---------- session ----------
  function keep(tok) {
    if (!tok || !tok.access_token) return null;
    session = { access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: tok.expires_at || (now() + (+tok.expires_in || 3600)), user: tok.user || (session && session.user) || null };
    store.set(SESSION_KEY, session);
    remember(); // a refresh token is used up when renewed: the list must hold the newest one
    return session;
  }

  // ---------- several accounts on one device ----------
  // ACCOUNTS_KEY lists the accounts signed in on this device (newest session, email, name, level), so a player can switch
  // without typing the password again. The account being played uses the normal keys (SAVE_KEYS: its save, backups and
  // cloud base); the others' copies wait under '<key>@<user id>' and are swapped in on a switch, after which the page
  // reloads so no state of the other account is left behind. ADD_KEY marks "adding an account" (sign-in screen with a way back).
  const ACCOUNTS_KEY = 'ffh-accounts', ADD_KEY = 'ffh-adding', MAX_ACCOUNTS = 5;
  const SAVE_KEYS = ['ffh-save', 'kronen-van-as-v1', 'ffh-save-backup', 'ffh-cloud-base'];
  const raw = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };
  function accounts() { const l = store.get(ACCOUNTS_KEY); return Array.isArray(l) ? l.filter(a => a && a.uid && a.session) : []; }
  function remember() {
    if (!session || !session.user || !session.user.id) return;
    const S = api && api.get && api.get(), p = (S && S.p) || {}, l = accounts(), i = l.findIndex(a => a.uid === session.user.id);
    const old = i >= 0 ? l[i] : {}, a = { uid: session.user.id, email: session.user.email || old.email || '', name: p.name || old.name || '', lvl: p.lvl || old.lvl || 1, session };
    if (i >= 0) l[i] = a; else l.push(a);
    store.set(ACCOUNTS_KEY, l.slice(-MAX_ACCOUNTS));
  }
  function forget(uid) { store.set(ACCOUNTS_KEY, accounts().filter(a => a.uid !== uid)); SAVE_KEYS.forEach(k => raw.set(k + '@' + uid, null)); }
  const stash = uid => SAVE_KEYS.forEach(k => raw.set(k + '@' + uid, raw.get(k)));
  const hasStash = uid => SAVE_KEYS.some(k => raw.get(k + '@' + uid) != null);
  function unstash(uid) { SAVE_KEYS.forEach(k => { raw.set(k, raw.get(k + '@' + uid)); raw.set(k + '@' + uid, null); }); }
  // upload this account's save and park it, so another one can take its place
  async function leave() {
    if (api.flush) api.flush();
    await push(true);
    remember(); stash(session.user.id);
  }
  async function switchTo(uid) {
    const t = accounts().find(a => a.uid === uid); if (!t || !session || t.uid === session.user.id) return;
    if (api.busy && api.busy()) { api.toast('Finish your battle first.'); return; }
    await leave();
    unstash(uid); store.set(SESSION_KEY, t.session); store.set(GUEST_KEY, null);
    location.reload();
  }
  async function addAccount() {
    if (api.busy && api.busy()) { api.toast('Finish your battle first.'); return; }
    if (accounts().length >= MAX_ACCOUNTS) { api.toast(`At most ${MAX_ACCOUNTS} accounts on one device. Sign one out first.`); return; }
    await leave();
    SAVE_KEYS.forEach(k => raw.set(k, null)); store.set(SESSION_KEY, null); store.set(ADD_KEY, session.user.id);
    location.reload();
  }
  // "Back": give up adding and return to the account we came from
  function cancelAdd() {
    const t = accounts().find(a => a.uid === store.get(ADD_KEY));
    store.set(ADD_KEY, null);
    if (!t) { loginScreen(); return; }
    unstash(t.uid); store.set(SESSION_KEY, t.session);
    location.reload();
  }
  async function refresh() {
    if (!session || !session.refresh_token) return null;
    try { return keep(await req('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: session.refresh_token } })); }
    catch (e) { session = null; store.set(SESSION_KEY, null); return null; }
  }
  async function valid() {
    if (!session) return null;
    if (session.expires_at - now() < 60) await refresh();
    return session;
  }
  function fromUrlHash() {
    // OAuth (Google) and email-confirmation links return tokens in the URL fragment
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('error_description')) { history.replaceState(null, '', location.pathname + location.search); return { error: h.get('error_description') }; }
    if (!h.get('access_token')) return null;
    const tok = { access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: h.get('expires_in'), expires_at: +h.get('expires_at') || 0 };
    history.replaceState(null, '', location.pathname + location.search);
    return tok;
  }
  async function loadUser() {
    try { session.user = await req('/auth/v1/user'); store.set(SESSION_KEY, session); } catch (e) { /* keep token user */ }
  }

  // ---------- saves ----------
  // One save row per account. Every device remembers which cloud version its local save is based on
  // (BASE_KEY: user id, the row's updated_at, and a hash of the save at that moment). An upload only
  // succeeds while the cloud row still has that updated_at, so two devices can never silently overwrite
  // each other. When both sides changed, the player chooses which save to keep.
  const BASE_KEY = 'ffh-cloud-base';
  const isFresh = s => !s || ((s.cleared ?? -1) < 0 && Object.keys(s.bh || {}).length === 0);
  const content = s => JSON.stringify(Object.assign({}, s, { savedAt: 0 }));
  const hash = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = (h * 33 + str.charCodeAt(i)) | 0; return str.length + ':' + h; };
  let conflictOpen = false;
  function getBase() { const b = store.get(BASE_KEY); return b && session && session.user && b.uid === session.user.id ? b : null; }
  function setBase(at, s) { store.set(BASE_KEY, { uid: session.user.id, at, hash: hash(content(s)) }); lastPushed = JSON.stringify(s); }
  async function pull() {
    const rows = await req('/rest/v1/saves?select=data,updated_at&user_id=eq.' + encodeURIComponent(session.user.id));
    return rows && rows[0] ? rows[0] : null;
  }
  function takeCloud(row, msg) {
    if (msg) api.toast(msg); // first, so a message raised while loading (e.g. a season reset) stays visible
    api.set(row.data);
    setBase(row.updated_at, api.get());
    setStatus('saved');
  }
  async function push(force) {
    if (!enabled || !api || conflictOpen || busy || !(await valid())) return;
    const S = api.get(), body = JSON.stringify(S), base = getBase();
    if (!force && body === lastPushed) return;
    if (!base) return; // not synced with this account yet: sync() decides first
    try {
      const payload = { data: S, version: S.v || 0, updated_at: new Date().toISOString() };
      const rows = await req('/rest/v1/saves?user_id=eq.' + encodeURIComponent(session.user.id) + '&updated_at=eq.' + encodeURIComponent(base.at),
        { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: payload });
      if (rows && rows[0]) { setBase(rows[0].updated_at, S); setStatus('saved'); }
      else await sync(); // the cloud changed on another device since we last synced
    } catch (e) { setStatus('error', e.message); }
  }
  async function sync() {
    if (busy || conflictOpen || !session) return; busy = true;
    try {
      setStatus('syncing');
      const row = await pull();
      const local = api.get(), base = getBase();
      if (!row) {
        const rows = await req('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { user_id: session.user.id, data: local, version: local.v || 0, updated_at: new Date().toISOString() } });
        setBase(rows[0].updated_at, local); setStatus('saved'); api.toast('Your progress is now saved to your account.');
      } else if (content(local) === content(row.data)) { setBase(row.updated_at, local); setStatus('saved'); }
      else if (isFresh(local)) takeCloud(row, 'Cloud save loaded.');
      else if (base && base.at === row.updated_at) {
        // nobody else saved since our last sync: our local changes win
        busy = false; await push(true); return;
      } else if (base && base.hash === hash(content(local))) takeCloud(row, 'Loaded your newer progress from another device.');
      else { busy = false; setStatus('saved'); chooseSave(row, local); return; }
    } catch (e) { setStatus('error', e.message); }
    busy = false;
  }
  // both this device and the cloud have progress the other lacks: the player picks one
  function chooseSave(row, local) {
    conflictOpen = true;
    const when = t => t ? new Date(t).toLocaleString() : 'unknown';
    const card = (title, s, t, k) => `<div class="save-pick"><h3>${title}</h3><div class="save-sum">${api.summary(s)}</div><small class="auth-sub">Last saved ${when(t)}</small><button class="btn ${k === 'cloud' ? 'primary' : ''}" type="button" data-pick="${k}">Keep this save</button></div>`;
    const o = overlay(`
      <h2 id="auth-h">Two different saves</h2>
      <p class="auth-sub">This device has different progress than your account. Pick the save you want to keep. The other one is replaced for good.</p>
      <div class="save-picks">${card('Saved in your account', row.data, Date.parse(row.updated_at), 'cloud')}${card('On this device', local, local.savedAt, 'local')}</div>`);
    o.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', async () => {
      const k = b.dataset.pick;
      if (b.dataset.armed !== '1') { o.querySelectorAll('[data-pick]').forEach(x => { x.dataset.armed = ''; x.textContent = 'Keep this save'; }); b.dataset.armed = '1'; b.textContent = 'Click again to confirm'; return; }
      conflictOpen = false; closeOverlay();
      if (k === 'cloud') takeCloud(row, 'Your account save is loaded on this device.');
      else { store.set(BASE_KEY, { uid: session.user.id, at: row.updated_at, hash: '' }); await push(true); api.toast('This device’s save is now stored in your account.'); }
    }));
  }

  // ---------- UI ----------
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let status = { k: 'off', msg: '' };
  function setStatus(k, msg) { status = { k, msg: msg || '' }; paintAccount(); }
  // the game paints the account button (avatar, level) and the profile screen; it reads our state via FFH_CLOUD.info()
  function paintAccount() { if (api && api.paint) api.paint(); }
  function overlay(html) {
    let o = $('#auth');
    if (!o) { o = document.createElement('div'); o.id = 'auth'; document.body.appendChild(o); }
    o.innerHTML = `<div class="auth-box" role="dialog" aria-modal="true" aria-labelledby="auth-h">${html}</div>`;
    o.hidden = false; return o;
  }
  function closeOverlay() { const o = $('#auth'); if (o) o.hidden = true; }
  function loginScreen(msg, isErr, email) {
    const adding = store.get(ADD_KEY), from = adding && accounts().find(a => a.uid === adding);
    // the sign-in of the account on this device ran out: its other accounts can still be played
    const others = !from && expired ? accounts().filter(a => a.uid !== expired) : [];
    const o = overlay(`
      <img class="auth-logo" src="${typeof LOGO_URL !== 'undefined' ? LOGO_URL : ''}" alt="Fate Forged Heroes">
      <h2 id="auth-h">${from ? 'Add another account' : 'Sign in to save your progress'}</h2>
      <p class="auth-sub">${from ? 'Sign in with the other account, or create a new one. You stay signed in on both and can switch any time from your account menu.' : 'Your heroes, gear and progress are stored in your account, so you can continue on any device.'}</p>
      ${msg ? `<p class="auth-msg ${isErr ? 'bad' : ''}">${msg}</p>` : ''}
      <button class="btn primary auth-google" type="button" data-auth="google" ${googleOn ? '' : 'hidden'}><svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#EA4335" d="M9 3.5c1.6 0 2.7.7 3.3 1.3l2.4-2.4C13.3 1 11.3 0 9 0 5.5 0 2.4 2 1 5l2.8 2.2C4.4 5.1 6.5 3.5 9 3.5z"/><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.1-.2-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6l2.7 2.1c1.6-1.5 2.9-3.7 2.9-6.3z"/><path fill="#FBBC05" d="M3.8 10.8c-.2-.5-.3-1.1-.3-1.8s.1-1.2.3-1.8L1 5C.4 6.2 0 7.6 0 9s.4 2.8 1 4l2.8-2.2z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.7-2.1c-.8.5-1.9.9-3.3.9-2.5 0-4.6-1.7-5.3-3.9L1 13c1.5 3 4.5 5 8 5z"/></svg>Continue with Google</button>
      ${googleOn ? '<div class="auth-or"><span>or with email</span></div>' : ''}
      <form class="auth-form" novalidate>
        <label>Email<input type="email" name="email" autocomplete="email" required value="${(email || '').replace(/[&<>"]/g, '')}"></label>
        <label>Password<input type="password" name="password" autocomplete="current-password" minlength="6" required></label>
        <div class="auth-row"><button class="btn primary" type="submit" data-mode="in">Sign in</button><button class="btn" type="submit" data-mode="up">Create account</button></div>
        <button class="linkbtn" type="button" data-auth="reset">Forgot password?</button>
      </form>
      ${others.length ? `<div class="acc-switch"><h3>Or play another account</h3><div class="acc-list">${others.map(a => `<button class="acc-pick" type="button" data-as="${esc(a.uid)}"><b>${esc(a.name || 'Adventurer')}</b><span>${esc(a.email)} · level ${+a.lvl || 1}</span></button>`).join('')}</div></div>` : ''}
      ${from ? `<button class="linkbtn auth-guest" type="button" data-auth="back">‹ Back to ${esc(from.name || from.email)}</button>`
        : '<button class="linkbtn auth-guest" type="button" data-auth="guest">Play without an account (saves only in this browser)</button>'}
      <p class="auth-legal">By signing in you agree to our <a href="/privacy.html" target="_blank" rel="noopener">privacy policy</a>.</p>`);
    let mode = 'in';
    o.querySelectorAll('button[type=submit]').forEach(b => b.addEventListener('click', () => (mode = b.dataset.mode)));
    o.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, email = f.email.value.trim(), password = f.password.value;
      if (!email || password.length < 6) { loginScreen('Enter your email and a password of at least 6 characters.', true); return; }
      try {
        if (mode === 'up') {
          const r = await req('/auth/v1/signup', { method: 'POST', auth: false, body: { email, password } });
          // Supabase answers a sign-up for an existing email with a user that has no identities (and no session)
          const u = r && (r.user || r);
          if (r && !r.access_token && u && Array.isArray(u.identities) && u.identities.length === 0) loginScreen('There is already an account with this email. Sign in instead, or use "Forgot password?".', true);
          else if (r && r.access_token) { keep(r); await afterLogin(); }
          else loginScreen('Check your inbox and click the link in the email to confirm your account. Then sign in here.');
        } else {
          keep(await req('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } }));
          await afterLogin();
        }
      } catch (err) { loginScreen(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : /already registered/i.test(err.message) ? 'There is already an account with this email. Sign in instead, or use "Forgot password?".' : err.message, true); }
    });
    o.addEventListener('click', async e => {
      const as = e.target.closest('[data-as]');
      if (as) { const t = accounts().find(x => x.uid === as.dataset.as); if (!t) return; stash(expired); unstash(t.uid); store.set(SESSION_KEY, t.session); location.reload(); return; }
      const a = e.target.closest('[data-auth]'); if (!a) return;
      if (a.dataset.auth === 'google') location.href = URL0 + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(location.origin + location.pathname);
      else if (a.dataset.auth === 'guest') { store.set(GUEST_KEY, true); closeOverlay(); paintAccount(); }
      else if (a.dataset.auth === 'back') cancelAdd();
      else if (a.dataset.auth === 'reset') {
        const email = o.querySelector('input[name=email]').value.trim();
        if (!email) { loginScreen('Enter your email first, then click "Forgot password?".', true); return; }
        try { await req('/auth/v1/recover', { method: 'POST', auth: false, body: { email, redirect_to: location.origin + location.pathname } }); loginScreen('If that email has an account, a reset link is on its way.'); }
        catch (err) { loginScreen(err.message, true); }
      }
    });
  }
  // signing out (or deleting) an account removes it from this device; with other accounts left, the game moves to one of them
  function afterLeaving(uid, msg) {
    forget(uid); session = null; store.set(SESSION_KEY, null); lastPushed = '';
    const next = accounts()[0];
    if (next) { unstash(next.uid); store.set(SESSION_KEY, next.session); location.reload(); return; }
    closeOverlay(); paintAccount(); loginScreen(msg);
  }
  function accountMenu() {
    const others = accounts().filter(a => a.uid !== session.user.id);
    const row = a => `<button class="acc-pick" type="button" data-switch="${esc(a.uid)}"><b>${esc(a.name || 'Adventurer')}</b><span>${esc(a.email)} · level ${+a.lvl || 1}</span></button>`;
    const o = overlay(`
      <h2 id="auth-h">Your account</h2>
      <p class="auth-sub">Signed in as <b>${esc(session.user.email || '')}</b>. Progress saves automatically.</p>
      ${status.k === 'error' ? `<p class="auth-msg bad">Last cloud save failed: ${esc(status.msg)}</p>` : ''}
      <div class="auth-row"><button class="btn primary" type="button" data-acc="sync">Save now</button><button class="btn" type="button" data-acc="out">Sign out</button><button class="btn" type="button" data-acc="close">Close</button></div>
      <div class="acc-switch"><h3>Switch account</h3>
        ${others.length ? `<p class="auth-sub">Your other accounts on this device. Your progress here is saved first.</p><div class="acc-list">${others.map(row).join('')}</div>` : '<p class="auth-sub">Play a second account with another email without signing out: both stay signed in on this device.</p>'}
        <button class="btn" type="button" data-acc="add" ${others.length + 1 >= MAX_ACCOUNTS ? 'disabled' : ''}>+ Add another account</button></div>
      <div class="auth-danger"><h3>Delete account</h3><p>Deletes your account and your cloud save for good. This cannot be undone.</p>
        <button class="btn danger" type="button" data-acc="del">Delete my account</button></div>`);
    o.addEventListener('click', async e => {
      const sw = e.target.closest('[data-switch]');
      if (sw) { o.querySelectorAll('button').forEach(b => (b.disabled = true)); sw.querySelector('span').textContent = 'Switching…'; await switchTo(sw.dataset.switch); return; }
      const a = e.target.closest('[data-acc]'); if (!a) return;
      const k = a.dataset.acc;
      if (k === 'close') closeOverlay();
      else if (k === 'sync') { await push(true); api.toast(status.k === 'error' ? 'Cloud save failed.' : 'Saved to your account.'); closeOverlay(); }
      else if (k === 'add') { o.querySelectorAll('button').forEach(b => (b.disabled = true)); await addAccount(); }
      else if (k === 'out') { const uid = session.user.id; await push(true); try { await req('/auth/v1/logout', { method: 'POST' }); } catch (err) { /* ignore */ } afterLeaving(uid, 'You are signed out. Your progress stays in this browser too.'); }
      else if (k === 'del') {
        if (a.dataset.armed !== '1') { a.dataset.armed = '1'; a.textContent = 'Click again to delete for good'; return; }
        try { const uid = session.user.id; await valid(); await req('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} }); store.set(BASE_KEY, null); api.toast('Your account and cloud save were deleted.'); afterLeaving(uid, 'Your account and cloud save were deleted.'); }
        catch (err) { a.textContent = 'Delete failed: ' + err.message; }
      }
    });
  }
  async function afterLogin() {
    await valid(); if (!session) return;
    if (!session.user || !session.user.id) await loadUser();
    store.set(GUEST_KEY, null);
    const adding = store.get(ADD_KEY); store.set(ADD_KEY, null);
    // the save on this device belongs to an account whose sign-in ran out, but another one signed in: park that save first
    const prev = expired; expired = null;
    if (prev && prev !== session.user.id) { stash(prev); unstash(session.user.id); remember(); location.reload(); return; }
    // signed in to an account that is parked on this device (e.g. while adding one): play its own save, not this one
    if (hasStash(session.user.id)) { unstash(session.user.id); remember(); location.reload(); return; }
    remember();
    if (adding) api.toast('Account added. Switch between your accounts in the account menu.');
    closeOverlay(); paintAccount();
    await sync();
  }

  window.FFH_CLOUD = {
    enabled,
    // called by the game once it has booted; api = { get, set, toast }
    async attach(gameApi) {
      api = gameApi;
      if (!enabled) return;
      // Only show "Continue with Google" when the Google provider is switched on in Supabase
      try { const st = await req('/auth/v1/settings', { auth: false }); googleOn = !!(st && st.external && st.external.google); } catch (e) { googleOn = false; }
      session = store.get(SESSION_KEY);
      const was = session && session.user && session.user.email;
      expired = session && session.user && session.user.id; // cleared below while the sign-in still works
      const back = fromUrlHash();
      if (back && back.error) { loginScreen(back.error, true); return; }
      if (back) { keep(back); await loadUser(); await afterLogin(); }
      else if (session && (await valid())) { expired = null; await loadUser(); remember(); paintAccount(); await sync(); remember(); }
      else if (was) loginScreen('Your sign-in on this device has expired. Please sign in again.', false, was);
      else if (store.get(ADD_KEY) || !store.get(GUEST_KEY)) loginScreen();
      paintAccount();
      setInterval(() => { if (session) { push(); remember(); } }, 30000);
      // leaving the tab: upload; coming back: pick up progress made on another device in the meantime
      document.addEventListener('visibilitychange', () => { if (!session) return; if (document.visibilityState === 'hidden') push(); else sync(); });
    },
    // account state for the profile screen: { enabled, email, status: 'off' | 'syncing' | 'saved' | 'error' }
    info() { return { enabled, email: session && session.user ? session.user.email || 'your account' : null, status: status.k }; },
    // sign-in dialog, or the account menu when signed in
    openAccount() { if (!enabled) return; session && session.user ? accountMenu() : loginScreen(); },
    // signed in with a cloud account? (the arena and leaderboards need one)
    signedIn() { return !!(enabled && session && session.user); },
    // calls an Edge Function (e.g. 'arena'); resolves to the JSON reply, also for errors ({ error, state? }).
    // Throws only when the server cannot be reached.
    async fn(name, body) {
      if (!(await valid())) return { error: 'Please sign in first.' };
      const res = await fetch(URL0 + '/functions/v1/' + name, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
      let data = null; try { data = await res.json(); } catch (e) { data = null; }
      return data || { error: 'The server did not answer (HTTP ' + res.status + ').' };
    },
    // calls a database function (leaderboard, claim_arena_rewards)
    async rpc(name, body) { if (!(await valid())) throw new Error('Please sign in first.'); return req('/rest/v1/rpc/' + name, { method: 'POST', body: body || {} }); },
    // called on every local save; uploads a few seconds later
    queue() { if (!enabled || !session) return; clearTimeout(pushT); pushT = setTimeout(() => push(), 3000); },
  };
})();
