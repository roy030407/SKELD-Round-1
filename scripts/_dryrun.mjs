import 'dotenv/config'

const B = process.env.DRYRUN_BASE || 'https://skeld-round-1-nine.vercel.app'
const TEAM = process.env.DRYRUN_TEAM || 'SKELD-25'
const MARK = 'e2edry'

const jar = new Map()
function setCookie(who, res) {
  const c = res.headers.get('set-cookie')
  if (c) jar.set(who, c.split(';')[0])
}
async function call(who, path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', Origin: B, ...(opts.headers || {}) }
  if (jar.has(who)) headers.Cookie = jar.get(who)
  const res = await fetch(B + path, { ...opts, headers, redirect: 'manual' })
  setCookie(who, res)
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body }
}
const ok = (s) => s >= 200 && s < 300
function log(step, r, extra = '') {
  const flag = ok(r.status) ? 'PASS' : 'FAIL'
  const snippet = typeof r.body === 'string' ? r.body.slice(0, 120) : JSON.stringify(r.body).slice(0, 160)
  console.log(`[${flag}] ${step} (${r.status}) ${snippet} ${extra}`)
  return ok(r.status)
}

console.log(`=== DRY RUN against ${B}, team ${TEAM} ===\n`)

// 0. admin login
const admin = await call('admin', '/api/auth/login/staff', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin', password: 'SkeldAdmin2026!!' }),
})
log('0. admin login', admin)

// 1. register 6 players
const codes = []
for (let i = 1; i <= 6; i++) {
  const roll = `22DRY${String(1000 + i)}`
  const r = await call(`p${i}`, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName: `Dry${i}`, rollNumber: roll, teamCode: TEAM, email: `${MARK}${i}@example.com` }),
  })
  if (!log(`1.${i} register`, r)) break
  codes.push({ code: r.body.playerCode, roll, who: `p${i}` })
}

// 2. log all six in
for (const c of codes) {
  const r = await call(c.who, '/api/auth/login/player', {
    method: 'POST',
    body: JSON.stringify({ playerCode: c.code, rollNumber: c.roll }),
  })
  log(`2. login ${c.code}`, r)
}

// 3. gating BEFORE check-in (should be blocked)
const preGate = await call('p1', '/api/tasks/2/state')
console.log(`[INFO] 3. task2 before check-in -> ${preGate.status} (expect 403 blocked)`)

// 4. check in all six
for (const c of codes) {
  const r = await call(c.who, '/api/check-in', { method: 'POST' })
  log(`4. check-in ${c.code}`, r)
}

// 5. check-in status
const st = await call('p1', '/api/check-in/status')
log('5. check-in status', st, st.body?.status ? `checkedIn=${st.body.status.checkedInCount}/${st.body.status.totalPlayers}` : '')

// 6. admin opens gates 1-4
for (const t of [1, 2, 3, 4]) {
  const r = await call('admin', '/api/admin/task-gate', {
    method: 'POST',
    body: JSON.stringify({ taskNumber: t, action: 'open' }),
  })
  log(`6.${t} open gate ${t}`, r)
}

// 7. task 1 quiz link
log('7. task1 quiz state', await call('p1', '/api/tasks/1/quiz'))

// 8. admin declares quiz results
const teamsList = await call('admin', '/api/admin/quiz')
const me = (teamsList.body?.teams || []).find((t) => t.code === TEAM)
log('8a. admin quiz GET', teamsList, me ? `found ${me.code}` : 'TEAM NOT FOUND')
if (me) {
  log('8b. save quiz score', await call('admin', '/api/admin/quiz', {
    method: 'POST',
    body: JSON.stringify({ scores: [{ teamId: me.id, points: 42 }] }),
  }))
  log('8c. declare results', await call('admin', '/api/admin/quiz', {
    method: 'POST', body: JSON.stringify({ declareResults: true }),
  }))
}

// 9. betting (leader only)
log('9. place bet', await call('p1', '/api/bet', {
  method: 'POST', body: JSON.stringify({ predictedRank: 3 }),
}))

// 10. TASK 2 - fragments must be DISTINCT per player
const frags = []
for (const c of codes) {
  const r = await call(c.who, '/api/tasks/2/state')
  if (ok(r.status)) frags.push(r.body.fragmentIndex)
  log(`10. frag ${c.code}`, r, r.body?.fragmentIndex !== undefined ? `idx=${r.body.fragmentIndex}` : '')
}
const distinct = new Set(frags)
console.log(`[${distinct.size === 6 ? 'PASS' : 'FAIL'}] 10z. fragments distinct: ${[...distinct].sort().join(',')} (need 6 unique)`)

// 11. task 2 submit master sentence
log('11. task2 submit', await call('p1', '/api/tasks/2/submit', {
  method: 'POST',
  body: JSON.stringify({ sentence: 'THE ROBOTICS CLUB EXPEDITION TO THE STARS BEGINS TONIGHT IN NAB' }),
}))

// 12. task 3 external link + admin scoring
log('12a. task3 state', await call('p1', '/api/tasks/3/state'))
const bd = await call('admin', '/api/admin/bomb-defusal')
log('12b. admin bomb-defusal GET', bd)
const bdTeam = (bd.body?.teams || []).find((t) => t.code === TEAM)
if (bdTeam) {
  log('12c. score bomb defusal', await call('admin', '/api/admin/bomb-defusal', {
    method: 'POST', body: JSON.stringify({ scores: [{ teamId: bdTeam.id, points: 20 }] }),
  }))
}

// 13. TASK 4 shuffle
log('13a. create shuffle session', await call('admin', '/api/tasks/4/session', { method: 'POST' }))
const t4 = await call('p1', '/api/tasks/4/state')
log('13b. task4 state for player', t4)

// 14. leaderboard privacy
const lbP = await call('p1', '/api/leaderboard')
console.log(`[${lbP.body?.hiddenForPlayers ? 'PASS' : 'FAIL'}] 14a. leaderboard hidden from player: ${lbP.body?.hiddenForPlayers}`)
const lbA = await call('admin', '/api/leaderboard')
console.log(`[${Array.isArray(lbA.body?.leaderboard) ? 'PASS' : 'FAIL'}] 14b. admin sees full board: ${Array.isArray(lbA.body?.leaderboard) ? lbA.body.leaderboard.length + ' teams' : 'NO'}`)

console.log('\n=== DRY RUN COMPLETE ===')
