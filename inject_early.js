// inject_early.js - document_startで実行、Kickページ既存のWebSocketを読み取り専用で監視する
(function() {
  "use strict";

  if (window.__kltWsHooked) return;
  window.__kltWsHooked = true;
  window.__kltWsBuffer = [];

  const OriginalWebSocket = window.WebSocket;
  const BRIDGE_SOURCE = "KLT_WS_BRIDGE";
  const REQUEST_SOURCE = "KLT_CONTENT_BRIDGE";
  const MAX_BUFFERED_MESSAGES = 200;
  let kltWsSequence = 0;

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
    bufferPayload(enriched);
    postToContent("KLT_WS_CHAT_MESSAGE", enriched);
  }

  function parsePusherMessage(raw) {
    const outer = JSON.parse(raw);
    if (!outer || typeof outer !== "object") return null;
    if (!/ChatMessage/i.test(String(outer.event || ""))) return null;

    const data = typeof outer.data === "string"
      ? JSON.parse(outer.data)
      : outer.data;
    if (!data) return null;

    const msg = data.message || data.chat_message || data.chatMessage || data;
    const sender = msg?.sender || msg?.user || msg?.chatroom_user || {};
    const username = sender.username || sender.slug || msg?.username || msg?.sender_username || "";
    const content = msg?.content ?? msg?.message ?? msg?.text ?? "";
    const msgId = msg?.id || msg?.message_id || msg?.messageId || msg?.uuid || "";
    const createdAt = msg?.created_at || msg?.createdAt || msg?.sent_at || msg?.sentAt || msg?.timestamp || "";
    const emotes = msg?.emotes || msg?.emote || msg?.metadata?.emotes || [];
    if (!username || (!content && !emotes)) return null;

    return {
      username,
      content,
      msgId,
      createdAt,
      emotes
    };
  }

  function KltWebSocket(url, protocols) {
    const ws = protocols
      ? new OriginalWebSocket(url, protocols)
      : new OriginalWebSocket(url);

    const isPusher = typeof url === "string" && url.includes("pusher.com");

    if (isPusher) {
      ws.addEventListener("message", (event) => {
        try {
          const payload = parsePusherMessage(event.data);
          if (payload) publishPayload(payload);
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

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== REQUEST_SOURCE || data.type !== "KLT_REQUEST_WS_BUFFER") return;

    postToContent("KLT_WS_BUFFER", window.__kltWsBuffer.slice(-MAX_BUFFERED_MESSAGES));
  });
})();
