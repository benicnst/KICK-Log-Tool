(() => {
  "use strict";

  const GET_CONTENT_REPORT_TYPE = "KLT_GET_SUSPICIOUS_USERS";
  const CLEAR_CONTENT_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_USERS";
  const GET_BACKGROUND_REPORT_TYPE = "KLT_GET_SUSPICIOUS_REPORT";
  const CLEAR_BACKGROUND_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_REPORT";
  const PIN_CONTENT_USER_TYPE = "KLT_PIN_USER";
  const REFRESH_FOLLOWED_CHANNELS_TYPE = "KLT_REFRESH_FOLLOWED_CHANNELS";
  const SETTINGS_STORAGE_KEY = "klt:settings:v1";
  const FOLLOWED_CHANNELS_SYNC_STORAGE_KEY = "klt:followedChannelsSync:v1";
  const MAX_LIST_USERS = 200;
  const MAX_BROADCASTER_LIST_USERS = 500;
  const DEFAULT_MAX_PINNED_POPOVERS = 3;
  const MIN_PINNED_POPOVERS = 0;
  const MAX_PINNED_POPOVERS = 5;
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

  const UI_LANG = getUiLanguage();
  const TEXT = {
    ja: {
      checkingTarget: "対象ページを確認中...",
      loadingDetection: "検出状況を読み込み中...",
      clear: "クリア",
      settings: "設定",
      back: "戻る",
      tabsLabel: "検出タブ",
      broadcaster: "配信者",
      watch: "ウォッチ",
      bot: "BOT/連投",
      botSetting: "BOT/連投/その他",
      sensitivity: "検知感度",
      sensitivityConservative: "控えめ",
      sensitivityStandard: "標準",
      sensitivityStrong: "強め",
      botSensitivityHint: "BOT/連投の検知しやすさを調整します。",
      otherSensitivityHint: "脅迫・暴言・個人情報などの検知しやすさを調整します。",
      other: "その他",
      advancedSettings: "詳細設定",
      settingsSubtitle: "対象リストと通知設定",
      alertAction: "検出時の動作",
      alertActionLabel: "リスト検出時の動作",
      notify: "通知",
      autoPopup: "自動ポップアップ",
      off: "オフ",
      autoPopupHint: "検出時の動作が自動ポップアップの場合に使います。",
      maxPeople: "最大人数",
      maxAutoPopups: "自動ポップアップする最大数",
      duration: "表示時間",
      popupDuration: "ポップアップ表示時間",
      sec: "秒",
      broadcasterHint: "配信者のコメントを検出します。",
      reloadFollowed: "再読み込み",
      botHint: "不審な投稿パターンを自動検出します。",
      dashboard: "チャット上部ダッシュボード",
      dashboardHint: "チャット表示欄の上部に、最小限の状況メーターを表示します。",
      watchlist: "ウォッチリスト",
      watchlistHint: "登録IDがコメントしたら検出します。",
      ignore: "無視",
      ignoreHint: "登録IDは自動検出・自動表示から除外します。",
      add: "追加",
      noTarget: "対象ページなし",
      noActiveTab: "アクティブなタブを取得できませんでした。",
      targetKick: "対象: Kickページ",
      target: "対象: {channel}",
      detectedCount: "{target}　検出: {count}件",
      chatStatusChecking: "判定中",
      chatStatusQuiet: "静か",
      chatStatusNormal: "通常",
      chatStatusActive: "盛り上がり中",
      chatStatusCaution: "荒れそう",
      chatStatusRough: "荒れ気味",
      recentWindow: "直近{minutes}分",
      empty: "検出されたアカウントはまだありません。",
      pinTitle: "{username} を固定表示",
      profileTitle: "{username} のKickページを開く",
      popupPinTitle: "{username} をポップアップ固定",
      timeJustNow: "たった今",
      timeMinutesAgo: "{count}分前",
      timeHoursAgo: "{count}時間前",
      timeDaysAgo: "{count}日前",
      fixed: "固定",
      pinned: "{username} を固定しました",
      cannotPin: "固定できませんでした",
      reloadKick: "Kickページを再読み込みしてください。",
      score: "score {score} ({rules}条件)",
      detected: "検出",
      threat: "脅迫",
      abuse: "攻撃的暴言",
      privacy: "個人情報",
      removeTitle: "{username} を削除",
      broadcasterOff: "配信者リストがOFFです。",
      savedList: "保存済みリスト: {count}件 / 再読み込み後に同期件数を表示{source}",
      autoLoaded: "自動読み込み済み: {count}{total}件{source}",
      autoLoadFailed: "自動読み込み失敗: {reason}",
      unknownReason: "理由不明",
      autoLoadingCurrent: "自動読み込み中 [{username} ...... {count}件]{source}",
      autoLoading: "フォロー中チャンネルを読み込み中...{source}",
      idleSync: "Kickページを開くと自動読み込みします。"
    },
    en: {
      checkingTarget: "Checking target page...",
      loadingDetection: "Loading detection status...",
      clear: "Clear",
      settings: "Settings",
      back: "Back",
      tabsLabel: "Detection tabs",
      broadcaster: "Broadcaster",
      watch: "Watch",
      bot: "Bot/Spam",
      botSetting: "Bot/Spam/Other",
      sensitivity: "Sensitivity",
      sensitivityConservative: "Conservative",
      sensitivityStandard: "Standard",
      sensitivityStrong: "Strong",
      botSensitivityHint: "Adjust how easily bot/spam patterns are detected.",
      otherSensitivityHint: "Adjust how easily threats, abuse, and personal info are detected.",
      other: "Other",
      advancedSettings: "Advanced Settings",
      settingsSubtitle: "Lists and notification settings",
      alertAction: "Detection action",
      alertActionLabel: "List detection action",
      notify: "Notify",
      autoPopup: "Auto popup",
      off: "Off",
      autoPopupHint: "Used when the detection action is Auto popup.",
      maxPeople: "Max",
      maxAutoPopups: "Maximum auto popups",
      duration: "Duration",
      popupDuration: "Popup duration",
      sec: " sec",
      broadcasterHint: "Detect comments from followed/listed broadcasters.",
      reloadFollowed: "Reload",
      botHint: "Automatically detect suspicious posting patterns.",
      dashboard: "Chat top dashboard",
      dashboardHint: "Shows a compact status meter above the chat message area.",
      watchlist: "Watchlist",
      watchlistHint: "Detect when a registered ID comments.",
      ignore: "Ignore",
      ignoreHint: "Registered IDs are excluded from auto detection and auto popup.",
      add: "Add",
      noTarget: "No target page",
      noActiveTab: "Could not get the active tab.",
      targetKick: "Target: Kick page",
      target: "Target: {channel}",
      detectedCount: "{target}  Detected: {count}",
      chatStatusChecking: "Checking",
      chatStatusQuiet: "Quiet",
      chatStatusNormal: "Normal",
      chatStatusActive: "Active",
      chatStatusCaution: "Getting rough",
      chatStatusRough: "Rough",
      recentWindow: "Last {minutes} min",
      empty: "No detected accounts yet.",
      pinTitle: "Pin {username}",
      profileTitle: "Open {username}'s Kick page",
      popupPinTitle: "Pin {username} popup",
      timeJustNow: "just now",
      timeMinutesAgo: "{count}m ago",
      timeHoursAgo: "{count}h ago",
      timeDaysAgo: "{count}d ago",
      fixed: "Pinned",
      pinned: "Pinned {username}",
      cannotPin: "Could not pin",
      reloadKick: "Reload the Kick page.",
      score: "score {score} ({rules} rules)",
      detected: "Detected",
      threat: "Threat",
      abuse: "Abusive language",
      privacy: "Personal info",
      removeTitle: "Remove {username}",
      broadcasterOff: "Broadcaster list is off.",
      savedList: "Saved list: {count} / reload to show sync count{source}",
      autoLoaded: "Auto loaded: {count}{total}{source}",
      autoLoadFailed: "Auto load failed: {reason}",
      unknownReason: "Unknown reason",
      autoLoadingCurrent: "Auto loading [{username} ...... {count}]{source}",
      autoLoading: "Loading followed channels...{source}",
      idleSync: "Open a Kick page to auto load."
    }
  };
  const REASON_LABELS_EN = new Map([
    ["危害/脅迫性の高い投稿", "High-risk threat-like post"],
    ["攻撃的暴言", "Abusive language"],
    ["性的嫌がらせ", "Sexual harassment"],
    ["身体侮辱", "Body-shaming insult"],
    ["殺害/危害予告らしき投稿", "Threat-like post"],
    ["複数アカウント同一文連投", "Coordinated repeated text"],
    ["低情報コメント連投", "Low-info repeated comments"],
    ["文面変更を伴う反復連投", "Repeated posting bursts with changing text"],
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

  const summary = document.querySelector("#summary");
  const channel = document.querySelector("#channel");
  const chatStatus = document.querySelector("#chat-status");
  const list = document.querySelector("#list");
  const clearButton = document.querySelector("#clear");
  const settingsToggle = document.querySelector("#settings-toggle");
  const settingsToggleIcon = settingsToggle.querySelector(".klt-icon");
  const settingsToggleLabel = settingsToggle.querySelector(".klt-button-label");
  const mainView = document.querySelector("#main-view");
  const settingsView = document.querySelector("#settings-view");
  const actionGroups = [...document.querySelectorAll("[data-alert-action]")];
  const maxPinnedSelect = document.querySelector("#max-pinned-popovers");
  const botSensitivitySelect = document.querySelector("#bot-detection-sensitivity");
  const otherSensitivitySelect = document.querySelector("#other-detection-sensitivity");
  const broadcasterSyncStatus = document.querySelector("#broadcaster-sync-status");
  const broadcasterSyncReload = document.querySelector("#broadcaster-sync-reload");
  let activeTabId = 0;
  let activeTabUrl = "";
  let settingsVisible = false;
  let settings = { ...DEFAULT_SETTINGS };
  let followedChannelsSyncStatus = createDefaultFollowedChannelsSyncStatus();
  let currentReport = null;
  let selectedDetectionTab = 'broadcaster';
  let detectionTabInitialized = false;
  applyStaticTranslations();
  bindEvents();
  init();

  function getUiLanguage() {
    const language = String(chrome?.i18n?.getUILanguage?.() || navigator.language || "en").toLowerCase();
    return language.startsWith("ja") ? "ja" : "en";
  }

  function t(key, params = {}) {
    const dictionary = TEXT[UI_LANG] || TEXT.en;
    const fallback = TEXT.en[key] || TEXT.ja[key] || key;
    return String(dictionary[key] || fallback).replace(/\{(\w+)\}/g, (_match, name) => {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : "";
    });
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = UI_LANG;
    setText("#channel", t("checkingTarget"));
    setText("#summary", t("loadingDetection"));
    setText("#clear .klt-button-label", t("clear"));
    setText("#settings-toggle .klt-button-label", t("settings"));
    document.querySelector("#detection-tabs")?.setAttribute("aria-label", t("tabsLabel"));
    setText("#tab-broadcaster .klt-tab-label", t("broadcaster"));
    setText("#tab-watch .klt-tab-label", t("watch"));
    setText("#tab-bot .klt-tab-label", t("bot"));
    setText("#tab-other .klt-tab-label", t("other"));
    settingsView?.setAttribute("aria-label", t("advancedSettings"));
    setText(".klt-popup__settings-title h2 span:last-child", t("advancedSettings"));
    setText(".klt-popup__settings-title > span", t("settingsSubtitle"));
    document.querySelector(".klt-popup__settings--compact")?.setAttribute("aria-label", t("alertAction"));
    setText(".klt-popup__setting--action .klt-popup__label span:last-child", t("alertAction"));
    document.querySelector("#alert-action")?.setAttribute("aria-label", t("alertActionLabel"));
    setText("[data-action='notify'] span:last-child", t("notify"));
    setText("[data-action='auto-pin'] span:last-child", t("autoPopup"));
    setText("[data-action='off'] span:last-child", t("off"));
    const compactSettings = [...document.querySelectorAll(".klt-popup__settings--compact > .klt-popup__setting")];
    const autoPopupSetting = compactSettings[1];
    const autoPopupLabel = autoPopupSetting?.querySelector(".klt-popup__label span:last-child");
    const autoPopupHint = autoPopupSetting?.querySelector(".klt-popup__hint");
    if (autoPopupLabel) autoPopupLabel.textContent = t("autoPopup");
    if (autoPopupHint) autoPopupHint.textContent = t("autoPopupHint");
    const pinLabels = [...document.querySelectorAll(".klt-popup__pin-select-row .klt-popup__pin-label")];
    if (pinLabels[0]) pinLabels[0].textContent = t("maxPeople");
    if (pinLabels[1]) pinLabels[1].textContent = t("duration");
    maxPinnedSelect?.setAttribute("aria-label", t("maxAutoPopups"));
    const durationSelect = document.querySelector("#temporary-popup-duration");
    durationSelect?.setAttribute("aria-label", t("popupDuration"));
    for (const option of durationSelect?.querySelectorAll("option") || []) {
      option.textContent = `${option.value}${t("sec")}`;
    }
    setText("[data-list-setting='broadcasterList'] .klt-popup__label span:last-child", t("broadcaster"));
    setText("[data-list-setting='broadcasterList'] .klt-popup__hint", t("broadcasterHint"));
    setText("#broadcaster-sync-reload span:last-child", t("reloadFollowed"));
    setText("#broadcaster-sync-status", t("loadingDetection"));
    setText("#compact-dashboard-label", t("dashboard"));
    setText("#compact-dashboard-hint", t("dashboardHint"));
    setText("[data-list-setting='botDetection'] .klt-popup__label span:last-child", t("botSetting"));
    setText("[data-list-setting='botDetection'] .klt-popup__hint", t("botHint"));
    document.querySelector(".klt-popup__sensitivity-grid")?.setAttribute("aria-label", t("sensitivity"));
    setText("[for='bot-detection-sensitivity'] > span", t("bot"));
    setText("[for='other-detection-sensitivity'] > span", t("other"));
    setSensitivityOptionsText("#bot-detection-sensitivity");
    setSensitivityOptionsText("#other-detection-sensitivity");
    setText("[data-list-setting='watchlist'] .klt-popup__label span:last-child", t("watchlist"));
    setText("[data-list-setting='watchlist'] .klt-popup__hint", t("watchlistHint"));
    setText("#watchlist-form button span:last-child", t("add"));
    setText("[data-list-setting='ignorelist'] .klt-popup__label span:last-child", t("ignore"));
    setText("[data-list-setting='ignorelist'] .klt-popup__hint", t("ignoreHint"));
    setText("#ignorelist-form button span:last-child", t("add"));
  }

  function setSensitivityOptionsText(selector) {
    const select = document.querySelector(selector);
    if (!select) return;
    const labels = {
      low: t("sensitivityConservative"),
      standard: t("sensitivityStandard"),
      high: t("sensitivityStrong")
    };
    for (const option of select.querySelectorAll("option")) {
      option.textContent = labels[option.value] || option.textContent;
    }
  }

  function translateKnownStatusReason(reason) {
    const value = String(reason || "");
    if (UI_LANG === "ja" || !value) return value;
    const known = new Map([
      ["Kickページを開くと自動読み込みします。", t("idleSync")],
      ["配信者リストがOFFです。", t("broadcasterOff")],
      ["フォロー中チャンネルを読み込み中...", t("autoLoading", { source: "" })],
      ["フォロー中チャンネルが見つかりませんでした。", "No followed channels found."],
      ["現在KICKにログインされていません。", "You are not logged in to Kick."],
      ["ログインが必要です", "Login required."],
      ["session_tokenが見つかりません", "session_token was not found."]
    ]);
    if (known.has(value)) return known.get(value);
    return value
      .replace(/^通信エラー:\s*/i, "Network error: ")
      .replace(/理由不明/g, t("unknownReason"));
  }

  function bindEvents() {
    clearButton.addEventListener("click", clearDetectedUsers);
    settingsToggle.addEventListener("click", toggleSettingsView);
    broadcasterSyncReload?.addEventListener("click", refreshFollowedChannels);

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

    const dashboardToggle = document.querySelector("#compact-dashboard-enabled");
    dashboardToggle?.addEventListener("change", () => {
      saveSettings({
        ...settings,
        compactDashboardEnabled: dashboardToggle.checked
      });
    });

    botSensitivitySelect?.addEventListener("change", () => {
      saveSettings({
        ...settings,
        botDetectionSensitivity: normalizeDetectionSensitivity(botSensitivitySelect.value)
      });
    });

    otherSensitivitySelect?.addEventListener("change", () => {
      saveSettings({
        ...settings,
        otherDetectionSensitivity: normalizeDetectionSensitivity(otherSensitivitySelect.value)
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
    settingsToggleLabel.textContent = visible ? t("back") : t("settings");
    settingsToggle.setAttribute("aria-pressed", String(visible));
  }

  async function init() {
    try {
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
        channel.textContent = t("noTarget");
        renderEmpty(t("noActiveTab"));
        return;
      }

      async function fetchAndRender() {
        try {
          const [contentResult, backgroundResult] = await Promise.allSettled([
            sendTabMessage(activeTabId, { type: GET_CONTENT_REPORT_TYPE }),
            sendRuntimeMessage({ type: GET_BACKGROUND_REPORT_TYPE, tabId: activeTabId, pageUrl: activeTabUrl })
          ]);
          const contentReport = contentResult.status === "fulfilled" ? contentResult.value?.report : null;
          const backgroundReport = backgroundResult.status === "fulfilled" ? backgroundResult.value?.report : null;
          if (!contentReport && !backgroundReport) {
            channel.textContent = t("targetKick");
            renderEmpty(t("reloadKick"));
            return;
          }
          renderReport(mergeReports(contentReport, backgroundReport));
        } catch (_error) {
          channel.textContent = t("targetKick");
          renderEmpty(t("reloadKick"));
        }
      }

      await fetchAndRender();
      setInterval(fetchAndRender, 2000);
    } catch (_error) {
      channel.textContent = t("noTarget");
      renderEmpty(t("reloadKick"));
    }
  }

  async function clearDetectedUsers() {
    if (!activeTabId) return;

    clearButton.disabled = true;
    await Promise.allSettled([
      sendTabMessage(activeTabId, { type: CLEAR_CONTENT_REPORT_TYPE }),
      sendRuntimeMessage({ type: CLEAR_BACKGROUND_REPORT_TYPE, tabId: activeTabId })
    ]);

    renderReport(createEmptyReport());
  }

  async function refreshFollowedChannels() {
    if (!activeTabId || !broadcasterSyncReload) return;

    broadcasterSyncReload.disabled = true;
    try {
      const response = await sendTabMessage(activeTabId, { type: REFRESH_FOLLOWED_CHANNELS_TYPE });
      if (response?.status) {
        followedChannelsSyncStatus = normalizeFollowedChannelsSyncStatus(response.status);
        renderFollowedChannelsSyncStatus();
      }
    } catch (_error) {
      followedChannelsSyncStatus = {
        ...followedChannelsSyncStatus,
        state: "failed",
        reason: t("reloadKick"),
        updatedAt: Date.now()
      };
      renderFollowedChannelsSyncStatus();
    } finally {
      broadcasterSyncReload.disabled = false;
    }
  }

  function renderReport(report) {
    const users = Array.isArray(report.users) ? report.users : [];
    clearButton.disabled = users.length === 0;

    // store current report for tab re-rendering
    currentReport = report;

    const channelName = report.channelSlug || getChannelSlugFromUrl(report.pageUrl) || getChannelSlugFromUrl(activeTabUrl);
    const channelLabel = channelName ? t("target", { channel: channelName }) : t("targetKick");
    renderChatStatus(report.chatStatus);
    const tabOrder = ["broadcaster", "watch", "bot", "other"];
    const countsByTab = Object.fromEntries(tabOrder.map((tab) => [
      tab,
      users.filter((u) => matchesDetectionTab(u, tab)).length
    ]));
    if (!detectionTabInitialized && users.length && countsByTab[selectedDetectionTab] === 0) {
      const fallbackTab = tabOrder.find((tab) => countsByTab[tab] > 0);
      if (fallbackTab) {
        selectedDetectionTab = fallbackTab;
      }
    }
    detectionTabInitialized = true;
    const filtered = users.filter((u) => matchesDetectionTab(u, selectedDetectionTab));

    channel.textContent = t("detectedCount", { target: channelLabel, count: users.length });
    summary.textContent = "";
    summary.hidden = true;

    // タブバッジ更新
    for (const tab of tabOrder) {
      const badge = document.getElementById(`badge-${tab}`);
      const button = document.querySelector(`#detection-tabs .klt-popup__tab[data-tab="${tab}"]`);
      if (!badge) continue;
      const count = countsByTab[tab];
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
      button?.classList.toggle("is-active", tab === selectedDetectionTab);
    }

    list.replaceChildren();
    if (!filtered.length) {
      renderEmpty(t("empty"));
      return;
    }

    for (const user of filtered) {
      const item = document.createElement("div");
      item.className = "klt-popup__item";
      item.title = t("pinTitle", { username: user.username });

      const badge = createDetectionBadge(user, selectedDetectionTab);
      badge.dataset.pinUsername = user.username;

      const body = document.createElement("span");
      body.className = "klt-popup__item-content";

      const name = document.createElement("button");
      name.className = "klt-popup__name klt-popup__name-button";
      name.type = "button";
      name.dataset.pinUsername = user.username;
      const nameText = document.createElement("span");
      nameText.className = "klt-popup__name-text";
      nameText.textContent = user.username;
      name.append(nameText);
      if (user.detectedMessageAt > 0) {
        const relativeTime = document.createElement("span");
        relativeTime.className = "klt-popup__name-time";
        relativeTime.textContent = formatRelativeTime(user.detectedMessageAt);
        relativeTime.title = new Date(user.detectedMessageAt).toLocaleString();
        name.append(relativeTime);
      }
      name.append(createIcon("pin"));
      name.title = t("popupPinTitle", { username: user.username });

      const reasons = document.createElement("span");
      reasons.className = "klt-popup__reasons";
      const tabReasons = getReasonsForTab(user, selectedDetectionTab);
      const hasScore = (selectedDetectionTab === "bot" || selectedDetectionTab === "other") &&
        Number.isFinite(Number(user.riskScore)) &&
        Number(user.riskScore) > 0 &&
        tabReasons.some((reason) => selectedDetectionTab === "bot" ? isBotReason(reason) : !isBotReason(reason));
      const scoreText = hasScore
        ? t("score", {
          score: Math.max(0, Math.min(100, Math.round(Number(user.riskScore)))),
          rules: Math.max(0, Math.round(Number(user.riskRuleCount) || 0))
        })
        : "";
      const reasonText = tabReasons.length
        ? tabReasons.map(localizeReason).join(" / ")
        : t("detected");
      reasons.textContent = scoreText ? `${scoreText} | ${reasonText}` : reasonText;

      const detail = document.createElement("button");
      detail.className = "klt-popup__item-body";
      detail.type = "button";
      detail.dataset.pinUsername = user.username;
      detail.title = t("popupPinTitle", { username: user.username });
      const pinHint = document.createElement("span");
      pinHint.className = "klt-popup__pin-hint";
      pinHint.append(createIcon("pin"), document.createTextNode(t("fixed")));
      detail.appendChild(reasons);
      const preview = getPreviewMessageForTab(user, selectedDetectionTab);
      if (preview?.text) {
        const message = document.createElement("span");
        message.className = "klt-popup__message";
        message.innerHTML = renderMessageWithEmotes(preview.text);
        detail.appendChild(message);
      }
      detail.appendChild(pinHint);

      body.append(name, detail);

      item.append(badge, body);
      list.appendChild(item);
    }
  }

  function renderChatStatus(status) {
    if (!chatStatus) return;

    const normalized = normalizeChatStatus(status);
    if (!normalized) {
      chatStatus.hidden = true;
      chatStatus.textContent = "";
      chatStatus.removeAttribute("data-level");
      return;
    }

    const label = getChatStatusLabel(normalized.level);
    const windowLabel = t("recentWindow", { minutes: normalized.windowMinutes });
    chatStatus.textContent = `${label}（${windowLabel}）`;
    chatStatus.dataset.level = normalized.level;
    chatStatus.title = `${label} / ${windowLabel} / ${normalized.messageCount} comments / ${normalized.userCount} users`;
    chatStatus.hidden = false;
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

  function getChatStatusLabel(level) {
    const labels = {
      checking: t("chatStatusChecking"),
      quiet: t("chatStatusQuiet"),
      normal: t("chatStatusNormal"),
      active: t("chatStatusActive"),
      caution: t("chatStatusCaution"),
      rough: t("chatStatusRough")
    };
    return labels[level] || labels.normal;
  }

  async function pinDetectedUser(username) {
    if (!activeTabId || !username) return;

    try {
      const response = await sendTabMessage(activeTabId, {
        type: PIN_CONTENT_USER_TYPE,
        username
      });
      summary.textContent = response?.ok
        ? t("pinned", { username })
        : response?.reason || t("cannotPin");
    } catch (_error) {
      summary.textContent = t("reloadKick");
    }
  }

  function createDetectionBadge(user, tab = "") {
    const categories = getTabDetectionCategories(user, tab);
    const stack = document.createElement("span");
    stack.className = "klt-popup__badge-stack";
    stack.title = categories.map(getDetectionLabelForCategory).join(" / ");

    for (const category of categories) {
      stack.appendChild(createCategoryBadge(user, category));
    }

    return stack;
  }

  function formatRelativeTime(timestamp) {
    const value = Number(timestamp) || 0;
    if (!value) return "";

    const diffMs = Math.max(0, Date.now() - value);
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes <= 0) return t("timeJustNow");
    if (diffMinutes < 60) {
      return t("timeMinutesAgo", { count: diffMinutes });
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return t("timeHoursAgo", { count: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    return t("timeDaysAgo", { count: diffDays });
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function createCategoryBadge(user, category) {
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

  function getDetectionCategories(user) {
    const explicit = String(user?.detectionCategory || "");
    const reasons = normalizeDetectionReasons(user?.reasons);
    const categories = [];

    if (reasons.some((reason) => /殺害|危害|暴力|脅迫/.test(reason)) || explicit === "threat") {
      categories.push("threat");
    }
    if (reasons.some((reason) => /暴言|攻撃|性的嫌がらせ|身体侮辱/.test(reason)) || explicit === "abuse") {
      categories.push("abuse");
    }
    if (reasons.some((reason) => /個人情報|住所|電話番号|メール/.test(reason)) || explicit === "privacy") {
      categories.push("privacy");
    }
    if (reasons.includes("ウォッチリスト") || explicit === "watch") {
      categories.push("watch");
    }
    if (reasons.includes("配信者リスト") || explicit === "broadcaster") {
      categories.push("broadcaster");
    }
    if (reasons.some(isBotReason) || explicit === "bot" || (!categories.length && reasons.length)) {
      categories.push("bot");
    }

    return categories.length ? categories : ["default"];
  }

  function getReasonsForTab(user, tab) {
    const reasons = normalizeDetectionReasons(user?.reasons);
    if (!tab) return reasons;
    if (tab === "broadcaster") return reasons.filter((reason) => reason === "配信者リスト");
    if (tab === "watch") return reasons.filter((reason) => reason === "ウォッチリスト");
    if (tab === "bot") return reasons.filter(isBotReason);
    if (tab === "other") {
      const filtered = reasons.filter((reason) => {
        return reason !== "配信者リスト" &&
          reason !== "ウォッチリスト" &&
          !isBotReason(reason);
      });
      return filtered;
    }
    return reasons;
  }

  function getPreviewMessageForTab(user, tab) {
    const evidenceTexts = Array.isArray(user?.evidenceTexts) ? user.evidenceTexts.map(String) : [];
    const tabCategories = getTabDetectionCategories(user, tab);

    if (tabCategories.includes("threat")) {
      const threatEvidence = evidenceTexts.find((text) => /^危害:\s*/.test(text));
      if (threatEvidence) return createPreviewPayload(threatEvidence);
    }

    if (tabCategories.includes("privacy")) {
      const personalInfoEvidence = evidenceTexts.find((text) => /^個人情報:\s*/.test(text));
      if (personalInfoEvidence) return createPreviewPayload(personalInfoEvidence);
    }

    if (tabCategories.includes("abuse")) {
      const abuseEvidence = evidenceTexts.find((text) => /^(暴言|性的嫌がらせ|身体侮辱):\s*/.test(text));
      if (abuseEvidence) return createPreviewPayload(abuseEvidence);
    }

    if (tabCategories.includes("bot")) {
      const botEvidence = evidenceTexts.find((text) => /^(同一文|長文重複|大量反復|絵文字\/スタンプ|URL|反復|反復連投|低情報):\s*/.test(text));
      if (botEvidence) return createPreviewPayload(botEvidence);
    }

    const genericEvidence = evidenceTexts[0];
    if (genericEvidence) return createPreviewPayload(genericEvidence);
    const detectedMessageText = cleanText(String(user?.detectedMessageText || ""));
    if (detectedMessageText) return { text: detectedMessageText };
    return null;
  }

  function createPreviewPayload(evidenceText) {
    const text = String(evidenceText || "").replace(/^[^:]+:\s*/, "");
    return text ? { text } : null;
  }

  function getTabDetectionCategories(user, tab) {
    const allCategories = getDetectionCategories(user);
    if (!tab) return allCategories;

    if (tab === "broadcaster") {
      return allCategories.includes("broadcaster") ? ["broadcaster"] : [];
    }
    if (tab === "watch") {
      return allCategories.includes("watch") ? ["watch"] : [];
    }
    if (tab === "bot") {
      return allCategories.includes("bot") ? ["bot"] : [];
    }
    if (tab === "other") {
      const otherCategories = allCategories.filter((category) => {
        return category !== "broadcaster" &&
          category !== "watch" &&
          category !== "bot";
      });
      if (otherCategories.length) return otherCategories;
      return getReasonsForTab(user, tab).length ? ["default"] : [];
    }

    return allCategories;
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
    if (category === "threat") return t("threat");
    if (category === "abuse") return t("abuse");
    if (category === "privacy") return t("privacy");
    if (category === "watch") return t("watch");
    if (category === "broadcaster") return t("broadcaster");
    if (category === "bot") return t("bot");
    return t("detected");
  }

  function localizeReason(reason) {
    const value = String(reason || "");
    if (UI_LANG === "ja") return value;
    return REASON_LABELS_EN.get(value) || value;
  }

  function isBotReason(reason) {
    return /連投|高頻度|件以上|コメント|間隔|反復|絵文字|スタンプ|BOT|URL|大量反復|同一文/.test(String(reason || ""));
  }

  function normalizeDetectionReasons(reasons) {
    const normalized = [];
    for (const value of Array.isArray(reasons) ? reasons : []) {
      let reason = String(value || "").replace(/\s+/g, " ").trim();
      if (!reason) continue;
      if (reason === "殺害/危害予告らしき投稿") reason = "危害/脅迫性の高い投稿";
      if (!normalized.includes(reason)) normalized.push(reason);
    }
    return normalized;
  }

  function matchesDetectionTab(user, tab) {
    if (!user || !tab) return false;
    return getTabDetectionCategories(user, tab).length > 0;
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
    const dashboardToggle = document.querySelector("#compact-dashboard-enabled");
    if (dashboardToggle) dashboardToggle.checked = settings.compactDashboardEnabled !== false;
    if (botSensitivitySelect) botSensitivitySelect.value = normalizeDetectionSensitivity(settings.botDetectionSensitivity);
    if (otherSensitivitySelect) otherSensitivitySelect.value = normalizeDetectionSensitivity(settings.otherDetectionSensitivity);

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
    if (label) label.textContent = dur === 0 ? "" : t("sec");
  }

  function renderBroadcasterCount(container, values) {
    container.replaceChildren();
    container.style.display = "none";
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
      remove.title = t("removeTitle", { username });
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

  function mergeReports(contentReport, backgroundReport) {
    const primary = normalizeReport(contentReport);
    const secondary = normalizeReport(backgroundReport);
    const activeSlug = getChannelSlugFromUrl(activeTabUrl);
    const reports = [primary, secondary].filter((report) => isReportForActiveChannel(report, activeSlug));
    const chosenMeta = chooseReportMeta(reports, activeSlug);
    const merged = new Map();

    for (const report of reports) {
      for (const user of report.users) {
        const key = normalizeListUsername(user.username);
        if (!key) continue;

        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, {
            ...user,
            reasons: [...new Set(Array.isArray(user.reasons) ? user.reasons : [])]
          });
          continue;
        }

        const reasonSet = new Set([
          ...(Array.isArray(existing.reasons) ? existing.reasons : []),
          ...(Array.isArray(user.reasons) ? user.reasons : [])
        ]);
        const newer = Number(user.lastDetectedAt || 0) >= Number(existing.lastDetectedAt || 0) ? user : existing;

        const mergedDetectedMessageText = choosePreferredDetectedMessageText(
          existing.detectedMessageText,
          user.detectedMessageText
        );

        merged.set(key, {
          ...existing,
          ...newer,
          reasons: [...reasonSet],
          riskScore: Math.max(Number(existing.riskScore) || 0, Number(user.riskScore) || 0),
          riskRuleCount: Math.max(Number(existing.riskRuleCount) || 0, Number(user.riskRuleCount) || 0),
          evidenceTexts: Array.from(new Set([
            ...(Array.isArray(existing.evidenceTexts) ? existing.evidenceTexts : []),
            ...(Array.isArray(user.evidenceTexts) ? user.evidenceTexts : [])
          ])).slice(0, 6),
          detectedMessageId: String(user.detectedMessageId || existing.detectedMessageId || "").slice(0, 120),
          detectedMessageKey: String(user.detectedMessageKey || existing.detectedMessageKey || "").slice(0, 240),
          detectedMessageAt: Math.max(Number(existing.detectedMessageAt) || 0, Number(user.detectedMessageAt) || 0),
          detectedMessageText: mergedDetectedMessageText,
          avatarUrl: user.avatarUrl || existing.avatarUrl || "",
          profileUrl: user.profileUrl || existing.profileUrl || getProfileUrl(user.username || existing.username)
        });
      }
    }

    const users = [...merged.values()].sort(compareDetectedUsersByDiscoveryTime);
    const chatStatus = normalizeChatStatus(chooseChatStatus(reports, chosenMeta)) || createCheckingChatStatus();
    chatStatus.detectionCount = users.length;

    return {
      channelSlug: chosenMeta.channelSlug || "",
      pageUrl: chosenMeta.pageUrl || "",
      updatedAt: Math.max(...reports.map((report) => Number(report.updatedAt) || 0), Date.now()),
      chatStatus,
      users
    };
  }

  function compareDetectedUsersByDiscoveryTime(a, b) {
    const left = Number(a?.detectedMessageAt || a?.lastDetectedAt || a?.firstDetectedAt || 0);
    const right = Number(b?.detectedMessageAt || b?.lastDetectedAt || b?.firstDetectedAt || 0);
    if (right !== left) return right - left;
    return String(a?.username || "").localeCompare(String(b?.username || ""));
  }

  function chooseChatStatus(reports, chosenMeta) {
    const metaStatus = normalizeChatStatus(chosenMeta?.chatStatus);
    if (metaStatus) return metaStatus;

    for (const report of reports) {
      const status = normalizeChatStatus(report?.chatStatus);
      if (status) return status;
    }

    return null;
  }

  function choosePreferredDetectedMessageText(left, right) {
    const a = cleanText(left).slice(0, 180);
    const b = cleanText(right).slice(0, 180);
    if (!a) return b;
    if (!b) return a;
    return b.length > a.length ? b : a;
  }

  function isReportForActiveChannel(report, activeSlug) {
    if (!activeSlug) return true;
    const reportSlug = String(report?.channelSlug || getChannelSlugFromUrl(report?.pageUrl) || "").toLowerCase();
    if (!reportSlug) return true;
    return reportSlug === String(activeSlug).toLowerCase();
  }

  function chooseReportMeta(reports, activeSlug) {
    const candidates = Array.isArray(reports) ? reports : [];
    let best = createEmptyReport();
    let bestScore = -1;

    for (const report of candidates) {
      const score = scoreReportMeta(report, activeSlug);
      if (score > bestScore) {
        best = report;
        bestScore = score;
      }
    }

    return best;
  }

  function scoreReportMeta(report, activeSlug) {
    const slug = String(report?.channelSlug || "").toLowerCase();
    const usersCount = Array.isArray(report?.users) ? report.users.length : 0;
    let score = 0;

    if (activeSlug && slug === String(activeSlug).toLowerCase()) score += 100;
    if (usersCount > 0) score += 40;
    if (slug) score += 20;
    score += Math.min(30, Math.floor((Number(report?.updatedAt) || 0) / 1000) % 30);

    return score;
  }

  function normalizeReport(report) {
    if (!report || typeof report !== "object") return createEmptyReport();

    const users = Array.isArray(report.users)
      ? report.users
        .filter((user) => user && user.username)
        .map((user) => ({
          username: String(user.username || ""),
          profileUrl: String(user.profileUrl || getProfileUrl(user.username || "")),
          avatarUrl: String(user.avatarUrl || ""),
          detectionCategory: String(user.detectionCategory || ""),
          reasons: normalizeDetectionReasons(user.reasons).slice(0, 12),
          riskScore: Number(user.riskScore) || 0,
          riskRuleCount: Number(user.riskRuleCount) || 0,
          riskCritical: Boolean(user.riskCritical),
          evidenceTexts: Array.isArray(user.evidenceTexts) ? user.evidenceTexts.map(String).slice(0, 6) : [],
          firstDetectedAt: Number(user.firstDetectedAt) || 0,
          lastDetectedAt: Number(user.lastDetectedAt) || 0,
          detectedMessageId: String(user.detectedMessageId || "").slice(0, 120),
          detectedMessageKey: String(user.detectedMessageKey || "").slice(0, 240),
          detectedMessageAt: Number(user.detectedMessageAt) || 0,
          detectedMessageText: String(user.detectedMessageText || "").slice(0, 180)
        }))
      : [];

    return {
      channelSlug: String(report.channelSlug || ""),
      pageUrl: String(report.pageUrl || ""),
      updatedAt: Number(report.updatedAt) || 0,
      chatStatus: normalizeChatStatus(report.chatStatus),
      users
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

  function renderMessageWithEmotes(text) {
    if (!text) return "";
    const parts = String(text).split(/(\[emote:\d+:[^\]]+\])/g);
    return parts.map((part) => {
      const emoteMatch = part.match(/^\[emote:(\d+):([^\]]+)\]$/);
      if (emoteMatch) {
        const [, id, name] = emoteMatch;
        const safeName = escapeHtml(name);
        return `<img class="klt-popup__emote" src="https://files.kick.com/emotes/${id}/fullsize" alt="${safeName}" title="${safeName}" loading="lazy">`;
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

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  function sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("tab message timeout"));
      }, 1500);

      chrome.tabs.sendMessage(tabId, message, (response) => {
        window.clearTimeout(timeout);
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
      const timeout = window.setTimeout(() => {
        resolve(null);
      }, 1500);

      chrome.runtime.sendMessage(message, (response) => {
        window.clearTimeout(timeout);
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
      compactDashboardEnabled: next.compactDashboardEnabled !== false,
      botDetectionSensitivity: normalizeDetectionSensitivity(next.botDetectionSensitivity),
      otherDetectionSensitivity: normalizeDetectionSensitivity(next.otherDetectionSensitivity),
      temporaryPopupDuration: clampTemporaryPopupDuration(next.temporaryPopupDuration),
      watchlist: normalizeUsernameList(next.watchlist),
      ignorelist: normalizeUsernameList(next.ignorelist),
      broadcasterList: normalizeUsernameList(next.broadcasterList, MAX_BROADCASTER_LIST_USERS)
    };
  }

  function normalizeDetectionSensitivity(value) {
    const level = String(value || "").trim().toLowerCase();
    return ["low", "standard", "high"].includes(level) ? level : "standard";
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
      broadcasterSyncStatus.textContent = t("broadcasterOff");
      return;
    }

    const status = normalizeFollowedChannelsSyncStatus(followedChannelsSyncStatus);
    const source = status.source ? ` / ${status.source}` : "";
    const syncedUsernames = normalizeUsernameList(status.syncedUsernames, MAX_BROADCASTER_LIST_USERS);
    const syncedCount = syncedUsernames.length || (status.hasSyncedCount ? Number(status.syncedCount) || 0 : 0);
    if (status.state === "success") {
      broadcasterSyncStatus.classList.add("is-success");
      const listCount = Number(status.listCount) || 0;

      if (!status.hasSyncedCount) {
        broadcasterSyncStatus.textContent = t("savedList", { count: listCount, source });
        return;
      }

      const displayedTotal = status.hasTotalCount ? Math.max(Number(status.totalCount) || 0, syncedCount) : 0;
      const total = displayedTotal > 0 ? `/${displayedTotal}` : "";
      broadcasterSyncStatus.textContent = t("autoLoaded", { count: syncedCount, total, source });
      return;
    }

    if (status.state === "failed") {
      broadcasterSyncStatus.classList.add("is-failed");
      broadcasterSyncStatus.textContent = t("autoLoadFailed", { reason: translateKnownStatusReason(status.reason) || t("unknownReason") });
      return;
    }

    if (status.state === "running") {
      if (status.hasSyncedCount && syncedCount > 0) {
        const currentUsername = status.currentUsername || syncedUsernames.at(-1) || "...";
        broadcasterSyncStatus.textContent = t("autoLoadingCurrent", { username: currentUsername, count: syncedCount, source });
      } else {
        broadcasterSyncStatus.textContent = t("autoLoading", { source });
      }
      return;
    }

    broadcasterSyncStatus.textContent = translateKnownStatusReason(status.reason) || t("idleSync");
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
      hasSyncedCount: Object.prototype.hasOwnProperty.call(status, "syncedCount"),
      syncedCount: Number(status.syncedCount) || 0,
      syncedUsernames: normalizeUsernameList(status.syncedUsernames, MAX_BROADCASTER_LIST_USERS),
      currentUsername: String(status.currentUsername || ""),
      listOnlyCount: Number(status.listOnlyCount) || 0,
      removedCount: Number(status.removedCount) || 0,
      pageCount: Number(status.pageCount) || 0,
      stopReason: String(status.stopReason || ""),
      hasTotalCount: Object.prototype.hasOwnProperty.call(status, "hasTotalCount")
        ? Boolean(status.hasTotalCount)
        : (Number(status.totalCount) || 0) > 0,
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
      reason: t("idleSync"),
      updatedAt: 0,
      listCount: 0,
      hasSyncedCount: false,
      syncedCount: 0,
      syncedUsernames: [],
      currentUsername: "",
      listOnlyCount: 0,
      removedCount: 0,
      pageCount: 0,
      stopReason: "",
      hasTotalCount: false,
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
