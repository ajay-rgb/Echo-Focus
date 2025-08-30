const STATE_KEY = 'echo_focus_state';

async function getState() {
  return new Promise(resolve => {
    chrome.storage.local.get([STATE_KEY], data => {
      resolve(data[STATE_KEY] || {active:false, endTime:0, sites:[]});
    });
  });
}

async function setState(state) {
  return new Promise(resolve => {
    chrome.storage.local.set({[STATE_KEY]: state}, () => resolve());
  });
}

function domainFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

async function notifyTabsToUpdate() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, {action: 'update-block-state'}).catch(()=>{});
  }
}

async function startSession(minutes, sites) {
  const endTime = Date.now() + minutes * 60 * 1000;
  const state = {active: true, endTime, sites};
  await setState(state);
  // alarm when finished
  chrome.alarms.create('echo_focus_end', {when: endTime});
  await notifyTabsToUpdate();
}

async function stopSession() {
  const state = {active:false, endTime:0, sites:[]};
  await setState(state);
  chrome.alarms.clear('echo_focus_end');
  await notifyTabsToUpdate();
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === 'echo_focus_end') {
    await stopSession();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg && msg.type === 'start') {
      await startSession(msg.minutes || 25, msg.sites || []);
      sendResponse({ok:true});
    } else if (msg && msg.type === 'stop') {
      await stopSession();
      sendResponse({ok:true});
    } else if (msg && msg.type === 'getState') {
      const s = await getState();
      sendResponse({ok:true, state:s});
    } else {
      sendResponse({ok:false, error:'unknown'});
    }
  })();
  // return true to indicate async sendResponse
  return true;
});

// wake up and re-notify tabs when service worker starts
(async () => {
  const s = await getState();
  if (s.active) await notifyTabsToUpdate();
})();