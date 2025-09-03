const STATE_KEY = 'echo_focus_state';
const HISTORY_KEY = 'echo_focus_history';

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

async function getHistory() {
  return new Promise(resolve => {
    chrome.storage.local.get([HISTORY_KEY], data => {
      resolve(data[HISTORY_KEY] || []);
    });
  });
}

async function saveHistory(session) {
    const history = await getHistory();
    history.push(session);
    return new Promise(resolve => {
        chrome.storage.local.set({[HISTORY_KEY]: history}, () => resolve());
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
  const now = Date.now();
  const endTime = now + minutes * 60 * 1000;
  const state = {active: true, startTime: now, endTime, sites};
  await setState(state);
  // alarm when finished
  chrome.alarms.create('echo_focus_end', {when: endTime});
  await notifyTabsToUpdate();
}

async function stopSession() {
  const s = await getState();
  if (s.active) {
      await saveHistory({
          startTime: s.startTime,
          endTime: Date.now(),
          sites: s.sites
      });
  }
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
    } else if (msg.type === 'getHistory') {
        const history = await getHistory();
        sendResponse({ ok: true, history: history });
    }
    else {
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