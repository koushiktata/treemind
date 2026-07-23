import { useState } from "react";
import { api } from "../api";
import { Card, SectionEyebrow, Button, Spinner, ErrorNote, StatBlock, VerdictPill } from "./ui";

function Delta({ before, after, pct = true }) {
  const diff = after - before;
  const positive = diff >= 0;
  return (
    <span className={`font-mono text-xs ml-2 ${positive ? "text-canopy-300" : "text-signal-rust"}`}>
      {positive ? "+" : ""}
      {pct ? (diff * 100).toFixed(1) + "pp" : diff.toFixed(3)}
    </span>
  );
}

export default function HardeningPanel({ sessionId }) {
  const [epsilon, setEpsilon] = useState(0.15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await api.runHardening({ session_id: sessionId, epsilon });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <SectionEyebrow>Module 4</SectionEyebrow>
      <h2 className="font-display text-xl text-parchment mb-1">Adversarial Hardening</h2>
      <p className="text-sm text-parchment/60 mb-5">
        Generates adversarial examples near training points, relabels them with their true class, and retrains --
        then checks whether the harder model actually improved before adopting it.
      </p>

      <div className="flex items-end gap-4 mb-5">
        <label className="text-sm">
          <span className="block text-parchment/60 mb-1 font-mono text-xs uppercase tracking-wide">Epsilon (budget)</span>
          <input
            type="range"
            min="0.02"
            max="0.4"
            step="0.01"
            value={epsilon}
            onChange={(e) => setEpsilon(parseFloat(e.target.value))}
            className="w-44 accent-canopy-400"
          />
          <span className="ml-2 font-mono text-canopy-300">{epsilon.toFixed(2)}</span>
        </label>
        <Button onClick={run} disabled={loading}>
          {loading ? <Spinner label="Hardening model..." /> : "Run hardening"}
        </Button>
      </div>

      <ErrorNote message={error} />

      {result && (
        <div className="pt-5 border-t border-canopy-700/40">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm text-parchment/60">Verdict:</span>
            <VerdictPill verdict={result.recommendation} />
            <span className="text-xs text-parchment/50">
              {result.recommendation === "accept"
                ? "hardened model adopted for this session"
                : "kept the original model -- insufficient or negative gain"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-canopy-300/70 mb-2">Before</p>
              <StatBlock label="Clean accuracy" value={`${(result.before.clean_accuracy * 100).toFixed(1)}%`} />
              <div className="mt-3">
                <StatBlock label="Robust accuracy" value={`${(result.before.robust_accuracy * 100).toFixed(1)}%`} />
              </div>
              <div className="mt-3">
                <StatBlock label="F1" value={result.before.f1.toFixed(3)} />
              </div>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-canopy-300/70 mb-2">After</p>
              <StatBlock
                label="Clean accuracy"
                value={
                  <>
                    {(result.after.clean_accuracy * 100).toFixed(1)}%
                    <Delta before={result.before.clean_accuracy} after={result.after.clean_accuracy} />
                  </>
                }
              />
              <div className="mt-3">
                <StatBlock
                  label="Robust accuracy"
                  value={
                    <>
                      {(result.after.robust_accuracy * 100).toFixed(1)}%
                      <Delta before={result.before.robust_accuracy} after={result.after.robust_accuracy} />
                    </>
                  }
                />
              </div>
              <div className="mt-3">
                <StatBlock
                  label="F1"
                  value={
                    <>
                      {result.after.f1.toFixed(3)}
                      <Delta before={result.before.f1} after={result.after.f1} pct={false} />
                    </>
                  }
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-parchment/50 mt-5">
            {result.n_adversarial_examples_added} adversarial training examples generated and added at &epsilon;={result.epsilon}.
          </p>
        </div>
      )}
    </Card>
  );
}
