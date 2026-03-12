import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface Props {
  audioBase64: string;
}

export default function AudioControls({ audioBase64 }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioBase64) return;
    const blob = base64ToBlob(audioBase64, 'audio/mpeg');
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audio.volume = muted ? 0 : volume;
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(url);
    };

    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
    };
  }, [audioBase64]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = muted ? 0 : v;
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex flex-col gap-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Audio Controls</p>

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolume}
          className="flex-1 accent-blue-500"
        />
      </div>
    </div>
  );
}

function base64ToBlob(b64: string, mimeType: string): Blob {
  const byteChars = atob(b64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNums)], { type: mimeType });
}
