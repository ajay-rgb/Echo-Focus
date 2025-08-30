const $ = id => document.getElementById(id);

const RADIUS = 54; 
const CIRC = 2 * Math.PI * RADIUS;

const setRing = (pct) => {
  const el = document.querySelector('.ring-fg');
  const offset = CIRC * (1 - pct);
  el.style.strokeDashoffset = Math.max(0, offset);
};

function formatRemaining(ms){
  if(ms <= 0) return '00:00';
  const sec = Math.floor(ms/1000);
  const m = String(Math.floor(sec/60)).padStart(2,'0');
  const s = String(sec%60).padStart(2,'0');
  return `${m}:${s}`;
}

async function getState() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({type:'getState'}, resp => resolve(resp && resp.state ? resp.state : {active:false}));
  });
}

function parseSites(input){
  return input.split(',').map(s=>s.trim()).filter(Boolean).map(s => s.replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,''));
}

async function start(minutes, sites){
  return new Promise(resolve => chrome.runtime.sendMessage({type:'start', minutes, sites}, resp => resolve(resp)));
}

async function stop(){
  return new Promise(resolve => chrome.runtime.sendMessage({type:'stop'}, resp => resolve(resp)));
}

async function refreshUI(){
  const s = await getState();
  if(s.active){
    const now = Date.now();
    const rem = Math.max(0, s.endTime - now);
    const total = Math.max(1, s.endTime - (s.startTime || (s.endTime - (parseInt($('minutes').value||25)*60000))));
    const pct = 1 - (rem / total);
    $('status').textContent = `Ends at ${new Date(s.endTime).toLocaleTimeString()}`;
    $('countdownText').textContent = formatRemaining(rem);
    setRing(pct);
  } else {
    $('status').textContent = 'Not running';
    $('countdownText').textContent = '00:00';
    setRing(0);
  }
}

$('start').addEventListener('click', async () => {
  const minutes = parseInt($('minutes').value, 10) || 25;
  const sites = parseSites($('sites').value || '');
  await start(minutes, sites);
  await refreshUI();
});

$('stop').addEventListener('click', async () => {
  await stop();
  await refreshUI();
});

// initialize SVG ring stroke length
(function init(){
  const fg = document.querySelector('.ring-fg');
  if(fg){
    fg.style.strokeDasharray = String(CIRC);
    fg.style.strokeDashoffset = String(CIRC);
  }
  refreshUI();
  setInterval(refreshUI, 800);
})();
