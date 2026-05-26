(() => {
  "use strict";

  const GET_CONTENT_REPORT_TYPE = "KLT_GET_SUSPICIOUS_USERS";
  const CLEAR_CONTENT_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_USERS";
  const GET_BACKGROUND_REPORT_TYPE = "KLT_GET_SUSPICIOUS_REPORT";
  const CLEAR_BACKGROUND_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_REPORT";
  const SETTINGS_STORAGE_KEY = "klt:settings:v1";
  const MAX_LIST_USERS = 200;
  const MAX_BROADCASTER_LIST_USERS = 500;
  const ALERT_ACTIONS = new Set(["notify", "temporary", "auto-pin", "off"]);
  const DEFAULT_SETTINGS = {
    alertAction: "auto-pin",
    watchlistEnabled: true,
    ignorelistEnabled: true,
    broadcasterListEnabled: true,
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
      form: "#broadcaster-list-form",
      input: "#broadcaster-list-input",
      items: "#broadcaster-list-items"
    }
  };

  const summary = document.querySelector("#summary");
  const channel = document.querySelector("#channel");
  const list = document.querySelector("#list");
  const clearButton = document.querySelector("#clear");
  const actionGroup = document.querySelector("#alert-action");
  let activeTabId = 0;
  let activeTabUrl = "";
  let settings = { ...DEFAULT_SETTINGS };

  bindEvents();
  init();

  function bindEvents() {
    clearButton.addEventListener("click", clearDetectedUsers);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[SETTINGS_STORAGE_KEY]) return;
      settings = normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue);
      renderSettings();
    });

    list.addEventListener("click", (event) => {
      const button = event.target.closest(".klt-popup__item");
      if (!button) return;

      const url = button.dataset.profileUrl;
      if (!url) return;
      chrome.tabs.create({ url });
    });

    actionGroup.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (!ALERT_ACTIONS.has(action)) return;
      saveSettings({
        ...settings,
        alertAction: action
      });
    });

    for (const [listKey, config] of Object.entries(LIST_CONFIGS)) {
      const toggle = document.querySelector(config.toggle);
      const form = document.querySelector(config.form);
      const input = document.querySelector(config.input);
      const items = document.querySelector(config.items);

      toggle.addEventListener("change", () => {
        saveSettings({
          ...settings,
          [config.enabledKey]: toggle.checked
        });
      });

      form.addEventListener("submit", (event) => {
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
  }

  async function init() {
    settings = await loadSettings();
    renderSettings();

    const tab = await getActiveTab();
    activeTabId = tab?.id || 0;
    activeTabUrl = tab?.url || "";

    if (!activeTabId) {
      channel.textContent = "対象ページなし";
      renderEmpty("アクティブなタブを取得できませんでした。");
      return;
    }

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

    const channelName = report.channelSlug || getChannelSlugFromUrl(report.pageUrl) || getChannelSlugFromUrl(activeTabUrl);
    channel.textContent = channelName ? `対象: ${channelName}` : "対象: Kickページ";
    summary.textContent = users.length
      ? `検出 ${users.length}件`
      : "検出はありません";

    list.replaceChildren();
    if (!users.length) {
      renderEmpty("検出されたアカウントはまだありません。");
      return;
    }

    for (const user of users) {
      const item = document.createElement("button");
      item.className = "klt-popup__item";
      item.type = "button";
      item.dataset.profileUrl = user.profileUrl || getProfileUrl(user.username);
      item.title = `${user.username} のKickページを開く`;

      const skull = document.createElement("span");
      skull.className = "klt-popup__skull";
      skull.textContent = getDetectionIcon(user.reasons);

      const body = document.createElement("span");
      const name = document.createElement("span");
      name.className = "klt-popup__name";
      name.textContent = user.username;

      const reasons = document.createElement("span");
      reasons.className = "klt-popup__reasons";
      reasons.textContent = Array.isArray(user.reasons) && user.reasons.length
        ? user.reasons.join(" / ")
        : "検出";

      body.append(name, reasons);
      if (user.lastMessage) {
        const message = document.createElement("span");
        message.className = "klt-popup__message";
        message.textContent = user.lastMessage;
        body.appendChild(message);
      }

      item.append(skull, body);
      list.appendChild(item);
    }
  }

  function getDetectionIcon(reasons) {
    if (!Array.isArray(reasons)) return "💀";
    if (reasons.includes("ウォッチリスト")) return "★";
    if (reasons.includes("配信者リスト")) return "K";
    return "💀";
  }

  function renderEmpty(message) {
    list.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "klt-popup__empty";
    empty.textContent = message;
    list.appendChild(empty);
  }

  function renderSettings() {
    for (const button of actionGroup.querySelectorAll("button[data-action]")) {
      button.classList.toggle("is-active", button.dataset.action === settings.alertAction);
    }

    for (const [listKey, config] of Object.entries(LIST_CONFIGS)) {
      const toggle = document.querySelector(config.toggle);
      const items = document.querySelector(config.items);
      toggle.checked = settings[config.enabledKey] !== false;
      renderUsernameChips(items, listKey, settings[listKey]);
    }
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
      remove.textContent = "×";

      chip.append(label, remove);
      container.appendChild(chip);
    }

    if (!container.childElementCount) {
      const empty = document.createElement("span");
      empty.className = "klt-popup__hint";
      empty.textContent = "未登録";
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

    return {
      alertAction,
      watchlistEnabled: next.watchlistEnabled !== false,
      ignorelistEnabled: next.ignorelistEnabled !== false,
      broadcasterListEnabled: next.broadcasterListEnabled !== false,
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

  function getProfileUrl(username) {
    return `https://kick.com/${encodeURIComponent(String(username || "").replace(/^@/, ""))}`;
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
