const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  health: () => fetch(`${BASE_URL}/api/health`).then(handle),

  loadSampleDataset: (sessionId) => {
    const form = new FormData();
    if (sessionId) form.append("session_id", sessionId);
    return fetch(`${BASE_URL}/api/dataset/sample`, { method: "POST", body: form }).then(handle);
  },

  uploadDataset: (file, targetColumn, sessionId) => {
    const form = new FormData();
    form.append("file", file);
    form.append("target_column", targetColumn);
    if (sessionId) form.append("session_id", sessionId);
    return fetch(`${BASE_URL}/api/dataset/upload`, { method: "POST", body: form }).then(handle);
  },

  train: (payload) =>
    fetch(`${BASE_URL}/api/model/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  modelInfo: (sessionId) =>
    fetch(`${BASE_URL}/api/model/info?session_id=${encodeURIComponent(sessionId)}`).then(handle),

  runAttack: (payload) =>
    fetch(`${BASE_URL}/api/attack/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  runRobustness: (payload) =>
    fetch(`${BASE_URL}/api/robustness/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  runSensitivity: (payload) =>
    fetch(`${BASE_URL}/api/sensitivity/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  runHardening: (payload) =>
    fetch(`${BASE_URL}/api/hardening/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  runExplain: (payload) =>
    fetch(`${BASE_URL}/api/explain/shap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  runFairness: (payload) =>
    fetch(`${BASE_URL}/api/fairness/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  reportUrl: (sessionId) => `${BASE_URL}/api/report?session_id=${encodeURIComponent(sessionId)}`,
};
