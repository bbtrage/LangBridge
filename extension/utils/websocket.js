/**
 * LangBridge — utils/websocket.js
 * WebSocket client with auto-reconnect (exponential backoff) and heartbeat.
 */

const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_INTERVAL_MS = 30000;

export class LangBridgeWebSocket {
  constructor(url, { onOpen, onClose, onError, onMessage } = {}) {
    this._url = url;
    this._onOpen = onOpen || (() => {});
    this._onClose = onClose || (() => {});
    this._onError = onError || (() => {});
    this._onMessage = onMessage || (() => {});

    this._ws = null;
    this._reconnectAttempt = 0;
    this._reconnectTimer = null;
    this._heartbeatTimer = null;
    this._queue = []; // messages buffered during disconnection
    this._shouldReconnect = true;
  }

  connect() {
    this._shouldReconnect = true;
    this._openSocket();
  }

  disconnect() {
    this._shouldReconnect = false;
    this._clearTimers();
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
  }

  send(data) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(data);
    } else {
      // Queue message for when connection is re-established
      this._queue.push(data);
    }
  }

  isConnected() {
    return this._ws !== null && this._ws.readyState === WebSocket.OPEN;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _openSocket() {
    this._ws = new WebSocket(this._url);

    this._ws.onopen = () => {
      this._reconnectAttempt = 0;
      this._startHeartbeat();
      this._flushQueue();
      this._onOpen();
    };

    this._ws.onclose = (event) => {
      this._clearTimers();
      this._onClose(event);
      if (this._shouldReconnect) {
        this._scheduleReconnect();
      }
    };

    this._ws.onerror = (event) => {
      this._onError(event);
    };

    this._ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return; // heartbeat response
        this._onMessage(data);
      } catch {
        // Ignore non-JSON frames
      }
    };
  }

  _scheduleReconnect() {
    const delay = BACKOFF_DELAYS_MS[
      Math.min(this._reconnectAttempt, BACKOFF_DELAYS_MS.length - 1)
    ];
    this._reconnectAttempt++;
    this._reconnectTimer = setTimeout(() => this._openSocket(), delay);
  }

  _startHeartbeat() {
    this._heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this._ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  _clearTimers() {
    clearTimeout(this._reconnectTimer);
    clearInterval(this._heartbeatTimer);
    this._reconnectTimer = null;
    this._heartbeatTimer = null;
  }

  _flushQueue() {
    while (this._queue.length > 0 && this.isConnected()) {
      this._ws.send(this._queue.shift());
    }
  }
}
