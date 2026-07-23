const VERDICT_COLOR = {
  strong: "#7dbb8b",
  moderate: "#8fae4e",
  weak: "#e0a94a",
  critical: "#c2603b",
};

/**
 * Renders the robustness curve as concentric growth rings -- the outermost
 * ring is the smallest epsilon (easiest to defend), the innermost is the
 * largest (hardest). A tree's rings record years of growth under changing
 * conditions; here they record how a model holds up as the attacker's
 * budget grows. Ring width encodes robust accuracy at that budget.
 */
export default function RingDiagram({ curve, size = 260 }) {
  if (!curve || curve.length === 0) return null;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 8;
  const minR = 26;
  const step = (maxR - minR) / curve.length;

  // outermost ring = first epsilon (smallest), innermost = last (largest)
  const rings = [...curve].reverse();

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Robustness ring diagram">
      <circle cx={cx} cy={cy} r={maxR + 4} fill="none" stroke="#1a3524" strokeWidth="1" />
      {rings.map((point, i) => {
        const r = maxR - i * step;
        const strokeWidth = Math.max(6, step - 3);
        const color = VERDICT_COLOR[point.verdict] || "#7dbb8b";
        return (
          <circle
            key={point.epsilon}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${2 * Math.PI * r * point.robust_accuracy} ${2 * Math.PI * r}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={0.92}
          >
            <title>{`ε=${point.epsilon}: ${(point.robust_accuracy * 100).toFixed(0)}% robust (${point.verdict})`}</title>
          </circle>
        );
      })}
      <circle cx={cx} cy={cy} r={minR - 8} fill="#122619" stroke="#234a30" />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        fill="#f2ede0"
        fontFamily="'Fraunces', serif"
        fontSize="15"
        fontWeight="600"
      >
        {curve.length}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="#7dbb8b" fontFamily="'Inter', sans-serif" fontSize="8">
        budgets tested
      </text>
    </svg>
  );
}
