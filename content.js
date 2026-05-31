(() => {
  "use strict";

  const MAX_MESSAGES = 20;
  const MAX_USERS = 250;
  const SAVE_DELAY_MS = 700;
  const API_WINDOW_MS = 60 * 1000;
  const MAX_API_WINDOWS_PER_USER = 240;
  const API_ORIGIN = "https://kick.com";
  const BASE_STORAGE_KEY = `kch:${location.hostname}:${location.pathname.split("/").filter(Boolean)[0] || "home"}`;
  const MODERATION_ACTIONS_STORAGE_KEY = "klt:moderationActionsEnabled";
  const SETTINGS_STORAGE_KEY = "klt:settings:v1";
  const FOLLOWED_CHANNELS_SYNC_STORAGE_KEY = "klt:followedChannelsSync:v1";
  const HOVER_GRACE_MS = 450;
  const HOVER_HIDE_DELAY_MS = 160;
  const HOVER_BRIDGE_MARGIN = 6;

  const DEFAULT_MAX_PINNED_POPOVERS = 3;
  const MIN_PINNED_POPOVERS = 1;
  const MAX_PINNED_POPOVERS = 5;
  const FOLLOWED_CHANNELS_RETRY_MS = 30 * 1000;
  const FOLLOWED_CHANNELS_MAX_RETRIES = 3;
  const FOLLOWED_CHANNELS_REFRESH_MS = 10 * 60 * 1000;
  const FOLLOWED_CHANNELS_MAX_PAGES = 5;
  const MAX_BROADCASTER_LIST_USERS = 500;
  const MAX_API_BACKFILL_MESSAGES = 10;
  const PINNED_API_REFRESH_MS = 15 * 1000;
  const PINNED_API_LOOKBACK_WINDOWS = 2;
  const BACKFILL_RETRY_MS = 45 * 1000;
  const TIMESTAMP_CORRECTION_DEBOUNCE_MS = 1800;
  const TIMESTAMP_CORRECTION_MIN_INTERVAL_MS = 7000;
  const TIMESTAMP_CORRECTION_LOOKBACK_WINDOWS = 2;
  const TIMESTAMP_CORRECTION_MAX_PENDING = 80;
  const TIMESTAMP_CORRECTION_MAX_ATTEMPTS = 3;
  const REALTIME_TIMESTAMP_TRUST_DELAY_MS = 8000;
  const REALTIME_TIMESTAMP_MAX_ROWS = 80;
  const WS_ACTIVE_DOM_SCAN_INTERVAL_MS = 8000;
  const WS_ACTIVE_GRACE_MS = 15000;
  const SUSPICIOUS_REPORT_RETRY_MS = 4000;
  const EMOTE_PLACEHOLDER = "[emote]";
  const MASS_REPEAT_MIN_LENGTH = 24;
  const MASS_REPEAT_STRONG_LENGTH = 80;
  const EMOTE_SPAM_MIN_COUNT = 12;
  const EMOTE_SPAM_STRONG_COUNT = 20;
  const BOT_SCORE_THRESHOLD = 60;
  const BOT_RULE_MATCH_THRESHOLD = 2;
  const SUSPICIOUS_EVAL_DEBOUNCE_MS = 1200;
  const COORDINATED_SPAM_WINDOW_MS = 25 * 1000;
  const COORDINATED_SPAM_MIN_USERS = 2;
  const COORDINATED_SPAM_MIN_EVENTS = 3;
  const COORDINATED_SPAM_BUCKET_COOLDOWN_MS = 10 * 1000;
  const COORDINATED_SPAM_MIN_TEXT_LENGTH = 28;
  const COORDINATED_SPAM_MIN_NORMALIZED_LENGTH = 14;
  const BACKFILL_WINDOW_OFFSETS_MINUTES = [
    1, 2, 4, 8, 15, 30, 45, 60, 90, 120, 180, 240
  ];
  const ALERT_ACTIONS = new Set(["notify", "auto-pin", "off"]);
  const DEFAULT_SETTINGS = {
    alertAction: "auto-pin",
    maxPinnedPopovers: DEFAULT_MAX_PINNED_POPOVERS,
    temporaryPopupDuration: 8,
    watchlistEnabled: true,
    ignorelistEnabled: true,
    broadcasterListEnabled: true,
    botDetectionEnabled: true,
    watchlist: [],
    ignorelist: [],
    broadcasterList: []
  };
  const CHAT_PAUSED_PATTERNS = [
    "スクロールのためにチャットが一時停止",
    "チャットが一時停止",
    "chat paused",
    "paused due to scroll",
    "paused while you scroll"
  ];

  const userHistory = new Map();
  const pinnedCards = new Map();
  const autoPinnedUsers = new Set();
  const autoPinDismissedUsers = new Set();
  const notifiedUsers = new Set();
  const broadcasterAvatarCache = new Map();
  const suspiciousUsers = new Map();
  const suspiciousEvalAt = new Map();
  const lastUserAnchors = new Map();
  const apiWindowCache = new Map();
  const pinnedApiCheckingUsers = new Set();
  const userBackfillState = new Map();
  const pendingTimestampCorrections = new Map();
  const coordinatedSpamBuckets = new Map();
  const skipReasonCounts = Object.create(null);
  const skipReasonLastAt = Object.create(null);
  const sourceAcceptedCounts = Object.create(null);
  const sourceDedupedCounts = Object.create(null);
  const apiDebug = {
    attempts: 0,
    contextAttempts: 0,
    timestampCorrectionAttempts: 0,
    lastUrl: "",
    lastStatus: "",
    lastStartTime: "",
    lastError: "",
    lastMessageCount: 0,
    lastAcceptedMessageCount: 0,
    lastResponseShape: "",
    apiMessagesRemembered: 0,
    lastSkippedReason: ""
  };
  const scannedRows = new WeakMap();
  let storageKey = BASE_STORAGE_KEY;
  let streamContext = null;
  let activeChannelSlug = getChannelSlug();
  let saveTimer = 0;
  let activeRow = null;
  let activeUsername = "";
  let activeAnchor = null;
  let activeRowRect = null;
  let activeAnchorRect = null;
  let hoverFrame = 0;
  let pendingHover = null;
  let hideTimer = 0;
  let isPointerOverPopover = false;
  let isTemporaryPopoverActive = false;
  let lastPointer = { x: 0, y: 0 };
  let lastPointerHoverAt = 0;
  let scanInterval = 0;
  let pinnedApiInterval = 0;
  let pinnedApiChecking = false;
  let timestampCorrectionTimer = 0;
  let timestampCorrectionRunning = false;
  let lastTimestampCorrectionAt = 0;
  let realtimeTimestampTrustReadyAt = Date.now() + REALTIME_TIMESTAMP_TRUST_DELAY_MS;
  let lastRealtimeWsMessageAt = 0;
  let realtimeWsMessagesAccepted = 0;
  let realtimeWsMessagesSeen = 0;
  let lastPeriodicDomScanAt = 0;
  let routeResetInProgress = false;
  let pinnedDragState = null;
  let popoverShownAt = 0;
  let suspiciousReportTimer = 0;
  let userSettings = { ...DEFAULT_SETTINGS };
  let followedChannelsSyncTimer = 0;
  let followedChannelsSyncRunning = false;
  let lastFollowedChannelsSyncAt = 0;
  let followedChannelsSyncRetryCount = 0;
  let followedChannelsSyncStatus = createFollowedChannelsSyncStatus("idle", "Kickページを開くと自動読み込みします。");
  let runtimeMessagingInvalidated = false;

  const USERNAME_SELECTOR = [
    "[data-chat-entry-user]",
    "[data-chat-message-user]",
    "[data-testid*='username' i]",
    "[data-testid*='user-name' i]",
    "[data-testid*='chat-user' i]",
    "[data-testid*='sender' i]",
    "[class*='username' i]",
    "[class*='user-name' i]",
    "[class*='chat-user' i]",
    "[class*='chatSender' i]",
    "[class*='sender' i]"
  ].join(",");

  const CLICKABLE_USERNAME_SELECTOR = [
    "a[href]",
    "button",
    "[role='button']",
    "[role='link']"
  ].join(",");

  const ANY_USERNAME_SELECTOR = `${CLICKABLE_USERNAME_SELECTOR},${USERNAME_SELECTOR}`;

  const CHAT_ROOT_SELECTOR = [
    "#chatroom-messages",
    "[data-testid*='chatroom' i]",
    "[data-testid*='chat' i]",
    "[class*='chatroom' i]",
    "[class*='chat' i]"
  ].join(",");

  function normalizeUsername(value) {
    return String(value || "")
      .replace(/^@/, "")
      .trim()
      .toLowerCase();
  }

  function normalizeSourceKey(source) {
    const value = String(source || "").toLowerCase();
    if (value.startsWith("realtime-ws")) return "realtime-ws";
    if (value.startsWith("realtime")) return "realtime";
    if (value.startsWith("dom")) return "dom";
    if (value.startsWith("observed")) return "observed";
    if (value === "api") return "api";
    return value || "unknown";
  }

  function incrementCounter(store, key) {
    store[key] = Number(store[key] || 0) + 1;
  }

  function noteSkipReason(reason, throttleMs = 0) {
    const key = String(reason || "").trim();
    if (!key) return;
    const now = Date.now();
    const lastAt = Number(skipReasonLastAt[key] || 0);
    if (throttleMs > 0 && now - lastAt < throttleMs) return;
    skipReasonLastAt[key] = now;
    incrementCounter(skipReasonCounts, key);
  }

  function getDiagnosticsSnapshot() {
    return {
      skipReasons: { ...skipReasonCounts },
      acceptedBySource: { ...sourceAcceptedCounts },
      dedupedBySource: { ...sourceDedupedCounts }
    };
  }

  function clearObjectCounters(store) {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  }

  function resetDiagnostics() {
    clearObjectCounters(skipReasonCounts);
    clearObjectCounters(skipReasonLastAt);
    clearObjectCounters(sourceAcceptedCounts);
    clearObjectCounters(sourceDedupedCounts);
  }

  function getChannelSlug() {
    const ignored = new Set(["api", "embed", "popout", "video", "videos", "chatroom", "mobile"]);
    const candidates = [
      ...getPathParts(location.pathname),
      ...getParentPathParts(),
      ...getReferrerPathParts()
    ];

    return candidates.find((part) => !ignored.has(part.toLowerCase())) || "";
  }

  function getPathParts(pathname) {
    return String(pathname || "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function getParentPathParts() {
    try {
      if (window.parent && window.parent !== window && window.parent.location?.pathname) {
        return getPathParts(window.parent.location.pathname);
      }
    } catch (_error) {
      return [];
    }

    return [];
  }

  function getReferrerPathParts() {
    try {
      if (!document.referrer) return [];
      const url = new URL(document.referrer);
      if (!url.hostname.endsWith("kick.com")) return [];
      return getPathParts(url.pathname);
    } catch (_error) {
      return [];
    }
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getKickApiHeaders(options = {}) {
    const headers = {
      "Accept": "application/json, text/plain, */*",
      "X-Requested-With": "XMLHttpRequest"
    };

    const xsrfToken = getCookieValue("XSRF-TOKEN");
    if (xsrfToken) headers["X-XSRF-TOKEN"] = xsrfToken;

    if (options.includeAuthToken) {
      const token = getStoredKickAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  function getCookieValue(name) {
    try {
      const prefix = `${encodeURIComponent(name)}=`;
      const match = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
      return match ? decodeURIComponent(match.slice(prefix.length)) : "";
    } catch (_error) {
      return "";
    }
  }

  function getStoredKickAuthToken() {
    const keys = [
      "access_token",
      "accessToken",
      "auth_token",
      "authToken",
      "token",
      "kick_token",
      "kickToken",
      "bearer"
    ];

    for (const storage of getReadableStorages()) {
      for (const key of keys) {
        const token = extractAuthToken(storage.getItem(key));
        if (token) return token;
      }

      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key || !/auth|token|session|kick/i.test(key)) continue;

        const token = extractAuthToken(storage.getItem(key));
        if (token) return token;
      }
    }

    return "";
  }

  function getReadableStorages() {
    const storages = [];

    try {
      if (window.localStorage) storages.push(window.localStorage);
    } catch (_error) {
      // Storage can be blocked in restricted contexts.
    }

    try {
      if (window.sessionStorage) storages.push(window.sessionStorage);
    } catch (_error) {
      // Storage can be blocked in restricted contexts.
    }

    return storages;
  }

  function extractAuthToken(value, depth = 0) {
    if (!value || depth > 3) return "";

    if (typeof value === "string") {
      const text = value.trim().replace(/^["']|["']$/g, "");
      const bearer = text.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
      if (isLikelyAuthToken(bearer)) return bearer;
      if (isLikelyAuthToken(text)) return text;

      if (/^[\[{]/.test(text)) {
        try {
          return extractAuthToken(JSON.parse(text), depth + 1);
        } catch (_error) {
          return "";
        }
      }

      return "";
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const token = extractAuthToken(item, depth + 1);
        if (token) return token;
      }

      return "";
    }

    if (typeof value === "object") {
      const entries = Object.entries(value);
      const preferredEntries = entries.filter(([key]) => !/refresh/i.test(key) && /access.*token|auth.*token|bearer|jwt|token/i.test(key));
      const fallbackEntries = entries.filter(([key]) => !/refresh/i.test(key));
      for (const [, item] of [...preferredEntries, ...fallbackEntries]) {
        const token = extractAuthToken(item, depth + 1);
        if (token) return token;
      }
    }

    return "";
  }

  function isLikelyAuthToken(value) {
    const text = String(value || "").trim();
    return text.length >= 20 &&
      text.length <= 4096 &&
      !/\s/.test(text) &&
      /^[A-Za-z0-9._~+/=-]+$/.test(text);
  }

  function normalizeSettings(value) {
    const settings = value && typeof value === "object" ? value : {};
    const alertAction = ALERT_ACTIONS.has(settings.alertAction)
      ? settings.alertAction
      : DEFAULT_SETTINGS.alertAction;
    const maxPinnedPopovers = clampPinnedLimit(settings.maxPinnedPopovers);

    return {
      alertAction,
      maxPinnedPopovers,
      temporaryPopupDuration: clampTemporaryPopupDuration(settings.temporaryPopupDuration),
      watchlistEnabled: settings.watchlistEnabled !== false,
      ignorelistEnabled: settings.ignorelistEnabled !== false,
      broadcasterListEnabled: settings.broadcasterListEnabled !== false,
      botDetectionEnabled: settings.botDetectionEnabled !== false,
      watchlist: normalizeUsernameList(settings.watchlist),
      ignorelist: normalizeUsernameList(settings.ignorelist),
      broadcasterList: normalizeUsernameList(settings.broadcasterList, MAX_BROADCASTER_LIST_USERS)
    };
  }

  function normalizeUsernameList(values, limit = 200) {
    if (!Array.isArray(values)) return [];

    const seen = new Set();
    const list = [];
    for (const value of values) {
      const username = cleanText(value).replace(/^@/, "");
      if (!looksLikeUsernameToken(username, { allowNumericOnly: true })) continue;
      const key = normalizeUsername(username);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push(key);
    }

    return list.slice(0, limit);
  }

  function getAlertAction() {
    return ALERT_ACTIONS.has(userSettings.alertAction)
      ? userSettings.alertAction
      : DEFAULT_SETTINGS.alertAction;
  }

  function getMaxPinnedPopovers() {
    return clampPinnedLimit(userSettings.maxPinnedPopovers);
  }

  function clampPinnedLimit(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_MAX_PINNED_POPOVERS;
    return Math.min(MAX_PINNED_POPOVERS, Math.max(MIN_PINNED_POPOVERS, Math.round(numeric)));
  }

  function clampTemporaryPopupDuration(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_SETTINGS.temporaryPopupDuration;
    return Math.min(10, Math.max(3, Math.round(numeric)));
  }

  function getTemporaryPopupDuration() {
    return clampTemporaryPopupDuration(userSettings.temporaryPopupDuration);
  }

  function isIgnoredUser(key) {
    return userSettings.ignorelistEnabled && userSettings.ignorelist.includes(key);
  }

  function isWatchlistedUser(key) {
    return userSettings.watchlistEnabled && userSettings.watchlist.includes(key);
  }

  function isBroadcasterListedUser(key) {
    return userSettings.broadcasterListEnabled && userSettings.broadcasterList.includes(key);
  }

  function looksLikeUsername(value) {
    return looksLikeUsernameToken(value);
  }

  function looksLikeUsernameToken(value, options = {}) {
    const text = cleanText(value).replace(/^@/, "");
    if (isNumericOnlyUsername(text) && options.allowNumericOnly !== true) return false;
    return text.length >= 1 && text.length <= 32 && /^[A-Za-z0-9_.-]+$/.test(text);
  }

  function isNumericOnlyUsername(value) {
    return /^\d+$/.test(cleanText(value).replace(/^@/, ""));
  }

  function stripLeadingChatTimestamp(value) {
    return cleanText(value).replace(/^(?:\[\s*)?\d{1,2}:\d{2}(?::\d{2})?(?:\s*\])?\s+/, "");
  }

  function getLabel(element) {
    return cleanText(
      element?.getAttribute("title") ||
      element?.getAttribute("aria-label") ||
      element?.textContent
    );
  }

  function getUsernameValue(element) {
    const fromLink = getUsernameFromProfileLink(element);
    if (fromLink) return fromLink;

    return getLabel(element).replace(/^@/, "");
  }

  function getUsernameFromProfileLink(element) {
    const link = element?.closest?.("a[href]");
    if (!link) return "";

    try {
      const url = new URL(link.getAttribute("href"), location.origin);
      if (!url.hostname.endsWith("kick.com")) return "";

      const parts = getPathParts(url.pathname);
      if (parts.length !== 1) return "";

      const ignored = new Set([
        "about",
        "api",
        "browse",
        "chatroom",
        "communities",
        "dashboard",
        "embed",
        "following",
        "home",
        "login",
        "logout",
        "messages",
        "mobile",
        "popout",
        "search",
        "settings",
        "signup",
        "store",
        "subscriptions",
        "video",
        "videos"
      ]);
      const candidate = parts[0];
      if (ignored.has(candidate.toLowerCase())) return "";

      return looksLikeUsernameToken(candidate, { allowNumericOnly: true }) ? candidate : "";
    } catch (_error) {
      return "";
    }
  }

  function isVisibleElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0";
  }

  function getChatRoots() {
    const exactRoot = document.querySelector("#chatroom-messages");
    if (exactRoot && isVisibleElement(exactRoot)) return [exactRoot];

    const roots = [...document.querySelectorAll(CHAT_ROOT_SELECTOR)]
      .filter((element) => isVisibleElement(element))
      .filter((element) => isLikelyChatContainer(element));

    return roots;
  }

  function getContainingChatRoot(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;

    const exact = element.closest("#chatroom-messages");
    if (exact) return exact;

    const root = element.closest(CHAT_ROOT_SELECTOR);
    return root && isLikelyChatContainer(root) ? root : null;
  }

  function getSearchBoundary(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return document.body;

    return getContainingChatRoot(element) || document.body;
  }

  function isInsideChatArea(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (getContainingChatRoot(element)) return true;

    const exactRoot = document.querySelector("#chatroom-messages");
    if (exactRoot) return exactRoot.contains(element);

    const messageDisplay = findMessageDisplayRoot(element);
    return Boolean(messageDisplay && messageDisplay.contains(element));
  }

  function isLikelyChatContainer(element) {
    if (!element || element.id === "chatroom-messages") return true;

    const rect = element.getBoundingClientRect();
    if (rect.width < 220 || rect.height < 180) return false;

    const sampleTextRows = [...element.querySelectorAll("div, li, p, span")]
      .slice(0, 350)
      .filter((candidate) => parseUsernameMessage(candidate)).length;

    return sampleTextRows >= 3 && !looksLikeNonMessagePanel(element);
  }

  function findMessageDisplayRoot(element) {
    let current = element;

    for (let depth = 0; current && current !== document.documentElement && depth < 12; depth += 1) {
      if (isLikelyMessageDisplay(current)) return current;
      current = current.parentElement;
    }

    return null;
  }

  function isLikelyMessageDisplay(element) {
    if (!element || element.id === "chatroom-messages") return true;
    if (!isVisibleElement(element) || looksLikeNonMessagePanel(element)) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 220 || rect.height < 180) return false;

    const style = window.getComputedStyle(element);
    const canScroll = /(auto|scroll)/.test(`${style.overflowY} ${style.overflow}`) ||
      element.scrollHeight > element.clientHeight + 40;
    if (!canScroll) return false;

    const rows = [...element.querySelectorAll("div, li, p, span")]
      .slice(0, 500)
      .filter((candidate) => {
        if (!isVisibleElement(candidate)) return false;
        const candidateRect = candidate.getBoundingClientRect();
        if (candidateRect.height < 10 || candidateRect.height > 90) return false;
        return Boolean(parseUsernameMessage(candidate));
      });

    return rows.length >= 3;
  }

  function looksLikeNonMessagePanel(element) {
    const text = cleanText(element?.innerText || element?.textContent).toLowerCase();
    if (!text) return false;

    return text.includes("gifted") ||
      text.includes("gifter") ||
      text.includes("ギフト") ||
      text.includes("ギフター") ||
      text.includes("leaderboard") ||
      text.includes("ランキング");
  }

  function getUsernameElement(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return null;

    const clickable = getClickableUsernameElement(root);
    if (clickable) return clickable;

    const candidates = [
      root.matches?.(USERNAME_SELECTOR) ? root : null,
      ...root.querySelectorAll(USERNAME_SELECTOR)
    ].filter(Boolean);

    return candidates.find((element) => isUsableUsernameElement(element)) || null;
  }

  function getClickableUsernameElement(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return null;

    const candidates = [
      root.matches?.(CLICKABLE_USERNAME_SELECTOR) ? root : null,
      ...root.querySelectorAll(CLICKABLE_USERNAME_SELECTOR)
    ].filter(Boolean);

    return candidates.find((element) => {
      if (!isVisibleElement(element)) return false;
      if (!isInsideChatArea(element)) return false;
      if (!isProfileClickTarget(element)) return false;
      return isUsableUsernameElement(element);
    }) || null;
  }

  function isUsableUsernameElement(element) {
    if (!isVisibleElement(element)) return false;
    const username = getUsernameValue(element);
    const allowNumericOnly = Boolean(getUsernameFromProfileLink(element)) ||
      (isNumericOnlyUsername(username) && isExplicitClickableElement(element));
    return looksLikeUsernameToken(username, { allowNumericOnly });
  }

  function isExplicitClickableElement(element) {
    const tagName = element?.tagName?.toLowerCase();
    const role = element?.getAttribute?.("role")?.toLowerCase() || "";
    return tagName === "a" || tagName === "button" || role === "button" || role === "link";
  }

  function isProfileClickTarget(element) {
    if (getUsernameFromProfileLink(element)) return true;

    const clickable = isExplicitClickableElement(element);
    if (!clickable) return false;

    const label = getLabel(element);
    if (!looksLikeUsernameToken(label, { allowNumericOnly: true })) return false;

    const text = cleanText(element.innerText || element.textContent);
    return text === label || text.replace(/^@/, "") === label.replace(/^@/, "");
  }

  function getUsernameData(row) {
    const usernameElement = getUsernameElement(row);
    if (!usernameElement) {
      const parsed = parseUsernameMessage(row);
      if (!parsed) return null;

      return {
        username: parsed.username,
        usernameElement: row
      };
    }

    const username = getUsernameValue(usernameElement);
    const allowNumericOnly = Boolean(getUsernameFromProfileLink(usernameElement)) ||
      (isProfileClickTarget(usernameElement) && isNumericOnlyUsername(username));
    if (!looksLikeUsernameToken(username, { allowNumericOnly })) return null;

    return {
      username,
      usernameElement,
      allowNumericOnly
    };
  }

  function parseUsernameMessage(row) {
    const text = stripLeadingChatTimestamp(row?.innerText || row?.textContent);
    const match = text.match(/^@?([A-Za-z0-9_.-]{1,32})\s*:\s*(.+)$/);
    if (!match) return null;

    const username = match[1];
    const message = cleanText(match[2]);
    if (!looksLikeUsername(username) || !message) return null;

    return {
      username,
      message
    };
  }

  function findLikelyRowFromUsername(usernameElement) {
    if (!isInsideChatArea(usernameElement)) return null;

    const username = getUsernameValue(usernameElement);
    const boundary = getSearchBoundary(usernameElement);
    let current = usernameElement;

    for (let depth = 0; current && current !== boundary.parentElement && depth < 14; depth += 1) {
      const text = cleanText(current.innerText || current.textContent);
      const withoutName = removeUsernameFromText(text, username);
      const rect = current.getBoundingClientRect();

      if (
        current !== usernameElement &&
        includesUsername(text, username) &&
        withoutName.length > 0 &&
        withoutName !== username &&
        rect.width >= 80 &&
        rect.width <= Math.min(window.innerWidth, 900) &&
        rect.height >= 12 &&
        rect.height <= 260
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return usernameElement;
  }

  function includesUsername(text, username) {
    return cleanText(text).toLowerCase().includes(cleanText(username).toLowerCase());
  }

  function findLikelyRowFromTarget(target, pointerX = 0) {
    const element = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
    if (!element) return null;
    if (!isInsideChatArea(element)) return null;

    const boundary = getSearchBoundary(element);

    const directUsername = element.closest?.(CLICKABLE_USERNAME_SELECTOR) || element.closest?.(USERNAME_SELECTOR);
    if (directUsername && isUsableUsernameElement(directUsername) && isProfileClickTarget(directUsername)) {
      const row = findLikelyRowFromUsername(directUsername);
      if (row) return row;
    }

    let current = element;
    for (let depth = 0; current && current !== boundary.parentElement && depth < 14; depth += 1) {
      const usernameElement = getUsernameElement(current);
      const parsed = parseUsernameMessage(current);
      if (usernameElement || parsed) {
        const username = usernameElement ? getUsernameValue(usernameElement) : "";
        const resolvedUsername = parsed?.username || username;
        const pointerOnUsernameElement = usernameElement?.contains(element) || false;
        const pointerOnParsedUsername = parsed && isPointerOnParsedUsername(pointerX, current, resolvedUsername);
        if (!pointerOnUsernameElement && !pointerOnParsedUsername) {
          return null;
        }
        const text = cleanText(current.innerText || current.textContent);
        const withoutName = parsed?.message || removeUsernameFromText(text, resolvedUsername);
        const rect = current.getBoundingClientRect();

        if (
          withoutName.length > 0 &&
          rect.width >= 80 &&
          rect.width <= Math.min(window.innerWidth, 900) &&
          rect.height >= 12 &&
          rect.height <= 260
        ) {
          return current;
        }
      }

      current = current.parentElement;
    }

    const nearbyUsername = findNearbyUsernameElement(element, boundary);
    if (nearbyUsername && nearbyUsername.contains(element)) {
      return findLikelyRowFromUsername(nearbyUsername);
    }

    return null;
  }

  function findNearbyUsernameElement(element, chatRoot) {
    const rect = element.getBoundingClientRect();
    const titleElements = [...chatRoot.querySelectorAll(ANY_USERNAME_SELECTOR)]
      .filter((candidate) => isUsableUsernameElement(candidate));

    return titleElements.find((candidate) => {
      const candidateRect = candidate.getBoundingClientRect();
      const sameLine = Math.abs(candidateRect.top - rect.top) < 28 || Math.abs(candidateRect.bottom - rect.bottom) < 28;
      const beforeTarget = candidateRect.left <= rect.right;
      return sameLine && beforeTarget;
    }) || null;
  }

  function isPointerOnParsedUsername(pointerX, row, username) {
    if (!pointerX || !row || !username) return false;

    const rect = row.getBoundingClientRect();
    const style = window.getComputedStyle(row);
    const font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`;
    const usernameWidth = measureTextWidth(username, font);
    const colonPadding = 10;
    const startX = rect.left + parseFloat(style.paddingLeft || "0");
    const endX = Math.min(startX + usernameWidth + colonPadding, rect.right);

    return pointerX >= startX && pointerX <= endX;
  }

  function measureTextWidth(text, font) {
    const canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    return context.measureText(text).width;
  }

  function extractMessageText(row, username, usernameElement = null) {
    const afterUsernameText = normalizeMessageContent(
      removeLeadingBadgeText(getRichTextAfterElement(row, usernameElement))
    );
    if (afterUsernameText) return afterUsernameText;

    const explicitMessage = row.querySelector(
      "[data-testid*='message' i], [class*='message' i], [class*='content' i], [dir='auto']"
    );

    if (explicitMessage && (!usernameElement || !explicitMessage.contains(usernameElement))) {
      const richMessageText = normalizeMessageContent(removeUsernameFromText(getRichText(explicitMessage), username));
      if (richMessageText) return richMessageText;
    }

    const parsed = parseUsernameMessage(row);
    if (parsed?.username && normalizeUsername(parsed.username) === normalizeUsername(username)) {
      const richParsedText = removeUsernameFromText(getRichText(row), username);
      return normalizeMessageContent(richParsedText || parsed.message);
    }

    return normalizeMessageContent(removeLeadingBadgeText(removeUsernameFromText(getRichText(row), username)));
  }

  function getRichText(root) {
    const parts = [];
    appendRichTextNode(root, parts);
    return cleanText(parts.filter(Boolean).join(" "));
  }

  function getRichTextAfterElement(root, marker) {
    if (!root || !marker || root === marker || !root.contains?.(marker)) return "";

    const parts = [];
    let afterMarker = false;

    function visitUntilMarker(node) {
      if (node === marker) {
        afterMarker = true;
        return;
      }

      if (afterMarker) {
        appendRichTextNode(node, parts);
        return;
      }

      for (const child of node.childNodes || []) {
        visitUntilMarker(child);
      }
    }

    visitUntilMarker(root);
    return cleanText(parts.filter(Boolean).join(" "));
  }

  function appendRichTextNode(node, parts) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || "");
      return;
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.DOCUMENT_NODE) {
      for (const child of node.childNodes || []) appendRichTextNode(child, parts);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node;
    if (!isVisibleElement(element)) return;

    const tagName = element.tagName?.toLowerCase();
    if (tagName === "img" || tagName === "svg" || tagName === "picture") {
      parts.push(getMediaText(element));
      return;
    }

    if (element.getAttribute("role") === "img") {
      parts.push(getMediaText(element));
      return;
    }

    for (const child of element.childNodes) {
      appendRichTextNode(child, parts);
    }
  }

  function getMediaText(element) {
    const emoteContainer = element.closest("[data-emote-id]") || element.querySelector("[data-emote-id]") || element;
    const emoteId = emoteContainer.getAttribute("data-emote-id") || element.getAttribute("data-emote-id") || "";
    const emoteName = cleanText(
      emoteContainer.getAttribute("data-emote-name") ||
      element.getAttribute("data-emote-name") ||
      element.getAttribute("alt") ||
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.getAttribute("data-name") ||
      element.getAttribute("data-tooltip") ||
      ""
    );
    if (emoteId && emoteName) return `[emote:${emoteId}:${emoteName}]`;
    const normalized = normalizeEmoteLabel(emoteName || cleanText(
      element.getAttribute("alt") || element.getAttribute("aria-label") || element.getAttribute("title") || ""
    ));
    return normalized || EMOTE_PLACEHOLDER;
  }

  function normalizeEmoteLabel(value) {
    const text = cleanText(value)
      .replace(/^:|:$/g, "")
      .replace(/^emote\s*:?\s*/i, "")
      .replace(/^emoji\s*:?\s*/i, "");
    if (!text) return "";
    if (/^[a-f0-9-]{12,}$/i.test(text) || /^\d{4,}$/.test(text)) return EMOTE_PLACEHOLDER;
    return `:${text}:`;
  }

  function normalizeMessageContent(value) {
    return cleanText(value)
      .replace(/(?:\[emote\]\s*){2,}/g, (match) => match.trim().replace(/\s+/g, " "))
      .replace(/^(\[emote\]\s*)+/, "")
      .replace(/(\s*\[emote\])+$/, "")
      .trim();
  }

  function removeLeadingBadgeText(value) {
    let text = cleanText(value);
    const badgePattern = /^[:：]?\s*\d+\s*(?:months?|か月|ヶ月|カ月)\s*(?:チャンネル登録者|subscriber|subscribed|sub)\s*[:：]?\s*(?:\[emote\]\s*)?/i;

    for (let index = 0; index < 3; index += 1) {
      const next = cleanText(text.replace(badgePattern, ""));
      if (next === text) break;
      text = next;
    }

    return cleanText(text.replace(/^[:：]\s*/, ""));
  }

  function removeUsernameFromText(text, username) {
    let result = cleanText(text);
    if (!result) return "";

    const patterns = [
      new RegExp(`^@?${escapeRegExp(username)}\\s*:?\\s*`, "i"),
      new RegExp(`@?${escapeRegExp(username)}\\s*:?\\s*`, "i")
    ];

    for (const pattern of patterns) {
      result = result.replace(pattern, "");
    }

    return cleanText(result);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeTimestampKind(value) {
    return value === "posted" ? "posted" : "observed";
  }

  function getMessageTimestampKind(message) {
    if (message?.timestampKind) return normalizeTimestampKind(message.timestampKind);
    if (message?.source === "api" || message?.correctedTimestamp) return "posted";
    return "observed";
  }

  function rememberMessage(username, text, timestamp = Date.now(), messageId = "", source = "", timestampKind = "") {
    const messageSource = source || (messageId ? "api" : "dom");
    const sourceKey = normalizeSourceKey(messageSource);
    const allowNumericOnly = messageSource === "api" || isTrustedNumericMessageSource(messageSource);
    const key = normalizeUsername(username);
    if (!key || !text || !looksLikeUsernameToken(username, { allowNumericOnly })) return false;

    if (streamContext?.startedAt && timestamp < streamContext.startedAt) return false;
    const resolvedTimestampKind = normalizeTimestampKind(timestampKind || (messageSource === "api" ? "posted" : ""));

    const existing = userHistory.get(key) || {
      displayName: username,
      messages: []
    };

    existing.displayName = username;
    const duplicate = findDuplicateMessage(existing.messages, text, timestamp, messageId, messageSource);

    if (!duplicate) {
      incrementCounter(sourceAcceptedCounts, sourceKey);
      existing.messages.unshift({
        id: messageId,
        text,
        timestamp,
        source: messageSource,
        timestampKind: resolvedTimestampKind
      });
    } else {
      incrementCounter(sourceDedupedCounts, sourceKey);
      noteSkipReason(`duplicate:${sourceKey}`);

      if (isTrustedPostedMessageSource(messageSource) && getMessageTimestampKind(duplicate) === "observed") {
        duplicate.id = duplicate.id || messageId;
        duplicate.timestamp = timestamp;
        duplicate.source = messageSource;
        duplicate.timestampKind = "posted";
        duplicate.correctedTimestamp = true;
      } else if (getMessageSourcePriority(messageSource) > getMessageSourcePriority(duplicate.source)) {
        duplicate.id = duplicate.id || messageId;
        duplicate.timestamp = timestamp;
        duplicate.source = messageSource;
        duplicate.timestampKind = resolvedTimestampKind;
      } else if (messageId && !duplicate.id) {
        duplicate.id = messageId;
        duplicate.timestampKind = duplicate.timestampKind || getMessageTimestampKind(duplicate);
      }
    }

    if (!duplicate || isTrustedPostedMessageSource(messageSource)) {
      existing.messages.sort((a, b) => b.timestamp - a.timestamp);
      existing.messages = existing.messages.slice(0, MAX_MESSAGES);
    }

    userHistory.delete(key);
    userHistory.set(key, existing);
    pruneUsers();
    scheduleSave();
    if (!duplicate || isTrustedPostedMessageSource(messageSource)) refreshActivePopover(key);
    if (!duplicate) {
      handleListedUserCandidate(key, existing.displayName, messageSource);
    }
    if (shouldRunSuspiciousEvaluation(key, messageSource, resolvedTimestampKind, !duplicate)) {
      handleSuspiciousUserCandidate(key, existing.displayName, messageSource, resolvedTimestampKind);
    }
    trackCoordinatedSpamCandidate(key, existing.displayName, text, timestamp, messageSource, resolvedTimestampKind, !duplicate);
    return !duplicate;
  }

  function trackCoordinatedSpamCandidate(key, username, text, timestamp, messageSource, timestampKind, isNewMessage) {
    if (!isNewMessage) return;
    if (!isRealtimeSource(messageSource)) return;
    if (normalizeTimestampKind(timestampKind) !== "posted") return;
    if (getAlertAction() === "off") return;
    if (userSettings.botDetectionEnabled === false) return;
    if (isIgnoredUser(key)) return;

    const rawText = cleanText(text);
    if (rawText.length < COORDINATED_SPAM_MIN_TEXT_LENGTH) return;

    const normalized = normalizeMessageForRisk(rawText);
    if (!normalized || normalized.length < COORDINATED_SPAM_MIN_NORMALIZED_LENGTH) return;

    const repetition = analyzeInternalRepetition(rawText);
    const emoteCount = countEmoteLikeTokens(rawText);
    if (!repetition.strong && emoteCount < 6) return;

    const now = Number(timestamp) || Date.now();
    const bucket = coordinatedSpamBuckets.get(normalized) || {
      events: [],
      lastTriggeredAt: 0
    };

    bucket.events.push({
      key,
      username,
      timestamp: now,
      text: rawText
    });
    bucket.events = bucket.events.filter((event) => now - event.timestamp <= COORDINATED_SPAM_WINDOW_MS);

    coordinatedSpamBuckets.set(normalized, bucket);
    pruneCoordinatedSpamBuckets(now);

    const uniqueUsers = new Map();
    for (const event of bucket.events) {
      if (!uniqueUsers.has(event.key)) uniqueUsers.set(event.key, event.username);
    }

    if (uniqueUsers.size < COORDINATED_SPAM_MIN_USERS) return;
    if (bucket.events.length < COORDINATED_SPAM_MIN_EVENTS) return;
    if (now - Number(bucket.lastTriggeredAt || 0) < COORDINATED_SPAM_BUCKET_COOLDOWN_MS) return;

    bucket.lastTriggeredAt = now;
    const reason = "複数アカウント同一文連投";
    const action = getAlertAction();
    for (const [userKey, userName] of uniqueUsers.entries()) {
      if (isIgnoredUser(userKey)) continue;
      const history = userHistory.get(userKey);
      rememberDetectedUser(userKey, userName, [reason], history?.messages || [], {
        riskScore: 72,
        riskRuleCount: 2,
        riskCritical: false
      });
      runAlertAction(userKey, userName, action, [reason]);
    }
  }

  function pruneCoordinatedSpamBuckets(now = Date.now()) {
    for (const [pattern, bucket] of coordinatedSpamBuckets.entries()) {
      bucket.events = (bucket.events || []).filter((event) => now - event.timestamp <= COORDINATED_SPAM_WINDOW_MS);
      if (!bucket.events.length && now - Number(bucket.lastTriggeredAt || 0) > COORDINATED_SPAM_BUCKET_COOLDOWN_MS) {
        coordinatedSpamBuckets.delete(pattern);
      }
    }

    while (coordinatedSpamBuckets.size > MAX_USERS * 3) {
      const oldestKey = coordinatedSpamBuckets.keys().next().value;
      coordinatedSpamBuckets.delete(oldestKey);
    }
  }

  function shouldRunSuspiciousEvaluation(key, messageSource, timestampKind, isNewMessage) {
    if (!String(messageSource || "").startsWith("realtime")) return false;
    if (normalizeTimestampKind(timestampKind) !== "posted") return false;

    const now = Date.now();
    const lastAt = suspiciousEvalAt.get(key) || 0;
    const minInterval = isNewMessage ? 200 : SUSPICIOUS_EVAL_DEBOUNCE_MS;
    if (now - lastAt < minInterval) {
      noteSkipReason("suspicious_eval_skipped:debounced", 1500);
      return false;
    }

    suspiciousEvalAt.set(key, now);
    while (suspiciousEvalAt.size > MAX_USERS) {
      const oldestKey = suspiciousEvalAt.keys().next().value;
      suspiciousEvalAt.delete(oldestKey);
    }
    return true;
  }

  function isTrustedNumericMessageSource(source) {
    return source === "realtime-ws" || /-profile$/.test(String(source || ""));
  }

  function isTrustedPostedMessageSource(source) {
    return source === "api" || source === "realtime-ws";
  }

  function findDuplicateMessage(messages, text, timestamp, messageId, messageSource) {
    if (messageId) {
      const matchingId = messages.find((message) => message.id === messageId);
      if (matchingId) return matchingId;
    }

    const sameText = messages.filter((message) => message.text === text);
    if (!sameText.length) return null;

    const sourcePriority = getMessageSourcePriority(messageSource);
    for (const message of sameText) {
      if (messageId && message?.id && message.id !== messageId) {
        // Distinct message IDs with same text should be kept as separate posts.
        continue;
      }
      const tolerance = getDuplicateToleranceMs(message, messageSource);
      if (Math.abs(message.timestamp - timestamp) > tolerance) continue;

      const existingPriority = getMessageSourcePriority(message.source);
      if (existingPriority >= sourcePriority) return message;
      if (getMessageTimestampKind(message) === "observed") return message;
    }

    return findNearestMessage(sameText.filter((message) => {
      if (messageId && message?.id && message.id !== messageId) return false;
      return Math.abs(message.timestamp - timestamp) < getDuplicateToleranceMs(message, messageSource);
    }), timestamp);
  }

  function getDuplicateToleranceMs(existingMessage, newSource) {
    if (newSource === "api" || newSource === "realtime-ws" || existingMessage?.source === "api" || existingMessage?.source === "realtime-ws") {
      return 15000;
    }

    return 2500;
  }

  function getMessageSourcePriority(source) {
    if (source === "realtime-ws") return 3;
    if (source === "api") return 2;
    if (String(source || "").startsWith("dom")) return 1;
    return 0;
  }

  function findNearestMessage(messages, timestamp) {
    return messages
      .slice()
      .sort((a, b) => Math.abs(a.timestamp - timestamp) - Math.abs(b.timestamp - timestamp))[0] || null;
  }

  function pruneUsers() {
    while (userHistory.size > MAX_USERS) {
      const oldestKey = userHistory.keys().next().value;
      userHistory.delete(oldestKey);
    }
  }

  function scanRow(row, options = {}) {
    if (!row) return null;

    const user = getUsernameData(row);
    if (!user) return null;

    rememberUserAnchor(user.username, row, user.usernameElement || row);
    const messageText = extractMessageText(row, user.username, user.usernameElement);
    if (!messageText || messageText === user.username) return null;

    const signature = `${normalizeUsername(user.username)}:${messageText}`;
    if (scannedRows.get(row) === signature) return null;
    scannedRows.set(row, signature);

    const postedTimestamp = getDomMessageTimestamp(row);
    const timestamp = postedTimestamp || Date.now();
    const trustRealtimeTimestamp = !postedTimestamp && options.trustRealtimeTimestamp === true;
    const timestampKind = postedTimestamp || trustRealtimeTimestamp ? "posted" : "observed";
    const sourceSuffix = user.allowNumericOnly ? "-profile" : "";
    const source = postedTimestamp
      ? `dom${sourceSuffix}`
      : trustRealtimeTimestamp
        ? `realtime${sourceSuffix}`
        : `observed${sourceSuffix}`;
    rememberMessage(user.username, messageText, timestamp, "", source, timestampKind);
    if (!postedTimestamp && !trustRealtimeTimestamp) queueTimestampCorrection(user.username, messageText, timestamp);

    return {
      ...user,
      messageText,
      timestamp,
      timestampKind,
      source
    };
  }

  function rememberUserAnchor(username, row, anchor) {
    const key = normalizeUsername(username);
    if (!key || !row || !anchor) return;

    lastUserAnchors.set(key, {
      row,
      anchor,
      updatedAt: Date.now()
    });

    if (lastUserAnchors.size > MAX_USERS) {
      const oldestKey = lastUserAnchors.keys().next().value;
      lastUserAnchors.delete(oldestKey);
    }
  }

  function getDomMessageTimestamp(row) {
    if (!row || row.nodeType !== Node.ELEMENT_NODE) return 0;

    const selectors = [
      "time[datetime]",
      "[datetime]",
      "[data-created-at]",
      "[data-created-at-time]",
      "[data-timestamp]",
      "[data-time]",
      "[data-sent-at]",
      "[data-created]"
    ];

    for (const selector of selectors) {
      const element = row.matches?.(selector) ? row : row.querySelector?.(selector);
      const timestamp = getTimestampFromElement(element);
      if (timestamp) return timestamp;
    }

    for (const element of [row, ...row.querySelectorAll?.("*") || []]) {
      const timestamp = getTimestampFromElement(element);
      if (timestamp) return timestamp;
    }

    return 0;
  }

  function getTimestampFromElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return 0;

    const attributes = [
      "datetime",
      "data-created-at",
      "data-created-at-time",
      "data-timestamp",
      "data-time",
      "data-sent-at",
      "data-created",
      "data-message-created-at"
    ];

    for (const attribute of attributes) {
      const timestamp = parseKickDate(element.getAttribute(attribute));
      if (timestamp) return timestamp;
    }

    const tagName = element.tagName?.toLowerCase();
    if (tagName === "time" || tagName === "abbr") {
      const timestamp = parseKickDate(element.getAttribute("title") || element.textContent);
      if (timestamp) return timestamp;
    }

    return 0;
  }

  function scanPage() {
    for (const chatRoot of getChatRoots()) {
      const usernameElements = [...chatRoot.querySelectorAll(ANY_USERNAME_SELECTOR)]
        .filter((element) => isUsableUsernameElement(element));

      for (const usernameElement of usernameElements) {
        const row = findLikelyRowFromUsername(usernameElement);
        if (row) scanRow(row);
      }

      scanTextRows(chatRoot);
    }
  }

  function periodicRefresh() {
    handlePossibleChannelChange();
    if (shouldRunPeriodicDomScan()) scanPage();
    closeStaleHoverPopover();
    if (suspiciousUsers.size > 0) scheduleSuspiciousUsersReport(SUSPICIOUS_REPORT_RETRY_MS);
  }

  function shouldRunPeriodicDomScan() {
    if (shouldPreferRealtimeWsIngestion()) {
      noteSkipReason("dom_scan_skipped:ws_active", 2000);
      return false;
    }
    const now = Date.now();
    const interval = 2000;
    if (now - lastPeriodicDomScanAt < interval) return false;

    lastPeriodicDomScanAt = now;
    return true;
  }

  function shouldPreferRealtimeWsIngestion() {
    return hasRecentRealtimeWsMessage();
  }

  function hasRecentRealtimeWsMessage() {
    return lastRealtimeWsMessageAt > 0 && Date.now() - lastRealtimeWsMessageAt < WS_ACTIVE_GRACE_MS;
  }

  function handlePossibleChannelChange() {
    const nextSlug = getChannelSlug();
    if (!nextSlug || nextSlug === activeChannelSlug || routeResetInProgress) return;
    resetForChannelChange(nextSlug);
  }

  function isChatPaused() {
    const roots = getChatRoots();
    const sources = roots.length ? roots : [document.body];

    return sources.some((source) => {
      const text = cleanText(source?.innerText || source?.textContent).toLowerCase();
      return CHAT_PAUSED_PATTERNS.some((pattern) => text.includes(pattern));
    });
  }

  function scanTextRows(root) {
    if (!isLikelyChatContainer(root)) return;

    const candidates = [...root.querySelectorAll("div, li, p, span")]
      .filter((element) => {
        if (!isVisibleElement(element)) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width < 80 || rect.height < 10 || rect.height > 80) return false;
        return Boolean(parseUsernameMessage(element));
      });

    for (const candidate of candidates) {
      scanRow(candidate);
    }
  }

  function createPopover() {
    const popover = document.createElement("div");
    popover.className = "kch-popover";
    popover.hidden = true;
    document.documentElement.appendChild(popover);
    return popover;
  }

  const popover = createPopover();

  window.__KICK_CHAT_HISTORY_HOVER__ = {
    version: "2.58.1",
    getChatRootCount: () => getChatRoots().length,
    getKnownUsers: () => [...userHistory.values()].map((value) => ({
      username: value.displayName,
      messages: value.messages.length
    })),
    getSuspiciousUsers: () => getSuspiciousUserList(),
    getStatus: () => ({
      chatRoots: getChatRoots().length,
      knownUsers: userHistory.size,
      activeRow: Boolean(activeRow),
      activeChannelSlug,
      frame: window.top === window ? "top" : "child",
      streamContext,
      apiWindows: apiWindowCache.size,
      pinnedApiChecking,
      pinnedApiUsers: [...pinnedCards.keys()],
      websocket: {
        active: hasRecentRealtimeWsMessage(),
        messagesSeen: realtimeWsMessagesSeen,
        messagesAccepted: realtimeWsMessagesAccepted,
        lastMessageAt: lastRealtimeWsMessageAt
      },
      followedChannelsSync: {
        enabled: userSettings.broadcasterListEnabled,
        running: followedChannelsSyncRunning,
        lastSyncedAt: lastFollowedChannelsSyncAt,
        broadcasterListSize: userSettings.broadcasterList.length,
        status: followedChannelsSyncStatus
      },
      chatPaused: isChatPaused(),
      apiDebug,
      diagnostics: getDiagnosticsSnapshot()
    }),
    backfillUser: backfillUserHistory,
    retryBackfill: (username) => {
      userBackfillState.delete(normalizeUsername(username));
      return backfillUserHistory(username);
    },
    getBackfillState: (username) => userBackfillState.get(normalizeUsername(username)) || null,
    scanNow: scanPage,
    setModerationActionsEnabled: (enabled) => {
      setModerationActionsEnabled(Boolean(enabled));
      refreshAllPopovers();
    }
  };
  installRuntimeMessageListener();
  sendSuspiciousUsersReset();

  function renderPopover(username, anchor) {
    renderPopoverContent(popover, username, false);
    popover.hidden = false;
    popoverShownAt = Date.now();
    rememberActiveGeometry();
    positionPopover(anchor);
  }

  function renderPopoverContent(targetPopover, username, pinned) {
    const key = normalizeUsername(username);
    const history = userHistory.get(key);
    const messages = history?.messages || [];
    const displayName = history?.displayName || username;
    const previousList = targetPopover.querySelector(".kch-popover__list");
    const wasNearBottom = !previousList ||
      previousList.scrollHeight - previousList.scrollTop - previousList.clientHeight < 24;

    targetPopover.innerHTML = `
      <div class="kch-popover__header">
        <div class="kch-popover__identity">
          <div class="kch-popover__name">
            <button class="kch-popover__name-text" type="button"></button>
            <button class="kch-popover__pin" type="button"></button>
          </div>
        </div>
        <div class="kch-popover__actions">
          <button class="kch-popover__mod kch-popover__mod--timeout" type="button" title="10分タイムアウト command を入力"></button>
          <button class="kch-popover__mod kch-popover__mod--ban" type="button" title="BAN command を入力"></button>
          <button class="kch-popover__close" type="button" title="閉じる">×</button>
        </div>
      </div>
      <div class="kch-popover__list"></div>
    `;

    const risk = shouldShowRiskMarker(key) ? assessAccountRisk(messages) : { suspicious: false, reasons: [] };
    const nameElement = targetPopover.querySelector(".kch-popover__name");
    const nameButton = targetPopover.querySelector(".kch-popover__name-text");
    nameButton.textContent = displayName;
    nameButton.title = `${displayName} のKickページを開く`;
    nameButton.setAttribute("aria-label", `${displayName} のKickページを開く`);
    if (risk.suspicious) {
      const riskCategory = getDetectionCategory(risk.reasons);
      const marker = document.createElement("span");
      marker.className = `kch-popover__risk kch-popover__risk--${riskCategory}`;
      marker.textContent = getDetectionIcon(risk.reasons);
      marker.title = `検出理由: ${risk.reasons.join(" / ")} | score ${risk.score} (${risk.matchedRules}条件)`;
      nameElement.appendChild(marker);
    }
    if (pinnedApiCheckingUsers.has(key)) {
      const refresh = document.createElement("span");
      refresh.className = "kch-popover__refresh";
      refresh.title = "固定ユーザーの過去コメントをAPIで補完中";
      refresh.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 11a8 8 0 0 0-14.7-4.4L3 9"></path>
          <path d="M3 4v5h5"></path>
          <path d="M4 13a8 8 0 0 0 14.7 4.4L21 15"></path>
          <path d="M21 20v-5h-5"></path>
        </svg>
      `;
    nameElement.appendChild(refresh);
    }
    const pinButton = targetPopover.querySelector(".kch-popover__pin");
    pinButton.innerHTML = getPinIcon(pinned);
    pinButton.title = pinned ? "固定済み" : "ピン留め";
    pinButton.setAttribute("aria-label", pinned ? "固定済み" : "ピン留め");
    pinButton.disabled = pinned;
    targetPopover.classList.toggle("kch-popover--pinned", pinned);
    targetPopover.dataset.usernameKey = key;
    const canModerate = hasModerationAccess();
    const timeoutButton = targetPopover.querySelector(".kch-popover__mod--timeout");
    const banButton = targetPopover.querySelector(".kch-popover__mod--ban");
    timeoutButton.innerHTML = getActionIcon("timeout");
    banButton.innerHTML = getActionIcon("ban");
    timeoutButton.hidden = !canModerate;
    banButton.hidden = !canModerate;

    const list = targetPopover.querySelector(".kch-popover__list");
    const state = userBackfillState.get(key);
    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "kch-popover__empty";
      const message = state?.failed
        ? `APIから取得できませんでした。${state.reason ? ` (${state.reason})` : ""}`
        : state?.reason && !state?.loading
          ? state.reason
        : "コメント履歴を読み込み中...";
      empty.innerHTML = `
        <span class="kch-popover__spinner" aria-hidden="true"></span>
        <span></span>
      `;
      empty.querySelector("span:last-child").textContent = message;
      list.appendChild(empty);
    } else {
      for (const message of [...messages].reverse()) {
        const item = document.createElement("div");
        item.className = "kch-popover__item";

        const meta = document.createElement("div");
        meta.className = "kch-popover__meta";
        renderMessageTime(meta, message);

        const text = document.createElement("div");
        text.className = "kch-popover__text";
        text.innerHTML = renderMessageWithEmotes(message.text);

        item.append(meta, text);
        list.appendChild(item);
      }

      if (state?.loading) {
        const loading = document.createElement("div");
        loading.className = "kch-popover__loading-more";
        loading.innerHTML = `
          <span class="kch-popover__spinner" aria-hidden="true"></span>
          <span>過去コメントを取得中.</span>
        `;
        list.appendChild(loading);
      }
    }

    if (!pinned || wasNearBottom) {
      list.scrollTop = list.scrollHeight;
      window.requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight;
      });
    }

  }

  function shouldShowRiskMarker(key) {
    return getAlertAction() !== "off" && userSettings.botDetectionEnabled !== false && !isIgnoredUser(key);
  }

  function positionPopover(anchor) {
    const rect = anchor.getBoundingClientRect();
    const margin = 10;
    const gap = 2;

    popover.style.left = "0px";
    popover.style.top = "0px";

    const popoverRect = popover.getBoundingClientRect();
    const alignRect = getPopoverAlignmentRect(anchor) || rect;
    let left = alignRect.left;
    let top = rect.bottom + gap;

    if (left + popoverRect.width > window.innerWidth - margin) {
      left = window.innerWidth - popoverRect.width - margin;
    }

    if (top + popoverRect.height > window.innerHeight - margin) {
      top = rect.top - popoverRect.height - gap;
    }

    setPopoverPosition(left, top);
  }

  function getPopoverAlignmentRect(anchor) {
    const chatRoot = getContainingChatRoot(anchor) || getContainingChatRoot(activeRow);
    if (!chatRoot || !isVisibleElement(chatRoot)) return null;
    return chatRoot.getBoundingClientRect();
  }

  function setPopoverPosition(left, top) {
    const margin = 10;
    const rect = popover.getBoundingClientRect();
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const clampedLeft = Math.min(Math.max(margin, left), maxLeft);
    const clampedTop = Math.min(Math.max(margin, top), maxTop);

    popover.style.left = `${clampedLeft}px`;
    popover.style.top = `${clampedTop}px`;

  }

  function hidePopover() {
    clearTimeout(hideTimer);
    isTemporaryPopoverActive = false;
    activeRow = null;
    activeUsername = "";
    activeAnchor = null;
    activeRowRect = null;
    activeAnchorRect = null;
    isPointerOverPopover = false;
    popover.hidden = true;
  }

  function scheduleHidePopover(delay = HOVER_HIDE_DELAY_MS) {
    if (isTemporaryPopoverActive) return;
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (isPointerInsideActiveHoverZone()) return;
      if (Date.now() - popoverShownAt < HOVER_GRACE_MS) {
        scheduleHidePopover(HOVER_GRACE_MS - (Date.now() - popoverShownAt));
        return;
      }
      hidePopover();
    }, Math.max(HOVER_HIDE_DELAY_MS, delay));
  }

  function closeStaleHoverPopover() {
    if (!activeRow || popover.hidden || isPointerOverPopover) return;
    if (isTemporaryPopoverActive) return;

    if (isPointerInsideActiveHoverZone()) return;
    if (Date.now() - popoverShownAt < HOVER_GRACE_MS) return;

    hidePopover();
  }

  function isPointerInsideActiveHoverZone() {
    if (isPointerOverPopover) return true;

    const target = document.elementFromPoint(lastPointer.x, lastPointer.y);
    if (target instanceof Node && popover.contains(target)) return true;
    if (target instanceof Node && activeRow?.contains(target)) return true;
    if (target instanceof Node && activeAnchor?.contains?.(target)) return true;

    return isPointerInsideElement(activeAnchor, lastPointer.x, lastPointer.y, 4) ||
      isPointerInsideElement(activeRow, lastPointer.x, lastPointer.y, 4) ||
      isPointInsideRect(activeAnchorRect, lastPointer.x, lastPointer.y, 8) ||
      isPointInsideRect(activeRowRect, lastPointer.x, lastPointer.y, 8) ||
      isPointerInsidePopoverBridge();
  }

  function isPointerInsidePopoverBridge() {
    if (popover.hidden || !activeAnchorRect) return false;
    if (Date.now() - popoverShownAt > HOVER_GRACE_MS) return false;

    const popoverRect = popover.getBoundingClientRect();
    if (popoverRect.width <= 0 || popoverRect.height <= 0) return false;

    const sourceRect = activeRowRect || activeAnchorRect;
    const left = Math.min(sourceRect.left, popoverRect.left) - HOVER_BRIDGE_MARGIN;
    const right = Math.max(sourceRect.right, popoverRect.right) + HOVER_BRIDGE_MARGIN;
    const top = Math.min(sourceRect.top, popoverRect.top) - HOVER_BRIDGE_MARGIN;
    const bottom = Math.max(sourceRect.bottom, popoverRect.bottom) + HOVER_BRIDGE_MARGIN;

    return lastPointer.x >= left &&
      lastPointer.x <= right &&
      lastPointer.y >= top &&
      lastPointer.y <= bottom;
  }

  function isPointerInsideElement(element, x, y, tolerance = 0) {
    if (!element || !x || !y || !document.documentElement.contains(element)) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return isPointInsideRect(rect, x, y, tolerance);
  }

  function isPointInsideRect(rect, x, y, tolerance = 0) {
    if (!rect || !x || !y) return false;
    return x >= rect.left - tolerance &&
      x <= rect.right + tolerance &&
      y >= rect.top - tolerance &&
      y <= rect.bottom + tolerance;
  }

  function rememberActiveGeometry() {
    activeRowRect = getElementRectSnapshot(activeRow);
    activeAnchorRect = getElementRectSnapshot(activeAnchor);
  }

  function getElementRectSnapshot(element) {
    if (!element || !document.documentElement.contains(element)) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  function togglePinned() {
    if (!activeUsername) return;
    pinUser(activeUsername);
  }

  function pinUser(username, options = {}) {
    const key = normalizeUsername(username);
    if (!key) return false;
    const auto = options.auto === true;
    if (!auto) autoPinDismissedUsers.delete(key);

    if (pinnedCards.has(key)) {
      const existing = pinnedCards.get(key);
      existing.element.hidden = false;
      existing.element.style.zIndex = String(2147483647);
      return true;
    }

    const maxPinned = getMaxPinnedPopovers();
    if (pinnedCards.size >= maxPinned) {
      if (!auto) showPopoverNotice(`固定できるのは最大${maxPinned}人までです。`);
      return false;
    }

    clearTimeout(hideTimer);
    const card = createPopover();
    card.hidden = false;
    card.style.visibility = "hidden";
    card.classList.add("kch-popover--pinned");

    const index = pinnedCards.size;
    pinnedCards.set(key, {
      element: card,
      username,
      position: { left: 10, top: 10 },
      autoPinned: auto
    });
    attachPinnedCardEvents(card);
    renderPinnedCard(key);
    const position = getInitialPinnedPosition(card, index, auto);
    pinnedCards.get(key).position = position;
    setElementPosition(card, position.left, position.top, key);
    card.style.visibility = "";
    if (auto) {
      card.classList.add("kch-popover--auto-pinned");
      window.setTimeout(() => {
        card.classList.remove("kch-popover--auto-pinned");
      }, 520);
    }
    updatePinnedApiRefresh();
    fetchPinnedApiUpdates();
    if (!auto) {
      window.setTimeout(() => backfillUserHistory(username), 0);
    }
    if (!auto) closeHoverPopover();
    return true;
  }

  function getInitialPinnedPosition(card, index, auto) {
    const cardRect = card.getBoundingClientRect();
    const cardWidth = cardRect.width || 254;
    const cardHeight = cardRect.height || 220;
    const offset = index * 18;

    if (auto) {
      const chatRoot = getChatRoots()[0];
      const chatRect = chatRoot?.getBoundingClientRect();
      if (chatRect && chatRect.width > 0 && chatRect.height > 0) {
        const leftOfChat = chatRect.left - cardWidth - 12;
        return {
          left: leftOfChat >= 10 ? leftOfChat - offset : window.innerWidth - cardWidth - 14 - offset,
          top: Math.min(chatRect.top + 48 + offset, window.innerHeight - cardHeight - 10)
        };
      }

      return {
        left: window.innerWidth - cardWidth - 14 - offset,
        top: 76 + offset
      };
    }

    const sourceRect = !popover.hidden ? popover.getBoundingClientRect() : null;
    if (sourceRect && sourceRect.width > 0 && sourceRect.height > 0) {
      return {
        left: Math.min(sourceRect.left + offset, window.innerWidth - cardWidth - 10),
        top: Math.min(sourceRect.top + offset, window.innerHeight - cardHeight - 10)
      };
    }

    return {
      left: window.innerWidth - cardWidth - 14 - offset,
      top: 76 + offset
    };
  }

  function handleSuspiciousUserCandidate(key, username, messageSource, timestampKind) {
    if (routeResetInProgress) return;
    const action = getAlertAction();
    if (action === "off") return;
    if (userSettings.botDetectionEnabled === false) return;
    if (isIgnoredUser(key)) return;
    if (!isRealtimeSource(messageSource)) return;
    if (normalizeTimestampKind(timestampKind) !== "posted") return;

    const history = userHistory.get(key);
    const risk = assessAccountRisk(history?.messages || []);
    if (!risk.suspicious) return;

    rememberDetectedUser(key, username, risk.reasons, history?.messages || [], {
      riskScore: risk.score,
      riskRuleCount: risk.matchedRules,
      riskCritical: risk.critical
    });
    runAlertAction(key, username, action, risk.reasons);
  }

  function isRealtimeSource(source) {
    return String(source || "").startsWith("realtime");
  }

  function handleListedUserCandidate(key, username, messageSource) {
    if (routeResetInProgress) return;
    if (getAlertAction() === "off") return;
    if (isIgnoredUser(key)) return;
    if (!String(messageSource || "").startsWith("dom") && !String(messageSource || "").startsWith("realtime")) return;

    const reasons = [];
    if (isWatchlistedUser(key)) reasons.push("ウォッチリスト");
    if (isBroadcasterListedUser(key)) reasons.push("配信者リスト");
    if (!reasons.length) return;

    const history = userHistory.get(key);
    rememberDetectedUser(key, username, reasons, history?.messages || []);
    runAlertAction(key, username, getAlertAction(), reasons);
  }

  function rememberDetectedUser(key, username, reasons, messages, metadata = {}) {
    const existing = suspiciousUsers.get(key);
    const postedMessages = messages
      .filter((message) => message?.text && message?.timestamp)
      .filter((message) => getMessageTimestampKind(message) === "posted")
      .sort((a, b) => b.timestamp - a.timestamp);
    const latestMessage = postedMessages[0] || null;
    const now = Date.now();
    const mergedReasons = [
      ...new Set([
        ...(existing?.reasons || []),
        ...reasons
      ])
    ];
    const detectionCategory = getDetectionCategory(mergedReasons);

    suspiciousUsers.set(key, {
      username,
      profileUrl: getKickProfileUrl(username),
      avatarUrl: existing?.avatarUrl || "",
      detectionCategory,
      reasons: mergedReasons,
      riskScore: Math.max(Number(existing?.riskScore) || 0, Number(metadata.riskScore) || 0),
      riskRuleCount: Math.max(Number(existing?.riskRuleCount) || 0, Number(metadata.riskRuleCount) || 0),
      riskCritical: Boolean(existing?.riskCritical || metadata.riskCritical),
      firstDetectedAt: existing?.firstDetectedAt || now,
      lastDetectedAt: now,
      lastCommentAt: latestMessage?.timestamp || now,
      messageCount: postedMessages.length,
      lastMessage: cleanText(latestMessage?.text || "").slice(0, 180)
    });

    if (detectionCategory === "broadcaster") {
      scheduleBroadcasterAvatarHydration(key, username);
    }

    scheduleSuspiciousUsersReport(350);
  }

  function scheduleBroadcasterAvatarHydration(key, username) {
    if (!key) return;

    const cached = broadcasterAvatarCache.get(key);
    if (typeof cached === "string" && cached) {
      const current = suspiciousUsers.get(key);
      if (current && current.avatarUrl !== cached) {
        current.avatarUrl = cached;
        scheduleSuspiciousUsersReport(120);
      }
      return;
    }

    if (cached === null) return;

    fetchBroadcasterAvatar(username).then((url) => {
      if (!url) return;
      const current = suspiciousUsers.get(key);
      if (!current) return;
      if (getDetectionCategory(current.reasons || []) !== "broadcaster") return;
      if (current.avatarUrl === url) return;
      current.avatarUrl = url;
      scheduleSuspiciousUsersReport(120);
    }).catch(() => {
      // Keep existing detection entry even if avatar fetching fails.
    });
  }

  function runAlertAction(key, username, action = getAlertAction(), reasons = []) {
    if (action === "off") return;

    if (action === "notify") {
      if (notifiedUsers.has(key)) return;
      notifiedUsers.add(key);
      const reasonLabel = Array.isArray(reasons) && reasons.length
        ? reasons.join(" / ")
        : "検出";
      try {
        sendRuntimeMessage({
          type: "KLT_SHOW_NOTIFICATION",
          username: String(username),
          channelSlug: activeChannelSlug || getChannelSlug() || "",
          reasonLabel
        });
      } catch (error) {
        if (isContextInvalidatedError(error)) {
          runtimeMessagingInvalidated = true;
        }
      }
      return;
    }

    if (pinnedCards.has(key) || autoPinnedUsers.has(key) || autoPinDismissedUsers.has(key)) return;

    if (action === "auto-pin") {
      const duration = getTemporaryPopupDuration();
      if (duration === 0) {
        if (pinnedCards.size >= getMaxPinnedPopovers()) return;
        if (pinUser(username, { auto: true })) {
          autoPinnedUsers.add(key);
        }
      } else {
        showTemporaryAlertPopover(key, username, duration);
      }
    }
  }

  function showTemporaryAlertPopover(key, username, durationSec) {
    const anchorInfo = lastUserAnchors.get(key);
    const anchor = anchorInfo?.anchor;
    const row = anchorInfo?.row;
    if (!anchor || !row || !document.documentElement.contains(anchor) || !document.documentElement.contains(row)) return;

    clearTimeout(hideTimer);
    isTemporaryPopoverActive = true;
    activeRow = row;
    activeUsername = username;
    activeAnchor = anchor;
    renderPopover(username, anchor);
    const ms = Math.max(1000, (durationSec || getTemporaryPopupDuration()) * 1000);
    hideTimer = window.setTimeout(() => {
      isTemporaryPopoverActive = false;
      if (isPointerOverPopover || activeRow?.matches?.(":hover")) return;
      hidePopover();
    }, ms);
  }

  function getKickProfileUrl(username) {
    return `${API_ORIGIN}/${encodeURIComponent(String(username || "").replace(/^@/, ""))}`;
  }

  function getDetectionIcon(reasons) {
    const category = getDetectionCategory(reasons);
    if (category === "threat") return "🔪";
    if (category === "privacy") return "👤";
    if (category === "watch") return "★";
    if (category === "broadcaster") return "📺";
    if (category === "bot") return "🤖";
    return "💀";
  }

  function getDetectionCategory(reasons) {
    const values = Array.isArray(reasons) ? reasons : [];
    if (values.some((reason) => /殺害|危害|暴力|脅迫/.test(reason))) return "threat";
    if (values.some((reason) => /個人情報|住所|電話番号|メール/.test(reason))) return "privacy";
    if (values.some((reason) => /ウォッチリスト/.test(reason))) return "watch";
    if (values.some((reason) => /配信者リスト/.test(reason))) return "broadcaster";
    if (values.length) return "bot";
    return "default";
  }

  function getSuspiciousUserList() {
    return [...suspiciousUsers.values()]
      .sort((a, b) => b.lastDetectedAt - a.lastDetectedAt)
      .map((user) => ({
        ...user,
        reasons: [...user.reasons]
      }));
  }

  function getSuspiciousReportPayload() {
    return {
      channelSlug: activeChannelSlug || streamContext?.slug || getChannelSlug(),
      pageUrl: location.href,
      updatedAt: Date.now(),
      users: getSuspiciousUserList()
    };
  }

  function scheduleSuspiciousUsersReport(delay = 350) {
    if (suspiciousReportTimer) return;
    suspiciousReportTimer = window.setTimeout(() => {
      suspiciousReportTimer = 0;
      sendSuspiciousUsersReport();
    }, delay);
  }

  function sendSuspiciousUsersReport() {
    sendRuntimeMessage({
      type: "KLT_SUSPICIOUS_USERS_UPDATED",
      payload: getSuspiciousReportPayload()
    });
  }

  function sendSuspiciousUsersReset() {
    sendRuntimeMessage({ type: "KLT_SUSPICIOUS_USERS_RESET" });
  }

  function sendRuntimeMessage(message, attempt = 0) {
    if (!hasRuntimeMessaging()) return;

    try {
      chrome.runtime.sendMessage(message, () => {
        const error = getRuntimeLastError();
        if (error && isContextInvalidatedError(error)) {
          runtimeMessagingInvalidated = true;
          return;
        }
        if (error && attempt < 2) {
          window.setTimeout(() => sendRuntimeMessage(message, attempt + 1), 1000);
        }
      });
    } catch (error) {
      if (isContextInvalidatedError(error)) {
        runtimeMessagingInvalidated = true;
        return;
      }
      if (attempt < 2) {
        window.setTimeout(() => sendRuntimeMessage(message, attempt + 1), 1000);
      }
    }
  }

  function hasRuntimeMessaging() {
    if (runtimeMessagingInvalidated) return false;
    try {
      return Boolean(globalThis.chrome?.runtime?.id && globalThis.chrome?.runtime?.sendMessage);
    } catch (_error) {
      return false;
    }
  }

  function getRuntimeLastError() {
    try {
      return chrome.runtime.lastError || null;
    } catch (_error) {
      runtimeMessagingInvalidated = true;
      return null;
    }
  }

  function isContextInvalidatedError(error) {
    const text = String(error?.message || error || "");
    return /Extension context invalidated/i.test(text);
  }

  function installRuntimeMessageListener() {
    if (!hasRuntimeMessaging()) return;

    try {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!message || typeof message !== "object") return false;

        if (message.type === "KLT_GET_SUSPICIOUS_USERS") {
          sendResponse({
            ok: true,
            report: getSuspiciousReportPayload()
          });
          return true;
        }

        if (message.type === "KLT_CLEAR_SUSPICIOUS_USERS") {
          suspiciousUsers.clear();
          clearTimeout(suspiciousReportTimer);
          suspiciousReportTimer = 0;
          sendSuspiciousUsersReport();
          sendResponse({
            ok: true,
            report: getSuspiciousReportPayload()
          });
          return true;
        }

        if (message.type === "KLT_PIN_USER") {
          const username = cleanText(message.username || "").replace(/^@/, "");
          if (!looksLikeUsernameToken(username, { allowNumericOnly: true })) {
            sendResponse({
              ok: false,
              reason: "アカウントIDを確認できませんでした。"
            });
            return true;
          }

          const ok = pinUser(username, { fromPopup: true });
          if (ok) backfillUserHistory(username);
          sendResponse({
            ok,
            reason: ok ? "" : `固定できるのは最大${getMaxPinnedPopovers()}人までです。`
          });
          return true;
        }

        if (message.type === "KLT_GET_PAGE_CREDENTIALS") {
          try {
            const xsrf = getCookieValue("XSRF-TOKEN") || "";
            const token = getStoredKickAuthToken() || "";
            sendResponse({ ok: true, xsrf, token });
          } catch (e) {
            sendResponse({ ok: false, error: String(e) });
          }
          return true;
        }

        return false;
      });
    } catch (_error) {
      // Runtime messaging is optional for unpacked reloads.
    }
  }

  function installRealtimeWsBridge() {
    window.addEventListener("message", handleRealtimeWsBridgeMessage);
    requestRealtimeWsBuffer();
  }

  function requestRealtimeWsBuffer() {
    try {
      window.postMessage({
        source: "KLT_CONTENT_BRIDGE",
        type: "KLT_REQUEST_WS_BUFFER"
      }, location.origin);
    } catch (_error) {
      // The bridge is optional; DOM fallback remains available.
    }
  }

  function handleRealtimeWsBridgeMessage(event) {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== "KLT_WS_BRIDGE") return;

    if (data.type === "KLT_WS_BUFFER" && Array.isArray(data.payload)) {
      for (const payload of data.payload) {
        rememberRealtimeWsMessage(payload);
      }
      return;
    }

    if (data.type === "KLT_WS_CHAT_MESSAGE") {
      rememberRealtimeWsMessage(data.payload);
    }
  }

  function rememberRealtimeWsMessage(payload) {
    if (!payload || typeof payload !== "object") return false;

    realtimeWsMessagesSeen += 1;
    const username = cleanText(payload.username || payload.sender?.username || payload.sender?.slug).replace(/^@/, "");
    const text = getRealtimeWsMessageText(payload);
    const timestamp = parseKickDate(payload.createdAt || payload.created_at || payload.sentAt || payload.timestamp) || Date.now();
    const messageId = String(
      payload.msgId ||
      payload.id ||
      payload.messageId ||
      payload.message_id ||
      payload.uuid ||
      (payload.kltSeq ? `klt-ws-${payload.kltSeq}` : "")
    );
    if (!username || !text) return false;

    lastRealtimeWsMessageAt = Date.now();
    const remembered = rememberMessage(username, text, timestamp, messageId, "realtime-ws", "posted");
    if (remembered) {
      realtimeWsMessagesAccepted += 1;
      clearBackfillNoResultState(username);
    }

    return remembered;
  }

  function getRealtimeWsMessageText(payload) {
    const contentText = stringifyApiContent(
      payload.content ??
      payload.message ??
      payload.text ??
      payload.body ??
      ""
    );
    const emoteText = stringifyRealtimeWsEmotes(payload.emotes);
    return normalizeMessageContent(contentText || emoteText);
  }

  function stringifyRealtimeWsEmotes(value) {
    const emotes = Array.isArray(value) ? value : value ? [value] : [];
    return emotes
      .map((emote) => {
        const id = cleanText(
          emote?.id ||
          emote?.emote_id ||
          emote?.emoteId ||
          emote?.kick_id ||
          ""
        );
        const name = cleanText(
          emote?.name ||
          emote?.slug ||
          emote?.code ||
          emote?.text ||
          emote?.label ||
          ""
        );
        if (id && name) return `[emote:${id}:${name}]`;
        return normalizeEmoteLabel(name) || EMOTE_PLACEHOLDER;
      })
      .filter(Boolean)
      .join(" ");
  }

  function clearBackfillNoResultState(username) {
    const key = normalizeUsername(username);
    const state = userBackfillState.get(key);
    if (!state?.reason && !state?.failed) return;

    userBackfillState.set(key, {
      loading: false,
      failed: false,
      done: false,
      reason: "",
      lastAttemptAt: state.lastAttemptAt || 0
    });
  }

  function getVisibleFollowingUsernames() {
    const usernames = new Map();

    for (const label of getFollowingLabelElements()) {
      const labelRect = label.getBoundingClientRect();
      const root = getFollowingSearchRoot(label);
      const bottom = getFollowingSectionBottom(label, root);

      for (const link of root.querySelectorAll("a[href]")) {
        if (!isVisibleElement(link)) continue;
        const rect = link.getBoundingClientRect();
        if (rect.bottom <= labelRect.bottom || rect.top >= bottom) continue;

        rememberVisibleFollowingUsername(usernames, link);
      }
    }

    if (!usernames.size) {
      collectSidebarFollowingUsernames(usernames);
    }

    // If still empty, try regex-based scan of page HTML as last resort.
    if (!usernames.size) {
      try {
        const regexUsernames = extractUsernamesByRegex();
        for (const u of regexUsernames) {
          const key = normalizeUsername(u);
          if (!key) continue;
          usernames.set(key, u);
        }
      } catch (_e) {
        // ignore
      }
    }

    return [...usernames.keys()].slice(0, MAX_BROADCASTER_LIST_USERS);
  }

  function rememberVisibleFollowingUsername(usernames, link) {
    const username = getUsernameFromProfileLink(link);
    const key = normalizeUsername(username);
    if (!key) return;
    if (!looksLikeUsernameToken(username, { allowNumericOnly: true })) return;
    usernames.set(key, username);
  }

  function collectSidebarFollowingUsernames(usernames) {
    const roots = [...document.querySelectorAll("aside,nav,[class*='sidebar' i],[class*='side-bar' i],[data-testid*='sidebar' i]")]
      .filter((element) => isVisibleElement(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < Math.min(420, window.innerWidth * 0.45) &&
          rect.width <= 520 &&
          rect.height >= 160 &&
          /フォロー中|following/i.test(cleanText(element.innerText || element.textContent));
      });

    for (const root of roots) {
      const labels = getFollowingLabelElements().filter((label) => root.contains(label));
      for (const label of labels) {
        const labelRect = label.getBoundingClientRect();
        const bottom = getFollowingSectionBottom(label, root);
        for (const link of root.querySelectorAll("a[href]")) {
          if (!isVisibleElement(link)) continue;
          const rect = link.getBoundingClientRect();
          if (rect.bottom <= labelRect.bottom || rect.top >= bottom) continue;
          rememberVisibleFollowingUsername(usernames, link);
        }
      }
    }
  }

  function getFollowingLabelElements() {
    return [...document.querySelectorAll("h1,h2,h3,h4,h5,span,div,p,button,a,[role='heading']")]
      .filter((element) => {
        if (!isVisibleElement(element)) return false;
        const text = cleanText(element.innerText || element.textContent);
        if (!text || text.length > 80) return false;
        return /フォロー中|following/i.test(text);
      });
  }

  // Fallback: scan page HTML with regex to find candidate usernames and profile links.
  function extractUsernamesByRegex() {
    const html = document.documentElement.innerHTML || "";
    const results = new Set();
    const ignored = new Set([
      "about","api","browse","chatroom","communities","dashboard","embed","following","home","login","logout","messages","mobile","popout","search","settings","signup","store","subscriptions","video","videos"
    ]);

    // Match profile-like hrefs: /username or https://kick.com/username
    const hrefRx = /(?:https?:\/\/(?:www\.)?kick\.com|href=)\s*["']?\/?([A-Za-z0-9_.-]{1,32})["'\/>\s]/gi;
    let m;
    while ((m = hrefRx.exec(html))) {
      const candidate = m[1];
      if (!candidate) continue;
      if (ignored.has(candidate.toLowerCase())) continue;
      if (looksLikeUsernameToken(candidate, { allowNumericOnly: true })) results.add(candidate);
    }

    // Match @username occurrences
    const atRx = /@([A-Za-z0-9_.-]{1,32})/g;
    while ((m = atRx.exec(html))) {
      const candidate = m[1];
      if (!candidate) continue;
      if (ignored.has(candidate.toLowerCase())) continue;
      if (looksLikeUsernameToken(candidate, { allowNumericOnly: true })) results.add(candidate);
    }

    return [...results].slice(0, MAX_BROADCASTER_LIST_USERS);
  }

  function getFollowingSearchRoot(label) {
    let current = label;
    let best = label.parentElement || document.body;

    for (let depth = 0; current && current !== document.documentElement && depth < 10; depth += 1) {
      if (current.querySelectorAll?.("a[href]").length > 0) {
        best = current;
      }

      const rect = current.getBoundingClientRect?.();
      if (rect && rect.height > window.innerHeight * 0.45 && rect.width <= 520) {
        return current;
      }

      current = current.parentElement;
    }

    return best || document.body;
  }

  function getFollowingSectionBottom(label, root) {
    const labelRect = label.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect?.() || {
      bottom: window.innerHeight
    };
    const stopPatterns = /おすすめ|recommended|suggested|popular|browse/i;
    const candidates = [...root.querySelectorAll("h1,h2,h3,h4,h5,span,div,p,button")]
      .filter((element) => {
        if (element === label || !isVisibleElement(element)) return false;
        const text = cleanText(element.innerText || element.textContent);
        if (!text || text.length > 50 || !stopPatterns.test(text)) return false;
        const rect = element.getBoundingClientRect();
        return rect.top > labelRect.bottom && Math.abs(rect.left - labelRect.left) < 180;
      })
      .map((element) => element.getBoundingClientRect().top)
      .sort((a, b) => a - b);

    return candidates[0] || rootRect.bottom || window.innerHeight;
  }

  // Auto-scroll helper: scrolls a following-list root to load items and collects usernames
  // Increased defaults for larger lists: longer wait and more scroll attempts.
  const FOLLOWED_CHANNELS_AUTO_SCROLL_MS = 1200; // wait between scrolls
  const FOLLOWED_CHANNELS_SCROLL_STEPS = 20; // number of full-scroll attempts
  const FOLLOWED_CHANNELS_SCROLL_STEP_PX = 1200; // incremental small scroll to trigger lazy loading

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function autoScrollAndCollect(root) {
    if (!root || !root.querySelectorAll) return [];

    const seen = new Set();
    const collectFromRoot = () => {
      for (const link of root.querySelectorAll("a[href]")) {
        if (!isVisibleElement(link)) continue;
        const username = getUsernameFromProfileLink(link);
        if (!username) continue;
        const key = normalizeUsername(username);
        if (!key) continue;
        seen.add(username);
      }
    };

    collectFromRoot();

    let lastSize = seen.size;
    for (let i = 0; i < FOLLOWED_CHANNELS_SCROLL_STEPS; i += 1) {
      try {
        root.scrollTop = root.scrollHeight;
      } catch (_e) {
        try { window.scrollTo(0, document.body.scrollHeight); } catch (_e2) {}
      }

      await delay(FOLLOWED_CHANNELS_AUTO_SCROLL_MS);
      collectFromRoot();
      if (seen.size > lastSize) {
        lastSize = seen.size;
        continue;
      }

      // try a small incremental scroll to trigger lazy load
      try { root.scrollBy(0, FOLLOWED_CHANNELS_SCROLL_STEP_PX); } catch (_e) { try { window.scrollBy(0, FOLLOWED_CHANNELS_SCROLL_STEP_PX); } catch (_e2) {} }
      await delay(Math.round(FOLLOWED_CHANNELS_AUTO_SCROLL_MS / 2));
      collectFromRoot();
      if (seen.size > lastSize) {
        lastSize = seen.size;
        continue;
      }

      // as a last attempt, perform a short up-and-down jitter to encourage lazy loading
      try { root.scrollTop = Math.max(0, root.scrollTop - 200); } catch (_e) {}
      await delay(200);
      try { root.scrollTop = root.scrollHeight; } catch (_e) {}
      await delay(300);
      collectFromRoot();
      if (seen.size > lastSize) {
        lastSize = seen.size;
        continue;
      }

      // no more new items — break
      break;
    }

    return [...seen].slice(0, MAX_BROADCASTER_LIST_USERS);
  }

  function isMaybeLoggedIn() {
    const loginLink = document.querySelector('a[href*="/login"]');
    if (loginLink && isVisibleElement(loginLink)) return false;
    if (getStoredKickAuthToken()) return true;
    const cookieNames = ["access_token", "accessToken", "__session", "kick_session"];
    for (const name of cookieNames) {
      if (getCookieValue(name)) return true;
    }
    return true;
  }

  function scheduleFollowedChannelsSync(delay = 0) {
    clearTimeout(followedChannelsSyncTimer);
    if (!userSettings.broadcasterListEnabled) {
      updateFollowedChannelsSyncStatus("disabled", "配信者リストがOFFです。");
      return;
    }

    followedChannelsSyncTimer = window.setTimeout(() => {
      followedChannelsSyncTimer = 0;
      syncFollowedChannels();
    }, delay);
  }

  async function syncFollowedChannels() {
    if (!userSettings.broadcasterListEnabled || followedChannelsSyncRunning) return;
    if (Date.now() - lastFollowedChannelsSyncAt < FOLLOWED_CHANNELS_REFRESH_MS) return;

    followedChannelsSyncRunning = true;
    let succeeded = false;
    await updateFollowedChannelsSyncStatus("running", "フォロー中チャンネルを読み込み中...");
    try {
      const apiResult = await fetchFollowedChannelUsernames();

      // If API probe failed (unauthenticated or blocked), fall back to visible UI scraping.
      if (apiResult.reason) {
        // keep the reason for status but continue to attempt visible scraping
        await updateFollowedChannelsSyncStatus("running", `API probe: ${apiResult.reason}`);
      }

      const visibleUsernames = getVisibleFollowingUsernames();
      const usernames = normalizeUsernameList(
        (Array.isArray(apiResult.usernames) && apiResult.usernames.length) ? apiResult.usernames : visibleUsernames,
        MAX_BROADCASTER_LIST_USERS
      );

      if (!usernames.length) {
        const reason = apiResult.reason || "フォロー中チャンネルが見つかりませんでした。";
        await updateFollowedChannelsSyncStatus("failed", reason);
        return;
      }

      const result = await mergeBroadcasterList(usernames);
      succeeded = true;
      followedChannelsSyncRetryCount = 0;
      await updateFollowedChannelsSyncStatus("success", "", {
        addedCount: result.addedCount,
        listCount: result.listCount,
        // Ensure totalCount is never less than the merged list count to avoid display inconsistencies
        totalCount: Math.max(Number(apiResult.totalCount) || 0, visibleUsernames.length || 0, result.listCount || 0),
        source: (Array.isArray(apiResult.usernames) && apiResult.usernames.length) ? apiResult.source || "Kick API" : "表示中のフォロー中欄"
      });
    } finally {
      followedChannelsSyncRunning = false;
      lastFollowedChannelsSyncAt = succeeded ? Date.now() : 0;
      if (!succeeded && userSettings.broadcasterListEnabled && followedChannelsSyncRetryCount < FOLLOWED_CHANNELS_MAX_RETRIES) {
        followedChannelsSyncRetryCount += 1;
        scheduleFollowedChannelsSync(FOLLOWED_CHANNELS_RETRY_MS);
      }
    }
  }

  async function fetchFollowedChannelUsernames() {
    if (!isMaybeLoggedIn()) {
      return { usernames: [], reason: "現在KICKにログインされていません。", loginRequired: true, source: "" };
    }

    const result = await racePromise(fetchFollowedChannelsViaPageContext(), 30000);
    if (result && result.usernames && result.usernames.length) {
      return {
        usernames: result.usernames,
        totalCount: result.totalCount || result.usernames.length,
        reason: "",
        loginRequired: false,
        source: result.source || "kick-api-v2"
      };
    }

    const reason = result?.reason || "フォロー中チャンネルが見つかりませんでした。";
    const loginRequired = result?.loginRequired === true;
    return { usernames: [], reason, loginRequired, source: "" };
  }

  function racePromise(promise, ms) {
    return Promise.race([
      promise,
      new Promise((resolve) => setTimeout(() => resolve(null), ms))
    ]);
  }

  async function fetchFollowedChannelsViaPageContext() {
    const token = getSessionTokenFromCookie();
    if (!token) {
      const loginLink = document.querySelector('a[href*="/login"]');
      const needsLogin = !!(loginLink && loginLink.offsetParent !== null);
      return { usernames: [], reason: needsLogin ? "ログインが必要です" : "session_tokenが見つかりません", loginRequired: needsLogin };
    }

    const usernames = [];
    const seen = new Set();
    let cursor = 0;

    try {
      while (true) {
        const url = `${API_ORIGIN}/api/v2/channels/followed-page?cursor=${cursor}`;
        const resp = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
            "x-app-platform": "web"
          },
          credentials: "include"
        });

        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            return { usernames: [], reason: "ログインが必要です", loginRequired: true };
          }
          return { usernames: [], reason: `API error: ${resp.status}`, loginRequired: false };
        }

        const data = await resp.json();
        const channels = data.channels || [];

        for (const ch of channels) {
          const slug = ch.channel_slug || ch.slug || ch.username || "";
          if (slug && /^[a-z0-9_.-]{1,32}$/i.test(slug)) {
            const normalized = slug.replace(/^@/, "").trim().toLowerCase();
            if (!seen.has(normalized)) {
              seen.add(normalized);
              usernames.push(normalized);
            }
          }
        }

        if (!data.nextCursor || channels.length === 0) break;
        cursor = data.nextCursor;
      }

      return {
        usernames,
        totalCount: usernames.length,
        reason: "",
        loginRequired: false,
        source: "kick-api-v2"
      };
    } catch (err) {
      return { usernames: [], reason: `通信エラー: ${err.message}`, loginRequired: false };
    }
  }

  function getSessionTokenFromCookie() {
    try {
      const match = document.cookie.match(/(?:^|;\s*)session_token=([^;]*)/);
      if (!match) return "";
      return decodeURIComponent(match[1]);
    } catch (_e) {
      return "";
    }
  }

  function extractFollowedChannelUsernames(data) {
    const items = getFollowedChannelItems(data);
    const usernames = [];

    for (const item of items) {
      const username = getFollowedItemUsername(item);
      if (looksLikeUsernameToken(username, { allowNumericOnly: true })) usernames.push(username);
    }

    return usernames;
  }

  function getFollowedItemUsername(item) {
    const sources = [
      item?.node,
      item?.channel,
      item?.streamer,
      item?.user,
      item?.broadcaster,
      item?.creator,
      item?.livestream?.channel,
      item?.livestream?.user,
      item?.stream?.channel,
      item?.stream?.user,
      item
    ].filter(Boolean);

    for (const source of sources) {
      const username = cleanText(
        source.slug ||
        source.username ||
        source.user_name ||
        source.userName ||
        source.channel_slug ||
        source.channelSlug ||
        source.channel_username ||
        source.channelUsername ||
        source.user?.username ||
        source.user?.slug ||
        source.channel?.username ||
        source.channel?.slug ||
        source.broadcaster_user?.username ||
        source.broadcaster_user?.slug ||
        source.broadcasterUser?.username ||
        source.broadcasterUser?.slug ||
        ""
      ).replace(/^@/, "");
      if (looksLikeUsernameToken(username, { allowNumericOnly: true })) return username;
    }

    return "";
  }

  function getFollowedChannelItems(data) {
    if (Array.isArray(data)) return normalizeFollowedItems(data);
    if (!data || typeof data !== "object") return [];

    const candidates = [
      data.channels,
      data.channel,
      data.followed_channels,
      data.followedChannels,
      data.following,
      data.followings,
      data.data,
      data.data?.channels,
      data.data?.channel,
      data.data?.followed_channels,
      data.data?.followedChannels,
      data.data?.following,
      data.data?.followings,
      data.data?.data,
      data.data?.items,
      data.data?.results,
      data.data?.edges,
      data.data?.nodes,
      data.results,
      data.items,
      data.edges,
      data.nodes,
      data.livestreams
    ];

    const direct = candidates.find((value) => Array.isArray(value));
    if (direct) return normalizeFollowedItems(direct);

    return findFollowedItemsDeep(data);
  }

  function normalizeFollowedItems(items) {
    return items
      .map((item) => item?.node || item)
      .filter(Boolean);
  }

  function findFollowedItemsDeep(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 4) return [];

    if (Array.isArray(value)) {
      const items = normalizeFollowedItems(value);
      return items.some((item) => getFollowedItemUsername(item)) ? items : [];
    }

    const preferredEntries = Object.entries(value)
      .filter(([key]) => /follow|channel|streamer|user|data|item|edge|node/i.test(key));
    const entries = preferredEntries.length ? preferredEntries : Object.entries(value);

    for (const [, child] of entries) {
      const result = findFollowedItemsDeep(child, depth + 1);
      if (result.length) return result;
    }

    return [];
  }

  async function mergeBroadcasterList(usernames) {
    const beforeCount = userSettings.broadcasterList.length;
    const merged = normalizeUsernameList([
      ...userSettings.broadcasterList,
      ...usernames
    ], MAX_BROADCASTER_LIST_USERS);
    if (merged.length === userSettings.broadcasterList.length) {
      return {
        addedCount: 0,
        listCount: merged.length
      };
    }

    userSettings = normalizeSettings({
      ...userSettings,
      broadcasterListEnabled: true,
      broadcasterList: merged
    });
    await writeExtensionStorage(SETTINGS_STORAGE_KEY, userSettings);
    reevaluateListedUsersFromHistory();
    return {
      addedCount: Math.max(0, merged.length - beforeCount),
      listCount: merged.length
    };
  }

  function createFollowedChannelsSyncStatus(state, reason = "", extra = {}) {
    return {
      state,
      reason,
      updatedAt: Date.now(),
      pageUrl: location.href,
      channelSlug: getChannelSlug(),
      listCount: userSettings.broadcasterList?.length || 0,
      addedCount: 0,
      source: "",
      ...extra
    };
  }

  async function updateFollowedChannelsSyncStatus(state, reason = "", extra = {}) {
    followedChannelsSyncStatus = createFollowedChannelsSyncStatus(state, reason, extra);
    await writeExtensionStorage(FOLLOWED_CHANNELS_SYNC_STORAGE_KEY, followedChannelsSyncStatus);
  }

  function showPopoverNotice(message) {
    const list = popover.querySelector(".kch-popover__list");
    if (!list) return;

    const existing = list.querySelector(".kch-popover__notice");
    existing?.remove();

    const notice = document.createElement("div");
    notice.className = "kch-popover__notice";
    notice.textContent = message;
    list.prepend(notice);

    window.setTimeout(() => {
      notice.remove();
    }, 2400);
  }

  function attachPinnedCardEvents(card) {
    card.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const key = card.dataset.usernameKey || "";

      if (target.closest(".kch-popover__mod--timeout")) {
        event.preventDefault();
        if (!hasModerationAccess()) return;
        applyModerationCommand(key, "timeout");
        return;
      }

      if (target.closest(".kch-popover__mod--ban")) {
        event.preventDefault();
        if (!hasModerationAccess()) return;
        applyModerationCommand(key, "ban");
        return;
      }

      if (target.closest(".kch-popover__name-text")) {
        event.preventDefault();
        openKickProfile(key);
        return;
      }

      if (target.closest(".kch-popover__close")) {
        event.preventDefault();
        closePinnedCard(key);
      }
    });

    card.addEventListener("pointerdown", (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("button")) return;
      if (!event.target.closest(".kch-popover__header")) return;

      const rect = card.getBoundingClientRect();
      pinnedDragState = {
        element: card,
        key: card.dataset.usernameKey || "",
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      card.setPointerCapture?.(event.pointerId);
      card.classList.add("kch-popover--dragging");
      event.preventDefault();
    });

    card.addEventListener("pointermove", (event) => {
      if (!pinnedDragState || pinnedDragState.element !== card || pinnedDragState.pointerId !== event.pointerId) return;
      setElementPosition(card, event.clientX - pinnedDragState.offsetX, event.clientY - pinnedDragState.offsetY, pinnedDragState.key);
    });

    card.addEventListener("pointerup", (event) => {
      if (!pinnedDragState || pinnedDragState.element !== card || pinnedDragState.pointerId !== event.pointerId) return;
      pinnedDragState = null;
      card.releasePointerCapture?.(event.pointerId);
      card.classList.remove("kch-popover--dragging");
    });

    card.addEventListener("pointercancel", () => {
      pinnedDragState = null;
      card.classList.remove("kch-popover--dragging");
    });
  }

  function closePinnedCard(usernameOrKey) {
    const key = normalizeUsername(usernameOrKey);
    const card = pinnedCards.get(key);
    if (!card) return;
    card.element.remove();
    pinnedCards.delete(key);
    autoPinnedUsers.delete(key);
    autoPinDismissedUsers.add(key);
    updatePinnedApiRefresh();
  }

  function closeAllPinnedCards() {
    for (const card of pinnedCards.values()) {
      card.element.remove();
    }
    pinnedCards.clear();
    autoPinnedUsers.clear();
    updatePinnedApiRefresh();
  }

  function renderPinnedCard(key) {
    const card = pinnedCards.get(key);
    if (!card) return;
    renderPopoverContent(card.element, card.username, true);
  }

  function setElementPosition(element, left, top, key = "") {
    const margin = 10;
    const rect = element.getBoundingClientRect();
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const clampedLeft = Math.min(Math.max(margin, left), maxLeft);
    const clampedTop = Math.min(Math.max(margin, top), maxTop);

    element.style.left = `${clampedLeft}px`;
    element.style.top = `${clampedTop}px`;

    if (key && pinnedCards.has(key)) {
      pinnedCards.get(key).position = {
        left: clampedLeft,
        top: clampedTop
      };
    }
  }

  function closeHoverPopover() {
    clearTimeout(hideTimer);
    isTemporaryPopoverActive = false;
    activeRow = null;
    activeUsername = "";
    activeAnchor = null;
    isPointerOverPopover = false;
    popover.hidden = true;
  }

  function getActionIcon(type) {
    if (type === "timeout") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7v5l3 2"></path>
          <path d="M5 3h14"></path>
          <path d="M7 21h10"></path>
          <path d="M12 3v3"></path>
          <circle cx="12" cy="13" r="7"></circle>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8"></circle>
        <path d="M7 17 17 7"></path>
      </svg>
    `;
  }

  function getPinIcon(pinned) {
    return `
      <svg viewBox="0 0 384 512" aria-hidden="true" class="kch-popover__pin-icon ${pinned ? "kch-popover__pin-icon--active" : ""}">
        <path class="kch-popover__pin-fill" d="M32 32C32 14.3 46.3 0 64 0H320c17.7 0 32 14.3 32 32s-14.3 32-32 32H290.5l11.4 148.2c36.7 19.9 65.7 53.2 79.5 94.7l1 3c3.3 9.8 1.6 20.5-4.4 28.8s-15.7 13.3-26 13.3H32c-10.3 0-19.9-4.9-26-13.3s-7.7-19.1-4.4-28.8l1-3c13.8-41.5 42.8-74.8 79.5-94.7L93.5 64H64C46.3 64 32 49.7 32 32zM160 384h64v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V384z"></path>
      </svg>
    `;
  }

  function applyModerationCommand(username, type) {
    if (!hasModerationAccess()) return;

    const normalized = normalizeUsername(username);
    if (!normalized) return;

    const command = type === "ban"
      ? `/ban ${normalized} suspicious activity`
      : `/timeout ${normalized} 600 suspicious activity`;

    if (setChatInputValue(command)) {
      showPopoverNotice("チャット入力欄にコマンドを入れました。送信すると実行されます。");
    } else {
      showPopoverNotice(`入力欄が見つかりません。手動で送信: ${command}`);
    }
  }

  function openKickProfile(username) {
    const normalized = normalizeUsername(username);
    if (!normalized) return;

    window.open(getKickProfileUrl(normalized), "_blank", "noopener,noreferrer");
  }

  function setChatInputValue(value) {
    const input = findChatInput();
    if (!input) return false;

    input.focus();

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.value = value;
      input.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value
      }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (input.isContentEditable) {
      input.textContent = value;
      input.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value
      }));
      return true;
    }

    return false;
  }

  function findChatInput() {
    const selectors = [
      "textarea[placeholder*='メッセージ' i]",
      "textarea[placeholder*='message' i]",
      "input[placeholder*='メッセージ' i]",
      "input[placeholder*='message' i]",
      "[contenteditable='true'][role='textbox']",
      "[role='textbox'][contenteditable='true']"
    ];

    return selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => isVisibleElement(element)) || null;
  }

  function hasModerationAccess() {
    try {
      return window.localStorage.getItem(MODERATION_ACTIONS_STORAGE_KEY) === "1";
    } catch (_error) {
      return false;
    }
  }

  function setModerationActionsEnabled(enabled) {
    try {
      if (enabled) {
        window.localStorage.setItem(MODERATION_ACTIONS_STORAGE_KEY, "1");
      } else {
        window.localStorage.removeItem(MODERATION_ACTIONS_STORAGE_KEY);
      }
    } catch (_error) {
      // Keep moderation controls hidden when localStorage is unavailable.
    }
  }

  function formatTime(timestamp) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(timestamp));
  }

  async function fetchBroadcasterAvatar(username) {
    const key = normalizeUsername(username);
    if (broadcasterAvatarCache.has(key)) return broadcasterAvatarCache.get(key);
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(key)}`, {
        credentials: "include",
        headers: { Accept: "application/json", "x-app-platform": "web" }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const url = data?.user?.profile_pic || data?.user?.profile_image || null;
      broadcasterAvatarCache.set(key, url);
      return url;
    } catch (_e) {
      broadcasterAvatarCache.set(key, null);
      return null;
    }
  }

  function renderMessageWithEmotes(text) {
    if (!text) return "";
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    return escaped.replace(/\[emote:(\d+):([^\]]+)\]/g, (_, id, name) => {
      return `<img class="kch-emote" src="https://files.kick.com/emotes/${id}/fullsize" alt="${name}" title="${name}" loading="lazy">`;
    });
  }

  function renderMessageTime(meta, message) {
    if (getMessageTimestampKind(message) === "posted") {
      meta.textContent = formatTime(message.timestamp);
      meta.title = getPostedTimeTitle(message);
      return;
    }

    meta.classList.add("kch-popover__meta--observed");
    meta.textContent = formatTime(message.timestamp);
    meta.title = "投稿時刻未確定。取得時刻を薄い斜線表示にしています。API照合で一致すれば投稿時刻に補正します。";
    meta.setAttribute("aria-label", `投稿時刻未確定。取得時刻 ${formatTime(message.timestamp)}`);
  }

  function getPostedTimeTitle(message) {
    if (message.source === "api") return "APIから取得した投稿時刻";
    if (message.source === "realtime") return "リアルタイム追加として取得した投稿時刻";
    return "ページ上から取得した投稿時刻";
  }

  function assessAccountRisk(messages) {
    const riskMessages = messages
      .filter((message) => message?.text && message?.timestamp)
      .filter((message) => getMessageTimestampKind(message) === "posted")
      .map((message) => ({
        rawText: String(message.text || ""),
        text: normalizeMessageForRisk(message.text),
        timestamp: message.timestamp,
        source: message.source || (message.id ? "api" : "dom")
      }))
      .filter((message) => message.text || message.rawText);

    if (riskMessages.length < 2) {
      return createEmptyRiskResult();
    }

    let score = 0;
    const reasons = [];
    const sorted = dedupeRiskMessages(riskMessages).sort((a, b) => b.timestamp - a.timestamp);
    if (sorted.length < 2) {
      return createEmptyRiskResult();
    }
    const newest = sorted[0]?.timestamp || 0;
    const recent30s = sorted.filter((message) => newest - message.timestamp <= 30000);
    const recent60s = sorted.filter((message) => newest - message.timestamp <= 60000);
    const addRule = (reason, weight) => {
      reasons.push(reason);
      score += weight;
    };

    if (recent30s.length >= 8) {
      addRule("30秒以内に8件以上", 18);
    } else if (recent60s.length >= 12) {
      addRule("60秒以内に12件以上", 14);
    }

    const counts = new Map();
    for (const message of sorted) {
      counts.set(message.text, (counts.get(message.text) || 0) + 1);
    }

    if ([...counts.values()].some((count) => count >= 3)) {
      addRule("同一コメントを3回以上", 22);
    }

    if (![...counts.values()].some((count) => count >= 3) && hasRepeatedLongComment(counts)) {
      addRule("同一長文コメントを2回以上", 14);
    }

    const intervals = [];
    for (let index = 1; index < sorted.length; index += 1) {
      intervals.push(Math.abs(sorted[index - 1].timestamp - sorted[index].timestamp));
    }

    if (hasBurstWindow(sorted, 3, 2000)) {
      addRule("2秒以内に3コメント以上", 32);
    }

    if (hasBurstWindow(sorted, 5, 10000)) {
      addRule("10秒以内に5コメント以上", 16);
    }

    const averageInterval = intervals.reduce((total, value) => total + value, 0) / Math.max(intervals.length, 1);
    if (sorted.length >= 10 && averageInterval > 0 && averageInterval <= 5000) {
      addRule("平均投稿間隔が5秒以下", 12);
    }

    const urlLikeCount = sorted.filter((message) => /https?:\/\/|www\.|\.com\b|\.net\b|\.org\b/i.test(message.text)).length;
    if (urlLikeCount >= 3) {
      addRule("URL風コメントが多い", 15);
    }

    const massRepeatCount = sorted.filter((message) => hasMassRepeatedText(message.rawText)).length;
    const strongMassRepeat = sorted.some((message) => hasMassRepeatedText(message.rawText) && cleanText(message.rawText).length >= MASS_REPEAT_STRONG_LENGTH);
    if (massRepeatCount >= 2 || strongMassRepeat) {
      addRule("長文/語句の大量反復", 12);
    }

    const emoteSpamCount = sorted.filter((message) => isEmoteSpamText(message.rawText)).length;
    const strongEmoteSpam = sorted.some((message) => countEmoteLikeTokens(message.rawText) >= EMOTE_SPAM_STRONG_COUNT);
    if (emoteSpamCount >= 2 || strongEmoteSpam) {
      addRule("絵文字/スタンプ大量", 10);
    }

    const internalRepetitionStats = sorted.map((message) => analyzeInternalRepetition(message.rawText));
    const strongInternalRepetitionCount = internalRepetitionStats.filter((value) => value.strong).length;
    const moderateInternalRepetitionCount = internalRepetitionStats.filter((value) => value.moderate).length;
    if (strongInternalRepetitionCount >= 1) {
      addRule("単一コメント内の大量反復", 36);
    } else if (moderateInternalRepetitionCount >= 2) {
      addRule("コメント内の反復が多い", 16);
    }

    const personalInfoCount = sorted.filter((message) => looksLikePersonalInfoPost(message.rawText)).length;
    if (personalInfoCount >= 1) {
      addRule("個人情報らしき投稿", 45);
    }

    const violentThreatCount = sorted.filter((message) => looksLikeViolentThreatPost(message.rawText)).length;
    if (violentThreatCount >= 1) {
      addRule("殺害/危害予告らしき投稿", 55);
    }

    const isCritical = personalInfoCount >= 1 || violentThreatCount >= 1;
    const matchedRules = reasons.length;
    score = Math.min(100, score);
    return {
      suspicious: isCritical || (matchedRules >= BOT_RULE_MATCH_THRESHOLD && score >= BOT_SCORE_THRESHOLD),
      reasons,
      score,
      matchedRules,
      critical: isCritical
    };
  }

  function createEmptyRiskResult() {
    return {
      suspicious: false,
      reasons: [],
      score: 0,
      matchedRules: 0,
      critical: false
    };
  }

  function dedupeRiskMessages(messages) {
    const deduped = [];

    for (const message of [...messages].sort((a, b) => a.timestamp - b.timestamp)) {
      const nearDuplicate = deduped.some((existing) => {
        const sameText = existing.text === message.text;
        const sameBatch = Math.abs(existing.timestamp - message.timestamp) <= 1000;
        const apiInvolved = existing.source === "api" || message.source === "api";
        return sameText && sameBatch && apiInvolved;
      });

      if (!nearDuplicate) deduped.push(message);
    }

    return deduped;
  }

  function normalizeMessageForRisk(text) {
    return cleanText(text)
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "url")
      .replace(/\d+/g, "0")
      .replace(/[!?！？。、,.…~ーｰｗw\s]+/g, "")
      .trim();
  }

  function looksLikePersonalInfoPost(text) {
    const value = cleanText(text);
    if (!value) return false;
    const hasPhone = /0\d{1,4}[-ー−]\d{1,4}[-ー−]\d{3,4}/.test(value);
    const hasName = /(氏名|名前|本名|フルネーム).{0,10}[:：は]/.test(value);
    if (hasPhone && hasName) return true;
    if (/(北海道|東京都|京都府|大阪府|.{2,3}県).{2,20}(市|区|町|村).{1,20}(\d+丁目|\d+番地|\d+番\d+号)/.test(value)) return true;
    return /(住所|電話番号|本名).{0,10}[:：].{3,}/.test(value);
  }

  function looksLikeViolentThreatPost(text) {
    const value = cleanText(text).toLowerCase();
    if (!value) return false;
    return /殺す|殺害|刺す|刺しに|ぶっ殺|ころす|56す|死ね|危害|襲う|放火|爆破|kill\s+you|murder|stab|shoot/.test(value);
  }

  function hasRepeatedLongComment(counts) {
    return [...counts.entries()].some(([text, count]) => count >= 2 && text.length >= MASS_REPEAT_MIN_LENGTH);
  }

  function hasMassRepeatedText(text) {
    const compact = cleanText(text).replace(/\s+/g, "");
    if (compact.length < MASS_REPEAT_MIN_LENGTH) return false;

    if (/(.)\1{5,}/u.test(compact)) return true;

    const maxPhraseLength = Math.min(16, Math.floor(compact.length / 3));
    for (let length = 2; length <= maxPhraseLength; length += 1) {
      const phrase = compact.slice(0, length);
      if (!phrase.trim()) continue;

      const count = countNonOverlappingOccurrences(compact, phrase);
      if (count >= 3 && phrase.length * count >= Math.min(compact.length * 0.55, MASS_REPEAT_STRONG_LENGTH)) {
        return true;
      }
    }

    return false;
  }

  function analyzeInternalRepetition(text) {
    const compact = cleanText(text).replace(/\s+/g, "");
    const lexical = compact
      .replace(/\[emote:[^\]]+\]/gi, "")
      .replace(/\p{Extended_Pictographic}+/gu, "");
    const target = lexical || compact;
    if (target.length < MASS_REPEAT_MIN_LENGTH) {
      return {
        moderate: false,
        strong: false,
        ratio: 0,
        maxOccurrences: 1
      };
    }

    let bestCoverage = 0;
    let maxOccurrences = 1;
    const maxPhraseLength = Math.min(24, Math.floor(target.length / 2));
    const maxStart = Math.max(1, Math.min(64, target.length - 4));

    for (let start = 0; start < maxStart; start += 1) {
      for (let length = 4; length <= maxPhraseLength; length += 1) {
        if (start + length > target.length) break;
        const phrase = target.slice(start, start + length);
        if (!phrase.trim()) continue;
        if (/^(.)\1+$/u.test(phrase)) continue;

        const count = countNonOverlappingOccurrences(target, phrase);
        if (count < 3) continue;

        const coverage = phrase.length * count;
        if (coverage > bestCoverage) bestCoverage = coverage;
        if (count > maxOccurrences) maxOccurrences = count;
      }
    }

    const ratio = target.length > 0 ? bestCoverage / target.length : 0;
    const strong = ratio >= 0.74 || (maxOccurrences >= 5 && bestCoverage >= Math.min(140, Math.floor(target.length * 0.68)));
    const moderate = !strong && ratio >= 0.48 && maxOccurrences >= 3;

    return {
      moderate,
      strong,
      ratio,
      maxOccurrences
    };
  }

  function countNonOverlappingOccurrences(text, phrase) {
    if (!phrase) return 0;

    let count = 0;
    let index = 0;
    while (index < text.length) {
      const foundAt = text.indexOf(phrase, index);
      if (foundAt === -1) break;
      count += 1;
      index = foundAt + phrase.length;
    }

    return count;
  }

  function isEmoteSpamText(text) {
    const tokenCount = countEmoteLikeTokens(text);
    if (tokenCount >= EMOTE_SPAM_MIN_COUNT) return true;

    const compact = cleanText(text).replace(/\s+/g, "");
    return tokenCount >= 6 && compact.length >= MASS_REPEAT_STRONG_LENGTH;
  }

  function countEmoteLikeTokens(text) {
    const value = String(text || "");
    const emojiCount = [...value].filter((char) => /\p{Extended_Pictographic}/u.test(char)).length;
    const emotePlaceholderCount = (value.match(/\[emote\]/gi) || []).length;
    const namedEmoteCount = (value.match(/:[A-Za-z0-9_.-]{2,32}:/g) || []).length;
    return emojiCount + emotePlaceholderCount + namedEmoteCount;
  }

  function hasBurstWindow(sortedMessages, requiredCount, windowMs) {
    if (hasLikelyApiBatch(sortedMessages, requiredCount, windowMs)) return false;

    for (let start = 0; start < sortedMessages.length; start += 1) {
      let count = 1;
      for (let end = start + 1; end < sortedMessages.length; end += 1) {
        const delta = Math.abs(sortedMessages[start].timestamp - sortedMessages[end].timestamp);
        if (delta <= windowMs) count += 1;
        if (count >= requiredCount) return true;
      }
    }

    return false;
  }

  function hasLikelyApiBatch(sortedMessages, requiredCount, windowMs) {
    for (let start = 0; start < sortedMessages.length; start += 1) {
      const batch = [sortedMessages[start]];
      for (let end = start + 1; end < sortedMessages.length; end += 1) {
        const delta = Math.abs(sortedMessages[start].timestamp - sortedMessages[end].timestamp);
        if (delta <= windowMs) batch.push(sortedMessages[end]);
      }

      if (
        batch.length >= requiredCount &&
        batch.some((message) => message.source === "api") &&
        new Set(batch.map((message) => message.text)).size >= requiredCount
      ) {
        return true;
      }
    }

    return false;
  }

  function queueHoverCheck(target, clientX, relatedTarget = null) {
    pendingHover = {
      target,
      clientX,
      relatedTarget
    };

    if (hoverFrame) return;

    hoverFrame = window.requestAnimationFrame(() => {
      const pending = pendingHover;
      pendingHover = null;
      hoverFrame = 0;
      if (!pending) return;

      processHoverTarget(pending.target, pending.clientX, pending.relatedTarget);
    });
  }

  function processHoverTarget(target, clientX, relatedTarget = null) {
    if (isTemporaryPopoverActive) return;
    if (target instanceof Node && popover.contains(target)) return;

    const row = findLikelyRowFromTarget(target, clientX);
    if (!row) {
      if (activeRow && !popover.hidden && isPointerInsideActiveHoverZone()) {
        clearTimeout(hideTimer);
        return;
      }
      if (activeRow && !isPointerOverPopover) scheduleHidePopover();
      return;
    }

    if (relatedTarget instanceof Node && row.contains(relatedTarget) && activeRow === row) {
      clearTimeout(hideTimer);
      return;
    }

    const user = scanRow(row) || getUsernameData(row);
    if (!user) {
      if (activeRow && !popover.hidden && isPointerInsideActiveHoverZone()) {
        clearTimeout(hideTimer);
        return;
      }
      if (activeRow && !isPointerOverPopover) scheduleHidePopover();
      return;
    }

    clearTimeout(hideTimer);
    const nextKey = normalizeUsername(user.username);
    const sameHoverTarget = activeRow === row && normalizeUsername(activeUsername) === nextKey && !popover.hidden;
    activeRow = row;
    activeUsername = user.username;
    activeAnchor = user.usernameElement || row;
    rememberActiveGeometry();
    if (!sameHoverTarget) {
      renderPopover(user.username, activeAnchor);
    }
  }

  document.addEventListener("mouseover", (event) => {
    lastPointer = {
      x: event.clientX,
      y: event.clientY
    };
    queueHoverCheck(event.target, event.clientX, event.relatedTarget);
  }, true);

  document.addEventListener("mouseout", (event) => {
    if (!activeRow) return;

    const related = event.relatedTarget;
    if (related instanceof Node && activeRow.contains(related)) return;
    if (related instanceof Node && popover.contains(related)) return;
    scheduleHidePopover();
  }, true);

  popover.addEventListener("mouseenter", () => {
    isPointerOverPopover = true;
    clearTimeout(hideTimer);
  });

  popover.addEventListener("mouseleave", (event) => {
    isPointerOverPopover = false;
    const related = event.relatedTarget;
    if (related instanceof Node && activeRow?.contains(related)) return;
    scheduleHidePopover();
  });

  document.addEventListener("pointermove", (event) => {
    lastPointer = {
      x: event.clientX,
      y: event.clientY
    };
    if (event.target instanceof Node && popover.contains(event.target)) return;

    const now = Date.now();
    if (now - lastPointerHoverAt < 120) return;
    lastPointerHoverAt = now;
    queueHoverCheck(event.target, event.clientX, null);
  }, true);

  window.addEventListener("scroll", (event) => {
    if (!activeRow) return;
    if (isTemporaryPopoverActive) return;
    if (shouldIgnoreScrollForHoverPopover(event.target)) return;
    hidePopover();
  }, true);

  function shouldIgnoreScrollForHoverPopover(target) {
    if (Date.now() - popoverShownAt < HOVER_GRACE_MS) return true;
    if (target === window || target === document || target === document.documentElement || target === document.body) return false;

    const element = target instanceof Element ? target : null;
    if (!element) return false;

    if (popover.contains(element)) return true;
    if (activeRow?.contains(element)) return true;
    if (activeAnchor?.contains?.(element)) return true;
    if (getContainingChatRoot(element)) return true;
    if (isLikelyChatContainer(element)) return true;

    return false;
  }

  window.addEventListener("resize", () => {
    for (const [key, card] of pinnedCards.entries()) {
      setElementPosition(card.element, card.position.left, card.position.top, key);
    }
    if (!isTemporaryPopoverActive) hidePopover();
  });

  popover.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(".kch-popover__mod--timeout")) {
      event.preventDefault();
      if (!hasModerationAccess()) return;
      applyModerationCommand(activeUsername, "timeout");
      return;
    }

    if (target.closest(".kch-popover__mod--ban")) {
      event.preventDefault();
      if (!hasModerationAccess()) return;
      applyModerationCommand(activeUsername, "ban");
      return;
    }

    if (target.closest(".kch-popover__name-text")) {
      event.preventDefault();
      openKickProfile(activeUsername);
      return;
    }

    if (target.closest(".kch-popover__pin")) {
      event.preventDefault();
      togglePinned();
      return;
    }

    if (target.closest(".kch-popover__close")) {
      event.preventDefault();
      closeHoverPopover();
    }
  });

  const observer = new MutationObserver((mutations) => {
    if (shouldPreferRealtimeWsIngestion()) {
      noteSkipReason("mutation_scan_skipped:ws_active", 1500);
      return;
    }

    const rows = new Set();

    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        const el = mutation.target?.parentElement;
        if (el && isInsideChatArea(el)) {
          const row = findLikelyRowFromUsername(el) || el.closest("[data-index]");
          if (row) rows.add(row);
        }
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (!isInsideChatArea(node) && !isLikelyChatContainer(node)) continue;

        const usernameElement = getUsernameElement(node);
        if (usernameElement) {
          const row = findLikelyRowFromUsername(usernameElement);
          if (row) rows.add(row);
        }

        if (isInsideChatArea(node) && parseUsernameMessage(node)) {
          rows.add(node);
        }

        node.querySelectorAll?.(ANY_USERNAME_SELECTOR).forEach((candidate) => {
          if (!isUsableUsernameElement(candidate)) return;
          const row = findLikelyRowFromUsername(candidate);
          if (row) rows.add(row);
        });

        node.querySelectorAll?.("div, li, p, span").forEach((candidate) => {
          if (isInsideChatArea(candidate) && parseUsernameMessage(candidate)) rows.add(candidate);
        });
      }
    }

    const trustRealtimeTimestamp = shouldTrustRealtimeTimestamp(rows.size);
    for (const row of rows) {
      scanRow(row, { trustRealtimeTimestamp });
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: false
  });

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveHistory, SAVE_DELAY_MS);
  }

  async function loadSettings() {
    const result = await readExtensionStorage(SETTINGS_STORAGE_KEY);
    userSettings = normalizeSettings(result?.[SETTINGS_STORAGE_KEY]);
  }

  function installSettingsListener() {
    if (!hasExtensionStorage()) return;

    try {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;
        if (!changes[SETTINGS_STORAGE_KEY]) return;

        userSettings = normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue);
        applySettingsToDetectedUsers();
        reevaluateListedUsersFromHistory();
        refreshAllPopovers();
        scheduleFollowedChannelsSync(1000);
      });
    } catch (_error) {
      // Storage events are optional while the extension is being reloaded.
    }
  }

  function readExtensionStorage(key) {
    if (!hasExtensionStorage()) return Promise.resolve({});

    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(key, (result) => {
          if (chrome.runtime.lastError) {
            resolve({});
            return;
          }

          resolve(result || {});
        });
      } catch (_error) {
        resolve({});
      }
    });
  }

  function writeExtensionStorage(key, value) {
    if (!hasExtensionStorage()) return Promise.resolve();

    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            resolve();
            return;
          }

          resolve();
        });
      } catch (_error) {
        resolve();
      }
    });
  }

  function hasExtensionStorage() {
    try {
      return Boolean(globalThis.chrome?.runtime?.id && globalThis.chrome?.storage?.local);
    } catch (_error) {
      return false;
    }
  }

  function applySettingsToDetectedUsers() {
    let changed = false;
    for (const [key, user] of suspiciousUsers.entries()) {
      if (isIgnoredUser(key)) {
        suspiciousUsers.delete(key);
        changed = true;
        continue;
      }

      const reasons = getEnabledDetectionReasons(user.reasons || []);
      if (!reasons.length) {
        suspiciousUsers.delete(key);
        changed = true;
      } else if (reasons.length !== user.reasons.length) {
        user.reasons = reasons;
        changed = true;
      }
    }

    if (changed) sendSuspiciousUsersReport();
  }

  function reevaluateListedUsersFromHistory() {
    if (getAlertAction() === "off") return;
    if (!userSettings.watchlistEnabled && !userSettings.broadcasterListEnabled) return;

    let changed = false;
    for (const [key, history] of userHistory.entries()) {
      if (!history?.displayName || !Array.isArray(history.messages) || history.messages.length === 0) continue;
      if (isIgnoredUser(key)) continue;

      const reasons = [];
      if (isWatchlistedUser(key)) reasons.push("ウォッチリスト");
      if (isBroadcasterListedUser(key)) reasons.push("配信者リスト");
      if (!reasons.length) continue;

      const before = suspiciousUsers.get(key);
      rememberDetectedUser(key, history.displayName, reasons, history.messages);
      const after = suspiciousUsers.get(key);
      if (!before || !after) {
        changed = true;
        continue;
      }
      if (before.lastDetectedAt !== after.lastDetectedAt) changed = true;
    }

    if (changed) {
      sendSuspiciousUsersReport();
    }
  }

  function getEnabledDetectionReasons(reasons) {
    return reasons.filter((reason) => {
      if (reason === "ウォッチリスト") {
        return userSettings.watchlistEnabled && getAlertAction() !== "off";
      }

      if (reason === "配信者リスト") {
        return userSettings.broadcasterListEnabled && getAlertAction() !== "off";
      }

      return getAlertAction() !== "off" && userSettings.botDetectionEnabled !== false;
    });
  }

  function saveHistory() {
    const payload = Object.fromEntries(userHistory.entries());
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (_error) {
      // Storage can be unavailable in restricted frames. In that case, keep in-memory history only.
    }
  }

  function loadHistory() {
    let payload = {};
    try {
      payload = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    } catch (_error) {
      payload = {};
    }

    for (const [key, value] of Object.entries(payload)) {
      if (!value?.displayName || !Array.isArray(value.messages)) continue;
      const messages = value.messages
        .filter((message) => message?.text && message?.timestamp)
        .filter((message) => !streamContext?.startedAt || message.timestamp >= streamContext.startedAt)
        .map((message) => ({
          ...message,
          source: message.source || (message.id ? "api" : "dom"),
          timestampKind: message.timestampKind || (message.source === "api" || message.correctedTimestamp ? "posted" : "observed"),
          correctedTimestamp: Boolean(message.correctedTimestamp)
        }))
        .slice(0, MAX_MESSAGES);
      const allowNumericOnly = messages.some((message) => message.source === "api" || isTrustedNumericMessageSource(message.source));
      if (!looksLikeUsernameToken(value.displayName, { allowNumericOnly })) continue;

      userHistory.set(key, {
        displayName: value.displayName,
        messages
      });
    }
  }

  function clearSavedHistory() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch (_error) {
      // Storage can be unavailable in restricted frames.
    }
  }

  async function resetForChannelChange(nextSlug) {
    routeResetInProgress = true;
    clearTimeout(saveTimer);
    clearTimeout(hideTimer);
    clearTimeout(followedChannelsSyncTimer);
    clearTimeout(timestampCorrectionTimer);
    followedChannelsSyncTimer = 0;
    followedChannelsSyncRunning = false;
    followedChannelsSyncRetryCount = 0;
    lastFollowedChannelsSyncAt = 0;
    timestampCorrectionTimer = 0;
    clearSavedHistory();

    hidePopover();
    closeAllPinnedCards();
    userHistory.clear();
    apiWindowCache.clear();
    userBackfillState.clear();
    pendingTimestampCorrections.clear();
    coordinatedSpamBuckets.clear();
    lastUserAnchors.clear();
    suspiciousEvalAt.clear();
    pinnedApiCheckingUsers.clear();
    autoPinnedUsers.clear();
    autoPinDismissedUsers.clear();
    notifiedUsers.clear();
    suspiciousUsers.clear();
    clearTimeout(suspiciousReportTimer);
    suspiciousReportTimer = 0;
    resetDiagnostics();
    sendSuspiciousUsersReset();
    pinnedApiChecking = false;
    timestampCorrectionRunning = false;
    realtimeTimestampTrustReadyAt = Date.now() + REALTIME_TIMESTAMP_TRUST_DELAY_MS;
    streamContext = null;
    activeChannelSlug = nextSlug;
    storageKey = `kch:${location.hostname}:${nextSlug}:route-pending`;

    try {
      await initializeStreamContext();
      loadHistory();
      scanPage();
      scheduleFollowedChannelsSync(1500);
    } finally {
      routeResetInProgress = false;
    }
  }

  async function initializeStreamContext() {
    const slug = getChannelSlug();
    apiDebug.contextAttempts += 1;
    if (!slug) {
      apiDebug.lastSkippedReason = "チャンネル名なし";
      return;
    }

    try {
      const url = `${API_ORIGIN}/api/v1/channels/${encodeURIComponent(slug)}`;
      apiDebug.lastUrl = url;
      const response = await fetch(url, {
        credentials: "include",
        headers: getKickApiHeaders()
      });
      apiDebug.lastStatus = `channel:${response.status}`;
      if (!response.ok) {
        apiDebug.lastSkippedReason = `channel api ${response.status}`;
        return;
      }

      const channelPayload = await response.json();
      const channel = channelPayload?.channel || channelPayload;
      const livestream = channel.livestream || channel.current_livestream || channel.recent_livestream || channel.stream || null;
      const startedAt = parseKickDate(livestream?.created_at || livestream?.start_time || livestream?.started_at);

      streamContext = {
        slug,
        channelId: channel.id || livestream?.channel_id || null,
        livestreamId: livestream?.id || null,
        startedAt,
        startedAtIso: startedAt ? new Date(startedAt).toISOString() : "",
        isLive: Boolean(livestream?.is_live ?? channel.is_live)
      };
      activeChannelSlug = slug;
      apiDebug.lastSkippedReason = "";

      const streamKey = streamContext.livestreamId || streamContext.startedAtIso || "current";
      storageKey = `kch:${location.hostname}:${slug}:stream:${streamKey}`;
    } catch (_error) {
      streamContext = null;
      apiDebug.lastError = "channel api error";
      apiDebug.lastSkippedReason = "channel api error";
    }
  }

  function parseKickDate(value) {
    if (!value) return 0;
    if (typeof value === "number") return value > 1000000000000 ? value : value * 1000;
    if (/^\d+$/.test(String(value).trim())) {
      const numeric = Number(value);
      return numeric > 1000000000000 ? numeric : numeric * 1000;
    }

    const normalized = String(value).includes("T")
      ? String(value)
      : `${String(value).replace(" ", "T")}Z`;
    const timestamp = Date.parse(normalized);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function queueTimestampCorrection(username, text, observedAt) {
    if (!username || !text || !observedAt) return;

    const key = `${normalizeUsername(username)}\u0001${text}\u0001${Math.floor(observedAt / 1000)}`;
    const existing = pendingTimestampCorrections.get(key);
    pendingTimestampCorrections.set(key, {
      username,
      text,
      observedAt,
      attempts: existing?.attempts || 0
    });

    while (pendingTimestampCorrections.size > TIMESTAMP_CORRECTION_MAX_PENDING) {
      pendingTimestampCorrections.delete(pendingTimestampCorrections.keys().next().value);
    }

    scheduleTimestampCorrection();
  }

  function scheduleTimestampCorrection(delay = TIMESTAMP_CORRECTION_DEBOUNCE_MS) {
    if (timestampCorrectionTimer) window.clearTimeout(timestampCorrectionTimer);
    timestampCorrectionTimer = window.setTimeout(runTimestampCorrection, delay);
  }

  async function runTimestampCorrection() {
    timestampCorrectionTimer = 0;
    pruneTimestampCorrectionQueue();

    const candidates = [...pendingTimestampCorrections.values()]
      .filter((candidate) => candidate.attempts < TIMESTAMP_CORRECTION_MAX_ATTEMPTS);
    if (!candidates.length) return;

    if (timestampCorrectionRunning) {
      scheduleTimestampCorrection(TIMESTAMP_CORRECTION_MIN_INTERVAL_MS);
      return;
    }

    const now = Date.now();
    const nextAllowedAt = lastTimestampCorrectionAt + TIMESTAMP_CORRECTION_MIN_INTERVAL_MS;
    if (now < nextAllowedAt) {
      scheduleTimestampCorrection(nextAllowedAt - now);
      return;
    }

    timestampCorrectionRunning = true;
    for (const candidate of candidates) {
      candidate.attempts += 1;
    }

    try {
      if (!streamContext?.channelId || !streamContext?.startedAt) {
        await initializeStreamContext();
      }

      if (!streamContext?.channelId || !streamContext?.startedAt) {
        apiDebug.lastSkippedReason = "投稿時刻補正: 配信情報なし";
        return;
      }

      const windows = new Set();
      for (const candidate of candidates) {
        for (let index = 0; index < TIMESTAMP_CORRECTION_LOOKBACK_WINDOWS; index += 1) {
          const start = Math.max(streamContext.startedAt, candidate.observedAt - (index * API_WINDOW_MS));
          windows.add(Math.floor(start / API_WINDOW_MS) * API_WINDOW_MS);
        }
      }

      apiDebug.timestampCorrectionAttempts += 1;
      for (const windowStart of [...windows].sort((a, b) => a - b)) {
        await fetchChatWindow(windowStart, {
          force: true,
          targetKeys: candidates.map((candidate) => normalizeUsername(candidate.username))
        });
      }
    } catch (_error) {
      apiDebug.lastSkippedReason = "投稿時刻補正エラー";
    } finally {
      lastTimestampCorrectionAt = Date.now();
      timestampCorrectionRunning = false;
      pruneTimestampCorrectionQueue();

      if ([...pendingTimestampCorrections.values()].some((candidate) => candidate.attempts < TIMESTAMP_CORRECTION_MAX_ATTEMPTS)) {
        scheduleTimestampCorrection(TIMESTAMP_CORRECTION_MIN_INTERVAL_MS);
      }
    }
  }

  function pruneTimestampCorrectionQueue() {
    for (const [key, candidate] of pendingTimestampCorrections.entries()) {
      if (candidate.attempts >= TIMESTAMP_CORRECTION_MAX_ATTEMPTS || !hasObservedMessage(candidate)) {
        pendingTimestampCorrections.delete(key);
      }
    }
  }

  function hasObservedMessage(candidate) {
    const history = userHistory.get(normalizeUsername(candidate.username));
    if (!history?.messages?.length) return false;

    return history.messages.some((message) => {
      return message.text === candidate.text &&
        getMessageTimestampKind(message) === "observed" &&
        Math.abs(message.timestamp - candidate.observedAt) < 10 * 60 * 1000;
    });
  }

  function shouldTrustRealtimeTimestamp(rowCount) {
    if (rowCount < 1 || rowCount > REALTIME_TIMESTAMP_MAX_ROWS) return false;
    if (Date.now() < realtimeTimestampTrustReadyAt) return false;
    if (document.visibilityState === "hidden") return false;
    if (isChatPaused()) return false;
    return true;
  }

  async function backfillUserHistory(username) {
    const key = normalizeUsername(username);
    if (!key) return;
    if (!pinnedCards.has(key)) return;

    const realtimeBaseline = getUserRealtimeBaselineTimestamp(key);
    if (!realtimeBaseline) {
      const state = userBackfillState.get(key) || {};
      userBackfillState.set(key, {
        loading: false,
        failed: false,
        done: false,
        reason: "リアルタイムコメント待ち",
        lastAttemptAt: state.lastAttemptAt || 0
      });
      refreshActivePopover(key);
      return;
    }

    const existingApiBackfillCount = countUserApiMessagesBefore(key, realtimeBaseline);
    if (existingApiBackfillCount >= MAX_API_BACKFILL_MESSAGES) {
      const state = userBackfillState.get(key) || {};
      userBackfillState.set(key, {
        loading: false,
        failed: false,
        done: true,
        reason: "",
        lastAttemptAt: state.lastAttemptAt || 0
      });
      refreshActivePopover(key);
      return;
    }

    if (!streamContext?.channelId || !streamContext?.startedAt) {
      await initializeStreamContext();
    }

    if (!streamContext?.channelId || !streamContext?.startedAt) {
      const reason = !streamContext?.channelId ? "配信情報なし" : "配信開始時刻なし";
      apiDebug.lastSkippedReason = reason;
      userBackfillState.set(key, {
        loading: false,
        failed: true,
        done: false,
        reason
      });
      refreshActivePopover(key);
      return;
    }

    const currentState = userBackfillState.get(key);
    const now = Date.now();
    if (currentState?.loading) return;
    if (currentState?.done) return;
    if (currentState?.lastAttemptAt && now - currentState.lastAttemptAt < BACKFILL_RETRY_MS) return;

    userBackfillState.set(key, {
      loading: true,
      failed: false,
      done: false,
      reason: "",
      lastAttemptAt: now,
      baselineTimestamp: realtimeBaseline
    });
    refreshActivePopover(key);

    try {
      const beforeApiCount = countUserApiMessagesBefore(key, realtimeBaseline);
      const result = await fetchUserWindows(username, {
        beforeTimestamp: realtimeBaseline,
        maxApiMessages: MAX_API_BACKFILL_MESSAGES
      });
      const afterApiCount = countUserApiMessagesBefore(key, realtimeBaseline);
      const addedCount = Math.max(0, afterApiCount - beforeApiCount);
      const done = afterApiCount >= MAX_API_BACKFILL_MESSAGES || result.exhausted;
      userBackfillState.set(key, {
        loading: false,
        failed: false,
        done,
        reason: addedCount ? "" : done ? "API内に該当コメントなし" : "",
        lastAttemptAt: Date.now(),
        baselineTimestamp: realtimeBaseline
      });
    } catch (_error) {
      userBackfillState.set(key, {
        loading: false,
        failed: true,
        done: false,
        reason: "APIエラー",
        lastAttemptAt: Date.now(),
        baselineTimestamp: realtimeBaseline
      });
    }

    refreshActivePopover(key);
  }

  async function fetchUserWindows(username, options = {}) {
    const key = normalizeUsername(username);
    const beforeTimestamp = Number(options.beforeTimestamp) > 0 ? Number(options.beforeTimestamp) : 0;
    if (!beforeTimestamp) {
      return {
        exhausted: true
      };
    }

    const maxApiMessages = Math.max(1, Number(options.maxApiMessages) || MAX_API_BACKFILL_MESSAGES);
    if (countUserApiMessagesBefore(key, beforeTimestamp) >= maxApiMessages) {
      return {
        exhausted: false
      };
    }

    const now = Date.now();
    const streamStart = streamContext.startedAt;
    const windows = getBackfillWindowStarts(Math.min(now, beforeTimestamp), streamStart);

    for (let index = 0; index < windows.length; index += 1) {
      const windowStart = windows[index];
      await fetchChatWindow(windowStart, {
        force: index < PINNED_API_LOOKBACK_WINDOWS,
        targetKeys: [key],
        beforeTimestamp
      });

      if (countUserApiMessagesBefore(key, beforeTimestamp) >= maxApiMessages) {
        return {
          exhausted: false
        };
      }
    }

    return {
      exhausted: true
    };
  }

  function getBackfillWindowStarts(now, streamStart) {
    const windows = new Set();
    const maxOffset = Math.min(
      MAX_API_WINDOWS_PER_USER,
      Math.max(1, Math.ceil((now - streamStart) / API_WINDOW_MS))
    );

    for (const offset of BACKFILL_WINDOW_OFFSETS_MINUTES) {
      if (offset > maxOffset) continue;
      windows.add(Math.floor(Math.max(streamStart, now - offset * API_WINDOW_MS) / API_WINDOW_MS) * API_WINDOW_MS);
    }

    windows.add(Math.floor(streamStart / API_WINDOW_MS) * API_WINDOW_MS);
    windows.add(Math.floor(Math.max(streamStart, now - API_WINDOW_MS) / API_WINDOW_MS) * API_WINDOW_MS);

    return [...windows]
      .filter((timestamp) => timestamp >= streamStart && timestamp <= now)
      .sort((a, b) => b - a);
  }

  function getUserRealtimeBaselineTimestamp(key) {
    const messages = userHistory.get(key)?.messages || [];
    const postedNonApi = messages
      .filter((message) => message?.source !== "api")
      .filter((message) => getMessageTimestampKind(message) === "posted")
      .map((message) => Number(message.timestamp) || 0)
      .filter((timestamp) => timestamp > 0);
    if (!postedNonApi.length) return 0;
    return Math.min(...postedNonApi);
  }

  function countUserApiMessagesBefore(key, beforeTimestamp) {
    if (!beforeTimestamp) return 0;
    const messages = userHistory.get(key)?.messages || [];
    return messages.filter((message) => {
      return message?.source === "api" &&
        Number(message.timestamp) > 0 &&
        message.timestamp < beforeTimestamp - 1000;
    }).length;
  }

  function needsUserApiBackfill(key) {
    if (!pinnedCards.has(key)) return false;
    const state = userBackfillState.get(key);
    if (state?.done) return false;
    const baseline = getUserRealtimeBaselineTimestamp(key);
    if (!baseline) return false;
    return countUserApiMessagesBefore(key, baseline) < MAX_API_BACKFILL_MESSAGES;
  }

  function updatePinnedApiRefresh() {
    if (pinnedCards.size > 0 && !pinnedApiInterval) {
      pinnedApiInterval = window.setInterval(fetchPinnedApiUpdates, PINNED_API_REFRESH_MS);
      return;
    }

    if (pinnedCards.size === 0 && pinnedApiInterval) {
      window.clearInterval(pinnedApiInterval);
      pinnedApiInterval = 0;
      pinnedApiCheckingUsers.clear();
      pinnedApiChecking = false;
      refreshAllPopovers();
    }
  }

  async function fetchPinnedApiUpdates() {
    if (!pinnedCards.size || pinnedApiChecking) return;
    const targets = [...pinnedCards.keys()].filter((key) => needsUserApiBackfill(key));
    if (!targets.length) {
      if (pinnedApiCheckingUsers.size || pinnedApiChecking) {
        pinnedApiCheckingUsers.clear();
        pinnedApiChecking = false;
        refreshAllPopovers();
      }
      apiDebug.lastSkippedReason = "固定API補完: 不要";
      noteSkipReason("api_backfill_skipped:not_needed", 3000);
      return;
    }

    pinnedApiChecking = true;
    pinnedApiCheckingUsers.clear();
    for (const key of targets) {
      pinnedApiCheckingUsers.add(key);
    }
    refreshAllPopovers();

    try {
      for (const key of targets) {
        const username = userHistory.get(key)?.displayName || key;
        await backfillUserHistory(username);
      }
    } catch (_error) {
      apiDebug.lastSkippedReason = "固定API補完エラー";
    } finally {
      pinnedApiChecking = false;
      pinnedApiCheckingUsers.clear();
      refreshAllPopovers();
    }
  }

  async function fetchChatWindow(windowStart, options = {}) {
    const roundedStart = Math.floor(windowStart / API_WINDOW_MS) * API_WINDOW_MS;
    const cacheKey = `${streamContext.channelId}:${roundedStart}`;
    const targetKeys = normalizeTargetKeySet(options.targetKeys || options.targetKey);
    const beforeTimestamp = Number(options.beforeTimestamp) > 0 ? Number(options.beforeTimestamp) : 0;
    if (!options.force && apiWindowCache.has(cacheKey)) {
      const cachedMessages = apiWindowCache.get(cacheKey) || [];
      apiDebug.lastAcceptedMessageCount = rememberApiMessages(cachedMessages, targetKeys, { beforeTimestamp });
      return cachedMessages;
    }

    const startTime = formatKickApiTime(roundedStart);
    const url = `${API_ORIGIN}/api/v2/channels/${encodeURIComponent(streamContext.channelId)}/messages?start_time=${encodeURIComponent(startTime)}`;
    apiDebug.attempts += 1;
    apiDebug.lastUrl = url;
    apiDebug.lastStartTime = startTime;
    apiDebug.lastError = "";
    const response = await fetch(url, {
      credentials: "include",
      headers: getKickApiHeaders()
    });
    apiDebug.lastStatus = `messages:${response.status}`;
    if (!response.ok) {
      apiDebug.lastError = `chat api failed: ${response.status}`;
      throw new Error(`chat api failed: ${response.status}`);
    }

    const data = await response.json();
    apiDebug.lastResponseShape = describeApiResponseShape(data);
    const messages = extractApiMessages(data);
    apiWindowCache.set(cacheKey, messages);
    apiDebug.lastMessageCount = messages.length;
    apiDebug.lastAcceptedMessageCount = rememberApiMessages(messages, targetKeys, { beforeTimestamp });
    return messages;
  }

  function normalizeTargetKeySet(values) {
    if (!values) return null;
    const list = Array.isArray(values) ? values : [values];
    const keys = list
      .map((value) => normalizeUsername(value))
      .filter(Boolean);
    return keys.length ? new Set(keys) : null;
  }

  function rememberApiMessages(messages, targetKeys = null, options = {}) {
    let acceptedCount = 0;
    for (const message of messages || []) {
      if (rememberApiMessage(message, targetKeys, options)) acceptedCount += 1;
    }
    return acceptedCount;
  }

  function describeApiResponseShape(data) {
    if (Array.isArray(data)) return `array:${data.length}`;
    if (!data || typeof data !== "object") return typeof data;

    const keys = Object.keys(data).slice(0, 8).join(",");
    const dataValue = data.data;
    if (Array.isArray(dataValue)) return `object:${keys};data:array:${dataValue.length}`;
    if (dataValue && typeof dataValue === "object") {
      const dataKeys = Object.keys(dataValue).slice(0, 8).join(",");
      return `object:${keys};data:object:${dataKeys}`;
    }

    return `object:${keys}`;
  }

  function extractApiMessages(data) {
    const messages = [];
    const seen = new WeakSet();

    function visit(value, depth = 0) {
      if (!value || depth > 8) return;

      if (Array.isArray(value)) {
        for (const item of value) {
          visit(item, depth + 1);
        }
        return;
      }

      if (typeof value !== "object") return;
      if (seen.has(value)) return;
      seen.add(value);

      if (looksLikeApiMessage(value)) {
        messages.push(value);
        return;
      }

      const preferredKeys = [
        "messages",
        "chat_messages",
        "chatMessages",
        "data",
        "results",
        "items",
        "records"
      ];

      for (const key of preferredKeys) {
        if (key in value) visit(value[key], depth + 1);
      }

      for (const [key, child] of Object.entries(value)) {
        if (preferredKeys.includes(key)) continue;
        if (Array.isArray(child) || (child && typeof child === "object")) {
          visit(child, depth + 1);
        }
      }
    }

    visit(data);
    return messages;
  }

  function looksLikeApiMessage(message) {
    const username = getApiMessageUsername(message);
    return Boolean(looksLikeUsernameToken(username, { allowNumericOnly: true }) && getApiMessageText(message) && getApiMessageTimestamp(message));
  }

  function rememberApiMessage(message, targetKeys = null, options = {}) {
    const username = getApiMessageUsername(message);
    if (targetKeys?.size && !targetKeys.has(normalizeUsername(username))) return false;
    const timestamp = getApiMessageTimestamp(message);
    const beforeTimestamp = Number(options.beforeTimestamp) > 0 ? Number(options.beforeTimestamp) : 0;
    if (beforeTimestamp && timestamp >= beforeTimestamp - 1000) return false;
    const text = getApiMessageText(message);
    if (!username || !text || !timestamp) return false;
    const remembered = rememberMessage(username, text, timestamp, getApiMessageId(message), "api", "posted");
    apiDebug.apiMessagesRemembered += 1;
    return remembered;
  }

  function getApiMessageUsername(message) {
    return cleanText(
      message?.sender?.username ||
      message?.sender?.slug ||
      message?.sender?.name ||
      message?.user?.username ||
      message?.user?.slug ||
      message?.user?.name ||
      message?.author?.username ||
      message?.author?.slug ||
      message?.author?.name ||
      message?.account?.username ||
      message?.account?.slug ||
      message?.account?.name ||
      message?.chatroom_user?.username ||
      message?.chatroom_user?.slug ||
      message?.chatroom_user?.name ||
      message?.username ||
      message?.user_name ||
      message?.userName ||
      message?.sender_username
    ).replace(/^@/, "");
  }

  function getApiMessageText(message) {
    return normalizeMessageContent(
      stringifyApiContent(
        message?.content ??
        message?.message ??
        message?.text ??
        message?.body ??
        message?.comment
      )
    );
  }

  function stringifyApiContent(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);

    if (Array.isArray(value)) {
      return value.map((item) => stringifyApiContent(item)).filter(Boolean).join(" ");
    }

    if (typeof value === "object") {
      if (looksLikeApiEmote(value)) {
        return normalizeEmoteLabel(
          value.name ??
          value.text ??
          value.code ??
          value.slug ??
          value.label ??
          ""
        ) || EMOTE_PLACEHOLDER;
      }

      return stringifyApiContent(
        value.text ??
        value.message ??
        value.content ??
        value.body ??
        value.value ??
        value.name ??
        ""
      );
    }

    return "";
  }

  function looksLikeApiEmote(value) {
    const type = cleanText(value?.type || value?.kind || value?.content_type || value?.contentType).toLowerCase();
    if (type.includes("emote") || type.includes("emoji") || type.includes("sticker")) return true;
    return Boolean(value?.emote || value?.emote_id || value?.emoteId || value?.emoji || value?.sticker);
  }

  function getApiMessageTimestamp(message) {
    return parseKickDate(
      message?.created_at ||
      message?.createdAt ||
      message?.sent_at ||
      message?.sentAt ||
      message?.created ||
      message?.created_time ||
      message?.createdTime ||
      message?.created_at_time ||
      message?.createdAtTime ||
      message?.updated_at ||
      message?.updatedAt ||
      message?.timestamp ||
      message?.timestamps?.created_at ||
      message?.timestamps?.createdAt ||
      message?.meta?.created_at ||
      message?.meta?.createdAt ||
      message?.time ||
      message?.date
    );
  }

  function getApiMessageId(message) {
    return String(message?.id || message?.message_id || message?.messageId || message?.uuid || "");
  }

  function formatKickApiTime(timestamp) {
    return new Date(timestamp).toISOString();
  }

  function refreshActivePopover(key) {
    if (activeUsername && normalizeUsername(activeUsername) === key && activeAnchor && !popover.hidden) {
      renderPopover(activeUsername, activeAnchor);
    }

    if (pinnedCards.has(key)) {
      renderPinnedCard(key);
    }
  }

  function refreshAllPopovers() {
    if (activeUsername && activeAnchor && !popover.hidden) {
      renderPopover(activeUsername, activeAnchor);
    }

    for (const key of pinnedCards.keys()) {
      renderPinnedCard(key);
    }
  }

  function installRouteChangeListeners() {
    const notify = () => window.setTimeout(handlePossibleChannelChange, 0);
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function patchedPushState(...args) {
      const result = originalPushState.apply(this, args);
      notify();
      return result;
    };

    history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      notify();
      return result;
    };

    window.addEventListener("popstate", notify);
  }

  installRouteChangeListeners();
  installSettingsListener();
  installRealtimeWsBridge();
  loadSettings().finally(() => initializeStreamContext()).finally(() => loadHistory()).finally(() => {
    reevaluateListedUsersFromHistory();
    scanPage();
    scheduleFollowedChannelsSync(1500);
    scanInterval = window.setInterval(periodicRefresh, 2000);
  });

  window.addEventListener("pagehide", () => {
    clearTimeout(saveTimer);
    clearTimeout(hideTimer);
    clearTimeout(followedChannelsSyncTimer);
    clearTimeout(timestampCorrectionTimer);
    followedChannelsSyncTimer = 0;
    followedChannelsSyncRetryCount = 0;
    timestampCorrectionTimer = 0;
    clearSavedHistory();
    if (scanInterval) window.clearInterval(scanInterval);
    if (pinnedApiInterval) window.clearInterval(pinnedApiInterval);
    pendingTimestampCorrections.clear();
    lastUserAnchors.clear();
    suspiciousUsers.clear();
    clearTimeout(suspiciousReportTimer);
    suspiciousReportTimer = 0;
    sendSuspiciousUsersReset();
    window.removeEventListener("message", handleRealtimeWsBridgeMessage);
    observer.disconnect();
  }, { once: true });

  window.addEventListener("beforeunload", clearSavedHistory);
})();
