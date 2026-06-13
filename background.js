(() => {
  "use strict";

  const UPDATE_TYPE = "KLT_SUSPICIOUS_USERS_UPDATED";
  const RESET_TYPE = "KLT_SUSPICIOUS_USERS_RESET";
  const GET_REPORT_TYPE = "KLT_GET_SUSPICIOUS_REPORT";
  const CLEAR_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_REPORT";
  const UI_LANG = getUiLanguage();
  const TEXT = {
    ja: {
      detected: "検出",
      notificationWithChannel: "{username} が {channel} で検出されました",
      notification: "{username} が検出されました"
    },
    en: {
      detected: "Detected",
      notificationWithChannel: "{username} was detected in {channel}",
      notification: "{username} was detected"
    }
  };

  const reportsByTabId = new Map();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== "object") return false;

    if (message.type === "KLT_SHOW_NOTIFICATION") {
      const username = String(message.username || "");
      const channelSlug = String(message.channelSlug || "");
      const reasonLabel = String(message.reasonLabel || t("detected"));
      const title = `KICK Log Tool｜${reasonLabel}`;
      const body = channelSlug
        ? t("notificationWithChannel", { username, channel: channelSlug })
        : t("notification", { username });
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title,
        message: body,
        priority: 1
      });
      sendResponse?.({ ok: true });
      return true;
    }

    if (message.type === UPDATE_TYPE) {
      const tabId = sender.tab?.id;
      if (typeof tabId !== "number") {
        sendResponse?.({ ok: false });
        return true;
      }

      const report = normalizeReport(message.payload);
      const tabSlug = getChannelSlugFromUrl(sender.tab?.url || "");
      if (!isReportForTab(report, tabSlug)) {
        reportsByTabId.delete(tabId);
        updateBadge(tabId, 0);
        sendResponse?.({ ok: false, reason: "channel mismatch" });
        return true;
      }

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
      const activeSlug = getChannelSlugFromUrl(message.pageUrl || "");
      const storedReport = reportsByTabId.get(tabId) || createEmptyReport();
      const report = isReportForTab(storedReport, activeSlug) ? storedReport : createEmptyReport();
      if (storedReport !== report && Number.isFinite(tabId)) {
        reportsByTabId.delete(tabId);
        updateBadge(tabId, 0);
      }
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

    return false;
  });

  function getUiLanguage() {
    const language = String(chrome?.i18n?.getUILanguage?.() || "en").toLowerCase();
    return language.startsWith("ja") ? "ja" : "en";
  }

  function t(key, params = {}) {
    const dictionary = TEXT[UI_LANG] || TEXT.en;
    const fallback = TEXT.en[key] || TEXT.ja[key] || key;
    return String(dictionary[key] || fallback).replace(/\{(\w+)\}/g, (_match, name) => {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : "";
    });
  }

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
          avatarUrl: isHttpUrl(user.avatarUrl) ? String(user.avatarUrl) : "",
          detectionCategory: String(user.detectionCategory || ""),
          reasons: Array.isArray(user.reasons) ? user.reasons.map(String).slice(0, 8) : [],
          riskScore: Math.max(0, Math.min(100, Number(user.riskScore) || 0)),
          riskRuleCount: Math.max(0, Number(user.riskRuleCount) || 0),
          riskCritical: Boolean(user.riskCritical),
          evidenceTexts: Array.isArray(user.evidenceTexts) ? user.evidenceTexts.map(String).slice(0, 6) : [],
          firstDetectedAt: Number(user.firstDetectedAt) || Date.now(),
          lastDetectedAt: Number(user.lastDetectedAt) || Date.now(),
          detectedMessageId: String(user.detectedMessageId || "").slice(0, 120),
          detectedMessageKey: String(user.detectedMessageKey || "").slice(0, 240),
          detectedMessageAt: Number(user.detectedMessageAt) || 0,
          detectedMessageText: String(user.detectedMessageText || "").slice(0, 180)
        }))
      : [];

    return {
      channelSlug: String(report.channelSlug || ""),
      pageUrl: String(report.pageUrl || ""),
      updatedAt: Number(report.updatedAt) || Date.now(),
      chatStatus: normalizeChatStatus(report.chatStatus),
      users
    };
  }

  function normalizeChatStatus(value) {
    const status = value && typeof value === "object" ? value : {};
    const levels = new Set(["checking", "quiet", "normal", "active", "caution", "rough"]);
    const level = levels.has(String(status.level)) ? String(status.level) : "";
    if (!level) return null;

    return {
      level,
      windowMinutes: Math.max(1, Math.min(60, Math.round(Number(status.windowMinutes) || 5))),
      messageCount: Math.max(0, Math.round(Number(status.messageCount) || 0)),
      userCount: Math.max(0, Math.round(Number(status.userCount) || 0)),
      detectionCount: Math.max(0, Math.round(Number(status.detectionCount) || 0)),
      highRiskCount: Math.max(0, Math.round(Number(status.highRiskCount) || 0))
    };
  }

  function isReportForTab(report, activeSlug) {
    if (!activeSlug) return true;
    const reportSlug = String(report?.channelSlug || getChannelSlugFromUrl(report?.pageUrl || "") || "").toLowerCase();
    if (!reportSlug) return true;
    return reportSlug === String(activeSlug).toLowerCase();
  }

  function getChannelSlugFromUrl(value) {
    try {
      const url = new URL(String(value || ""));
      if (url.hostname !== "kick.com" && url.hostname !== "www.kick.com") return "";
      const ignored = new Set(["api", "embed", "popout", "video", "videos", "chatroom", "mobile"]);
      const first = url.pathname.split("/").filter(Boolean)[0] || "";
      return first && !ignored.has(first.toLowerCase()) ? first : "";
    } catch (_error) {
      return "";
    }
  }

  function createEmptyReport() {
    return {
      channelSlug: "",
      pageUrl: "",
      updatedAt: Date.now(),
      chatStatus: createCheckingChatStatus(),
      users: []
    };
  }

  function createCheckingChatStatus() {
    return {
      level: "checking",
      windowMinutes: 5,
      messageCount: 0,
      userCount: 0,
      detectionCount: 0,
      highRiskCount: 0
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

  function isHttpUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (_error) {
      return false;
    }
  }
})();
