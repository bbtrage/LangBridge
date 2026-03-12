/**
 * LangBridge — content.js
 * Detects the YouTube video player, mutes it during translation,
 * injects translated audio, and displays the floating overlay UI.
 */

import { AudioPlayer } from './utils/audioPlayer.js';

// ── State ─────────────────────────────────────────────────────────────────────

let isActive = false;
let audioPlayer = null;
let overlayEl = null;
let controlBarEl = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────────

(function init() {
  injectStyles();
  createControlBar();
  createOverlay();

  chrome.runtime.onMessage.addListener(handleMessage);
})();

// ── Message Handler ───────────────────────────────────────────────────────────

function handleMessage(message) {
  switch (message.type) {
    case 'STATUS_UPDATE':
      updateControlBar(message.status);
      break;

    case 'TRANSLATION_RESULT':
      handleTranslationResult(message.payload);
      break;

    default:
      break;
  }
}

// ── Translation Result ────────────────────────────────────────────────────────

function handleTranslationResult(payload) {
  const { original_text, translated_text, emotion, emotion_confidence, audio } = payload;

  // Read stored language preference for flag display
  chrome.storage.sync.get({ targetLanguage: 'en' }, ({ targetLanguage }) => {
    updateOverlay(original_text, translated_text, emotion, emotion_confidence, targetLanguage);
  });

  if (audio && audioPlayer) {
    audioPlayer.enqueue(audio);
  }
}

// ── Video Control ─────────────────────────────────────────────────────────────

function getVideoEl() {
  return document.querySelector('video');
}

function muteVideo(mute) {
  const video = getVideoEl();
  if (video) video.muted = mute;
}

// ── Overlay ───────────────────────────────────────────────────────────────────

const EMOTION_EMOJI = {
  anger: '😠',
  joy: '😄',
  sadness: '😢',
  fear: '😨',
  surprise: '😲',
  disgust: '🤢',
  neutral: '😐',
};

function createOverlay() {
  overlayEl = document.createElement('div');
  overlayEl.id = 'langbridge-overlay';
  overlayEl.style.display = 'none';
  document.body.appendChild(overlayEl);
}

const LANG_FLAG = {
  en: '🇬🇧',
  hi: '🇮🇳',
};

function updateOverlay(original, translated, emotion, confidence, targetLang = 'en') {
  if (!overlayEl) return;
  const emoji = EMOTION_EMOJI[emotion] || '🎭';
  const flag = LANG_FLAG[targetLang] || '🌐';
  overlayEl.innerHTML = `
    <div class="lb-emotion">${emoji} <span>${emotion}</span> <small>${Math.round(confidence * 100)}%</small></div>
    <div class="lb-original">🇯🇵 ${escapeHtml(original)}</div>
    <div class="lb-translated">${flag} ${escapeHtml(translated)}</div>
  `;
  overlayEl.style.display = 'block';
  overlayEl.classList.remove('lb-fade-in');
  // Force reflow then re-add class for animation
  void overlayEl.offsetWidth;
  overlayEl.classList.add('lb-fade-in');
}

// ── Control Bar ───────────────────────────────────────────────────────────────

function createControlBar() {
  controlBarEl = document.createElement('div');
  controlBarEl.id = 'langbridge-controls';

  const btn = document.createElement('button');
  btn.id = 'lb-toggle-btn';
  btn.textContent = '▶ Start';
  btn.addEventListener('click', toggleTranslation);

  const status = document.createElement('span');
  status.id = 'lb-status';
  status.textContent = 'Stopped';

  const logo = document.createElement('span');
  logo.className = 'lb-logo';
  logo.textContent = '🌉 LangBridge';

  controlBarEl.appendChild(logo);
  controlBarEl.appendChild(btn);
  controlBarEl.appendChild(status);
  document.body.appendChild(controlBarEl);
}

function updateControlBar(status) {
  const statusEl = document.getElementById('lb-status');
  const btnEl = document.getElementById('lb-toggle-btn');
  if (!statusEl || !btnEl) return;

  const labels = {
    connecting: '⏳ Connecting…',
    connected: '🔗 Connected',
    active: '🟢 Active',
    reconnecting: '🔄 Reconnecting…',
    stopped: '⏹ Stopped',
    error: '❌ Error',
  };

  statusEl.textContent = labels[status] || status;

  if (status === 'active') {
    isActive = true;
    btnEl.textContent = '⏹ Stop';
    muteVideo(true);
    if (!audioPlayer) audioPlayer = new AudioPlayer();
  } else if (status === 'stopped' || status === 'error') {
    isActive = false;
    btnEl.textContent = '▶ Start';
    muteVideo(false);
    if (overlayEl) overlayEl.style.display = 'none';
  }
}

function toggleTranslation() {
  if (isActive) {
    chrome.runtime.sendMessage({ type: 'STOP_TRANSLATION' });
  } else {
    chrome.runtime.sendMessage({ type: 'START_TRANSLATION' });
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #langbridge-overlay {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.82);
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      font-family: 'Segoe UI', sans-serif;
      font-size: 15px;
      max-width: 680px;
      z-index: 99999;
      backdrop-filter: blur(6px);
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      line-height: 1.5;
    }
    #langbridge-overlay.lb-fade-in {
      animation: lbFadeIn 0.35s ease;
    }
    @keyframes lbFadeIn {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .lb-emotion { font-size: 13px; color: #aaa; margin-bottom: 4px; }
    .lb-emotion span { text-transform: capitalize; font-weight: 600; color: #ffd166; }
    .lb-original { color: #ccc; font-size: 13px; margin-bottom: 2px; }
    .lb-translated { color: #fff; font-size: 16px; font-weight: 500; }

    #langbridge-controls {
      position: fixed;
      top: 12px;
      right: 12px;
      background: rgba(18,18,18,0.92);
      color: #fff;
      padding: 8px 14px;
      border-radius: 10px;
      font-family: 'Segoe UI', sans-serif;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 99999;
      box-shadow: 0 2px 12px rgba(0,0,0,0.5);
      backdrop-filter: blur(6px);
    }
    .lb-logo { font-weight: 700; font-size: 14px; color: #ffd166; }
    #lb-toggle-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    #lb-toggle-btn:hover { background: #1d4ed8; }
    #lb-status { font-size: 12px; color: #9ca3af; }
  `;
  document.head.appendChild(style);
}

// ── Util ──────────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
