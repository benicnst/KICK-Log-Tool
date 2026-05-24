(() => {
  "use strict";

  const MAX_MESSAGES = 20;
  const MAX_USERS = 250;
  const MAX_PINNED_POPOVERS = 3;
  const SAVE_DELAY_MS = 700;
  const API_WINDOW_MS = 60 * 1000;
  const MAX_API_WINDOWS_PER_USER = 240;
  const API_ORIGIN = "https://kick.com";
  const BASE_STORAGE_KEY = `kch:${location.hostname}:${location.pathname.split("/").filter(Boolean)[0] || "home"}`;
  const MODERATION_ACTIONS_STORAGE_KEY = "klt:moderationActionsEnabled";
  const HOVER_GRACE_MS = 2200;
  const PINNED_API_REFRESH_MS = 15 * 1000;
  const PINNED_API_LOOKBACK_WINDOWS = 2;
  const BACKFILL_RETRY_MS = 45 * 1000;
  const TIMESTAMP_CORRECTION_DEBOUNCE_MS = 1800;
  const TIMESTAMP_CORRECTION_MIN_INTERVAL_MS = 7000;
  const TIMESTAMP_CORRECTION_LOOKBACK_WINDOWS = 2;
  const TIMESTAMP_CORRECTION_MAX_PENDING = 80;
  const TIMESTAMP_CORRECTION_MAX_ATTEMPTS = 3;
  const CHAT_PAUSED_PATTERNS = [
    "スクロールのためにチャットが一時停止",
    "チャットが一時停止",
    "chat paused",
    "paused due to scroll",
    "paused while you scroll"
  ];

  const userHistory = new Map();
  const pinnedCards = new Map();
  const apiWindowCache = new Set();
  const pinnedApiCheckingUsers = new Set();
  const userBackfillState = new Map();
  const pendingTimestampCorrections = new Map();
  const apiDebug = {
    attempts: 0,
    contextAttempts: 0,
    timestampCorrectionAttempts: 0,
    lastUrl: "",
    lastStatus: "",
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
  let lastPointer = { x: 0, y: 0 };
  let lastPointerHoverAt = 0;
  let scanInterval = 0;
  let pinnedApiInterval = 0;
  let pinnedApiChecking = false;
  let timestampCorrectionTimer = 0;
  let timestampCorrectionRunning = false;
  let lastTimestampCorrectionAt = 0;
  let routeResetInProgress = false;
  let pinnedDragState = null;
  let popoverShownAt = 0;

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
      .replace(/\s+/g, " ")
      .trim();
  }

  function looksLikeUsername(value) {
    const text = cleanText(value).replace(/^@/, "");
    return text.length >= 1 && text.length <= 32 && /^[A-Za-z0-9_.-]+$/.test(text);
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

      return looksLikeUsername(candidate) ? candidate : "";
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

    return candidates.find((element) => {
      if (!isVisibleElement(element)) return false;
      return looksLikeUsername(getUsernameValue(element));
    }) || null;
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
      return looksLikeUsername(getUsernameValue(element));
    }) || null;
  }

  function isProfileClickTarget(element) {
    if (getUsernameFromProfileLink(element)) return true;

    const tagName = element.tagName?.toLowerCase();
    const role = element.getAttribute?.("role")?.toLowerCase() || "";
    const clickable = tagName === "button" || role === "button" || role === "link";
    if (!clickable) return false;

    const label = getLabel(element);
    if (!looksLikeUsername(label)) return false;

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
    if (!looksLikeUsername(username)) return null;

    return {
      username,
      usernameElement
    };
  }

  function parseUsernameMessage(row) {
    const text = cleanText(row?.innerText || row?.textContent);
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
    if (directUsername && looksLikeUsername(getUsernameValue(directUsername)) && isProfileClickTarget(directUsername)) {
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
      .filter((candidate) => looksLikeUsername(getUsernameValue(candidate)) && isVisibleElement(candidate));

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

  function extractMessageText(row, username) {
    const parsed = parseUsernameMessage(row);
    if (parsed?.username && normalizeUsername(parsed.username) === normalizeUsername(username)) {
      return parsed.message;
    }

    const explicitMessage = row.querySelector(
      "[data-testid*='message' i], [class*='message' i], [class*='content' i], [dir='auto']"
    );

    const sourceText = cleanText(explicitMessage?.textContent || row.innerText || row.textContent);
    return removeUsernameFromText(sourceText, username);
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
    const key = normalizeUsername(username);
    if (!key || !text) return false;

    if (streamContext?.startedAt && timestamp < streamContext.startedAt) return false;
    const messageSource = source || (messageId ? "api" : "dom");
    const resolvedTimestampKind = normalizeTimestampKind(timestampKind || (messageSource === "api" ? "posted" : ""));

    const existing = userHistory.get(key) || {
      displayName: username,
      messages: []
    };

    existing.displayName = username;
    const duplicate = findDuplicateMessage(existing.messages, text, timestamp, messageId, messageSource);

    if (!duplicate) {
      existing.messages.unshift({
        id: messageId,
        text,
        timestamp,
        source: messageSource,
        timestampKind: resolvedTimestampKind
      });
    } else if (messageSource === "api" && getMessageTimestampKind(duplicate) === "observed") {
      duplicate.id = duplicate.id || messageId;
      duplicate.timestamp = timestamp;
      duplicate.source = "api";
      duplicate.timestampKind = "posted";
      duplicate.correctedTimestamp = true;
    } else if (messageId && !duplicate.id) {
      duplicate.id = messageId;
      duplicate.timestampKind = duplicate.timestampKind || getMessageTimestampKind(duplicate);
    }

    if (!duplicate || messageSource === "api") {
      existing.messages.sort((a, b) => b.timestamp - a.timestamp);
      existing.messages = existing.messages.slice(0, MAX_MESSAGES);
    }

    userHistory.delete(key);
    userHistory.set(key, existing);
    pruneUsers();
    scheduleSave();
    if (!duplicate || messageSource === "api") refreshActivePopover(key);
    return !duplicate;
  }

  function findDuplicateMessage(messages, text, timestamp, messageId, messageSource) {
    if (messageId) {
      const matchingId = messages.find((message) => message.id === messageId);
      if (matchingId) return matchingId;
    }

    const sameText = messages.filter((message) => message.text === text);
    if (!sameText.length) return null;

    if (messageSource === "api") {
      const observedMatch = findNearestMessage(
        sameText.filter((message) => {
          return getMessageTimestampKind(message) === "observed" &&
            Math.abs(message.timestamp - timestamp) < 10 * 60 * 1000;
        }),
        timestamp
      );
      if (observedMatch) return observedMatch;
    }

    return findNearestMessage(
      sameText.filter((message) => Math.abs(message.timestamp - timestamp) < 2500),
      timestamp
    );
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

  function scanRow(row) {
    if (!row) return null;

    const user = getUsernameData(row);
    if (!user) return null;

    const messageText = extractMessageText(row, user.username);
    if (!messageText || messageText === user.username) return null;

    const signature = `${normalizeUsername(user.username)}:${messageText}`;
    if (scannedRows.get(row) === signature) return null;
    scannedRows.set(row, signature);

    const postedTimestamp = getDomMessageTimestamp(row);
    const timestamp = postedTimestamp || Date.now();
    const timestampKind = postedTimestamp ? "posted" : "observed";
    rememberMessage(user.username, messageText, timestamp, "", postedTimestamp ? "dom" : "observed", timestampKind);
    if (!postedTimestamp) queueTimestampCorrection(user.username, messageText, timestamp);

    return {
      ...user,
      messageText,
      timestamp
    };
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
        .filter((element) => looksLikeUsername(getUsernameValue(element)) && isVisibleElement(element));

      for (const usernameElement of usernameElements) {
        const row = findLikelyRowFromUsername(usernameElement);
        if (row) scanRow(row);
      }

      scanTextRows(chatRoot);
    }
  }

  function periodicRefresh() {
    handlePossibleChannelChange();
    scanPage();
    closeStaleHoverPopover();
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
    version: "2.38.0",
    getChatRootCount: () => getChatRoots().length,
    getKnownUsers: () => [...userHistory.values()].map((value) => ({
      username: value.displayName,
      messages: value.messages.length
    })),
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
      chatPaused: isChatPaused(),
      apiDebug
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
        <div class="kch-popover__name"></div>
        <div class="kch-popover__actions">
          <button class="kch-popover__mod kch-popover__mod--timeout" type="button" title="10分タイムアウト command を入力"></button>
          <button class="kch-popover__mod kch-popover__mod--ban" type="button" title="BAN command を入力"></button>
          <button class="kch-popover__pin" type="button"></button>
          <button class="kch-popover__close" type="button" title="閉じる">×</button>
        </div>
      </div>
      <div class="kch-popover__list"></div>
    `;

    const risk = assessAccountRisk(messages);
    const nameElement = targetPopover.querySelector(".kch-popover__name");
    nameElement.textContent = displayName;
    if (risk.suspicious) {
      const marker = document.createElement("span");
      marker.className = "kch-popover__risk";
      marker.textContent = "💀";
      marker.title = `BOT/連投ツールの可能性: ${risk.reasons.join(" / ")}`;
      nameElement.appendChild(marker);
    }
    if (pinnedApiCheckingUsers.has(key)) {
      const refresh = document.createElement("span");
      refresh.className = "kch-popover__refresh";
      refresh.title = "固定ユーザーの新着コメントをAPIで確認中";
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
    pinButton.textContent = pinned ? "固定中" : "固定";
    pinButton.title = pinned ? "固定済み" : "ピン留め";
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
        text.textContent = message.text;

        item.append(meta, text);
        list.appendChild(item);
      }

      if (state?.loading) {
        const loading = document.createElement("div");
        loading.className = "kch-popover__loading-more";
        loading.innerHTML = `
          <span class="kch-popover__spinner" aria-hidden="true"></span>
          <span>同一配信内の過去コメントを取得中...</span>
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

  function positionPopover(anchor) {
    const rect = anchor.getBoundingClientRect();
    const margin = 10;
    const gap = 2;

    popover.style.left = "0px";
    popover.style.top = "0px";

    const popoverRect = popover.getBoundingClientRect();
    const alignRect = getPopoverAlignmentRect(anchor) || rect;
    let left = alignRect.right - popoverRect.width;
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
    activeRow = null;
    activeUsername = "";
    activeAnchor = null;
    activeRowRect = null;
    activeAnchorRect = null;
    isPointerOverPopover = false;
    popover.hidden = true;
  }

  function scheduleHidePopover() {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (isPointerInsideActiveHoverZone()) return;
      if (Date.now() - popoverShownAt < HOVER_GRACE_MS) {
        scheduleHidePopover();
        return;
      }
      hidePopover();
    }, 900);
  }

  function closeStaleHoverPopover() {
    if (!activeRow || popover.hidden || isPointerOverPopover) return;

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

    const popoverRect = popover.getBoundingClientRect();
    if (popoverRect.width <= 0 || popoverRect.height <= 0) return false;

    const sourceRect = activeRowRect || activeAnchorRect;
    const left = Math.min(sourceRect.left, popoverRect.left) - 18;
    const right = Math.max(sourceRect.right, popoverRect.right) + 18;
    const top = Math.min(sourceRect.top, popoverRect.top) - 18;
    const bottom = Math.max(sourceRect.bottom, popoverRect.bottom) + 18;

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

  function pinUser(username) {
    const key = normalizeUsername(username);
    if (!key) return;

    if (pinnedCards.has(key)) {
      const existing = pinnedCards.get(key);
      existing.element.hidden = false;
      existing.element.style.zIndex = String(2147483647);
      return;
    }

    if (pinnedCards.size >= MAX_PINNED_POPOVERS) {
      showPopoverNotice(`固定できるのは最大${MAX_PINNED_POPOVERS}人までです。`);
      return;
    }

    clearTimeout(hideTimer);
    const card = createPopover();
    card.hidden = false;
    card.classList.add("kch-popover--pinned");

    const sourceRect = popover.getBoundingClientRect();
    const index = pinnedCards.size;
    const position = {
      left: Math.min(sourceRect.left + index * 18, window.innerWidth - 280),
      top: Math.min(sourceRect.top + index * 18, window.innerHeight - 220)
    };

    pinnedCards.set(key, {
      element: card,
      username,
      position
    });
    attachPinnedCardEvents(card);
    renderPinnedCard(key);
    setElementPosition(card, position.left, position.top, key);
    updatePinnedApiRefresh();
    fetchPinnedApiUpdates();
    closeHoverPopover();
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
    updatePinnedApiRefresh();
  }

  function closeAllPinnedCards() {
    for (const card of pinnedCards.values()) {
      card.element.remove();
    }
    pinnedCards.clear();
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

  function renderMessageTime(meta, message) {
    if (getMessageTimestampKind(message) === "posted") {
      meta.textContent = formatTime(message.timestamp);
      meta.title = message.source === "api" ? "APIから取得した投稿時刻" : "ページ上から取得した投稿時刻";
      return;
    }

    meta.classList.add("kch-popover__meta--observed");
    meta.textContent = formatTime(message.timestamp);
    meta.title = "投稿時刻未確定。取得時刻を薄い斜線表示にしています。API照合で一致すれば投稿時刻に補正します。";
    meta.setAttribute("aria-label", `投稿時刻未確定。取得時刻 ${formatTime(message.timestamp)}`);
  }

  function assessAccountRisk(messages) {
    const normalizedMessages = messages
      .filter((message) => message?.text && message?.timestamp)
      .filter((message) => getMessageTimestampKind(message) === "posted")
      .map((message) => ({
        text: normalizeMessageForRisk(message.text),
        timestamp: message.timestamp,
        source: message.source || (message.id ? "api" : "dom")
      }))
      .filter((message) => message.text);

    if (normalizedMessages.length < 4) {
      return {
        suspicious: false,
        reasons: []
      };
    }

    const reasons = [];
    const sorted = dedupeRiskMessages(normalizedMessages).sort((a, b) => b.timestamp - a.timestamp);
    if (sorted.length < 4) {
      return {
        suspicious: false,
        reasons: []
      };
    }
    const newest = sorted[0]?.timestamp || 0;
    const recent60s = sorted.filter((message) => newest - message.timestamp <= 60000);
    const recent120s = sorted.filter((message) => newest - message.timestamp <= 120000);

    if (recent60s.length >= 5) {
      reasons.push("60秒以内に5件以上");
    } else if (recent120s.length >= 8) {
      reasons.push("120秒以内に8件以上");
    }

    const counts = new Map();
    for (const message of sorted) {
      counts.set(message.text, (counts.get(message.text) || 0) + 1);
    }

    if ([...counts.values()].some((count) => count >= 3)) {
      reasons.push("同一コメントを3回以上");
    }

    const intervals = [];
    for (let index = 1; index < sorted.length; index += 1) {
      intervals.push(Math.abs(sorted[index - 1].timestamp - sorted[index].timestamp));
    }

    if (hasBurstWindow(sorted, 3, 2000)) {
      reasons.push("2秒以内に3コメント以上");
    }

    const averageInterval = intervals.reduce((total, value) => total + value, 0) / Math.max(intervals.length, 1);
    if (sorted.length >= 6 && averageInterval > 0 && averageInterval <= 8000) {
      reasons.push("平均投稿間隔が8秒以下");
    }

    const urlLikeCount = sorted.filter((message) => /https?:\/\/|www\.|\.com\b|\.net\b|\.org\b/i.test(message.text)).length;
    if (urlLikeCount >= 3) {
      reasons.push("URL風コメントが多い");
    }

    return {
      suspicious: reasons.length >= 2,
      reasons
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
    backfillUserHistory(user.username);
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
    hidePopover();
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
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (!isInsideChatArea(node) && !isLikelyChatContainer(node)) continue;

        const usernameElement = getUsernameElement(node);
        if (usernameElement) {
          const row = findLikelyRowFromUsername(usernameElement);
          if (row) scanRow(row);
        }

        if (isInsideChatArea(node) && parseUsernameMessage(node)) {
          scanRow(node);
        }

        node.querySelectorAll?.(ANY_USERNAME_SELECTOR).forEach((candidate) => {
          if (!looksLikeUsername(getUsernameValue(candidate))) return;
          const row = findLikelyRowFromUsername(candidate);
          if (row) scanRow(row);
        });

        node.querySelectorAll?.("div, li, p, span").forEach((candidate) => {
          if (isInsideChatArea(candidate) && parseUsernameMessage(candidate)) scanRow(candidate);
        });
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveHistory, SAVE_DELAY_MS);
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
      userHistory.set(key, {
        displayName: value.displayName,
        messages: value.messages
          .filter((message) => message?.text && message?.timestamp)
          .filter((message) => !streamContext?.startedAt || message.timestamp >= streamContext.startedAt)
          .map((message) => ({
            ...message,
            source: message.source || (message.id ? "api" : "dom"),
            timestampKind: message.timestampKind || (message.source === "api" || message.correctedTimestamp ? "posted" : "observed"),
            correctedTimestamp: Boolean(message.correctedTimestamp)
          }))
          .slice(0, MAX_MESSAGES)
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
    clearTimeout(timestampCorrectionTimer);
    timestampCorrectionTimer = 0;
    clearSavedHistory();

    hidePopover();
    closeAllPinnedCards();
    userHistory.clear();
    apiWindowCache.clear();
    userBackfillState.clear();
    pendingTimestampCorrections.clear();
    pinnedApiCheckingUsers.clear();
    pinnedApiChecking = false;
    timestampCorrectionRunning = false;
    streamContext = null;
    activeChannelSlug = nextSlug;
    storageKey = `kch:${location.hostname}:${nextSlug}:route-pending`;

    try {
      await initializeStreamContext();
      loadHistory();
      scanPage();
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
        headers: {
          "Accept": "application/json"
        }
      });
      apiDebug.lastStatus = `channel:${response.status}`;
      if (!response.ok) {
        apiDebug.lastSkippedReason = `channel api ${response.status}`;
        return;
      }

      const channel = await response.json();
      const livestream = channel.livestream || channel.current_livestream || channel.recent_livestream || null;
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
        await fetchChatWindow(windowStart, { force: true });
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

  async function backfillUserHistory(username) {
    const key = normalizeUsername(username);
    if (!key) return;

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
    if (currentState?.failed && now - (currentState.lastAttemptAt || 0) < BACKFILL_RETRY_MS) return;

    userBackfillState.set(key, {
      loading: true,
      failed: false,
      done: false,
      reason: "",
      lastAttemptAt: now
    });
    refreshActivePopover(key);

    try {
      const beforeCount = userHistory.get(key)?.messages?.length || 0;
      const result = await fetchUserWindows(username);
      const messages = userHistory.get(key)?.messages || [];
      const addedCount = Math.max(0, messages.length - beforeCount);
      const done = result.exhausted || (messages.length >= MAX_MESSAGES && result.foundOlderThanBaseline);
      userBackfillState.set(key, {
        loading: false,
        failed: false,
        done,
        reason: addedCount || result.foundOlderThanBaseline ? "" : "API内に該当コメントなし",
        lastAttemptAt: Date.now()
      });
    } catch (_error) {
      userBackfillState.set(key, {
        loading: false,
        failed: true,
        done: false,
        reason: "APIエラー",
        lastAttemptAt: Date.now()
      });
    }

    refreshActivePopover(key);
  }

  async function fetchUserWindows(username) {
    const key = normalizeUsername(username);
    const now = Date.now();
    const streamStart = streamContext.startedAt;
    const baselineOldest = getOldestUserTimestamp(key) || now;
    let windowStart = Math.max(streamStart, now - API_WINDOW_MS);
    let foundOlderThanBaseline = false;

    for (let index = 0; index < MAX_API_WINDOWS_PER_USER && windowStart >= streamStart; index += 1) {
      const apiMessages = await fetchChatWindow(windowStart, { force: index < PINNED_API_LOOKBACK_WINDOWS });
      if (hasOlderApiMessageForUser(apiMessages, key, baselineOldest)) {
        foundOlderThanBaseline = true;
      }

      const messages = userHistory.get(key)?.messages || [];
      if (messages.length >= MAX_MESSAGES && foundOlderThanBaseline) {
        return {
          exhausted: false,
          foundOlderThanBaseline
        };
      }

      if (windowStart === streamStart) {
        return {
          exhausted: true,
          foundOlderThanBaseline
        };
      }
      windowStart = Math.max(streamStart, windowStart - API_WINDOW_MS);
    }

    apiDebug.lastSkippedReason = "API探索上限";
    return {
      exhausted: true,
      foundOlderThanBaseline
    };
  }

  function getOldestUserTimestamp(key) {
    const messages = userHistory.get(key)?.messages || [];
    if (!messages.length) return 0;
    return Math.min(...messages.map((message) => message.timestamp || Date.now()));
  }

  function hasOlderApiMessageForUser(messages, key, baselineOldest) {
    return messages.some((message) => {
      if (normalizeUsername(getApiMessageUsername(message)) !== key) return false;
      const timestamp = getApiMessageTimestamp(message);
      return timestamp && timestamp < baselineOldest - 1000;
    });
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

    if (!isChatPaused()) {
      if (pinnedApiCheckingUsers.size) {
        pinnedApiCheckingUsers.clear();
        pinnedApiChecking = false;
        refreshAllPopovers();
      }
      apiDebug.lastSkippedReason = "固定API確認: チャット一時停止なし";
      return;
    }

    if (!streamContext?.channelId || !streamContext?.startedAt) {
      await initializeStreamContext();
    }

    if (!streamContext?.channelId || !streamContext?.startedAt) {
      apiDebug.lastSkippedReason = "固定API確認: 配信情報なし";
      return;
    }

    pinnedApiChecking = true;
    pinnedApiCheckingUsers.clear();
    for (const key of pinnedCards.keys()) {
      pinnedApiCheckingUsers.add(key);
    }
    refreshAllPopovers();

    try {
      const now = Date.now();
      const windows = new Set();
      for (let index = 0; index < PINNED_API_LOOKBACK_WINDOWS; index += 1) {
        const start = Math.max(streamContext.startedAt, now - (index * API_WINDOW_MS));
        windows.add(Math.floor(start / API_WINDOW_MS) * API_WINDOW_MS);
      }

      for (const windowStart of [...windows].sort((a, b) => a - b)) {
        await fetchChatWindow(windowStart, { force: true });
      }
    } catch (_error) {
      apiDebug.lastSkippedReason = "固定API確認エラー";
    } finally {
      pinnedApiChecking = false;
      pinnedApiCheckingUsers.clear();
      refreshAllPopovers();
    }
  }

  async function fetchChatWindow(windowStart, options = {}) {
    const roundedStart = Math.floor(windowStart / API_WINDOW_MS) * API_WINDOW_MS;
    const cacheKey = `${streamContext.channelId}:${roundedStart}`;
    if (!options.force && apiWindowCache.has(cacheKey)) return [];

    const startTime = formatKickApiTime(roundedStart);
    const url = `${API_ORIGIN}/api/v2/channels/${encodeURIComponent(streamContext.channelId)}/messages?start_time=${encodeURIComponent(startTime)}`;
    apiDebug.attempts += 1;
    apiDebug.lastUrl = url;
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "application/json"
      }
    });
    apiDebug.lastStatus = `messages:${response.status}`;
    if (!response.ok) throw new Error(`chat api failed: ${response.status}`);
    apiWindowCache.add(cacheKey);

    const data = await response.json();
    apiDebug.lastResponseShape = describeApiResponseShape(data);
    const messages = extractApiMessages(data);
    apiDebug.lastMessageCount = messages.length;
    let acceptedCount = 0;
    for (const message of messages) {
      if (rememberApiMessage(message)) acceptedCount += 1;
    }
    apiDebug.lastAcceptedMessageCount = acceptedCount;
    return messages;
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
    return Boolean(looksLikeUsername(username) && getApiMessageText(message) && getApiMessageTimestamp(message));
  }

  function rememberApiMessage(message) {
    const username = getApiMessageUsername(message);
    const text = getApiMessageText(message);
    const timestamp = getApiMessageTimestamp(message);
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
    return cleanText(
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
    const date = new Date(timestamp);
    const pad = (value) => String(value).padStart(2, "0");

    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
      `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
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
  initializeStreamContext().finally(() => loadHistory()).finally(() => {
    scanPage();
    scanInterval = window.setInterval(periodicRefresh, 2000);
  });

  window.addEventListener("pagehide", () => {
    clearTimeout(saveTimer);
    clearTimeout(hideTimer);
    clearTimeout(timestampCorrectionTimer);
    timestampCorrectionTimer = 0;
    clearSavedHistory();
    if (scanInterval) window.clearInterval(scanInterval);
    if (pinnedApiInterval) window.clearInterval(pinnedApiInterval);
    pendingTimestampCorrections.clear();
    observer.disconnect();
  }, { once: true });

  window.addEventListener("beforeunload", clearSavedHistory);
})();
