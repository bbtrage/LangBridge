import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }
    // Store and redirect
    localStorage.setItem('lb_api_key', apiKey.trim());
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🌉</div>
          <h1 className="text-2xl font-bold text-yellow-400">LangBridge</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your API key to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              placeholder="lb_xxxxxxxxxxxxxxxx"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-semibold text-sm transition-colors"
          >
            Sign In
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center mt-6">
          Get your keys at{' '}
          <a
            href="https://groq.com"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            groq.com
          </a>{' '}
          and{' '}
          <a
            href="https://elevenlabs.io"
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:underline"
          >
            elevenlabs.io
          </a>
        </p>
      </div>
    </div>
  );
}
