/**
 * LangBridge — background.js (Service Worker)
 * Handles tab audio capture, WebSocket management, and message routing.
 */

import { LangBridgeWebSocket } from './utils/websocket.js';
import { AudioCapture } from './utils/audioCapture.js';

let wsClient = null;
let audioCapture = null;
let currentSessionId = null;
let currentTabId = null;
let isTranslating = false;

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        serverUrl: 'ws://localhost:8000',
        apiKey: '',
        targetLanguage: 'en',
      },
      resolve,
    );
  });
}

function broadcastStatus(status, extra = {}) {
  chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status, ...extra }).catch(() => {});
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { type: 'STATUS_UPDATE', status, ...extra }).catch(() => {});
  }
}

// ── Start Translation ─────────────────────────────────────────────────────────

async function startTranslation(tabId) {
  if (isTranslating) return;

  currentTabId = tabId;
  currentSessionId = generateSessionId();
  const settings = await getSettings();

  broadcastStatus('connecting');

  // Initialise WebSocket
  const wsUrl = `${settings.serverUrl}/ws/translate/${currentSessionId}`;
  wsClient = new LangBridgeWebSocket(wsUrl, {
    onOpen: () => broadcastStatus('connected'),
    onClose: () => {
      if (isTranslating) broadcastStatus('reconnecting');
    },
    onError: (err) => broadcastStatus('error', { error: err }),
    onMessage: (data) => {
      if (data.type === 'translation_result') {
        // Forward result to content script & popup
        chrome.tabs.sendMessage(currentTabId, { type: 'TRANSLATION_RESULT', payload: data }).catch(() => {});
        chrome.runtime.sendMessage({ type: 'TRANSLATION_RESULT', payload: data }).catch(() => {});
      }
    },
  });

  wsClient.connect();

  // Start capturing tab audio
  audioCapture = new AudioCapture({
    onChunk: (base64Chunk) => {
      if (wsClient && wsClient.isConnected()) {
        wsClient.send(JSON.stringify({ type: 'audio_chunk', audio: base64Chunk }));
      }
    },
  });

  try {
    await audioCapture.start(tabId);
    isTranslating = true;
    broadcastStatus('active');
  } catch (err) {
    broadcastStatus('error', { error: err.message });
    cleanup();
  }
}

// ── Stop Translation ──────────────────────────────────────────────────────────

function stopTranslation() {
  cleanup();
  broadcastStatus('stopped');
}

function cleanup() {
  isTranslating = false;
  if (audioCapture) {
    audioCapture.stop();
    audioCapture = null;
  }
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
  currentSessionId = null;
}

// ── Message Handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_TRANSLATION':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) startTranslation(tabs[0].id);
      });
      sendResponse({ ok: true });
      break;

    case 'STOP_TRANSLATION':
      stopTranslation();
      sendResponse({ ok: true });
      break;

    case 'GET_STATUS':
      sendResponse({ isTranslating, sessionId: currentSessionId });
      break;

    default:
      break;
  }
  return true; // Keep message channel open for async responses
});
