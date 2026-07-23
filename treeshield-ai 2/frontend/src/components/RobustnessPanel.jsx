import { useState } from "react";
import { api } from "../api";
import { Card, SectionEyebrow, Button, Spinner, ErrorNote, StatBlock, VerdictPill } from "./ui";
import RingDiagram from "./RingDiagram";

export default function RobustnessPanel({ sessionId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await api.runRobustness({ session_id: sessionId });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <SectionEyebrow>Module 2</SectionEyebrow>
      <h2 className="font-display text-xl text-parchment mb-1">Robustness Verification</h2>
      <p className="text-sm text-parchment/60 mb-5">
        Sweeps the attack budget from small to large and measures the fraction of correctly-classified samples that
        stay correctly classified at each budget -- an empirical lower bound on robustness, read like growth rings.
      </p>

      <Button onClick={run} disabled={loading}>
        {loading ? <Spinner label="Sweeping budgets..." /> : "Run robustness sweep"}
      </Button>

      <ErrorNote message={error} />

      {result && (
        <div className="pt-6 mt-5 border-t border-canopy-700/40 grid md:grid-cols-[260px_1fr] gap-8 items-center">
          <div className="flex flex-col items-center gap-3">
            <RingDiagram curve={result.curve} />
            <VerdictPill verdict={result.overall_verdict} />
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <StatBlock label="Clean accuracy" value={`${(result.clean_accuracy * 100).toFixed(1)}%`} />
              <StatBlock label="Overall verdict" value={result.overall_verdict} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-parchment/50 font-mono text-xs uppercase tracking-wide text-left">
                  <th className="py-1.5 font-normal">Epsilon</th>
                  <th className="py-1.5 font-normal">Robust accuracy</th>
                  <th className="py-1.5 font-normal">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {result.curve.map((p) => (
                  <tr key={p.epsilon} className="border-t border-canopy-700/30">
                    <td className="py-2 font-mono">{p.epsilon}</td>
                    <td className="py-2 font-mono">{(p.robust_accuracy * 100).toFixed(1)}%</td>
                    <td className="py-2">
                      <VerdictPill verdict={p.verdict} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
