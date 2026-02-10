import { AlertTriangle } from 'lucide-react';

export default function KnowledgeLossToggle({
  active,
  onToggle,
  prunedCount,
  lostInsightLabels,
  crcNodeCount,
  disabled,
}) {
  const insufficientData = crcNodeCount < 5;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (!insufficientData) onToggle();
          }}
          disabled={disabled || insufficientData}
          className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
            insufficientData
              ? 'bg-gray-200 opacity-50 cursor-not-allowed'
              : active
                ? 'bg-red-500/30 border border-red-500/50'
                : 'bg-gray-200 border border-gray-300 hover:border-gray-400'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
              active
                ? 'left-[22px] bg-red-500'
                : 'left-0.5 bg-gray-400'
            }`}
          />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-gray-700">
            CRC Turnover Simulation
          </span>
          {active && prunedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {prunedCount} removed
            </span>
          )}
        </div>
      </div>

      {insufficientData ? (
        <p className="text-[10px] text-gray-400 flex items-center gap-1.5 pl-[52px]">
          <AlertTriangle size={10} className="text-gray-400 flex-shrink-0" />
          Insufficient institutional knowledge at this stage to simulate meaningful turnover impact
        </p>
      ) : (
        <p className="text-[10px] text-gray-400 pl-[52px]">
          Removes ~40% of highest-connectivity knowledge nodes
        </p>
      )}

      {active && lostInsightLabels && lostInsightLabels.length > 0 && (
        <div className="pl-[52px] flex flex-col gap-0.5 mt-0.5">
          {lostInsightLabels.slice(0, 3).map((label, i) => (
            <p key={i} className="text-[10px] text-red-400/80 truncate">
              Lost: &ldquo;{label}&rdquo;
            </p>
          ))}
          {lostInsightLabels.length > 3 && (
            <p className="text-[10px] text-red-400/60">
              +{lostInsightLabels.length - 3} more insights lost
            </p>
          )}
        </div>
      )}
    </div>
  );
}
