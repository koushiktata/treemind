import { useState } from "react";
import { api } from "../api";
import { Card, SectionEyebrow, Button, Spinner, ErrorNote, StatBlock, VerdictPill } from "./ui";

export default function AttackPanel({ sessionId }) {
  const [epsilon, setEpsilon] = useState(0.15);
  const [strategy, setStrategy] = useState("greedy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await api.runAttack({ session_id: sessionId, epsilon, strategy });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <SectionEyebrow>Module 1</SectionEyebrow>
      <h2 className="font-display text-xl text-parchment mb-1">Adversarial Attack Engine</h2>
      <p className="text-sm text-parchment/60 mb-5">
        Black-box, query-only search that nudges each test sample's most influential features to try to flip the
        model's prediction within a perturbation budget -- no gradients required.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-5">
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
        <label className="text-sm">
          <span className="block text-parchment/60 mb-1 font-mono text-xs uppercase tracking-wide">Strategy</span>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="focus-ring rounded-lg bg-canopy-900/60 border border-canopy-700/60 px-3 py-2 text-sm text-parchment"
          >
            <option value="greedy">Greedy (coordinate search)</option>
            <option value="random">Random baseline</option>
          </select>
        </label>
        <Button onClick={run} disabled={loading}>
          {loading ? <Spinner label="Attacking..." /> : "Run attack"}
        </Button>
      </div>

      <ErrorNote message={error} />

      {result && (
        <div className="pt-5 border-t border-canopy-700/40">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatBlock
              label="Attack success rate"
              value={`${(result.attack_success_rate * 100).toFixed(0)}%`}
              sub={`${result.successful_attacks}/${result.n_samples_tested} samples flipped`}
            />
            <StatBlock
              label="Avg. L2 distance"
              value={result.avg_l2_distance ? result.avg_l2_distance.toFixed(3) : "n/a"}
              sub="std-normalized"
            />
            <StatBlock label="Epsilon used" value={epsilon.toFixed(2)} />
            <StatBlock label="Strategy" value={strategy} />
          </div>

          {result.most_exploited_features.length > 0 && (
            <div className="mb-6">
              <p className="font-mono text-xs uppercase tracking-wide text-canopy-300/70 mb-2">
                Most exploited features
              </p>
              <div className="space-y-1.5">
                {result.most_exploited_features.map((f) => (
                  <div key={f.feature} className="flex items-center gap-3">
                    <span className="text-sm text-parchment/80 w-40 truncate">{f.feature}</span>
                    <div className="flex-1 bg-canopy-900/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-signal-rust h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (f.times_perturbed / result.most_exploited_features[0].times_perturbed) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-parchment/50 w-8 text-right">{f.times_perturbed}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.example_adversarial_cases.length > 0 && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-canopy-300/70 mb-2">Example flip</p>
              {(() => {
                const ex = result.example_adversarial_cases[0];
                const changed = Object.keys(ex.original).filter(
                  (k) => Math.abs(ex.original[k] - ex.adversarial[k]) > 1e-9
                );
                return (
                  <div className="rounded-lg bg-canopy-900/50 border border-canopy-700/40 p-4 text-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-parchment/60">prediction:</span>
                      <VerdictPill verdict={ex.original_pred === 1 ? "critical" : "strong"} />
                      <span className="text-parchment/40">&rarr;</span>
                      <VerdictPill verdict={ex.adversarial_pred === 1 ? "critical" : "strong"} />
                      <span className="text-parchment/40 ml-auto font-mono text-xs">L2 = {ex.l2_distance?.toFixed(3)}</span>
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                      {changed.map((k) => (
                        <div key={k} className="flex justify-between text-parchment/70">
                          <span>{k}</span>
                          <span>
                            {ex.original[k].toFixed(2)} <span className="text-canopy-400">&rarr;</span>{" "}
                            {ex.adversarial[k].toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
