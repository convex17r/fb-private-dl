(function () {
'use strict';
if (window.__fbImgBulk_cleanup) window.__fbImgBulk_cleanup();
window.__fbImgBulk = window.__fbImgBulk || { results: [] };
const state = window.__fbImgBulk;
state.results = [];
state.batPrefix = 'fb-private-dlp-img';
const TUTORIAL_URL = 'https://www.youtube.com/watch?v=xxxxxxxxx';
state.kind = null;
state.scanning = false;
state._cancel = false;
state.gen = (state.gen || 0) + 1;
const gen = state.gen;
console.clear();
console.log('%cfb-private-dlp IMG loaded. Pick what you are downloading from.', 'color:#e10600;font-weight:bold');
function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function extractPhotoId(url) {
  if (!url) return null;
  const u = String(url);
  let m = u.match(/[?&]fbid=(\d{5,})/)
       || u.match(/["']?fbid["']?\s*[:=]\s*["']?(\d{5,})/)
       || u.match(/[?&]photo_id=(\d{5,})/i)
       || u.match(/["']?photo_id["']?\s*[:=]\s*["']?(\d{5,})/i)
       || u.match(/facebook\.com\/[^/?#]+\/photos\/(?:[^/?#]+\/)?(\d{5,})/);
  if (m) return m[1];
  m = u.match(/\/photos\/(?:[^/?#]+\/)?(\d{5,})(?:[/?#]|$)/);
  return m ? m[1] : null;
}
function canonicalPhotoUrl(id) {
  return 'https://www.facebook.com/photo/?fbid=' + id;
}
function setStatus(msg, ok) {
  const el = document.getElementById('fbdl-status');
  if (el) { el.textContent = msg; el.style.color = ok === true ? '#31a24c' : ok === false ? '#ff6b6b' : '#b0b3b8'; }
}
function renderList() {
  const c = document.getElementById('fbdl-count');
  if (c) c.textContent = state.results.length;
  const list = document.getElementById('fbdl-list');
  if (!list) return;
  list.innerHTML = '';
  state.results.forEach((r, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;background:linear-gradient(to bottom,#f2a0a0 0%,#e05858 45%,#c41c1c 50%,#e03030 100%);border:1px solid #5e0a0a;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:5px 6px;';
    const badge = document.createElement('span');
    badge.textContent = r.type === 'gallery' ? '|||' : String(i + 1);
    badge.style.cssText = 'background:linear-gradient(to bottom,#ffffff 0%,#dcdcdc 100%);color:' + (i % 2 ? '#1a6ff5' : '#e10600') + ';border:1px solid #555;border-radius:3px;font-weight:900;font-size:12px;padding:2px 8px;flex-shrink:0;';
    const name = document.createElement('input');
    name.value = r.name; name.title = r.url;
    name.style.cssText = 'flex:1;background:transparent;border:none;color:#fff;font-size:12px;font-weight:bold;text-shadow:0 1px 1px rgba(0,0,0,.55);min-width:0;';
    name.onchange = () => { r.name = cleanText(name.value) || r.name; name.value = r.name; };
    const del = document.createElement('button');
    del.textContent = 'X'; del.title = r.url;
    del.style.cssText = 'background:#fff;color:#e10600;border:1px solid #5e0a0a;border-radius:3px;cursor:pointer;font-size:11px;font-weight:900;padding:2px 7px;flex-shrink:0;';
    del.onclick = () => { state.results.splice(i, 1); renderList(); };
    row.append(badge, name, del);
    list.appendChild(row);
  });
}
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
function autoDetectBrowser() {
  setCookieBrowser(detectBrowser());
  try {
    if (navigator.brave && navigator.brave.isBrave) {
      navigator.brave.isBrave().then(yes => { if (yes) setCookieBrowser('brave'); }).catch(() => { });
    }
  } catch (e) { }
}
function detectOS() {
  let p = '';
  try { p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || ''; } catch (e) { }
  if (/^Mac/i.test(p) || /Mac OS X|Macintosh|Darwin/i.test(p)) return 'mac';
  if (/^Lin/i.test(p) || /^X11/i.test(p) || /CrOS|Linux/i.test(p)) return 'linux';
  return 'windows';
}
function isWin() { return detectOS() === 'windows'; }
function scriptExt() { const o = detectOS(); return o === 'windows' ? '.bat' : o === 'mac' ? '.command' : '.sh'; }
function scriptLabel() { const o = detectOS(); return o === 'windows' ? '.BAT' : o === 'mac' ? '.COMMAND' : '.SH'; }
function buildBat(results) {
  return isWin() ? buildBatWin(results) : buildShell(results);
}
function buildBatWin(results) {
  const browser = (document.getElementById('fbdl-browser') || {}).value || 'chrome';
  const useCookieFile = browser === 'cookies.txt';
  const cookiePart = useCookieFile ? '--cookies "cookies.txt"' : `--cookies-from-browser ${browser}`;
  const L = [
    '@echo off',
    'chcp 65001 >nul',
    'setlocal DisableDelayedExpansion',
    'cd /d "%~dp0"',
    'set "PATH=%LOCALAPPDATA%\\Microsoft\\WinGet\\Links;%PATH%"',
    'where gallery-dl >nul 2>nul',
    'if errorlevel 1 if not exist "gallery-dl.exe" (',
    '  echo [ERROR] gallery-dl not found in this folder or in PATH.',
    '  echo Install it with: winget install -e --id mikf.gallery-dl',
    '  echo Or download: https://github.com/mikf/gallery-dl/releases',
    '  echo.',
    '  pause',
    '  exit /b 1',
    ')',
  ];
  if (useCookieFile) {
    L.push(
      'if not exist "cookies.txt" (',
      '  echo [WARN] cookies.txt not found - private photos will fail.',
      '  echo Export it with "Get cookies.txt LOCALLY" for facebook.com.',
      '  echo.',
      ')'
    );
  }
  L.push(`echo Downloading ${results.length} photos...`, 'echo.');
  const urls = results.map(r => `"${r.url}"`);
  for (let i = 0; i < urls.length; i += 50) {
    L.push(`gallery-dl ${cookiePart} --sleep-request 1 --download-archive "fb-img-archive.txt" -d "." -f "{id}.{extension}" ${urls.slice(i, i + 50).join(' ')}`);
  }
  L.push('echo All finished!', 'pause', 'endlocal');
  return L.join('\r\n');
}
function buildShell(results) {
  const browser = (document.getElementById('fbdl-browser') || {}).value || 'chrome';
  const useCookieFile = browser === 'cookies.txt';
  const cookiePart = useCookieFile ? '--cookies "cookies.txt"' : `--cookies-from-browser ${browser}`;
  const L = [
    '#!/usr/bin/env bash',
    '# fb-private-dlp-img',
    'set -u',
    'cd "$(dirname "$0")"',
    'export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"',
    '',
    'if ! command -v gallery-dl >/dev/null 2>&1; then',
    '  echo "[ERROR] gallery-dl not found in PATH."',
    '  echo "Install it with: brew install gallery-dl   (macOS)"',
    '  echo "            or : python3 -m pip install --user gallery-dl   (Linux/macOS)"',
    '  exit 1',
    'fi',
  ];
  if (useCookieFile) {
    L.push(
      'if [ ! -f cookies.txt ]; then',
      '  echo "[WARN] cookies.txt not found - private photos will fail."',
      '  echo \'Export it with "Get cookies.txt LOCALLY" for facebook.com.\'',
      'fi'
    );
  }
  L.push(`echo "Downloading ${results.length} photos..."`);
  const urls = results.map(r => `"${r.url}"`);
  for (let i = 0; i < urls.length; i += 50) {
    L.push(`gallery-dl ${cookiePart} --sleep-request 1 --download-archive "fb-img-archive.txt" -d "." -f "{id}.{extension}" ${urls.slice(i, i + 50).join(' ')}`);
  }
  L.push('echo "All finished!"');
  return L.join('\n');
}
function galleryMissing() {
  return (state.kind === 'page' || state.kind === 'profile') && !state.results.some(r => r.type === 'gallery');
}
function fileSlug(s) {
  const t = cleanText(s).replace(/[/\\]+/g, '-').replace(/[:?"*<>|]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return t.slice(0, 60).replace(/-+$/g, '') || null;
}
function targetSlug() {
  const seen = [];
  for (const r of state.results) {
    if (r.type !== 'gallery') continue;
    const s = fileSlug(String(r.name).replace(/^FULL GALLERY - /i, ''));
    if (s && seen.indexOf(s) === -1) seen.push(s);
  }
  if (seen.length) return seen.join('_').slice(0, 80).replace(/-+$/g, '');
  try {
    const seg = (location.pathname || '').split('/').filter(Boolean);
    if (seg[0] && seg[0].toLowerCase() === 'groups' && seg[1]) return fileSlug('groups-' + seg[1]) || 'group-photos';
    if (seg[0]) {
      const s = fileSlug(decodeURIComponent(seg[0]));
      if (s) return s;
    }
  } catch (e) { }
  try {
    const s = fileSlug((document.title || '').replace(/\s*\|\s*Facebook\s*$/i, ''));
    if (s) return s;
  } catch (e) { }
  return state.kind || 'photos';
}
function downloadBat(emptyMsg) {
  if (!state.results.length) { alert(emptyMsg); return; }
  if (galleryMissing()) {
    alert('Profile or page URL is required. Click Extract Album first.');
    setStatus('Profile or page URL is required — click Extract Album.', false);
    return;
  }
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const win = isWin();
  const text = buildBat(state.results);
  const blob = new Blob([win ? '\uFEFF' + text : text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.batPrefix}_${targetSlug()}_${stamp}${scriptExt()}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus('Downloaded: ' + a.download, true);
}
function wireCommonButtons(emptyMsg) {
  const dl = document.getElementById('fbdl-dl');
  if (dl) dl.onclick = () => downloadBat(emptyMsg);
  const copy = document.getElementById('fbdl-copy');
  if (copy) copy.onclick = async () => {
    if (!state.results.length) { alert(emptyMsg); return; }
    if (galleryMissing()) { alert('Profile or page URL is required. Click Extract Album first.'); return; }
    try { await navigator.clipboard.writeText(buildBat(state.results)); setStatus('Commands copied!', true); }
    catch (e) { setStatus('Copy blocked by browser.', false); }
  };
  const clear = document.getElementById('fbdl-clear');
  if (clear) clear.onclick = () => { state.results = []; renderList(); setStatus('Cleared.'); };
  autoDetectBrowser();
}
function detectGalleryUrl() {
  try {
    const seg = (location.pathname || '').split('/').filter(Boolean);
    if (!seg.length) return '';
    const first = decodeURIComponent(seg[0]);
    if (first.toLowerCase() === 'profile.php') {
      const idm = (location.search || '').match(/[?&]id=(\d+)/);
      if (idm) return 'https://www.facebook.com/profile.php?id=' + idm[1];
      return '';
    }
    const BAD = ['groups', 'watch', 'photo', 'photos', 'reel', 'reels', 'videos', 'marketplace',
      'gaming', 'my', 'friends', 'messages', 'notifications', 'settings', 'menu', 'help',
      'login', 'logout', 'privacy', 'terms', 'people', 'pages', 'events', 'communities',
      'jobs', 'live', 'ads', 'fundraisers', 'plugins', 'share', 'story.php', 'permalink.php',
      'posts', 'media', 'search', 'hashtag', 'saved', 'memories', 'orders', 'p', 'r',
      'video.php', 'dialog', 'ajax'];
    if (BAD.indexOf(first.toLowerCase()) !== -1) return '';
    if (!/^[A-Za-z0-9._-]+$/.test(first)) return '';
    return `https://www.facebook.com/${first}`;
  } catch (e) { return ''; }
}
function readGalleryInput() {
  const v = (document.getElementById('fbdl-gallery')?.value || '').trim();
  if (!/^(https?:\/\/)?([\w-]+\.)?facebook\.com\//i.test(v)) return null;
  const url = /^https?:\/\//i.test(v) ? v : 'https://' + v;
  const pm = url.match(/profile\.php\?id=(\d+)/i);
  if (pm) return 'https://www.facebook.com/profile.php?id=' + pm[1];
  const um = url.match(/facebook\.com\/([A-Za-z0-9._-]+)(?:[\/?#]|$)/i);
  if (um) {
    const BAD = ['groups', 'watch', 'photo', 'photos', 'reel', 'reels', 'videos', 'video.php', 'permalink.php', 'posts', 'share', 'story.php', 'profile.php', 'people', 'dialog', 'ajax', 'marketplace', 'pages', 'events'];
    if (BAD.indexOf(um[1].toLowerCase()) === -1) return 'https://www.facebook.com/' + um[1];
  }
  return null;
}
function galleryLabel(url) {
  const pm = url.match(/profile\.php\?id=(\d+)/i);
  if (pm) return 'profile-' + pm[1];
  const um = url.match(/facebook\.com\/([A-Za-z0-9._-]+)\/?$/i);
  if (um) return um[1];
  return url.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '');
}
function albumsUrl(url) {
  const pm = url.match(/profile\.php\?id=(\d+)/i);
  if (pm) return 'https://www.facebook.com/' + pm[1] + '/photos_albums';
  const um = url.match(/facebook\.com\/([A-Za-z0-9._-]+)\/?$/i);
  if (um) return 'https://www.facebook.com/' + um[1] + '/photos_albums';
  return null;
}
function addOneGallery(url, label) {
  if (state.results.some(r => r.type === 'gallery' && r.url === url)) return false;
  state.results.unshift({ id: 'gallery:' + url, url, name: `FULL GALLERY - ${label}`, type: 'gallery' });
  return true;
}
function addGalleryEntry(url) {
  addOneGallery(url, galleryLabel(url));
  const ab = albumsUrl(url);
  if (document.getElementById('fbdl-cover')?.checked) {
    if (ab) addOneGallery(ab, galleryLabel(url) + '-albums');
  } else if (ab) {
    state.results = state.results.filter(r => r.url !== ab);
  }
  renderList();
  return true;
}
function harvestPhotos() {
  let added = 0;
  const seen = new Set();
  const tryAdd = (url) => {
    const id = extractPhotoId(url);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    if (state.results.some(r => r.id === id)) return false;
    state.results.push({ id, url: canonicalPhotoUrl(id), name: id, type: 'photo' });
    added++;
    return true;
  };
  for (const a of document.querySelectorAll('a[href*="fbid="], a[href*="photo.php"], a[href*="/photos/"], a[href*="/photo/?"]')) {
    tryAdd(a.href);
  }
  for (const el of document.querySelectorAll('[data-store], [data-ajaxify], [data-href], [data-uri]')) {
    for (const attr of ['data-store', 'data-ajaxify', 'data-href', 'data-uri']) {
      const val = el.getAttribute(attr);
      if (val && (val.indexOf('fbid') !== -1 || val.indexOf('photo_id') !== -1)) tryAdd(val);
    }
  }
  return added;
}
async function autoScroll(maxRounds = 200, stableNeed = 3) {
  let prevH = 0, prevN = 0, stable = 0;
  for (let i = 0; i < maxRounds; i++) {
    if (state._cancel || state.gen !== gen) break;
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(900);
    harvestPhotos();
    renderList();
    setStatus(`Auto-scrolling… ${state.results.length} photos scanned so far.`);
    const curH = document.body.scrollHeight;
    const curN = document.querySelectorAll('a[href*="fbid="], a[href*="photo.php"], a[href*="/photos/"], a[href*="/photo/?"]').length;
    if (curH === prevH && curN === prevN) {
      stable++;
      if (stable >= stableNeed) break;
    } else {
      stable = 0;
      prevH = curH;
      prevN = curN;
    }
  }
  window.scrollTo(0, 0);
  await sleep(1500);
  harvestPhotos();
  renderList();
}
function setBusy(busy) {
  const b = document.getElementById('fbdl-scan-i');
  if (b) { b.disabled = busy; b.style.opacity = busy ? '.6' : ''; }
  const s = document.getElementById('fbdl-stop-i');
  if (s) s.style.display = busy ? '' : 'none';
}
async function scanPhotos() {
  if (state.scanning) return;
  if (state.kind === 'page' || state.kind === 'profile') {
    const url = readGalleryInput();
    if (!url) {
      setStatus('Paste the page or profile URL above first.', false);
      alert('Profile or page URL is required. Paste it above, then click Extract Album.');
      return;
    }
    const exists = state.results.some(r => r.type === 'gallery' && r.url === url);
    addGalleryEntry(url);
    setStatus(exists ? 'Album is already in the list.' : 'Album added — extract another or download.', true);
    return;
  }
  state.scanning = true;
  state._cancel = false;
  setBusy(true);
  setStatus('Auto-scrolling to load all photos… (STOP SCAN keeps what is loaded so far)');
  const before = state.results.length;
  await autoScroll();
  const stopped = state._cancel;
  if (state.gen !== gen) { state.scanning = false; setBusy(false); return; }
  setStatus(stopped ? 'Stopped — collecting loaded photos…' : 'Scanning photo links…');
  let added = (state.results.length - before) + harvestPhotos();
  if (added === 0) {
    setStatus('No links found — scanning raw page content…');
    const seen = new Set();
    const tryAdd = (url) => {
      const id = extractPhotoId(url);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      if (state.results.some(r => r.id === id)) return false;
      state.results.push({ id, url: canonicalPhotoUrl(id), name: id, type: 'photo' });
      added++;
      return true;
    };
    const html = document.body.innerHTML;
    for (const re of [
      /fbid=(\d{6,})/g,
      /facebook\.com\/[^"'<>\\]*?\/photos\/(\d{6,})/g,
      /"(?:photo_id|photoID)"\s*:\s*"(\d{6,})"/g,
    ]) {
      let m;
      while ((m = re.exec(html)) !== null) tryAdd(`https://www.facebook.com/photo/?fbid=${m[1]}`);
    }
  }
  renderList();
  setStatus(
    added > 0
      ? `${stopped ? 'Stopped early — kept' : 'Found'} ${added} new photos (${state.results.length} total).`
      : `Found 0 photos — make sure you're on Group → Media → Photos tab.`,
    added > 0
  );
  state.scanning = false;
  setBusy(false);
}
function teardown() {
  try { document.getElementById('fbdl-picker')?.remove(); } catch (e) { }
  try { document.getElementById('fbdl-box')?.remove(); } catch (e) { }
}
function showPicker() {
  teardown();
  const box = document.createElement('div');
  box.id = 'fbdl-picker';
  box.style.cssText = 'position:fixed;top:16px;right:16px;width:340px;z-index:999999;background:#101010;color:#f0f0f0;padding:0;border:1px solid #ffffff;border-radius:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;';
  box.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(to bottom,#5b9bf5 0%,#1e6df2 50%,#0d47c2 100%);color:#fff;padding:8px 12px;border-bottom:2px solid #082a70;">
    <div><b style="font-size:12px;font-weight:900;letter-spacing:2px;white-space:nowrap;">FB-PRIVATE-DLP IMG</b><br><span style="font-size:9px;color:#d4dcf0;letter-spacing:1px;white-space:nowrap;">Made with <span style="color:#ff5252;">&lt;3</span> by convex17r.</span></div>
    <span style="display:flex;align-items:center;flex-shrink:0;">
      <button id="fbdl-picker-help" title="Watch tutorial video" style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(to bottom,#ff7a7a 0%,#e02020 42%,#a80000 58%,#d41414 100%);color:#fff;border:2px solid #d7d7d7;border-radius:20px;box-shadow:inset 0 1px 2px rgba(255,255,255,.85),inset 0 -2px 3px rgba(0,0,0,.45);cursor:pointer;padding:2px 7px 2px 6px;font-size:9px;font-weight:900;letter-spacing:0px;margin-right:6px;text-shadow:0 1px 2px rgba(0,0,0,.65);white-space:nowrap;flex-shrink:0;"><span style="display:inline-block;width:0;height:0;border-left:8px solid #fff;border-top:5px solid transparent;border-bottom:5px solid transparent;filter:drop-shadow(0 1px 1px rgba(0,0,0,.65));"></span>Play video</button>
      <span title="Nepal" style="flex-shrink:0;line-height:0;margin-right:6px;"><svg width="15" height="17" viewBox="0 0 30 34"><path d="M5 2 L21 13 L11 16 L23 30 L5 30 Z" fill="#DC143C" stroke="#003893" stroke-width="2.5" stroke-linejoin="round"/><circle cx="9.5" cy="10.5" r="2.3" fill="#fff"/><g stroke="#fff" stroke-width="1.3" stroke-linecap="round"><line x1="10" y1="20" x2="10" y2="27"/><line x1="6.5" y1="23.5" x2="13.5" y2="23.5"/><line x1="7.5" y1="21" x2="12.5" y2="26"/><line x1="12.5" y1="21" x2="7.5" y2="26"/></g></svg></span>
      <button id="fbdl-picker-x" title="Close" style="background:#fff;color:#e10600;border:none;border-radius:0;cursor:pointer;padding:3px 10px;font-size:14px;font-weight:900;line-height:1;">X</button>
    </span>
  </div>
  <div style="padding:12px 14px;">
  <div style="color:#fff;font-size:13px;font-weight:bold;margin-bottom:10px;">What are you downloading from?</div>
  <button id="fbdl-kind-group" style="width:100%;background:linear-gradient(to bottom,#f2a0a0 0%,#e05858 45%,#c41c1c 50%,#e03030 100%);color:#fff;border:1px solid #5e0a0a;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:10px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,0,0,.55);margin-bottom:6px;">GROUP</button>
  <button id="fbdl-kind-page" style="width:100%;background:linear-gradient(to bottom,#bcd8f7 0%,#6fa8ef 45%,#2059c9 50%,#4d8ef2 100%);color:#fff;border:1px solid #0b2a5e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:10px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,20,60,.6);margin-bottom:6px;">PAGE</button>
  <button id="fbdl-kind-profile" style="width:100%;background:linear-gradient(to bottom,#c6ec9e 0%,#8ad054 45%,#3f9c1e 50%,#6cc44b 100%);color:#fff;border:1px solid #1f5c0e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);cursor:pointer;padding:10px;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,40,0,.6);margin-bottom:4px;">PROFILE</button>
  <div style="color:#888;font-size:11px;margin-top:8px;line-height:1.5;">Use with responsibility, I will not be responsible for misuse.</div>
  </div>`;
  document.body.appendChild(box);
  document.getElementById('fbdl-picker-x').onclick = () => {
    try { document.getElementById('fbdl-picker')?.remove(); } catch (e) { }
  };
  document.getElementById('fbdl-picker-help').onclick = () => window.open(TUTORIAL_URL, '_blank');
  document.getElementById('fbdl-kind-group').onclick = () => { state.kind = 'group'; showPanel(); };
  document.getElementById('fbdl-kind-page').onclick = () => { state.kind = 'page'; showPanel(); };
  document.getElementById('fbdl-kind-profile').onclick = () => { state.kind = 'profile'; showPanel(); };
}
function showPanel() {
  teardown();
  const isGalleryKind = state.kind === 'page' || state.kind === 'profile';
  const box = document.createElement('div');
  box.id = 'fbdl-box';
  box.style.cssText = 'position:fixed;top:16px;right:16px;width:340px;max-height:calc(100vh - 32px);overflow-y:auto;z-index:999999;background:#101010;color:#f0f0f0;padding:0;border:1px solid #ffffff;border-radius:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;';
  box.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(to bottom,#5b9bf5 0%,#1e6df2 50%,#0d47c2 100%);color:#fff;padding:8px 12px;border-bottom:2px solid #082a70;">
    <div><b style="font-size:12px;font-weight:900;letter-spacing:2px;white-space:nowrap;">FB-PRIVATE-DLP IMG</b><br><span style="font-size:9px;color:#d4dcf0;letter-spacing:1px;white-space:nowrap;">Made with <span style="color:#ff5252;">&lt;3</span> by convex17r.</span></div>
    <span style="display:flex;align-items:center;flex-shrink:0;">
      <span title="Nepal" style="flex-shrink:0;line-height:0;margin-right:6px;"><svg width="15" height="17" viewBox="0 0 30 34"><path d="M5 2 L21 13 L11 16 L23 30 L5 30 Z" fill="#DC143C" stroke="#003893" stroke-width="2.5" stroke-linejoin="round"/><circle cx="9.5" cy="10.5" r="2.3" fill="#fff"/><g stroke="#fff" stroke-width="1.3" stroke-linecap="round"><line x1="10" y1="20" x2="10" y2="27"/><line x1="6.5" y1="23.5" x2="13.5" y2="23.5"/><line x1="7.5" y1="21" x2="12.5" y2="26"/><line x1="12.5" y1="21" x2="7.5" y2="26"/></g></svg></span>
      <button id="fbdl-x" title="Close panel" style="background:#fff;color:#e10600;border:none;border-radius:0;cursor:pointer;padding:3px 10px;font-size:14px;font-weight:900;line-height:1;">X</button>
    </span>
  </div>
  <div style="padding:12px 14px;">
  <div style="color:#8a8a8a;font-size:11px;margin-bottom:10px;">Target: <b id="fbdl-kind-label" style="color:#fff;">${state.kind.toUpperCase()}</b> <a id="fbdl-change" style="color:#2f8fff;cursor:pointer;text-decoration:underline;">change</a></div>
  ${isGalleryKind
    ? `<div style="color:#8a8a8a;font-size:11px;margin-bottom:10px;">Paste the <b>page or profile URL</b> (it maybe already auto-grabbed), then click "Extract Album".</div>
  <label style="display:block;margin:4px 0;font-size:12px;font-weight:bold;letter-spacing:1px;color:#2f8fff;">PROFILE / PAGE URL (required)</label>
  <input id="fbdl-gallery" placeholder="https://www.facebook.com/NAME" style="width:100%;box-sizing:border-box;background:#1c1c1c;color:#fff;border:1px solid #555;border-radius:0;padding:7px;margin-bottom:4px;font-size:11px;">
  <label style="display:block;margin:2px 0 10px;font-size:12px;color:#fff;"><input type="checkbox" id="fbdl-cover" checked>Download Cover photos</label>`
    : `<div style="color:#8a8a8a;font-size:11px;margin-bottom:10px;">Go to <b>Group &rarr; Media &rarr; Photos</b>, then click Scan.</div>`}
  <button id="fbdl-scan-i" style="width:100%;background:${isGalleryKind ? 'linear-gradient(to bottom,#f2a0a0 0%,#e05858 45%,#c41c1c 50%,#e03030 100%)' : 'linear-gradient(to bottom,#c6ec9e 0%,#8ad054 45%,#3f9c1e 50%,#6cc44b 100%)'};color:#fff;border:1px solid ${isGalleryKind ? '#5e0a0a' : '#1f5c0e'};border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:10px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px ${isGalleryKind ? 'rgba(0,0,0,.55)' : 'rgba(0,40,0,.6)'};margin-bottom:${isGalleryKind ? '10px' : '6px'};">${isGalleryKind ? 'EXTRACT ALBUM' : 'SCAN PHOTOS'}</button>
  ${isGalleryKind ? '' : `<button id="fbdl-stop-i" style="display:none;width:100%;background:linear-gradient(to bottom,#f2a0a0 0%,#e05858 45%,#c41c1c 50%,#e03030 100%);color:#fff;border:1px solid #5e0a0a;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:10px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,0,0,.55);margin-bottom:10px;">STOP SCAN</button>`}
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
  <div style="border-top:3px solid #ffffff;margin:0 -14px;padding:8px 14px 0;font-weight:bold;letter-spacing:1px;">FOUND: <b id="fbdl-count" style="color:#e10600;font-size:20px;">0</b>
    <button id="fbdl-clear" style="float:right;background:linear-gradient(to bottom,#ffffff 0%,#ececec 45%,#d0d0d0 50%,#e6e6e6 100%);color:#111;border:1px solid #555;border-radius:3px;box-shadow:inset 0 1px 0 #fff;cursor:pointer;padding:5px 14px;font-size:13px;font-weight:bold;">CLEAR</button>
  </div>
  <div id="fbdl-list" style="max-height:200px;overflow-y:auto;margin:8px 0;display:flex;flex-direction:column;gap:4px;"></div>
  <div id="fbdl-status" style="color:#b0b3b8;min-height:16px;margin-bottom:8px;">Ready&hellip;</div>
  <button id="fbdl-dl" style="width:100%;background:linear-gradient(to bottom,#bcd8f7 0%,#6fa8ef 45%,#2059c9 50%,#4d8ef2 100%);color:#fff;border:1px solid #0b2a5e;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),inset 0 1px 0 rgba(255,255,255,.7);padding:12px;cursor:pointer;font-weight:bold;letter-spacing:1px;text-shadow:0 1px 1px rgba(0,20,60,.6);">DOWNLOAD ${scriptLabel()} (gallery-dl)</button>
  <button id="fbdl-copy" style="width:100%;background:linear-gradient(to bottom,#ffffff 0%,#ececec 45%,#d0d0d0 50%,#e6e6e6 100%);color:#111;border:1px solid #555;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),inset 0 1px 0 #fff;padding:8px;cursor:pointer;margin-top:6px;font-weight:bold;">Copy cmd commands</button>
  <div style="color:#888;font-size:11px;margin-top:8px;line-height:1.5;">Use with responsibility, I will not be responsible for misuse.</div>
  </div>`;
  document.body.appendChild(box);
  if (isGalleryKind) {
    const detected = detectGalleryUrl();
    const g = document.getElementById('fbdl-gallery');
    if (g && detected) g.value = detected;
  }
  renderList();
  wireCommonButtons(state.kind === 'group' ? 'Scan first — no photos found yet!' : 'Extract the album first — nothing found yet!');
  document.getElementById('fbdl-scan-i').onclick = scanPhotos;
  if (document.getElementById('fbdl-stop-i')) {
    document.getElementById('fbdl-stop-i').onclick = () => {
      state._cancel = true;
      setStatus('Stopping… collecting loaded photos.');
    };
  }
  document.getElementById('fbdl-change').onclick = () => showPicker();
  document.getElementById('fbdl-x').onclick = () => window.__fbImgBulk_cleanup();
}
window.__fbImgBulk_cleanup = () => {
  state._cancel = true;
  teardown();
  window.__fbImgBulk_cleanup = null;
};
showPicker();
})();
