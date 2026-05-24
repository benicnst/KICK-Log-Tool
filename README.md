# KICK Log Tool

KICK Log Tool is a Chrome extension that shows recent chat history for a Kick.com chat user when you hover over their username.

This project is not affiliated with, endorsed by, or sponsored by Kick.

## Features

- Shows up to the latest 10 captured comments for a hovered chat username.
- Keeps history scoped to the current livestream when stream context is available.
- Stores chat history in the page's `localStorage`.
- Supports pinning up to 3 user popups.
- Pinned popups can be dragged anywhere on the screen.
- Updates visible and pinned popups when new comments are captured.
- Uses Kick chat DOM observation for realtime updates.
- Uses a limited unofficial Kick chat API only for history backfill and pinned-user checks while chat is paused.
- Returns to DOM-based realtime capture after chat pause is released.
- Shows a rotating reload icon next to pinned users while API checking is active.
- Shows a skull marker when multiple suspicious posting patterns are detected.
- Provides optional moderation command buttons, disabled by default.

## Install In Chrome

1. Download or clone this repository.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the folder that contains `manifest.json`.
6. Open or reload a Kick.com livestream page.

After updating files, reload the extension from `chrome://extensions/` and reload the Kick page.

## Install In Edge Or Brave

Edge and Brave support unpacked Chromium extensions.

1. Open the browser's extensions page.
2. Enable developer mode.
3. Load this project folder as an unpacked extension.
4. Reload the Kick page.

## Usage

- Hover over a chat username to open the history popup.
- Click Fixed to pin the popup.
- Drag a pinned popup by its header.
- Close a pinned popup with the close button.
- When chat is paused by scrolling, pinned users are checked through the limited API refresh.
- When chat pause is released, realtime capture returns to the visible chat DOM.

## Suspicious Account Marker

The skull marker is not a definitive bot judgment. It is only a heuristic warning that an account may be using automation or rapid-posting behavior.

The marker is shown only when 2 or more of these conditions are true:

- 5 or more comments within 60 seconds.
- 8 or more comments within 120 seconds.
- The same normalized comment appears 3 or more times.
- 3 or more comments appear within 2 seconds.
- The average interval between captured comments is 8 seconds or less, with at least 6 comments.
- 3 or more URL-like comments are detected.

Examples that can still be false positives:

- A real viewer posts several short replies quickly.
- Kick delays comments and then renders them together.
- A streamer asks chat to repeat a phrase.
- A user posts repeated reactions such as short laughter or congratulations.

Treat the skull marker as a review hint, not proof.

## Optional Moderation Buttons

Moderation command buttons are hidden by default.

To show them for the current browser profile and site storage, run this in the Kick page console:

```js
window.__KICK_CHAT_HISTORY_HOVER__.setModerationActionsEnabled(true)
```

The buttons only insert commands into the chat input. They do not send automatically.

Generated commands:

- `/timeout <username> 600 suspicious activity`
- `/ban <username> suspicious activity`

To hide the buttons again:

```js
window.__KICK_CHAT_HISTORY_HOVER__.setModerationActionsEnabled(false)
```

## Data And Privacy

- The extension does not use an external server controlled by this project.
- Captured chat history is stored in the Kick page's `localStorage`.
- History is limited to the configured maximum number of messages per user.
- The extension does not require a login token or any user-provided personal information.
- This repository intentionally does not include personal contact details or email addresses.

## API Behavior

Kick does not provide a stable public chat-history API for this use case. This extension uses limited unofficial endpoints for:

- Backfilling missing recent history when local captured history is under 10 comments.
- Checking pinned users while the Kick chat is paused because of scrolling.

API access is intentionally limited to reduce unnecessary load:

- Hover backfill is attempted only when needed.
- Pinned-user API checks run about every 15 seconds only while chat pause is detected.
- Pinned-user checks stop using the API once chat pause is released.

Unofficial API behavior can break if Kick changes its site, authentication, Cloudflare behavior, CORS behavior, or response format.

## Development

Validate the JavaScript and manifest before loading the extension:

```sh
node --check content.js
python3 -m json.tool manifest.json >/dev/null
```

## Notes

- This is an unpacked extension project.
- It is not published on the Chrome Web Store.
- Kick DOM changes may require selector updates in `content.js`.
