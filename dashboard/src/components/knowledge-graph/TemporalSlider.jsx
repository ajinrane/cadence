import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

const MONTH_LABELS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
const MILESTONES = [
  { month: 1, label: 'Baseline' },
  { month: 6, label: 'Mid-point' },
  { month: 12, label: 'Mature' },
];

export default function TemporalSlider({ value, onChange, nodeCountByMonth }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);
  const pauseRef = useRef(false);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
    let current = value < 12 ? value : 0;

    intervalRef.current = setInterval(() => {
      if (pauseRef.current) return; // 2s pause at M12
      current++;
      if (current > 12) {
        stop();
        return;
      }
      onChange(current);
      if (current === 12) {
        pauseRef.current = true;
        setTimeout(() => {
          pauseRef.current = false;
        }, 2000);
      }
    }, 800);
  }, [value, onChange, stop]);

  const togglePlay = useCallback(() => {
    if (isPlaying) stop();
    else play();
  }, [isPlaying, play, stop]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onChange(Math.max(1, value - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onChange(Math.min(12, value + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [value, onChange, togglePlay]);

  const maxCount = Math.max(...(nodeCountByMonth || [1]));

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-gray-700 uppercase tracking-wider">
            Knowledge Timeline
          </span>
          <span className="text-[10px] text-gray-400 font-[family-name:var(--font-mono)]">
            Month {value}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {MILESTONES.map((m) => (
            <button
              key={m.month}
              onClick={() => { stop(); onChange(m.month); }}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                value === m.month
                  ? 'bg-[var(--color-agent-cyan)]/20 text-[var(--color-agent-cyan)] border border-[var(--color-agent-cyan)]/30'
                  : 'text-gray-400 hover:text-gray-700 border border-transparent hover:border-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Node count indicators */}
      <div className="flex items-end gap-0 px-1" style={{ height: 24 }}>
        {(nodeCountByMonth || []).map((count, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center"
            style={{ opacity: i + 1 <= value ? 1 : 0.3 }}
          >
            <span className="text-[8px] font-[family-name:var(--font-mono)] text-gray-400 leading-none mb-0.5">
              {count}
            </span>
            <div
              style={{
                width: '60%',
                height: Math.max(2, (count / maxCount) * 14),
                background: i + 1 <= value ? 'var(--color-agent-cyan)' : '#d1d5db',
                borderRadius: 2,
                transition: 'all 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>

      {/* Slider + controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-[var(--color-agent-cyan)] transition-colors cursor-pointer"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <div className="flex-1 relative">
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={value}
            onChange={(e) => { stop(); onChange(Number(e.target.value)); }}
            className="kg-slider w-full"
          />
          {/* Month labels */}
          <div className="flex justify-between px-0.5 mt-0.5">
            {MONTH_LABELS.map((label, i) => (
              <span
                key={label}
                className={`text-[8px] font-[family-name:var(--font-mono)] ${
                  i + 1 === value ? 'text-[var(--color-agent-cyan)] font-bold' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { stop(); onChange(Math.max(1, value - 1)); }}
            className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 cursor-pointer"
            title="Previous month (←)"
          >
            <SkipBack size={11} />
          </button>
          <button
            onClick={() => { stop(); onChange(Math.min(12, value + 1)); }}
            className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 cursor-pointer"
            title="Next month (→)"
          >
            <SkipForward size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
