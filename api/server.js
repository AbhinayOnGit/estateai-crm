/* Payout workflow API: persists Verify/Reject, Approve and Mark paid for site-visit payouts in SQLite.
   Run: node api/server.js   (Node 22+, no dependencies). Also serves index.html so the app and API share an origin.
   Roles are the app's role-preview ids sent by the browser; there is no sign-in yet, so this is workflow
   enforcement (order of steps, who may do which), not authentication. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = +process.env.PORT || 8787;
const DB_FILE = process.env.PAYOUT_DB || path.join(__dirname, 'payouts.db');

/* PROPOSED role rules, mirroring the proposed payout rule in the UI. */
const STEPS = {
  verify: {roles: ['admin', 'leadership', 'sales_head', 'sales_mgr', 'crm_mgr'], ok: s => s.verification !== 'Verified' && s.payoutStatus !== 'Paid', to: {verification: 'Verified'}},
  reject: {roles: ['admin', 'leadership', 'sales_head', 'sales_mgr', 'crm_mgr'], ok: s => s.verification === 'Not verified', to: {verification: 'Rejected'}},
  approve: {roles: ['admin', 'leadership', 'finance'], ok: s => s.verification === 'Verified' && s.payoutStatus === 'Pending', to: {payoutStatus: 'Approved'}},
  pay: {roles: ['admin', 'finance'], ok: s => s.payoutStatus === 'Approved', to: {payoutStatus: 'Paid'}},
};
const VERIFICATION = ['Not verified', 'Verified', 'Rejected'];
const PAY_STATUS = ['Pending', 'Approved', 'Paid'];

function open(file) {
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE IF NOT EXISTS payout_state (
      visit_id TEXT PRIMARY KEY, verification TEXT NOT NULL, verified_by TEXT, verified_at INTEGER,
      payout_status TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS payout_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, visit_id TEXT NOT NULL, step TEXT NOT NULL, role TEXT NOT NULL,
      prev TEXT NOT NULL, next TEXT NOT NULL, at INTEGER NOT NULL);`);
  return db;
}

const rowOut = r => ({id: r.visit_id, verification: r.verification, verifiedBy: r.verified_by, verifiedAt: r.verified_at, payoutStatus: r.payout_status});

function makeHandler(db) {
  const get = db.prepare('SELECT * FROM payout_state WHERE visit_id = ?');
  const all = db.prepare('SELECT * FROM payout_state ORDER BY visit_id');
  const put = db.prepare(`INSERT INTO payout_state (visit_id, verification, verified_by, verified_at, payout_status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(visit_id) DO UPDATE SET verification = excluded.verification,
    verified_by = excluded.verified_by, verified_at = excluded.verified_at, payout_status = excluded.payout_status, updated_at = excluded.updated_at`);
  const log = db.prepare('INSERT INTO payout_audit (visit_id, step, role, prev, next, at) VALUES (?, ?, ?, ?, ?, ?)');
  const audit = db.prepare('SELECT * FROM payout_audit WHERE visit_id = ? ORDER BY id DESC LIMIT 100');

  const send = (res, code, body) => { const s = JSON.stringify(body); res.writeHead(code, {'Content-Type': 'application/json'}); res.end(s); };
  const readJson = req => new Promise((ok, bad) => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e5) { bad(new Error('too large')); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { bad(e); } }); });

  return async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (req.method === 'GET' && url.pathname === '/api/payouts') return send(res, 200, all.all().map(rowOut));
      let m = url.pathname.match(/^\/api\/payouts\/([^/]+)\/audit$/);
      if (req.method === 'GET' && m) return send(res, 200, audit.all(decodeURIComponent(m[1])));
      m = url.pathname.match(/^\/api\/payouts\/([^/]+)\/(verify|reject|approve|pay)$/);
      if (req.method === 'POST' && m) {
        const id = decodeURIComponent(m[1]), step = STEPS[m[2]], body = await readJson(req);
        if (!step.roles.includes(body.role)) return send(res, 403, {error: `Role "${body.role}" cannot ${m[2]} a payout.`});
        /* The sample visits live in the browser, so a visit with no stored row starts from the state the client reports. */
        const stored = get.get(id), base = body.base || {};
        if (!stored && !(VERIFICATION.includes(base.verification) && PAY_STATUS.includes(base.payoutStatus))) return send(res, 400, {error: 'Unknown visit: send its current verification and payoutStatus as "base".'});
        const cur = stored ? rowOut(stored) : {id, verification: base.verification, verifiedBy: null, verifiedAt: null, payoutStatus: base.payoutStatus};
        if (!step.ok(cur)) return send(res, 409, {error: `Cannot ${m[2]} from ${cur.verification} / ${cur.payoutStatus}.`, current: cur});
        const next = Object.assign({}, cur, step.to), now = Date.now();
        if (step.to.verification) { next.verifiedBy = body.role; next.verifiedAt = now; }
        put.run(id, next.verification, next.verifiedBy, next.verifiedAt, next.payoutStatus, now);
        log.run(id, m[2], body.role, `${cur.verification} / ${cur.payoutStatus}`, `${next.verification} / ${next.payoutStatus}`, now);
        return send(res, 200, next);
      }
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); return res.end(fs.readFileSync(path.join(__dirname, '..', 'index.html')));
      }
      send(res, 404, {error: 'Not found'});
    } catch (e) { send(res, 400, {error: String(e.message || e)}); }
  };
}

if (require.main === module) {
  http.createServer(makeHandler(open(DB_FILE))).listen(PORT, () => console.log(`EstateAI payout API on http://localhost:${PORT}`));
}
module.exports = {makeHandler, open};
