// Records layout-shift entries with their source nodes in headless Chrome, scenario by scenario
//
// Usage: node scripts/layout_shift_probe.mjs [origin] [scenario ...]
//   origin defaults to https://wuwa.build, scenarios default to all of SCENARIOS
//   PROBE_UID / PROBE_BUILD_ID pick the profile and deep-linked build
//   DRAFT=path/to/buildState.json seeds the editor draft, SLOW=1 throttles CPU 4x and network to ~1.6 Mbps
//   CHROME overrides the browser path, NO_CORS=1 lets a local build on a port other than 3000 reach the gateway
//   ALL=1 lists shifts under the 0.005 floor too
//
// Reports the largest session window the way CLS is scored, then every shift over 0.005 with the nodes that moved
// Shifts within 500ms of the click are marked [input]: excluded here, but the same content landing later counts in the field
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const ORIGIN = process.argv[2] || 'https://wuwa.build';
const WANTED = process.argv.slice(3);
const UID = process.env.PROBE_UID || '904409404';
const BUILD_ID = process.env.PROBE_BUILD_ID || 'a62e56c5-ff5c-492f-849b-e33ca89f2a4c';
const SETTLE_MS = process.env.SLOW ? 14000 : 8000;

const RECORDER = `(() => {
  window.__shifts = [];
  const describe = (node) => {
    if (!node) return '(removed)';
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return '(text)';
    const cls = (el.getAttribute('class') || '').split(/\\s+/).slice(0, 5).join('.');
    const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + ' "' + text + '"';
  };
  const rect = (r) => [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__shifts.push({
        t: Math.round(e.startTime), v: +e.value.toFixed(4), input: e.hadRecentInput, path: location.pathname + location.search,
        sources: (e.sources || []).slice(0, 4).map((s) => ({ node: describe(s.node), from: rect(s.previousRect), to: rect(s.currentRect) })),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
})();`;

const SCENARIOS = {
  profile: { url: `/profile/${UID}` },
  profile_build: { url: `/profile/${UID}?buildId=${BUILD_ID}` },
  profile_mobile: { url: `/profile/${UID}`, width: 390, height: 844, mobile: true },
  board_to_profile: { url: '/leaderboards/1506', click: 'a[href^="/profile/"]' },
  builds_to_profile: { url: '/builds', click: 'a[href^="/profile/"]' },
  home_to_import: { url: '/', click: 'main a[href="/import"]' },
  edit: { url: '/edit' },
  import: { url: '/import' },
  home: { url: '/' },
  board: { url: '/leaderboards/1506' },
  builds: { url: '/builds' },
  leaderboards: { url: '/leaderboards' },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      return (await res.json()).webSocketDebuggerUrl;
    } catch {
      await sleep(200);
    }
  }
  throw new Error('chrome did not start');
}

function session(ws) {
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) {
      waiting.get(msg.id)(msg);
      waiting.delete(msg.id);
    }
  });
  return (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const mid = ++id;
    waiting.set(mid, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
}

async function openPage(send, scenario) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params) => send(method, params, sessionId);
  await s('Page.enable');
  await s('Network.enable');
  // Keeps probe runs out of the analytics
  await s('Network.setBlockedURLs', { urls: ['*/ingest/*', '*/_vercel/*', '*f97b23d127fa857f*', '*cdn-cgi/rum*'] });
  await s('Emulation.setDeviceMetricsOverride', { width: scenario.width ?? 1920, height: scenario.height ?? 1080, deviceScaleFactor: 1, mobile: Boolean(scenario.mobile) });
  await s('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });
  if (process.env.DRAFT) {
    const draft = fs.readFileSync(process.env.DRAFT, 'utf8');
    await s('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('wuwa_draft_build', ${JSON.stringify(draft)}); } catch {}` });
  }
  if (process.env.SLOW) {
    await s('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await s('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  return { s, targetId };
}

const evaluate = async (s, expression) => (await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

async function click(s, selector) {
  const box = await evaluate(s, `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, href: el.getAttribute('href') }; })()`);
  if (!box) return null;
  await sleep(700);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await s('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }
  return box.href;
}

function report(name, shifts) {
  // Largest session window: 1s gap, 5s cap, input-tainted entries excluded, as CLS is scored
  let best = 0;
  let current = 0;
  let start = 0;
  let last = -Infinity;
  for (const e of shifts.filter((x) => !x.input)) {
    if (e.t - last > 1000 || e.t - start > 5000) {
      current = 0;
      start = e.t;
    }
    current += e.v;
    last = e.t;
    best = Math.max(best, current);
  }
  console.log(`\n=== ${name}: CLS ${best.toFixed(3)} (${shifts.length} shifts, ${shifts.filter((x) => x.input).length} input-excluded)`);
  for (const e of shifts.filter((x) => x.v >= (process.env.ALL ? 0 : 0.005))) {
    console.log(`  t=${e.t}ms v=${e.v}${e.input ? ' [input]' : ''} ${e.path}`);
    for (const src of e.sources) console.log(`     ${src.node}\n       ${JSON.stringify(src.from)} -> ${JSON.stringify(src.to)}`);
  }
}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wuwa-cls-'));
const chromeArgs = ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`, '--no-first-run', '--disable-extensions'];
// The gateway's CORS allowlist names localhost:3000 only
if (process.env.NO_CORS) chromeArgs.push('--disable-web-security');
const chrome = spawn(CHROME, [...chromeArgs, 'about:blank'], { stdio: 'ignore' });
try {
  const ws = new WebSocket(await connect());
  await new Promise((resolve) => ws.addEventListener('open', resolve));
  const send = session(ws);
  for (const name of WANTED.length ? WANTED : Object.keys(SCENARIOS)) {
    const scenario = SCENARIOS[name];
    if (!scenario) throw new Error(`unknown scenario ${name}`);
    const { s, targetId } = await openPage(send, scenario);
    await s('Page.navigate', { url: ORIGIN + scenario.url });
    await sleep(SETTLE_MS);
    if (scenario.click) {
      console.log(`\n[${name}] clicked ${await click(s, scenario.click)}`);
      await sleep(SETTLE_MS);
    }
    report(name, (await evaluate(s, 'window.__shifts')) ?? []);
    await send('Target.closeTarget', { targetId });
  }
  ws.close();
} finally {
  chrome.kill();
  // Chrome releases the profile lock a moment after the kill, so a quick retry covers Windows EPERM
  await new Promise((resolve) => chrome.once('exit', resolve));
  fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
