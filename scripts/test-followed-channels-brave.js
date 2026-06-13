#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");

const API_ORIGIN = "https://kick.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 30;

function runAppleScript(source) {
  return execFileSync("osascript", ["-e", source], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 4
  }).trim();
}

function findKickTab() {
  const script = `
tell application "Brave Browser"
  set fallback to ""
  repeat with wi from 1 to count of windows
    set w to window wi
    repeat with ti from 1 to count of tabs of w
      set u to URL of tab ti of w
      if u starts with "https://kick.com/following" then
        return (wi as text) & "||" & (ti as text) & "||" & u
      end if
      if fallback is "" and u starts with "https://kick.com/" then
        set fallback to (wi as text) & "||" & (ti as text) & "||" & u
      end if
    end repeat
  end repeat
  return fallback
end tell`;
  const result = runAppleScript(script);
  const [windowIndex, tabIndex, url] = result.split("||");
  if (!windowIndex || !tabIndex) {
    throw new Error("BraveでKickタブが見つかりませんでした。");
  }
  return {
    windowIndex: Number(windowIndex),
    tabIndex: Number(tabIndex),
    url
  };
}

function browserProbeSource() {
  return `(() => {
    const PAGE_SIZE = ${PAGE_SIZE};
    const MAX_PAGES = ${MAX_PAGES};
    const token = decodeURIComponent((document.cookie.match(/(?:^|;\\s*)session_token=([^;]*)/) || [, ""])[1]);
    if (!token) return JSON.stringify({ ok: false, reason: "session_token missing", pages: 0, count: 0, usernames: [] });

    const seen = new Set();
    const usernames = [];
    const trace = [];
    let cursor = 0;

    function getUsername(item) {
      if (!item || typeof item !== "object") return "";
      const candidates = [
        item.channel_slug,
        item.channelSlug,
        item.channel_username,
        item.channelUsername,
        item.user_username,
        item.userUsername,
        item.slug,
        item.username,
        item.channel?.slug,
        item.channel?.username,
        item.user?.slug,
        item.user?.username,
        item.streamer?.slug,
        item.streamer?.username
      ];
      for (const value of candidates) {
        const text = String(value || "").replace(/^@/, "").trim().toLowerCase();
        if (/^[a-z0-9_.-]{1,32}$/i.test(text)) return text;
      }
      return "";
    }

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const xhr = new XMLHttpRequest();
      const url = "/api/v2/channels/followed-page?cursor=" + encodeURIComponent(cursor) + "&limit=" + PAGE_SIZE;
      xhr.open("GET", url, false);
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("x-app-platform", "web");
      xhr.send();

      if (xhr.status !== 200) {
        return JSON.stringify({ ok: false, reason: "status " + xhr.status, pages: page - 1, count: usernames.length, trace, usernames });
      }

      const data = JSON.parse(xhr.responseText);
      const items = Array.isArray(data.channels)
        ? data.channels
        : Array.isArray(data.data?.channels)
          ? data.data.channels
          : Array.isArray(data.data)
            ? data.data
            : [];
      let added = 0;
      for (const item of items) {
        const username = getUsername(item);
        if (!username || seen.has(username)) continue;
        seen.add(username);
        usernames.push(username);
        added += 1;
      }

      trace.push({
        page,
        cursor,
        items: items.length,
        added,
        total: usernames.length,
        nextCursor: data.nextCursor ?? data.next_cursor ?? data.pagination?.nextCursor ?? data.data?.nextCursor ?? null
      });

      const nextCursor = data.nextCursor ?? data.next_cursor ?? data.pagination?.nextCursor ?? data.data?.nextCursor ?? null;
      if (nextCursor === null || nextCursor === undefined || nextCursor === "" || String(nextCursor) === String(cursor)) break;
      cursor = nextCursor;
    }

    return JSON.stringify({ ok: true, pages: trace.length, count: usernames.length, trace, usernames });
  })()`;
}

function runProbe(tab) {
  const js = browserProbeSource();
  const script = `tell application "Brave Browser" to execute tab ${tab.tabIndex} of window ${tab.windowIndex} javascript ${JSON.stringify(js)}`;
  return JSON.parse(runAppleScript(script));
}

const tab = findKickTab();
const result = runProbe(tab);

console.log(`target=${tab.url}`);
if (!result.ok) {
  console.log(`failed=${result.reason} pages=${result.pages} count=${result.count}`);
  if (Array.isArray(result.trace)) console.log(`trace=${JSON.stringify(result.trace)}`);
  process.exit(1);
}

for (const page of result.trace) {
  console.log(`page ${page.page}: cursor=${page.cursor} items=${page.items} new=${page.added} total=${page.total} next=${page.nextCursor ?? "-"}`);
}
console.log(`loaded=${result.count}`);
