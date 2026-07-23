import { useState } from "react";
import { api } from "../api";
import { Card, SectionEyebrow, Button, Spinner, ErrorNote } from "./ui";

export default function ExplainPanel({ sessionId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [localIndex, setLocalIndex] = useState(0);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await api.runExplain({ session_id: sessionId, local_index: localIndex });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const maxImportance = result ? Math.max(...result.global_feature_importance.map((f) => f.mean_abs_shap), 1e-9) : 1;
  const maxContribution = result?.local_explanation
    ? Math.max(...result.local_explanation.top_contributions.map((c) => Math.abs(c.shap_value)), 1e-9)
    : 1;

  return (
    <Card>
      <SectionEyebrow>Explainability</SectionEyebrow>
      <h2 className="font-display text-xl text-parchment mb-1">SHAP Feature Attribution</h2>
      <p className="text-sm text-parchment/60 mb-5">
        Exact SHAP values via TreeExplainer -- global importance across the test set, plus a single-sample
        breakdown of which features pushed the prediction which way.
      </p>

      <div className="flex items-end gap-4 mb-5">
        <label className="text-sm">
          <span className="block text-parchment/60 mb-1 font-mono text-xs uppercase tracking-wide">
            Local sample index
          </span>
          <input
            type="number"
            min="0"
            value={localIndex}
            onChange={(e) => setLocalIndex(parseInt(e.target.value || "0", 10))}
            className="focus-ring w-28 rounded-lg bg-canopy-900/60 border border-canopy-700/60 px-3 py-2 text-sm text-parchment"
          />
        </label>
        <Button onClick={run} disabled={loading}>
          {loading ? <Spinner label="Computing SHAP values..." /> : "Explain model"}
        </Button>
      </div>

      <ErrorNote message={error} />

      {result && (
        <div className="pt-5 border-t border-canopy-700/40 grid md:grid-cols-2 gap-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-canopy-300/70 mb-3">
              Global feature importance
            </p>
            <div className="space-y-2">
              {result.global_feature_importance.slice(0, 10).map((f) => (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="text-sm text-parchment/80 w-36 truncate">{f.feature}</span>
                  <div className="flex-1 bg-canopy-900/60 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-canopy-400 h-2.5 rounded-full"
                      style={{ width: `${(f.mean_abs_shap / maxImportance) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-parchment/50 w-14 text-right">
                    {f.mean_abs_shap.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {result.local_explanation && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-canopy-300/70 mb-3">
                Sample #{result.local_explanation.sample_index} -- predicted class {result.local_explanation.prediction}
              </p>
              <div className="space-y-2">
                {result.local_explanation.top_contributions.map((c) => (
                  <div key={c.feature} className="flex items-center gap-3">
                    <span className="text-sm text-parchment/80 w-32 truncate">{c.feature}</span>
                    <div className="flex-1 relative h-2.5 bg-canopy-900/60 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 h-2.5 ${c.shap_value >= 0 ? "bg-signal-moss left-1/2" : "bg-signal-rust right-1/2"} rounded-full`}
                        style={{ width: `${(Math.abs(c.shap_value) / maxContribution / 2) * 100}%` }}
                      />
                      <div className="absolute left-1/2 top-0 w-px h-full bg-canopy-600" />
                    </div>
                    <span className="text-xs font-mono text-parchment/50 w-14 text-right">
                      {c.shap_value >= 0 ? "+" : ""}
                      {c.shap_value.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
