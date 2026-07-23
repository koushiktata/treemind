import { useState } from "react";
import { api } from "../api";
import { Card, SectionEyebrow, Button, Spinner, ErrorNote, StatBlock } from "./ui";

const ALGORITHMS = [
  { id: "random_forest", label: "Random Forest" },
  { id: "xgboost", label: "XGBoost" },
  { id: "lightgbm", label: "LightGBM" },
  { id: "catboost", label: "CatBoost" },
];

export default function SetupPanel({ state, setState }) {
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [loadingTrain, setLoadingTrain] = useState(false);
  const [error, setError] = useState("");
  const [algorithm, setAlgorithm] = useState("random_forest");
  const [targetColumn, setTargetColumn] = useState("");
  const [file, setFile] = useState(null);

  async function loadSample() {
    setError("");
    setLoadingDataset(true);
    try {
      const res = await api.loadSampleDataset(state.sessionId);
      setState((s) => ({ ...s, sessionId: res.session_id, dataset: res, model: null }));
      setTargetColumn(res.target_column);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingDataset(false);
    }
  }

  async function upload() {
    if (!file || !targetColumn) {
      setError("Choose a CSV file and name the target column first.");
      return;
    }
    setError("");
    setLoadingDataset(true);
    try {
      const res = await api.uploadDataset(file, targetColumn, state.sessionId);
      setState((s) => ({ ...s, sessionId: res.session_id, dataset: res, model: null }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingDataset(false);
    }
  }

  async function train() {
    setError("");
    setLoadingTrain(true);
    try {
      const res = await api.train({ session_id: state.sessionId, algorithm, target_column: targetColumn });
      setState((s) => ({ ...s, model: res }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTrain(false);
    }
  }

  return (
    <Card>
      <SectionEyebrow>Step 1 -- Dataset &amp; Model</SectionEyebrow>
      <h2 className="font-display text-xl text-parchment mb-4">Plant a model to inspect</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-sm text-parchment/70">Use the built-in transaction-risk sample dataset, or upload your own CSV.</p>
          <Button onClick={loadSample} disabled={loadingDataset} variant="ghost">
            {loadingDataset ? <Spinner label="Loading sample data..." /> : "Load sample fraud-detection dataset"}
          </Button>

          <div className="pt-2 border-t border-canopy-700/40 mt-3 space-y-2">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="focus-ring block w-full text-xs text-parchment/70 file:mr-3 file:rounded-lg file:border-0 file:bg-canopy-700 file:px-3 file:py-2 file:text-parchment file:text-xs"
            />
            <input
              type="text"
              placeholder="target column name (e.g. is_fraud)"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="focus-ring w-full rounded-lg bg-canopy-900/60 border border-canopy-700/60 px-3 py-2 text-sm text-parchment placeholder:text-parchment/30"
            />
            <Button onClick={upload} disabled={loadingDataset} variant="ghost">
              Upload CSV
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-parchment/70">Choose the tree ensemble to train and audit.</p>
          <div className="grid grid-cols-2 gap-2">
            {ALGORITHMS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAlgorithm(a.id)}
                className={`focus-ring rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                  algorithm === a.id
                    ? "border-canopy-400 bg-canopy-400/10 text-canopy-300"
                    : "border-canopy-700/60 text-parchment/70 hover:border-canopy-500"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <Button onClick={train} disabled={!state.dataset || loadingTrain}>
            {loadingTrain ? <Spinner label="Training..." /> : "Train model"}
          </Button>
        </div>
      </div>

      <ErrorNote message={error} />

      {state.dataset && (
        <div className="mt-6 pt-6 border-t border-canopy-700/40 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBlock label="Rows" value={state.dataset.n_rows} />
          <StatBlock label="Columns" value={state.dataset.columns.length} />
          <StatBlock label="Target" value={state.dataset.target_column} />
          <StatBlock label="Session" value={state.sessionId.slice(0, 8)} />
        </div>
      )}

      {state.model && (
        <div className="mt-6 pt-6 border-t border-canopy-700/40 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBlock label="Algorithm" value={state.model.algorithm.replace("_", " ")} />
          <StatBlock label="Accuracy" value={`${(state.model.metrics.accuracy * 100).toFixed(1)}%`} />
          <StatBlock label="F1" value={state.model.metrics.f1.toFixed(3)} />
          <StatBlock
            label="ROC AUC"
            value={state.model.metrics.roc_auc ? state.model.metrics.roc_auc.toFixed(3) : "n/a"}
          />
        </div>
      )}
    </Card>
  );
}
