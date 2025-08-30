Echo-Focus — Chrome extension

<img width="566" height="597" alt="image" src="https://github.com/user-attachments/assets/b7030171-f223-4174-b6d2-03e5019c691f" />

Echo-Focus blocks configured domains while a Pomodoro timer runs.
Technical highlights: Manifest V3 service worker for scheduling, chrome.alarms for expiry, chrome.storage.local for persistence, and content scripts that inject an unskippable overlay and countdown.
---
Clone or download the repository and open the project folder (e.g., echo-focus/).

In Chrome (or Edge Chromium): open chrome://extensions/.

Enable Developer mode (top-right).

Click Load unpacked and select the echo-focus/ folder.

Click the Echo-Focus icon → enter domains (comma separated) → set duration → Start.

Open one of the configured sites — an overlay with a countdown will appear while the timer is active.

Features

Block any comma-separated domains (e.g., youtube.com, facebook.com).

Persistent sessions stored in chrome.storage.local so a reload won’t immediately clear the timer.

Service worker (MV3) schedules an alarm for session end using chrome.alarms.

Robust content script that injects a full-page overlay + live countdown.

SPA-aware: hooks history.pushState / popstate to re-evaluate blocking on client-side navigations.

Graceful handling of service worker restarts (retries and defensive messaging).

Installation (developer)
Requirements

Chrome 88+ (or Chromium-based browser supporting MV3).

Project structure
echo-focus/
├─ manifest.json            # MV3 manifest (permissions, content scripts, background service_worker)
├─ background.js            # service worker: state, alarms, message handling
├─ content_script.js        # overlay + countdown + robust messaging
├─ popup.html               # popup UI
├─ popup.js                 # popup logic: start/stop/getState
├─ popup.css                # popup styles
├─ icons/
│  ├─ icon16.png
│  ├─ icon48.png
│  └─ icon128.png
└─ README.md                # this file

Built by you (replace with your name).

Inspired by classic productivity tools and the Pomodoro technique.
