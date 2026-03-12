import { useAppStore } from '../store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import TranslationOverlay from '../components/TranslationOverlay';
import EmotionIndicator from '../components/EmotionIndicator';
import AudioControls from '../components/AudioControls';
import { Link } from 'react-router-dom';
import { Activity, Settings } from 'lucide-react';

export default function Dashboard() {
  const { translations, latencyHistory } = useAppStore();
  const latest = translations[0] ?? null;

  const charsToday = translations.reduce(
    (acc, t) => acc + t.translated_text.length,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">🌉 LangBridge</h1>
          <p className="text-sm text-gray-400">Real-time emotional video translation</p>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <Settings size={16} /> Settings
        </Link>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Chars Translated</p>
          <p className="text-2xl font-bold text-green-400">{charsToday.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">API Calls</p>
          <p className="text-2xl font-bold text-blue-400">{translations.length}</p>
        </div>
      </div>

      {/* Latency Chart */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">Latency (ms)</h2>
        </div>
        {latencyHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={latencyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#60a5fa' }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-600 text-sm text-center py-8">No data yet — start translating!</p>
        )}
      </div>

      {/* Emotion + Controls */}
      {latest && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <EmotionIndicator emotion={latest.emotion} confidence={latest.emotion_confidence} />
          <AudioControls audioBase64={latest.audio} />
        </div>
      )}

      {/* Translation Feed */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Translation Feed
        </h2>
        {translations.length === 0 ? (
          <p className="text-gray-600 text-sm">Waiting for translations…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {translations.slice(0, 5).map((t, i) => (
              <TranslationOverlay key={i} result={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
