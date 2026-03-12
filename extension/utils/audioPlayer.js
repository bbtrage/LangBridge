/**
 * LangBridge — utils/audioPlayer.js
 * Receives base64 MP3 audio chunks, decodes them, and plays them sequentially
 * using the Web Audio API with smooth transitions.
 */

export class AudioPlayer {
  constructor() {
    this._audioCtx = new AudioContext();
    this._queue = [];
    this._isPlaying = false;
    this._nextStartTime = 0;
  }

  /**
   * Enqueue a base64-encoded MP3 chunk for playback.
   * @param {string} base64Mp3
   */
  enqueue(base64Mp3) {
    const binaryStr = atob(base64Mp3);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    this._decode(bytes.buffer);
  }

  stop() {
    this._queue = [];
    this._isPlaying = false;
    this._nextStartTime = 0;
    if (this._audioCtx.state !== 'closed') {
      this._audioCtx.close();
      this._audioCtx = null;
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  async _decode(arrayBuffer) {
    if (!this._audioCtx) {
      this._audioCtx = new AudioContext();
    }
    try {
      const audioBuffer = await this._audioCtx.decodeAudioData(arrayBuffer);
      this._schedulePlayback(audioBuffer);
    } catch (err) {
      console.warn('[LangBridge] Audio decode error:', err);
    }
  }

  _schedulePlayback(audioBuffer) {
    if (!this._audioCtx) return;
    const source = this._audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this._audioCtx.destination);

    // Schedule immediately after the previous chunk ends to avoid gaps
    const currentTime = this._audioCtx.currentTime;
    const startAt = Math.max(currentTime, this._nextStartTime);
    source.start(startAt);
    this._nextStartTime = startAt + audioBuffer.duration;
  }
}
