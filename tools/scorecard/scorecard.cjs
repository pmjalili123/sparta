// Scorecard harness for advisorpouya.com (see STATUS.md). Plain Node, CommonJS.
// Usage: NODE_PATH=<tools>/node_modules node scorecard.cjs <iteration-number>
// Needs: a static server for site/ on http://localhost:8765, Chromium at CHROME.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'site');
const BASE = 'http://localhost:8765';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const TOOLS = process.env.SCORECARD_TOOLS;              // dir with node_modules (lighthouse, axe-core, html-validate, schema-dts, typescript)
const ITER = String(process.argv[2] || '01').padStart(2, '0');
const OUT = path.join(ROOT, 'reports');
const SHOTS = process.env.SHOTS || path.join(TOOLS, 'shots', 'iter-' + ITER);
const THIRD_PARTY = /plausible\.io|calendly\.com/;
const PAGES = [{ name: 'index', url: '/' }, { name: 'call-booked', url: '/call-booked/' }, { name: '404', url: '/404.html' }];
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

const R = { iteration: ITER, assumptions: [], raw: {}, failures: [] };
function fail(cat, cost, msg) { R.failures.push({ cat, cost, msg }); }

async function stub(page, mode = 'stub') {
  // The sandbox egress proxy blocks plausible.io and calendly.com. "stub" serves an empty script so the
  // page behaves like production minus the third-party UI; "abort" simulates a blocked script.
  await page.route(THIRD_PARTY, r => mode === 'abort' ? r.abort() : r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  // walk the page so scroll-triggered reveals and lazy images resolve, then return to top
  await page.evaluate(async () => {
    const step = innerHeight * 0.6;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 60)); }
    scrollTo({ top: 0, behavior: 'instant' });
  });
  await sleep(1800);
}

// ---------------- A. Lighthouse ----------------
function lighthouse() {
  const cats = ['performance', 'accessibility', 'best-practices', 'seo'];
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const out = path.join(TOOLS, `lh-${ITER}-${i}.json`);
    cp.execFileSync(path.join(TOOLS, 'node_modules/.bin/lighthouse'), [BASE + '/', '--quiet', '--chrome-flags=--headless=new --no-sandbox',
      '--blocked-url-patterns=*plausible.io*', '--blocked-url-patterns=*calendly.com*',
      '--only-categories=' + cats.join(','), '--output=json', '--output-path=' + out], { env: { ...process.env, CHROME_PATH: CHROME }, stdio: 'ignore', timeout: 240000 });
    const d = JSON.parse(fs.readFileSync(out, 'utf8'));
    const failing = [];
    for (const c of Object.values(d.categories)) for (const ref of c.auditRefs) {
      const a = d.audits[ref.id];
      if (ref.weight > 0 && a.score !== null && a.score < 1) failing.push(`${c.id}/${ref.id} ${a.score}${a.displayValue ? ' (' + a.displayValue + ')' : ''}`);
    }
    runs.push({ scores: Object.fromEntries(cats.map(c => [c, d.categories[c].score])), failing, lcp: d.audits['largest-contentful-paint'].displayValue });
  }
  const median = {};
  for (const c of cats) { const v = runs.map(r => r.scores[c]).sort((a, b) => a - b); median[c] = v[1]; }
  const score = cats.reduce((s, c) => s + median[c] * 7.5, 0);
  for (const c of cats) if (median[c] < 1) fail('A', +((1 - median[c]) * 7.5).toFixed(2), `Lighthouse ${c} median ${median[c]}: ${[...new Set(runs.flatMap(r => r.failing.filter(f => f.startsWith(c))))].join('; ')}`);
  R.raw.lighthouse = runs; R.raw.lighthouseMedian = median;
  R.assumptions.push('A: Lighthouse runs with --blocked-url-patterns for plausible.io and calendly.com because the sandbox proxy blocks both; otherwise the blocked request is logged as a console error that production would not have.');
  return score;
}

// ---------------- B. Accessibility ----------------
async function accessibility(browser) {
  const axeSrc = path.join(TOOLS, 'node_modules/axe-core/axe.min.js');
  const seen = new Map(); // page|rule -> {impact, nodes, viewports}
  for (const pg of PAGES) for (const w of [360, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage(); await stub(page);
    await page.goto(BASE + pg.url); await settle(page);
    const states = pg.name === 'index' ? ['default', 'biz+faq'] : ['default'];
    for (const st of states) {
      if (st === 'biz+faq') await page.evaluate(() => { document.getElementById('tab-biz').click(); document.querySelectorAll('details').forEach(d => d.open = true); });
      await sleep(400);
      await page.addScriptTag({ path: axeSrc });
      const res = await page.evaluate(() => axe.run(document, { resultTypes: ['violations'] }));
      for (const v of res.violations) {
        const k = pg.name + '|' + v.id;
        const prev = seen.get(k) || { impact: v.impact, nodes: 0, where: new Set(), help: v.help, targets: new Set() };
        prev.nodes += v.nodes.length; prev.where.add(`${w}px/${st}`); v.nodes.slice(0, 3).forEach(n => prev.targets.add(n.target.join(' ')));
        seen.set(k, prev);
      }
    }
    await ctx.close();
  }
  let score = 20;
  const list = [];
  for (const [k, v] of seen) {
    const cost = (v.impact === 'serious' || v.impact === 'critical') ? 4 : v.impact === 'moderate' ? 1 : 0;
    score -= cost;
    list.push({ key: k, impact: v.impact, help: v.help, where: [...v.where], targets: [...v.targets] });
    if (cost) fail('B', cost, `axe ${v.impact} ${k}: ${v.help} at ${[...v.where].join(', ')} [${[...v.targets].join(' | ')}]`);
  }
  R.raw.axe = list;
  R.assumptions.push('B: each distinct axe rule failing on a page counts once, de-duplicated across 360/1280 and across UI states (index is also scanned with the Business owners tab and all FAQ items open).');

  // keyboard walkthrough at 1280
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); await stub(page);
  await page.goto(BASE + '/'); await settle(page);
  const seq = [];
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1) || (cs.boxShadow && cs.boxShadow !== 'none' && el.matches(':focus-visible'));
      return { id: el.id, cls: el.className && String(el.className).slice(0, 40), tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), href: el.getAttribute('href'), role: el.getAttribute('role'), visible };
    });
    if (info) seq.push(info);
  }
  const has = pred => seq.some(pred);
  const reach = {
    'nav links': ['#who', '#how', '#about', '#faq', '#contact'].every(h => has(s => s.href === h && /nav-link/.test(s.cls))),
    'hero chips': has(s => /chip/.test(s.cls) && s.text.startsWith('I have')) && has(s => /chip/.test(s.cls) && s.text.startsWith("I'm a")) && has(s => /chip/.test(s.cls) && s.text.startsWith('I own')),
    'tab bar': has(s => s.role === 'tab'),
    'FAQ accordion': new Set(seq.filter(s => s.tag === 'SUMMARY').map(s => s.text)).size === 6,
    'back-to-top': has(s => s.id === 'toTop'),
  };
  // operability
  const op = {};
  await page.goto(BASE + '/'); await settle(page);
  await page.focus('.chip[data-persona="doc"]'); await page.keyboard.press('Enter'); await sleep(1200);
  op['hero chip (Enter)'] = await page.evaluate(() => document.getElementById('tab-doc').getAttribute('aria-selected') === 'true' && !document.getElementById('panel-doc').hidden);
  await page.focus('#tab-doc'); await page.keyboard.press('ArrowRight'); await sleep(200);
  const a1 = await page.evaluate(() => document.activeElement.id === 'tab-biz' && document.getElementById('tab-biz').getAttribute('aria-selected') === 'true');
  await page.keyboard.press('Home'); await sleep(200);
  const a2 = await page.evaluate(() => document.activeElement.id === 'tab-tech' && !document.getElementById('panel-tech').hidden);
  op['tab bar (arrows/Home)'] = a1 && a2;
  await page.focus('#faq summary'); await page.keyboard.press('Enter'); await sleep(200);
  const f1 = await page.evaluate(() => document.querySelector('#faq details').open);
  await page.keyboard.press('Space'); await sleep(200);
  const f2 = await page.evaluate(() => !document.querySelector('#faq details').open);
  op['FAQ (Enter/Space)'] = f1 && f2;
  await page.evaluate(() => scrollTo({ top: document.getElementById('about').offsetTop, behavior: 'instant' })); await sleep(500);
  await page.focus('#toTop'); await page.keyboard.press('Enter'); await sleep(1800);
  op['back-to-top (Enter)'] = await page.evaluate(() => scrollY < 60);
  await page.goto(BASE + '/'); await settle(page);
  await page.focus('.site-header .nav-link[href="#faq"]'); await page.keyboard.press('Enter'); await sleep(1500);
  op['nav link (Enter)'] = await page.evaluate(() => { const r = document.getElementById('faq').getBoundingClientRect(); return location.hash === '#faq' && r.top < 200 && r.top > -50; });
  await ctx.close();
  const unreachable = Object.entries(reach).filter(([, v]) => !v).map(([k]) => k);
  const inoperable = Object.entries(op).filter(([, v]) => !v).map(([k]) => k);
  const invisible = seq.filter(s => !s.visible && !(s.id === 'main' || s.id === 'contact-h'));
  if (unreachable.length || inoperable.length) { score -= 3; fail('B', 3, `keyboard: unreachable [${unreachable}] inoperable [${inoperable}]`); }
  if (invisible.length) { score -= 3; fail('B', 3, `focus not visible on: ${invisible.map(s => s.tag + (s.id ? '#' + s.id : '') + ' "' + s.text + '"').join('; ')}`); }
  R.raw.keyboard = { stops: seq.length, sequence: seq.map(s => `${s.tag}${s.id ? '#' + s.id : ''}${s.role ? '[' + s.role + ']' : ''} "${s.text}"${s.visible ? '' : ' (NO FOCUS RING)'}`), reach, op };
  return Math.max(0, score);
}

// ---------------- C. Layout ----------------
async function layout(browser) {
  const vps = [[320, 800, 1], [360, 800, 1], [390, 844, 1], [768, 1024, 1], [1024, 768, 1], [1280, 800, 1], [1920, 1080, 1], [640, 400, 2, '1280@200%']];
  let score = 20; const per = [];
  for (const [w, h, dsf, label0] of vps) {
    const label = label0 || String(w);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
    const page = await ctx.newPage(); await stub(page);
    await page.goto(BASE + '/'); await settle(page);
    await page.screenshot({ path: path.join(SHOTS, `layout-${label.replace('@', '-at-').replace('%', 'pct')}.png`), fullPage: true });
    const res = await page.evaluate(() => {
      const out = { hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, overlaps: [], clipped: [], small: [], h1Lines: 0 };
      const shown = el => { for (let e = el; e && e !== document; e = e.parentElement) { if (e.tagName === 'DETAILS' && !e.open && !el.closest('summary')) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0 || e.hidden) return false; if (e.classList && e.classList.contains('sr-only')) return false; } return true; };
      const fixedAncestor = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed') return true; } return false; };
      // text line boxes (document coordinates)
      const boxes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (!n.data.trim()) continue;
        const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || !shown(el) || fixedAncestor(el) || el.closest('.skip')) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) if (r.width > 1 && r.height > 1) boxes.push({ el, r: { l: r.left + scrollX, t: r.top + scrollY, rr: r.right + scrollX, b: r.bottom + scrollY }, txt: n.data.trim().slice(0, 30) });
      }
      // overlapping text (different elements, neither contains the other)
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]; if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const ix = Math.min(a.r.rr, b.r.rr) - Math.max(a.r.l, b.r.l), iy = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
        if (ix > 2 && iy > 3 && ix * iy > 20) out.overlaps.push(`"${a.txt}" x "${b.txt}"`);
      }
      // text clipped by an overflow-clipping ancestor
      for (const bx of boxes) {
        for (let e = bx.el; e && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
          const r = e.getBoundingClientRect(), L = r.left + scrollX + parseFloat(cs.borderLeftWidth), T = r.top + scrollY + parseFloat(cs.borderTopWidth);
          const Rr = L + e.clientWidth, B = T + e.clientHeight;
          if (bx.r.l < L - 1 || bx.r.rr > Rr + 1 || bx.r.t < T - 1 || bx.r.b > B + 1) { out.clipped.push(`"${bx.txt}" clipped by ${e.tagName}.${String(e.className).slice(0, 30)}`); break; }
        }
      }
      // tap targets
      for (const el of document.querySelectorAll('a[href], button, summary, [role="tab"]')) {
        if (!shown(el) || el.closest('.skip')) continue;
        const cs = getComputedStyle(el); if (cs.pointerEvents === 'none') continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const inlineInText = el.tagName === 'A' && el.parentElement && el.parentElement.tagName === 'P' && el.parentElement.textContent.trim() !== el.textContent.trim();
        if (inlineInText) continue;
        if (r.height < 44 - 0.5 || r.width < 44 - 0.5) out.small.push(`${el.tagName} "${el.textContent.trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      // h1 lines
      const h1 = document.querySelector('h1'); const rg = document.createRange(); rg.selectNodeContents(h1);
      out.h1Lines = new Set([...rg.getClientRects()].filter(r => r.width > 1).map(r => Math.round(r.top))).size;
      return out;
    });
    // fixed mobile CTA bar covering content at the very bottom of the page
    let ctaCover = false;
    if (w <= 860) {
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await sleep(700);
      ctaCover = await page.evaluate(() => {
        const bar = document.getElementById('mobileCta'); if (!bar || !bar.classList.contains('show')) return false;
        const top = bar.getBoundingClientRect().top;
        const texts = [...document.querySelectorAll('footer *')].filter(e => e.children.length === 0 && e.textContent.trim()).map(e => e.getBoundingClientRect().bottom);
        return Math.max(...texts) > top + 1;
      });
    }
    const problems = [];
    if (res.hscroll) problems.push('horizontal scroll');
    if (res.overlaps.length) problems.push('overlapping text: ' + res.overlaps.slice(0, 4).join('; '));
    if (res.clipped.length) problems.push('clipped text: ' + res.clipped.slice(0, 4).join('; '));
    if (res.small.length) problems.push('tap targets <44px: ' + res.small.slice(0, 6).join('; '));
    if (ctaCover) problems.push('mobile CTA bar covers final footer content');
    if (problems.length) { score -= 3; fail('C', 3, `${label}: ${problems.join(' | ')}`); }
    per.push({ viewport: label, h1Lines: res.h1Lines, problems });
    await ctx.close();
  }
  const h360 = per.find(p => p.viewport === '360').h1Lines, h1280 = per.find(p => p.viewport === '1280').h1Lines;
  if (h360 > 5) { score -= 2; fail('C', 2, `hero h1 is ${h360} lines at 360px (max 5)`); }
  if (h1280 > 4) { score -= 2; fail('C', 2, `hero h1 is ${h1280} lines at 1280px (max 4)`); }
  R.raw.layout = per;
  R.assumptions.push('C: 1280 at 200% zoom is measured as a 640x400 CSS viewport at deviceScaleFactor 2. Inline links inside running sentences are exempt from the 44px rule (WCAG 2.5.8 inline exception). Fixed elements are excluded from the overlap scan and checked separately.');
  return Math.max(0, score);
}

// ---------------- D. Type and rendering ----------------
async function fonts(browser) {
  let score = 10; const rows = [];
  const spec = {
    index: { Literata: ['.hero h1', 'h2', '.quote', '.statement'], 'Public Sans': ['.btn', '.tab', '.site-header .nav-link', '.chip', 'main p:not(.quote):not(.statement)', 'footer p'] },
    'call-booked': { Literata: ['h1'], 'Public Sans': ['main p', 'main a'] },
    '404': { Literata: ['h1'], 'Public Sans': ['main p', '.btn'] },
  };
  for (const pg of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage(); await stub(page);
    await page.goto(BASE + pg.url); await settle(page);
    await page.evaluate(() => { const t = document.getElementById('tab-biz'); if (t) { document.querySelectorAll('details').forEach(d => d.open = true); } });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    for (const [family, sels] of Object.entries(spec[pg.name])) for (const sel of sels) {
      const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: sel });
      let bad = [], checked = 0;
      for (const id of nodeIds.slice(0, 12)) {
        try {
          const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: id });
          if (!fonts.length) continue; checked++;
          const main = fonts.slice().sort((a, b) => b.glyphCount - a.glyphCount)[0];
          if (!main.familyName.includes(family)) bad.push(main.familyName + (main.isCustomFont ? '' : ' (system fallback)'));
        } catch (e) { /* node without text */ }
      }
      rows.push({ page: pg.name, selector: sel, expected: family, checked, bad: [...new Set(bad)] });
      if (bad.length) { score -= 5; fail('D', 5, `${pg.name} ${sel} renders ${[...new Set(bad)].join(', ')} instead of ${family}`); }
    }
    // no invisible-text flash: font-display and preload for every family used on the page
    const fd = await page.evaluate(() => {
      const faces = [...document.fonts].map(f => ({ family: f.family.replace(/"/g, ''), display: f.display, status: f.status }));
      const pre = [...document.querySelectorAll('link[rel="preload"][as="font"]')].map(l => l.getAttribute('href'));
      return { faces, pre };
    });
    const families = Object.keys(spec[pg.name]);
    for (const fam of families) {
      const face = fd.faces.find(f => f.family === fam);
      const preloaded = fd.pre.some(h => h.includes(fam === 'Literata' ? 'literata' : 'publicsans'));
      if (!face || !['swap', 'optional', 'fallback'].includes(face.display) || !preloaded) { score -= 5; fail('D', 5, `${pg.name}: ${fam} font-display=${face && face.display} preloaded=${preloaded}`); }
    }
    rows.push({ page: pg.name, faces: fd.faces, preloads: fd.pre });
    await ctx.close();
  }
  R.raw.fonts = rows;
  R.assumptions.push('D: the rendered font is read with CDP CSS.getPlatformFontsForNode (the font Chromium actually used for the glyphs), not from CSS. An element class counts once per page.');
  return Math.max(0, score);
}

// ---------------- E. Function ----------------
async function functionTests(browser) {
  const checks = {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let page = await ctx.newPage(); await stub(page);
  // chips
  let chipsOk = true;
  for (const p of ['tech', 'doc', 'biz']) {
    await page.goto(BASE + '/'); await page.evaluate(() => document.fonts.ready); await sleep(300);
    await page.click(`.chip[data-persona="${p}"]`); await sleep(1300);
    const ok = await page.evaluate(p => { const r = document.getElementById('who').getBoundingClientRect(); return document.getElementById('tab-' + p).getAttribute('aria-selected') === 'true' && !document.getElementById('panel-' + p).hidden && r.top < 150 && r.top > -150; }, p);
    if (!ok) chipsOk = false;
  }
  checks['hero chips scroll to and open the right tab'] = chipsOk;
  // tabs click + keyboard
  await page.goto(BASE + '/'); await sleep(300);
  await page.click('#tab-biz'); await sleep(300);
  checks['tab bar by click'] = await page.evaluate(() => document.getElementById('tab-biz').getAttribute('aria-selected') === 'true' && !document.getElementById('panel-biz').hidden && document.getElementById('panel-tech').hidden);
  await page.focus('#tab-biz'); await page.keyboard.press('ArrowRight'); await sleep(150);
  const k1 = await page.evaluate(() => document.getElementById('tab-tech').getAttribute('aria-selected') === 'true' && document.activeElement.id === 'tab-tech');
  await page.keyboard.press('End'); await sleep(150);
  const k2 = await page.evaluate(() => document.getElementById('tab-biz').getAttribute('aria-selected') === 'true');
  await page.keyboard.press('ArrowLeft'); await sleep(150);
  const k3 = await page.evaluate(() => document.getElementById('tab-doc').getAttribute('aria-selected') === 'true' && !document.getElementById('panel-doc').hidden);
  checks['tab bar by keyboard'] = k1 && k2 && k3;
  // FAQ
  await page.click('#faq details:nth-of-type(2) summary'); await sleep(300);
  const o1 = await page.evaluate(() => document.querySelectorAll('#faq details')[1].open);
  await page.click('#faq details:nth-of-type(2) summary'); await sleep(300);
  const o2 = await page.evaluate(() => !document.querySelectorAll('#faq details')[1].open);
  checks['FAQ opens and closes'] = o1 && o2;
  // header
  await page.goto(BASE + '/'); await sleep(400);
  const hTop = await page.evaluate(() => { const h = document.getElementById('siteHeader'); return { light: h.classList.contains('light'), bg: getComputedStyle(h).backgroundColor, img: getComputedStyle(h).backgroundImage }; });
  await page.evaluate(() => scrollTo({ top: document.getElementById('who').offsetTop + 50, behavior: 'instant' })); await sleep(600);
  const hPast = await page.evaluate(() => { const h = document.getElementById('siteHeader'); const m = getComputedStyle(h).backgroundColor.match(/[\d.]+/g).map(Number); return { light: h.classList.contains('light'), alpha: m.length > 3 ? m[3] : 1 }; });
  checks['header transparent over hero, solid past it'] = !hTop.light && hTop.img.includes('gradient') && hPast.light && hPast.alpha >= 0.9;
  // back to top
  await page.goto(BASE + '/'); await sleep(400);
  const t0 = await page.evaluate(() => document.getElementById('toTop').classList.contains('show'));
  await page.evaluate(() => scrollTo({ top: document.getElementById('about').offsetTop, behavior: 'instant' })); await sleep(600);
  const t1 = await page.evaluate(() => document.getElementById('toTop').classList.contains('show') && getComputedStyle(document.getElementById('toTop')).opacity === '1');
  await page.click('#toTop'); await sleep(1800);
  const t2 = await page.evaluate(() => scrollY < 60);
  checks['back-to-top appears past hero and returns to top'] = !t0 && t1 && t2;
  await page.close();
  // Calendly lazy + fallback (script blocked)
  page = await ctx.newPage(); await stub(page, 'abort');
  const calReqs = [];
  page.on('request', r => { if (/calendly\.com/.test(r.url())) calReqs.push(Date.now()); });
  await page.goto(BASE + '/'); await sleep(1500);
  const before = calReqs.length;
  await page.evaluate(() => scrollTo({ top: document.getElementById('faq').offsetTop, behavior: 'instant' })); await sleep(800);
  const after = calReqs.length;
  checks['Calendly lazy-loads near viewport'] = before === 0 && after > 0;
  await sleep(8500);
  checks['Calendly 8s fallback when script blocked'] = await page.evaluate(() => !document.getElementById('schedFallback').hidden && document.getElementById('calendly').hidden);
  await ctx.close();
  // mobile CTA
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page = await mctx.newPage(); await stub(page);
  await page.goto(BASE + '/'); await sleep(500);
  const vis = () => page.evaluate(() => { const b = document.getElementById('mobileCta'); const r = b.getBoundingClientRect(); return b.classList.contains('show') && r.top < innerHeight - 10 && b.getAttribute('aria-hidden') === 'false'; });
  const m0 = await vis();
  await page.evaluate(() => scrollTo({ top: document.getElementById('how').offsetTop, behavior: 'instant' })); await sleep(700);
  const m1 = await vis();
  await page.evaluate(() => scrollTo({ top: document.getElementById('contact').offsetTop, behavior: 'instant' })); await sleep(700);
  const m2 = await vis();
  checks['mobile CTA bar appears past hero'] = !m0 && m1;
  checks['mobile CTA bar hides at Contact'] = !m2;
  await mctx.close();
  // reduced motion
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  page = await rctx.newPage(); await stub(page);
  await page.goto(BASE + '/'); await sleep(400);
  const anim = async () => page.evaluate(() => {
    const live = document.getAnimations().filter(a => { const t = a.effect && a.effect.getComputedTiming(); return t && (t.duration > 1 || t.duration === Infinity) && a.playState !== 'finished'; }).map(a => (a.animationName || a.transitionProperty || 'anim') + ':' + (a.effect.target && a.effect.target.className));
    const slowTransitions = [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).transitionDuration.split(',').some(d => parseFloat(d) > 0.001)).length;
    const pending = document.querySelectorAll('.reveal-pending').length;
    return { live, slowTransitions, pending, smooth: getComputedStyle(document.documentElement).scrollBehavior };
  });
  const r0 = await anim();
  await page.click('#tab-doc'); await page.evaluate(() => document.querySelector('#faq details').open = true); await page.evaluate(() => scrollTo({ top: 3000, behavior: 'instant' })); await sleep(50);
  const r1 = await anim();
  checks['prefers-reduced-motion disables all animation'] = !r0.live.length && !r1.live.length && !r0.slowTransitions && !r0.pending && r0.smooth === 'auto';
  R.raw.reducedMotion = { r0, r1 };
  await rctx.close();
  const fails = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  fails.forEach(k => fail('E', 2, 'function: ' + k));
  R.raw.function = checks;
  R.assumptions.push('E: checks run with Calendly and Plausible stubbed (empty 200 script), except the Calendly lazy-load/fallback check, which aborts the script to simulate a block.');
  return Math.max(0, 10 - 2 * fails.length);
}

// ---------------- F. Hygiene ----------------
async function hygiene(browser) {
  const items = {};
  const htmlFiles = PAGES.map(p => path.join(SITE, p.name === 'index' ? 'index.html' : p.name === '404' ? '404.html' : 'call-booked/index.html'));
  // em dashes
  const em = htmlFiles.map(f => [path.relative(ROOT, f), (fs.readFileSync(f, 'utf8').match(/—/g) || []).length]).filter(x => x[1]);
  items['zero em dashes'] = { ok: !em.length, detail: em.length ? JSON.stringify(em) : 'none' };
  // console errors + broken links + image dims
  const consoleErrs = [], broken = [], noDims = [];
  for (const pg of PAGES) for (const w of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage(); await stub(page);
    page.on('console', m => { if (m.type() === 'error') consoleErrs.push(`${pg.name}@${w}: ${m.text()}`); });
    page.on('pageerror', e => consoleErrs.push(`${pg.name}@${w}: ${e.message}`));
    page.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400 && !(pg.name === '404' && r.url().endsWith('404.html'))) broken.push(`${pg.name}: ${r.status()} ${r.url()}`); });
    await page.goto(BASE + pg.url); await settle(page);
    if (w === 1280) {
      const refs = await page.evaluate(() => {
        const anchors = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(h.slice(1)));
        const urls = new Set();
        document.querySelectorAll('[href],[src],[srcset],[imagesrcset]').forEach(el => {
          ['href', 'src'].forEach(a => { const v = el.getAttribute(a); if (v && !v.startsWith('#') && !/^(mailto|tel|sms):/.test(v)) urls.add(new URL(v, location.href).href); });
          ['srcset', 'imagesrcset'].forEach(a => { const v = el.getAttribute(a); if (v) v.split(',').forEach(p => urls.add(new URL(p.trim().split(/\s+/)[0], location.href).href)); });
        });
        const og = document.querySelector('meta[property="og:image"]'); if (og) urls.add(og.content.replace('https://advisorpouya.com', location.origin));
        const imgs = [...document.querySelectorAll('img')].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).map(i => i.getAttribute('src'));
        return { anchors, urls: [...urls].filter(u => u.startsWith(location.origin)), imgs };
      });
      refs.anchors.forEach(a => broken.push(`${pg.name}: missing anchor target ${a}`));
      for (const u of refs.urls) { const r = await page.request.get(u); if (r.status() >= 400) broken.push(`${pg.name}: ${r.status()} ${u}`); }
      refs.imgs.forEach(i => noDims.push(`${pg.name}: ${i}`));
    }
    await ctx.close();
  }
  items['zero console errors'] = { ok: !consoleErrs.length, detail: consoleErrs.slice(0, 8).join(' | ') || 'none' };
  items['zero broken anchors / internal links'] = { ok: !broken.length, detail: [...new Set(broken)].join(' | ') || 'none' };
  items['every image has width/height'] = { ok: !noDims.length, detail: noDims.join(' | ') || 'all set' };
  // html-validate (standard preset = HTML standard conformance)
  let hv = '';
  try { hv = cp.execFileSync(path.join(TOOLS, 'node_modules/.bin/html-validate'), ['--preset', 'standard', '--formatter', 'text', ...htmlFiles], { encoding: 'utf8' }); items['valid HTML (html-validate standard)'] = { ok: true, detail: 'no errors' }; }
  catch (e) { hv = (e.stdout || '') + (e.stderr || ''); const errs = hv.split('\n').filter(l => /error/.test(l)); items['valid HTML (html-validate standard)'] = { ok: !errs.length, detail: hv.trim().split('\n').slice(0, 12).join(' | ') }; }
  // canonical / OG / JSON-LD
  const src = fs.readFileSync(htmlFiles[0], 'utf8');
  const metaOk = /<link rel="canonical" href="https:\/\/advisorpouya\.com\/">/.test(src) && ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].every(p => src.includes(`property="${p}"`)) && src.includes('name="twitter:card"');
  const m = src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let ld = null, ldErr = '';
  try { ld = JSON.parse(m[1]); } catch (e) { ldErr = 'JSON parse error: ' + e.message; }
  if (ld) {
    const tsDir = path.join(TOOLS, 'ldcheck'); fs.mkdirSync(tsDir, { recursive: true });
    fs.writeFileSync(path.join(tsDir, 'check.ts'), `import type { Graph } from 'schema-dts';\nconst ld: Graph = ${JSON.stringify(ld, null, 2)};\nexport default ld;\n`);
    try { cp.execFileSync(path.join(TOOLS, 'node_modules/.bin/tsc'), ['--noEmit', '--strict', '--module', 'nodenext', '--moduleResolution', 'nodenext', '--types', '', path.join(tsDir, 'check.ts')], { encoding: 'utf8', cwd: TOOLS }); }
    catch (e) { ldErr = 'schema.org (schema-dts) type errors: ' + ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(0, 6).join(' | '); }
  }
  items['canonical, OG and JSON-LD present and valid'] = { ok: metaOk && !ldErr, detail: (metaOk ? 'meta ok' : 'meta missing') + (ldErr ? '; ' + ldErr : '; JSON-LD validates against schema-dts Graph') };
  const fails = Object.entries(items).filter(([, v]) => !v.ok);
  fails.forEach(([k, v]) => fail('F', 2, `${k}: ${v.detail}`));
  R.raw.hygiene = items;
  R.assumptions.push('F: JSON-LD is validated offline by type-checking it against schema-dts (the schema.org vocabulary as TypeScript types) with tsc --strict, because schema.org and validator.schema.org are blocked by the sandbox proxy. html-validate uses its "standard" preset (HTML conformance).');
  return Math.max(0, 10 - 2 * fails.length);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const scores = {};
  scores.A = +lighthouse().toFixed(2);
  scores.B = await accessibility(browser);
  scores.C = await layout(browser);
  scores.D = await fonts(browser);
  scores.E = await functionTests(browser);
  scores.F = await hygiene(browser);
  await browser.close();
  const total = +Object.values(scores).reduce((a, b) => a + b, 0).toFixed(2);
  R.scores = scores; R.total = total;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(TOOLS, `result-${ITER}.json`), JSON.stringify(R, null, 2));
  // markdown report
  const max = { A: 30, B: 20, C: 20, D: 10, E: 10, F: 10 };
  const names = { A: 'Lighthouse (mobile, throttled)', B: 'Accessibility audit', C: 'Layout integrity', D: 'Type and rendering', E: 'Function', F: 'Copy and code hygiene' };
  const md = [];
  md.push(`# Scorecard iteration ${ITER}`, '', `Commit measured: ${cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()}${cp.execSync('git status --porcelain site', { cwd: ROOT }).toString().trim() ? ' (plus uncommitted site/ changes)' : ''}`, `Date: ${new Date().toISOString()}`, '', `## Total: ${total} / 100`, '', '| Category | Score | Max |', '|---|---|---|');
  for (const k of Object.keys(max)) md.push(`| ${k}. ${names[k]} | ${scores[k]} | ${max[k]} |`);
  md.push('', '## Failures, ranked by points lost', '');
  const ranked = R.failures.slice().sort((a, b) => b.cost - a.cost);
  if (!ranked.length) md.push('None.');
  ranked.forEach((f, i) => md.push(`${i + 1}. [${f.cat}, -${f.cost}] ${f.msg}`));
  md.push('', '## Assumptions', '', ...R.assumptions.map(a => '- ' + a));
  md.push('', '## Raw tool output', '', '### A. Lighthouse runs', '');
  R.raw.lighthouse.forEach((r, i) => md.push(`- Run ${i + 1}: ${JSON.stringify(r.scores)} LCP ${r.lcp}; non-perfect audits: ${r.failing.join('; ') || 'none'}`));
  md.push(`- Median: ${JSON.stringify(R.raw.lighthouseMedian)}`);
  md.push('', '### B. axe-core violations', '', R.raw.axe.length ? R.raw.axe.map(v => `- ${v.key} (${v.impact}): ${v.help} at ${v.where.join(', ')}; ${v.targets.join(' | ')}`).join('\n') : '- none');
  md.push('', '### B. Keyboard walkthrough (1280px)', '', `- Reachability: ${JSON.stringify(R.raw.keyboard.reach)}`, `- Operability: ${JSON.stringify(R.raw.keyboard.op)}`, `- Tab stops (${R.raw.keyboard.stops}):`, '', '```', ...R.raw.keyboard.sequence, '```');
  md.push('', '### C. Layout per viewport', '');
  R.raw.layout.forEach(p => md.push(`- ${p.viewport}: h1 ${p.h1Lines} lines; ${p.problems.length ? p.problems.join(' | ') : 'clean'}`));
  md.push(`- Screenshots: ${SHOTS}`);
  md.push('', '### D. Rendered fonts (CDP getPlatformFontsForNode)', '');
  R.raw.fonts.forEach(r => md.push(r.selector ? `- ${r.page} \`${r.selector}\` expected ${r.expected}, checked ${r.checked} nodes: ${r.bad.length ? 'BAD ' + r.bad.join(', ') : 'ok'}` : `- ${r.page} font faces: ${r.faces.map(f => `${f.family} display=${f.display} ${f.status}`).join('; ')}; preloads: ${r.preloads.join(', ')}`));
  md.push('', '### E. Function checks', '', ...Object.entries(R.raw.function).map(([k, v]) => `- ${v ? 'PASS' : 'FAIL'} ${k}`), `- Reduced-motion probe: ${JSON.stringify(R.raw.reducedMotion)}`);
  md.push('', '### F. Hygiene', '', ...Object.entries(R.raw.hygiene).map(([k, v]) => `- ${v.ok ? 'PASS' : 'FAIL'} ${k}: ${v.detail}`), '');
  fs.writeFileSync(path.join(OUT, `iteration-${ITER}.md`), md.join('\n'));
  console.log(JSON.stringify({ iteration: ITER, scores, total, failures: ranked.map(f => `[${f.cat} -${f.cost}] ${f.msg.slice(0, 220)}`) }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
