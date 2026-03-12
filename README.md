# 🌉 LangBridge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)

> **Real-time emotional video translation.**  
> Watch anime in your language — with the emotion intact. 🎭

---

## 🎯 What It Does

LangBridge translates **Japanese dialogue to English (or Hindi)** in near real-time while **preserving the emotional tone of the voice output**. Think of it as live emotional dubbing — not just subtitles.

When Tanjiro screams in rage → the translated voice sounds **ANGRY**.  
When Nezuko cries → the translated voice sounds **SAD**.

---

## 🏗️ Architecture

```
Chrome Extension (Tab Audio Capture)
        ↓ WebSocket stream (PCM audio chunks)
Backend Server (FastAPI + Python)
        ↓
┌─────────────────────────────────────┐
│  Audio Buffer & VAD                 │  ← Energy-based Voice Activity Detection
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│  STT: Groq Whisper Large V3         │  ← Streaming Speech-to-Text (free)
│  (Japanese → Japanese text)         │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│  Translation Engine                 │  ← Japanese → English / Hindi
│  (Google Translate API)             │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│  Emotion Detector                   │  ← j-hartmann/emotion-english-distilroberta
│  (runs locally on CPU)              │     angry / sad / happy / fearful /
└──────────────────┬──────────────────┘     surprised / disgusted / neutral
                   ↓
┌─────────────────────────────────────┐
│  Emotional TTS                      │  ← ElevenLabs Multilingual V2
│  (ElevenLabs API)                   │     dynamic emotion voice settings
└──────────────────┬──────────────────┘
                   ↓
        Audio Response (MP3)
                   ↓
Chrome Extension (Audio Playback)
        ↓
Synchronized playback alongside muted original video
```

---

## 📁 Project Structure

```
langbridge/
├── extension/                  # Chrome Extension (MV3)
│   ├── manifest.json
│   ├── background.js           # Service worker, tab audio capture
│   ├── content.js              # Video detection, overlay UI
│   ├── popup/                  # Popup UI
│   └── utils/                  # Audio capture, WebSocket, player
│
├── backend/                    # FastAPI server
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── api/                    # Routes + middleware
│   ├── core/                   # Pipeline, buffer, sessions
│   ├── services/               # STT, translation, emotion, TTS
│   └── utils/                  # Audio utils, structured logger
│
├── dashboard/                  # React + TypeScript + Vite dashboard
│   └── src/
│       ├── pages/              # Dashboard, Settings, Login
│       ├── components/         # TranslationOverlay, EmotionIndicator, AudioControls
│       └── services/           # API client
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🖼️ Demo

> *Screenshots / GIF coming soon — run the app and see it live!*

---

## ✅ Prerequisites

- **Python 3.11+**
- **Node.js 18+** (for dashboard)
- **Google Chrome** (for extension)
- [Groq API key](https://groq.com) — free signup, no credit card
- [ElevenLabs API key](https://elevenlabs.io) — free tier: 10,000 chars/month

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/bbtrage/LangBridge.git
cd LangBridge
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env and fill in your API keys:
#   GROQ_API_KEY=...
#   ELEVENLABS_API_KEY=...
```

### 3. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The server will be available at `http://localhost:8000`.  
API docs: `http://localhost:8000/docs`

### 4. (Optional) Start with Docker

```bash
docker-compose up --build
```

### 5. Start the Dashboard

```bash
cd dashboard
npm install
npm run dev
# Opens at http://localhost:5173
```

### 6. Load the Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder

### 7. Start Translating! 🎉

1. Open YouTube and play a Japanese anime video
2. Click the **LangBridge** extension icon
3. Toggle **Translation ON**
4. The original audio mutes and translated audio plays with emotion

---

## 🔑 Getting API Keys

### Groq (STT)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Create an API key under *API Keys*
4. Limit: 7,200 requests/day on free tier

### ElevenLabs (Emotional TTS)
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign up (free)
3. Go to *Profile → API Keys*
4. Free tier: 10,000 characters/month (~2 hours of anime dialogue)

---

## 🎭 Emotion → Voice Mapping

The core feature of LangBridge is the emotion-to-voice mapping:

| Emotion  | Emoji | Stability | Similarity | Style |
|----------|-------|-----------|------------|-------|
| Anger    | 😠    | 0.3       | 0.8        | 0.9   |
| Joy      | 😄    | 0.5       | 0.7        | 0.7   |
| Sadness  | 😢    | 0.8       | 0.6        | 0.4   |
| Fear     | 😨    | 0.2       | 0.9        | 0.8   |
| Surprise | 😲    | 0.3       | 0.8        | 0.8   |
| Disgust  | 🤢    | 0.4       | 0.7        | 0.6   |
| Neutral  | 😐    | 0.7       | 0.5        | 0.0   |

---

## 🛠️ Troubleshooting

**Extension doesn't capture audio**
- Make sure you're on a YouTube page and the video is playing
- Check that the extension has `tabCapture` permission enabled

**Backend crashes on startup**
- Ensure your `.env` has valid API keys
- Check `GROQ_API_KEY` and `ELEVENLABS_API_KEY` are set

**High latency (> 5 seconds)**
- Check your internet connection
- Groq's free tier occasionally has higher latency under load

**No audio output**
- Verify ElevenLabs API key is valid
- Check browser autoplay policy — click the page first

---

## 🗺️ Roadmap

- [x] MVP: Chrome extension + FastAPI backend + emotional TTS
- [ ] Silero VAD integration (replace energy-based VAD)
- [ ] Multi-speaker support
- [ ] Lip sync approximation
- [ ] Mobile app (React Native)
- [ ] Self-hosted TTS option (Bark / Coqui)
- [ ] Hindi output voice fine-tuning

---

## 📄 License

MIT © 2024 bbtrage