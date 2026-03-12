import type { TranslationResult } from '../services/api';

const EMOTION_EMOJI: Record<string, string> = {
  anger: '😠',
  joy: '😄',
  sadness: '😢',
  fear: '😨',
  surprise: '😲',
  disgust: '🤢',
  neutral: '😐',
};

interface Props {
  result: TranslationResult;
}

export default function TranslationOverlay({ result }: Props) {
  const { original_text, translated_text, emotion, latency_ms } = result;
  const emoji = EMOTION_EMOJI[emotion] ?? '🎭';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-yellow-400 capitalize">
          {emoji} {emotion}
        </span>
        <span className="text-xs bg-gray-800 text-green-400 rounded px-2 py-0.5 font-mono">
          {latency_ms}ms
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-1">🇯🇵 {original_text}</p>
      <p className="text-base text-white font-medium">🇬🇧 {translated_text}</p>
    </div>
  );
}
