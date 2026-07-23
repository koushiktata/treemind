import { useState } from "react";
import SetupPanel from "./components/SetupPanel";
import TabNav from "./components/TabNav";
import AttackPanel from "./components/AttackPanel";
import RobustnessPanel from "./components/RobustnessPanel";
import SensitivityPanel from "./components/SensitivityPanel";
import HardeningPanel from "./components/HardeningPanel";
import ExplainPanel from "./components/ExplainPanel";
import FairnessPanel from "./components/FairnessPanel";
import ReportPanel from "./components/ReportPanel";

export default function App() {
  const [state, setState] = useState({ sessionId: null, dataset: null, model: null });
  const [tab, setTab] = useState("attack");

  const modelReady = Boolean(state.model);

  return (
    <div className="min-h-screen bg-canopy-950">
      <header className="border-b border-canopy-700/30">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-canopy-300/70 mb-3">
            AI Security &amp; Reliability Platform
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-parchment leading-tight">
            TreeShield <span className="text-canopy-400">AI</span>
          </h1>
          <p className="mt-3 max-w-2xl text-parchment/60 text-sm md:text-base">
            Before a tree-based model goes into production, TreeShield tests whether it survives an attacker,
            holds up under noise, explains its own decisions, and treats groups fairly -- not just whether it
            scores well on a held-out set.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <SetupPanel state={state} setState={setState} />

        {modelReady ? (
          <>
            <TabNav active={tab} onChange={setTab} />
            {tab === "attack" && <AttackPanel sessionId={state.sessionId} />}
            {tab === "robustness" && <RobustnessPanel sessionId={state.sessionId} />}
            {tab === "sensitivity" && <SensitivityPanel sessionId={state.sessionId} />}
            {tab === "hardening" && <HardeningPanel sessionId={state.sessionId} />}
            {tab === "explain" && <ExplainPanel sessionId={state.sessionId} />}
            {tab === "fairness" && <FairnessPanel sessionId={state.sessionId} dataset={state.dataset} />}
            {tab === "report" && <ReportPanel sessionId={state.sessionId} />}
          </>
        ) : (
          <div className="text-center py-16 text-parchment/40 text-sm">
            Load a dataset and train a model above to unlock the audit modules.
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-xs text-parchment/30 font-mono">
        TreeShield AI -- research-inspired auditing for tree ensembles. Not a substitute for a full security review.
      </footer>
    </div>
  );
}
