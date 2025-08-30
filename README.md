# Echo-Focus — load & test

1. Create a folder `pomodoro-blocker` and paste the files above.
2. Open `chrome://extensions` in Chrome (or Edge), enable *Developer mode*, click **Load unpacked**, and select the folder.
3. Click the extension icon, add sites (e.g. `youtube.com, facebook.com`), choose duration, and press **Start**.
4. Open one of the blocked sites — the overlay should appear until the timer ends.

Troubleshooting:
- If overlay doesn't appear immediately, try refreshing the tab. The extension checks on load and every 5s.
- Make sure extension has host permissions for the site (manifest uses `<all_urls>`).