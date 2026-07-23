export function Card({ children, className = "" }) {
  return <div className={`ring-panel rounded-2xl p-6 ${className}`}>{children}</div>;
}

export function SectionEyebrow({ children }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-canopy-300/70 mb-2">
      {children}
    </p>
  );
}

export function Button({ children, onClick, disabled, variant = "primary", className = "", type = "button" }) {
  const base =
    "focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-canopy-400 text-canopy-950 hover:bg-canopy-300",
    ghost: "bg-transparent border border-canopy-600/60 text-parchment hover:border-canopy-400 hover:text-canopy-300",
    danger: "bg-signal-rust/90 text-parchment hover:bg-signal-rust",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center gap-3 text-sm text-canopy-300">
      <span className="relative flex h-4 w-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-canopy-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-4 w-4 bg-canopy-500" />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}

export function VerdictPill({ verdict }) {
  const styles = {
    strong: "bg-canopy-400/15 text-canopy-300 border-canopy-400/40",
    moderate: "bg-signal-moss/15 text-signal-moss border-signal-moss/40",
    weak: "bg-signal-amber/15 text-signal-amber border-signal-amber/40",
    critical: "bg-signal-rust/15 text-signal-rust border-signal-rust/40",
    fair: "bg-canopy-400/15 text-canopy-300 border-canopy-400/40",
    watch: "bg-signal-amber/15 text-signal-amber border-signal-amber/40",
    concerning: "bg-signal-rust/15 text-signal-rust border-signal-rust/40",
    accept: "bg-canopy-400/15 text-canopy-300 border-canopy-400/40",
    reject: "bg-signal-rust/15 text-signal-rust border-signal-rust/40",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-mono uppercase tracking-wide ${styles[verdict] || "border-canopy-600 text-parchment"}`}>
      {verdict}
    </span>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p className="text-sm text-signal-rust bg-signal-rust/10 border border-signal-rust/30 rounded-lg px-3 py-2 mt-3">
      {message}
    </p>
  );
}

export function StatBlock({ label, value, sub }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-canopy-300/70">{label}</p>
      <p className="font-display text-2xl text-parchment mt-1">{value}</p>
      {sub && <p className="text-xs text-parchment/50 mt-0.5">{sub}</p>}
    </div>
  );
}
