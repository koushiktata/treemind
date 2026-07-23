import { useState } from "react";
import { api } from "../api";
import { Card, SectionEyebrow, Button, Spinner, ErrorNote, StatBlock, VerdictPill } from "./ui";

export default function FairnessPanel({ sessionId, dataset }) {
  const [sensitiveColumn, setSensitiveColumn] = useState("");
  const [privilegedValue, setPrivilegedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function run() {
    if (!sensitiveColumn || !privilegedValue) {
      setError("Name a sensitive column and the privileged group's value.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.runFairness({
        session_id: sessionId,
        sensitive_column: sensitiveColumn,
        privileged_value: privilegedValue,
        favorable_label: 0,
      });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <SectionEyebrow>Fairness</SectionEyebrow>
      <h2 className="font-display text-xl text-parchment mb-1">Fairness Analysis</h2>
      <p className="text-sm text-parchment/60 mb-5">
        Compares outcome rates between a named group and everyone else: demographic parity difference, and equal
        opportunity difference among cases that truly deserve the favorable outcome.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <label className="text-sm">
          <span className="block text-parchment/60 mb-1 font-mono text-xs uppercase tracking-wide">
            Sensitive column
          </span>
          <input
            type="text"
            placeholder="e.g. region"
            value={sensitiveColumn}
            onChange={(e) => setSensitiveColumn(e.target.value)}
            className="focus-ring w-40 rounded-lg bg-canopy-900/60 border border-canopy-700/60 px-3 py-2 text-sm text-parchment placeholder:text-parchment/30"
          />
        </label>
        <label className="text-sm">
          <span className="block text-parchment/60 mb-1 font-mono text-xs uppercase tracking-wide">
            Privileged value
          </span>
          <input
            type="text"
            placeholder="e.g. north"
            value={privilegedValue}
            onChange={(e) => setPrivilegedValue(e.target.value)}
            className="focus-ring w-40 rounded-lg bg-canopy-900/60 border border-canopy-700/60 px-3 py-2 text-sm text-parchment placeholder:text-parchment/30"
          />
        </label>
        <Button onClick={run} disabled={loading}>
          {loading ? <Spinner label="Comparing groups..." /> : "Run fairness analysis"}
        </Button>
      </div>

      {dataset && (
        <p className="text-xs text-parchment/40 mb-3">Dataset columns: {dataset.columns.join(", ")}</p>
      )}

      <ErrorNote message={error} />

      {result && (
        <div className="pt-5 border-t border-canopy-700/40">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatBlock label="Privileged group size" value={result.group_sizes.privileged} />
            <StatBlock label="Other group size" value={result.group_sizes.other} />
            <StatBlock
              label="Favorable rate (privileged)"
              value={`${(result.favorable_rate.privileged * 100).toFixed(1)}%`}
            />
            <StatBlock
              label="Favorable rate (other)"
              value={`${(result.favorable_rate.other * 100).toFixed(1)}%`}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg bg-canopy-900/50 border border-canopy-700/40 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-parchment/70">Demographic parity difference</span>
                <VerdictPill verdict={result.demographic_parity_verdict} />
              </div>
              <p className="font-display text-2xl text-parchment">
                {result.demographic_parity_difference >= 0 ? "+" : ""}
                {result.demographic_parity_difference.toFixed(3)}
              </p>
            </div>
            <div className="rounded-lg bg-canopy-900/50 border border-canopy-700/40 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-parchment/70">Equal opportunity difference</span>
                <VerdictPill verdict={result.equal_opportunity_verdict} />
              </div>
              <p className="font-display text-2xl text-parchment">
                {result.equal_opportunity_difference === null
                  ? "n/a"
                  : `${result.equal_opportunity_difference >= 0 ? "+" : ""}${result.equal_opportunity_difference.toFixed(3)}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
