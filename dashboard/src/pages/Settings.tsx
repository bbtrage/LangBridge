import { useState, useEffect } from 'react';
import { fetchSettings, updateSettings } from '../services/api';
import type { Settings } from '../services/api';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Default)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emotionIntensity, setEmotionIntensity] = useState(75);
  const [autoMute, setAutoMute] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch(() => {});

    // Load local-only settings
    const stored = localStorage.getItem('lb_local_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.emotionIntensity !== undefined) setEmotionIntensity(parsed.emotionIntensity);
      if (parsed.autoMute !== undefined) setAutoMute(parsed.autoMute);
      if (parsed.showSubtitles !== undefined) setShowSubtitles(parsed.showSubtitles);
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({
        target_language: settings.target_language,
        elevenlabs_voice_id: settings.elevenlabs_voice_id,
      });
      // Persist local-only settings
      localStorage.setItem(
        'lb_local_settings',
        JSON.stringify({ emotionIntensity, autoMute, showSubtitles }),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 max-w-lg mx-auto">
      <header className="flex items-center gap-3 mb-8">
        <Link to="/" className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-yellow-400">⚙ Settings</h1>
      </header>

      <div className="flex flex-col gap-6">
        {/* Target Language */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            Output Language
          </label>
          <div className="flex gap-3">
            {(['en', 'hi'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSettings((s) => ({ ...s, target_language: lang }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  settings.target_language === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {lang === 'en' ? '🇬🇧 English' : '🇮🇳 Hindi'}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selector */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            ElevenLabs Voice
          </label>
          <select
            value={settings.elevenlabs_voice_id ?? ''}
            onChange={(e) =>
              setSettings((s) => ({ ...s, elevenlabs_voice_id: e.target.value }))
            }
            className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Emotion Intensity */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="flex justify-between mb-3">
            <label className="text-sm font-semibold text-gray-300">
              Emotion Intensity
            </label>
            <span className="text-sm text-blue-400 font-mono">{emotionIntensity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={emotionIntensity}
            onChange={(e) => setEmotionIntensity(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            Controls the <code>style</code> parameter scaling for ElevenLabs voice.
          </p>
        </div>

        {/* Toggles */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-4">
          <ToggleRow
            label="Auto-mute original audio"
            checked={autoMute}
            onChange={setAutoMute}
          />
          <ToggleRow
            label="Show subtitle overlay"
            checked={showSubtitles}
            onChange={setShowSubtitles}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors"
        >
          <Save size={16} />
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
