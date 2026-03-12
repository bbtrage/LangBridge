const EMOTION_META: Record<
  string,
  { emoji: string; label: string; color: string; bgColor: string }
> = {
  anger:    { emoji: '😠', label: 'Anger',    color: 'text-red-400',    bgColor: 'bg-red-950' },
  joy:      { emoji: '😄', label: 'Joy',      color: 'text-yellow-400', bgColor: 'bg-yellow-950' },
  sadness:  { emoji: '😢', label: 'Sadness',  color: 'text-blue-400',   bgColor: 'bg-blue-950' },
  fear:     { emoji: '😨', label: 'Fear',     color: 'text-purple-400', bgColor: 'bg-purple-950' },
  surprise: { emoji: '😲', label: 'Surprise', color: 'text-orange-400', bgColor: 'bg-orange-950' },
  disgust:  { emoji: '🤢', label: 'Disgust',  color: 'text-green-400',  bgColor: 'bg-green-950' },
  neutral:  { emoji: '😐', label: 'Neutral',  color: 'text-gray-400',   bgColor: 'bg-gray-900' },
};

interface Props {
  emotion: string;
  confidence: number;
}

export default function EmotionIndicator({ emotion, confidence }: Props) {
  const meta = EMOTION_META[emotion] ?? EMOTION_META['neutral'];
  const pct = Math.round(confidence * 100);

  return (
    <div className={`${meta.bgColor} rounded-xl p-4 border border-gray-800 flex flex-col items-center gap-2`}>
      <span className="text-5xl">{meta.emoji}</span>
      <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${meta.color.replace('text-', 'bg-')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{pct}% confidence</span>
    </div>
  );
}
