// inject_early.js - document_startで実行、Kickページ既存のWebSocketを読み取り専用で監視する
(function() {
  "use strict";

  if (window.__kltWsHooked) return;
  window.__kltWsHooked = true;
  window.__kltWsBuffer = [];
  window.__kltFollowedApiBuffer = [];

  const OriginalWebSocket = window.WebSocket;
  const OriginalFetch = window.fetch;
  const OriginalXHROpen = window.XMLHttpRequest?.prototype?.open;
  const OriginalXHRSend = window.XMLHttpRequest?.prototype?.send;
  const BRIDGE_SOURCE = "KLT_WS_BRIDGE";
  const REQUEST_SOURCE = "KLT_CONTENT_BRIDGE";
  const MAX_BUFFERED_MESSAGES = 200;
  const MAX_BUFFERED_FOLLOWED_RESPONSES = 20;
  let kltWsSequence = 0;
  let kltWsRawMessages = 0;
  let kltWsParsedMessages = 0;

  function postToContent(type, payload) {
    window.postMessage({
      source: BRIDGE_SOURCE,
      type,
      payload
    }, window.location.origin);
  }

  function bufferPayload(payload) {
    window.__kltWsBuffer.push(payload);
    if (window.__kltWsBuffer.length > MAX_BUFFERED_MESSAGES) {
      window.__kltWsBuffer.splice(0, window.__kltWsBuffer.length - MAX_BUFFERED_MESSAGES);
    }
  }

  function publishPayload(payload) {
    const enriched = {
      ...payload,
      kltSeq: ++kltWsSequence
    };
    kltWsParsedMessages += 1;
    bufferPayload(enriched);
    postToContent("KLT_WS_CHAT_MESSAGE", enriched);
  }

  function publishWsStatus(extra = {}) {
    postToContent("KLT_WS_HOOK_STATUS", {
      hooked: true,
      rawMessages: kltWsRawMessages,
      parsedMessages: kltWsParsedMessages,
      bufferSize: window.__kltWsBuffer.length,
      ...extra
    });
  }

  function isFollowedApiUrl(url) {
    try {
      const parsed = new URL(String(url), window.location.href);
      if (parsed.origin !== window.location.origin) return false;
      return /\/api\/.*\/channels\/followed/i.test(parsed.pathname) ||
        /\/api\/.*\/channels\/followed-page/i.test(parsed.pathname);
    } catch (_error) {
      return false;
    }
  }

  function isHistoryApiUrl(url) {
    try {
      const parsed = new URL(String(url), window.location.href);
      return parsed.origin === "https://web.kick.com" &&
        /^\/api\/v1\/chat\/[0-9]+\/history$/i.test(parsed.pathname);
    } catch (_error) {
      return false;
    }
  }

  function bufferFollowedPayload(payload) {
    window.__kltFollowedApiBuffer.push(payload);
    if (window.__kltFollowedApiBuffer.length > MAX_BUFFERED_FOLLOWED_RESPONSES) {
      window.__kltFollowedApiBuffer.splice(0, window.__kltFollowedApiBuffer.length - MAX_BUFFERED_FOLLOWED_RESPONSES);
    }
  }

  function publishFollowedPayload(payload) {
    bufferFollowedPayload(payload);
    postToContent("KLT_FOLLOWED_API_RESPONSE", payload);
  }

  function captureFollowedApiResponse(url, data) {
    if (!isFollowedApiUrl(url) || !data || typeof data !== "object") return;
    publishFollowedPayload({
      url: String(url),
      capturedAt: Date.now(),
      data
    });
  }

  function parsePusherMessage(raw) {
    const outer = JSON.parse(raw);
    if (!outer || typeof outer !== "object") return null;

    const data = typeof outer.data === "string"
      ? JSON.parse(outer.data)
      : outer.data;
    if (!data) return null;

    const msg = findChatMessagePayload(data);
    if (!msg) return null;
    const sender = msg?.sender || msg?.user || msg?.chatroom_user || msg?.author || {};
    const username = sender.username || sender.slug || msg?.username || msg?.sender_username || "";
    const content = msg?.content ?? msg?.message ?? msg?.text ?? msg?.body ?? "";
    const msgId = msg?.id || msg?.message_id || msg?.messageId || msg?.uuid || data?.id || data?.message_id || "";
    const createdAt = msg?.created_at || msg?.createdAt || msg?.sent_at || msg?.sentAt || msg?.timestamp || "";
    const emotes = msg?.emotes || msg?.emote || msg?.metadata?.emotes || [];
    if (!username || (!content && !emotes)) return null;

    return {
      username,
      content,
      msgId,
      id: msg?.id || data?.id || "",
      messageId: msg?.messageId || data?.messageId || "",
      message_id: msg?.message_id || data?.message_id || "",
      uuid: msg?.uuid || data?.uuid || "",
      eventId: outer?.event_id || outer?.eventId || "",
      event: outer?.event || "",
      channel: outer?.channel || "",
      createdAt,
      emotes
    };
  }

  function findChatMessagePayload(value, depth = 0) {
    if (!value || depth > 4) return null;

    if (typeof value === "string") {
      try {
        return findChatMessagePayload(JSON.parse(value), depth + 1);
      } catch (_error) {
        return null;
      }
    }

    if (typeof value !== "object") return null;

    const direct = value.message || value.chat_message || value.chatMessage || value.data;
    if (direct && typeof direct === "object") {
      const nested = findChatMessagePayload(direct, depth + 1);
      if (nested) return nested;
    }

    if (looksLikeChatMessagePayload(value)) return value;

    const containers = [
      value.payload,
      value.event,
      value.attributes,
      value.metadata,
      value.result
    ];

    for (const container of containers) {
      if (!container || typeof container !== "object") continue;
      const nested = findChatMessagePayload(container, depth + 1);
      if (nested) return nested;
    }

    return null;
  }

  function looksLikeChatMessagePayload(value) {
    const sender = value?.sender || value?.user || value?.chatroom_user || value?.author || {};
    const username = sender.username || sender.slug || value?.username || value?.sender_username || "";
    const content = value?.content ?? value?.message ?? value?.text ?? value?.body ?? "";
    const emotes = value?.emotes || value?.emote || value?.metadata?.emotes || [];
    return Boolean(username && (content || (Array.isArray(emotes) && emotes.length)));
  }

  function KltWebSocket(url, protocols) {
    const ws = protocols
      ? new OriginalWebSocket(url, protocols)
      : new OriginalWebSocket(url);

    const isPusher = typeof url === "string" && url.includes("pusher.com");

    if (isPusher) {
      ws.addEventListener("message", (event) => {
        try {
          kltWsRawMessages += 1;
          const payload = parsePusherMessage(event.data);
          if (payload) publishPayload(payload);
          else if (kltWsRawMessages % 25 === 1) publishWsStatus({ lastEventAt: Date.now() });
        } catch (_e) {}
      });
    }

    return ws;
  }

  KltWebSocket.prototype = OriginalWebSocket.prototype;
  Object.defineProperties(KltWebSocket, {
    CONNECTING: { value: OriginalWebSocket.CONNECTING },
    OPEN:       { value: OriginalWebSocket.OPEN },
    CLOSING:    { value: OriginalWebSocket.CLOSING },
    CLOSED:     { value: OriginalWebSocket.CLOSED },
  });

  window.WebSocket = KltWebSocket;
  publishWsStatus({ installedAt: Date.now() });

  if (typeof OriginalFetch === "function") {
    window.fetch = function(...args) {
      return OriginalFetch.apply(this, args).then((response) => {
        try {
          const url = response?.url || args[0];
          if (isFollowedApiUrl(url)) {
            response.clone().json().then((data) => {
              captureFollowedApiResponse(url, data);
            }).catch(() => {});
          }
        } catch (_error) {}
        return response;
      });
    };
  }

  if (OriginalXHROpen && OriginalXHRSend) {
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__kltUrl = url;
      return OriginalXHROpen.call(this, method, url, ...rest);
    };

    window.XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener("load", function() {
        try {
          const url = this.responseURL || this.__kltUrl;
          if (!isFollowedApiUrl(url)) return;
          const contentType = this.getResponseHeader?.("content-type") || "";
          if (!/json/i.test(contentType) && typeof this.responseText !== "string") return;
          const data = typeof this.response === "object" && this.response !== null
            ? this.response
            : JSON.parse(this.responseText || "null");
          captureFollowedApiResponse(url, data);
        } catch (_error) {}
      }, { once: true });
      return OriginalXHRSend.apply(this, args);
    };
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== REQUEST_SOURCE) return;

    if (data.type === "KLT_REQUEST_WS_BUFFER") {
      postToContent("KLT_WS_BUFFER", window.__kltWsBuffer.slice(-MAX_BUFFERED_MESSAGES));
      publishWsStatus({ requestedAt: Date.now() });
      return;
    }

    if (data.type === "KLT_REQUEST_WS_STATUS") {
      publishWsStatus({ requestedAt: Date.now() });
      return;
    }

    if (data.type === "KLT_REQUEST_FOLLOWED_BUFFER") {
      postToContent("KLT_FOLLOWED_BUFFER", window.__kltFollowedApiBuffer.slice(-MAX_BUFFERED_FOLLOWED_RESPONSES));
      return;
    }

    if (data.type === "KLT_FETCH_HISTORY") {
      const requestId = String(data.requestId || "");
      const url = String(data.url || "");
      if (!requestId || !isHistoryApiUrl(url)) {
        postToContent("KLT_FETCH_HISTORY_RESULT", {
          requestId,
          ok: false,
          status: 0,
          error: "invalid history url"
        });
        return;
      }

      OriginalFetch.call(window, url, {
        credentials: "include",
        mode: "cors",
        headers: {
          "Accept": "application/json, text/plain, */*"
        }
      }).then((response) => {
        response.text().then((text) => {
          let data = null;
          try {
            data = JSON.parse(text);
          } catch (_error) {}

          postToContent("KLT_FETCH_HISTORY_RESULT", {
            requestId,
            ok: response.ok,
            status: response.status,
            url: response.url,
            data,
            text: data ? "" : text.slice(0, 1000)
          });
        }).catch((error) => {
          postToContent("KLT_FETCH_HISTORY_RESULT", {
            requestId,
            ok: false,
            status: response.status,
            url: response.url,
            error: String(error?.message || error || "")
          });
        });
      }).catch((error) => {
        postToContent("KLT_FETCH_HISTORY_RESULT", {
          requestId,
          ok: false,
          status: 0,
          error: String(error?.message || error || "")
        });
      });
    }
  });
})();
