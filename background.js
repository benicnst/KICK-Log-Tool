(() => {
  "use strict";

  const UPDATE_TYPE = "KLT_SUSPICIOUS_USERS_UPDATED";
  const RESET_TYPE = "KLT_SUSPICIOUS_USERS_RESET";
  const GET_REPORT_TYPE = "KLT_GET_SUSPICIOUS_REPORT";
  const CLEAR_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_REPORT";

  const reportsByTabId = new Map();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== "object") return false;

    if (message.type === UPDATE_TYPE) {
      const tabId = sender.tab?.id;
      if (typeof tabId !== "number") {
        sendResponse?.({ ok: false });
        return true;
      }

      const report = normalizeReport(message.payload);
      reportsByTabId.set(tabId, report);
      updateBadge(tabId, report.users.length);
      sendResponse?.({ ok: true });
      return true;
    }

    if (message.type === RESET_TYPE) {
      const tabId = sender.tab?.id;
      if (typeof tabId === "number") {
        reportsByTabId.delete(tabId);
        updateBadge(tabId, 0);
      }
      sendResponse?.({ ok: true });
      return true;
    }

    if (message.type === GET_REPORT_TYPE) {
      const tabId = Number(message.tabId);
      const report = reportsByTabId.get(tabId) || createEmptyReport();
      sendResponse?.({ ok: true, report });
      return true;
    }

    if (message.type === CLEAR_REPORT_TYPE) {
      const tabId = Number(message.tabId);
      reportsByTabId.delete(tabId);
      if (Number.isFinite(tabId)) updateBadge(tabId, 0);
      sendResponse?.({ ok: true });
      return true;
    }

    if (message.type === "KLT_EXECUTE_PAGE_FETCH") {
      const tabId = sender.tab?.id || Number(message.tabId);
      if (!Number.isFinite(tabId)) {
        sendResponse?.({ ok: false, error: "No tabId" });
        return true;
      }

      try {
        chrome.scripting.executeScript({
          target: { tabId: Number(tabId) },
          world: "MAIN",
          func: (path, origin, extraHeaders) => {
            const headers = Object.assign({ Accept: "application/json" }, extraHeaders || {});
            return fetch(origin + path, { credentials: "include", headers })
              .then(async (r) => {
                const text = await r.text();
                try {
                  return { ok: r.ok, status: r.status, json: JSON.parse(text) };
                } catch (e) {
                  return { ok: r.ok, status: r.status, text };
                }
              })
              .catch((e) => ({ error: String(e) }));
          },
          args: [String(message.path || ""), String(message.origin || "https://kick.com"), message.headers || {}]
        }, (results) => {
          const res = results?.[0]?.result;
          sendResponse?.({ ok: true, result: res });
        });
        return true;
      } catch (error) {
        sendResponse?.({ ok: false, error: String(error) });
        return true;
      }
    }

    return false;
  });

  chrome.tabs?.onRemoved?.addListener((tabId) => {
    reportsByTabId.delete(tabId);
  });

  chrome.tabs?.onUpdated?.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== "loading") return;
    reportsByTabId.delete(tabId);
    updateBadge(tabId, 0);
  });

  function normalizeReport(payload) {
    const report = payload && typeof payload === "object" ? payload : {};
    const users = Array.isArray(report.users)
      ? report.users
        .filter((user) => user?.username)
        .map((user) => ({
          username: String(user.username),
          profileUrl: isKickProfileUrl(user.profileUrl) ? user.profileUrl : getProfileUrl(user.username),
          reasons: Array.isArray(user.reasons) ? user.reasons.map(String).slice(0, 8) : [],
          firstDetectedAt: Number(user.firstDetectedAt) || Date.now(),
          lastDetectedAt: Number(user.lastDetectedAt) || Date.now(),
          lastCommentAt: Number(user.lastCommentAt) || 0,
          messageCount: Number(user.messageCount) || 0,
          lastMessage: String(user.lastMessage || "").slice(0, 180)
        }))
      : [];

    return {
      channelSlug: String(report.channelSlug || ""),
      pageUrl: String(report.pageUrl || ""),
      updatedAt: Number(report.updatedAt) || Date.now(),
      users
    };
  }

  function createEmptyReport() {
    return {
      channelSlug: "",
      pageUrl: "",
      updatedAt: Date.now(),
      users: []
    };
  }

  function updateBadge(tabId, count) {
    if (!Number.isFinite(tabId)) return;

    const text = count > 99 ? "99+" : count > 0 ? String(count) : "";
    safelyUpdateTabAction(tabId, () => chrome.action.setBadgeBackgroundColor({ tabId, color: "#53fc18" }));
    if (chrome.action.setBadgeTextColor) {
      safelyUpdateTabAction(tabId, () => chrome.action.setBadgeTextColor({ tabId, color: "#101316" }));
    }
    safelyUpdateTabAction(tabId, () => chrome.action.setBadgeText({ tabId, text }));
    safelyUpdateTabAction(tabId, () => chrome.action.setTitle({
      tabId,
      title: count > 0 ? `KICK Log Tool - ${count} suspicious users` : "KICK Log Tool"
    }));
  }

  function safelyUpdateTabAction(tabId, action) {
    try {
      const result = action();
      if (result && typeof result.catch === "function") {
        result.catch((error) => handleTabActionError(tabId, error));
      }
    } catch (error) {
      handleTabActionError(tabId, error);
    }
  }

  function handleTabActionError(tabId, error) {
    if (isMissingTabError(error)) {
      reportsByTabId.delete(tabId);
    }
  }

  function isMissingTabError(error) {
    return /No tab with id/i.test(String(error?.message || error || ""));
  }

  function getProfileUrl(username) {
    return `https://kick.com/${encodeURIComponent(String(username || "").replace(/^@/, ""))}`;
  }

  function isKickProfileUrl(value) {
    try {
      const url = new URL(value);
      return /^https:$/.test(url.protocol) &&
        (url.hostname === "kick.com" || url.hostname === "www.kick.com") &&
        url.pathname.split("/").filter(Boolean).length === 1;
    } catch (_error) {
      return false;
    }
  }
})();
