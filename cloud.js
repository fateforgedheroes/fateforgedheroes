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
  let session = null, api = null, pushT = 0, lastPushed = '', busy = false, googleOn = false;

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
    return session;
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
  const progress = s => (s && s.roster ? (s.cleared || 0) * 10 + Object.values(s.roster).reduce((t, h) => t + (h.lvl || 0), 0) : -1);
  const isFresh = s => !s || ((s.cleared ?? -1) < 0 && Object.keys(s.bh || {}).length === 0);
  async function pull() {
    const rows = await req('/rest/v1/saves?select=data,updated_at&user_id=eq.' + encodeURIComponent(session.user.id));
    return rows && rows[0] ? rows[0] : null;
  }
  async function push(force) {
    if (!enabled || !(await valid()) || !api) return;
    const S = api.get(); const body = JSON.stringify(S);
    if (!force && body === lastPushed) return;
    try {
      await req('/rest/v1/saves?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: session.user.id, data: S, version: S.v || 0, updated_at: new Date().toISOString() } });
      lastPushed = body; setStatus('saved');
    } catch (e) { setStatus('error', e.message); }
  }
  async function sync() {
    if (busy) return; busy = true;
    try {
      setStatus('syncing');
      const row = await pull();
      const local = api.get();
      if (!row) { await push(true); api.toast('Your progress is now saved to your account.'); }
      else {
        const cloud = row.data, cloudT = Date.parse(row.updated_at) || 0, localT = local.savedAt || 0;
        const takeCloud = isFresh(local) || (cloudT > localT && progress(cloud) >= progress(local) - 5);
        if (takeCloud) { api.set(cloud); lastPushed = JSON.stringify(api.get()); setStatus('saved'); api.toast('Cloud save loaded.'); }
        else { await push(true); }
      }
    } catch (e) { setStatus('error', e.message); }
    busy = false;
  }

  // ---------- UI ----------
  const $ = s => document.querySelector(s);
  let status = { k: 'off', msg: '' };
  function setStatus(k, msg) { status = { k, msg: msg || '' }; paintAccount(); }
  const ACC_IC = '<svg class="acc-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/></svg>';
  function paintAccount() {
    const b = $('#account'); if (!b) return;
    if (!enabled) { b.hidden = true; return; }
    b.hidden = false;
    if (session && session.user) {
      const who = session.user.email || 'Account';
      const dot = status.k === 'error' ? 'err' : status.k === 'syncing' ? 'sync' : 'ok';
      b.innerHTML = `${ACC_IC}<i class="acc-dot ${dot}"></i><span class="acc-name">${who.replace(/[&<>"]/g, '')}</span>`;
      b.title = status.k === 'error' ? 'Cloud save failed: ' + status.msg : status.k === 'syncing' ? 'Syncing…' : 'Progress saved to your account';
    } else { b.innerHTML = `${ACC_IC}<span class="acc-name">Sign in</span>`; b.title = 'Sign in to save your progress in the cloud'; }
  }
  function overlay(html) {
    let o = $('#auth');
    if (!o) { o = document.createElement('div'); o.id = 'auth'; document.body.appendChild(o); }
    o.innerHTML = `<div class="auth-box" role="dialog" aria-modal="true" aria-labelledby="auth-h">${html}</div>`;
    o.hidden = false; return o;
  }
  function closeOverlay() { const o = $('#auth'); if (o) o.hidden = true; }
  function loginScreen(msg, isErr) {
    const o = overlay(`
      <img class="auth-logo" src="${typeof LOGO_URL !== 'undefined' ? LOGO_URL : ''}" alt="Fate Forged Heroes">
      <h2 id="auth-h">Sign in to save your progress</h2>
      <p class="auth-sub">Your heroes, gear and progress are stored in your account, so you can continue on any device.</p>
      ${msg ? `<p class="auth-msg ${isErr ? 'bad' : ''}">${msg}</p>` : ''}
      <button class="btn primary auth-google" type="button" data-auth="google" ${googleOn ? '' : 'hidden'}><svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#EA4335" d="M9 3.5c1.6 0 2.7.7 3.3 1.3l2.4-2.4C13.3 1 11.3 0 9 0 5.5 0 2.4 2 1 5l2.8 2.2C4.4 5.1 6.5 3.5 9 3.5z"/><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.1-.2-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6l2.7 2.1c1.6-1.5 2.9-3.7 2.9-6.3z"/><path fill="#FBBC05" d="M3.8 10.8c-.2-.5-.3-1.1-.3-1.8s.1-1.2.3-1.8L1 5C.4 6.2 0 7.6 0 9s.4 2.8 1 4l2.8-2.2z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.7-2.1c-.8.5-1.9.9-3.3.9-2.5 0-4.6-1.7-5.3-3.9L1 13c1.5 3 4.5 5 8 5z"/></svg>Continue with Google</button>
      ${googleOn ? '<div class="auth-or"><span>or with email</span></div>' : ''}
      <form class="auth-form" novalidate>
        <label>Email<input type="email" name="email" autocomplete="email" required></label>
        <label>Password<input type="password" name="password" autocomplete="current-password" minlength="6" required></label>
        <div class="auth-row"><button class="btn primary" type="submit" data-mode="in">Sign in</button><button class="btn" type="submit" data-mode="up">Create account</button></div>
        <button class="linkbtn" type="button" data-auth="reset">Forgot password?</button>
      </form>
      <button class="linkbtn auth-guest" type="button" data-auth="guest">Play without an account (saves only in this browser)</button>
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
          if (r && r.access_token) { keep(r); await afterLogin(); }
          else loginScreen('Check your inbox and click the link in the email to confirm your account. Then sign in here.');
        } else {
          keep(await req('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } }));
          await afterLogin();
        }
      } catch (err) { loginScreen(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message, true); }
    });
    o.addEventListener('click', async e => {
      const a = e.target.closest('[data-auth]'); if (!a) return;
      if (a.dataset.auth === 'google') location.href = URL0 + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(location.origin + location.pathname);
      else if (a.dataset.auth === 'guest') { store.set(GUEST_KEY, true); closeOverlay(); paintAccount(); }
      else if (a.dataset.auth === 'reset') {
        const email = o.querySelector('input[name=email]').value.trim();
        if (!email) { loginScreen('Enter your email first, then click "Forgot password?".', true); return; }
        try { await req('/auth/v1/recover', { method: 'POST', auth: false, body: { email, redirect_to: location.origin + location.pathname } }); loginScreen('If that email has an account, a reset link is on its way.'); }
        catch (err) { loginScreen(err.message, true); }
      }
    });
  }
  function accountMenu() {
    const o = overlay(`
      <h2 id="auth-h">Your account</h2>
      <p class="auth-sub">Signed in as <b>${(session.user.email || '').replace(/[&<>"]/g, '')}</b>. Progress saves automatically.</p>
      ${status.k === 'error' ? `<p class="auth-msg bad">Last cloud save failed: ${status.msg}</p>` : ''}
      <div class="auth-row"><button class="btn primary" type="button" data-acc="sync">Save now</button><button class="btn" type="button" data-acc="out">Sign out</button><button class="btn" type="button" data-acc="close">Close</button></div>
      <div class="auth-danger"><h3>Delete account</h3><p>Deletes your account and your cloud save for good. This cannot be undone.</p>
        <button class="btn danger" type="button" data-acc="del">Delete my account</button></div>`);
    o.addEventListener('click', async e => {
      const a = e.target.closest('[data-acc]'); if (!a) return;
      const k = a.dataset.acc;
      if (k === 'close') closeOverlay();
      else if (k === 'sync') { await push(true); api.toast(status.k === 'error' ? 'Cloud save failed.' : 'Saved to your account.'); closeOverlay(); }
      else if (k === 'out') { await push(true); try { await req('/auth/v1/logout', { method: 'POST' }); } catch (err) { /* ignore */ } session = null; store.set(SESSION_KEY, null); lastPushed = ''; closeOverlay(); paintAccount(); loginScreen('You are signed out. Your progress stays in this browser too.'); }
      else if (k === 'del') {
        if (a.dataset.armed !== '1') { a.dataset.armed = '1'; a.textContent = 'Click again to delete for good'; return; }
        try { await valid(); await req('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} }); session = null; store.set(SESSION_KEY, null); closeOverlay(); paintAccount(); api.toast('Your account and cloud save were deleted.'); }
        catch (err) { a.textContent = 'Delete failed: ' + err.message; }
      }
    });
  }
  async function afterLogin() {
    await valid(); if (!session) return;
    if (!session.user || !session.user.id) await loadUser();
    store.set(GUEST_KEY, null);
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
      document.addEventListener('click', e => { if (e.target.closest('#account')) { session && session.user ? accountMenu() : loginScreen(); } });
      session = store.get(SESSION_KEY);
      const back = fromUrlHash();
      if (back && back.error) { loginScreen(back.error, true); return; }
      if (back) { keep(back); await loadUser(); await afterLogin(); }
      else if (session && (await valid())) { await loadUser(); paintAccount(); await sync(); }
      else if (!store.get(GUEST_KEY)) loginScreen();
      paintAccount();
      setInterval(() => { if (session) push(); }, 30000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && session) push(); });
    },
    // called on every local save; uploads a few seconds later
    queue() { if (!enabled || !session) return; clearTimeout(pushT); pushT = setTimeout(() => push(), 3000); },
  };
})();
