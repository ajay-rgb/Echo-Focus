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

// initial check
updateBlockState();

// react to runtime messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'update-block-state') {
    updateBlockState();
  }
});

// also periodically re-check (in case service worker wakes later)
setInterval(() => updateBlockState(), 5000);

// attempt to detect SPA history changes to re-check quickly
(function(history){
  const push = history.pushState;
  history.pushState = function(){
    push.apply(this, arguments);
    setTimeout(updateBlockState, 50);
  };
})(window.history);

window.addEventListener('popstate', () => setTimeout(updateBlockState, 50));