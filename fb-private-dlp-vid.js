(function () {
'use strict';
function __fbdlRunClick() {
'use strict';

const TUTORIAL_URL = "https://www.youtube.com/watch?v=xxxxxxxxx";

if (window.__fbDL_cleanup) window.__fbDL_cleanup();
window.__fbDL = window.__fbDL || { results: [], pending: null };
const state = window.__fbDL;
state.results = Array.isArray(state.results) ? state.results : [];
state._lock = false;

console.clear();
console.log('%cfb-private-dlp loaded. Click Play on videos.', 'color:#e10600;font-weight:bold');

const UI_STRINGS = /^(like|comment|share|send|done|play|pause|video|audio|log in|sign up|follow|reply|message|comment as|write a comment|most relevant|all comments|see more|see less|sort by)$/i;

function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeBase(name) {
  let s = cleanText(name)
    .replace(/[\/\\?%*:|"<>]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/&/g, 'and')
    .replace(/[\^|()\[\]{}'`=;!+#~]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  if (s.length > 90) s = s.slice(0, 90).replace(/[. ]+$/g, '').trim();
  return s || 'Unknown_Video';
}

function uniqueName(base) {
  const used = new Set(state.results.map(r => r.name.toLowerCase()));
  let name = sanitizeBase(base), i = 2;
  const stem = name;
  while (used.has(name.toLowerCase())) name = `${stem}_${i++}`;
  return name;
}

function batEchoSafe(s) {
  return cleanText(s).replace(/[&|<>^%!()"]/g, '').slice(0, 120) || 'video';
}

function extractVideoId(url) {
  if (!url) return null;
  if (/facebook\.com\/groups\/\d+\/?(?:[?#].*)?$/.test(url)) return null;
  let m = url.match(/facebook\.com\/reel\/(\d+)/i)
       || url.match(/facebook\.com\/(?:groups\/\d+\/|[\w.]+\/)?videos?\/(\d+)/i)
       || url.match(/facebook\.com\/watch\/(\d+)/i)
       || url.match(/[?&]v=(\d{5,})/)
       || url.match(/video\.php[?#].*?\bv=(\d{5,})/i);
  if (m) return m[1];
  m = url.match(/\/posts\/(\d+)/);
  if (m) return `post-${m[1]}`;
  const sh = url.match(/facebook\.com\/share\/(r|v)\/([A-Za-z0-9_-]{4,})/i);
  if (sh) return `share-${sh[1]}-${sh[2]}`;
  return null;
}

function canonicalUrl(url, id) {
  if (/^(post|share)-/.test(String(id))) {
    const v = (url.match(/[?&]v=\d+/i) || [])[0];
    return url.split('?')[0] + (v ? '?' + v.replace(/^[?&]/, 'v=') : '');
  }
  if (/\/reel\//i.test(url)) return `https://www.facebook.com/reel/${id}/`;
  if (/\/videos?\//i.test(url)) return `https://www.facebook.com/watch/?v=${id}`;

  if (/[?&]v=\d+/i.test(url) && /^\d+$/.test(String(id))) return `https://www.facebook.com/watch/?v=${id}`;
  return url.split('?')[0];
}

function validCaption(t) {
  if (!t || t.length < 4 || t.length > 600) return false;
  if (UI_STRINGS.test(t)) return false;
  if (/comment as/i.test(t)) return false;
  if (/posts? completed/i.test(t)) return false;
  if (t.toLowerCase() === 'facebook') return false;

  if (/anyone can (find|see)/i.test(t)) return false;
  if (/only members can/i.test(t)) return false;
  if (/members can see who/i.test(t)) return false;
  if (/^(about|private|visible|members|photos|videos|events|files|guides?)$/i.test(t)) return false;
  return true;
}

function tidyCaption(t) {
  return cleanText(t).replace(/\s*(…|\.\.\.)?\s*See (more|less)$/i, '').trim();
}

function authorFromArticle(article) {
  if (!article || !article.querySelector) return null;
  const a = article.querySelector('h2 a, h3 a, h4 a, strong a');
  const t = cleanText(a && a.innerText);
  return (t && t.length >= 2 && t.length <= 60 && !UI_STRINGS.test(t)) ? t : null;
}

function messageBlockTitle(article) {
  if (!article || !article.querySelector) return null;
  const msg = article.querySelector('div[data-ad-preview="message"], div[data-ad-comet-preview="message"]');
  if (msg) {
    const t = tidyCaption(msg.innerText);
    if (validCaption(t)) return t;
  }
  return null;
}

function articleSpatialTitle(article, clickX, clickY) {
  if (!article || !article.querySelectorAll) return null;
  const nodes = article.querySelectorAll('span[dir="auto"], div[dir="auto"], h2, h3, h4, strong');
  let best = null, bestD = Infinity;
  nodes.forEach(node => {
    const txt = tidyCaption(node.innerText);
    if (!validCaption(txt)) return;
    if (/^(GUIDE|MODULE|UNIT|WEEK|SECTION)\s*\d+/i.test(txt)) return;
    const rect = node.getBoundingClientRect();
    if (!rect.height || !rect.width) return;
    if (clickX != null && (clickX < rect.left - 400 || clickX > rect.right + 400)) return;
    const distY = clickY - rect.bottom;
    if (distY > -30 && distY < bestD && distY < 800) { bestD = distY; best = txt; }
  });
  return best;
}

function pageSpatialTitle(clickX, clickY) {
  const nodes = document.querySelectorAll('span[dir="auto"], div[dir="auto"], h2, h3, h4, strong');
  let best = null, bestD = Infinity;
  nodes.forEach(node => {
    if (node.closest('#fbdl-box, header, aside, [role="banner"], [role="navigation"], [role="complementary"]')) return;
    const txt = tidyCaption(node.innerText);
    if (!validCaption(txt)) return;
    if (/^(GUIDE|MODULE|UNIT|WEEK|SECTION)\s*\d+/i.test(txt)) return;
    const rect = node.getBoundingClientRect();
    if (!rect.height || !rect.width) return;
    if (clickX < rect.left - 400 || clickX > rect.right + 400) return;
    const distY = clickY - rect.bottom;
    if (distY > -30 && distY < bestD && distY < 800) { bestD = distY; best = txt; }
  });
  return best;
}

function fmtDate(v) {
  const m = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + m[2] + m[3] : null;
}

function dateFrom(root) {
  const el = root && root.querySelector ? root.querySelector('time[datetime]') : null;
  return el ? fmtDate(el.getAttribute('datetime')) : null;
}

function uploadDate(article) {
  return dateFrom(article) || dateFrom(document.querySelector('div[role="dialog"]'));
}

function fallbackDate() {
  const p = state.pending;
  if (p && p.date && Date.now() - p.time < 20000) return p.date;
  return dateFrom(document.querySelector('div[role="dialog"]'));
}

function lockCaption(caption, author, date) {

  if (!caption) {
    if (state.pending?.title && Date.now() - state.pending.time < 20000) {
      if (author && !state.pending.author) state.pending.author = author;
      if (date && !state.pending.date) state.pending.date = date;
      return;
    }
    if (!author && !date) return;
  }
  state.pending = { title: caption || null, author: author || null, date: date || null, time: Date.now() };
  const tgt = document.getElementById('fbdl-target');
  const shown = caption || date;
  if (shown && tgt) tgt.innerHTML = `<b>Target:</b><br><span style="color:#ff5252;font-weight:bold;">${escHtml(shown.slice(0, 90))}.mp4</span>`;
  setStatus(caption ? 'Target locked — now open the video.'
    : date ? 'No caption — upload date ' + date + ' will be the file name.'
    : 'No caption found — author saved as backup.');
}

function titleFromDialog() {
  const dlg = document.querySelector('div[role="dialog"]');
  if (!dlg) return null;
  const msg = dlg.querySelector('div[data-ad-preview="message"], div[data-ad-comet-preview="message"]');
  if (msg) {
    const t = tidyCaption(msg.innerText);
    if (t.length >= 3 && validCaption(t)) return t;
  }
  return null;
}

function resolveTitle(prefer) {
  const d = titleFromDialog();
  if (d) return d;
  if (prefer) return prefer;
  if (state.pending && Date.now() - state.pending.time < 20000 && state.pending.title) {
    return state.pending.title;
  }
  return null;
}

document.getElementById('fbdl-box')?.remove();

const box = document.createElement('div');
box.id = 'fbdl-box';
box.style.cssText = 'position:fixed;top:16px;right:16px;width:340px;max-height:calc(100vh - 32px);overflow-y:auto;z-index:999999;background:#101010;color:#f0f0f0;padding:0;border:1px solid #ffffff;border-radius:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;';
box.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(to bottom,#5b9bf5 0%,#1e6df2 50%,#0d47c2 100%);color:#fff;padding:8px 12px;border-bottom:2px solid #082a70;">
    <div><b style="font-size:12px;font-weight:900;letter-spacing:2px;white-space:nowrap;">FB-PRIVATE-DLP</b><br><span style="font-size:10px;color:#d4dcf0;letter-spacing:1px;">Made with &lt;3 by convex17r.</span></div>
    <span style="display:flex;align-items:center;">
      <button id="fbdl-help" title="Watch tutorial video" style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(to bottom,#ff7a7a 0%,#e02020 42%,#a80000 58%,#d41414 100%);color:#fff;border:2px solid #d7d7d7;border-radius:20px;box-shadow:inset 0 1px 2px rgba(255,255,255,.85),inset 0 -2px 3px rgba(0,0,0,.45);cursor:pointer;padding:3px 12px 3px 9px;font-size:11px;font-weight:900;letter-spacing:1px;margin-right:6px;text-shadow:0 1px 2px rgba(0,0,0,.65);"><span style="display:inline-block;width:0;height:0;border-left:10px solid #fff;border-top:6px solid transparent;border-bottom:6px solid transparent;filter:drop-shadow(0 1px 1px rgba(0,0,0,.65));"></span>Play video</button>
      <button id="fbdl-x" title="Close panel" style="background:#fff;color:#e10600;border:none;border-radius:0;cursor:pointer;padding:3px 10px;font-size:14px;font-weight:900;line-height:1;">X</button>
    </span>
  </div>
  <div style="padding:12px 14px;">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
    <div style="color:#8a8a8a;font-size:11px;">Click <b>Play</b> on each video, one at a time.</div>
    <span title="Nepal" style="flex-shrink:0;line-height:0;"><svg width="24" height="28" viewBox="0 0 30 34"><path d="M5 2 L21 13 L11 16 L23 30 L5 30 Z" fill="#DC143C" stroke="#003893" stroke-width="2.5" stroke-linejoin="round"/><circle cx="9.5" cy="10.5" r="2.3" fill="#fff"/><g stroke="#fff" stroke-width="1.3" stroke-linecap="round"><line x1="10" y1="20" x2="10" y2="27"/><line x1="6.5" y1="23.5" x2="13.5" y2="23.5"/><line x1="7.5" y1="21" x2="12.5" y2="26"/><line x1="12.5" y1="21" x2="7.5" y2="26"/></g></svg></span>
  </div>
  <label style="display:block;margin:4px 0;font-size:14px;font-weight:bold;letter-spacing:1px;color:#2f8fff;">COOKIES SOURCE</label>
  <select id="fbdl-browser" style="width:100%;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;margin-bottom:8px;">
    <option value="cookies.txt">cookies.txt file (keep in download folder)</option>
    <option value="chrome" selected>Chrome (close Chrome before .bat)</option>
    <option value="edge">Edge (close Edge before .bat)</option>
    <option value="firefox">Firefox (no need to close browser)</option>
    <option value="brave">Brave (close Brave before .bat)</option>
    <option value="safari">Safari</option>
    <option value="opera">Opera (close Opera before .bat)</option>
  </select>
  <label style="display:block;margin:4px 0;font-size:14px;font-weight:bold;letter-spacing:1px;color:#2f8fff;">IMPERSONATE AS</label>
  <select id="fbdl-imp" style="width:100%;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;margin-bottom:8px;">
    <option value="firefox" selected>firefox (recommended)</option>
    <option value="chrome">chrome</option>
    <option value="edge">edge</option>
    <option value="safari">safari</option>
    <option value="off">off (not recommended)</option>
  </select>
  <label style="display:block;margin:6px 0;"><input type="checkbox" id="fbdl-aria"> Use aria2c (faster — needs aria2c installed)</label>
  <label style="display:block;margin:2px 0 10px;"><input type="checkbox" id="fbdl-auto" checked> Auto-close video after capture</label>
  <div style="border-top:3px solid #ffffff;margin:0 -14px;padding:8px 14px 0;font-weight:bold;letter-spacing:1px;">CAPTURED: <b id="fbdl-count" style="color:#e10600;font-size:20px;">0</b>
    <button id="fbdl-clear" style="float:right;background:linear-gradient(to bottom,#ffffff 0%,#ececec 45%,#d0d0d0 50%,#e6e6e6 100%);color:#111;border:1px solid #555;border-radius:3px;box-shadow:inset 0 1px 0 #fff;cursor:pointer;padding:5px 14px;font-size:13px;font-weight:bold;">CLEAR</button>
  </div>
  <div id="fbdl-target" style="background:#1c1c1c;border:1px solid #333;border-left:4px solid #e10600;border-radius:0;padding:8px;margin:8px 0;min-height:36px;word-break:break-word;"><i>Waiting for click…</i></div>
  <div id="fbdl-list" style="max-height:170px;overflow-y:auto;margin-bottom:8px;display:flex;flex-direction:column;gap:4px;"></div>
  <div id="fbdl-status" style="color:#b0b3b8;min-height:16px;margin-bottom:8px;">Ready…</div>
  <button id="fbdl-dl" style="width:100%;background:linear-gradient(to bottom,#bcd8f7 0%,#6fa8ef 45%,#2059c9 50%,#4d8ef2 100%);color:#fff;border:1px solid #0b2a5e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:12px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,20,60,.6);">DOWNLOAD .BAT (yt-dlp)</button>
  <button id="fbdl-copy" style="width:100%;background:linear-gradient(to bottom,#ffffff 0%,#ececec 45%,#d0d0d0 50%,#e6e6e6 100%);color:#111;border:1px solid #555;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),inset 0 1px 0 #fff;padding:8px;cursor:pointer;margin-top:6px;font-weight:bold;">Copy cmd commands</button>
  <div style="border-top:3px solid #ffffff;margin:10px -14px 0;padding:8px 14px 0;">
    <div style="font-size:14px;font-weight:bold;letter-spacing:1px;color:#2f8fff;margin-bottom:4px;">DO FIRST: SETUP COMMANDS <span id="fbdl-oshint">(paste in PowerShell)</span><sup style="color:#e10600;font-size:16px;font-weight:900;">*</sup></div>
    <select id="fbdl-os" style="width:100%;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;margin-bottom:6px;">
      <option value="windows">Windows (PowerShell)</option>
      <option value="macos">macOS (Terminal)</option>
      <option value="linux">Linux (Terminal)</option>
    </select>
    <textarea id="fbdl-setup" readonly rows="5" style="width:100%;box-sizing:border-box;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;font-family:Consolas,monospace;font-size:11px;resize:none;">winget install -e --id yt-dlp.yt-dlp
winget install -e --id Gyan.FFmpeg
winget install -e --id aria2.aria2</textarea>
    <button id="fbdl-setupcopy" style="width:100%;background:linear-gradient(to bottom,#cfe6ff 0%,#80b4f2 45%,#2b6cd4 50%,#5b9bf5 100%);color:#fff;border:1px solid #0b2a5e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:7px;cursor:pointer;margin-top:6px;letter-spacing:1px;font-weight:bold;text-shadow:0 1px 1px rgba(0,20,60,.6);">COPY SETUP COMMANDS</button>
  </div>
  <div style="color:#888;font-size:11px;margin-top:8px;line-height:1.5;"> Use with responsibility, I will not be responsible for misuse. <br>Needs latest yt-dlp.exe. Run installation commands.</div>
  </div>`;
document.body.appendChild(box);

function detectBrowser() {
  const ua = navigator.userAgent || '';
  if (/Firefox\//i.test(ua) && !/Seamonkey/i.test(ua)) return 'firefox';
  if (/Edg(e|A|iOS)?\//i.test(ua)) return 'edge';
  if (/\bOPR\/|Opera/i.test(ua)) return 'opera';
  if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) return 'safari';
  return 'chrome';
}
function setCookieBrowser(v) {
  const s = document.getElementById('fbdl-browser');
  if (s && Array.from(s.options).some(o => o.value === v)) s.value = v;
}
setCookieBrowser(detectBrowser());
try {
  if (navigator.brave && navigator.brave.isBrave) {
    navigator.brave.isBrave().then(yes => { if (yes) setCookieBrowser('brave'); }).catch(() => {});
  }
} catch (e) {  }

const SETUP_CMDS = {
  windows: 'winget install -e --id yt-dlp.yt-dlp\nwinget install -e --id Gyan.FFmpeg\nwinget install -e --id aria2.aria2',
  macos: '# Requires Homebrew (https://brew.sh)\nbrew install yt-dlp ffmpeg aria2',
  linux: 'sudo apt update && sudo apt install -y yt-dlp ffmpeg aria2'
};
const SETUP_HINTS = { windows: '(paste in PowerShell)', macos: '(paste in Terminal)', linux: '(paste in Terminal)' };
function applySetupOS(os) {
  if (!SETUP_CMDS[os]) return;
  const t = document.getElementById('fbdl-setup');
  if (t) t.value = SETUP_CMDS[os];
  const h = document.getElementById('fbdl-oshint');
  if (h) h.textContent = SETUP_HINTS[os];
  const s = document.getElementById('fbdl-os');
  if (s) s.value = os;
}
function detectOS() {
  const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  if (/mac/i.test(p)) return 'macos';
  if (/linux|android/i.test(p)) return 'linux';
  const ua = navigator.userAgent || '';
  if (/Mac OS X/i.test(ua)) return 'macos';
  if (/Linux|Android/i.test(ua)) return 'linux';
  return 'windows';
}
applySetupOS(detectOS());
document.getElementById('fbdl-os').onchange = e => applySetupOS(e.target.value);

function setStatus(msg, ok) {
  const el = document.getElementById('fbdl-status');
  if (el) { el.textContent = msg; el.style.color = ok === true ? '#31a24c' : ok === false ? '#ff6b6b' : '#b0b3b8'; }
}

function render() {
  const c = document.getElementById('fbdl-count');
  if (c) c.textContent = state.results.length;
  const list = document.getElementById('fbdl-list');
  if (!list) return;
  list.innerHTML = '';
  state.results.forEach((r, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;background:linear-gradient(to bottom,#f2a0a0 0%,#e05858 45%,#c41c1c 50%,#e03030 100%);border:1px solid #5e0a0a;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:5px 6px;';
    const badge = document.createElement('span');
    badge.textContent = i + 1;
    badge.style.cssText = 'background:linear-gradient(to bottom,#ffffff 0%,#dcdcdc 100%);color:' + (i % 2 ? '#1a6ff5' : '#e10600') + ';border:1px solid #555;border-radius:3px;font-weight:900;font-size:12px;padding:2px 8px;flex-shrink:0;';
    const name = document.createElement('input');
    name.value = r.name; name.title = r.url;
    name.style.cssText = 'flex:1;background:transparent;border:none;color:#fff;font-size:12px;font-weight:bold;text-shadow:0 1px 1px rgba(0,0,0,.55);min-width:0;';
    name.onchange = () => { r.name = uniqueName(name.value); name.value = r.name; };
    const del = document.createElement('button');
    del.textContent = 'X'; del.title = r.url;
    del.style.cssText = 'background:#fff;color:#e10600;border:1px solid #5e0a0a;border-radius:3px;cursor:pointer;font-size:11px;font-weight:900;padding:2px 7px;flex-shrink:0;';
    del.onclick = () => { state.results.splice(i, 1); render(); };
    row.append(badge, name, del);
    list.appendChild(row);
  });
}
render();

function tryCapture(url, preferredTitle) {
  const id = extractVideoId(url);
  if (!id) return false;
  if (state.results.some(r => r.id === id)) return false;
  if (state._lock) return false;

  const idClean = String(id).replace(/[^A-Za-z0-9]+/g, '');
  let rawTitle = resolveTitle(preferredTitle);

  if (!rawTitle) rawTitle = fallbackDate();
  if (!rawTitle && state.pending?.author && Date.now() - state.pending.time < 20000) {
    rawTitle = `${state.pending.author} - FB_Video_${idClean}`;
  }
  if (!rawTitle) rawTitle = `FB_Video_${idClean}`;
  const name = uniqueName(rawTitle);
  state.results.push({ id, url: canonicalUrl(url, id), name });
  render();
  setStatus(`Captured: ${name.slice(0, 30)}`, true);
  const tgt = document.getElementById('fbdl-target');
  if (tgt) tgt.innerHTML = `<b>Captured ${state.results.length}:</b><br><span style="color:#31a24c;">${escHtml(name)}.mp4</span>`;

  if (document.getElementById('fbdl-auto')?.checked && document.querySelector('div[role="dialog"]')) {
    state._lock = true;
    setTimeout(() => {
      const btn = document.querySelector('div[role="dialog"] div[aria-label="Close"]');
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, view: window }));
      setTimeout(() => {
        state._lock = false;
        state.pending = null;
        lastUrl = location.href;
        setStatus('Ready for next…');
      }, 1200);
    }, 700);
  } else {
    state.pending = null;
  }
  return true;
}

function grabCaption(e) {
  const article = e.target.closest?.('div[role="article"], article');
  const caption = messageBlockTitle(article)
    || (article && articleSpatialTitle(article, e.clientX, e.clientY))
    || pageSpatialTitle(e.clientX, e.clientY);
  lockCaption(caption && caption.replace(/[\/\\?%*:|"<>]/g, '').trim(), authorFromArticle(article), uploadDate(article));
}

function onMouseDown(e) {
  if (e.target.closest?.('#fbdl-box')) return;
  grabCaption(e);
}

function onClick(e) {
  if (e.target.closest?.('#fbdl-box')) return;
  grabCaption(e);
  const a = e.target.closest?.('a[href*="/reel/"], a[href*="/videos/"], a[href*="/watch"], a[href*="/posts/"]');
  if (a?.href && extractVideoId(a.href)) setTimeout(() => tryCapture(a.href), 600);
}

let lastUrl = location.href;
function checkUrl() {
  if (state._lock) return;
  const cur = location.href;
  if (cur !== lastUrl) {
    lastUrl = cur;
    if (extractVideoId(cur)) {
      setTimeout(() => tryCapture(cur), 900);
    }
  }
}

const _push = history.pushState, _rep = history.replaceState;
history.pushState = function (...a) { const r = _push.apply(this, a); setTimeout(checkUrl, 400); return r; };
history.replaceState = function (...a) { const r = _rep.apply(this, a); setTimeout(checkUrl, 400); return r; };

document.addEventListener('mousedown', onMouseDown, true);
document.addEventListener('click', onClick, true);
const interval = setInterval(checkUrl, 500);
function onPopState() { setTimeout(checkUrl, 400); }
window.addEventListener('popstate', onPopState);

function buildCommands() {
  const browser = document.getElementById('fbdl-browser')?.value || 'chrome';
  const impersonate = document.getElementById('fbdl-imp')?.value || 'firefox';
  const useAria = document.getElementById('fbdl-aria')?.checked;
  const useCookieFile = browser === 'cookies.txt';
  const cookiePart = useCookieFile ? '--cookies "cookies.txt"' : `--cookies-from-browser ${browser}`;
  const impPart = impersonate && impersonate !== 'off' ? `--impersonate ${impersonate}` : '';

  const L = [
    '@echo off',
    'chcp 65001 >nul',
    'setlocal DisableDelayedExpansion',
    'cd /d "%~dp0"',
    'set "PATH=%LOCALAPPDATA%\\Microsoft\\WinGet\\Links;%PATH%"',
    'set "YTDLP_DL=-N 4 --concurrent-fragments 4"',
    'echo ===============================================',
    'echo  fb-private-dlp - Facebook bulk media download',
    'echo ===============================================',
    'echo.',
    'where yt-dlp >nul 2>nul',
    'if not exist "yt-dlp.exe" if errorlevel 1 (',
    '  echo [ERROR] yt-dlp.exe not found in this folder.',
    '  echo Download it from https://github.com/yt-dlp/yt-dlp/releases and place it here.',
    '  echo.',
    '  pause',
    '  exit /b 1',
    ')',
  ];
  if (useCookieFile) {
    L.push(
      'if not exist "cookies.txt" (',
      '  echo [WARN] cookies.txt not found - private videos will fail.',
      '  echo Export it with "Get cookies.txt LOCALLY" for facebook.com.',
      '  echo.',
      ')'
    );
  } else if (browser === 'chrome' || browser === 'edge' || browser === 'brave') {
    L.push(`echo NOTE: close ${browser} before running, or cookies cannot be read.`, 'echo.');
  }
  if (useAria) {
    L.push(
      'where aria2c >nul 2>nul',
      'if errorlevel 1 if not exist "aria2c.exe" goto aria2c_missing',
      'set "YTDLP_DL=--downloader aria2c --downloader-args "aria2c:-c -j16 -x16 -s16 -k1M""',
      'goto aria2c_ok',
      ':aria2c_missing',
      'echo [WARN] aria2c not found - using the built-in downloader instead.',
      'echo Install it with: winget install -e --id aria2.aria2, then run this .bat again.',
      'echo.',
      ':aria2c_ok'
    );
  }
  if (impPart) {
    L.push(`echo Using browser impersonation: ${impersonate} [requires latest yt-dlp].`, 'echo.');
  } else {
    L.push('echo WARNING: impersonation is OFF - Facebook may fail with parse errors.', 'echo.');
  }
  L.push('echo.');

  state.results.forEach((r, i) => {
    const safe = batEchoSafe(r.name);
    L.push(
      `echo [${i + 1}/${state.results.length}] ${safe}`,
      `yt-dlp ${cookiePart}${impPart ? ' ' + impPart : ''} --no-playlist --retries 10 --fragment-retries 10 --sleep-requests 1 %YTDLP_DL% -f "bv*+ba/b" --merge-output-format mp4 -o "${r.name}.mp4" "${r.url}"`,
      `if errorlevel 1 (echo   FAILED: ${safe}) else (echo   DONE: ${safe})`,
      'echo.'
    );
  });
  L.push('echo All finished!', 'pause', 'endlocal');
  return L.join('\r\n');
}

function downloadBat() {
  if (!state.results.length) { alert("You haven't captured any videos yet!"); return; }
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const blob = new Blob(['\uFEFF' + buildCommands()], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fb-private-dlp_${stamp}.bat`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`Downloaded: ${a.download}`, true);
}

document.getElementById('fbdl-dl').onclick = downloadBat;
document.getElementById('fbdl-copy').onclick = async () => {
  if (!state.results.length) { alert("You haven't captured any videos yet!"); return; }
  try { await navigator.clipboard.writeText(buildCommands()); setStatus('Commands copied!', true); }
  catch { setStatus('Copy blocked by browser.', false); }
};
document.getElementById('fbdl-clear').onclick = () => { state.results = []; render(); setStatus('Cleared.'); };
document.getElementById('fbdl-setupcopy').onclick = async () => {
  try { await navigator.clipboard.writeText(document.getElementById('fbdl-setup').value); setStatus('Setup commands copied!', true); }
  catch { setStatus('Copy blocked by browser.', false); }
};
document.getElementById('fbdl-help').onclick = () => window.open(TUTORIAL_URL, '_blank');
document.getElementById('fbdl-x').onclick = () => window.__fbDL_cleanup();

window.__fbDL_cleanup = () => {
  clearInterval(interval);
  history.pushState = _push; history.replaceState = _rep;
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('click', onClick, true);
  window.removeEventListener('popstate', onPopState);
  document.getElementById('fbdl-box')?.remove();
  window.__fbDL_cleanup = null;
};

}

function __fbdlRunBulk() {
'use strict';

if (window.__fbBulk_cleanup) window.__fbBulk_cleanup();
window.__fbBulk = window.__fbBulk || { results: [] };
const state = window.__fbBulk;
state.results = Array.isArray(state.results) ? state.results : [];
state.scanning = false;
state.harvesting = false;
state.harvestCancel = false;
state.gen = (state.gen || 0) + 1;

const LS_KEY = 'fbdl_bulk_results';
function saveState() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state.results)); } catch (e) { }
}
if (!state.results.length) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    if (Array.isArray(saved) && saved.length) state.results = saved.filter(r => r && r.type !== 'photo');
  } catch (e) { }
}

console.clear();
console.log('%cfb-private-dlp Video BULK mode loaded. Click "Scan Videos".', 'color:#e10600;font-weight:bold');

function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeBase(name) {
  let s = cleanText(name)
    .replace(/[\/\\?%*:|"<>]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/&/g, 'and')
    .replace(/[\^|()\[\]{}'`=;!+#~]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  if (s.length > 90) s = s.slice(0, 90).replace(/[. ]+$/g, '').trim();
  return s || 'Unknown_Video';
}

function uniqueName(base) {
  const used = new Set(state.results.map(r => r.name.toLowerCase()));
  let name = sanitizeBase(base), i = 2;
  const stem = name;
  while (used.has(name.toLowerCase())) name = `${stem}_${i++}`;
  return name;
}

function batEchoSafe(s) {
  return cleanText(s).replace(/[&|<>^%!()"]/g, '').slice(0, 120) || 'media';
}

function extractVideoId(url) {
  if (!url) return null;
  if (/facebook\.com\/groups\/\d+\/?(?:[?#].*)?$/.test(url)) return null;
  let m = url.match(/facebook\.com\/reel\/(\d+)/i)
       || url.match(/facebook\.com\/(?:groups\/\d+\/|[\w.]+\/)?videos?\/(\d+)/i)
       || url.match(/facebook\.com\/watch\/(\d+)/i)
       || url.match(/[?&]v=(\d{5,})/)
       || url.match(/video\.php[?#].*?\bv=(\d{5,})/i);
  if (m) return m[1];
  m = url.match(/\/posts\/(\d+)/);
  if (m) return `post-${m[1]}`;
  const sh = url.match(/facebook\.com\/share\/(r|v)\/([A-Za-z0-9_-]{4,})/i);
  if (sh) return `share-${sh[1]}-${sh[2]}`;
  return null;
}

function canonicalUrl(url, id) {
  if (/^(post|share)-/.test(String(id))) {
    const v = (url.match(/[?&]v=\d+/i) || [])[0];
    return url.split('?')[0] + (v ? '?' + v.replace(/^[?&]/, 'v=') : '');
  }
  if (/\/reel\//i.test(url)) return `https://www.facebook.com/reel/${id}/`;
  if (/\/videos?\//i.test(url)) return `https://www.facebook.com/watch/?v=${id}`;
  if (/[?&]v=\d+/i.test(url) && /^\d+$/.test(String(id))) return `https://www.facebook.com/watch/?v=${id}`;
  return url.split('?')[0];
}

function tidyCaption(t) {
  return cleanText(t)
    .replace(/\s*(…|\.\.\.)?\s*See (more|less)$/i, '')
    .replace(/\s*[…]+$/, '')
    .trim();
}

const MEDIA_CAPTION_SKIP = /^(like|comment|share|send|done|play|pause|video|audio|log in|sign up|follow|reply|message|photos?|videos?|albums?|about|private|visible|members|events|files|guides?)$/i;
const TIME_UNITS = 's|sec|secs|seconds?|min|mins|minutes?|h|hr|hrs|hours?|d|days?|w|weeks?|mo|mos?|months?|y|yrs?|years?';
const TIME_ROW_RE = new RegExp(`[·•]\\s*\\d+\\s*(${TIME_UNITS})\\.?`, 'i');
const GATE_ROW_RE = new RegExp(`^([^·•]{0,60}[·•]\\s*)?\\d+\\s*(${TIME_UNITS})\\.?$`, 'i');

function validCaption(t) {
  if (!t || t.length < 3 || t.length > 300) return false;
  if (MEDIA_CAPTION_SKIP.test(t)) return false;
  if (/anyone can|only members|members can see/i.test(t)) return false;
  if (/comment as|posts? completed/i.test(t)) return false;
  if (/^(see all|see more|see less|show more|show less|comments?|likes?|shares?|views?)$/i.test(t)) return false;
  if (/^[\d.,]+\s*[KM]?$/.test(t)) return false;
  if (/^\d[\d.,]*\s*[KM]?\s*(comments?|likes?|views?|shares?|replies|reactions?)\b/i.test(t)) return false;
  if (/^\d+\s*(?:s|sec|secs|seconds?|min|mins|minutes?|h|hr|hrs|hours?|d|days?|w|weeks?|mo|mos?|months?|y|yrs?|years?)\.?$/i.test(t)) return false;
  if (TIME_ROW_RE.test(t)) return false;
  if (/^(video|photo|reel|post) by\b/i.test(t)) return false;
  if (/^shared with\b/i.test(t)) return false;
  if (/^(facebook (helps|is|enables|was)|log in to|sign (in|up) to|create (an? |your )?account|welcome to facebook)/i.test(t)) return false;
  if (/^(image may contain|may be an image of)\b/i.test(t)) return false;
  if (/^(videos?|photos?|images?|thumbnails?|posters?|frames?|pictures?)(\s+(thumbnail|preview|poster|image|frame|picture|cover))?$/i.test(t)) return false;
  if ((t.match(/\b(share|comments?|see all|reactions?|follow)\b/gi) || []).length >= 2) return false;
  return true;
}

function captionForLink(link) {
  if (!link || typeof link.compareDocumentPosition !== 'function') return null;

  for (const attr of ['aria-label', 'title']) {
    const v = tidyCaption(link.getAttribute ? (link.getAttribute(attr) || '') : '');
    if (validCaption(v)) return v;
  }

  for (const img of link.querySelectorAll('img')) {
    const a = tidyCaption(img.getAttribute('alt') || '');
    if (validCaption(a)) return a;
  }

  const SEL = 'a[href*="/videos/"], a[href*="/reel/"], a[href*="/watch/"], a[href*="/photo"], span[dir="auto"], div[dir="auto"], h4, h3, h2, img';
  const isMediaLink = n => n.tagName === 'A' && /\/(videos?|reel|watch|photo)/i.test(n.getAttribute('href') || '');
  const follows = n => n !== link &&
    ((typeof link.contains === 'function' && link.contains(n)) ||
      (link.compareDocumentPosition(n) & 4) !== 0);

  let el = link;
  for (let depth = 0; depth < 5 && el; depth++, el = el.parentElement) {
    const seen = new Set();
    for (const n of el.querySelectorAll(SEL)) {
      if (isMediaLink(n)) {
        if (n !== link && follows(n)) break;
        continue;
      }
      if (!follows(n)) continue;
      let t = n.tagName === 'IMG'
        ? tidyCaption(n.getAttribute('alt') || '')
        : tidyCaption(n.innerText || '');
      if (!t) t = tidyCaption(n.getAttribute('aria-label') || n.getAttribute('title') || '');
      if (!validCaption(t) || seen.has(t)) continue;
      seen.add(t);
      return t;
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function autoScroll(maxRounds = 80) {
  let prev = 0;
  for (let i = 0; i < maxRounds; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(900);
    const cur = document.body.scrollHeight;
    if (cur === prev) break;
    prev = cur;
  }
  window.scrollTo(0, 0);
  await sleep(500);
}

async function scanVideos() {
  if (state.scanning || state.harvesting) return;
  state.scanning = true;
  setBusy(true);
  setStatus('Auto-scrolling to load all videos…');
  await autoScroll();
  setStatus('Scanning video links…');

  const seen = new Set();
  let added = 0;
  const tryAdd = (url, el) => {
    if (!url) return false;
    const id = extractVideoId(url);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    if (state.results.some(r => r.id === id)) return false;
    let cap = null;
    try { cap = el ? captionForLink(el) : null; } catch (e) { }
    const name = uniqueName(cap || `Video_${String(id).replace(/[^A-Za-z0-9]+/g, '')}`);
    state.results.push({ id, url: canonicalUrl(url, id), name, type: 'video' });
    added++;
    return true;
  };

  for (const a of document.querySelectorAll('a[href*="/reel/"], a[href*="/videos/"], a[href*="/watch"], a[href*="/posts/"]')) {
    tryAdd(a.href, a);
  }

  for (const el of document.querySelectorAll('[data-store], [data-ajaxify], [data-href], [data-uri], [data-video-id]')) {
    for (const attr of ['data-store', 'data-ajaxify', 'data-href', 'data-uri', 'data-video-id']) {
      let val = el.getAttribute(attr);
      if (!val) continue;
      try {
        const j = JSON.parse(val);
        val = j.video_id ? `https://www.facebook.com/watch/?v=${j.video_id}` : j.video_url || j.href || j.uri || val;
      } catch (e) {  }
      tryAdd(val, el);
    }
  }

  if (added === 0) {
    setStatus('No links found — scanning raw page content…');
    const html = document.body.innerHTML;
    for (const re of [
      /facebook\.com\/reel\/(\d+)/gi,
      /facebook\.com\/[\w.]+\/videos?\/(\d+)/gi,
      /"video_id"\s*:\s*"?\s*(\d{10,})"?/gi,
      /"videoID"\s*:\s*"?\s*(\d{10,})"?/gi,
    ]) {
      let m;
      while ((m = re.exec(html)) !== null) tryAdd(`https://www.facebook.com/videos/${m[1]}/`);
    }
  }

  render();
  setStatus(
    added > 0
      ? `Found ${added} new videos (${state.results.length} total).`
      : `Found 0 videos — make sure you're on Group → Media → Videos tab.`,
    added > 0
  );
  state.scanning = false;
  setBusy(false);
  if (state.results.some(r => r.type === 'video' && !r._capDone)) {
    await sleep(900);
    await harvestCaptions();
  }
}


function setBusy(busy) {
  for (const id of ['fbdl-scan-v']) {
    const b = document.getElementById(id);
    if (b) { b.disabled = busy; b.style.opacity = busy ? '.6' : ''; }
  }
}

function findTileLink(r) {
  if (!/^\d+$/.test(String(r.id))) return null;
  for (const sel of [
    `a[href*="/videos/${r.id}"]`,
    `a[href*="/reel/${r.id}"]`,
    `a[href*="v=${r.id}"]`,
    `a[href*="/${r.id}"]`,
  ]) {
    for (const a of document.querySelectorAll(sel)) {
      const rect = a.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return a;
    }
  }
  return null;
}

function fireClick(el) {
  const opts = { bubbles: true, cancelable: true, view: window };
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
}

function waitFor(fn, ms, step = 250) {
  const t0 = Date.now();
  return (async () => {
    while (Date.now() - t0 < ms) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  })();
}

const CAP_KEY_HI = /^(message|text|caption|title)$/i;
const CAP_KEY_LO = /^(description|label|alt)$/i;

function deepCaption(o, keys) {
  if (!o || typeof o !== 'object') return null;
  if (Array.isArray(o)) {
    for (const v of o) { const r = deepCaption(v, keys); if (r) return r; }
    return null;
  }
  for (const [k, v] of Object.entries(o)) {
    if (keys.test(k)) {
      if (typeof v === 'string' && validCaption(v)) return v;
      if (v && typeof v === 'object') { const r = deepCaption(v, keys); if (r) return r; }
    }
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') { const r = deepCaption(v, keys); if (r) return r; }
  }
  return null;
}

function objectCaptionNear(txt, idx, id) {
  let attempts = 0;
  for (let start = idx; start >= 0 && start > idx - 12000; start--) {
    if (txt[start] !== '{') continue;
    if (++attempts > 300) break;
    let d = 0, s = false, esc = false, end = -1;
    const stop = Math.min(txt.length, start + 60000);
    for (let j = start; j < stop; j++) {
      const ch = txt[j];
      if (s) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') s = false;
        continue;
      }
      if (ch === '"') s = true;
      else if (ch === '{') d++;
      else if (ch === '}') { d--; if (d === 0) { end = j; break; } }
    }
    if (end < 0) continue;
    const chunk = txt.slice(start, end + 1);
    if (chunk.indexOf(id) === -1) continue;
    try {
      const o = JSON.parse(chunk);
      const cap = deepCaption(o, CAP_KEY_HI) || deepCaption(o, CAP_KEY_LO);
      if (cap) return cap;
    } catch (e) {  }
  }
  return null;
}

function jsonCaptionFrom(txt, id) {
  if (!txt || !id) return null;
  let idx = txt.indexOf(id);
  let occ = 0;
  while (idx !== -1 && occ < 6) {
    occ++;
    const win = txt.slice(Math.max(0, idx - 1000), Math.min(txt.length, idx + 1000));
    const km = win.match(/"(?:message|title|text|caption|description)"\s*:\s*"((?:[^"\\]|\\.)*)"/gi);
    if (km) {
      for (const m of km) {
        const vm = m.match(/:\s*"((?:[^"\\]|\\.)*)"$/);
        if (!vm) continue;
        try {
          const v = JSON.parse('"' + vm[1] + '"');
          if (validCaption(v)) return v;
        } catch (e) {  }
      }
    }
    if (/"(?:message|title|text|caption|description)"/.test(win)) {
      const cap = objectCaptionNear(txt, idx, id);
      if (cap) return cap;
    }
    idx = txt.indexOf(id, idx + id.length);
  }
  return null;
}

let _origFetch = null, _origOpen = null, _origSend = null;

function startNetCapture(sink) {
  if (_origFetch) return;
  _origFetch = window.fetch;
  _origOpen = XMLHttpRequest.prototype.open;
  _origSend = XMLHttpRequest.prototype.send;
  window.fetch = function () {
    const args = arguments;
    const p = _origFetch.apply(this, args);
    p.then(resp => {
      try {
        const url = String((args[0] && args[0].url) || args[0] || '');
        if (/graphql|\/api\//.test(url)) resp.clone().text().then(t => sink(t)).catch(() => { });
      } catch (e) { }
    }).catch(() => { });
    return p;
  };
  XMLHttpRequest.prototype.open = function (m, u) {
    this.__fbdl_u = u;
    return _origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    try {
      if (this.__fbdl_u && /graphql|\/api\//.test(String(this.__fbdl_u))) {
        this.addEventListener('loadend', () => {
          try { if (this.responseText) sink(this.responseText); } catch (e) { }
        });
      }
    } catch (e) { }
    return _origSend.apply(this, arguments);
  };
}

function stopNetCapture() {
  if (_origFetch) window.fetch = _origFetch;
  if (_origOpen) XMLHttpRequest.prototype.open = _origOpen;
  if (_origSend) XMLHttpRequest.prototype.send = _origSend;
  _origFetch = _origOpen = _origSend = null;
}

function idNear(node) {
  let el = node && node.nodeType === 3 ? node.parentElement : node;
  for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
    const links = el.querySelectorAll('a[href*="/videos/"], a[href*="/reel/"], a[href*="/watch/"], a[href*="v="]');
    if (links.length === 1) {
      const id = extractVideoId(links[0].href);
      if (id) return id;
    } else if (links.length > 1) {
      return null;
    }
  }
  return null;
}

function tileTexts(el) {
  const out = [];
  const grab = n => {
    const t = n.tagName === 'IMG'
      ? tidyCaption(n.getAttribute('alt') || '')
      : tidyCaption(n.innerText || n.textContent || '');
    if (t) out.push(t);
  };
  if (el.tagName === 'IMG') grab(el);
  if (el.matches && el.matches('span[dir="auto"], div[dir="auto"], h2, h3, h4')) grab(el);
  for (const n of el.querySelectorAll('span[dir="auto"], div[dir="auto"], h2, h3, h4, img')) grab(n);
  return out;
}

function startObserver(map) {
  const mo = new MutationObserver(recs => {
    for (const rec of recs) {
      if (rec.type === 'attributes') {
        const t = tidyCaption(rec.target.getAttribute(rec.attributeName) || '');
        const id = t && validCaption(t) ? idNear(rec.target) : null;
        if (id && !map[id]) map[id] = t;
        continue;
      }
      for (const n of rec.addedNodes) {
        const id = idNear(n);
        if (!id || map[id]) continue;
        if (n.nodeType === 3) {
          const t = tidyCaption(n.textContent || '');
          if (t && validCaption(t)) map[id] = t;
        } else if (n.nodeType === 1) {
          for (const t of tileTexts(n)) {
            if (validCaption(t)) { map[id] = t; break; }
          }
        }
      }
    }
  });
  mo.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['alt', 'aria-label', 'title'],
  });
  return mo;
}

function mediaTabLink(kind) {
  for (const a of document.querySelectorAll('a[href*="/media/"]')) {
    const h = a.getAttribute('href') || '';
    if (h.indexOf('/media/' + kind) !== -1 && a.getClientRects().length) return a;
  }
  return null;
}

async function switchMediaTab(kind) {
  const link = mediaTabLink(kind);
  if (!link) return false;
  const target = '/media/' + kind;
  const guard = e => {
    const a = e.target && e.target.closest && e.target.closest('a[href*="/media/"]');
    if (a) e.preventDefault();
  };
  document.addEventListener('click', guard, true);
  try {
    fireClick(link);
    const ok = await waitFor(() => location.href.indexOf(target) !== -1, 4000);
    if (ok) { await sleep(800); return true; }
  } finally {
    document.removeEventListener('click', guard, true);
  }
  const link2 = mediaTabLink(kind);
  if (link2) {
    fireClick(link2);
    const ok2 = await waitFor(() => location.href.indexOf(target) !== -1, 4000);
    if (ok2) await sleep(800);
    return !!ok2;
  }
  return false;
}

async function refreshAndWatch(targets, apply, gen) {
  const map = {};
  const sink = txt => {
    for (const r of targets) {
      const id = String(r.id);
      if (!map[id] && /^Video_/.test(r.name)) {
        try {
          const c = jsonCaptionFrom(txt, id);
          if (c) map[id] = c;
        } catch (e) { }
      }
    }
  };
  const mo = startObserver(map);
  startNetCapture(sink);
  try {
    const onVideos = location.href.indexOf('/media/videos') !== -1;
    if (onVideos) {
      const switched = await switchMediaTab('photos');
      if (switched) await switchMediaTab('videos');
    } else {
      await switchMediaTab('videos');
    }
    for (let i = 0; i < 25; i++) {
      if (state.harvestCancel || state.gen !== gen) break;
      for (const [id, cap] of Object.entries(map)) apply(id, cap);
      await sleep(400);
    }
    for (const [id, cap] of Object.entries(map)) apply(id, cap);
  } finally {
    mo.disconnect();
    stopNetCapture();
  }
}

async function harvestCaptions() {
  if (state.harvesting || state.scanning) return;
  const targets = state.results.filter(r => r.type === 'video' && !r._capDone);
  if (!targets.length) return;
  if (targets.every(r => !/^Video_/.test(r.name))) {
    targets.forEach(r => { r._capDone = true; });
    saveState();
    return;
  }
  state.harvesting = true;
  state.harvestCancel = false;
  const gen = state.gen;
  setBusy(true);
  const apply = (id, cap) => {
    const r = state.results.find(x => String(x.id) === String(id));
    if (!r || !cap || !/^Video_/.test(r.name)) return false;
    r.name = uniqueName(cap);
    render();
    return true;
  };
  const pending = () => targets.filter(r => /^Video_/.test(r.name));

  try {
    let pageText = '';
    try { pageText = document.documentElement.outerHTML; } catch (e) { }
    if (pageText) {
      for (const r of pending()) {
        if (state.harvestCancel || state.gen !== gen) break;
        apply(r.id, jsonCaptionFrom(pageText, String(r.id)));
      }
    }

    for (const r of pending()) {
      const link = findTileLink(r);
      if (link) apply(r.id, captionForLink(link));
    }

    if (pending().length && !state.harvestCancel && state.gen === gen) {
      await refreshAndWatch(targets, apply, gen);
    }
  } catch (e) {  }

  const cancelled = state.harvestCancel || state.gen !== gen;
  if (!cancelled) targets.forEach(r => { r._capDone = true; });
  if (state.gen === gen) {
    state.harvestCancel = false;
    state.harvesting = false;
    setBusy(false);
    saveState();
  }
}


document.getElementById('fbdl-box')?.remove();

const box = document.createElement('div');
box.id = 'fbdl-box';
box.style.cssText = 'position:fixed;top:16px;right:16px;width:340px;max-height:calc(100vh - 32px);overflow-y:auto;z-index:999999;background:#101010;color:#f0f0f0;padding:0;border:1px solid #ffffff;border-radius:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;';
box.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(to bottom,#5b9bf5 0%,#1e6df2 50%,#0d47c2 100%);color:#fff;padding:8px 12px;border-bottom:2px solid #082a70;">
    <div><b style="font-size:12px;font-weight:900;letter-spacing:2px;white-space:nowrap;">FB-PRIVATE-DLP BULK</b><br><span style="font-size:10px;color:#d4dcf0;letter-spacing:1px;">Made with &lt;3 by convex17r.</span></div>
    <span style="display:flex;align-items:center;">
      <button id="fbdl-x" title="Close panel" style="background:#fff;color:#e10600;border:none;border-radius:0;cursor:pointer;padding:3px 10px;font-size:14px;font-weight:900;line-height:1;">X</button>
    </span>
  </div>
  <div style="padding:12px 14px;">
  <div style="color:#8a8a8a;font-size:11px;margin-bottom:10px;">Go to <b>Group &rarr; Media &rarr; Videos</b>, then click Scan.</div>

  <button id="fbdl-scan-v" style="width:100%;background:linear-gradient(to bottom,#f2a0a0 0%,#e05858 45%,#c41c1c 50%,#e03030 100%);color:#fff;border:1px solid #5e0a0a;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:10px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,0,0,.55);margin-bottom:10px;">SCAN VIDEOS</button>

  <label style="display:block;margin:4px 0;font-size:14px;font-weight:bold;letter-spacing:1px;color:#2f8fff;">COOKIES SOURCE</label>
  <select id="fbdl-browser" style="width:100%;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;margin-bottom:8px;">
    <option value="cookies.txt">cookies.txt file (keep in download folder)</option>
    <option value="chrome" selected>Chrome (close Chrome before .bat)</option>
    <option value="edge">Edge (close Edge before .bat)</option>
    <option value="firefox">Firefox (no need to close browser)</option>
    <option value="brave">Brave (close Brave before .bat)</option>
    <option value="safari">Safari</option>
    <option value="opera">Opera (close Opera before .bat)</option>
  </select>
  <label style="display:block;margin:4px 0;font-size:14px;font-weight:bold;letter-spacing:1px;color:#2f8fff;">IMPERSONATE AS</label>
  <select id="fbdl-imp" style="width:100%;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;margin-bottom:8px;">
    <option value="firefox" selected>firefox (my choice)</option>
    <option value="chrome">chrome</option>
    <option value="edge">edge</option>
    <option value="safari">safari</option>
    <option value="off">off (not recommended)</option>
  </select>
  <label style="display:block;margin:6px 0;"><input type="checkbox" id="fbdl-aria"> Use aria2c (faster — needs aria2c installed)</label>

  <div style="border-top:3px solid #ffffff;margin:0 -14px;padding:8px 14px 0;font-weight:bold;letter-spacing:1px;">FOUND: <b id="fbdl-count" style="color:#e10600;font-size:20px;">0</b>
    <button id="fbdl-clear" style="float:right;background:linear-gradient(to bottom,#ffffff 0%,#ececec 45%,#d0d0d0 50%,#e6e6e6 100%);color:#111;border:1px solid #555;border-radius:3px;box-shadow:inset 0 1px 0 #fff;cursor:pointer;padding:5px 14px;font-size:13px;font-weight:bold;">CLEAR</button>
  </div>
  <div id="fbdl-list" style="max-height:200px;overflow-y:auto;margin:8px 0;display:flex;flex-direction:column;gap:4px;"></div>
  <div id="fbdl-status" style="color:#b0b3b8;min-height:16px;margin-bottom:8px;">Ready&hellip;</div>
  <button id="fbdl-dl" style="width:100%;background:linear-gradient(to bottom,#bcd8f7 0%,#6fa8ef 45%,#2059c9 50%,#4d8ef2 100%);color:#fff;border:1px solid #0b2a5e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:12px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,20,60,.6);">DOWNLOAD .BAT (yt-dlp)</button>
  <button id="fbdl-copy" style="width:100%;background:linear-gradient(to bottom,#ffffff 0%,#ececec 45%,#d0d0d0 50%,#e6e6e6 100%);color:#111;border:1px solid #555;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),inset 0 1px 0 #fff;padding:8px;cursor:pointer;margin-top:6px;font-weight:bold;">Copy cmd commands</button>
  <div style="border-top:3px solid #ffffff;margin:10px -14px 0;padding:8px 14px 0;">
    <div style="font-size:14px;font-weight:bold;letter-spacing:1px;color:#2f8fff;margin-bottom:4px;">DO FIRST: SETUP COMMANDS <span id="fbdl-oshint">(paste in PowerShell)</span><sup style="color:#e10600;font-size:16px;font-weight:900;">*</sup></div>
    <select id="fbdl-os" style="width:100%;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;margin-bottom:6px;">
      <option value="windows">Windows (PowerShell)</option>
      <option value="macos">macOS (Terminal)</option>
      <option value="linux">Linux (Terminal)</option>
    </select>
    <textarea id="fbdl-setup" readonly rows="5" style="width:100%;box-sizing:border-box;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;font-family:Consolas,monospace;font-size:11px;resize:none;"></textarea>
    <button id="fbdl-setupcopy" style="width:100%;background:linear-gradient(to bottom,#cfe6ff 0%,#80b4f2 45%,#2b6cd4 50%,#5b9bf5 100%);color:#fff;border:1px solid #0b2a5e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:7px;cursor:pointer;margin-top:6px;letter-spacing:1px;font-weight:bold;text-shadow:0 1px 1px rgba(0,20,60,.6);">COPY SETUP COMMANDS</button>
  </div>
  <div style="color:#888;font-size:11px;margin-top:8px;line-height:1.5;"> Use with responsibility, I will not be responsible for misuse. <br>Needs latest yt-dlp.exe. Run installation commands.</div>
  </div>`;
document.body.appendChild(box);

function setStatus(msg, ok) {
  const el = document.getElementById('fbdl-status');
  if (el) { el.textContent = msg; el.style.color = ok === true ? '#31a24c' : ok === false ? '#ff6b6b' : '#b0b3b8'; }
}

function render() {
  const c = document.getElementById('fbdl-count');
  if (c) c.textContent = state.results.length;
  const list = document.getElementById('fbdl-list');
  if (!list) return;
  list.innerHTML = '';
  state.results.forEach((r, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;background:linear-gradient(to bottom,#f2a0a0 0%,#e05858 45%,#c41c1c 50%,#e03030 100%);border:1px solid #5e0a0a;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:5px 6px;';
    const badge = document.createElement('span');
    badge.textContent = i + 1;
    badge.style.cssText = 'background:linear-gradient(to bottom,#ffffff 0%,#dcdcdc 100%);color:' + (i % 2 ? '#1a6ff5' : '#e10600') + ';border:1px solid #555;border-radius:3px;font-weight:900;font-size:12px;padding:2px 8px;flex-shrink:0;';
    const name = document.createElement('input');
    name.value = r.name; name.title = r.url;
    name.style.cssText = 'flex:1;background:transparent;border:none;color:#fff;font-size:12px;font-weight:bold;text-shadow:0 1px 1px rgba(0,0,0,.55);min-width:0;';
    name.onchange = () => { r.name = uniqueName(name.value); name.value = r.name; saveState(); };
    const del = document.createElement('button');
    del.textContent = 'X'; del.title = r.url;
    del.style.cssText = 'background:#fff;color:#e10600;border:1px solid #5e0a0a;border-radius:3px;cursor:pointer;font-size:11px;font-weight:900;padding:2px 7px;flex-shrink:0;';
    del.onclick = () => { state.results.splice(i, 1); render(); };
    row.append(badge, name, del);
    list.appendChild(row);
  });
  saveState();
}
render();

function detectBrowser() {
  const ua = navigator.userAgent || '';
  if (/Firefox\//i.test(ua) && !/Seamonkey/i.test(ua)) return 'firefox';
  if (/Edg(e|A|iOS)?\//i.test(ua)) return 'edge';
  if (/\bOPR\/|Opera/i.test(ua)) return 'opera';
  if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) return 'safari';
  return 'chrome';
}
function setCookieBrowser(v) {
  const s = document.getElementById('fbdl-browser');
  if (s && Array.from(s.options).some(o => o.value === v)) s.value = v;
}
setCookieBrowser(detectBrowser());
try {
  if (navigator.brave && navigator.brave.isBrave) {
    navigator.brave.isBrave().then(yes => { if (yes) setCookieBrowser('brave'); }).catch(() => {});
  }
} catch (e) { }

const SETUP_CMDS = {
  windows: 'winget install -e --id yt-dlp.yt-dlp\nwinget install -e --id Gyan.FFmpeg\nwinget install -e --id aria2.aria2',
  macos: '# Requires Homebrew (https://brew.sh)\nbrew install yt-dlp ffmpeg aria2',
  linux: 'sudo apt update && sudo apt install -y yt-dlp ffmpeg aria2'
};
const SETUP_HINTS = { windows: '(paste in PowerShell)', macos: '(paste in Terminal)', linux: '(paste in Terminal)' };
function applySetupOS(os) {
  if (!SETUP_CMDS[os]) return;
  const t = document.getElementById('fbdl-setup');
  if (t) t.value = SETUP_CMDS[os];
  const h = document.getElementById('fbdl-oshint');
  if (h) h.textContent = SETUP_HINTS[os];
  const s = document.getElementById('fbdl-os');
  if (s) s.value = os;
}
function detectOS() {
  const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  if (/mac/i.test(p)) return 'macos';
  if (/linux|android/i.test(p)) return 'linux';
  const ua = navigator.userAgent || '';
  if (/Mac OS X/i.test(ua)) return 'macos';
  if (/Linux|Android/i.test(ua)) return 'linux';
  return 'windows';
}
applySetupOS(detectOS());
document.getElementById('fbdl-os').onchange = e => applySetupOS(e.target.value);


function buildCommands() {
  const browser = document.getElementById('fbdl-browser')?.value || 'chrome';
  const impersonate = document.getElementById('fbdl-imp')?.value || 'firefox';
  const useAria = document.getElementById('fbdl-aria')?.checked;
  const useCookieFile = browser === 'cookies.txt';
  const cookiePart = useCookieFile ? '--cookies "cookies.txt"' : `--cookies-from-browser ${browser}`;
  const impPart = impersonate && impersonate !== 'off' ? `--impersonate ${impersonate}` : '';

  const L = [
    '@echo off',
    'chcp 65001 >nul',
    'setlocal DisableDelayedExpansion',
    'cd /d "%~dp0"',
    'set "PATH=%LOCALAPPDATA%\\Microsoft\\WinGet\\Links;%PATH%"',
    'set "YTDLP_DL=-N 4 --concurrent-fragments 4"',
    'echo ===============================================',
    'echo  fb-private-dlp BULK - Facebook media download',
    'echo ===============================================',
    'echo.',
    'where yt-dlp >nul 2>nul',
    'if not exist "yt-dlp.exe" if errorlevel 1 (',
    '  echo [ERROR] yt-dlp.exe not found in this folder.',
    '  echo Download it from https://github.com/yt-dlp/yt-dlp/releases and place it here.',
    '  echo.',
    '  pause',
    '  exit /b 1',
    ')',
  ];
  if (useCookieFile) {
    L.push(
      'if not exist "cookies.txt" (',
      '  echo [WARN] cookies.txt not found - private media will fail.',
      '  echo Export it with "Get cookies.txt LOCALLY" for facebook.com.',
      '  echo.',
      ')'
    );
  } else if (browser === 'chrome' || browser === 'edge' || browser === 'brave') {
    L.push(`echo NOTE: close ${browser} before running, or cookies cannot be read.`, 'echo.');
  }
  if (useAria) {
    L.push(
      'where aria2c >nul 2>nul',
      'if errorlevel 1 if not exist "aria2c.exe" goto aria2c_missing',
      'set "YTDLP_DL=--downloader aria2c --downloader-args "aria2c:-c -j16 -x16 -s16 -k1M""',
      'goto aria2c_ok',
      ':aria2c_missing',
      'echo [WARN] aria2c not found - using the built-in downloader instead.',
      'echo Install it with: winget install -e --id aria2.aria2, then run this .bat again.',
      'echo.',
      ':aria2c_ok'
    );
  }
  if (impPart) {
    L.push(`echo Using browser impersonation: ${impersonate} [requires latest yt-dlp].`, 'echo.');
  } else {
    L.push('echo WARNING: impersonation is OFF - Facebook may fail with parse errors.', 'echo.');
  }
  L.push('echo.');

  state.results.forEach((r, i) => {
    const safe = batEchoSafe(r.name);
    L.push(
      `echo [${i + 1}/${state.results.length}] ${safe}`,
      `yt-dlp ${cookiePart}${impPart ? ' ' + impPart : ''} --no-playlist --retries 10 --fragment-retries 10 --sleep-requests 1 %YTDLP_DL% -f "bv*+ba/b" --merge-output-format mp4 -o "${r.name}.mp4" "${r.url}"`,
      `if errorlevel 1 (echo   FAILED: ${safe}) else (echo   DONE: ${safe})`,
      'echo.'
    );
  });
  L.push('echo All finished!', 'pause', 'endlocal');
  return L.join('\r\n');
}

function downloadBat() {
  if (!state.results.length) { alert("Scan first — no media found yet!"); return; }
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const blob = new Blob(['\uFEFF' + buildCommands()], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fb-private-dlp-bulk_${stamp}.bat`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`Downloaded: ${a.download}`, true);
}

document.getElementById('fbdl-scan-v').onclick = scanVideos;
document.getElementById('fbdl-dl').onclick = downloadBat;
document.getElementById('fbdl-copy').onclick = async () => {
  if (!state.results.length) { alert("Scan first — no media found yet!"); return; }
  try { await navigator.clipboard.writeText(buildCommands()); setStatus('Commands copied!', true); }
  catch { setStatus('Copy blocked by browser.', false); }
};
document.getElementById('fbdl-clear').onclick = () => {
  if (state.harvesting) { state.harvestCancel = true; setStatus('Stopping after current video…'); return; }
  state.results = []; render(); setStatus('Cleared.');
};
document.getElementById('fbdl-setupcopy').onclick = async () => {
  try { await navigator.clipboard.writeText(document.getElementById('fbdl-setup').value); setStatus('Setup commands copied!', true); }
  catch { setStatus('Copy blocked by browser.', false); }
};
document.getElementById('fbdl-x').onclick = () => window.__fbBulk_cleanup();

window.__fbBulk_cleanup = () => {
  state.harvestCancel = true;
  document.getElementById('fbdl-box')?.remove();
  window.__fbBulk_cleanup = null;
};

}


const __fbdlSetupCmds = {
  windows: 'winget install -e --id yt-dlp.yt-dlp\nwinget install -e --id Gyan.FFmpeg\nwinget install -e --id aria2.aria2',
  macos: '# Requires Homebrew (https://brew.sh)\nbrew install yt-dlp ffmpeg aria2',
  linux: 'sudo apt update && sudo apt install -y yt-dlp ffmpeg aria2'
};

function __fbdlDetectOS() {
  try {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/mac/i.test(p)) return 'macos';
    if (/linux|android/i.test(p)) return 'linux';
    const ua = navigator.userAgent || '';
    if (/Mac OS X/i.test(ua)) return 'macos';
    if (/Linux|Android/i.test(ua)) return 'linux';
  } catch (e) { }
  return 'windows';
}

function __fbdlApplySetup(os) {
  if (!__fbdlSetupCmds[os]) return;
  const t = document.getElementById('fbdl-setup');
  if (t) t.value = __fbdlSetupCmds[os];
  const h = document.getElementById('fbdl-oshint');
  if (h) h.textContent = os === 'windows' ? '(paste in PowerShell)' : '(paste in Terminal)';
  const s = document.getElementById('fbdl-os');
  if (s) s.value = os;
}

function __fbdlTeardown() {
  try { if (window.__fbDL_cleanup) window.__fbDL_cleanup(); } catch (e) { }
  try { if (window.__fbBulk_cleanup) window.__fbBulk_cleanup(); } catch (e) { }
  try { document.getElementById('fbdl-picker')?.remove(); } catch (e) { }
  try { document.getElementById('fbdl-box')?.remove(); } catch (e) { }
}

function __fbdlBackButton() {
  try {
    if (document.getElementById('fbdl-modes')) return;
    const x = document.getElementById('fbdl-x');
    if (!x || !x.parentElement || !x.parentElement.insertBefore) return;
    const b = document.createElement('button');
    b.id = 'fbdl-modes';
    b.title = 'Switch mode';
    b.style.cssText = 'background:#fff;color:#0d47c2;border:none;border-radius:0;cursor:pointer;padding:3px 8px;font-size:12px;font-weight:900;line-height:1;margin-right:6px;';
    b.textContent = '≡';
    b.onclick = () => __fbdlShowPicker();
    x.parentElement.insertBefore(b, x);
  } catch (e) { }
}

function __fbdlStripSetup() {
  try {
    const s = document.getElementById('fbdl-setup');
    const blk = (s && s.closest) ? s.closest('div') : null;
    if (blk && blk.remove) blk.remove();
  } catch (e) { }
  for (const id of ['fbdl-setup', 'fbdl-os', 'fbdl-setupcopy', 'fbdl-oshint']) {
    try { document.getElementById(id)?.remove(); } catch (e) { }
  }
}

function __fbdlLoadMode(which) {
  __fbdlTeardown();
  if (which === 'click') {
    __fbdlRunClick();
    try {
      const t = document.querySelector('#fbdl-box b');
      if (t) t.textContent = 'FB-PRIVATE-DLP CLICK';
    } catch (e) { }
    try { document.getElementById('fbdl-help')?.remove(); } catch (e) { }
  } else {
    __fbdlRunBulk();
  }
  __fbdlStripSetup();
  __fbdlBackButton();
}

function __fbdlShowPicker() {
  __fbdlTeardown();
  const box = document.createElement('div');
  box.id = 'fbdl-picker';
  box.style.cssText = 'position:fixed;top:16px;right:16px;width:340px;z-index:999999;background:#101010;color:#f0f0f0;padding:0;border:1px solid #ffffff;border-radius:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;';
  box.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(to bottom,#5b9bf5 0%,#1e6df2 50%,#0d47c2 100%);color:#fff;padding:8px 12px;border-bottom:2px solid #082a70;">
    <div><b style="font-size:12px;font-weight:900;letter-spacing:2px;white-space:nowrap;">FB-PRIVATE-DLP</b><br><span style="font-size:10px;color:#d4dcf0;letter-spacing:1px;">Made with &lt;3 by convex17r.</span></div>
    <span style="display:flex;align-items:center;">
      <button id="fbdl-picker-help" title="Watch tutorial video" style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(to bottom,#ff7a7a 0%,#e02020 42%,#a80000 58%,#d41414 100%);color:#fff;border:2px solid #d7d7d7;border-radius:20px;box-shadow:inset 0 1px 2px rgba(255,255,255,.85),inset 0 -2px 3px rgba(0,0,0,.45);cursor:pointer;padding:3px 12px 3px 9px;font-size:11px;font-weight:900;letter-spacing:1px;margin-right:6px;text-shadow:0 1px 2px rgba(0,0,0,.65);"><span style="display:inline-block;width:0;height:0;border-left:10px solid #fff;border-top:6px solid transparent;border-bottom:6px solid transparent;filter:drop-shadow(0 1px 1px rgba(0,0,0,.65));"></span>Play video</button>
      <button id="fbdl-picker-x" title="Close" style="background:#fff;color:#e10600;border:none;border-radius:0;cursor:pointer;padding:3px 10px;font-size:14px;font-weight:900;line-height:1;">X</button>
    </span>
  </div>
  <div style="padding:12px 14px;">
  <div style="color:#8a8a8a;font-size:11px;margin-bottom:10px;">Choose a capture mode — Either CLICK or BULK Mode.</div>
  <button id="fbdl-mode-click" style="width:100%;background:linear-gradient(to bottom,#f2a0a0 0%,#e05858 45%,#c41c1c 50%,#e03030 100%);color:#fff;border:1px solid #5e0a0a;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:10px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,0,0,.55);margin-bottom:4px;">CLICK MODE</button>
  <div style="color:#8a8a8a;font-size:11px;margin-bottom:10px;">Click Play on each video — for downloading selective feed media.</div>
  <button id="fbdl-mode-bulk" style="width:100%;background:linear-gradient(to bottom,#bcd8f7 0%,#6fa8ef 45%,#2059c9 50%,#4d8ef2 100%);color:#fff;border:1px solid #0b2a5e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:10px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,20,60,.6);margin-bottom:4px;">BULK MODE</button>
  <div style="color:#8a8a8a;font-size:11px;margin-bottom:4px;">Auto-scan the FB Media Tab — for downloading all videos.</div>
  <div style="border-top:3px solid #ffffff;margin:10px -14px 0;padding:8px 14px 0;">
    <div style="font-size:14px;font-weight:bold;letter-spacing:1px;color:#2f8fff;margin-bottom:4px;">DO FIRST: SETUP COMMANDS <span id="fbdl-oshint">(paste in PowerShell)</span><sup style="color:#e10600;font-size:16px;font-weight:900;">*</sup></div>
    <select id="fbdl-os" style="width:100%;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;margin-bottom:6px;">
      <option value="windows">Windows (PowerShell)</option>
      <option value="macos">macOS (Terminal)</option>
      <option value="linux">Linux (Terminal)</option>
    </select>
    <textarea id="fbdl-setup" readonly rows="5" style="width:100%;box-sizing:border-box;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;font-family:Consolas,monospace;font-size:11px;resize:none;"></textarea>
    <button id="fbdl-setupcopy" style="width:100%;background:linear-gradient(to bottom,#cfe6ff 0%,#80b4f2 45%,#2b6cd4 50%,#5b9bf5 100%);color:#fff;border:1px solid #0b2a5e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:7px;cursor:pointer;margin-top:6px;letter-spacing:1px;font-weight:bold;text-shadow:0 1px 1px rgba(0,20,60,.6);">COPY SETUP COMMANDS</button>
  </div>
  <div style="color:#888;font-size:11px;margin-top:8px;line-height:1.5;"> Use with responsibility, I will not be responsible for misuse. <br>Needs latest yt-dlp.exe. Run installation commands.</div>
  </div>`;
  document.body.appendChild(box);
  document.getElementById('fbdl-picker-x').onclick = () => {
    try { document.getElementById('fbdl-picker')?.remove(); } catch (e) { }
  };
  document.getElementById('fbdl-picker-help').onclick = () => window.open('https://www.youtube.com/watch?v=xxxxxxxxx', '_blank');
  document.getElementById('fbdl-mode-click').onclick = () => __fbdlLoadMode('click');
  document.getElementById('fbdl-mode-bulk').onclick = () => __fbdlLoadMode('bulk');
  __fbdlApplySetup(__fbdlDetectOS());
  document.getElementById('fbdl-os').onchange = e => __fbdlApplySetup(e.target.value);
  document.getElementById('fbdl-setupcopy').onclick = async () => {
    try { await navigator.clipboard.writeText(document.getElementById('fbdl-setup').value); }
    catch (e) {  }
  };
}

__fbdlShowPicker();
})();
