const TABS = [
  { id: "attack", label: "Attack Engine", ring: "01" },
  { id: "robustness", label: "Robustness", ring: "02" },
  { id: "sensitivity", label: "Sensitivity", ring: "03" },
  { id: "hardening", label: "Hardening", ring: "04" },
  { id: "explain", label: "Explainability", ring: "05" },
  { id: "fairness", label: "Fairness", ring: "06" },
  { id: "report", label: "Report", ring: "07" },
];

export default function TabNav({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`focus-ring rounded-full border px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
            active === t.id
              ? "border-canopy-400 bg-canopy-400/10 text-canopy-300"
              : "border-canopy-700/60 text-parchment/60 hover:border-canopy-500 hover:text-parchment"
          }`}
        >
          <span className="font-mono text-[10px] opacity-60">{t.ring}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
