import { useState } from "react";
import { api } from "../api";
import { Card, SectionEyebrow, Button, Spinner, ErrorNote, StatBlock } from "./ui";

export default function SensitivityPanel({ sessionId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await api.runSensitivity({ session_id: sessionId });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const maxFlip = result ? Math.max(...result.features.map((f) => f.flip_rate), 0.001) : 1;

  return (
    <Card>
      <SectionEyebrow>Module 3</SectionEyebrow>
      <h2 className="font-display text-xl text-parchment mb-1">Data-aware Sensitivity Analysis</h2>
      <p className="text-sm text-parchment/60 mb-5">
        Nudges each feature by a small percentage of its own observed range (not an arbitrary fixed step) and
        measures how often that alone flips the prediction -- surfacing fragile features even without an attacker.
      </p>

      <Button onClick={run} disabled={loading}>
        {loading ? <Spinner label="Perturbing features..." /> : "Run sensitivity analysis"}
      </Button>

      <ErrorNote message={error} />

      {result && (
        <div className="pt-6 mt-5 border-t border-canopy-700/40">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatBlock label="Features tested" value={result.features.length} />
            <StatBlock label="Samples tested" value={result.n_samples_tested} />
            <StatBlock label="High-sensitivity features" value={result.high_sensitivity_features.length} />
          </div>

          <div className="space-y-2">
            {result.features.map((f) => (
              <div key={f.feature} className="flex items-center gap-3">
                <span className="text-sm text-parchment/80 w-44 truncate">{f.feature}</span>
                <div className="flex-1 bg-canopy-900/60 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${f.flip_rate > 0.15 ? "bg-signal-rust" : "bg-canopy-400"}`}
                    style={{ width: `${(f.flip_rate / maxFlip) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-parchment/50 w-14 text-right">
                  {(f.flip_rate * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
