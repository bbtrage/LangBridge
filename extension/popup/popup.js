/**
 * LangBridge — popup/popup.js
 * Handles UI interactions: toggle translation, language selector, status updates.
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────

const toggleEl     = document.getElementById('toggle-translation');
const statusDotEl  = document.getElementById('status-dot');
const statusTextEl = document.getElementById('status-text');
const latencyEl    = document.getElementById('latency-badge');
const langEl       = document.getElementById('target-lang');

// ── Init ──────────────────────────────────────────────────────────────────────

(async function init() {
  // Restore saved language preference
  const { targetLanguage = 'en' } = await chromeStorageGet(['targetLanguage']);
  langEl.value = targetLanguage;

  // Sync current translation state
  const status = await sendMessage({ type: 'GET_STATUS' });
  if (status && status.isTranslating) {
    toggleEl.checked = true;
    setStatus('active');
  }

  // Listen for status updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATUS_UPDATE') {
      setStatus(message.status);
    }
    if (message.type === 'TRANSLATION_RESULT') {
      const { latency_ms } = message.payload;
      showLatency(latency_ms);
    }
  });
})();

// ── Event Listeners ───────────────────────────────────────────────────────────

toggleEl.addEventListener('change', async () => {
  if (toggleEl.checked) {
    setStatus('connecting');
    await sendMessage({ type: 'START_TRANSLATION' });
  } else {
    await sendMessage({ type: 'STOP_TRANSLATION' });
    setStatus('stopped');
  }
});

langEl.addEventListener('change', () => {
  chrome.storage.sync.set({ targetLanguage: langEl.value });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(status) {
  const labels = {
    connecting:   '⏳ Connecting…',
    connected:    '🔗 Connected',
    active:       '🟢 Active',
    reconnecting: '🔄 Reconnecting…',
    stopped:      '⏹ Stopped',
    error:        '❌ Error',
  };

  const dotClasses = {
    connecting:   'dot-connecting',
    connected:    'dot-connecting',
    active:       'dot-active',
    reconnecting: 'dot-connecting',
    stopped:      'dot-stopped',
    error:        'dot-error',
  };

  statusTextEl.textContent = labels[status] || status;
  statusDotEl.className = `dot ${dotClasses[status] || 'dot-stopped'}`;

  if (status !== 'active') {
    latencyEl.classList.add('hidden');
  }

  // Keep toggle in sync with actual state
  if (status === 'stopped' || status === 'error') {
    toggleEl.checked = false;
  }
}

function showLatency(ms) {
  latencyEl.textContent = `${ms}ms`;
  latencyEl.classList.remove('hidden');
}

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      resolve(response);
    });
  });
}

const settingsLinkEl = document.getElementById('settings-link');

settingsLinkEl?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'http://localhost:5173/settings' });
});

function chromeStorageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, resolve);
  });
}
