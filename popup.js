const $ = id => document.getElementById(id);

async function getState() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({type:'getState'}, resp => resolve(resp && resp.state ? resp.state : {active:false}));
  });
}

async function start(minutes, sites) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({type:'start', minutes, sites}, resp => resolve(resp));
  });
}

async function stop() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({type:'stop'}, resp => resolve(resp));
  });
}

function parseSites(input) {
  return input.split(',').map(s=>s.trim()).filter(Boolean).map(s => s.replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,''));
}

async function refreshStatus() {
  const s = await getState();
  if (s.active) {
    const rem = Math.max(0, s.endTime - Date.now());
    $('status').textContent = `Running — ends in ${Math.ceil(rem/60000)}m (${new Date(s.endTime).toLocaleTimeString()})`;
  } else {
    $('status').textContent = 'Not running';
  }
}

$('start').addEventListener('click', async () => {
  const minutes = parseInt($('minutes').value, 10) || 25;
  const sites = parseSites($('sites').value || '');
  await start(minutes, sites);
  await refreshStatus();
});

$('stop').addEventListener('click', async () => {
  await stop();
  await refreshStatus();
});

window.addEventListener('load', () => {
  refreshStatus();
  setInterval(refreshStatus, 3000);
});