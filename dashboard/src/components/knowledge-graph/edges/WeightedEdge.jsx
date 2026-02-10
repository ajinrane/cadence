import { getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { useState } from 'react';

const relationshipLabels = {
  received: 'Received',
  produced: 'Produced',
  experienced: 'Experienced',
  informed: 'Informed',
  recommends: 'Recommends',
  builds_on: 'Builds On',
};

export default function WeightedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, style,
  markerEnd,
}) {
  const [hovered, setHovered] = useState(false);
  const weight = data?.weight ?? 0.5;
  const isHighlighted = data?._highlighted;

  const strokeWidth = 1 + weight * 4;
  const baseOpacity = weight < 0.3 ? 0.25 : 0.3 + weight * 0.5;
  const opacity = isHighlighted ? Math.min(1, baseOpacity + 0.3) : baseOpacity;

  // High confidence: animated dashed, Low: solid
  const isHighConfidence = weight > 0.7;
  const dashArray = isHighConfidence ? '6 3' : undefined;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  return (
    <>
      {/* Invisible wider path for hover target */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {/* Glow layer for highlighted edges */}
      {isHighlighted && (
        <path
          d={edgePath}
          fill="none"
          stroke={data?._highlightColor || '#8b5cf6'}
          strokeWidth={strokeWidth + 4}
          strokeOpacity={0.15}
          strokeLinecap="round"
        />
      )}
      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={isHighlighted ? (data?._highlightColor || '#8b5cf6') : (style?.stroke || '#506690')}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        markerEnd={markerEnd}
        style={isHighConfidence ? { animation: 'kg-dash-flow 1.5s linear infinite' } : undefined}
        className={hovered ? 'kg-edge-hovered' : ''}
      />
      {/* Hover tooltip */}
      {hovered && (
        <EdgeLabelRenderer>
          <div
            className="kg-edge-tooltip"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {relationshipLabels[data?.relationship] || data?.relationship}
            </div>
            <div>Weight: {(weight * 100).toFixed(0)}%</div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
