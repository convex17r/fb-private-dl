(function () {
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
  return cleanText(s).replace(/[&|<>^%!"]/g, '').slice(0, 120) || 'video';
}

function extractVideoId(url) {
  if (!url) return null;
  if (/facebook\.com\/groups\/\d+\/?(?:[?#].*)?$/.test(url)) return null;
  let m = url.match(/facebook\.com\/reel\/(\d+)/i)
       || url.match(/facebook\.com\/(?:groups\/\d+\/)?videos?\/(\d+)/i)
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
  <label style="display:block;margin:6px 0;"><input type="checkbox" id="fbdl-aria"> Use aria2c (needs aria2c.exe, faster)</label>
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
  <div style="color:#888;font-size:11px;margin-top:8px;line-height:1.5;">cookies.txt: install “Get cookies.txt LOCALLY”, export facebook.com, save next to the .bat.<br>Needs latest yt-dlp.exe. Run above commands.</div>
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
  const dlPart = useAria
    ? '--downloader aria2c --downloader-args "aria2c:-c -j16 -x16 -s16 -k1M"'
    : '-N 4 --concurrent-fragments 4';

  const L = [
    '@echo off',
    'chcp 65001 >nul',
    'setlocal DisableDelayedExpansion',
    'cd /d "%~dp0"',
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
      'if not exist "aria2c.exe" (',
      '  echo [ERROR] aria2c.exe not found but aria2c mode is on.',
      '  echo Either untick aria2c and re-download the .bat, or add aria2c.exe here.',
      '  pause',
      '  exit /b 1',
      ')'
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
      `yt-dlp ${cookiePart}${impPart ? ' ' + impPart : ''} --no-playlist --retries 10 --fragment-retries 10 --sleep-requests 1 ${dlPart} -f "bv*+ba/b" --merge-output-format mp4 -o "${r.name}.mp4" "${r.url}"`,
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

})();
