export interface TranslationResult {
  type: 'translation_result';
  original_text: string;
  translated_text: string;
  emotion: string;
  emotion_confidence: number;
  audio: string;
  latency_ms: number;
  timestamp: number;
}

export interface Settings {
  target_language: 'en' | 'hi';
  elevenlabs_voice_id: string;
  log_level: string;
  max_sessions: number;
}

const BASE = '/api';

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(
  patch: Partial<Pick<Settings, 'target_language' | 'elevenlabs_voice_id'>>,
): Promise<void> {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update settings');
}

export async function fetchHealth(): Promise<{ status: string; version: string }> {
  const res = await fetch('/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
