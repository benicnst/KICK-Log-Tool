(() => {
  "use strict";

  const DISPLAY_ALL_MESSAGES = 0;
  const MAX_USERS = 250;
  const MAX_STREAM_CACHE_MESSAGES = 20000;
  const SAVE_DELAY_MS = 700;
  const API_WINDOW_MS = 60 * 1000;
  const API_ORIGIN = "https://kick.com";
  const WEB_API_ORIGIN = "https://web.kick.com";
  const BASE_STORAGE_KEY = `kch:${location.hostname}:${location.pathname.split("/").filter(Boolean)[0] || "home"}`;
  const SUSPICIOUS_STORAGE_SUFFIX = ":suspicious";
  const MODERATION_ACTIONS_STORAGE_KEY = "klt:moderationActionsEnabled";
  const SETTINGS_STORAGE_KEY = "klt:settings:v1";
  const FOLLOWED_CHANNELS_SYNC_STORAGE_KEY = "klt:followedChannelsSync:v1";
  const HOVER_GRACE_MS = 450;
  const HOVER_HIDE_DELAY_MS = 160;
  const HOVER_BRIDGE_MARGIN = 6;

  const DEFAULT_MAX_PINNED_POPOVERS = 3;
  const MIN_PINNED_POPOVERS = 0;
  const MAX_PINNED_POPOVERS = 5;
  const FOLLOWED_CHANNELS_REFRESH_MS = 10 * 60 * 1000;
  const FOLLOWED_CHANNELS_MAX_PAGES = 30;
  const FOLLOWED_CHANNELS_PAGE_SIZE = 100;
  const MAX_BROADCASTER_LIST_USERS = 500;
  const PINNED_Z_INDEX_BASE = 2147483200;
  const PINNED_Z_INDEX_MAX = 2147483600;
  const INITIAL_API_LOOKBACK_MINUTES = 60;
  const INITIAL_API_BACKFILL_MAX_WINDOWS = 6;
  const INITIAL_API_BACKFILL_MAX_PAGES = 40;
  const HISTORY_API_DIAGNOSTIC_MAX_PAGES = 6;
  const STORED_STREAM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const REALTIME_RECEIVE_DELAY_MS = 5000;
  const REALTIME_TIMESTAMP_TRUST_DELAY_MS = 8000;
  const REALTIME_TIMESTAMP_MAX_ROWS = 80;
  const WS_ACTIVE_DOM_SCAN_INTERVAL_MS = 8000;
  const WS_ACTIVE_GRACE_MS = 30000;
  const INGESTION_STATUS_VISIBLE_MS = 4200;
  const INGESTION_STATUS_THROTTLE_MS = 12000;
  const SUSPICIOUS_REPORT_RETRY_MS = 4000;
  const CHAT_STATUS_WINDOW_MS = 10 * 60 * 1000;
  const EMOTE_PLACEHOLDER = "[emote]";
  const MASS_REPEAT_MIN_LENGTH = 24;
  const MASS_REPEAT_STRONG_LENGTH = 80;
  const EMOTE_SPAM_MIN_COUNT = 16;
  const EMOTE_SPAM_STRONG_COUNT = 28;
  const BOT_SCORE_THRESHOLD = 60;
  const BOT_RULE_MATCH_THRESHOLD = 2;
  const OTHER_SCORE_THRESHOLD = 50;
  const DETECTION_SENSITIVITY_LEVELS = new Set(["low", "standard", "high"]);
  const DETECTION_SENSITIVITY_PRESETS = {
    low: {
      botScoreThreshold: 74,
      botRuleMatchThreshold: 3,
      otherScoreThreshold: 64
    },
    standard: {
      botScoreThreshold: BOT_SCORE_THRESHOLD,
      botRuleMatchThreshold: BOT_RULE_MATCH_THRESHOLD,
      otherScoreThreshold: OTHER_SCORE_THRESHOLD
    },
    high: {
      botScoreThreshold: 52,
      botRuleMatchThreshold: 2,
      otherScoreThreshold: 42
    }
  };
  const TEMPO_SCORE_CAP = 36;
  const REASON_THREAT = "危害/脅迫性の高い投稿";
  const REASON_ABUSE = "攻撃的暴言";
  const REASON_OLD_THREAT = "殺害/危害予告らしき投稿";
  const REASON_COORDINATED = "複数アカウント同一文連投";
  const REASON_LOW_INFO_REPEAT = "低情報コメント連投";
  const REASON_RAPID_SPAM = "短時間の高頻度連投";
  const SUSPICIOUS_EVAL_DEBOUNCE_MS = 1200;
  const COORDINATED_SPAM_WINDOW_MS = 25 * 1000;
  const COORDINATED_SPAM_MIN_USERS = 2;
  const COORDINATED_SPAM_MIN_EVENTS = 3;
  const COORDINATED_SPAM_BUCKET_COOLDOWN_MS = 10 * 1000;
  const COORDINATED_SPAM_MIN_TEXT_LENGTH = 28;
  const COORDINATED_SPAM_MIN_NORMALIZED_LENGTH = 14;
  const ALERT_ACTIONS = new Set(["notify", "auto-pin", "off"]);
  const DEFAULT_SETTINGS = {
    alertAction: "auto-pin",
    maxPinnedPopovers: DEFAULT_MAX_PINNED_POPOVERS,
    temporaryPopupDuration: 8,
    watchlistEnabled: true,
    ignorelistEnabled: true,
    broadcasterListEnabled: true,
    botDetectionEnabled: true,
    compactDashboardEnabled: true,
    botDetectionSensitivity: "standard",
    otherDetectionSensitivity: "standard",
    watchlist: [],
    ignorelist: [],
    broadcasterList: []
  };
  const UI_LANG = getUiLanguage();
  const TEXT = {
    ja: {
      timeoutTitle: "10分タイムアウト command を入力",
      banTitle: "BAN command を入力",
      profileTitle: "{username} のKickページを開く",
      unpin: "固定解除",
      pin: "ピン留め",
      addWatchlist: "ウォッチリストに追加",
      removeWatchlist: "ウォッチリストから削除",
      watchlistOn: "ウォッチ登録済み",
      watchlistAdded: "{username} をウォッチリストに追加しました。",
      watchlistRemoved: "{username} をウォッチリストから削除しました。",
      apiFailed: "APIから取得できませんでした。{reason}",
      loadingHistory: "コメント履歴を読み込み中...",
      fetchingHistory: "過去コメントを取得中.",
      maxPinned: "固定できるのは最大{count}人までです。",
      detected: "検出",
      commandInserted: "チャット入力欄にコマンドを入れました。送信すると実行されます。",
      inputMissing: "入力欄が見つかりません。手動で送信: {command}",
      uncertainTime: "投稿時刻未確定。取得時刻を薄い斜線表示にしています。API照合で一致すれば投稿時刻に補正します。",
      uncertainTimeLabel: "投稿時刻未確定。取得時刻 {time}",
      apiTime: "APIから取得した投稿時刻",
      realtimeTime: "リアルタイム取得の投稿時刻{suffix}",
      domTime: "DOM取得の投稿時刻{suffix}",
      observedTime: "ページ上から取得した投稿時刻{suffix}",
      delayedSuffix: "（受信遅延 {seconds}秒）",
      accountIdMissing: "アカウントIDを確認できませんでした。",
      realtimeWaiting: "リアルタイムコメント待ち",
      noChannel: "チャンネル名なし",
      initialNoContext: "初期API補完: 配信情報なし",
      initialApiError: "初期API補完エラー",
      followedDisabled: "配信者リストがOFFです。",
      followedLoading: "フォロー中チャンネルを読み込み中...",
      followedNotFound: "フォロー中チャンネルが見つかりませんでした。",
      notLoggedIn: "現在KICKにログインされていません。",
      loginRequired: "ログインが必要です",
      noSessionToken: "session_tokenが見つかりません",
      networkError: "通信エラー: {message}",
      wsFallbackActive: "WS未受信のためDOMで補完しています。",
      wsRecovered: "リアルタイム取得に復帰しました。",
      dashboardDetected: "検知",
      dashboardDetectedUsers: "検知: {count}",
      dashboardRecent: "直近{minutes}分",
      dashboardFallback: "WS未取得のためDOM補完中",
      dashboardWsMissing: "WS未接続",
      dashboardWsParseIssue: "WS解析注意",
      dashboardLoginIssue: "KICKにログインされていません",
      dashboardFollowedApiIssue: "APIによるフォローチャンネル取得失敗",
      dashboardApiIssue: "API通信エラー",
      chatStatusChecking: "判定中",
      chatStatusQuiet: "静か",
      chatStatusNormal: "通常",
      chatStatusActive: "盛り上がり中",
      chatStatusCaution: "荒れそう",
      chatStatusRough: "荒れ気味",
      idleSync: "Kickページを開くと自動読み込みします。"
    },
    en: {
      timeoutTitle: "Insert 10-minute timeout command",
      banTitle: "Insert ban command",
      profileTitle: "Open {username}'s Kick page",
      unpin: "Unpin",
      pin: "Pin",
      addWatchlist: "Add to watchlist",
      removeWatchlist: "Remove from watchlist",
      watchlistOn: "Already in watchlist",
      watchlistAdded: "Added {username} to the watchlist.",
      watchlistRemoved: "Removed {username} from the watchlist.",
      apiFailed: "Could not load from API.{reason}",
      loadingHistory: "Loading comment history...",
      fetchingHistory: "Loading past comments.",
      maxPinned: "You can pin up to {count} users.",
      detected: "Detected",
      commandInserted: "Command was inserted into the chat input. Send it to execute.",
      inputMissing: "Chat input was not found. Send manually: {command}",
      uncertainTime: "Post time is uncertain. The captured time is shown with a muted striped style. It will be corrected if API matching succeeds.",
      uncertainTimeLabel: "Post time is uncertain. Captured time {time}",
      apiTime: "Post time loaded from API",
      realtimeTime: "Realtime post time{suffix}",
      domTime: "DOM-captured post time{suffix}",
      observedTime: "Page-observed post time{suffix}",
      delayedSuffix: " (received {seconds}s late)",
      accountIdMissing: "Could not identify the account ID.",
      realtimeWaiting: "Waiting for realtime comments",
      noChannel: "No channel name",
      initialNoContext: "Initial API backfill: no stream info",
      initialApiError: "Initial API backfill error",
      followedDisabled: "Broadcaster list is off.",
      followedLoading: "Loading followed channels...",
      followedNotFound: "No followed channels found.",
      notLoggedIn: "You are not logged in to Kick.",
      loginRequired: "Login required",
      noSessionToken: "session_token was not found",
      networkError: "Network error: {message}",
      wsFallbackActive: "No recent WS messages. Filling from DOM.",
      wsRecovered: "Realtime capture recovered.",
      dashboardDetected: "Detected",
      dashboardDetectedUsers: "Detected: {count}",
      dashboardRecent: "Last {minutes}m",
      dashboardFallback: "No WS, using DOM fallback",
      dashboardWsMissing: "WS not hooked",
      dashboardWsParseIssue: "WS parse issue",
      dashboardLoginIssue: "Not logged in to Kick",
      dashboardFollowedApiIssue: "Failed to load followed channels via API",
      dashboardApiIssue: "API connection issue",
      chatStatusChecking: "Checking",
      chatStatusQuiet: "Quiet",
      chatStatusNormal: "Normal",
      chatStatusActive: "Active",
      chatStatusCaution: "Getting rough",
      chatStatusRough: "Rough",
      idleSync: "Open a Kick page to auto load."
    }
  };
  const CHAT_PAUSED_PATTERNS = [
    "スクロールのためにチャットが一時停止",
    "チャットが一時停止",
    "chat paused",
    "paused due to scroll",
    "paused while you scroll"
  ];

  const userHistory = new Map();
  const canonicalMessageStore = new Map();
  const canonicalMessageQueue = [];
  const canonicalUserIndex = new Map();
  const streamMessageCacheByUser = new Map();
  const streamMessageCacheQueue = [];
  const pinnedCards = new Map();
  const autoPinnedUsers = new Set();
  const autoPinDismissedUsers = new Set();
  const notifiedUsers = new Set();
  const broadcasterAvatarCache = new Map();
  const suspiciousUsers = new Map();
  const suspiciousEvalAt = new Map();
  const lastUserAnchors = new Map();
  const apiWindowCache = new Map();
  const userBackfillState = new Map();
  const coordinatedSpamBuckets = new Map();
  const transientScrollbarLists = new WeakSet();
  const skipReasonCounts = Object.create(null);
  const skipReasonLastAt = Object.create(null);
  const sourceAcceptedCounts = Object.create(null);
  const sourceDedupedCounts = Object.create(null);
  const followedApiCapturedUsernames = new Map();
  const historyFetchBridgeRequests = new Map();
  const apiDebug = {
    attempts: 0,
    contextAttempts: 0,
    lastUrl: "",
    lastStatus: "",
    lastStartTime: "",
    lastError: "",
    lastInitialWindowCount: 0,
    lastInitialRange: "",
    lastInitialOldestAt: "",
    lastInitialReachedTarget: false,
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
  let realtimeTimestampTrustReadyAt = Date.now() + REALTIME_TIMESTAMP_TRUST_DELAY_MS;
  let lastRealtimeWsMessageAt = 0;
  let realtimeWsMessagesAccepted = 0;
  let realtimeWsMessagesSeen = 0;
  let wsHookStatus = {
    hooked: false,
    rawMessages: 0,
    parsedMessages: 0,
    bufferSize: 0,
    lastStatusAt: 0
  };
  let lastWsStatusRequestAt = 0;
  let lastPeriodicDomScanAt = 0;
  let realtimeFallbackActive = false;
  let ingestionStatusTimer = 0;
  let ingestionStatusLastShownAt = 0;
  let compactDashboardElement = null;
  let routeResetInProgress = false;
  let historyFetchBridgeSequence = 0;
  let pinnedDragState = null;
  let pinnedResizeState = null;
  let popoverShownAt = 0;
  let suspiciousReportTimer = 0;
  let userSettings = { ...DEFAULT_SETTINGS };
  let followedChannelsSyncTimer = 0;
  let followedChannelsSyncRunning = false;
  let lastFollowedChannelsSyncAt = 0;
  let followedChannelsSyncStatus = createFollowedChannelsSyncStatus("idle", t("idleSync"));
  let lastFollowedApiCaptureAt = 0;
  let followedApiSyncDebounceTimer = 0;
  let runtimeMessagingInvalidated = false;
  let sessionEnteredAt = Date.now();
  let initialApiBackfillDone = false;
  let initialApiBackfillRunning = false;
  let nextPinnedZIndex = PINNED_Z_INDEX_BASE;
  let temporaryPopoverExpiresAt = 0;
  let compactDashboardNotice = "";
  let compactDashboardNoticeTimer = 0;

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

  function getUiLanguage() {
    const language = String(globalThis.chrome?.i18n?.getUILanguage?.() || navigator.language || "en").toLowerCase();
    return language.startsWith("ja") ? "ja" : "en";
  }

  function t(key, params = {}) {
    const dictionary = TEXT[UI_LANG] || TEXT.en;
    const fallback = TEXT.en[key] || TEXT.ja[key] || key;
    return String(dictionary[key] || fallback).replace(/\{(\w+)\}/g, (_match, name) => {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : "";
    });
  }

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
    const cacheSummary = getStreamCacheSummary();
    const userHistorySummary = getUserHistorySummary();
    const canonicalSummary = getCanonicalStoreSummary();
    return {
      skipReasons: { ...skipReasonCounts },
      acceptedBySource: { ...sourceAcceptedCounts },
      dedupedBySource: { ...sourceDedupedCounts },
      streamCache: cacheSummary,
      userHistory: userHistorySummary,
      canonicalStore: canonicalSummary
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
      compactDashboardEnabled: settings.compactDashboardEnabled !== false,
      botDetectionSensitivity: normalizeDetectionSensitivity(settings.botDetectionSensitivity),
      otherDetectionSensitivity: normalizeDetectionSensitivity(settings.otherDetectionSensitivity),
      watchlist: normalizeUsernameList(settings.watchlist),
      ignorelist: normalizeUsernameList(settings.ignorelist),
      broadcasterList: normalizeUsernameList(settings.broadcasterList, MAX_BROADCASTER_LIST_USERS)
    };
  }

  function normalizeDetectionSensitivity(value) {
    const level = String(value || "").trim().toLowerCase();
    return DETECTION_SENSITIVITY_LEVELS.has(level) ? level : "standard";
  }

  function getDetectionSensitivityPreset(kind) {
    const key = kind === "other"
      ? userSettings.otherDetectionSensitivity
      : userSettings.botDetectionSensitivity;
    return DETECTION_SENSITIVITY_PRESETS[normalizeDetectionSensitivity(key)] ||
      DETECTION_SENSITIVITY_PRESETS.standard;
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

  function hasUserInWatchlist(key) {
    return userSettings.watchlist.includes(key);
  }

  function isWatchlistedUser(key) {
    return userSettings.watchlistEnabled && hasUserInWatchlist(key);
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

  function inferTimestampKindFromSource(source, correctedTimestamp = false) {
    if (correctedTimestamp) return "posted";
    const value = String(source || "");
    if (value === "api" || value.startsWith("realtime") || value.startsWith("dom")) return "posted";
    return "observed";
  }

  function isRealtimeOrDomSource(source) {
    const value = String(source || "");
    return value.startsWith("realtime") || value.startsWith("dom");
  }

  function sanitizeTimestamp(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return Number(fallback) || Date.now();
    return numeric;
  }

  function resolveMessageTiming(messageSource, timestamp, timing = null) {
    const now = Date.now();
    const postedAt = sanitizeTimestamp(timing?.postedAt ?? timestamp, now);
    const receivedAtRaw = sanitizeTimestamp(timing?.receivedAt, now);
    const receivedAt = Math.max(postedAt, receivedAtRaw);
    const confidence = timing?.confidence === "fallback" ? "fallback" : "explicit";
    const latencyMs = isRealtimeOrDomSource(messageSource)
      ? Math.max(0, receivedAt - postedAt)
      : 0;
    const isDelayed = latencyMs > REALTIME_RECEIVE_DELAY_MS;

    return {
      postedAt,
      receivedAt,
      confidence,
      latencyMs,
      isDelayed
    };
  }

  function getMessageTimestampKind(message) {
    if (message?.timestampKind) return normalizeTimestampKind(message.timestampKind);
    return inferTimestampKindFromSource(message?.source, Boolean(message?.correctedTimestamp));
  }

  function rememberMessage(username, text, timestamp = Date.now(), messageId = "", source = "", timestampKind = "", timing = null) {
    const messageSource = source || (messageId ? "api" : "dom");
    const sourceKey = normalizeSourceKey(messageSource);
    const allowNumericOnly = messageSource === "api" || isTrustedNumericMessageSource(messageSource);
    const key = normalizeUsername(username);
    if (!key || !text || !looksLikeUsernameToken(username, { allowNumericOnly })) return false;

    const resolvedTiming = resolveMessageTiming(messageSource, timestamp, timing);
    if (streamContext?.startedAt && resolvedTiming.postedAt < streamContext.startedAt) return false;
    const resolvedTimestampKind = normalizeTimestampKind(
      timestampKind || inferTimestampKindFromSource(messageSource)
    );

    const existing = userHistory.get(key) || {
      displayName: username,
      messages: []
    };

    existing.displayName = username;
    const duplicate = findDuplicateMessage(
      existing.messages,
      text,
      resolvedTiming.postedAt,
      messageId,
      messageSource,
      resolvedTiming.confidence
    );

    if (!duplicate) {
      incrementCounter(sourceAcceptedCounts, sourceKey);
      const normalizedMessage = {
        id: messageId,
        text,
        timestamp: resolvedTiming.postedAt,
        postedAt: resolvedTiming.postedAt,
        receivedAt: resolvedTiming.receivedAt,
        timestampConfidence: resolvedTiming.confidence,
        latencyMs: resolvedTiming.latencyMs,
        isDelayed: resolvedTiming.isDelayed,
        source: messageSource,
        timestampKind: resolvedTimestampKind
      };
      existing.messages.unshift(normalizedMessage);
      rememberCanonicalMessage(key, existing.displayName, normalizedMessage);
      cacheStreamMessage(key, existing.displayName, {
        id: messageId,
        text,
        timestamp: resolvedTiming.postedAt,
        postedAt: resolvedTiming.postedAt,
        receivedAt: resolvedTiming.receivedAt,
        timestampConfidence: resolvedTiming.confidence,
        latencyMs: resolvedTiming.latencyMs,
        isDelayed: resolvedTiming.isDelayed,
        source: messageSource,
        timestampKind: resolvedTimestampKind
      });
    } else {
      incrementCounter(sourceDedupedCounts, sourceKey);
      noteSkipReason(`duplicate:${sourceKey}`);

      if (isTrustedPostedMessageSource(messageSource) && getMessageTimestampKind(duplicate) === "observed") {
        duplicate.id = pickBetterMessageId(duplicate.id, messageId);
        duplicate.timestamp = resolvedTiming.postedAt;
        duplicate.postedAt = resolvedTiming.postedAt;
        duplicate.receivedAt = resolvedTiming.receivedAt;
        duplicate.timestampConfidence = resolvedTiming.confidence;
        duplicate.latencyMs = resolvedTiming.latencyMs;
        duplicate.isDelayed = resolvedTiming.isDelayed;
        duplicate.source = messageSource;
        duplicate.timestampKind = "posted";
        duplicate.correctedTimestamp = true;
      } else if (getMessageSourcePriority(messageSource) > getMessageSourcePriority(duplicate.source)) {
        duplicate.id = pickBetterMessageId(duplicate.id, messageId);
        duplicate.timestamp = resolvedTiming.postedAt;
        duplicate.postedAt = resolvedTiming.postedAt;
        duplicate.receivedAt = resolvedTiming.receivedAt;
        duplicate.timestampConfidence = resolvedTiming.confidence;
        duplicate.latencyMs = resolvedTiming.latencyMs;
        duplicate.isDelayed = resolvedTiming.isDelayed;
        duplicate.source = messageSource;
        duplicate.timestampKind = resolvedTimestampKind;
      } else if (messageId && (!duplicate.id || (hasStrongMessageId(messageId) && !hasStrongMessageId(duplicate.id)))) {
        duplicate.id = messageId;
        duplicate.timestampKind = duplicate.timestampKind || getMessageTimestampKind(duplicate);
      }
    }

    if (!duplicate || isTrustedPostedMessageSource(messageSource)) {
      existing.messages.sort((a, b) => b.timestamp - a.timestamp);
    }

    if (canonicalUserIndex.has(key)) {
      syncCompatibilityUserHistoryEntry(key, existing.displayName);
    } else {
      userHistory.delete(key);
      userHistory.set(key, existing);
    }
    pruneUsers();
    pruneUserHistoryMessages();
    scheduleSave();
    if (!duplicate || isTrustedPostedMessageSource(messageSource)) refreshActivePopover(key);
    if (!duplicate || !suspiciousUsers.has(key)) {
      handleListedUserCandidate(key, existing.displayName, messageSource);
    }
    if (!duplicate) {
      updateIngestionStatusFromAcceptedMessage(messageSource);
    }
    if (shouldRunSuspiciousEvaluation(key, messageSource, resolvedTimestampKind, !duplicate)) {
      handleSuspiciousUserCandidate(key, existing.displayName, messageSource, resolvedTimestampKind);
    }
    trackCoordinatedSpamCandidate(key, existing.displayName, text, resolvedTiming.postedAt, messageSource, resolvedTimestampKind, !duplicate);
    return !duplicate;
  }

  function shouldCacheStreamMessage(source) {
    const value = String(source || "");
    return value.startsWith("realtime") ||
      value.startsWith("dom") ||
      value.startsWith("observed") ||
      value === "api";
  }

  function createStreamCacheEntry(key, message) {
    const sourceKey = normalizeSourceKey(message?.source || "observed");
    const normalizedId = normalizeMessageId(message?.id || message?.realId || message?.messageId || "");
    const hasStrongId = hasStrongMessageId(normalizedId);
    const realId = hasStrongId ? normalizedId : "";
    const postedAt = sanitizeTimestamp(message?.postedAt ?? message?.timestamp, Date.now());
    const receivedAtRaw = sanitizeTimestamp(message?.receivedAt, postedAt);
    const receivedAt = Math.max(postedAt, receivedAtRaw);
    const latencyMsRaw = Number(message?.latencyMs);
    const latencyMs = Number.isFinite(latencyMsRaw) && latencyMsRaw >= 0
      ? latencyMsRaw
      : (isRealtimeOrDomSource(sourceKey) ? Math.max(0, receivedAt - postedAt) : 0);
    const isDelayed = Boolean(message?.isDelayed) ||
      (isRealtimeOrDomSource(sourceKey) && latencyMs > REALTIME_RECEIVE_DELAY_MS);
    const timestampConfidence = message?.timestampConfidence === "fallback" ? "fallback" : "explicit";
    const text = cleanText(message?.text || "");
    const syntheticId = realId
      ? ""
      : (normalizedId || buildSyntheticMessageId(sourceKey || "msg", key, text, postedAt));
    const messageId = realId || syntheticId;
    const cacheKey = `id:${messageId}`;

    return {
      cacheKey,
      messageId,
      idKind: realId ? "real" : "synthetic",
      realId,
      text,
      timestamp: postedAt,
      postedAt,
      receivedAt,
      timestampConfidence,
      latencyMs,
      isDelayed,
      source: sourceKey || "observed",
      timestampKind: normalizeTimestampKind(message?.timestampKind)
    };
  }

  function cacheStreamMessage(key, displayName, message) {
    if (!key || !message?.text || !shouldCacheStreamMessage(message.source)) return;

    const entry = createStreamCacheEntry(key, message);
    if (!entry?.cacheKey) return;
    const userCache = streamMessageCacheByUser.get(key) || {
      displayName,
      items: new Map()
    };
    userCache.displayName = displayName || userCache.displayName || key;
    if (userCache.items.has(entry.cacheKey)) return;

    userCache.items.set(entry.cacheKey, entry);

    streamMessageCacheByUser.set(key, userCache);
    streamMessageCacheQueue.push({
      key,
      cacheKey: entry.cacheKey
    });

    while (streamMessageCacheQueue.length > MAX_STREAM_CACHE_MESSAGES) {
      const oldest = streamMessageCacheQueue.shift();
      if (!oldest) break;
      const bucket = streamMessageCacheByUser.get(oldest.key);
      if (!bucket) continue;
      if (!bucket.items.has(oldest.cacheKey)) continue;
      bucket.items.delete(oldest.cacheKey);
      if (!bucket.items.size) streamMessageCacheByUser.delete(oldest.key);
    }
  }

  function getCachedMessagesForUser(key, limit = DISPLAY_ALL_MESSAGES) {
    const bucket = streamMessageCacheByUser.get(key);
    const values = bucket?.items ? [...bucket.items.values()] : [];
    if (!values.length) return [];
    const sorted = values
      .slice()
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    const normalizedLimit = Number(limit);
    const limited = Number.isFinite(normalizedLimit) && normalizedLimit > 0
      ? sorted.slice(0, Math.max(1, normalizedLimit))
      : sorted;
    return limited.map((message) => ({
      id: message.idKind === "real" ? message.realId : "",
      messageId: message.messageId || "",
      idKind: message.idKind || "synthetic",
      text: message.text,
      timestamp: Number(message.timestamp) || Date.now(),
      postedAt: Number(message.postedAt) || Number(message.timestamp) || Date.now(),
      receivedAt: Number(message.receivedAt) || Number(message.postedAt) || Number(message.timestamp) || Date.now(),
      timestampConfidence: message.timestampConfidence === "fallback" ? "fallback" : "explicit",
      latencyMs: Number(message.latencyMs) || 0,
      isDelayed: Boolean(message.isDelayed),
      source: message.source || "observed",
      timestampKind: normalizeTimestampKind(message.timestampKind)
    }));
  }

  function getDisplayMessageIdentity(message) {
    const realId = normalizeMessageId(message?.messageId || message?.id || "");
    if (realId) return `id:${realId}`;

    const source = normalizeSourceKey(message?.source || "");
    const timestamp = sanitizeTimestamp(message?.postedAt ?? message?.timestamp, 0);
    const text = cleanText(message?.text || "");
    return `fallback:${source}:${timestamp}:${text}`;
  }

  function addDisplayMessage(merged, message) {
    const duplicateKey = findDuplicateDisplayMessageKey(merged, message);
    if (duplicateKey) {
      merged.set(duplicateKey, pickBetterDisplayMessage(merged.get(duplicateKey), message));
      return;
    }

    merged.set(getDisplayMessageIdentity(message), message);
  }

  function findDuplicateDisplayMessageKey(merged, nextMessage) {
    const nextText = cleanText(nextMessage?.text || "");
    if (!nextText) return "";

    const nextId = normalizeMessageId(nextMessage?.messageId || nextMessage?.id || "");
    const nextFamily = getMessageSourceFamily(nextMessage?.source);
    const nextTimestamp = sanitizeTimestamp(nextMessage?.postedAt ?? nextMessage?.timestamp, 0);
    for (const [key, existing] of merged.entries()) {
      if (cleanText(existing?.text || "") !== nextText) continue;

      const existingId = normalizeMessageId(existing?.messageId || existing?.id || "");
      if (hasStrongMessageId(existingId) && hasStrongMessageId(nextId) && existingId !== nextId) continue;

      const existingFamily = getMessageSourceFamily(existing?.source);
      const tolerance = isRealtimeDomFamilyPair(existingFamily, nextFamily) &&
        (!hasStrongMessageId(existingId) || !hasStrongMessageId(nextId))
        ? 120000
        : getDuplicateToleranceMs(existing, nextMessage?.source, nextFamily, nextId, nextMessage?.timestampConfidence);
      const existingTimestamp = sanitizeTimestamp(existing?.postedAt ?? existing?.timestamp, 0);
      if (Math.abs(existingTimestamp - nextTimestamp) <= tolerance) return key;
    }

    return "";
  }

  function pickBetterDisplayMessage(current, next) {
    if (!current) return next;
    if (!next) return current;
    const currentPriority = getMessageSourcePriority(current.source);
    const nextPriority = getMessageSourcePriority(next.source);
    if (nextPriority > currentPriority) {
      return {
        ...next,
        timestamp: current.timestamp || next.timestamp,
        postedAt: current.postedAt || next.postedAt
      };
    }
    if (!hasStrongMessageId(current.id || current.messageId) && hasStrongMessageId(next.id || next.messageId)) {
      return {
        ...current,
        id: next.id || current.id,
        messageId: next.messageId || current.messageId,
        idKind: next.idKind || current.idKind
      };
    }
    return current;
  }

  function getCanonicalMessagesForUser(key, limit = DISPLAY_ALL_MESSAGES) {
    const entry = canonicalUserIndex.get(key);
    const messageKeys = entry?.messageKeys instanceof Set ? [...entry.messageKeys] : [];
    if (!messageKeys.length) return [];

    const sorted = messageKeys
      .map((messageKey) => canonicalMessageStore.get(messageKey))
      .filter((record) => record?.text)
      .sort((a, b) => Number(b.postedAt || 0) - Number(a.postedAt || 0));

    const normalizedLimit = Number(limit);
    const limited = Number.isFinite(normalizedLimit) && normalizedLimit > 0
      ? sorted.slice(0, Math.max(1, normalizedLimit))
      : sorted;

    return limited.map((record) => ({
      id: record.idKind === "real" ? record.messageId : "",
      messageId: record.messageId || "",
      messageKey: record.messageKey || "",
      idKind: record.idKind || "synthetic",
      text: record.text,
      timestamp: Number(record.postedAt) || Date.now(),
      postedAt: Number(record.postedAt) || Date.now(),
      receivedAt: Number(record.receivedAt) || Number(record.postedAt) || Date.now(),
      timestampConfidence: record.timestampConfidence === "fallback" ? "fallback" : "explicit",
      latencyMs: Number(record.latencyMs) || 0,
      isDelayed: Boolean(record.isDelayed),
      source: record.source || "observed",
      timestampKind: normalizeTimestampKind(record.timestampKind)
    }));
  }

  function getCanonicalHistoryMessagesForUser(key) {
    const values = getCanonicalMessagesForUser(key, DISPLAY_ALL_MESSAGES);
    return values.map((message) => ({
      ...message,
      userKey: key
    }));
  }

  function getDetectionMessagesForUser(key) {
    const canonicalMessages = getCanonicalHistoryMessagesForUser(key);
    if (canonicalMessages.length) return canonicalMessages;
    const history = userHistory.get(key);
    if (Array.isArray(history?.messages) && history.messages.length) {
      return history.messages;
    }
    return [];
  }

  function getDisplayNameForUser(key) {
    const canonicalName = cleanText(canonicalUserIndex.get(key)?.displayName || "");
    if (canonicalName) return canonicalName;
    return cleanText(userHistory.get(key)?.displayName || key);
  }

  function getDisplayMessagesForUser(key) {
    const canonicalMessages = getCanonicalMessagesForUser(key, DISPLAY_ALL_MESSAGES);
    if (canonicalMessages.length) {
      return canonicalMessages;
    }

    const history = userHistory.get(key);
    const historyMessages = Array.isArray(history?.messages) ? history.messages : [];
    if (!historyMessages.length) return [];
    return historyMessages.slice().sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0));
  }

  function getStreamCacheDiagnostics(limitPerUser = 5) {
    const users = [];
    const sourceCounts = Object.create(null);
    let totalMessages = 0;
    let realIdMessages = 0;
    let syntheticIdMessages = 0;

    for (const [userKey, bucket] of streamMessageCacheByUser.entries()) {
      const values = bucket?.items ? [...bucket.items.values()] : [];
      if (!values.length) continue;

      totalMessages += values.length;
      const sorted = values.slice().sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
      const preview = sorted.slice(0, Math.max(1, Number(limitPerUser) || 5)).map((message) => ({
        id: message.idKind === "real" ? message.realId : "",
        messageId: message.messageId,
        idKind: message.idKind,
        source: message.source,
        timestamp: message.timestamp,
        text: message.text
      }));

      for (const message of values) {
        if (message.idKind === "real") realIdMessages += 1;
        else syntheticIdMessages += 1;
        incrementCounter(sourceCounts, normalizeSourceKey(message.source));
      }

      users.push({
        userKey,
        displayName: bucket.displayName || userKey,
        count: values.length,
        preview
      });
    }

    users.sort((a, b) => b.count - a.count);
    return {
      userCount: users.length,
      totalMessages,
      realIdMessages,
      syntheticIdMessages,
      sourceCounts: { ...sourceCounts },
      users
    };
  }

  function getStreamCacheSummary() {
    let totalMessages = 0;
    let realIdMessages = 0;
    let syntheticIdMessages = 0;
    const sourceCounts = Object.create(null);

    for (const bucket of streamMessageCacheByUser.values()) {
      const values = bucket?.items ? [...bucket.items.values()] : [];
      totalMessages += values.length;
      for (const message of values) {
        if (message.idKind === "real") realIdMessages += 1;
        else syntheticIdMessages += 1;
        incrementCounter(sourceCounts, normalizeSourceKey(message.source));
      }
    }

    return {
      users: streamMessageCacheByUser.size,
      totalMessages,
      realIdMessages,
      syntheticIdMessages,
      queue: streamMessageCacheQueue.length,
      sourceCounts: { ...sourceCounts }
    };
  }

  function getUserHistoryDiagnostics(limitPerUser = 5) {
    const users = [];
    const sourceCounts = Object.create(null);
    let totalMessages = 0;
    let realIdMessages = 0;
    let syntheticIdMessages = 0;

    for (const [userKey, history] of userHistory.entries()) {
      const values = Array.isArray(history?.messages) ? history.messages : [];
      if (!values.length) continue;

      totalMessages += values.length;
      const sorted = values.slice().sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
      const preview = sorted.slice(0, Math.max(1, Number(limitPerUser) || 5)).map((message) => {
        const id = getMessageDiagnosticId(message);
        return {
          id: hasStrongMessageId(id) ? id : "",
          messageId: id,
          idKind: hasStrongMessageId(id) ? "real" : "synthetic",
          source: message.source || "",
          timestamp: message.timestamp,
          text: message.text
        };
      });

      for (const message of values) {
        const id = getMessageDiagnosticId(message);
        if (hasStrongMessageId(id)) realIdMessages += 1;
        else syntheticIdMessages += 1;
        incrementCounter(sourceCounts, normalizeSourceKey(message.source));
      }

      users.push({
        userKey,
        displayName: history.displayName || userKey,
        count: values.length,
        preview
      });
    }

    users.sort((a, b) => b.count - a.count);
    return {
      userCount: users.length,
      totalMessages,
      realIdMessages,
      syntheticIdMessages,
      sourceCounts: { ...sourceCounts },
      users
    };
  }

  function getUserHistorySummary() {
    let totalMessages = 0;
    let realIdMessages = 0;
    let syntheticIdMessages = 0;
    const sourceCounts = Object.create(null);

    for (const history of userHistory.values()) {
      const values = Array.isArray(history?.messages) ? history.messages : [];
      totalMessages += values.length;
      for (const message of values) {
        const id = getMessageDiagnosticId(message);
        if (hasStrongMessageId(id)) realIdMessages += 1;
        else syntheticIdMessages += 1;
        incrementCounter(sourceCounts, normalizeSourceKey(message.source));
      }
    }

    return {
      users: userHistory.size,
      totalMessages,
      realIdMessages,
      syntheticIdMessages,
      sourceCounts: { ...sourceCounts }
    };
  }

  function getMessageDiagnosticId(message) {
    const normalized = normalizeMessageId(message?.id || message?.messageId || message?.realId || "");
    if (normalized) return normalized;
    const raw = cleanText(message?.id || message?.messageId || "");
    return raw || "";
  }

  function getCanonicalChannelKey() {
    return cleanText(activeChannelSlug || streamContext?.slug || getChannelSlug() || "");
  }

  function getCanonicalStreamKey() {
    return cleanText(getCurrentStreamKey() || "current");
  }

  function buildCanonicalMessageKey(userKey, message) {
    const strongId = normalizeMessageId(message?.id || message?.messageId || "");
    if (strongId) return `id:${strongId}`;

    const source = normalizeSourceKey(message?.source || "observed");
    const postedAt = sanitizeTimestamp(message?.postedAt ?? message?.timestamp, 0);
    const normalizedText = cleanText(message?.text || "");
    return `fallback:${source}:${userKey}:${postedAt}:${normalizedText}`;
  }

  function createCanonicalMessageRecord(userKey, displayName, message) {
    const postedAt = sanitizeTimestamp(message?.postedAt ?? message?.timestamp, Date.now());
    const receivedAt = Math.max(postedAt, sanitizeTimestamp(message?.receivedAt, postedAt));
    const normalizedId = normalizeMessageId(message?.id || message?.messageId || "");
    const hasStrongId = hasStrongMessageId(normalizedId);
    const messageKey = buildCanonicalMessageKey(userKey, message);

    return {
      channelKey: getCanonicalChannelKey(),
      streamKey: getCanonicalStreamKey(),
      userKey,
      displayName: cleanText(displayName || userKey),
      avatarUrl: "",
      messageId: normalizedId || "",
      messageKey,
      idKind: hasStrongId ? "real" : "synthetic",
      text: cleanText(message?.text || ""),
      postedAt,
      receivedAt,
      source: normalizeSourceKey(message?.source || "observed"),
      timestampKind: normalizeTimestampKind(message?.timestampKind),
      timestampConfidence: message?.timestampConfidence === "fallback" ? "fallback" : "explicit",
      latencyMs: Number(message?.latencyMs) || 0,
      isDelayed: Boolean(message?.isDelayed)
    };
  }

  function upsertCanonicalUserIndex(userKey, displayName, avatarUrl, messageKey) {
    const existing = canonicalUserIndex.get(userKey) || {
      displayName: cleanText(displayName || userKey),
      avatarUrl: "",
      messageKeys: new Set()
    };
    existing.displayName = cleanText(displayName || existing.displayName || userKey);
    if (isHttpUrl(avatarUrl)) existing.avatarUrl = String(avatarUrl);
    if (messageKey) existing.messageKeys.add(messageKey);
    canonicalUserIndex.set(userKey, existing);
  }

  function rememberCanonicalMessage(userKey, displayName, message, options = {}) {
    if (!userKey || !message?.text) return;
    const syncCompatibility = options.syncCompatibility !== false;
    const shouldPrune = options.prune !== false;
    const record = createCanonicalMessageRecord(userKey, displayName, message);
    if (!record.messageKey) return;

    const existing = canonicalMessageStore.get(record.messageKey);
    if (!existing || getMessageSourcePriority(record.source) >= getMessageSourcePriority(existing.source)) {
      canonicalMessageStore.set(record.messageKey, record);
    }
    upsertCanonicalUserIndex(userKey, displayName, existing?.avatarUrl || "", record.messageKey);
    if (!existing) {
      canonicalMessageQueue.push({
        userKey,
        messageKey: record.messageKey
      });
    }
    if (shouldPrune) pruneCanonicalStore();
    if (syncCompatibility) syncCompatibilityUserHistoryEntry(userKey, displayName);
  }

  function clearCanonicalStore() {
    canonicalMessageStore.clear();
    canonicalMessageQueue.length = 0;
    canonicalUserIndex.clear();
  }

  function rebuildCanonicalStoreFromUserHistory() {
    clearCanonicalStore();
    for (const [userKey, history] of userHistory.entries()) {
      if (!history?.displayName || !Array.isArray(history.messages)) continue;
      for (const message of history.messages) {
        if (!message?.text) continue;
        rememberCanonicalMessage(userKey, history.displayName, message, {
          syncCompatibility: false,
          prune: false
        });
      }
    }
    pruneCanonicalStore();
    rebuildCompatibilityUserHistoryFromCanonicalStore();
  }

  function removeCanonicalMessage(userKey, messageKey) {
    canonicalMessageStore.delete(messageKey);
    const entry = canonicalUserIndex.get(userKey);
    if (!entry?.messageKeys) return;
    entry.messageKeys.delete(messageKey);
    if (!entry.messageKeys.size) {
      canonicalUserIndex.delete(userKey);
      return;
    }
    canonicalUserIndex.set(userKey, entry);
  }

  function pruneCanonicalStore() {
    if (!canonicalMessageStore.size) return 0;

    let removedCount = 0;
    const touchedUsers = new Set();
    while (canonicalMessageStore.size > MAX_STREAM_CACHE_MESSAGES && canonicalMessageQueue.length) {
      const oldest = canonicalMessageQueue.shift();
      if (!oldest || !canonicalMessageStore.has(oldest.messageKey)) continue;
      removeCanonicalMessage(oldest.userKey, oldest.messageKey);
      touchedUsers.add(oldest.userKey);
      removedCount += 1;
    }

    if (removedCount > 0) {
      for (const userKey of touchedUsers) {
        syncCompatibilityUserHistoryEntry(userKey);
      }
    }

    return removedCount;
  }

  function syncCompatibilityUserHistoryEntry(userKey, fallbackDisplayName = "") {
    if (!userKey) return;
    const messages = getCanonicalHistoryMessagesForUser(userKey);
    if (!messages.length) {
      userHistory.delete(userKey);
      return;
    }

    userHistory.set(userKey, {
      displayName: getDisplayNameForUser(userKey) || fallbackDisplayName || userKey,
      messages
    });
  }

  function rebuildCompatibilityUserHistoryFromCanonicalStore() {
    userHistory.clear();
    for (const userKey of canonicalUserIndex.keys()) {
      syncCompatibilityUserHistoryEntry(userKey);
    }
  }

  function serializeCompatibilityUserHistory() {
    const users = {};
    for (const userKey of canonicalUserIndex.keys()) {
      const displayName = getDisplayNameForUser(userKey);
      const messages = getCanonicalHistoryMessagesForUser(userKey);
      if (!displayName || !messages.length) continue;
      users[userKey] = {
        displayName,
        messages
      };
    }

    if (Object.keys(users).length) return users;

    for (const [userKey, history] of userHistory.entries()) {
      if (!history?.displayName || !Array.isArray(history.messages) || !history.messages.length) continue;
      users[userKey] = {
        displayName: history.displayName,
        messages: history.messages
      };
    }

    return users;
  }

  function getCanonicalStoreDiagnostics(limitPerUser = 5) {
    const sourceCounts = Object.create(null);
    const users = [];

    for (const record of canonicalMessageStore.values()) {
      incrementCounter(sourceCounts, normalizeSourceKey(record.source));
    }

    for (const [userKey, entry] of canonicalUserIndex.entries()) {
      const messageKeys = [...entry.messageKeys];
      const preview = messageKeys
        .map((messageKey) => canonicalMessageStore.get(messageKey))
        .filter(Boolean)
        .sort((a, b) => Number(b.postedAt || 0) - Number(a.postedAt || 0))
        .slice(0, Math.max(1, Number(limitPerUser) || 5))
        .map((record) => ({
          id: record.idKind === "real" ? record.messageId : "",
          messageKey: record.messageKey,
          idKind: record.idKind,
          source: record.source,
          timestamp: record.postedAt,
          text: record.text
        }));

      users.push({
        userKey,
        displayName: entry.displayName || userKey,
        count: messageKeys.length,
        preview
      });
    }

    users.sort((a, b) => b.count - a.count);
    return {
      userCount: canonicalUserIndex.size,
      totalMessages: canonicalMessageStore.size,
      sourceCounts: { ...sourceCounts },
      users
    };
  }

  function getCanonicalStoreSummary() {
    const sourceCounts = Object.create(null);
    let realIdMessages = 0;
    let syntheticIdMessages = 0;

    for (const record of canonicalMessageStore.values()) {
      if (record.idKind === "real") realIdMessages += 1;
      else syntheticIdMessages += 1;
      incrementCounter(sourceCounts, normalizeSourceKey(record.source));
    }

    return {
      users: canonicalUserIndex.size,
      totalMessages: canonicalMessageStore.size,
      realIdMessages,
      syntheticIdMessages,
      sourceCounts: { ...sourceCounts }
    };
  }

  function getChatStatusSnapshot() {
    const now = Date.now();
    const windowStart = now - CHAT_STATUS_WINDOW_MS;
    const users = new Set();
    let messageCount = 0;
    let detectedUserCount = 0;
    let highRiskDetectedCount = 0;

    const userKeys = canonicalUserIndex.keys();

    for (const userKey of userKeys) {
      const values = getCanonicalHistoryMessagesForUser(userKey);
      let userHasRecentMessage = false;

      for (const message of values) {
        const timestamp = Number(message.postedAt || message.timestamp || 0);
        if (!timestamp || timestamp < windowStart || timestamp > now + 1000) continue;
        messageCount += 1;
        userHasRecentMessage = true;
      }

      if (userHasRecentMessage) users.add(userKey);
    }

    for (const user of suspiciousUsers.values()) {
      detectedUserCount += 1;
      const detectedAt = Number(user?.lastDetectedAt || 0);
      if (!detectedAt || detectedAt < windowStart) continue;
      if (Boolean(user?.riskCritical) || Number(user?.riskScore || 0) >= 80) {
        highRiskDetectedCount += 1;
      }
    }

    return {
      level: getChatStatusLevel(messageCount, users.size, detectedUserCount, highRiskDetectedCount),
      windowMinutes: Math.round(CHAT_STATUS_WINDOW_MS / 60000),
      messageCount,
      userCount: users.size,
      detectionCount: detectedUserCount,
      detectedUserCount,
      highRiskCount: highRiskDetectedCount
    };
  }

  function getChatStatusLevel(messageCount, userCount, detectionCount, highRiskCount) {
    if (messageCount <= 0 && userCount <= 0 && detectionCount <= 0 && highRiskCount <= 0) return "checking";
    if (highRiskCount >= 3 || detectionCount >= 8) return "rough";
    if (highRiskCount >= 2 || detectionCount >= 4) return "caution";
    if (messageCount >= 80 || userCount >= 28) return "active";
    if (messageCount >= 16 || userCount >= 8) return "normal";
    return "quiet";
  }

  function getChatStatusLabel(level) {
    const labels = {
      checking: t("chatStatusChecking"),
      quiet: t("chatStatusQuiet"),
      normal: t("chatStatusNormal"),
      active: t("chatStatusActive"),
      caution: t("chatStatusCaution"),
      rough: t("chatStatusRough")
    };
    return labels[level] || labels.checking;
  }

  function getCompactDashboardSnapshot() {
    const status = getChatStatusSnapshot();
    const fallbackNotice = realtimeFallbackActive ? t("dashboardFallback") : "";
    const notice = cleanText(compactDashboardNotice) || fallbackNotice;

    return {
      status,
      issues: getCompactDashboardIssues(),
      notice
    };
  }

  function getCompactDashboardIssues() {
    const issues = [];
    if (realtimeFallbackActive && hasExitedRealtimeStartupGrace()) {
      if (!wsHookStatus.hooked) {
        issues.push(t("dashboardWsMissing"));
      } else if (Number(wsHookStatus.rawMessages || 0) >= 10 && Number(wsHookStatus.parsedMessages || 0) <= 0) {
        issues.push(t("dashboardWsParseIssue"));
      }
    }

    if (!isMaybeLoggedIn()) {
      issues.push(t("dashboardLoginIssue"));
    }

    if (userSettings.broadcasterListEnabled && followedChannelsSyncStatus?.state === "failed") {
      const reason = cleanText(followedChannelsSyncStatus.reason || "");
      if (/ログイン|login/i.test(reason)) {
        issues.push(t("dashboardLoginIssue"));
      } else {
        issues.push(t("dashboardFollowedApiIssue"));
      }
    }

    const lastStatus = String(apiDebug.lastStatus || "");
    const hasApiIssue = /^history-|^messages:|^channel:/.test(lastStatus) &&
      !/:?200$/.test(lastStatus) &&
      !/^history-bridge:200$/.test(lastStatus);
    if (hasApiIssue || apiDebug.lastError) issues.push(t("dashboardApiIssue"));

    return [...new Set(issues)].slice(0, 3);
  }

  function updateCompactDashboard() {
    if (!userSettings.compactDashboardEnabled) {
      removeCompactDashboard();
      return;
    }

    const chatRoot = getChatRoots()[0];
    if (!chatRoot || !chatRoot.parentElement || !isVisibleElement(chatRoot)) {
      removeCompactDashboard();
      return;
    }

    const dashboard = getCompactDashboardElement();
    const mount = getCompactDashboardMount(chatRoot);
    if (!mount.parent) {
      removeCompactDashboard();
      return;
    }

    if (dashboard.parentElement !== mount.parent || dashboard.nextElementSibling !== mount.before) {
      mount.parent.insertBefore(dashboard, mount.before || null);
    }

    renderCompactDashboard(dashboard, getCompactDashboardSnapshot());
  }

  function getCompactDashboardMount(chatRoot) {
    const header = findChatHeaderRow(chatRoot);
    if (header?.parentElement) {
      return {
        parent: header.parentElement,
        before: header
      };
    }

    const gifterStrip = findTopGifterStrip(chatRoot);
    if (gifterStrip?.parentElement) {
      return {
        parent: gifterStrip.parentElement,
        before: gifterStrip
      };
    }

    return {
      parent: chatRoot,
      before: chatRoot.firstElementChild
    };
  }

  function findTopGifterStrip(chatRoot) {
    if (!chatRoot || !document.documentElement.contains(chatRoot)) return null;
    const chatRect = chatRoot.getBoundingClientRect();
    let current = chatRoot.parentElement;

    for (let depth = 0; current && current !== document.documentElement && depth < 8; depth += 1) {
      const children = [...current.children]
        .filter((element) => element !== compactDashboardElement)
        .filter((element) => isVisibleElement(element))
        .filter((element) => isLikelyTopGifterStrip(element, chatRect));
      if (children.length) {
        return children.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      }
      current = current.parentElement;
    }

    return null;
  }

  function isLikelyTopGifterStrip(element, chatRect) {
    const rect = element.getBoundingClientRect();
    if (rect.height < 18 || rect.height > 96) return false;
    if (rect.width < Math.min(220, chatRect.width * 0.55)) return false;
    if (rect.bottom > chatRect.top + 90) return false;
    if (rect.top < chatRect.top - 160) return false;

    const text = cleanText(element.innerText || element.textContent);
    if (!text || /盛り上がり中|Active|検知|Detected/i.test(text)) return false;
    if (/トップギフター|top\s*gifter|gifter|gifted/i.test(text)) return true;

    const tokens = text.split(/\s+/).filter(Boolean);
    const usernameLike = tokens.filter((token) => looksLikeUsernameToken(token.replace(/[^\w.-]/g, ""), { allowNumericOnly: false })).length;
    const numericCount = tokens.filter((token) => /^\d{1,4}$/.test(token)).length;
    return usernameLike >= 2 && numericCount >= 1;
  }

  function findChatHeaderRow(chatRoot) {
    const title = findChatHeaderTitle(chatRoot);
    if (!title) return null;

    let current = title;
    for (let depth = 0; current && current !== document.documentElement && depth < 8; depth += 1) {
      const rect = current.getBoundingClientRect();
      if (rect.width >= 180 && rect.height >= 24 && rect.height <= 92) {
        return current;
      }
      current = current.parentElement;
    }

    return title;
  }

  function findChatHeaderTitle(chatRoot) {
    const chatRect = chatRoot.getBoundingClientRect();
    const labels = [...document.querySelectorAll("h1,h2,h3,h4,div,span,[role='heading']")]
      .filter((element) => {
        if (!isVisibleElement(element)) return false;
        const text = cleanText(element.innerText || element.textContent);
        if (!/^(チャット|chat)$/i.test(text)) return false;

        const rect = element.getBoundingClientRect();
        const horizontalOverlap = Math.min(rect.right, chatRect.right) - Math.max(rect.left, chatRect.left);
        if (horizontalOverlap < Math.min(rect.width, chatRect.width) * 0.35) return false;
        if (rect.bottom > chatRect.top + 180) return false;
        if (rect.top < chatRect.top - Math.max(260, window.innerHeight * 0.35)) return false;
        return true;
      })
      .sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return Math.abs(aRect.bottom - chatRect.top) - Math.abs(bRect.bottom - chatRect.top);
      });

    return labels[0] || null;
  }

  function getCompactDashboardElement() {
    if (compactDashboardElement && document.documentElement.contains(compactDashboardElement)) {
      return compactDashboardElement;
    }

    compactDashboardElement = document.createElement("div");
    compactDashboardElement.className = "kch-chat-dashboard";
    compactDashboardElement.setAttribute("role", "status");
    compactDashboardElement.setAttribute("aria-live", "polite");
    return compactDashboardElement;
  }

  function removeCompactDashboard() {
    if (compactDashboardElement?.parentElement) {
      compactDashboardElement.remove();
    }
  }

  function renderCompactDashboard(dashboard, snapshot) {
    const status = snapshot.status || getChatStatusSnapshot();
    const level = status.level || "checking";
    const issues = [...new Set(snapshot.issues || [])];
    const notice = cleanText(snapshot.notice || "");
    const activeUserCount = Math.max(0, Number(status.userCount) || 0);
    const activeMessageCount = Math.max(0, Number(status.messageCount) || 0);

    dashboard.dataset.level = level;
    dashboard.replaceChildren();

    const main = document.createElement("div");
    main.className = "kch-chat-dashboard__main";

    const activeIcon = document.createElement("span");
    activeIcon.className = "kch-chat-dashboard__active-icon";
    activeIcon.setAttribute("aria-hidden", "true");

    const activeCount = document.createElement("span");
    activeCount.className = "kch-chat-dashboard__count";
    activeCount.textContent = String(activeUserCount);

    const activeLabel = document.createElement("span");
    activeLabel.className = "kch-chat-dashboard__active-label";
    activeLabel.textContent = "(Active)";

    const mood = document.createElement("span");
    mood.className = "kch-chat-dashboard__mood";
    mood.textContent = getChatStatusLabel(level);

    const body = document.createElement("span");
    body.className = "kch-chat-dashboard__body";
    body.title = UI_LANG === "ja"
      ? `${t("dashboardRecent", { minutes: status.windowMinutes || 10 })} アクティブ人数 ${activeUserCount} / コメント ${activeMessageCount}件`
      : `${t("dashboardRecent", { minutes: status.windowMinutes || 10 })} active users ${activeUserCount} / messages ${activeMessageCount}`;

    body.append(activeIcon, activeCount, activeLabel);

    const detected = document.createElement("span");
    detected.className = "kch-chat-dashboard__detected";
    detected.textContent = t("dashboardDetectedUsers", { count: status.detectionCount || 0 });
    body.appendChild(detected);

    if (issues.length || notice) {
      const issueText = document.createElement("div");
      issueText.className = "kch-chat-dashboard__error";
      if (issues.length && notice) {
        issueText.textContent = `error: ${issues.join(" / ")} / ${notice}`;
      } else if (issues.length) {
        issueText.textContent = `error: ${issues.join(" / ")}`;
      } else {
        issueText.textContent = notice;
      }
      main.append(mood, body);
      dashboard.append(main, issueText);
      return;
    }

    main.append(mood, body);
    dashboard.appendChild(main);
  }

  function hydrateUserHistoryFromAvailableCache(username) {
    const key = normalizeUsername(username);
    if (!key) return false;

    const existing = userHistory.get(key);
    if (existing?.messages?.length) return false;

    const canonicalMessages = getCanonicalHistoryMessagesForUser(key);
    if (canonicalMessages.length) {
      userHistory.set(key, {
        displayName: getDisplayNameForUser(key) || existing?.displayName || username,
        messages: canonicalMessages
      });
      scheduleSave();
      return true;
    }

    const detected = suspiciousUsers.get(key);
    const fallbackDetected = resolveDetectedMessageRecord(detected);
    const fallbackText = cleanText(fallbackDetected?.text || "");
    if (!fallbackText) return false;

    userHistory.set(key, {
      displayName: existing?.displayName || username,
      messages: [{
        id: "",
        text: fallbackText,
        timestamp: Number(fallbackDetected?.postedAt) || Number(detected?.lastDetectedAt) || Date.now(),
        source: "detected",
        timestampKind: "observed"
      }]
    });
    scheduleSave();
    return true;
  }

  function clearStreamMessageCache() {
    streamMessageCacheByUser.clear();
    streamMessageCacheQueue.length = 0;
  }

  function serializeCanonicalStore() {
    const messages = {};
    for (const [messageKey, record] of canonicalMessageStore.entries()) {
      if (!record?.text) continue;
      messages[messageKey] = {
        channelKey: cleanText(record.channelKey || ""),
        streamKey: cleanText(record.streamKey || ""),
        userKey: cleanText(record.userKey || ""),
        displayName: cleanText(record.displayName || record.userKey || ""),
        avatarUrl: isHttpUrl(record.avatarUrl) ? String(record.avatarUrl) : "",
        messageId: normalizeMessageId(record.messageId || ""),
        messageKey: cleanText(record.messageKey || messageKey),
        idKind: record.idKind === "real" ? "real" : "synthetic",
        text: cleanText(record.text || ""),
        postedAt: sanitizeTimestamp(record.postedAt, 0),
        receivedAt: sanitizeTimestamp(record.receivedAt, sanitizeTimestamp(record.postedAt, 0)),
        source: normalizeSourceKey(record.source || ""),
        timestampKind: normalizeTimestampKind(record.timestampKind),
        timestampConfidence: record.timestampConfidence === "fallback" ? "fallback" : "explicit",
        latencyMs: Number(record.latencyMs) || 0,
        isDelayed: Boolean(record.isDelayed)
      };
    }

    return {
      messages,
      totalMessages: canonicalMessageStore.size
    };
  }

  function restoreCanonicalStore(payload) {
    clearCanonicalStore();
    const messages = payload?.__canonicalStore?.messages;
    if (!messages || typeof messages !== "object") return false;

    const records = Object.values(messages)
      .filter((record) => record && typeof record === "object")
      .map((record) => {
        const postedAt = sanitizeTimestamp(record.postedAt, 0);
        if (!postedAt || !cleanText(record.text || "") || !cleanText(record.userKey || "")) return null;
        if (streamContext?.startedAt && postedAt < streamContext.startedAt) return null;
        return {
          channelKey: cleanText(record.channelKey || ""),
          streamKey: cleanText(record.streamKey || ""),
          userKey: cleanText(record.userKey || ""),
          displayName: cleanText(record.displayName || record.userKey || ""),
          avatarUrl: isHttpUrl(record.avatarUrl) ? String(record.avatarUrl) : "",
          messageId: normalizeMessageId(record.messageId || ""),
          messageKey: cleanText(record.messageKey || ""),
          idKind: record.idKind === "real" ? "real" : "synthetic",
          text: cleanText(record.text || ""),
          postedAt,
          receivedAt: Math.max(postedAt, sanitizeTimestamp(record.receivedAt, postedAt)),
          source: normalizeSourceKey(record.source || ""),
          timestampKind: normalizeTimestampKind(record.timestampKind),
          timestampConfidence: record.timestampConfidence === "fallback" ? "fallback" : "explicit",
          latencyMs: Number(record.latencyMs) || 0,
          isDelayed: Boolean(record.isDelayed)
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.postedAt || 0) - Number(b.postedAt || 0));

    for (const record of records) {
      if (!record.messageKey) continue;
      canonicalMessageStore.set(record.messageKey, record);
      upsertCanonicalUserIndex(record.userKey, record.displayName, record.avatarUrl, record.messageKey);
      canonicalMessageQueue.push({
        userKey: record.userKey,
        messageKey: record.messageKey
      });
    }

    pruneCanonicalStore();
    return canonicalMessageStore.size > 0;
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
    if (isLowInformationRiskText(rawText, normalized) || isMostlyEmoteText(rawText)) return;

    const repetition = analyzeInternalRepetition(rawText);
    if (!repetition.strong) return;

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
    const reason = REASON_COORDINATED;
    const action = getAlertAction();
    const evidenceText = bucket.events.find((event) => cleanText(event.text))?.text || rawText;
    for (const [userKey, userName] of uniqueUsers.entries()) {
      if (isIgnoredUser(userKey)) continue;
      const messages = getDetectionMessagesForUser(userKey);
      rememberDetectedUser(userKey, getDisplayNameForUser(userKey) || userName, [reason], messages, {
        riskScore: 72,
        riskRuleCount: 2,
        riskCritical: false,
        evidenceTexts: evidenceText ? [`同一文: ${evidenceText}`] : []
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
    const value = String(source || "");
    return value === "api" || value.startsWith("realtime") || value.startsWith("dom");
  }

  function findDuplicateMessage(messages, text, timestamp, messageId, messageSource, nextConfidence = "explicit") {
    if (messageId) {
      const matchingId = messages.find((message) => message.id === messageId);
      if (matchingId) return matchingId;
    }

    const sameText = messages.filter((message) => message.text === text);
    if (!sameText.length) return null;

    const sourcePriority = getMessageSourcePriority(messageSource);
    const nextFamily = getMessageSourceFamily(messageSource);
    for (const message of sameText) {
      // Keep separate posts only when both IDs are strong (real) and different.
      if (hasStrongMessageId(messageId) && hasStrongMessageId(message?.id) && message.id !== messageId) {
        // Distinct message IDs with same text should be kept as separate posts.
        continue;
      }
      const tolerance = getDuplicateToleranceMs(message, messageSource, nextFamily, messageId, nextConfidence);
      if (Math.abs(message.timestamp - timestamp) > tolerance) continue;

      const existingPriority = getMessageSourcePriority(message.source);
      if (existingPriority >= sourcePriority) return message;
      if (getMessageTimestampKind(message) === "observed") return message;
    }

    return findNearestMessage(sameText.filter((message) => {
      if (hasStrongMessageId(messageId) && hasStrongMessageId(message?.id) && message.id !== messageId) return false;
      return Math.abs(message.timestamp - timestamp) < getDuplicateToleranceMs(message, messageSource, nextFamily, messageId, nextConfidence);
    }), timestamp);
  }

  function getDuplicateToleranceMs(existingMessage, newSource, nextFamily = "", nextId = "", nextConfidence = "explicit") {
    const existingFamily = getMessageSourceFamily(existingMessage?.source);
    const targetFamily = nextFamily || getMessageSourceFamily(newSource);
    const hasWeakId = !hasStrongMessageId(existingMessage?.id) || !hasStrongMessageId(nextId);

    if (nextConfidence === "fallback" && !hasStrongMessageId(nextId)) {
      const existingHasReliableSignal = hasStrongMessageId(existingMessage?.id) ||
        existingMessage?.source === "api" ||
        existingMessage?.source === "realtime-ws" ||
        existingMessage?.timestampConfidence === "explicit";
      if (existingHasReliableSignal) {
        return 10 * 60 * 1000;
      }
    }

    if (
      hasWeakId &&
      existingFamily &&
      targetFamily &&
      existingFamily !== targetFamily &&
      existingMessage?.text
    ) {
      return isRealtimeDomFamilyPair(existingFamily, targetFamily) ? 120000 : 30000;
    }

    if (newSource === "api" || newSource === "realtime-ws" || existingMessage?.source === "api" || existingMessage?.source === "realtime-ws") {
      return 15000;
    }

    return 2500;
  }

  function getMessageSourceFamily(source) {
    const value = String(source || "");
    if (value === "api") return "api";
    if (value.startsWith("realtime")) return "realtime";
    if (value.startsWith("dom")) return "dom";
    if (value.startsWith("observed")) return "observed";
    return "";
  }

  function isRealtimeDomFamilyPair(leftFamily, rightFamily) {
    const left = String(leftFamily || "");
    const right = String(rightFamily || "");
    return (left === "realtime" && right === "dom") ||
      (left === "dom" && right === "realtime");
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
    if (canonicalUserIndex.size) return;
    while (userHistory.size > MAX_USERS) {
      const oldestKey = userHistory.keys().next().value;
      userHistory.delete(oldestKey);
    }
  }

  function pruneUserHistoryMessages() {
    if (canonicalMessageStore.size) {
      rebuildCompatibilityUserHistoryFromCanonicalStore();
      return;
    }
    const entries = [];
    for (const [key, history] of userHistory.entries()) {
      for (const message of history?.messages || []) {
        entries.push({
          key,
          timestamp: Number(message?.timestamp || message?.postedAt || 0)
        });
      }
    }

    const overflow = entries.length - MAX_STREAM_CACHE_MESSAGES;
    if (overflow <= 0) return;

    const removeCounts = new Map();
    entries
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, overflow)
      .forEach(({ key }) => {
        removeCounts.set(key, (removeCounts.get(key) || 0) + 1);
      });

    for (const [key, count] of removeCounts.entries()) {
      const history = userHistory.get(key);
      if (!history?.messages?.length) continue;
      history.messages = history.messages
        .slice()
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
        .slice(0, Math.max(0, history.messages.length - count));
      if (!history.messages.length) userHistory.delete(key);
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
    const receivedAt = Date.now();
    const timestamp = postedTimestamp || receivedAt;
    const domMessageId = getDomMessageId(row, user.username, messageText, timestamp);
    const trustRealtimeTimestamp = !postedTimestamp && options.trustRealtimeTimestamp === true;
    const timestampKind = "posted";
    const sourceSuffix = user.allowNumericOnly ? "-profile" : "";
    const source = postedTimestamp
      ? `dom${sourceSuffix}`
      : trustRealtimeTimestamp
        ? `realtime${sourceSuffix}`
        : `dom${sourceSuffix}`;
    rememberMessage(
      user.username,
      messageText,
      timestamp,
      domMessageId,
      source,
      timestampKind,
      {
        postedAt: timestamp,
        receivedAt,
        confidence: postedTimestamp || trustRealtimeTimestamp ? "explicit" : "fallback"
      }
    );

    return {
      ...user,
      messageText,
      timestamp,
      timestampKind,
      source
    };
  }

  function getDomMessageId(row, username = "", text = "", timestamp = 0) {
    if (!row || row.nodeType !== Node.ELEMENT_NODE) return "";

    const selectors = [
      "[data-message-id]",
      "[data-chat-message-id]",
      "[data-chat-entry-id]",
      "[data-entry-id]",
      "[data-message-uuid]",
      "[data-uuid]",
      "[data-msg-id]",
      "[id]"
    ];

    for (const selector of selectors) {
      const element = row.matches?.(selector) ? row : row.querySelector?.(selector);
      const id = getMessageIdFromElement(element);
      if (id) return id;
    }

    const hrefId = getMessageIdFromAnchors(row);
    if (hrefId) return hrefId;

    if (timestamp > 0 && username && text) {
      return buildSyntheticMessageId("dom", username, text, timestamp);
    }

    return "";
  }

  function getMessageIdFromAnchors(root) {
    if (!root?.querySelectorAll) return "";
    for (const anchor of root.querySelectorAll("a[href]")) {
      const href = cleanText(anchor.getAttribute("href"));
      if (!href) continue;
      const fromPath = href.match(/(?:chat|message|messages|comment|comments)[\/:=]([A-Za-z0-9_-]{6,})/i);
      if (fromPath?.[1]) return fromPath[1];
      const param = href.match(/[?&](?:message_id|messageId|msg_id|msgId|id)=([A-Za-z0-9_-]{6,})/i);
      if (param?.[1]) return param[1];
    }
    return "";
  }

  function getMessageIdFromElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return "";

    const candidates = [
      element.getAttribute("data-message-id"),
      element.getAttribute("data-chat-message-id"),
      element.getAttribute("data-chat-entry-id"),
      element.getAttribute("data-entry-id"),
      element.getAttribute("data-message-uuid"),
      element.getAttribute("data-uuid"),
      element.getAttribute("data-msg-id"),
      element.getAttribute("id")
    ];

    for (const candidate of candidates) {
      const normalized = normalizeMessageId(candidate);
      if (normalized) return normalized;
    }

    return "";
  }

  function normalizeMessageId(value) {
    const raw = cleanText(value);
    if (!raw) return "";
    if (raw.length > 180) return "";

    const direct = raw.match(/[A-Za-z0-9_-]{6,}/g);
    if (!direct || !direct.length) return "";

    for (const token of direct) {
      if (isLikelyMessageIdToken(token)) return token;
    }

    return "";
  }

  function isSyntheticMessageId(value) {
    const id = cleanText(value);
    return /^klt-/i.test(id);
  }

  function hasStrongMessageId(value) {
    const id = cleanText(value);
    return Boolean(id) && !isSyntheticMessageId(id);
  }

  function pickBetterMessageId(currentId, nextId) {
    const current = cleanText(currentId);
    const next = cleanText(nextId);
    if (!next) return current;
    if (!current) return next;
    const currentStrong = hasStrongMessageId(current);
    const nextStrong = hasStrongMessageId(next);
    if (!currentStrong && nextStrong) return next;
    return current;
  }

  function isLikelyMessageIdToken(token) {
    if (!token) return false;
    if (token.length < 6 || token.length > 128) return false;
    if (/^chat(room)?$/i.test(token)) return false;
    if (/^message$/i.test(token)) return false;
    if (/^messages$/i.test(token)) return false;
    if (/^comment(s)?$/i.test(token)) return false;
    return /[0-9]/.test(token) || /[A-Fa-f]/.test(token);
  }

  function buildSyntheticMessageId(source, username, text, timestamp) {
    const normalized = `${cleanText(source)}|${normalizeUsername(username)}|${Number(timestamp) || 0}|${cleanText(text)}`;
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const digest = (hash >>> 0).toString(36);
    return `klt-${cleanText(source) || "msg"}-${digest}`;
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
    refreshRealtimeWsStatus();
    if (shouldRunPeriodicDomScan()) scanPage();
    refreshListedDetectionsFromVisibleChat();
    updateCompactDashboard();
    closeStaleHoverPopover();
    if (suspiciousUsers.size > 0) scheduleSuspiciousUsersReport(SUSPICIOUS_REPORT_RETRY_MS);
  }

  function shouldRunPeriodicDomScan() {
    const now = Date.now();
    if (shouldPreferRealtimeWsIngestion()) {
      noteSkipReason("dom_scan_skipped:ws_active", 2000);
      return false;
    }

    if (now - lastPeriodicDomScanAt < 2000) return false;
    lastPeriodicDomScanAt = now;
    return true;
  }

  function shouldPreferRealtimeWsIngestion() {
    return hasRecentRealtimeWsMessage();
  }

  function refreshRealtimeWsStatus() {
    const now = Date.now();
    if (now - lastWsStatusRequestAt < 10000) return;
    if (hasRecentRealtimeWsMessage() && now - Number(wsHookStatus.lastStatusAt || 0) < 30000) return;
    lastWsStatusRequestAt = now;
    requestRealtimeWsStatus();
  }

  function refreshListedDetectionsFromVisibleChat() {
    if (getAlertAction() === "off") return;
    if (!userSettings.watchlistEnabled && !userSettings.broadcasterListEnabled) return;

    let changed = false;
    const allowDomFallback = !shouldPreferRealtimeWsIngestion();
    for (const chatRoot of getChatRoots()) {
      const usernameElements = [...chatRoot.querySelectorAll(ANY_USERNAME_SELECTOR)]
        .filter((element) => isUsableUsernameElement(element));

      for (const usernameElement of usernameElements) {
        const username = getUsernameValue(usernameElement).replace(/^@/, "");
        const key = normalizeUsername(username);
        if (!key || isIgnoredUser(key)) continue;

        const reasons = [];
        if (isWatchlistedUser(key)) reasons.push("ウォッチリスト");
        if (isBroadcasterListedUser(key)) reasons.push("配信者リスト");
        if (!reasons.length) continue;

        const row = findLikelyRowFromUsername(usernameElement);
        if (row && allowDomFallback) {
          scanRow(row);
        }

        let history = userHistory.get(key);
        if ((!history?.messages || !history.messages.length) && row && allowDomFallback) {
          const fallbackText = extractMessageText(row, username, usernameElement);
          if (fallbackText) {
            const now = Date.now();
            rememberMessage(username, fallbackText, now, "", "dom-profile", "posted", {
              postedAt: now,
              receivedAt: now
            });
            history = userHistory.get(key);
          }
        }
        const detectionMessages = getDetectionMessagesForUser(key);
        if (!detectionMessages.length) continue;

        rememberDetectedUser(
          key,
          getDisplayNameForUser(key) || username,
          reasons,
          detectionMessages
        );
        changed = true;
      }
    }

    if (changed) sendSuspiciousUsersReport();
  }

  function hasRecentRealtimeWsMessage() {
    return lastRealtimeWsMessageAt > 0 && Date.now() - lastRealtimeWsMessageAt < WS_ACTIVE_GRACE_MS;
  }

  function updateIngestionStatusFromAcceptedMessage(messageSource) {
    const source = String(messageSource || "");
    if (source.startsWith("dom") && shouldActivateDomFallback()) {
      realtimeFallbackActive = true;
      showIngestionStatus(t("wsFallbackActive"), "fallback");
      return;
    }

    if (source.startsWith("realtime")) {
      realtimeFallbackActive = false;
    }
  }

  function shouldActivateDomFallback() {
    if (hasRecentRealtimeWsMessage()) return false;

    return hasExitedRealtimeStartupGrace();
  }

  function hasExitedRealtimeStartupGrace() {
    const sessionAgeMs = Math.max(0, Date.now() - Number(sessionEnteredAt || 0));
    return sessionAgeMs >= WS_ACTIVE_GRACE_MS;
  }

  function showIngestionStatus(message, state = "info", options = {}) {
    if (!message || !ingestionStatus) return;

    const now = Date.now();
    if (!options.force && state === "fallback" && now - ingestionStatusLastShownAt < INGESTION_STATUS_THROTTLE_MS) {
      return;
    }

    ingestionStatusLastShownAt = now;
    clearTimeout(ingestionStatusTimer);
    ingestionStatus.textContent = message;
    ingestionStatus.dataset.state = state;
    ingestionStatus.hidden = false;
    ingestionStatusTimer = window.setTimeout(() => {
      ingestionStatus.hidden = true;
    }, Math.max(1500, Number(options.durationMs) || INGESTION_STATUS_VISIBLE_MS));
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

  function createIngestionStatus() {
    const element = document.createElement("div");
    element.className = "kch-ingestion-status";
    element.hidden = true;
    document.documentElement.appendChild(element);
    return element;
  }

  const popover = createPopover();
  const ingestionStatus = createIngestionStatus();

  window.__KICK_CHAT_HISTORY_HOVER__ = {
    version: "2.58.9",
    getChatRootCount: () => getChatRoots().length,
    getKnownUsers: () => {
      if (canonicalUserIndex.size) {
        return [...canonicalUserIndex.entries()].map(([userKey, entry]) => ({
          username: entry.displayName || userKey,
          messages: entry.messageKeys?.size || 0
        }));
      }
      return [...userHistory.values()].map((value) => ({
        username: value.displayName,
        messages: value.messages.length
      }));
    },
    getSuspiciousUsers: () => getSuspiciousUserList(),
    getCacheDiagnostics: (limitPerUser = 5) => ({
      streamCache: getStreamCacheDiagnostics(limitPerUser),
      userHistory: getUserHistoryDiagnostics(limitPerUser),
      canonicalStore: getCanonicalStoreDiagnostics(limitPerUser)
    }),
    getUserCache: (username, limit = DISPLAY_ALL_MESSAGES) => {
      const key = normalizeUsername(username);
      if (!key) return [];
      return getCanonicalMessagesForUser(key, limit);
    },
    getStatus: () => ({
      chatRoots: getChatRoots().length,
      knownUsers: canonicalUserIndex.size || userHistory.size,
      activeRow: Boolean(activeRow),
      activeChannelSlug,
      frame: window.top === window ? "top" : "child",
      streamContext,
      apiWindows: apiWindowCache.size,
      apiPages: apiWindowCache.size,
      pinnedApiUsers: [...pinnedCards.keys()],
      websocket: {
        active: hasRecentRealtimeWsMessage(),
        messagesSeen: realtimeWsMessagesSeen,
        messagesAccepted: realtimeWsMessagesAccepted,
        lastMessageAt: lastRealtimeWsMessageAt,
        domFallbackActive: realtimeFallbackActive,
        hook: { ...wsHookStatus }
      },
      followedChannelsSync: {
        enabled: userSettings.broadcasterListEnabled,
        running: followedChannelsSyncRunning,
        lastSyncedAt: lastFollowedChannelsSyncAt,
        broadcasterListSize: userSettings.broadcasterList.length,
        status: followedChannelsSyncStatus
      },
      chatPaused: isChatPaused(),
      streamCache: {
        users: streamMessageCacheByUser.size,
        queue: streamMessageCacheQueue.length
      },
      apiDebug,
      diagnostics: getDiagnosticsSnapshot()
    }),
    backfillUser: updatePinnedRealtimeHistoryState,
    retryBackfill: (username) => {
      userBackfillState.delete(normalizeUsername(username));
      return updatePinnedRealtimeHistoryState(username);
    },
    getBackfillState: (username) => userBackfillState.get(normalizeUsername(username)) || null,
    diagnoseHistoryApi,
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

  function renderPopoverContent(targetPopover, username, pinned, options = {}) {
    const key = normalizeUsername(username);
    const messages = getDisplayMessagesForUser(key);
    const displayName = getDisplayNameForUser(key) || username;
    const previousList = targetPopover.querySelector(".kch-popover__list");
    const wasNearBottom = !previousList ||
      previousList.scrollHeight - previousList.scrollTop - previousList.clientHeight < 24;

    targetPopover.innerHTML = `
      <div class="kch-popover__header">
        <div class="kch-popover__identity">
          <div class="kch-popover__name">
            <button class="kch-popover__name-text" type="button"></button>
            <button class="kch-popover__pin" type="button"></button>
            <button class="kch-popover__watch" type="button"></button>
          </div>
        </div>
        <div class="kch-popover__actions">
          <button class="kch-popover__mod kch-popover__mod--timeout" type="button"></button>
          <button class="kch-popover__mod kch-popover__mod--ban" type="button"></button>
        </div>
      </div>
      <div class="kch-popover__list"></div>
      <div class="kch-popover__resize-handle" aria-hidden="true"></div>
    `;

    const risk = shouldShowRiskMarker(key) ? assessAccountRisk(messages) : { suspicious: false, reasons: [] };
    const detected = suspiciousUsers.get(key);
    const storedReasons = normalizeDetectionReasons(detected?.reasons || []);
    const detectedReasons = normalizeDetectionReasons([
      ...(risk.suspicious ? risk.reasons : []),
      ...storedReasons.filter(isStoredDetectionReasonAllowedWithoutCurrentRisk)
    ]);
    const nameElement = targetPopover.querySelector(".kch-popover__name");
    const nameButton = targetPopover.querySelector(".kch-popover__name-text");
    nameButton.textContent = displayName;
    nameButton.title = t("profileTitle", { username: displayName });
    nameButton.setAttribute("aria-label", t("profileTitle", { username: displayName }));
    const primaryCategory = getDetectionCategory(detectedReasons);
    if (detectedReasons.length && primaryCategory !== "default") {
      const primaryIcon = createPrimaryDetectionIcon(primaryCategory, detected, detectedReasons, risk);
      if (primaryIcon) {
        nameElement.insertBefore(primaryIcon, nameButton);
      }
    }
    const pinButton = targetPopover.querySelector(".kch-popover__pin");
    const pinActive = pinned || pinnedCards.has(key);
    pinButton.innerHTML = getPinIcon(pinActive);
    pinButton.title = pinActive ? t("unpin") : t("pin");
    pinButton.setAttribute("aria-label", pinActive ? t("unpin") : t("pin"));
    pinButton.disabled = false;
    const watchButton = targetPopover.querySelector(".kch-popover__watch");
    const watchlisted = hasUserInWatchlist(key);
    watchButton.innerHTML = getWatchIcon(watchlisted);
    watchButton.title = watchlisted ? t("removeWatchlist") : t("addWatchlist");
    watchButton.setAttribute("aria-label", watchlisted ? t("removeWatchlist") : t("addWatchlist"));
    watchButton.classList.toggle("kch-popover__watch--active", watchlisted);
    targetPopover.classList.toggle("kch-popover--pinned", pinned);
    targetPopover.dataset.usernameKey = key;
    const canModerate = hasModerationAccess();
    const timeoutButton = targetPopover.querySelector(".kch-popover__mod--timeout");
    const banButton = targetPopover.querySelector(".kch-popover__mod--ban");
    timeoutButton.innerHTML = getActionIcon("timeout");
    banButton.innerHTML = getActionIcon("ban");
    timeoutButton.title = t("timeoutTitle");
    banButton.title = t("banTitle");
    timeoutButton.hidden = !canModerate;
    banButton.hidden = !canModerate;

    const list = targetPopover.querySelector(".kch-popover__list");
    installTransientScrollbarBehavior(list);
    const state = userBackfillState.get(key);
    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "kch-popover__empty";
      const message = state?.failed
        ? t("apiFailed", { reason: state.reason ? ` (${state.reason})` : "" })
        : state?.reason && !state?.loading
          ? state.reason
        : t("loadingHistory");
      empty.innerHTML = `
        <span class="kch-popover__spinner" aria-hidden="true"></span>
        <span></span>
      `;
      empty.querySelector("span:last-child").textContent = message;
      list.appendChild(empty);
    } else {
      const evidenceFragments = getEvidenceFragmentsForDetection(detectedReasons, detected, risk);
      for (const message of [...messages].reverse()) {
        const item = document.createElement("div");
        item.className = "kch-popover__item";

        const meta = document.createElement("div");
        meta.className = "kch-popover__meta";
        renderMessageTime(meta, message);

        const text = document.createElement("div");
        text.className = "kch-popover__text";
        const matchedEvidence = findMatchedEvidenceFragment(message.text, evidenceFragments);
        if (matchedEvidence) {
          item.classList.add("kch-popover__item--evidence");
          text.classList.add("kch-popover__text--evidence");
        }
        text.innerHTML = renderMessageWithEmotes(message.text);

        item.append(meta, text);
        list.appendChild(item);
      }

      if (state?.loading) {
        const loading = document.createElement("div");
        loading.className = "kch-popover__loading-more";
        loading.innerHTML = `
          <span class="kch-popover__spinner" aria-hidden="true"></span>
          <span>${escapeHtml(t("fetchingHistory"))}</span>
        `;
        list.appendChild(loading);
      }
    }

    const shouldRestoreScrollTop = options.restoreScrollTop !== undefined && options.restoreScrollTop !== null;
    const restoreScrollTop = Number(options.restoreScrollTop);
    if (shouldRestoreScrollTop && Number.isFinite(restoreScrollTop)) {
      restoreListScrollTop(list, restoreScrollTop);
    } else if (!pinned || wasNearBottom) {
      list.scrollTop = list.scrollHeight;
      window.requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight;
      });
    }

  }

  function restoreListScrollTop(list, scrollTop) {
    const applyScroll = () => {
      const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
      list.scrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);
    };

    applyScroll();
    window.requestAnimationFrame(applyScroll);
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

  function getPopoverSafeArea() {
    const viewportMargin = 10;
    const chatRoot = getChatRoots()[0];
    const chatRect = chatRoot?.getBoundingClientRect?.();
    if (!chatRect || chatRect.width <= 0 || chatRect.height <= 0) {
      return {
        left: viewportMargin,
        top: viewportMargin,
        right: window.innerWidth - viewportMargin,
        bottom: window.innerHeight - viewportMargin
      };
    }

    const dashboard = compactDashboardElement && document.documentElement.contains(compactDashboardElement)
      ? compactDashboardElement
      : null;
    const dashboardRect = dashboard?.getBoundingClientRect?.();
    const dashboardBottom = dashboardRect && dashboardRect.height > 0
      ? dashboardRect.bottom
      : chatRect.top;
    const top = Math.max(viewportMargin, chatRect.top, dashboardBottom + 6);
    const left = Math.max(viewportMargin, chatRect.left + 2);
    const right = Math.min(window.innerWidth - viewportMargin, chatRect.right - 2);
    const bottom = Math.max(top, Math.min(window.innerHeight - viewportMargin, chatRect.bottom - 2));

    return { left, top, right, bottom };
  }

  function setPopoverPosition(left, top) {
    const rect = popover.getBoundingClientRect();
    const safe = getPopoverSafeArea();
    const maxLeft = Math.max(safe.left, safe.right - rect.width);
    const maxTop = Math.max(safe.top, safe.bottom - rect.height);
    const clampedLeft = Math.min(Math.max(safe.left, left), maxLeft);
    const clampedTop = Math.min(Math.max(safe.top, top), maxTop);

    popover.style.left = `${clampedLeft}px`;
    popover.style.top = `${clampedTop}px`;

  }

  function hidePopover(force = false) {
    if (isTemporaryPopoverActive && !force && Date.now() < temporaryPopoverExpiresAt) {
      return;
    }
    clearTimeout(hideTimer);
    isTemporaryPopoverActive = false;
    temporaryPopoverExpiresAt = 0;
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
    const key = normalizeUsername(activeUsername);
    if (!key) return;
    if (pinnedCards.has(key)) {
      closePinnedCard(key);
      return;
    }
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
      if (existing.height) {
        existing.element.style.height = `${existing.height}px`;
      }
      bringPinnedCardToFront(key);
      return true;
    }

    const maxPinned = getMaxPinnedPopovers();
    if (pinnedCards.size >= maxPinned) {
      if (!auto) showPopoverNotice(t("maxPinned", { count: maxPinned }));
      return false;
    }

    clearTimeout(hideTimer);
    const card = createPopover();
    card.hidden = false;
    card.style.visibility = "hidden";
    card.classList.add("kch-popover--pinned");

    const index = pinnedCards.size;
    const initialHeight = getInitialPinnedHeight(auto);
    const initialScrollTop = getInitialPinnedScrollTop(auto);
    pinnedCards.set(key, {
      element: card,
      username,
      position: { left: 10, top: 10 },
      autoPinned: auto,
      height: initialHeight
    });
    hydrateUserHistoryFromAvailableCache(username);
    attachPinnedCardEvents(card);
    card.style.height = `${initialHeight}px`;
    renderPinnedCard(key, {
      restoreScrollTop: initialScrollTop
    });
    const position = getInitialPinnedPosition(card, index, auto);
    pinnedCards.get(key).position = position;
    bringPinnedCardToFront(key);
    setElementPosition(card, position.left, position.top, key);
    card.style.visibility = "";
    if (auto) {
      card.classList.add("kch-popover--auto-pinned");
      window.setTimeout(() => {
        card.classList.remove("kch-popover--auto-pinned");
      }, 520);
    }
    if (!auto) {
      window.setTimeout(() => updatePinnedRealtimeHistoryState(username), 0);
    }
    if (!auto) closeHoverPopover();
    return true;
  }

  function getInitialPinnedPosition(card, index, auto) {
    const cardRect = card.getBoundingClientRect();
    const cardWidth = cardRect.width || 254;
    const cardHeight = cardRect.height || 220;
    const offset = index * 34;
    const safe = getPopoverSafeArea();

    const sourceRect = !popover.hidden ? popover.getBoundingClientRect() : null;
    if (!auto && sourceRect && sourceRect.width > 0 && sourceRect.height > 0) {
      return {
        left: Math.min(sourceRect.left + offset, Math.max(safe.left, safe.right - cardWidth)),
        top: Math.min(sourceRect.top + offset, Math.max(safe.top, safe.bottom - cardHeight))
      };
    }

    return {
      left: Math.min(safe.left + 6 + (auto ? offset : 0), Math.max(safe.left, safe.right - cardWidth)),
      top: Math.min(safe.top + (auto ? 40 : 8) + offset, Math.max(safe.top, safe.bottom - cardHeight))
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

    const messages = getDetectionMessagesForUser(key);
    const risk = assessAccountRisk(messages);
    if (!risk.suspicious) return;

    rememberDetectedUser(key, getDisplayNameForUser(key) || username, risk.reasons, messages, {
      riskScore: risk.score,
      riskRuleCount: risk.matchedRules,
      riskCritical: risk.critical,
      evidenceTexts: risk.evidenceTexts
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

    const messages = getDetectionMessagesForUser(key);
    rememberDetectedUser(key, getDisplayNameForUser(key) || username, reasons, messages);
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
    const nextReasons = normalizeDetectionReasons(reasons);
    const existingReasons = normalizeDetectionReasons(existing?.reasons || []);
    const refreshAutomaticReasons =
      Object.prototype.hasOwnProperty.call(metadata, "riskScore") ||
      Object.prototype.hasOwnProperty.call(metadata, "riskRuleCount") ||
      Object.prototype.hasOwnProperty.call(metadata, "riskCritical");
    const preservedExistingReasons = refreshAutomaticReasons
      ? existingReasons.filter(isPersistentDetectionReason)
      : existingReasons;
    const mergedReasons = [
      ...new Set([
        ...preservedExistingReasons,
        ...nextReasons
      ])
    ];
    const detectionCategory = getDetectionCategory(mergedReasons);
    const riskScore = refreshAutomaticReasons
      ? Math.max(0, Math.min(100, Number(metadata.riskScore) || 0))
      : Math.max(Number(existing?.riskScore) || 0, Number(metadata.riskScore) || 0);
    const riskRuleCount = refreshAutomaticReasons
      ? Math.max(0, Number(metadata.riskRuleCount) || 0)
      : Math.max(Number(existing?.riskRuleCount) || 0, Number(metadata.riskRuleCount) || 0);
    const riskCritical = refreshAutomaticReasons
      ? Boolean(metadata.riskCritical)
      : Boolean(existing?.riskCritical || metadata.riskCritical);
    const evidenceTexts = refreshAutomaticReasons
      ? normalizeEvidenceTexts(metadata.evidenceTexts)
      : normalizeEvidenceTexts([
        ...(Array.isArray(existing?.evidenceTexts) ? existing.evidenceTexts : []),
        ...(Array.isArray(metadata.evidenceTexts) ? metadata.evidenceTexts : [])
      ]);
    const detectedMessage = selectDetectedMessage(
      key,
      postedMessages,
      evidenceTexts,
      Number(metadata.detectedMessageAt) || Number(latestMessage?.timestamp) || 0
    );
    const detectedMessageId = normalizeMessageId(detectedMessage.messageId || "");
    const detectedMessageKey = cleanText(detectedMessage.messageKey || "");
    const detectedMessageAt = detectedMessage.timestamp;
    const detectedMessageText = cleanText(detectedMessage.text || "").slice(0, 180);
    const detectionChanged = !existing ||
      String(existing?.detectionCategory || "") !== detectionCategory ||
      (existing?.reasons || []).join("\u0000") !== mergedReasons.join("\u0000") ||
      Number(existing?.riskScore || 0) !== riskScore ||
      Number(existing?.riskRuleCount || 0) !== riskRuleCount ||
      Boolean(existing?.riskCritical) !== riskCritical ||
      (Array.isArray(existing?.evidenceTexts) ? existing.evidenceTexts : []).join("\u0000") !== evidenceTexts.join("\u0000") ||
      String(existing?.detectedMessageId || "") !== detectedMessageId ||
      String(existing?.detectedMessageKey || "") !== detectedMessageKey ||
      Number(existing?.detectedMessageAt || 0) !== detectedMessageAt ||
      String(existing?.detectedMessageText || "") !== detectedMessageText;

    suspiciousUsers.set(key, {
      username,
      profileUrl: getKickProfileUrl(username),
      avatarUrl: existing?.avatarUrl || "",
      detectionCategory,
      reasons: mergedReasons,
      riskScore,
      riskRuleCount,
      riskCritical,
      evidenceTexts,
      firstDetectedAt: existing?.firstDetectedAt || now,
      lastDetectedAt: detectionChanged ? now : Number(existing?.lastDetectedAt) || now,
      detectedMessageId,
      detectedMessageKey,
      detectedMessageAt,
      detectedMessageText
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
    const changed = ensureDetectedUserEntry(key, username, reasons);
    if (changed) sendSuspiciousUsersReport();

    if (action === "notify") {
      if (notifiedUsers.has(key)) return;
      notifiedUsers.add(key);
      const reasonLabel = Array.isArray(reasons) && reasons.length
        ? reasons.map(localizeReason).join(" / ")
        : t("detected");
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
      if (getMaxPinnedPopovers() <= 0) return;
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

  function ensureDetectedUserEntry(key, username, reasons) {
    if (!key || !username) return false;
    const existing = suspiciousUsers.get(key);
    const normalizedReasons = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
    const hasExistingReasons = Array.isArray(existing?.reasons) && existing.reasons.length > 0;
    const missingReason = normalizedReasons.some((reason) => !existing?.reasons?.includes(reason));

    if (hasExistingReasons && !missingReason) return false;

    const fallbackReasons = normalizedReasons.length
      ? normalizedReasons
      : (existing?.reasons?.length ? existing.reasons : [t("detected")]);

    rememberDetectedUser(
      key,
      getDisplayNameForUser(key) || username,
      fallbackReasons,
      getDetectionMessagesForUser(key)
    );
    return true;
  }

  function showTemporaryAlertPopover(key, username, durationSec) {
    const anchorInfo = getTemporaryAlertAnchor(key);
    const anchor = anchorInfo?.anchor;
    const row = anchorInfo?.row;
    if (!anchor || !row) return;

    clearTimeout(hideTimer);
    isTemporaryPopoverActive = true;
    activeRow = row;
    activeUsername = username;
    activeAnchor = anchor;
    renderPopover(username, anchor);
    const ms = Math.max(1000, (durationSec || getTemporaryPopupDuration()) * 1000);
    temporaryPopoverExpiresAt = Date.now() + ms;
    hideTimer = window.setTimeout(() => {
      isTemporaryPopoverActive = false;
      temporaryPopoverExpiresAt = 0;
      hidePopover(true);
    }, ms);
  }

  function getTemporaryAlertAnchor(key) {
    const anchorInfo = lastUserAnchors.get(key);
    const anchor = anchorInfo?.anchor;
    const row = anchorInfo?.row;
    if (
      anchor &&
      row &&
      document.documentElement.contains(anchor) &&
      document.documentElement.contains(row)
    ) {
      return { anchor, row };
    }

    const chatRoot = getChatRoots()[0];
    if (chatRoot && document.documentElement.contains(chatRoot)) {
      return { anchor: chatRoot, row: chatRoot };
    }

    return null;
  }

  function getKickProfileUrl(username) {
    return `${API_ORIGIN}/${encodeURIComponent(String(username || "").replace(/^@/, ""))}`;
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (_error) {
      return false;
    }
  }

  function getDetectionIcon(reasons) {
    const category = getDetectionCategory(reasons);
    return getDetectionIconForCategory(category);
  }

  function createPrimaryDetectionIcon(category, detected, reasons, risk) {
    const detailParts = [];
    const useCurrentRisk = Boolean(risk?.suspicious);
    const score = Math.max(0, Math.min(100, Math.round(Number(useCurrentRisk ? risk?.score : detected?.riskScore) || 0)));
    const rules = Math.max(0, Math.round(Number(useCurrentRisk ? risk?.matchedRules : detected?.riskRuleCount) || 0));
    if (score > 0) detailParts.push(UI_LANG === "ja" ? `score ${score} (${rules}条件)` : `score ${score} (${rules} rules)`);
    if (Array.isArray(reasons) && reasons.length) {
      detailParts.push(reasons.map(localizeReason).join(" / "));
    }
    const evidenceTexts = useCurrentRisk && Array.isArray(risk?.evidenceTexts)
      ? risk.evidenceTexts
      : (Array.isArray(detected?.evidenceTexts) ? detected.evidenceTexts : []);
    if (evidenceTexts.length) {
      detailParts.push(evidenceTexts.join(" / "));
    }
    const title = `${getDetectionLabelForCategory(category)}${detailParts.length ? `\n${detailParts.join("\n")}` : ""}`;

    if (category === "broadcaster") {
      const channelIcon = document.createElement(isHttpUrl(detected?.avatarUrl) ? "img" : "span");
      channelIcon.className = "kch-popover__channel-icon";
      channelIcon.title = title;
      channelIcon.setAttribute("aria-hidden", "true");
      if (channelIcon instanceof HTMLImageElement) {
        channelIcon.src = detected.avatarUrl;
        channelIcon.alt = "";
        channelIcon.decoding = "async";
        channelIcon.loading = "lazy";
      } else {
        channelIcon.textContent = "📺";
      }
      return channelIcon;
    }

    const badge = document.createElement("span");
    badge.className = `kch-popover__risk kch-popover__risk--${category}`;
    badge.textContent = getDetectionIconForCategory(category);
    badge.title = title;
    badge.setAttribute("aria-hidden", "true");
    return badge;
  }

  function getDetectionIconForCategory(category) {
    if (category === "threat") return "🔪";
    if (category === "abuse") return "⚠";
    if (category === "privacy") return "👤";
    if (category === "watch") return "★";
    if (category === "broadcaster") return "📺";
    if (category === "bot") return "🤖";
    return "💀";
  }

  function getDetectionLabelForCategory(category) {
    if (category === "threat") return UI_LANG === "ja" ? "危害/脅迫" : "Threat";
    if (category === "abuse") return UI_LANG === "ja" ? "攻撃的暴言" : "Abusive language";
    if (category === "privacy") return UI_LANG === "ja" ? "個人情報" : "Personal info";
    if (category === "watch") return UI_LANG === "ja" ? "ウォッチ" : "Watch";
    if (category === "broadcaster") return UI_LANG === "ja" ? "配信者" : "Broadcaster";
    if (category === "bot") return UI_LANG === "ja" ? "BOT/連投" : "Bot/Spam";
    return t("detected");
  }

  function localizeReason(reason) {
    const value = String(reason || "");
    if (UI_LANG === "ja") return value;
    const labels = new Map([
      ["危害/脅迫性の高い投稿", "High-risk threat-like post"],
      ["攻撃的暴言", "Abusive language"],
      ["殺害/危害予告らしき投稿", "Threat-like post"],
      ["複数アカウント同一文連投", "Coordinated repeated text"],
      ["低情報コメント連投", "Low-info repeated comments"],
      ["短時間の高頻度連投", "High-frequency rapid posting"],
      ["ウォッチリスト", "Watchlist"],
      ["配信者リスト", "Broadcaster list"],
      ["同一コメントを3回以上", "Same comment 3+ times"],
      ["同一長文コメントを2回以上", "Same long comment 2+ times"],
      ["1秒以内に3コメント以上", "3+ comments in 1 second"],
      ["3秒以内に5コメント以上", "5+ comments in 3 seconds"],
      ["平均投稿間隔が2.5秒以下", "Average interval under 2.5 seconds"],
      ["URL風コメントが多い", "Many URL-like comments"],
      ["長文/語句の大量反復", "Long phrase repetition"],
      ["絵文字/スタンプ大量", "Heavy emoji/sticker usage"],
      ["単一コメント内の大量反復", "Mass repetition in one comment"],
      ["コメント内の反復が多い", "Repeated text in comments"],
      ["個人情報らしき投稿", "Possible personal info"]
    ]);
    return labels.get(value) || value;
  }

  function getDetectionCategory(reasons) {
    const values = normalizeDetectionReasons(reasons);
    if (values.some((reason) => /殺害|危害|暴力|脅迫/.test(reason))) return "threat";
    if (values.some((reason) => /暴言|攻撃/.test(reason))) return "abuse";
    if (values.some((reason) => /個人情報|住所|電話番号|メール/.test(reason))) return "privacy";
    if (values.some((reason) => /ウォッチリスト/.test(reason))) return "watch";
    if (values.some((reason) => /配信者リスト/.test(reason))) return "broadcaster";
    if (values.length) return "bot";
    return "default";
  }

  function getDetectionCategories(reasons) {
    const values = normalizeDetectionReasons(reasons);
    const categories = [];
    if (values.some((reason) => /殺害|危害|暴力|脅迫/.test(reason))) categories.push("threat");
    if (values.some((reason) => /暴言|攻撃/.test(reason))) categories.push("abuse");
    if (values.some((reason) => /個人情報|住所|電話番号|メール/.test(reason))) categories.push("privacy");
    if (values.some((reason) => /ウォッチリスト/.test(reason))) categories.push("watch");
    if (values.some((reason) => /配信者リスト/.test(reason))) categories.push("broadcaster");
    if (values.some((reason) => /連投|件以上|コメント|間隔|反復|絵文字|スタンプ|BOT|URL|大量反復|同一文/.test(String(reason || "")))) {
      categories.push("bot");
    }
    if (!categories.length && values.length) categories.push("default");
    return categories;
  }

  function normalizeDetectionReasons(reasons) {
    const normalized = [];
    for (const value of Array.isArray(reasons) ? reasons : []) {
      let reason = cleanText(value);
      if (!reason) continue;
      if (reason === REASON_OLD_THREAT) reason = REASON_THREAT;
      if (!normalized.includes(reason)) normalized.push(reason);
    }
    return normalized;
  }

  function isPersistentDetectionReason(reason) {
    return reason === "ウォッチリスト" || reason === "配信者リスト";
  }

  function isStoredDetectionReasonAllowedWithoutCurrentRisk(reason) {
    return isPersistentDetectionReason(reason) || reason === REASON_COORDINATED;
  }

  function getEvidenceFragmentsForDetection(reasons, detected, risk) {
    if (!normalizeDetectionReasons(reasons).length) return [];

    const evidenceTexts = risk?.suspicious && Array.isArray(risk?.evidenceTexts)
      ? risk.evidenceTexts
      : (Array.isArray(detected?.evidenceTexts) ? detected.evidenceTexts : []);
    return evidenceTexts
      .map((text) => String(text).replace(/^[^:]+:\s*/, "").trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }

  function findMatchedEvidenceFragment(text, fragments) {
    const source = cleanText(text);
    for (const fragment of Array.isArray(fragments) ? fragments : []) {
      if (!fragment) continue;
      if (source.includes(fragment)) return fragment;
    }
    return "";
  }

  function getSuspiciousUserList() {
    return [...suspiciousUsers.values()]
      .sort(compareDetectedUsersByDiscoveryTime)
      .map((user) => {
        const detectedRecord = resolveDetectedMessageRecord(user);
        const latestRecord = resolveLatestMessageRecordForUser(normalizeUsername(user.username), user);
        return {
          ...user,
          detectedMessageId: detectedRecord.messageId,
          detectedMessageKey: detectedRecord.messageKey,
          detectedMessageAt: detectedRecord.postedAt,
          detectedMessageText: detectedRecord.text,
          lastCommentAt: latestRecord.postedAt,
          messageCount: latestRecord.count,
          lastMessage: latestRecord.text,
          reasons: [...user.reasons],
          evidenceTexts: [...(Array.isArray(user.evidenceTexts) ? user.evidenceTexts : [])]
        };
      });
  }

  function compareDetectedUsersByDiscoveryTime(a, b) {
    const left = Number(a?.firstDetectedAt || a?.lastDetectedAt || 0);
    const right = Number(b?.firstDetectedAt || b?.lastDetectedAt || 0);
    if (right !== left) return right - left;
    return String(a?.username || "").localeCompare(String(b?.username || ""));
  }

  function resolveDetectedMessageRecord(user) {
    const messageKey = cleanText(user?.detectedMessageKey || "");
    const storedText = cleanText(user?.detectedMessageText || "").slice(0, 180);
    const storedTimestamp = Number(user?.detectedMessageAt) || 0;
    const storedId = normalizeMessageId(user?.detectedMessageId || "");
    const evidenceText = normalizeEvidenceTexts(user?.evidenceTexts)
      .map((text) => String(text).replace(/^[^:]+:\s*/, "").trim())
      .find(Boolean) || "";

    if (messageKey && canonicalMessageStore.has(messageKey)) {
      const record = canonicalMessageStore.get(messageKey);
      return {
        messageId: normalizeMessageId(record?.messageId || "") || storedId,
        messageKey,
        postedAt: Number(record?.postedAt || 0) || storedTimestamp,
        text: cleanText(record?.text || "").slice(0, 180) || storedText || evidenceText
      };
    }

    return {
      messageId: storedId,
      messageKey,
      postedAt: storedTimestamp,
      text: storedText || evidenceText
    };
  }

  function resolveLatestMessageRecordForUser(userKey, user) {
    const messages = getCanonicalHistoryMessagesForUser(userKey);
    const latest = messages[0];
    if (latest?.text) {
      return {
        postedAt: Number(latest.postedAt || latest.timestamp || 0),
        text: cleanText(latest.text || "").slice(0, 180),
        count: messages.length
      };
    }

    const detected = resolveDetectedMessageRecord(user);
    return {
      postedAt: Number(detected?.postedAt) || 0,
      text: cleanText(detected?.text || "").slice(0, 180),
      count: 0
    };
  }

  function selectDetectedMessage(userKey, messages, evidenceTexts, fallbackTimestamp = 0) {
    const values = Array.isArray(messages) ? messages : [];
    const fragments = normalizeEvidenceTexts(evidenceTexts)
      .map((text) => String(text).replace(/^[^:]+:\s*/, "").trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    let bestMatch = null;
    for (const message of values) {
      const raw = cleanText(message?.rawText || "");
      const text = cleanText(message?.text || "");
      if (!raw && !text) continue;

      for (const fragment of fragments) {
        const matches = (raw && raw.includes(fragment)) || (text && text.includes(fragment));
        if (!matches) continue;

        const candidate = {
          messageId: normalizeMessageId(message?.id || message?.messageId || ""),
          messageKey: buildCanonicalMessageKey(userKey, message),
          timestamp: Number(message?.timestamp) || 0,
          text: cleanText(message?.rawText || message?.text || fragment),
          fragmentLength: fragment.length
        };
        if (!bestMatch ||
          candidate.timestamp > bestMatch.timestamp ||
          (candidate.timestamp === bestMatch.timestamp && candidate.fragmentLength > bestMatch.fragmentLength)
        ) {
          bestMatch = candidate;
        }
      }
    }

    if (bestMatch?.timestamp) {
      return {
        messageId: bestMatch.messageId || "",
        messageKey: bestMatch.messageKey || "",
        timestamp: bestMatch.timestamp,
        text: bestMatch.text
      };
    }

    const fallback = values.find((message) => Number(message?.timestamp) === Number(fallbackTimestamp)) || values[0] || null;
    return {
      messageId: normalizeMessageId(fallback?.id || fallback?.messageId || ""),
      messageKey: fallback ? buildCanonicalMessageKey(userKey, fallback) : "",
      timestamp: Number(fallback?.timestamp) || Number(fallbackTimestamp) || 0,
      text: cleanText(fallback?.rawText || fallback?.text || fragments[0] || "")
    };
  }

  function normalizeEvidenceTexts(values) {
    const unique = [];
    for (const value of Array.isArray(values) ? values : []) {
      const text = cleanText(value).slice(0, 120);
      if (!text || unique.includes(text)) continue;
      unique.push(text);
      if (unique.length >= 3) break;
    }
    return unique;
  }

  function getSuspiciousReportPayload() {
    return {
      channelSlug: activeChannelSlug || streamContext?.slug || getChannelSlug(),
      pageUrl: location.href,
      updatedAt: Date.now(),
      chatStatus: getChatStatusSnapshot(),
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
    saveSuspiciousUsers();
    updateCompactDashboard();
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
          refreshListedDetectionsFromVisibleChat();
          reevaluateListedUsersFromHistory();
          reevaluateSuspiciousUsersFromHistory();
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

        if (message.type === "KLT_REFRESH_FOLLOWED_CHANNELS") {
          syncFollowedChannels({ force: true }).then(() => {
            sendResponse({
              ok: true,
              status: followedChannelsSyncStatus
            });
          }).catch((error) => {
            sendResponse({
              ok: false,
              reason: String(error?.message || error || "")
            });
          });
          return true;
        }

        if (message.type === "KLT_PIN_USER") {
          const username = cleanText(message.username || "").replace(/^@/, "");
          if (!looksLikeUsernameToken(username, { allowNumericOnly: true })) {
            sendResponse({
              ok: false,
              reason: t("accountIdMissing")
            });
            return true;
          }

          const ok = pinUser(username, { fromPopup: true });
          if (ok) updatePinnedRealtimeHistoryState(username);
          sendResponse({
            ok,
            reason: ok ? "" : t("maxPinned", { count: getMaxPinnedPopovers() })
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
    requestRealtimeWsStatus();
    requestFollowedApiBuffer();
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

  function requestRealtimeWsStatus() {
    try {
      window.postMessage({
        source: "KLT_CONTENT_BRIDGE",
        type: "KLT_REQUEST_WS_STATUS"
      }, location.origin);
    } catch (_error) {
      // Optional bridge.
    }
  }

  function requestFollowedApiBuffer() {
    try {
      window.postMessage({
        source: "KLT_CONTENT_BRIDGE",
        type: "KLT_REQUEST_FOLLOWED_BUFFER"
      }, location.origin);
    } catch (_error) {
      // Optional bridge.
    }
  }

  function fetchHistoryJson(url) {
    return fetchHistoryJsonViaPageBridge(url).then((data) => {
      apiDebug.lastError = "";
      return data;
    }).catch((error) => {
      apiDebug.lastError = String(error?.message || error || "");
      return fetch(url, {
        credentials: "include",
        headers: {
          "Accept": "application/json, text/plain, */*"
        }
      }).then(async (response) => {
        apiDebug.lastStatus = `messages:${response.status}`;
        if (!response.ok) {
          throw new Error(`chat api failed: ${response.status}`);
        }
        const data = await response.json();
        apiDebug.lastError = "";
        return data;
      });
    });
  }

  function fetchHistoryJsonViaPageBridge(url) {
    return new Promise((resolve, reject) => {
      const requestId = `history-${Date.now()}-${++historyFetchBridgeSequence}`;
      const timeout = window.setTimeout(() => {
        historyFetchBridgeRequests.delete(requestId);
        reject(new Error("history bridge timeout"));
      }, 10000);

      historyFetchBridgeRequests.set(requestId, {
        resolve,
        reject,
        timeout
      });

      try {
        window.postMessage({
          source: "KLT_CONTENT_BRIDGE",
          type: "KLT_FETCH_HISTORY",
          requestId,
          url
        }, location.origin);
      } catch (error) {
        window.clearTimeout(timeout);
        historyFetchBridgeRequests.delete(requestId);
        reject(error);
      }
    });
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
      return;
    }

    if (data.type === "KLT_WS_HOOK_STATUS") {
      rememberRealtimeWsHookStatus(data.payload);
      return;
    }

    if (data.type === "KLT_FOLLOWED_BUFFER" && Array.isArray(data.payload)) {
      for (const payload of data.payload) {
        rememberFollowedApiPayload(payload);
      }
      return;
    }

    if (data.type === "KLT_FOLLOWED_API_RESPONSE") {
      rememberFollowedApiPayload(data.payload);
      return;
    }

    if (data.type === "KLT_FETCH_HISTORY_RESULT") {
      const payload = data.payload || {};
      const requestId = String(payload.requestId || "");
      const pending = historyFetchBridgeRequests.get(requestId);
      if (!pending) return;

      window.clearTimeout(pending.timeout);
      historyFetchBridgeRequests.delete(requestId);
      apiDebug.lastStatus = `history-bridge:${payload.status || 0}`;
      if (!payload.ok) {
        pending.reject(new Error(payload.error || `history bridge failed: ${payload.status || 0}`));
        return;
      }

      pending.resolve(payload.data || {});
    }
  }

  function rememberRealtimeWsHookStatus(payload) {
    if (!payload || typeof payload !== "object") return;
    wsHookStatus = {
      hooked: payload.hooked === true,
      rawMessages: Number(payload.rawMessages) || 0,
      parsedMessages: Number(payload.parsedMessages) || 0,
      bufferSize: Number(payload.bufferSize) || 0,
      lastStatusAt: Date.now(),
      installedAt: Number(payload.installedAt) || Number(wsHookStatus.installedAt) || 0,
      requestedAt: Number(payload.requestedAt) || 0,
      lastEventAt: Number(payload.lastEventAt) || Number(wsHookStatus.lastEventAt) || 0
    };
  }

  function rememberFollowedApiPayload(payload) {
    if (!payload || typeof payload !== "object") return;
    const usernames = normalizeUsernameList(
      extractFollowedChannelUsernames(payload.data),
      MAX_BROADCASTER_LIST_USERS
    );
    if (!usernames.length) return;

    lastFollowedApiCaptureAt = Date.now();
    for (const username of usernames) {
      const key = normalizeUsername(username);
      if (!key) continue;
      followedApiCapturedUsernames.set(key, username);
    }

    if (isFollowingChannelsPage() && userSettings.broadcasterListEnabled) {
      const capturedCount = followedApiCapturedUsernames.size;
      const currentSyncedCount = followedChannelsSyncStatus?.source === "following-page-api"
        ? Number(followedChannelsSyncStatus?.syncedCount) || 0
        : 0;
      if (capturedCount > currentSyncedCount) {
        updateFollowedChannelsSyncStatus("running", "", {
          syncedCount: capturedCount,
          hasSyncedCount: true,
          syncedUsernames: getCapturedFollowedApiUsernames(),
          currentUsername: getCapturedFollowedApiUsernames().at(-1) || "",
          totalCount: 0,
          hasTotalCount: false,
          source: "following-page-api"
        }).catch(() => {});
      }
    }

    scheduleFollowedApiDrivenSync();
  }

  function getCapturedFollowedApiUsernames() {
    return [...followedApiCapturedUsernames.values()].slice(0, MAX_BROADCASTER_LIST_USERS);
  }

  function scheduleFollowedApiDrivenSync() {
    if (!isFollowingChannelsPage()) return;

    const capturedCount = followedApiCapturedUsernames.size;
    const currentListCount = Array.isArray(userSettings.broadcasterList)
      ? userSettings.broadcasterList.length
      : 0;
    const currentSyncedCount = followedChannelsSyncStatus?.source === "following-page-api"
      ? Number(followedChannelsSyncStatus?.syncedCount) || 0
      : 0;
    const currentBest = Math.max(currentSyncedCount, isFollowingChannelsPage() ? 0 : currentListCount);
    if (capturedCount <= currentBest) return;

    clearTimeout(followedApiSyncDebounceTimer);
    followedApiSyncDebounceTimer = window.setTimeout(() => {
      followedApiSyncDebounceTimer = 0;
      lastFollowedChannelsSyncAt = 0;
      scheduleFollowedChannelsSync(0);
    }, 400);
  }

  function rememberRealtimeWsMessage(payload) {
    if (!payload || typeof payload !== "object") return false;

    realtimeWsMessagesSeen += 1;
    const hadRealtimeBefore = lastRealtimeWsMessageAt > 0;
    const wasRealtimeStale = hadRealtimeBefore && !hasRecentRealtimeWsMessage();
    const shouldShowRecovered = realtimeFallbackActive || wasRealtimeStale;
    const username = cleanText(payload.username || payload.sender?.username || payload.sender?.slug).replace(/^@/, "");
    const text = getRealtimeWsMessageText(payload);
    const timestamp = parseKickDate(payload.createdAt || payload.created_at || payload.sentAt || payload.timestamp) || Date.now();
    const messageId = getRealtimeWsMessageId(payload, username, text, timestamp);
    if (!username || !text) return false;

    lastRealtimeWsMessageAt = Date.now();
    const remembered = rememberMessage(username, text, timestamp, messageId, "realtime-ws", "posted", {
      postedAt: timestamp,
      receivedAt: Date.now()
    });
    if (remembered) {
      realtimeWsMessagesAccepted += 1;
      clearBackfillNoResultState(username);
      if (shouldShowRecovered) {
        showIngestionStatus(t("wsRecovered"), "recovered", {
          force: true,
          durationMs: 2600
        });
      }
    }
    realtimeFallbackActive = false;

    return remembered;
  }

  function getRealtimeWsMessageId(payload, username = "", text = "", timestamp = 0) {
    const candidates = [
      payload?.msgId,
      payload?.id,
      payload?.messageId,
      payload?.message_id,
      payload?.uuid,
      payload?.eventId,
      payload?.event_id,
      payload?.message?.id,
      payload?.message?.message_id,
      payload?.message?.uuid,
      payload?.data?.id,
      payload?.data?.message_id,
      payload?.chat_message?.id,
      payload?.chatMessage?.id
    ];

    for (const candidate of candidates) {
      const normalized = normalizeMessageId(candidate);
      if (normalized) return normalized;
    }

    if (timestamp > 0 && username && text) {
      return buildSyntheticMessageId("ws", username, text, timestamp);
    }

    if (payload?.kltSeq) {
      return `klt-ws-${payload.kltSeq}`;
    }

    return "";
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

  function isFollowingChannelsPage() {
    return /^\/following\/channels\/?$/i.test(location.pathname);
  }

  async function getFollowingChannelsPageUsernames() {
    const usernames = new Map();
    for (const username of getVisibleFollowingUsernames()) {
      usernames.set(normalizeUsername(username), username);
    }

    if (!isFollowingChannelsPage()) {
      return [...usernames.keys()].slice(0, MAX_BROADCASTER_LIST_USERS);
    }

    const roots = getFollowingScrollRoots();
    const pageScrollX = window.scrollX;
    const pageScrollY = window.scrollY;
    const rootSnapshots = roots.map((root) => ({
      root,
      scrollTop: typeof root.scrollTop === "number" ? root.scrollTop : 0
    }));

    try {
      for (const root of roots) {
        const collected = await autoScrollAndCollect(root);
        for (const username of collected) {
          const key = normalizeUsername(username);
          if (!key) continue;
          usernames.set(key, username);
        }
      }
    } finally {
      for (const snapshot of rootSnapshots) {
        try {
          snapshot.root.scrollTop = snapshot.scrollTop;
        } catch (_error) {
          // Ignore scroll restoration failures.
        }
      }
      try {
        window.scrollTo(pageScrollX, pageScrollY);
      } catch (_error) {
        // Ignore window scroll restoration failures.
      }
    }

    return [...usernames.keys()].slice(0, MAX_BROADCASTER_LIST_USERS);
  }

  function getFollowingScrollRoots() {
    const roots = [];
    const seen = new Set();

    for (const label of getFollowingLabelElements()) {
      const root = getFollowingSearchRoot(label);
      if (!root || seen.has(root)) continue;
      seen.add(root);
      roots.push(root);
    }

    if (!roots.length && document.scrollingElement) {
      roots.push(document.scrollingElement);
    } else if (!roots.length) {
      roots.push(document.documentElement);
    }

    return roots;
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
      updateFollowedChannelsSyncStatus("disabled", t("followedDisabled"));
      return;
    }

    followedChannelsSyncTimer = window.setTimeout(() => {
      followedChannelsSyncTimer = 0;
      syncFollowedChannels();
    }, delay);
  }

  async function syncFollowedChannels(options = {}) {
    if (!userSettings.broadcasterListEnabled || followedChannelsSyncRunning) return;
    const force = options.force === true;
    if (!force && Date.now() - lastFollowedChannelsSyncAt < FOLLOWED_CHANNELS_REFRESH_MS) return;

    followedChannelsSyncRunning = true;
    let succeeded = false;
    await updateFollowedChannelsSyncStatus("running", t("followedLoading"));
    try {
      const apiResult = await fetchFollowedChannelUsernames();

      // If API probe failed (unauthenticated or blocked), fall back to visible UI scraping.
      if (apiResult.reason) {
        // keep the reason for status but continue to attempt visible scraping
        await updateFollowedChannelsSyncStatus("running", `API probe: ${apiResult.reason}`);
      }

      const apiUsernames = Array.isArray(apiResult.usernames) ? apiResult.usernames : [];
      const capturedApiUsernames = isFollowingChannelsPage()
        ? getCapturedFollowedApiUsernames()
        : [];

      if (isFollowingChannelsPage() && !capturedApiUsernames.length && !apiUsernames.length) {
        await updateFollowedChannelsSyncStatus("running", "", {
          syncedCount: 0,
          hasSyncedCount: true,
          syncedUsernames: [],
          currentUsername: "",
          totalCount: 0,
          hasTotalCount: false,
          source: "following-page-api"
        });
        return;
      }

      const shouldUseCapturedApi = capturedApiUsernames.length > apiUsernames.length;
      const usernames = normalizeUsernameList(
        shouldUseCapturedApi
          ? capturedApiUsernames
          : apiUsernames,
        MAX_BROADCASTER_LIST_USERS
      );
      const syncSource = shouldUseCapturedApi
        ? "following-page-api"
        : (apiUsernames.length ? apiResult.source || "Kick API" : "");

      if (!usernames.length) {
        const cachedUsernames = normalizeUsernameList(userSettings.broadcasterList, MAX_BROADCASTER_LIST_USERS);
        if (cachedUsernames.length && apiResult.reason) {
          succeeded = true;
          await updateFollowedChannelsSyncStatus("success", `前回の配信者リストを使用中 (${apiResult.reason})`, {
            addedCount: 0,
            removedCount: 0,
            listCount: cachedUsernames.length,
            syncedCount: cachedUsernames.length,
            hasSyncedCount: true,
            listOnlyCount: 0,
            syncedUsernames: cachedUsernames,
            currentUsername: cachedUsernames.at(-1) || "",
            removedUsernames: [],
            pageCount: apiResult.pageCount || 0,
            stopReason: apiResult.reason,
            totalCount: 0,
            hasTotalCount: false,
            source: "cached-list"
          });
          return;
        }

        const reason = apiResult.reason || t("followedNotFound");
        await updateFollowedChannelsSyncStatus("failed", reason);
        return;
      }

      const currentListCount = Array.isArray(userSettings.broadcasterList)
        ? userSettings.broadcasterList.length
        : 0;
      const currentSyncedCount = Number(followedChannelsSyncStatus?.syncedCount) || 0;
      const currentBestCount = Math.max(currentListCount, currentSyncedCount);
      if (!isFollowingChannelsPage() && currentBestCount > usernames.length) {
        succeeded = true;
        return;
      }

      const result = await replaceBroadcasterList(usernames);
      succeeded = true;
      await updateFollowedChannelsSyncStatus("success", "", {
        addedCount: result.addedCount,
        removedCount: result.removedCount,
        listCount: result.listCount,
        syncedCount: usernames.length,
        hasSyncedCount: true,
        listOnlyCount: 0,
        syncedUsernames: usernames,
        currentUsername: usernames.at(-1) || "",
        removedUsernames: result.removedUsernames,
        pageCount: apiResult.pageCount || 0,
        stopReason: apiResult.stopReason || "",
        totalCount: apiResult.hasTotalCount ? (Number(apiResult.totalCount) || 0) : 0,
        hasTotalCount: apiResult.hasTotalCount === true && Number(apiResult.totalCount) > 0,
        source: syncSource
      });
    } finally {
      followedChannelsSyncRunning = false;
      lastFollowedChannelsSyncAt = succeeded ? Date.now() : 0;
    }
  }

  async function fetchFollowedChannelUsernames() {
    if (!isMaybeLoggedIn()) {
      return { usernames: [], reason: t("notLoggedIn"), loginRequired: true, source: "" };
    }

    const result = await racePromise(fetchFollowedChannelsViaPageContext(), 30000);
    if (result && result.usernames && result.usernames.length) {
      return {
        usernames: result.usernames,
        totalCount: Number(result.totalCount) || 0,
        hasTotalCount: result.hasTotalCount === true && Number(result.totalCount) > 0,
        pageCount: result.pageCount || 0,
        stopReason: result.stopReason || "",
        reason: "",
        loginRequired: false,
        source: result.source || "kick-api-v2"
      };
    }

    const reason = result?.reason || t("followedNotFound");
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
      return { usernames: [], reason: needsLogin ? t("loginRequired") : t("noSessionToken"), loginRequired: needsLogin };
    }

    return fetchFollowedChannelsViaPagedEndpoint(token);
  }

  async function fetchFollowedChannelsViaPagedEndpoint(token) {
    const usernames = [];
    const seen = new Set();
    let cursor = 0;
    const visitedCursors = new Set();
    let pages = 0;
    let reportedTotalCount = 0;
    let stopReason = "";

    try {
      while (true) {
        if (pages >= FOLLOWED_CHANNELS_MAX_PAGES) {
          stopReason = "page limit";
          break;
        }
        pages += 1;

        const url = `${API_ORIGIN}/api/v2/channels/followed-page?cursor=${encodeURIComponent(cursor)}&limit=${FOLLOWED_CHANNELS_PAGE_SIZE}`;
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
            return { usernames: [], reason: t("loginRequired"), loginRequired: true };
          }
          return { usernames: [], reason: `API error: ${resp.status}`, loginRequired: false };
        }

        const data = await resp.json();
        const items = getFollowedChannelItems(data);
        const pageUsernames = [];
        reportedTotalCount = Math.max(reportedTotalCount, getFollowedTotalCount(data));

        for (const item of items) {
          const slug = getFollowedItemUsername(item);
          if (!slug || !/^[a-z0-9_.-]{1,32}$/i.test(slug)) continue;
          const normalized = slug.replace(/^@/, "").trim().toLowerCase();
          if (seen.has(normalized)) continue;
          seen.add(normalized);
          usernames.push(normalized);
          pageUsernames.push(normalized);
        }

        if (userSettings.broadcasterListEnabled && usernames.length > 0) {
          await updateFollowedChannelsSyncStatus("running", "", {
            syncedCount: usernames.length,
            hasSyncedCount: true,
            syncedUsernames: [...usernames],
            currentUsername: pageUsernames.at(-1) || usernames.at(-1) || "",
            totalCount: reportedTotalCount,
            hasTotalCount: reportedTotalCount > 0 && reportedTotalCount > usernames.length,
            pageCount: pages,
            source: "kick-api-v2"
          });
        }

        let nextCursor = getFollowedNextCursor(data, cursor);
        const hasMore = hasFollowedMore(data);
        if (!nextCursor && items.length >= FOLLOWED_CHANNELS_PAGE_SIZE) {
          nextCursor = getOffsetFollowedNextCursor(cursor, items.length);
          if (nextCursor) stopReason = "offset fallback";
        }
        if (pages > 1 && pageUsernames.length === 0) {
          stopReason = "duplicate or empty page";
          break;
        }
        if (!hasMore && !nextCursor) {
          stopReason = "no more pages";
          break;
        }
        if (!nextCursor) {
          stopReason = "next cursor missing";
          break;
        }
        if (visitedCursors.has(String(nextCursor))) {
          stopReason = "repeated cursor";
          break;
        }
        if (pageUsernames.length === 0 && seen.size > 0 && !hasMore) {
          stopReason = "empty final page";
          break;
        }

        visitedCursors.add(String(nextCursor));
        cursor = nextCursor;
      }

      return {
        usernames,
        totalCount: reportedTotalCount,
        hasTotalCount: reportedTotalCount > 0,
        pageCount: pages,
        stopReason,
        reason: "",
        loginRequired: false,
        source: "kick-api-v2"
      };
    } catch (err) {
      return { usernames: [], reason: t("networkError", { message: err.message }), loginRequired: false };
    }
  }

  function getFollowedNextCursor(data, currentCursor = "") {
    const candidates = [
      data?.nextCursor,
      data?.next_cursor,
      data?.next?.cursor,
      data?.pagination?.next,
      data?.pagination?.cursor,
      data?.pagination?.nextCursor,
      data?.pagination?.next_cursor,
      data?.meta?.nextCursor,
      data?.meta?.next_cursor,
      data?.meta?.next?.cursor,
      data?.links?.next,
      data?.data?.nextCursor,
      data?.data?.next_cursor,
      data?.data?.next?.cursor,
      data?.data?.pagination?.next,
      data?.data?.pagination?.cursor,
      data?.data?.pagination?.nextCursor,
      data?.data?.pagination?.next_cursor,
      data?.data?.meta?.nextCursor,
      data?.data?.meta?.next_cursor,
      data?.data?.meta?.next?.cursor,
      data?.data?.links?.next
    ];

    for (const value of candidates) {
      const cursor = normalizeFollowedCursor(value);
      if (!cursor) continue;
      if (String(cursor) === String(currentCursor)) continue;
      return cursor;
    }

    return null;
  }

  function normalizeFollowedCursor(value) {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") return Number.isFinite(value) ? value : "";
    const text = String(value).trim();
    if (!text) return "";

    try {
      const url = new URL(text, API_ORIGIN);
      return url.searchParams.get("cursor") ||
        url.searchParams.get("next_cursor") ||
        url.searchParams.get("nextCursor") ||
        "";
    } catch (_error) {
      return text;
    }
  }

  function getOffsetFollowedNextCursor(currentCursor, itemCount) {
    const current = Number(currentCursor);
    if (!Number.isFinite(current)) return "";
    const count = Number(itemCount);
    if (!Number.isFinite(count) || count <= 0) return "";
    return current + count;
  }

  function getFollowedTotalCount(data) {
    const candidates = [
      data?.total,
      data?.total_count,
      data?.totalCount,
      data?.count,
      data?.pagination?.total,
      data?.pagination?.total_count,
      data?.pagination?.totalCount,
      data?.meta?.total,
      data?.meta?.total_count,
      data?.meta?.totalCount,
      data?.data?.total,
      data?.data?.total_count,
      data?.data?.totalCount,
      data?.data?.count,
      data?.data?.pagination?.total,
      data?.data?.pagination?.total_count,
      data?.data?.pagination?.totalCount,
      data?.data?.meta?.total,
      data?.data?.meta?.total_count,
      data?.data?.meta?.totalCount
    ];

    for (const value of candidates) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
    }

    return 0;
  }

  function hasFollowedMore(data) {
    const candidates = [
      data?.has_more,
      data?.hasMore,
      data?.pagination?.has_more,
      data?.pagination?.hasMore,
      data?.data?.has_more,
      data?.data?.hasMore,
      data?.data?.pagination?.has_more,
      data?.data?.pagination?.hasMore
    ];

    for (const value of candidates) {
      if (typeof value === "boolean") return value;
    }

    return false;
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
      item?.followed_channel,
      item?.followedChannel,
      item?.streamer,
      item?.user,
      item?.broadcaster,
      item?.creator,
      item?.node?.channel,
      item?.node?.followed_channel,
      item?.node?.followedChannel,
      item?.node?.streamer,
      item?.node?.user,
      item?.node?.broadcaster,
      item?.node?.creator,
      item?.livestream?.channel,
      item?.livestream?.user,
      item?.stream?.channel,
      item?.stream?.user,
      item?.data?.channel,
      item?.data?.user,
      item
    ].filter(Boolean);

    for (const source of sources) {
      const username = getUsernameFromFollowedChannelSource(source, true);
      if (looksLikeUsernameToken(username, { allowNumericOnly: true })) return username;
    }

    return "";
  }

  function getUsernameFromFollowedChannelSource(source, allowNestedUser) {
    if (typeof source === "string") return cleanText(source).replace(/^@/, "");
    if (!source || typeof source !== "object") return "";
    return cleanText(
      source.channel_slug ||
      source.channelSlug ||
      source.channel_username ||
      source.channelUsername ||
      source.slug ||
      source.username ||
      source.user_name ||
      source.userName ||
      source.channel?.slug ||
      source.channel?.username ||
      source.channel?.user_name ||
      source.channel?.userName ||
      source.broadcaster_user?.slug ||
      source.broadcaster_user?.username ||
      source.broadcasterUser?.slug ||
      source.broadcasterUser?.username ||
      (allowNestedUser ? source.user?.slug : "") ||
      (allowNestedUser ? source.user?.username : "") ||
      ""
    ).replace(/^@/, "");
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

    const entries = Object.entries(value)
      .filter(([key]) => /follow|channel|streamer|data|item|edge|node|result/i.test(key));

    for (const [, child] of entries) {
      const result = findFollowedItemsDeep(child, depth + 1);
      if (result.length) return result;
    }

    return [];
  }

  async function replaceBroadcasterList(usernames) {
    const before = normalizeUsernameList(userSettings.broadcasterList, MAX_BROADCASTER_LIST_USERS);
    const next = normalizeUsernameList(usernames, MAX_BROADCASTER_LIST_USERS);
    const beforeSet = new Set(before);
    const nextSet = new Set(next);
    const addedUsernames = next.filter((username) => !beforeSet.has(username));
    const removedUsernames = before.filter((username) => !nextSet.has(username));
    const changed = addedUsernames.length > 0 ||
      removedUsernames.length > 0 ||
      before.length !== next.length;

    if (!changed) {
      return {
        addedCount: 0,
        removedCount: 0,
        removedUsernames: [],
        listCount: next.length
      };
    }

    userSettings = normalizeSettings({
      ...userSettings,
      broadcasterListEnabled: true,
      broadcasterList: next
    });
    await writeExtensionStorage(SETTINGS_STORAGE_KEY, userSettings);
    reevaluateListedUsersFromHistory();
    return {
      addedCount: addedUsernames.length,
      removedCount: removedUsernames.length,
      removedUsernames,
      listCount: next.length
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
      hasSyncedCount: false,
      hasTotalCount: false,
      syncedUsernames: [],
      source: "",
      ...extra
    };
  }

  async function updateFollowedChannelsSyncStatus(state, reason = "", extra = {}) {
    followedChannelsSyncStatus = createFollowedChannelsSyncStatus(state, reason, extra);
    await writeExtensionStorage(FOLLOWED_CHANNELS_SYNC_STORAGE_KEY, followedChannelsSyncStatus);
  }

  function showPopoverNotice(message) {
    const text = cleanText(message);
    if (!text) return;

    compactDashboardNotice = text;
    clearTimeout(compactDashboardNoticeTimer);
    updateCompactDashboard();
    compactDashboardNoticeTimer = window.setTimeout(() => {
      compactDashboardNotice = "";
      compactDashboardNoticeTimer = 0;
      updateCompactDashboard();
    }, 2600);
  }

  function attachPinnedCardEvents(card) {
    card.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const key = card.dataset.usernameKey || "";
      bringPinnedCardToFront(key);

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

      if (target.closest(".kch-popover__pin")) {
        event.preventDefault();
        closePinnedCard(key);
        return;
      }

      if (target.closest(".kch-popover__watch")) {
        event.preventDefault();
        toggleWatchlistUser(key);
        return;
      }

    });

    card.addEventListener("pointerdown", (event) => {
      const key = card.dataset.usernameKey || "";
      bringPinnedCardToFront(key);
      if (!(event.target instanceof Element)) return;
      if (event.target.closest(".kch-popover__resize-handle")) {
        const rect = card.getBoundingClientRect();
        pinnedResizeState = {
          element: card,
          key,
          pointerId: event.pointerId,
          startY: event.clientY,
          startHeight: rect.height
        };
        card.setPointerCapture?.(event.pointerId);
        card.classList.add("kch-popover--resizing");
        event.preventDefault();
        return;
      }
      if (event.target.closest("button")) return;
      if (!event.target.closest(".kch-popover__header")) return;

      const rect = card.getBoundingClientRect();
      pinnedDragState = {
        element: card,
        key,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      card.setPointerCapture?.(event.pointerId);
      card.classList.add("kch-popover--dragging");
      event.preventDefault();
    });

    card.addEventListener("pointermove", (event) => {
      if (pinnedResizeState && pinnedResizeState.element === card && pinnedResizeState.pointerId === event.pointerId) {
        setPinnedCardHeight(card, pinnedResizeState.startHeight + (event.clientY - pinnedResizeState.startY), pinnedResizeState.key);
        return;
      }
      if (!pinnedDragState || pinnedDragState.element !== card || pinnedDragState.pointerId !== event.pointerId) return;
      setElementPosition(
        card,
        event.clientX - pinnedDragState.offsetX,
        event.clientY - pinnedDragState.offsetY,
        pinnedDragState.key,
        { mode: "viewport" }
      );
    });

    card.addEventListener("pointerup", (event) => {
      if (pinnedResizeState && pinnedResizeState.element === card && pinnedResizeState.pointerId === event.pointerId) {
        pinnedResizeState = null;
        card.releasePointerCapture?.(event.pointerId);
        card.classList.remove("kch-popover--resizing");
        return;
      }
      if (!pinnedDragState || pinnedDragState.element !== card || pinnedDragState.pointerId !== event.pointerId) return;
      pinnedDragState = null;
      card.releasePointerCapture?.(event.pointerId);
      card.classList.remove("kch-popover--dragging");
    });

    card.addEventListener("pointercancel", () => {
      pinnedDragState = null;
      pinnedResizeState = null;
      card.classList.remove("kch-popover--dragging");
      card.classList.remove("kch-popover--resizing");
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
  }

  function closeAllPinnedCards() {
    for (const card of pinnedCards.values()) {
      card.element.remove();
    }
    pinnedCards.clear();
    autoPinnedUsers.clear();
    nextPinnedZIndex = PINNED_Z_INDEX_BASE;
  }

  function renderPinnedCard(key, options = {}) {
    const card = pinnedCards.get(key);
    if (!card) return;
    renderPopoverContent(card.element, card.username, true, options);
  }

  function getInitialPinnedHeight(auto) {
    const sourceRect = !auto && !popover.hidden
      ? popover.getBoundingClientRect()
      : null;
    const fallback = auto ? 324 : 260;
    const height = sourceRect && sourceRect.height > 0
      ? sourceRect.height
      : fallback;

    return clampPinnedCardHeight(height);
  }

  function getInitialPinnedScrollTop(auto) {
    if (auto || popover.hidden) return null;
    const list = popover.querySelector(".kch-popover__list");
    if (!list) return null;
    return list.scrollTop;
  }

  function setPinnedCardHeight(element, height, key = "") {
    const rect = element.getBoundingClientRect();
    const clampedHeight = clampPinnedCardHeight(height, rect.top);
    element.style.height = `${clampedHeight}px`;

    if (key && pinnedCards.has(key)) {
      pinnedCards.get(key).height = clampedHeight;
    }
  }

  function clampPinnedCardHeight(height, top = 10) {
    const minHeight = 150;
    const maxHeight = Math.max(minHeight, window.innerHeight - top - 10);
    const numericHeight = Number(height);
    const safeHeight = Number.isFinite(numericHeight) && numericHeight > 0
      ? numericHeight
      : 260;

    return Math.round(Math.min(Math.max(minHeight, safeHeight), maxHeight));
  }

  function bringPinnedCardToFront(usernameOrKey) {
    const key = normalizeUsername(usernameOrKey);
    const card = pinnedCards.get(key);
    if (!card) return;

    if (nextPinnedZIndex >= PINNED_Z_INDEX_MAX) {
      normalizePinnedCardZIndexes(key);
      return;
    }

    nextPinnedZIndex += 1;
    card.element.style.zIndex = String(nextPinnedZIndex);
  }

  function normalizePinnedCardZIndexes(activeKey = "") {
    const prioritizedKey = normalizeUsername(activeKey);
    const entries = [...pinnedCards.entries()]
      .sort(([, left], [, right]) => getPinnedCardZIndex(left.element) - getPinnedCardZIndex(right.element));
    const ordered = prioritizedKey
      ? [
        ...entries.filter(([key]) => key !== prioritizedKey),
        ...entries.filter(([key]) => key === prioritizedKey)
      ]
      : entries;

    let currentZIndex = PINNED_Z_INDEX_BASE;
    for (const [, card] of ordered) {
      currentZIndex += 1;
      card.element.style.zIndex = String(currentZIndex);
    }
    nextPinnedZIndex = currentZIndex;
  }

  function getPinnedCardZIndex(element) {
    const numeric = Number(element?.style?.zIndex || 0);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : PINNED_Z_INDEX_BASE;
  }

  function setElementPosition(element, left, top, key = "", options = {}) {
    const rect = element.getBoundingClientRect();
    const viewportMargin = 10;
    const bounds = options.mode === "viewport"
      ? {
          left: viewportMargin,
          top: viewportMargin,
          right: window.innerWidth - viewportMargin,
          bottom: window.innerHeight - viewportMargin
        }
      : getPopoverSafeArea();
    const maxLeft = Math.max(bounds.left, bounds.right - rect.width);
    const maxTop = Math.max(bounds.top, bounds.bottom - rect.height);
    const clampedLeft = Math.min(Math.max(bounds.left, left), maxLeft);
    const clampedTop = Math.min(Math.max(bounds.top, top), maxTop);

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
    temporaryPopoverExpiresAt = 0;
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

  function getWatchIcon(active) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" class="kch-popover__watch-icon ${active ? "kch-popover__watch-icon--active" : ""}">
        <circle cx="12" cy="12" r="9"></circle>
        <rect x="10.6" y="6.3" width="2.8" height="11.4" rx="1.2" ry="1.2" class="kch-popover__watch-cut"></rect>
        <rect x="6.3" y="10.6" width="11.4" height="2.8" rx="1.2" ry="1.2" class="kch-popover__watch-cut"></rect>
      </svg>
    `;
  }

  async function toggleWatchlistUser(username) {
    const normalized = cleanText(username).replace(/^@/, "");
    const key = normalizeUsername(normalized);
    if (!key || !looksLikeUsernameToken(normalized, { allowNumericOnly: true })) {
      showPopoverNotice(t("accountIdMissing"));
      return false;
    }

    const nextWatchlist = new Set(normalizeUsernameList(userSettings.watchlist));
    const removing = nextWatchlist.has(key);
    if (removing) {
      nextWatchlist.delete(key);
    } else {
      nextWatchlist.add(key);
    }

    userSettings = normalizeSettings({
      ...userSettings,
      watchlist: [...nextWatchlist]
    });
    await writeExtensionStorage(SETTINGS_STORAGE_KEY, userSettings);
    reevaluateListedUsersFromHistory();
    reevaluateSuspiciousUsersFromHistory();
    updateCompactDashboard();
    refreshAllPopovers();
    showPopoverNotice(
      removing
        ? t("watchlistRemoved", { username: normalized })
        : t("watchlistAdded", { username: normalized })
    );
    return true;
  }

  function applyModerationCommand(username, type) {
    if (!hasModerationAccess()) return;

    const normalized = normalizeUsername(username);
    if (!normalized) return;

    const command = type === "ban"
      ? `/ban ${normalized} suspicious activity`
      : `/timeout ${normalized} 600 suspicious activity`;

    if (setChatInputValue(command)) {
      showPopoverNotice(t("commandInserted"));
    } else {
      showPopoverNotice(t("inputMissing", { command }));
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

  function installTransientScrollbarBehavior(element) {
    if (!element || transientScrollbarLists.has(element)) return;
    transientScrollbarLists.add(element);

    let timer = 0;
    const revealScrollbar = () => {
      element.classList.add("kch-popover__list--scrolling");
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        element.classList.remove("kch-popover__list--scrolling");
      }, 700);
    };

    element.addEventListener("scroll", revealScrollbar, { passive: true });
    element.addEventListener("wheel", revealScrollbar, { passive: true });
    element.addEventListener("touchmove", revealScrollbar, { passive: true });
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
    const parts = String(text).split(/(\[emote:\d+:[^\]]+\])/g);

    return parts.map((part) => {
      const emoteMatch = part.match(/^\[emote:(\d+):([^\]]+)\]$/);
      if (emoteMatch) {
        const [, id, name] = emoteMatch;
        const safeName = escapeHtml(name);
        return `<img class="kch-emote" src="https://files.kick.com/emotes/${id}/fullsize" alt="${safeName}" title="${safeName}" loading="lazy">`;
      }
      return escapeHtml(part);
    }).join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMessageTime(meta, message) {
    if (getMessageTimestampKind(message) === "posted") {
      meta.textContent = formatTime(message.timestamp);
      meta.title = getPostedTimeTitle(message);
      return;
    }

    meta.classList.add("kch-popover__meta--observed");
    meta.textContent = formatTime(message.timestamp);
    meta.title = t("uncertainTime");
    meta.setAttribute("aria-label", t("uncertainTimeLabel", { time: formatTime(message.timestamp) }));
  }

  function getPostedTimeTitle(message) {
    const latencyMs = Number(message?.latencyMs) || 0;
    const delayedSuffix = latencyMs > REALTIME_RECEIVE_DELAY_MS
      ? t("delayedSuffix", { seconds: Math.round(latencyMs / 1000) })
      : "";
    if (message.source === "api") return t("apiTime");
    if (String(message.source || "").startsWith("realtime")) {
      return t("realtimeTime", { suffix: delayedSuffix });
    }
    if (String(message.source || "").startsWith("dom")) {
      return t("domTime", { suffix: delayedSuffix });
    }
    return t("observedTime", { suffix: delayedSuffix });
  }

  function assessAccountRisk(messages) {
    const riskMessages = messages
      .filter((message) => message?.text && message?.timestamp)
      .filter((message) => getMessageTimestampKind(message) === "posted")
      .map((message) => ({
        rawText: String(message.text || ""),
        text: normalizeMessageForRisk(message.text),
        timestamp: message.timestamp,
        source: message.source || (message.id ? "api" : "dom"),
        id: message.id || message.messageId || "",
        idKind: message.idKind || (hasStrongMessageId(message.id || message.messageId || "") ? "real" : "synthetic")
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
    let tempoRuleCount = 0;
    let tempoScore = 0;
    let contentRuleCount = 0;
    let weakContentRuleCount = 0;
    let strongContentRuleCount = 0;
    const addRule = (reason, weight) => {
      reasons.push(reason);
      score += weight;
    };
    const addTempoRule = (reason, weight) => {
      tempoRuleCount += 1;
      const allowedWeight = Math.max(0, Math.min(weight, TEMPO_SCORE_CAP - tempoScore));
      tempoScore += allowedWeight;
      reasons.push(reason);
      score += allowedWeight;
    };
    const addContentRule = (reason, weight, strength = "normal") => {
      contentRuleCount += 1;
      if (strength === "weak") weakContentRuleCount += 1;
      if (strength === "strong") strongContentRuleCount += 1;
      addRule(reason, weight);
    };

    const counts = new Map();
    const rawByNormalizedText = new Map();
    for (const message of sorted) {
      counts.set(message.text, (counts.get(message.text) || 0) + 1);
      if (!rawByNormalizedText.has(message.text)) rawByNormalizedText.set(message.text, message.rawText);
    }
    const highSignalCounts = new Map(
      [...counts.entries()].filter(([text]) => {
        const rawText = rawByNormalizedText.get(text) || text;
        return !isLowInformationRiskText(rawText, text) && !isBenignReactionText(rawText, text);
      })
    );
    const lowInformationRepeated = [...counts.entries()].some(([text, count]) => {
      const rawText = rawByNormalizedText.get(text) || text;
      return count >= 10 &&
        isLowInformationRiskText(rawText, text) &&
        !isMostlyEmoteText(rawText);
    });

    const repeatedHighSignalText = [...highSignalCounts.entries()]
      .find(([text, count]) => count >= 3 && isRepeatedTextRiskSignal(rawByNormalizedText.get(text) || text, text, count));
    if (repeatedHighSignalText) {
      const [text, count] = repeatedHighSignalText;
      const rawText = rawByNormalizedText.get(text) || text;
      const strongExactRepeat = count >= 8 && isStrongRepeatedTextRiskSignal(rawText, text);
      addContentRule(
        "同一コメントを3回以上",
        strongExactRepeat ? 62 : (count >= 5 ? 30 : 18),
        strongExactRepeat ? "strong" : (count >= 5 ? "normal" : "weak")
      );
    } else if (lowInformationRepeated) {
      addContentRule(REASON_LOW_INFO_REPEAT, 8, "weak");
    }

    if (![...highSignalCounts.values()].some((count) => count >= 3) && hasRepeatedLongComment(highSignalCounts)) {
      addContentRule("同一長文コメントを2回以上", 6, "weak");
    }

    const intervals = [];
    for (let index = 1; index < sorted.length; index += 1) {
      intervals.push(Math.abs(sorted[index - 1].timestamp - sorted[index].timestamp));
    }

    const tempoMessages = sorted.filter((message) => isMeaningfulTempoRiskMessage(message.rawText, message.text));
    if (hasBurstWindow(tempoMessages, 3, 1000)) {
      addTempoRule("1秒以内に3コメント以上", 36);
    }

    if (hasBurstWindow(tempoMessages, 5, 3000)) {
      addTempoRule("3秒以内に5コメント以上", 22);
    }

    if (hasBurstWindow(sorted, 8, 10000)) {
      addTempoRule(REASON_RAPID_SPAM, 24);
    } else if (hasBurstWindow(sorted, 12, 30000)) {
      addTempoRule(REASON_RAPID_SPAM, 18);
    }

    const tempoIntervals = [];
    for (let index = 1; index < tempoMessages.length; index += 1) {
      tempoIntervals.push(Math.abs(tempoMessages[index - 1].timestamp - tempoMessages[index].timestamp));
    }
    const averageInterval = tempoIntervals.reduce((total, value) => total + value, 0) / Math.max(tempoIntervals.length, 1);
    if (tempoMessages.length >= 12 && averageInterval > 0 && averageInterval <= 2500) {
      addTempoRule("平均投稿間隔が2.5秒以下", 14);
    }

    const urlLikeCount = sorted.filter((message) => /https?:\/\/|www\.|\.com\b|\.net\b|\.org\b/i.test(message.text)).length;
    if (urlLikeCount >= 3) {
      addContentRule("URL風コメントが多い", 15, "strong");
    }

    const massRepeatCount = sorted.filter((message) => {
      return isMeaningfulContentRiskMessage(message.rawText, message.text) && hasMassRepeatedText(message.rawText);
    }).length;
    const strongMassRepeat = sorted.some((message) => {
      return isMeaningfulContentRiskMessage(message.rawText, message.text) &&
        hasMassRepeatedText(message.rawText) &&
        cleanText(message.rawText).length >= MASS_REPEAT_STRONG_LENGTH;
    });
    if (massRepeatCount >= 2 || strongMassRepeat) {
      addContentRule("長文/語句の大量反復", 12, "normal");
    }

    const emoteSpamMessages = sorted.filter((message) => isEmoteSpamText(message.rawText));
    const emoteSpamCount = emoteSpamMessages.length;
    const mostlyEmoteSpamCount = emoteSpamMessages.filter((message) => isMostlyEmoteText(message.rawText)).length;
    const strongEmoteSpam = sorted.some((message) => countEmoteLikeTokens(message.rawText) >= EMOTE_SPAM_STRONG_COUNT);
    if (
      strongEmoteSpam ||
      emoteSpamCount >= 5 ||
      mostlyEmoteSpamCount >= 4 ||
      (emoteSpamCount >= 3 && mostlyEmoteSpamCount >= 2) ||
      (emoteSpamCount >= 2 && mostlyEmoteSpamCount < emoteSpamCount)
    ) {
      const emoteSpamWeight =
        strongEmoteSpam || mostlyEmoteSpamCount >= 5
          ? 24
          : (emoteSpamCount >= 4 || mostlyEmoteSpamCount >= 4 ? 16 : 8);
      const emoteSpamStrength =
        emoteSpamWeight >= 24 ? "strong" : (emoteSpamWeight >= 16 ? "normal" : "weak");
      addContentRule("絵文字/スタンプ大量", emoteSpamWeight, emoteSpamStrength);
    }

    const internalRepetitionStats = sorted
      .filter((message) => isMeaningfulContentRiskMessage(message.rawText, message.text))
      .map((message) => analyzeInternalRepetition(message.rawText));
    const strongInternalRepetitionCount = internalRepetitionStats.filter((value) => value.strong).length;
    const moderateInternalRepetitionCount = internalRepetitionStats.filter((value) => value.moderate).length;
    if (strongInternalRepetitionCount >= 1) {
      addContentRule("単一コメント内の大量反復", 36, "strong");
    } else if (moderateInternalRepetitionCount >= 2) {
      addContentRule("コメント内の反復が多い", 16, "normal");
    }

    const personalInfoCount = sorted.filter((message) => looksLikePersonalInfoPost(message.rawText)).length;
    if (personalInfoCount >= 1) {
      addContentRule("個人情報らしき投稿", 55, "strong");
    }

    const violentThreatAnalyses = sorted
      .map((message) => ({
        message,
        analysis: analyzeViolentThreatMessage(message.rawText)
      }))
      .filter((entry) => entry.analysis.score > 0);
    const strongViolentThreatCount = violentThreatAnalyses.filter((entry) => entry.analysis.severe).length;
    const moderateViolentThreatCount = violentThreatAnalyses.filter((entry) => entry.analysis.score >= 5).length;
    if (strongViolentThreatCount >= 1) {
      addContentRule(REASON_THREAT, 55, "strong");
    } else if (moderateViolentThreatCount >= 2) {
      addContentRule(REASON_THREAT, 50, "normal");
    }

    const abusiveMessages = sorted.filter((message) => analyzeAbusiveMessage(message.rawText));
    if (strongViolentThreatCount === 0 && abusiveMessages.length >= 3) {
      addContentRule(REASON_ABUSE, 50, "normal");
    }

    const isCritical = personalInfoCount >= 1 || strongViolentThreatCount >= 1;
    const matchedRules = reasons.length;
    const nonWeakContentRuleCount = Math.max(0, contentRuleCount - weakContentRuleCount);
    const botSensitivity = getDetectionSensitivityPreset("bot");
    const otherSensitivity = getDetectionSensitivityPreset("other");
    const hasReliableOtherSignal =
      score >= otherSensitivity.otherScoreThreshold &&
      (
        personalInfoCount >= 1 ||
        strongViolentThreatCount >= 1 ||
        moderateViolentThreatCount >= 2 ||
        abusiveMessages.length >= 3
      );
    const hasReliableBotSignal =
      strongContentRuleCount >= 1 ||
      nonWeakContentRuleCount >= 2 ||
      (nonWeakContentRuleCount >= 1 && tempoRuleCount >= 2);
    score = Math.min(100, score);
    return {
      suspicious: isCritical || hasReliableOtherSignal || (
        matchedRules >= botSensitivity.botRuleMatchThreshold &&
        score >= botSensitivity.botScoreThreshold &&
        hasReliableBotSignal &&
        !isBenignReactionOnlyRisk(reasons, sorted, rawByNormalizedText)
      ),
      reasons,
      score,
      matchedRules,
      critical: isCritical,
      evidenceTexts: collectRiskEvidence(sorted, counts, reasons, violentThreatAnalyses, rawByNormalizedText)
    };
  }

  function createEmptyRiskResult() {
    return {
      suspicious: false,
      reasons: [],
      score: 0,
      matchedRules: 0,
      critical: false,
      evidenceTexts: []
    };
  }

  function collectRiskEvidence(messages, counts, reasons, violentThreatAnalyses = [], rawByNormalizedText = new Map()) {
    const evidence = [];
    const addEvidence = (label, text) => {
      const clean = cleanText(text);
      if (!clean) return;
      const snippet = `${label}: ${clean.slice(0, 96)}`;
      if (evidence.includes(snippet)) return;
      evidence.push(snippet);
    };

    if (reasons.includes(REASON_THREAT)) {
      const threat = violentThreatAnalyses
        .slice()
        .filter((entry) => entry.analysis.severe || entry.analysis.score >= 5)
        .sort((a, b) => b.analysis.score - a.analysis.score)[0]?.message;
      if (threat) addEvidence("危害", threat.rawText);
    }

    if (reasons.includes(REASON_ABUSE)) {
      const abuse = messages.find((message) => analyzeAbusiveMessage(message.rawText));
      if (abuse) addEvidence("暴言", abuse.rawText);
    }

    if (reasons.includes("個人情報らしき投稿")) {
      const personalInfo = messages.find((message) => looksLikePersonalInfoPost(message.rawText));
      if (personalInfo) addEvidence("個人情報", personalInfo.rawText);
    }

    if (reasons.includes("単一コメント内の大量反復") || reasons.includes("コメント内の反復が多い")) {
      const repeated = messages.find((message) => analyzeInternalRepetition(message.rawText).strong || analyzeInternalRepetition(message.rawText).moderate);
      if (repeated) addEvidence("反復", repeated.rawText);
    }

    if (reasons.includes("同一コメントを3回以上")) {
      const duplicated = [...counts.entries()].find(([text, count]) => {
        return count >= 3 && isRepeatedTextRiskSignal(rawByNormalizedText.get(text) || text, text, count);
      })?.[0];
      if (duplicated) {
        const message = messages.find((entry) => entry.text === duplicated);
        if (message) addEvidence("同一文", message.rawText);
      }
    }

    if (reasons.includes(REASON_LOW_INFO_REPEAT)) {
      const duplicated = [...counts.entries()].find(([text, count]) => {
        return count >= 6 && isLowInformationRiskText(rawByNormalizedText.get(text) || text, text);
      })?.[0];
      if (duplicated) {
        const message = messages.find((entry) => entry.text === duplicated);
        if (message) addEvidence("低情報", message.rawText);
      }
    }

    if (reasons.includes("同一長文コメントを2回以上")) {
      const duplicated = [...counts.entries()].find(([text, count]) => count >= 2 && text.length >= 24)?.[0];
      if (duplicated) {
        const message = messages.find((entry) => entry.text === duplicated);
        if (message) addEvidence("長文重複", message.rawText);
      }
    }

    if (reasons.includes("長文/語句の大量反復")) {
      const massRepeated = messages.find((message) => hasMassRepeatedText(message.rawText));
      if (massRepeated) addEvidence("大量反復", massRepeated.rawText);
    }

    if (reasons.includes("絵文字/スタンプ大量")) {
      const emoteSpam = messages.find((message) => isEmoteSpamText(message.rawText));
      if (emoteSpam) addEvidence("絵文字/スタンプ", emoteSpam.rawText);
    }

    if (reasons.includes("URL風コメントが多い")) {
      const urlLike = messages.find((message) => /https?:\/\/|www\.|\.com\b|\.net\b|\.org\b/i.test(message.text));
      if (urlLike) addEvidence("URL", urlLike.rawText);
    }

    if (reasons.includes(REASON_RAPID_SPAM)) {
      const rapid = messages[0];
      if (rapid) addEvidence("連投", rapid.rawText);
    }

    return evidence.slice(0, 3);
  }

  function dedupeRiskMessages(messages) {
    const deduped = [];

    for (const message of [...messages].sort((a, b) => a.timestamp - b.timestamp)) {
      const nearDuplicate = deduped.some((existing) => {
        const sameText = existing.text === message.text;
        const sameBatch = Math.abs(existing.timestamp - message.timestamp) <= 1000;
        const apiInvolved = existing.source === "api" || message.source === "api";
        const sameRealtimeOrDomPost = isRealtimeOrDomSource(existing.source) &&
          isRealtimeOrDomSource(message.source) &&
          !hasDistinctRealMessageIds(existing, message);
        return sameText && sameBatch && (apiInvolved || sameRealtimeOrDomPost);
      });

      if (!nearDuplicate) deduped.push(message);
    }

    return deduped;
  }

  function hasDistinctRealMessageIds(left, right) {
    const leftId = normalizeMessageId(left?.id || left?.messageId || "");
    const rightId = normalizeMessageId(right?.id || right?.messageId || "");
    return hasStrongMessageId(leftId) &&
      hasStrongMessageId(rightId) &&
      leftId !== rightId;
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

  function analyzeViolentThreatMessage(text) {
    const value = cleanText(text);
    if (!value) {
      return {
        score: 0,
        severe: false
      };
    }

    const directThreatPattern = /ぶっ殺(?:す|して)|殺してやる|殺してやんよ|殺すぞ|刺してやる|刺すぞ|燃やしてやる|燃やすぞ|爆破(?:する|して)|舌噛み切れ|首(?:吊れ|くくれ)|kill\s+you|i[' ]?ll\s+kill|stab\s+you|shoot\s+you/i;
    const violentVerbPattern = /殺す|殺害|刺す|刺しに|ぶっ殺|ころす|56す|危害|襲う|放火|爆破|kill|murder|stab|shoot/i;
    const targetPattern = /お前|おまえ|てめ[ぇえ]|貴様|きさま|こいつ|あいつ|お前ら|こいつら|あいつら|お前に|お前を|こいつに|こいつを|@[\w.-]+/i;
    const intentPattern = /してやる|してやんよ|するぞ|してしまう|させる|しろ|こい|やれ|噛み切れ|kill you|stab you|shoot you/i;
    const selfIntentPattern = /(俺|おれ|僕|ぼく|私|わたし).{0,8}(が|は).{0,10}(殺す|刺す|燃やす|爆破|危害を加える)/i;
    const reportPattern = /って言ってた|と言ってた|っていってた|って書いてあった|って書いてた|って話|らしい|みたい|という|とのこと|ニュース|報道|記事|事件|冗談|ネタ|例え|たとえば|例えば|発言|コメント|切り抜き|配信で/i;
    const topicPattern = /殺害予告|危害予告|危害加える|危害を加える|暴力団|通報|逮捕|ニュース/i;
    const rhetoricalQuestionPattern = /(?:殺す|死なせる|刺す|燃やす|壊す)気か[?？]*$/i;
    const figurativePattern = /殺気|殺到|必殺|死ぬほど|やばすぎて死ぬ|焦げるぞ|全部入れる|足りないぞ/i;
    const unquotedValue = removeQuotedSegments(value);
    if (
      isQuotedOrReportedSpeech(value) &&
      (
        !unquotedValue ||
        (
          !directThreatPattern.test(unquotedValue) &&
          !violentVerbPattern.test(unquotedValue) &&
          !selfIntentPattern.test(unquotedValue)
        )
      )
    ) {
      return {
        score: 0,
        severe: false
      };
    }

    const hasViolentCore = directThreatPattern.test(value) ||
      violentVerbPattern.test(value) ||
      selfIntentPattern.test(value);

    if (!hasViolentCore) {
      return {
        score: 0,
        severe: false
      };
    }

    let score = 0;
    if (directThreatPattern.test(value)) score += 4;
    if (violentVerbPattern.test(value)) score += 3;
    if (targetPattern.test(value)) score += 2;
    if (intentPattern.test(value)) score += 2;
    if (selfIntentPattern.test(value)) score += 2;
    if (value.length <= 40) score += 1;
    if (reportPattern.test(value)) score -= 4;
    if (topicPattern.test(value) && !directThreatPattern.test(value)) score -= 3;
    if (rhetoricalQuestionPattern.test(value)) score -= 4;
    if (figurativePattern.test(value)) score -= 3;

    const severe = score >= 7 &&
      directThreatPattern.test(value) &&
      !rhetoricalQuestionPattern.test(value) &&
      (targetPattern.test(value) || intentPattern.test(value) || selfIntentPattern.test(value));
    return {
      score: Math.max(0, score),
      severe
    };
  }

  function analyzeAbusiveMessage(text) {
    const value = cleanText(text);
    if (!value) return false;
    const directValue = removeQuotedSegments(value);
    if (/殺すぞ|刺すぞ|燃やすぞ|爆破|舌噛み切れ|首(?:吊れ|くくれ)/.test(directValue)) return false;
    if (isQuotedOrReportedSpeech(value) && !hasDirectAbusiveText(directValue)) return false;
    if (hasDirectAbusiveText(directValue)) return true;

    const lightInsultPattern = /カス|ボケ|ゴミ|クズ|きもい|キモい/i;
    const targetPattern = /お前|おまえ|てめ[ぇえ]|貴様|きさま|こいつ|あいつ|お前ら|こいつら|あいつら|配信者|主|@[\w.-]+/i;
    return lightInsultPattern.test(directValue) && targetPattern.test(directValue);
  }

  function hasDirectAbusiveText(text) {
    return /死ね|しね|消えろ|黙れ|うせろ|失せろ/.test(cleanText(text));
  }

  function isQuotedOrReportedSpeech(text) {
    const value = cleanText(text);
    if (!value) return false;
    return /[「『][^」』]{1,100}[」』]/.test(value) ||
      /って言ってた|と言ってた|っていってた|って書いてあった|って書いてた|って話|という|とのこと|ニュース|報道|記事|事件|引用|例え|たとえば|例えば|発言|コメント|切り抜き|配信で/i.test(value);
  }

  function removeQuotedSegments(text) {
    return cleanText(text)
      .replace(/[「『][^」』]{1,100}[」』]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isLowInformationRiskText(rawText, normalizedText = "") {
    const raw = cleanText(rawText);
    const normalized = cleanText(normalizedText || normalizeMessageForRisk(raw));
    if (!raw) return true;
    if (normalized.length <= 2) return true;
    if (isMostlyEmoteText(raw)) return true;
    const lexical = raw
      .replace(/\[emote:[^\]]+\]/gi, "")
      .replace(/:[A-Za-z0-9_.-]{2,32}:/g, "")
      .replace(/\p{Extended_Pictographic}+/gu, "")
      .replace(/[!?！？。、,.…~ーｰｗw\s]/g, "");
    if (lexical.length <= 2) return true;
    return /^(w|ｗ|草|あ|お|え|う|ん|はい|いいね|笑)+$/i.test(raw.replace(/\s+/g, ""));
  }

  function isBenignReactionText(rawText, normalizedText = "") {
    const raw = cleanText(rawText);
    const normalized = cleanText(normalizedText || normalizeMessageForRisk(raw));
    if (!raw || !normalized) return false;
    if (hasRiskyLanguage(raw) || /https?:\/\/|www\.|\.com\b|\.net\b|\.org\b/i.test(raw)) return false;
    if (hasMassRepeatedText(raw) || analyzeInternalRepetition(raw).strong) return false;

    const lexical = raw
      .replace(/\[emote:[^\]]+\]/gi, "")
      .replace(/:[A-Za-z0-9_.-]{2,32}:/g, "")
      .replace(/\p{Extended_Pictographic}+/gu, "")
      .replace(/[!?！？。、,.…~ーｰｗw\s]/g, "");
    if (lexical.length <= 8 && countEmoteLikeTokens(raw) <= 6) return true;
    return /(?:ナイス|nice|おめ|おめでとう|かわいい|可愛い|いいね|きちゃ|きた|まな|素敵|最高|草|www|ｗｗｗ|サブスク)/i.test(raw) &&
      lexical.length <= 18 &&
      countEmoteLikeTokens(raw) <= 8;
  }

  function hasRiskyLanguage(text) {
    return looksLikePersonalInfoPost(text) ||
      analyzeViolentThreatMessage(text).score >= 5 ||
      analyzeAbusiveMessage(text);
  }

  function isRepeatedTextRiskSignal(rawText, normalizedText, count) {
    const raw = cleanText(rawText);
    const normalized = cleanText(normalizedText || normalizeMessageForRisk(raw));
    if (!raw || isLowInformationRiskText(raw, normalized) || isBenignReactionText(raw, normalized)) return false;
    if (count >= 5) return true;
    if (raw.length >= 28) return true;
    if (hasRiskyLanguage(raw)) return true;
    if (hasMassRepeatedText(raw) || analyzeInternalRepetition(raw).moderate || analyzeInternalRepetition(raw).strong) return true;
    return false;
  }

  function isStrongRepeatedTextRiskSignal(rawText, normalizedText = "") {
    const raw = cleanText(rawText);
    const normalized = cleanText(normalizedText || normalizeMessageForRisk(raw));
    if (!raw || !normalized) return false;
    if (isLowInformationRiskText(raw, normalized) || isBenignReactionText(raw, normalized)) return false;
    if (hasRiskyLanguage(raw)) return true;
    if (hasMassRepeatedText(raw) || analyzeInternalRepetition(raw).moderate || analyzeInternalRepetition(raw).strong) return true;
    return raw.length >= 18 || normalized.length >= 12;
  }

  function isMeaningfulTempoRiskMessage(rawText, normalizedText = "") {
    const raw = cleanText(rawText);
    const normalized = cleanText(normalizedText || normalizeMessageForRisk(raw));
    if (!raw || !normalized) return false;
    if (hasRiskyLanguage(raw)) return true;
    if (isHighVolumeEmoteSpam(raw)) return true;
    if (isMostlyEmoteText(raw) || isLowInformationRiskText(raw, normalized) || isBenignReactionText(raw, normalized)) return false;
    return normalized.length >= 8 || hasMassRepeatedText(raw) || analyzeInternalRepetition(raw).moderate;
  }

  function isMeaningfulContentRiskMessage(rawText, normalizedText = "") {
    const raw = cleanText(rawText);
    const normalized = cleanText(normalizedText || normalizeMessageForRisk(raw));
    if (!raw || !normalized) return false;
    if (hasRiskyLanguage(raw)) return true;
    if (isHighVolumeEmoteSpam(raw)) return true;
    if (isMostlyEmoteText(raw) || isLowInformationRiskText(raw, normalized) || isBenignReactionText(raw, normalized)) return false;
    return normalized.length >= 10 || countEmoteLikeTokens(raw) >= EMOTE_SPAM_STRONG_COUNT;
  }

  function isBenignReactionOnlyRisk(reasons, messages, rawByNormalizedText) {
    const values = Array.isArray(reasons) ? reasons : [];
    const onlyRepeatOrTempo = values.every((reason) => {
      return reason === "同一コメントを3回以上" ||
        reason === "同一長文コメントを2回以上" ||
        /^(\d+秒以内|平均投稿間隔)/.test(reason);
    });
    if (!onlyRepeatOrTempo) return false;

    return messages.every((message) => {
      const raw = rawByNormalizedText.get(message.text) || message.rawText;
      if (isHighVolumeEmoteSpam(raw)) return false;
      return isLowInformationRiskText(raw, message.text) || isBenignReactionText(raw, message.text);
    });
  }

  function isHighVolumeEmoteSpam(text) {
    const tokenCount = countEmoteLikeTokens(text);
    return tokenCount >= EMOTE_SPAM_MIN_COUNT || (isMostlyEmoteText(text) && tokenCount >= 10);
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
    if (isMostlyEmoteText(text) && countEmoteLikeTokens(text) >= 6) {
      return {
        moderate: false,
        strong: false,
        ratio: 0,
        maxOccurrences: 1
      };
    }

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

  function isMostlyEmoteText(text) {
    const value = String(text || "");
    const compact = cleanText(value).replace(/\s+/g, "");
    if (!compact) return false;

    const lexical = compact
      .replace(/\[emote:[^\]]+\]/gi, "")
      .replace(/:[A-Za-z0-9_.-]{2,32}:/g, "")
      .replace(/\p{Extended_Pictographic}+/gu, "");

    return lexical.length <= 4 && countEmoteLikeTokens(value) >= 4;
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
    hidePopover(true);
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
      setElementPosition(card.element, card.position.left, card.position.top, key, { mode: "viewport" });
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

    if (target.closest(".kch-popover__watch")) {
      event.preventDefault();
      toggleWatchlistUser(activeUsername);
      return;
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
        reevaluateSuspiciousUsersFromHistory();
        updateCompactDashboard();
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
    let changed = false;
    for (const [key, user] of suspiciousUsers.entries()) {
      const existingReasons = normalizeDetectionReasons(user?.reasons || []);
      const listedReasons = existingReasons.filter((reason) => reason === "ウォッチリスト" || reason === "配信者リスト");
      if (!listedReasons.length) continue;

      const nextListedReasons = [];
      if (isWatchlistedUser(key)) nextListedReasons.push("ウォッチリスト");
      if (isBroadcasterListedUser(key)) nextListedReasons.push("配信者リスト");

      if (listedReasons.join("\u0000") === nextListedReasons.join("\u0000")) continue;

      const remainingReasons = existingReasons.filter((reason) => reason !== "ウォッチリスト" && reason !== "配信者リスト");
      const nextReasons = [...remainingReasons, ...nextListedReasons];
      if (!nextReasons.length) {
        suspiciousUsers.delete(key);
      } else {
        suspiciousUsers.set(key, {
          ...user,
          detectionCategory: getDetectionCategory(nextReasons),
          reasons: nextReasons,
          lastDetectedAt: Date.now()
        });
      }
      changed = true;
    }

    if (getAlertAction() === "off") {
      if (changed) sendSuspiciousUsersReport();
      return;
    }
    if (!userSettings.watchlistEnabled && !userSettings.broadcasterListEnabled) {
      if (changed) sendSuspiciousUsersReport();
      return;
    }

    const listedKeys = canonicalUserIndex.keys();
    for (const key of listedKeys) {
      const messages = getDetectionMessagesForUser(key);
      const displayName = getDisplayNameForUser(key);
      if (!displayName || !messages.length) continue;
      if (isIgnoredUser(key)) continue;

      const reasons = [];
      if (isWatchlistedUser(key)) reasons.push("ウォッチリスト");
      if (isBroadcasterListedUser(key)) reasons.push("配信者リスト");
      if (!reasons.length) continue;

      const before = suspiciousUsers.get(key);
      rememberDetectedUser(key, displayName, reasons, messages);
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

  function reevaluateSuspiciousUsersFromHistory() {
    if (getAlertAction() === "off") return;
    if (userSettings.botDetectionEnabled === false) return;

    let changed = false;
    for (const [key, user] of suspiciousUsers.entries()) {
      if (isIgnoredUser(key)) {
        suspiciousUsers.delete(key);
        changed = true;
      }
    }

    const suspiciousKeys = canonicalUserIndex.keys();
    for (const key of suspiciousKeys) {
      const messages = getDetectionMessagesForUser(key);
      const displayName = getDisplayNameForUser(key);
      if (!displayName || messages.length < 2) continue;
      if (isIgnoredUser(key)) continue;

      const risk = assessAccountRisk(messages);
      if (!risk.suspicious) {
        continue;
      }

      const before = suspiciousUsers.get(key);
      rememberDetectedUser(key, displayName, risk.reasons, messages, {
        riskScore: risk.score,
        riskRuleCount: risk.matchedRules,
        riskCritical: risk.critical,
        evidenceTexts: risk.evidenceTexts
      });
      const after = suspiciousUsers.get(key);
      if (!before || !after) {
        changed = true;
        continue;
      }

      if (
        before.lastDetectedAt !== after.lastDetectedAt ||
        before.riskScore !== after.riskScore ||
        before.riskRuleCount !== after.riskRuleCount ||
        (before.reasons || []).join("\u0000") !== (after.reasons || []).join("\u0000")
      ) {
        changed = true;
      }
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
    const payload = {
      __meta: createStorageMeta(),
      __canonicalStore: serializeCanonicalStore(),
      users: serializeCompatibilityUserHistory()
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (_error) {
      // Storage can be unavailable in restricted frames. In that case, keep in-memory history only.
    }
  }

  function createStorageMeta() {
    return {
      version: 5,
      channelSlug: activeChannelSlug || streamContext?.slug || getChannelSlug(),
      streamKey: getCurrentStreamKey(),
      updatedAt: Date.now(),
      startedAt: Number(streamContext?.startedAt) || 0,
      startedAtIso: streamContext?.startedAtIso || "",
      isLive: Boolean(streamContext?.isLive),
      isLiveKnown: Boolean(streamContext?.isLiveKnown)
    };
  }

  function loadHistory() {
    let payload = {};
    try {
      payload = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    } catch (_error) {
      payload = {};
    }

    const userEntries = payload?.users && typeof payload.users === "object"
      ? Object.entries(payload.users)
      : Object.entries(payload).filter(([key]) => !key.startsWith("__"));

    for (const [key, value] of userEntries) {
      if (!value?.displayName || !Array.isArray(value.messages)) continue;
      const messages = value.messages
        .filter((message) => message?.text && message?.timestamp)
        .filter((message) => {
          const postedAt = sanitizeTimestamp(message?.postedAt ?? message?.timestamp, 0);
          return !streamContext?.startedAt || postedAt >= streamContext.startedAt;
        })
        .map((message) => {
          const source = message.source || (message.id ? "api" : "dom");
          const postedAt = sanitizeTimestamp(message.postedAt ?? message.timestamp, Date.now());
          const receivedAt = Math.max(postedAt, sanitizeTimestamp(message.receivedAt, postedAt));
          const latencyMsRaw = Number(message.latencyMs);
          const latencyMs = Number.isFinite(latencyMsRaw) && latencyMsRaw >= 0
            ? latencyMsRaw
            : (isRealtimeOrDomSource(source) ? Math.max(0, receivedAt - postedAt) : 0);
          return {
            ...message,
            source,
            timestamp: postedAt,
            postedAt,
            receivedAt,
            timestampConfidence: message.timestampConfidence === "fallback" ? "fallback" : "explicit",
            latencyMs,
            isDelayed: Boolean(message.isDelayed) || (isRealtimeOrDomSource(source) && latencyMs > REALTIME_RECEIVE_DELAY_MS),
            timestampKind: message.timestampKind || inferTimestampKindFromSource(source, Boolean(message.correctedTimestamp)),
            correctedTimestamp: Boolean(message.correctedTimestamp)
          };
        });
      const allowNumericOnly = messages.some((message) => message.source === "api" || isTrustedNumericMessageSource(message.source));
      if (!looksLikeUsernameToken(value.displayName, { allowNumericOnly })) continue;

      userHistory.set(key, {
        displayName: value.displayName,
        messages
      });
    }
    pruneUserHistoryMessages();
    const restoredCanonical = restoreCanonicalStore(payload);
    if (!restoredCanonical) {
      rebuildCanonicalStoreFromUserHistory();
    } else {
      rebuildCompatibilityUserHistoryFromCanonicalStore();
    }
    clearStreamMessageCache();
  }

  function clearSavedHistory() {
    removeStoredHistoryPair(storageKey);
  }

  function isChannelStorageReady(key = storageKey) {
    const value = String(key || "");
    return Boolean(value) && !value.endsWith(":route-pending");
  }

  function getSuspiciousStorageKey(key = storageKey) {
    return `${String(key || BASE_STORAGE_KEY)}${SUSPICIOUS_STORAGE_SUFFIX}`;
  }

  function getCurrentStreamKey() {
    return streamContext?.livestreamId || streamContext?.startedAtIso || "current";
  }

  function cleanupStoredHistoryCaches() {
    cleanupExpiredStoredHistoryCaches();
    cleanupEndedCurrentHistoryCache();
  }

  function cleanupExpiredStoredHistoryCaches() {
    const prefix = `kch:${location.hostname}:`;
    const now = Date.now();
    const keys = getLocalStorageKeys()
      .filter((key) => key.startsWith(prefix))
      .filter((key) => !key.endsWith(SUSPICIOUS_STORAGE_SUFFIX))
      .filter((key) => key.includes(":stream:"));

    for (const key of keys) {
      const updatedAt = getStoredHistoryUpdatedAt(key);
      if (!updatedAt || now - updatedAt <= STORED_STREAM_CACHE_TTL_MS) continue;
      removeStoredHistoryPair(key);
    }
  }

  function cleanupEndedCurrentHistoryCache() {
    if (!streamContext?.isLiveKnown || streamContext.isLive) return;
    if (!isChannelStorageReady()) return;
    removeStoredHistoryPair(storageKey);
  }

  function getLocalStorageKeys() {
    try {
      return Array.from({ length: window.localStorage.length }, (_value, index) => window.localStorage.key(index))
        .filter(Boolean);
    } catch (_error) {
      return [];
    }
  }

  function getStoredHistoryUpdatedAt(key) {
    try {
      const history = JSON.parse(window.localStorage.getItem(key) || "{}");
      const suspicious = JSON.parse(window.localStorage.getItem(getSuspiciousStorageKey(key)) || "{}");
      return Math.max(
        Number(history?.__meta?.updatedAt) || 0,
        Number(suspicious?.updatedAt) || 0
      );
    } catch (_error) {
      return 0;
    }
  }

  function removeStoredHistoryPair(key) {
    try {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(getSuspiciousStorageKey(key));
    } catch (_error) {
      // Storage can be unavailable in restricted frames.
    }
  }

  function saveSuspiciousUsers() {
    if (!isChannelStorageReady()) return;
    try {
      const payload = {
        channelSlug: activeChannelSlug || streamContext?.slug || getChannelSlug(),
        pageUrl: location.href,
        updatedAt: Date.now(),
        users: getSuspiciousUserList()
      };
      window.localStorage.setItem(getSuspiciousStorageKey(), JSON.stringify(payload));
    } catch (_error) {
      // Storage can be unavailable in restricted frames.
    }
  }

  function loadSuspiciousUsers() {
    suspiciousUsers.clear();
    if (!isChannelStorageReady()) return;

    let payload = {};
    try {
      payload = JSON.parse(window.localStorage.getItem(getSuspiciousStorageKey()) || "{}");
    } catch (_error) {
      payload = {};
    }

    const users = Array.isArray(payload?.users) ? payload.users : [];
    for (const user of users) {
      const username = cleanText(user?.username || "").replace(/^@/, "");
      if (!looksLikeUsernameToken(username, { allowNumericOnly: true })) continue;
      const key = normalizeUsername(username);
      if (!key) continue;
      suspiciousUsers.set(key, {
        username,
        profileUrl: getKickProfileUrl(username),
        avatarUrl: isHttpUrl(user?.avatarUrl) ? String(user.avatarUrl) : "",
        detectionCategory: String(user?.detectionCategory || ""),
        reasons: normalizeDetectionReasons(user?.reasons).slice(0, 8),
        riskScore: Math.max(0, Math.min(100, Number(user?.riskScore) || 0)),
        riskRuleCount: Math.max(0, Number(user?.riskRuleCount) || 0),
        riskCritical: Boolean(user?.riskCritical),
        evidenceTexts: normalizeEvidenceTexts(user?.evidenceTexts),
        firstDetectedAt: Number(user?.firstDetectedAt) || Date.now(),
        lastDetectedAt: Number(user?.lastDetectedAt) || Date.now(),
        detectedMessageId: normalizeMessageId(user?.detectedMessageId || ""),
        detectedMessageKey: cleanText(user?.detectedMessageKey || ""),
        detectedMessageAt: Number(user?.detectedMessageAt) || 0,
        detectedMessageText: String(user?.detectedMessageText || "").slice(0, 180)
      });
    }
  }

  async function resetForChannelChange(nextSlug) {
    routeResetInProgress = true;
    sessionEnteredAt = Date.now();
    initialApiBackfillDone = false;
    initialApiBackfillRunning = false;
    saveHistory();
    saveSuspiciousUsers();
    clearTimeout(saveTimer);
    clearTimeout(hideTimer);
    clearTimeout(ingestionStatusTimer);
    clearTimeout(followedChannelsSyncTimer);
    followedChannelsSyncTimer = 0;
    followedChannelsSyncRunning = false;
    lastFollowedChannelsSyncAt = 0;

    hidePopover();
    closeAllPinnedCards();
    userHistory.clear();
    clearCanonicalStore();
    clearStreamMessageCache();
    apiWindowCache.clear();
    userBackfillState.clear();
    coordinatedSpamBuckets.clear();
    lastUserAnchors.clear();
    suspiciousEvalAt.clear();
    autoPinnedUsers.clear();
    autoPinDismissedUsers.clear();
    notifiedUsers.clear();
    suspiciousUsers.clear();
    clearTimeout(suspiciousReportTimer);
    suspiciousReportTimer = 0;
    resetDiagnostics();
    sendSuspiciousUsersReset();
    realtimeTimestampTrustReadyAt = Date.now() + REALTIME_TIMESTAMP_TRUST_DELAY_MS;
    streamContext = null;
    activeChannelSlug = nextSlug;
    storageKey = `kch:${location.hostname}:${nextSlug}:route-pending`;
    nextPinnedZIndex = PINNED_Z_INDEX_BASE;

    try {
      await initializeStreamContext();
      cleanupStoredHistoryCaches();
      loadHistory();
      loadSuspiciousUsers();
      reevaluateSuspiciousUsersFromHistory();
      sendSuspiciousUsersReport();
      await runInitialApiBackfillOnce();
      scheduleDomFallbackScan();
      scheduleFollowedChannelsSync(1500);
    } finally {
      routeResetInProgress = false;
    }
  }

  async function initializeStreamContext() {
    const slug = getChannelSlug();
    apiDebug.contextAttempts += 1;
    apiDebug.lastError = "";
    if (!slug) {
      apiDebug.lastSkippedReason = t("noChannel");
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
      const liveValue = livestream?.is_live ?? channel.is_live;
      const normalizedLiveValue = String(liveValue).trim().toLowerCase();
      const isLiveKnown = liveValue !== undefined && liveValue !== null && normalizedLiveValue !== "";
      const isLive = liveValue === true ||
        liveValue === 1 ||
        normalizedLiveValue === "1" ||
        normalizedLiveValue === "true";

      streamContext = {
        slug,
        channelId: channel.id || livestream?.channel_id || null,
        livestreamId: livestream?.id || null,
        startedAt,
        startedAtIso: startedAt ? new Date(startedAt).toISOString() : "",
        isLive,
        isLiveKnown
      };
      activeChannelSlug = slug;
      apiDebug.lastError = "";
      apiDebug.lastSkippedReason = "";

      const streamKey = getCurrentStreamKey();
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

  function shouldTrustRealtimeTimestamp(rowCount) {
    if (rowCount < 1 || rowCount > REALTIME_TIMESTAMP_MAX_ROWS) return false;
    if (Date.now() < realtimeTimestampTrustReadyAt) return false;
    if (document.visibilityState === "hidden") return false;
    if (isChatPaused()) return false;
    return true;
  }

  async function updatePinnedRealtimeHistoryState(username) {
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
        reason: t("realtimeWaiting"),
        lastAttemptAt: state.lastAttemptAt || 0
      });
      refreshActivePopover(key);
      return;
    }

    const state = userBackfillState.get(key) || {};
    userBackfillState.set(key, {
      loading: false,
      failed: false,
      done: true,
      reason: "",
      lastAttemptAt: state.lastAttemptAt || 0,
      baselineTimestamp: realtimeBaseline
    });
    refreshActivePopover(key);
  }

  function getUserRealtimeBaselineTimestamp(key) {
    const messages = getDetectionMessagesForUser(key);
    const postedNonApi = messages
      .filter((message) => message?.source !== "api")
      .filter((message) => getMessageTimestampKind(message) === "posted")
      .map((message) => Number(message.timestamp) || 0)
      .filter((timestamp) => timestamp > 0);
    if (!postedNonApi.length) return 0;
    return Math.min(...postedNonApi);
  }

  async function runInitialApiBackfillOnce() {
    if (initialApiBackfillDone || initialApiBackfillRunning) return;
    initialApiBackfillRunning = true;

    try {
      if (!streamContext?.channelId || !streamContext?.startedAt) {
        await initializeStreamContext();
      }

      if (!streamContext?.channelId || !streamContext?.startedAt) {
        apiDebug.lastSkippedReason = t("initialNoContext");
        return;
      }

      const beforeTimestamp = sessionEnteredAt;
      const fromTimestamp = Math.max(
        streamContext.startedAt,
        beforeTimestamp - (INITIAL_API_LOOKBACK_MINUTES * API_WINDOW_MS)
      );
      const toTimestamp = beforeTimestamp - 1000;
      if (toTimestamp <= fromTimestamp) {
        initialApiBackfillDone = true;
        return;
      }

      apiDebug.lastInitialRange = `${new Date(fromTimestamp).toISOString()}..${new Date(toTimestamp).toISOString()}`;
      apiDebug.lastInitialWindowCount = 0;
      apiDebug.lastInitialOldestAt = "";
      apiDebug.lastInitialReachedTarget = false;

      await fetchInitialApiBackfillPages(fromTimestamp, beforeTimestamp);

      initialApiBackfillDone = true;
      apiDebug.lastSkippedReason = "";
      refreshAllPopovers();
    } catch (_error) {
      apiDebug.lastSkippedReason = t("initialApiError");
    } finally {
      initialApiBackfillRunning = false;
    }
  }

  async function fetchInitialApiBackfillPages(fromTimestamp, beforeTimestamp) {
    let cursor = "";
    let pageCount = 0;
    let reachedTarget = false;
    let oldestTimestamp = 0;
    const seenCursors = new Set();

    while (pageCount < INITIAL_API_BACKFILL_MAX_PAGES) {
      const page = await fetchChatMessagePage(cursor, {
        afterTimestamp: fromTimestamp,
        beforeTimestamp,
        force: true
      });
      pageCount += 1;

      for (const message of page.messages || []) {
        const timestamp = getApiMessageTimestamp(message);
        if (!timestamp) continue;
        if (!oldestTimestamp || timestamp < oldestTimestamp) {
          oldestTimestamp = timestamp;
        }
        if (timestamp <= fromTimestamp) {
          reachedTarget = true;
        }
      }

      const nextCursor = cleanText(page.cursor);
      apiDebug.lastInitialWindowCount = pageCount;
      apiDebug.lastInitialOldestAt = oldestTimestamp ? new Date(oldestTimestamp).toISOString() : "";
      apiDebug.lastInitialReachedTarget = reachedTarget;

      if (reachedTarget || !nextCursor || seenCursors.has(nextCursor)) break;
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
  }

  function getInitialApiBackfillWindows(fromTimestamp, toTimestamp) {
    const startWindow = Math.floor(fromTimestamp / API_WINDOW_MS) * API_WINDOW_MS;
    const endWindow = Math.floor(toTimestamp / API_WINDOW_MS) * API_WINDOW_MS;
    if (endWindow < startWindow) return [];

    const windowCount = Math.min(
      INITIAL_API_BACKFILL_MAX_WINDOWS,
      Math.floor((endWindow - startWindow) / API_WINDOW_MS) + 1
    );
    if (windowCount <= 1) return [endWindow];

    const step = Math.max(
      API_WINDOW_MS,
      Math.floor((endWindow - startWindow) / (windowCount - 1) / API_WINDOW_MS) * API_WINDOW_MS
    );
    const windows = new Set([endWindow, startWindow]);

    for (let index = 1; index < windowCount - 1; index += 1) {
      const candidate = Math.floor((endWindow - (step * index)) / API_WINDOW_MS) * API_WINDOW_MS;
      if (candidate >= startWindow && candidate <= endWindow) {
        windows.add(candidate);
      }
    }

    return [...windows].sort((a, b) => b - a);
  }

  async function diagnoseHistoryApi(options = {}) {
    if (!streamContext?.channelId || !streamContext?.startedAt) {
      await initializeStreamContext();
    }

    const beforeTimestamp = Number(options.beforeTimestamp) > 0 ? Number(options.beforeTimestamp) : sessionEnteredAt;
    const afterTimestamp = Math.max(
      streamContext?.startedAt || 0,
      beforeTimestamp - (INITIAL_API_LOOKBACK_MINUTES * API_WINDOW_MS)
    );
    const startedAt = Date.now();
    const cursorResult = await diagnoseCursorHistoryApi({
      afterTimestamp,
      beforeTimestamp,
      maxPages: Number(options.maxPages) > 0 ? Number(options.maxPages) : HISTORY_API_DIAGNOSTIC_MAX_PAGES
    });
    const sampledWindows = getInitialApiBackfillWindows(afterTimestamp, beforeTimestamp - 1000);

    return {
      channelId: streamContext?.channelId || null,
      channelSlug: streamContext?.slug || activeChannelSlug || getChannelSlug(),
      range: {
        after: afterTimestamp ? new Date(afterTimestamp).toISOString() : "",
        before: beforeTimestamp ? new Date(beforeTimestamp).toISOString() : ""
      },
      currentStartTimeSample: {
        windowCount: sampledWindows.length,
        windows: sampledWindows.map((value) => new Date(value).toISOString())
      },
      cursor: cursorResult,
      elapsedMs: Date.now() - startedAt
    };
  }

  async function diagnoseCursorHistoryApi(options = {}) {
    let cursor = "";
    let pageCount = 0;
    let reachedTarget = false;
    let oldestTimestamp = 0;
    let newestTimestamp = 0;
    let totalMessages = 0;
    const seenCursors = new Set();
    const pages = [];
    const maxPages = Math.max(1, Math.min(60, Number(options.maxPages) || HISTORY_API_DIAGNOSTIC_MAX_PAGES));

    while (pageCount < maxPages) {
      const page = await fetchChatMessagePage(cursor, {
        ...options,
        dryRun: true,
        force: true
      });
      pageCount += 1;

      let pageOldest = 0;
      let pageNewest = 0;
      for (const message of page.messages || []) {
        const timestamp = getApiMessageTimestamp(message);
        if (timestamp) {
          totalMessages += 1;
          if (!pageOldest || timestamp < pageOldest) pageOldest = timestamp;
          if (!pageNewest || timestamp > pageNewest) pageNewest = timestamp;
        }
        if (timestamp && (!oldestTimestamp || timestamp < oldestTimestamp)) {
          oldestTimestamp = timestamp;
        }
        if (timestamp && timestamp > newestTimestamp) {
          newestTimestamp = timestamp;
        }
        if (timestamp && Number(options.afterTimestamp) > 0 && timestamp <= Number(options.afterTimestamp)) {
          reachedTarget = true;
        }
      }

      const nextCursor = cleanText(page.cursor);
      pages.push({
        page: pageCount,
        count: (page.messages || []).length,
        cursor: nextCursor,
        firstAt: pageNewest ? new Date(pageNewest).toISOString() : "",
        lastAt: pageOldest ? new Date(pageOldest).toISOString() : "",
        firstId: page.messages?.[0] ? getApiMessageId(page.messages[0]) : "",
        lastId: page.messages?.at?.(-1) ? getApiMessageId(page.messages.at(-1)) : ""
      });

      if (reachedTarget || !nextCursor || seenCursors.has(nextCursor)) break;
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }

    return {
      pageCount,
      totalMessages,
      oldestAt: oldestTimestamp ? new Date(oldestTimestamp).toISOString() : "",
      newestAt: newestTimestamp ? new Date(newestTimestamp).toISOString() : "",
      reached60MinuteTarget: reachedTarget,
      pages
    };
  }

  async function fetchChatMessagePage(cursor = "", options = {}) {
    const normalizedCursor = cleanText(cursor);
    const cacheKey = `${streamContext.channelId}:cursor:${normalizedCursor || "latest"}`;
    const targetKeys = normalizeTargetKeySet(options.targetKeys || options.targetKey);
    const beforeTimestamp = Number(options.beforeTimestamp) > 0 ? Number(options.beforeTimestamp) : 0;
    const afterTimestamp = Number(options.afterTimestamp) > 0 ? Number(options.afterTimestamp) : 0;
    if (!options.force && apiWindowCache.has(cacheKey)) {
      const cachedPage = apiWindowCache.get(cacheKey) || {};
      const cachedMessages = Array.isArray(cachedPage) ? cachedPage : (cachedPage.messages || []);
      apiDebug.lastAcceptedMessageCount = rememberApiMessages(cachedMessages, targetKeys, {
        beforeTimestamp,
        afterTimestamp
      });
      return {
        messages: cachedMessages,
        cursor: Array.isArray(cachedPage) ? "" : cleanText(cachedPage.cursor)
      };
    }

    const query = normalizedCursor ? `?cursor=${encodeURIComponent(normalizedCursor)}` : "";
    const url = `${WEB_API_ORIGIN}/api/v1/chat/${encodeURIComponent(streamContext.channelId)}/history${query}`;
    apiDebug.attempts += 1;
    apiDebug.lastUrl = url;
    apiDebug.lastStartTime = normalizedCursor || "latest";
    apiDebug.lastError = "";
    const data = await fetchHistoryJson(url);
    apiDebug.lastResponseShape = describeApiResponseShape(data);
    const messages = extractApiMessages(data);
    const nextCursor = getApiMessageCursor(data);
    if (!options.dryRun) {
      apiWindowCache.set(cacheKey, {
        messages,
        cursor: nextCursor
      });
    }
    apiDebug.lastMessageCount = messages.length;
    apiDebug.lastAcceptedMessageCount = options.dryRun
      ? 0
      : rememberApiMessages(messages, targetKeys, {
        beforeTimestamp,
        afterTimestamp
      });
    return {
      messages,
      cursor: nextCursor
    };
  }

  async function fetchChatWindow(windowStart, options = {}) {
    const roundedStart = Math.floor(windowStart / API_WINDOW_MS) * API_WINDOW_MS;
    const cacheKey = `${streamContext.channelId}:start:${roundedStart}`;
    const targetKeys = normalizeTargetKeySet(options.targetKeys || options.targetKey);
    const beforeTimestamp = Number(options.beforeTimestamp) > 0 ? Number(options.beforeTimestamp) : 0;
    const afterTimestamp = Number(options.afterTimestamp) > 0 ? Number(options.afterTimestamp) : 0;
    if (!options.force && apiWindowCache.has(cacheKey)) {
      const cachedMessages = apiWindowCache.get(cacheKey) || [];
      apiDebug.lastAcceptedMessageCount = rememberApiMessages(cachedMessages, targetKeys, {
        beforeTimestamp,
        afterTimestamp
      });
      return cachedMessages;
    }

    const startTime = formatKickApiTime(roundedStart);
    const url = `${WEB_API_ORIGIN}/api/v1/chat/${encodeURIComponent(streamContext.channelId)}/history?start_time=${encodeURIComponent(startTime)}`;
    apiDebug.attempts += 1;
    apiDebug.lastUrl = url;
    apiDebug.lastStartTime = startTime;
    apiDebug.lastError = "";
    const data = await fetchHistoryJson(url);
    apiDebug.lastResponseShape = describeApiResponseShape(data);
    const messages = extractApiMessages(data);
    apiWindowCache.set(cacheKey, messages);
    apiDebug.lastMessageCount = messages.length;
    apiDebug.lastAcceptedMessageCount = rememberApiMessages(messages, targetKeys, {
      beforeTimestamp,
      afterTimestamp
    });
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
    const afterTimestamp = Number(options.afterTimestamp) > 0 ? Number(options.afterTimestamp) : 0;
    if (beforeTimestamp && timestamp >= beforeTimestamp - 1000) return false;
    if (afterTimestamp && timestamp < afterTimestamp) return false;
    const text = getApiMessageText(message);
    if (!username || !text || !timestamp) return false;
    const remembered = rememberMessage(username, text, timestamp, getApiMessageId(message), "api", "posted", {
      postedAt: timestamp,
      receivedAt: Date.now()
    });
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

  function getApiMessageCursor(data) {
    return cleanText(
      data?.data?.cursor ||
      data?.cursor ||
      data?.next_cursor ||
      data?.nextCursor ||
      data?.pagination?.cursor ||
      data?.pagination?.next_cursor ||
      data?.meta?.cursor ||
      data?.meta?.next_cursor ||
      ""
    );
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

  function scheduleDomFallbackScan(delay = WS_ACTIVE_GRACE_MS) {
    window.setTimeout(() => {
      if (shouldPreferRealtimeWsIngestion()) {
        noteSkipReason("initial_dom_scan_skipped:ws_active", 2000);
        return;
      }

      scanPage();
    }, Math.max(0, Number(delay) || 0));
  }

  installRouteChangeListeners();
  installSettingsListener();
  installRealtimeWsBridge();
  loadSettings().finally(() => initializeStreamContext()).finally(() => {
    cleanupStoredHistoryCaches();
    loadHistory();
    loadSuspiciousUsers();
    reevaluateSuspiciousUsersFromHistory();
    sendSuspiciousUsersReport();
  }).finally(() => {
    runInitialApiBackfillOnce().finally(() => {
      reevaluateListedUsersFromHistory();
      scheduleDomFallbackScan();
      scheduleFollowedChannelsSync(1500);
      scanInterval = window.setInterval(periodicRefresh, 2000);
    });
  });

  window.addEventListener("pagehide", () => {
    clearTimeout(saveTimer);
    clearTimeout(hideTimer);
    clearTimeout(followedChannelsSyncTimer);
    followedChannelsSyncTimer = 0;
    saveHistory();
    saveSuspiciousUsers();
    if (scanInterval) window.clearInterval(scanInterval);
    lastUserAnchors.clear();
    suspiciousUsers.clear();
    clearTimeout(suspiciousReportTimer);
    suspiciousReportTimer = 0;
    sendSuspiciousUsersReset();
    window.removeEventListener("message", handleRealtimeWsBridgeMessage);
    observer.disconnect();
  }, { once: true });

  window.addEventListener("beforeunload", () => {
    saveHistory();
    saveSuspiciousUsers();
  });
})();
