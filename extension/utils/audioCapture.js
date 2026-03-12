/**
 * LangBridge — utils/audioCapture.js
 * Captures tab audio and streams 16kHz mono PCM chunks via a callback.
 */

export class AudioCapture {
  constructor({ onChunk, chunkIntervalMs = 500 } = {}) {
    this._onChunk = onChunk;
    this._chunkIntervalMs = chunkIntervalMs;
    this._audioCtx = null;
    this._sourceNode = null;
    this._processorNode = null;
    this._stream = null;
    this._pcmBuffer = [];
    this._intervalId = null;
  }

  async start(tabId) {
    this._stream = await this._captureTab(tabId);
    this._audioCtx = new AudioContext({ sampleRate: 16000 });

    this._sourceNode = this._audioCtx.createMediaStreamSource(this._stream);

    // ScriptProcessorNode — deprecated but widely supported in extensions
    this._processorNode = this._audioCtx.createScriptProcessor(4096, 1, 1);
    this._processorNode.onaudioprocess = (event) => {
      const channelData = event.inputBuffer.getChannelData(0);
      const pcm16 = this._float32ToPcm16(channelData);
      this._pcmBuffer.push(pcm16);
    };

    this._sourceNode.connect(this._processorNode);
    this._processorNode.connect(this._audioCtx.destination);

    // Flush buffer every chunkIntervalMs
    this._intervalId = setInterval(() => this._flush(), this._chunkIntervalMs);
  }

  stop() {
    clearInterval(this._intervalId);
    this._intervalId = null;

    if (this._processorNode) {
      this._processorNode.disconnect();
      this._processorNode = null;
    }
    if (this._sourceNode) {
      this._sourceNode.disconnect();
      this._sourceNode = null;
    }
    if (this._audioCtx) {
      this._audioCtx.close();
      this._audioCtx = null;
    }
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
    }
    this._pcmBuffer = [];
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _captureTab(tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabCapture.capture(
        { audio: true, video: false },
        (stream) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!stream) {
            reject(new Error('tabCapture returned null stream'));
          } else {
            resolve(stream);
          }
        },
      );
    });
  }

  _flush() {
    if (this._pcmBuffer.length === 0 || !this._onChunk) return;

    const totalLength = this._pcmBuffer.reduce((s, a) => s + a.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this._pcmBuffer) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    this._pcmBuffer = [];

    // Base64-encode and send
    const base64 = btoa(String.fromCharCode(...combined));
    this._onChunk(base64);
  }

  _float32ToPcm16(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }
}
