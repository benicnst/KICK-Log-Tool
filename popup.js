(() => {
  "use strict";

  const GET_CONTENT_REPORT_TYPE = "KLT_GET_SUSPICIOUS_USERS";
  const CLEAR_CONTENT_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_USERS";
  const GET_BACKGROUND_REPORT_TYPE = "KLT_GET_SUSPICIOUS_REPORT";
  const CLEAR_BACKGROUND_REPORT_TYPE = "KLT_CLEAR_SUSPICIOUS_REPORT";

  const summary = document.querySelector("#summary");
  const list = document.querySelector("#list");
  const clearButton = document.querySelector("#clear");
  let activeTabId = 0;

  init();

  clearButton.addEventListener("click", async () => {
    if (!activeTabId) return;

    clearButton.disabled = true;
    try {
      await sendTabMessage(activeTabId, { type: CLEAR_CONTENT_REPORT_TYPE });
    } catch (_error) {
      await sendRuntimeMessage({ type: CLEAR_BACKGROUND_REPORT_TYPE, tabId: activeTabId });
    }

    renderReport(createEmptyReport());
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest(".klt-popup__item");
    if (!button) return;

    const url = button.dataset.profileUrl;
    if (!url) return;
    chrome.tabs.create({ url });
  });

  async function init() {
    const tab = await getActiveTab();
    activeTabId = tab?.id || 0;

    if (!activeTabId) {
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

  function renderReport(report) {
    const users = Array.isArray(report.users) ? report.users : [];
    clearButton.disabled = users.length === 0;

    const channel = report.channelSlug ? ` / ${report.channelSlug}` : "";
    summary.textContent = users.length
      ? `検出 ${users.length}件${channel}`
      : `検出はありません${channel}`;

    list.replaceChildren();
    if (!users.length) {
      renderEmpty("ドクロ判定されたアカウントはまだありません。");
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
      skull.textContent = "💀";

      const body = document.createElement("span");
      const name = document.createElement("span");
      name.className = "klt-popup__name";
      name.textContent = user.username;

      const reasons = document.createElement("span");
      reasons.className = "klt-popup__reasons";
      reasons.textContent = Array.isArray(user.reasons) && user.reasons.length
        ? user.reasons.join(" / ")
        : "ドクロ判定";

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

  function renderEmpty(message) {
    list.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "klt-popup__empty";
    empty.textContent = message;
    list.appendChild(empty);
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

  function getProfileUrl(username) {
    return `https://kick.com/${encodeURIComponent(String(username || "").replace(/^@/, ""))}`;
  }
})();
