<<<<<<< HEAD


let overlay = null;
let intervalId = null;

function createOverlay() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'echo-focus-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.zIndex = '2147483647';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.backdropFilter = 'blur(2px)';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.color = 'white';
  overlay.style.fontFamily = 'Inter, Roboto, sans-serif';
  overlay.style.textAlign = 'center';
  overlay.innerHTML = `
    <div style="max-width:720px;padding:24px;border-radius:12px;">
      <h1 style="margin:0 0 8px;font-size:28px;">Focus time</h1>
      <p id="echo-focus-msg" style="margin:0 0 12px;font-size:16px;opacity:0.9;">You asked to block this site.</p>
      <div id="echo-countdown" style="font-size:18px;font-weight:600;"></div>
      <div style="margin-top:16px;font-size:13px;opacity:0.8;">(Refresh or navigate won't bypass while timer is on)</div>
    </div>
  `;
  document.documentElement.appendChild(overlay);
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function formatRemaining(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

async function queryShouldBlock() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({type:'getState'}, resp => {
      if (!resp || !resp.ok) return resolve({block:false});
      const s = resp.state;
      if (!s.active) return resolve({block:false});
      const host = (location.hostname || '').replace(/^www\./, '');
      const should = s.sites.some(pattern => host.includes(pattern) || host === pattern);
      resolve({block: should, endTime: s.endTime});
    });
  });
}

function startCountdown(endTime) {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    const rem = endTime - Date.now();
    const el = document.getElementById('echo-countdown');
    const msg = document.getElementById('echo-focus-msg');
    if (el) el.textContent = formatRemaining(rem);
    if (msg) msg.textContent = rem > 0 ? 'Stay focused — this site is temporarily blocked' : 'Session ended';
    if (rem <= 0) {
      removeOverlay();
    }
  }, 300);
}

async function updateBlockState() {
  const result = await queryShouldBlock();
  if (result.block) {
    createOverlay();
    startCountdown(result.endTime);
  } else {
    removeOverlay();
  }
}

updateBlockState();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'update-block-state') {
    updateBlockState();
  }
});

setInterval(() => updateBlockState(), 5000);

(function(history){
  const push = history.pushState;
  history.pushState = function(){
    push.apply(this, arguments);
    setTimeout(updateBlockState, 50);
  };
})(window.history);

window.addEventListener('popstate', () => setTimeout(updateBlockState, 50));
=======
// content_script.js — defensive, retrying messaging to avoid "Extension context invalidated"

let overlay = null;
let intervalId = null;

// helpers
function safeLog(...args){ try { console.log('Echo-Focus:', ...args); } catch(e){} }

function createOverlay() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'echo-focus-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0', right: '0', bottom: '0',
    zIndex: '2147483647',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(2px)',
    background: 'rgba(0,0,0,0.85)',
    color: 'white',
    fontFamily: 'Inter, Roboto, sans-serif',
    textAlign: 'center'
  });
  overlay.innerHTML = `
    <div style="max-width:720px;padding:24px;border-radius:12px;">
      <h1 style="margin:0 0 8px;font-size:28px;">Focus time</h1>
      <p id="echo-focus-msg" style="margin:0 0 12px;font-size:16px;opacity:0.9;">You asked to block this site.</p>
      <div id="echo-countdown" style="font-size:18px;font-weight:600;"></div>
      <div style="margin-top:16px;font-size:13px;opacity:0.8;">(Refresh or navigate won't bypass while timer is on)</div>
    </div>
  `;
  try { document.documentElement.appendChild(overlay); }
  catch(e){ safeLog('appendOverlay failed', e); }
}

function removeOverlay() {
  if (overlay) {
    try { overlay.remove(); } catch(e){ /* ignore */ }
    overlay = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function formatRemaining(ms) {
  if (!ms || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Promise wrapper for chrome.runtime.sendMessage with timeout and lastError check
function sendMessageSafe(msg, {timeout = 1500} = {}) {
  return new Promise(resolve => {
    let finished = false;
    try {
      chrome.runtime.sendMessage(msg, (resp) => {
        finished = true;
        const err = chrome.runtime && chrome.runtime.lastError;
        resolve({resp, err});
      });
    } catch (err) {
      // synchronous throw (very rare) — treat as error
      finished = true;
      resolve({resp: null, err});
    }
    // fallback if no callback happens (worker restart or context invalidation)
    setTimeout(() => {
      if (!finished) {
        resolve({resp: null, err: { message: 'timeout' }});
      }
    }, timeout);
  });
}

// Try messaging with a few retries and exponential backoff
async function messageWithRetries(msg, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    const {resp, err} = await sendMessageSafe(msg, { timeout: 1200 });
    if (!err) {
      return { ok: true, resp };
    }
    // If error looks like extension restart/context invalidated, retry after small backoff
    const m = (err && err.message) ? String(err.message).toLowerCase() : '';
    if (m.includes('invalid') || m.includes('context') || m.includes('timeout') || m.includes('extension context')) {
      attempt++;
      const backoff = 120 * attempt; // ms
      await new Promise(r => setTimeout(r, backoff));
      continue;
    } else {
      // non-retryable error
      return { ok: false, err };
    }
  }
  return { ok: false, err: { message: 'max retries reached' } };
}

// Query background whether current page should be blocked
async function queryShouldBlock() {
  try {
    const { ok, resp, err } = await messageWithRetries({ type: 'getState' }, 4);
    if (!ok) {
      safeLog('getState failed or unavailable:', err && err.message);
      return { block: false };
    }
    if (!resp || !resp.ok) return { block: false };
    const s = resp.state || { active: false };
    if (!s.active) return { block: false };
    const host = (location.hostname || '').replace(/^www\./, '');
    const should = Array.isArray(s.sites) && s.sites.some(pattern => host.includes(pattern) || host === pattern);
    return { block: !!should, endTime: s.endTime };
  } catch (e) {
    safeLog('queryShouldBlock unexpected error', e);
    return { block: false };
  }
}

function startCountdown(endTime) {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    try {
      const rem = endTime - Date.now();
      const el = document.getElementById('echo-countdown');
      const msg = document.getElementById('echo-focus-msg');
      if (el) el.textContent = formatRemaining(rem);
      if (msg) msg.textContent = rem > 0 ? 'Stay focused — this site is temporarily blocked' : 'Session ended';
      if (rem <= 0) {
        removeOverlay();
      }
    } catch (err) {
      safeLog('countdown tick error', err);
      removeOverlay();
    }
  }, 300);
}

async function updateBlockState() {
  try {
    const result = await queryShouldBlock();
    if (result && result.block) {
      createOverlay();
      startCountdown(result.endTime || Date.now());
    } else {
      removeOverlay();
    }
  } catch (err) {
    safeLog('updateBlockState error', err);
    removeOverlay();
  }
}

// initialize and keep checking
(async function init() {
  try {
    await updateBlockState();
  } catch(e){ /* ignore */ }
  // periodic re-check in case worker wakes later
  setInterval(() => {
    updateBlockState().catch(err => safeLog('periodic update failed', err));
  }, 5000);

  // hook SPA navigation
  (function(history){
    const push = history.pushState;
    history.pushState = function(){
      push.apply(this, arguments);
      setTimeout(() => updateBlockState().catch(()=>{}), 50);
    };
  })(window.history);
  window.addEventListener('popstate', () => setTimeout(() => updateBlockState().catch(()=>{}), 50));
})();

// react to background messages (no throwing)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (msg && msg.action === 'update-block-state') {
      updateBlockState();
    }
  } catch (err) {
    safeLog('onMessage handler error', err);
  }
});
>>>>>>> 398ea31 (fix timer ui)
