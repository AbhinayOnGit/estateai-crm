/* Run: node --test api/server.test.js */
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { makeHandler, open } = require('./server');

function start() {
  const srv = http.createServer(makeHandler(open(':memory:')));
  return new Promise(ok => srv.listen(0, () => ok({srv, base: 'http://localhost:' + srv.address().port})));
}
const post = (base, p, body) => fetch(base + p, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}).then(async r => ({status: r.status, body: await r.json()}));

test('full workflow persists and is enforced', async () => {
  const {srv, base} = await start();
  const b = {verification: 'Not verified', payoutStatus: 'Pending'};
  assert.equal((await post(base, '/api/payouts/V1/approve', {role: 'finance', base: b})).status, 409);
  assert.equal((await post(base, '/api/payouts/V1/verify', {role: 'sales_exec', base: b})).status, 403);
  assert.equal((await post(base, '/api/payouts/V1/verify', {role: 'crm_mgr', base: b})).body.verification, 'Verified');
  assert.equal((await post(base, '/api/payouts/V1/pay', {role: 'finance', base: b})).status, 409);
  assert.equal((await post(base, '/api/payouts/V1/approve', {role: 'finance'})).body.payoutStatus, 'Approved');
  assert.equal((await post(base, '/api/payouts/V1/pay', {role: 'finance'})).body.payoutStatus, 'Paid');
  const list = await (await fetch(base + '/api/payouts')).json();
  assert.deepEqual(list.map(r => [r.id, r.verification, r.payoutStatus, r.verifiedBy]), [['V1', 'Verified', 'Paid', 'crm_mgr']]);
  const audit = await (await fetch(base + '/api/payouts/V1/audit')).json();
  assert.equal(audit.length, 3);
  assert.equal((await post(base, '/api/payouts/V2/verify', {role: 'admin'})).status, 400);
  srv.close();
});
