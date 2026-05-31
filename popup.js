(() => {
  "use strict";

  const GET_CONTENT_REPORT_TYPE = "KLT_GET_SUSPICIOUS_USERS";
  const CLEAR_CONTENT_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_USERS";
  const GET_BACKGROUND_REPORT_TYPE = "KLT_GET_SUSPICIOUS_REPORT";
  const CLEAR_BACKGROUND_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_REPORT";
  const PIN_CONTENT_USER_TYPE = "KLT_PIN_USER";
  const SETTINGS_STORAGE_KEY = "klt:settings:v1";
  const FOLLOWED_CHANNELS_SYNC_STORAGE_KEY = "klt:followedChannelsSync:v1";
  const MAX_LIST_USERS = 200;
  const MAX_BROADCASTER_LIST_USERS = 500;
  const DEFAULT_MAX_PINNED_POPOVERS = 3;
  const MIN_PINNED_POPOVERS = 0;
  const MAX_PINNED_POPOVERS = 5;
  const ALERT_ACTIONS = new Set(["notify", "temporary", "auto-pin", "off"]);
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

  const LIST_CONFIGS = {
    watchlist: {
      enabledKey: "watchlistEnabled",
      toggle: "#watchlist-enabled",
      form: "#watchlist-form",
      input: "#watchlist-input",
      items: "#watchlist-items"
    },
    ignorelist: {
      enabledKey: "ignorelistEnabled",
      toggle: "#ignorelist-enabled",
      form: "#ignorelist-form",
      input: "#ignorelist-input",
      items: "#ignorelist-items"
    },
    broadcasterList: {
      enabledKey: "broadcasterListEnabled",
      toggle: "#broadcaster-list-enabled",
      items: "#broadcaster-list-items"
    }
  };

  const summary = document.querySelector("#summary");
  const channel = document.querySelector("#channel");
  const list = document.querySelector("#list");
  const clearButton = document.querySelector("#clear");
  const settingsToggle = document.querySelector("#settings-toggle");
  const settingsToggleIcon = settingsToggle.querySelector(".klt-icon");
  const settingsToggleLabel = settingsToggle.querySelector(".klt-button-label");
  const mainView = document.querySelector("#main-view");
  const settingsView = document.querySelector("#settings-view");
  const actionGroups = [...document.querySelectorAll("[data-alert-action]")];
  const maxPinnedSelect = document.querySelector("#max-pinned-popovers");
  const broadcasterSyncStatus = document.querySelector("#broadcaster-sync-status");
  let activeTabId = 0;
  let activeTabUrl = "";
  let settingsVisible = false;
  let settings = { ...DEFAULT_SETTINGS };
  let followedChannelsSyncStatus = createDefaultFollowedChannelsSyncStatus();
  let currentReport = null;
  let selectedDetectionTab = 'broadcaster';
  bindEvents();
  init();

  function bindEvents() {
    clearButton.addEventListener("click", clearDetectedUsers);
    settingsToggle.addEventListener("click", toggleSettingsView);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;

      if (changes[SETTINGS_STORAGE_KEY]) {
        settings = normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue);
        renderSettings();
      }

      if (changes[FOLLOWED_CHANNELS_SYNC_STORAGE_KEY]) {
        followedChannelsSyncStatus = normalizeFollowedChannelsSyncStatus(changes[FOLLOWED_CHANNELS_SYNC_STORAGE_KEY].newValue);
        renderFollowedChannelsSyncStatus();
      }
    });

    list.addEventListener("click", (event) => {
      const profileButton = event.target.closest("[data-profile-url]");
      if (profileButton) {
        const url = profileButton.dataset.profileUrl;
        if (!url) return;
        chrome.tabs.create({ url });
        return;
      }

      const pinTarget = event.target.closest("[data-pin-username]");
      if (!pinTarget) return;
      pinDetectedUser(pinTarget.dataset.pinUsername);
    });

    // Detection tab handling
    const tabButtons = [...document.querySelectorAll('#detection-tabs .klt-popup__tab')];
    for (const btn of tabButtons) {
      btn.addEventListener('click', (e) => {
        const t = btn.dataset.tab;
        selectedDetectionTab = t || 'bot';
        tabButtons.forEach(b => b.classList.toggle('is-active', b === btn));
        // re-render using last report
        if (currentReport) renderReport(currentReport);
      });
    }

    for (const group of actionGroups) {
      group.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        if (!ALERT_ACTIONS.has(action)) return;
        saveSettings({
          ...settings,
          alertAction: action
        });
      });
    }

    maxPinnedSelect?.addEventListener("change", () => {
      saveSettings({
        ...settings,
        maxPinnedPopovers: clampPinnedLimit(maxPinnedSelect.value)
      });
    });

    const durationSelect = document.querySelector("#temporary-popup-duration");
    durationSelect?.addEventListener("change", () => {
      const dur = clampTemporaryPopupDuration(durationSelect.value);
      updateDurationLabel(dur);
      saveSettings({
        ...settings,
        temporaryPopupDuration: dur
      });
    });

    for (const [listKey, config] of Object.entries(LIST_CONFIGS)) {
      const toggle = document.querySelector(config.toggle);
      const form = config.form ? document.querySelector(config.form) : null;
      const input = config.input ? document.querySelector(config.input) : null;
      const items = document.querySelector(config.items);

      toggle.addEventListener("change", () => {
        saveSettings({
          ...settings,
          [config.enabledKey]: toggle.checked
        });
      });

      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        const username = normalizeListUsername(input.value);
        if (!username) return;
        input.value = "";
        saveSettings(addUsernameToList(settings, listKey, username));
      });

      items.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-remove]");
        if (!button) return;
        saveSettings(removeUsernameFromList(settings, listKey, button.dataset.remove));
      });
    }

    const botToggle = document.querySelector("#bot-detection-enabled");
    botToggle?.addEventListener("change", () => {
      saveSettings({
        ...settings,
        botDetectionEnabled: botToggle.checked
      });
    });
  }

  function toggleSettingsView() {
    setSettingsViewVisible(!settingsVisible);
  }

  function setSettingsViewVisible(visible) {
    settingsVisible = visible;
    mainView.hidden = visible;
    settingsView.hidden = !visible;
    settingsToggleIcon.className = `klt-icon klt-icon--${visible ? "arrow-left" : "gear"}`;
    settingsToggleLabel.textContent = visible ? "戻る" : "設定";
    settingsToggle.setAttribute("aria-pressed", String(visible));
  }

  async function init() {
    const [loadedSettings, loadedSyncStatus] = await Promise.all([
      loadSettings(),
      loadFollowedChannelsSyncStatus()
    ]);
    settings = loadedSettings;
    followedChannelsSyncStatus = loadedSyncStatus;
    renderSettings();

    const tab = await getActiveTab();
    activeTabId = tab?.id || 0;
    activeTabUrl = tab?.url || "";

    if (!activeTabId) {
      channel.textContent = "対象ページなし";
      renderEmpty("アクティブなタブを取得できませんでした。");
      return;
    }

    async function fetchAndRender() {
      let report = null;
      try {
        const response = await sendTabMessage(activeTabId, { type: GET_CONTENT_REPORT_TYPE });
        report = response?.report || null;
      } catch (_error) {
        const response = await sendRuntimeMessage({ type: GET_BACKGROUND_REPORT_TYPE, tabId: activeTabId });
        report = response?.report || null;
      }
      renderReport(report || createEmptyReport());
    }

    await fetchAndRender();
    setInterval(fetchAndRender, 2000);
  }

  async function clearDetectedUsers() {
    if (!activeTabId) return;

    clearButton.disabled = true;
    try {
      await sendTabMessage(activeTabId, { type: CLEAR_CONTENT_REPORT_TYPE });
    } catch (_error) {
      await sendRuntimeMessage({ type: CLEAR_BACKGROUND_REPORT_TYPE, tabId: activeTabId });
    }

    renderReport(createEmptyReport());
  }

  function renderReport(report) {
    const users = Array.isArray(report.users) ? report.users : [];
    clearButton.disabled = users.length === 0;

    // store current report for tab re-rendering
    currentReport = report;

    const channelName = report.channelSlug || getChannelSlugFromUrl(report.pageUrl) || getChannelSlugFromUrl(activeTabUrl);
    const channelLabel = channelName ? `対象: ${channelName}` : "対象: Kickページ";

    // filter users by selected tab
    const filtered = users.filter((u) => matchesDetectionTab(u, selectedDetectionTab));

    channel.textContent = `${channelLabel}　検出: ${users.length}件`;
    summary.textContent = "";
    summary.hidden = true;

    // タブバッジ更新
    for (const tab of ['broadcaster', 'watch', 'bot', 'other']) {
      const badge = document.getElementById(`badge-${tab}`);
      if (!badge) continue;
      const count = users.filter((u) => matchesDetectionTab(u, tab)).length;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    }

    list.replaceChildren();
    if (!filtered.length) {
      renderEmpty("検出されたアカウントはまだありません。");
      return;
    }

    for (const user of filtered) {
      const item = document.createElement("div");
      item.className = "klt-popup__item";
      item.title = `${user.username} を固定表示`;

      const badge = createDetectionBadge(user);
      badge.dataset.pinUsername = user.username;

      const body = document.createElement("span");
      body.className = "klt-popup__item-content";

      const name = document.createElement("button");
      name.className = "klt-popup__name klt-popup__name-button";
      name.type = "button";
      const nameText = document.createElement("span");
      nameText.className = "klt-popup__name-text";
      nameText.textContent = user.username;
      name.append(nameText, createIcon("external"));
      name.dataset.profileUrl = user.profileUrl || getProfileUrl(user.username);
      name.title = `${user.username} のKickページを開く`;

      const reasons = document.createElement("span");
      reasons.className = "klt-popup__reasons";
      const hasScore = Number.isFinite(Number(user.riskScore)) && Number(user.riskScore) > 0;
      const scoreText = hasScore
        ? `score ${Math.max(0, Math.min(100, Math.round(Number(user.riskScore))))} (${Math.max(0, Math.round(Number(user.riskRuleCount) || 0))}条件)`
        : "";
      const reasonText = Array.isArray(user.reasons) && user.reasons.length
        ? user.reasons.join(" / ")
        : "検出";
      reasons.textContent = scoreText ? `${scoreText} | ${reasonText}` : reasonText;

      const detail = document.createElement("button");
      detail.className = "klt-popup__item-body";
      detail.type = "button";
      detail.dataset.pinUsername = user.username;
      detail.title = `${user.username} をポップアップ固定`;
      const pinHint = document.createElement("span");
      pinHint.className = "klt-popup__pin-hint";
      pinHint.append(createIcon("pin"), document.createTextNode("固定"));
      detail.appendChild(reasons);
      if (user.lastMessage) {
        const message = document.createElement("span");
        message.className = "klt-popup__message";
        message.textContent = user.lastMessage;
        detail.appendChild(message);
      }
      detail.appendChild(pinHint);

      body.append(name, detail);

      item.append(badge, body);
      list.appendChild(item);
    }
  }

  async function pinDetectedUser(username) {
    if (!activeTabId || !username) return;

    try {
      const response = await sendTabMessage(activeTabId, {
        type: PIN_CONTENT_USER_TYPE,
        username
      });
      summary.textContent = response?.ok
        ? `${username} を固定しました`
        : response?.reason || "固定できませんでした";
    } catch (_error) {
      summary.textContent = "Kickページを再読み込みしてください。";
    }
  }

  function createDetectionBadge(user) {
    const category = getDetectionCategory(user);
    const badge = document.createElement("span");
    badge.className = `klt-popup__skull klt-popup__skull--${category}`;

    if (category === "broadcaster" && user?.avatarUrl) {
      const image = document.createElement("img");
      image.className = "klt-popup__skull-avatar";
      image.src = String(user.avatarUrl);
      image.alt = `${user.username} avatar`;
      image.referrerPolicy = "no-referrer";
      image.loading = "lazy";
      badge.appendChild(image);
      return badge;
    }

    badge.textContent = getDetectionIconForCategory(category);
    return badge;
  }

  function getDetectionCategory(user) {
    const explicit = String(user?.detectionCategory || "");
    if (["threat", "privacy", "watch", "broadcaster", "bot"].includes(explicit)) return explicit;

    const reasons = Array.isArray(user?.reasons) ? user.reasons : [];
    if (reasons.some((reason) => /殺害|危害|暴力|脅迫/.test(reason))) return "threat";
    if (reasons.some((reason) => /個人情報|住所|電話番号|メール/.test(reason))) return "privacy";
    if (reasons.includes("ウォッチリスト")) return "watch";
    if (reasons.includes("配信者リスト")) return "broadcaster";
    if (reasons.length) return "bot";
    return "default";
  }

  function getDetectionIconForCategory(category) {
    if (category === "threat") return "🔪";
    if (category === "privacy") return "👤";
    if (category === "watch") return "★";
    if (category === "broadcaster") return "📺";
    if (category === "bot") return "🤖";
    return "💀";
  }

  function matchesDetectionTab(user, tab) {
    if (!user || !tab) return false;
    const reasons = Array.isArray(user.reasons) ? user.reasons : [];
    if (tab === 'broadcaster') return reasons.includes('配信者リスト');
    if (tab === 'watch') return reasons.includes('ウォッチリスト');
    const isBotReason = (r) => /連投|件以上|コメント|間隔|反復|絵文字|スタンプ|BOT|URL|大量反復|同一文/.test(r);
    if (tab === 'bot') return !reasons.includes('配信者リスト') && !reasons.includes('ウォッチリスト') && reasons.some(isBotReason);
    if (tab === 'other') return !reasons.includes('配信者リスト') && !reasons.includes('ウォッチリスト') && !reasons.some(isBotReason);
    return !reasons.includes('配信者リスト') && !reasons.includes('ウォッチリスト');
  }

  function renderEmpty(message) {
    list.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "klt-popup__empty";
    empty.textContent = message;
    list.appendChild(empty);
  }

  function renderSettings() {
    for (const group of actionGroups) {
      for (const button of group.querySelectorAll("button[data-action]")) {
        button.classList.toggle("is-active", button.dataset.action === settings.alertAction);
      }
    }

    if (maxPinnedSelect) {
      maxPinnedSelect.value = String(settings.maxPinnedPopovers);
    }

    for (const [listKey, config] of Object.entries(LIST_CONFIGS)) {
      const toggle = document.querySelector(config.toggle);
      const items = document.querySelector(config.items);
      toggle.checked = settings[config.enabledKey] !== false;
      if (listKey === "broadcasterList") {
        renderBroadcasterCount(items, settings[listKey]);
      } else {
        renderUsernameChips(items, listKey, settings[listKey]);
      }
    }

    const botToggle = document.querySelector("#bot-detection-enabled");
    if (botToggle) botToggle.checked = settings.botDetectionEnabled !== false;

    const durationSelect = document.querySelector("#temporary-popup-duration");
    if (durationSelect) {
      const dur = clampTemporaryPopupDuration(settings.temporaryPopupDuration);
      durationSelect.value = String(dur);
      updateDurationLabel(dur);
    }

    renderFollowedChannelsSyncStatus();
  }

  function updateDurationLabel(dur) {
    const label = document.querySelector("#temporary-popup-duration-label");
    if (label) label.textContent = dur === 0 ? "" : "秒";
  }

  function renderBroadcasterCount(container, values) {
    container.replaceChildren();
    container.style.display = 'none';
  }

  function renderUsernameChips(container, listKey, values) {
    container.replaceChildren();
    for (const username of values || []) {
      const chip = document.createElement("span");
      chip.className = "klt-popup__chip";

      const label = document.createElement("span");
      label.textContent = username;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.remove = username;
      remove.title = `${username} を削除`;
      remove.appendChild(createIcon("x"));

      chip.append(label, remove);
      container.appendChild(chip);
    }

    if (!container.childElementCount) {
      const empty = document.createElement("span");
      empty.className = "klt-popup__hint";
      empty.textContent = "";
      container.appendChild(empty);
    }
  }

  function createEmptyReport() {
    return {
      channelSlug: "",
      pageUrl: "",
      updatedAt: Date.now(),
      users: []
    };
  }

  function createIcon(name) {
    const icon = document.createElement("span");
    icon.className = `klt-icon klt-icon--${name}`;
    if (name === "pin") {
      icon.classList.add("klt-icon--pin-tilt");
    }
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  function sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      });
    });
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    });
  }

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(SETTINGS_STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          resolve({ ...DEFAULT_SETTINGS });
          return;
        }

        resolve(normalizeSettings(result?.[SETTINGS_STORAGE_KEY]));
      });
    });
  }

  function loadFollowedChannelsSyncStatus() {
    return new Promise((resolve) => {
      chrome.storage.local.get(FOLLOWED_CHANNELS_SYNC_STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          resolve(createDefaultFollowedChannelsSyncStatus());
          return;
        }

        resolve(normalizeFollowedChannelsSyncStatus(result?.[FOLLOWED_CHANNELS_SYNC_STORAGE_KEY]));
      });
    });
  }

  function saveSettings(nextSettings) {
    settings = normalizeSettings(nextSettings);
    renderSettings();

    return new Promise((resolve) => {
      chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings }, () => {
        resolve();
      });
    });
  }

  function normalizeSettings(value) {
    const next = value && typeof value === "object" ? value : {};
    const alertAction = ALERT_ACTIONS.has(next.alertAction)
      ? next.alertAction
      : DEFAULT_SETTINGS.alertAction;
    const maxPinnedPopovers = clampPinnedLimit(next.maxPinnedPopovers);

    return {
      alertAction,
      maxPinnedPopovers,
      watchlistEnabled: next.watchlistEnabled !== false,
      ignorelistEnabled: next.ignorelistEnabled !== false,
      broadcasterListEnabled: next.broadcasterListEnabled !== false,
      botDetectionEnabled: next.botDetectionEnabled !== false,
      temporaryPopupDuration: clampTemporaryPopupDuration(next.temporaryPopupDuration),
      watchlist: normalizeUsernameList(next.watchlist),
      ignorelist: normalizeUsernameList(next.ignorelist),
      broadcasterList: normalizeUsernameList(next.broadcasterList, MAX_BROADCASTER_LIST_USERS)
    };
  }

  function normalizeUsernameList(values, limit = MAX_LIST_USERS) {
    if (!Array.isArray(values)) return [];

    const seen = new Set();
    const list = [];
    for (const value of values) {
      const username = normalizeListUsername(value);
      if (!username || seen.has(username)) continue;
      seen.add(username);
      list.push(username);
    }

    return list.slice(0, limit);
  }

  function addUsernameToList(baseSettings, listKey, username) {
    const current = normalizeUsernameList(baseSettings[listKey]);
    if (!current.includes(username)) current.push(username);
    return {
      ...baseSettings,
      [listKey]: current
    };
  }

  function removeUsernameFromList(baseSettings, listKey, username) {
    const key = normalizeListUsername(username);
    return {
      ...baseSettings,
      [listKey]: normalizeUsernameList(baseSettings[listKey]).filter((value) => value !== key)
    };
  }

  function normalizeListUsername(value) {
    const username = String(value || "").replace(/^@/, "").trim().toLowerCase();
    return /^[a-z0-9_.-]{1,32}$/.test(username) ? username : "";
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

  function getProfileUrl(username) {
    return `https://kick.com/${encodeURIComponent(String(username || "").replace(/^@/, ""))}`;
  }

  function renderFollowedChannelsSyncStatus() {
    if (!broadcasterSyncStatus) return;

    broadcasterSyncStatus.classList.remove("is-success", "is-failed");
    if (!settings.broadcasterListEnabled) {
      broadcasterSyncStatus.textContent = "配信者リストがOFFです。";
      return;
    }

    const status = normalizeFollowedChannelsSyncStatus(followedChannelsSyncStatus);
    if (status.state === "success") {
      broadcasterSyncStatus.classList.add("is-success");
      const source = status.source ? ` / ${status.source}` : "";
      const displayedTotal = Math.max(Number(status.totalCount) || 0, Number(status.listCount) || 0);
      const total = displayedTotal > 0 ? `/${displayedTotal}` : "";
      broadcasterSyncStatus.textContent = `自動読み込み済み: ${status.listCount}${total}件${source}`;
      return;
    }

    if (status.state === "failed") {
      broadcasterSyncStatus.classList.add("is-failed");
      broadcasterSyncStatus.textContent = `自動読み込み失敗: ${status.reason || "理由不明"}`;
      return;
    }

    if (status.state === "running") {
      broadcasterSyncStatus.textContent = "フォロー中チャンネルを読み込み中...";
      return;
    }

    broadcasterSyncStatus.textContent = status.reason || "Kickページを開くと自動読み込みします。";
  }

  function normalizeFollowedChannelsSyncStatus(value) {
    const status = value && typeof value === "object" ? value : {};
    const state = ["idle", "running", "success", "failed", "disabled"].includes(status.state)
      ? status.state
      : "idle";

    return {
      state,
      reason: String(status.reason || ""),
      updatedAt: Number(status.updatedAt) || 0,
      listCount: Number(status.listCount) || 0,
      totalCount: Number(status.totalCount) || 0,
      addedCount: Number(status.addedCount) || 0,
      source: String(status.source || ""),
      pageUrl: String(status.pageUrl || ""),
      channelSlug: String(status.channelSlug || "")
    };
  }

  function createDefaultFollowedChannelsSyncStatus() {
    return {
      state: "idle",
      reason: "Kickページを開くと自動読み込みします。",
      updatedAt: 0,
      listCount: 0,
      addedCount: 0,
      source: "",
      pageUrl: "",
      channelSlug: ""
    };
  }

  function getChannelSlugFromUrl(value) {
    try {
      const url = new URL(value || "");
      if (url.hostname !== "kick.com" && url.hostname !== "www.kick.com") return "";
      const ignored = new Set(["api", "embed", "popout", "video", "videos", "chatroom", "mobile"]);
      const first = url.pathname.split("/").filter(Boolean)[0] || "";
      return first && !ignored.has(first.toLowerCase()) ? first : "";
    } catch (_error) {
      return "";
    }
  }
})();
