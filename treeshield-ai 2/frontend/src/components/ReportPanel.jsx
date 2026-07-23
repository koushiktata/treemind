import { api } from "../api";
import { Card, SectionEyebrow, Button } from "./ui";

export default function ReportPanel({ sessionId }) {
  return (
    <Card>
      <SectionEyebrow>Deployment Readiness</SectionEyebrow>
      <h2 className="font-display text-xl text-parchment mb-1">Audit Report</h2>
      <p className="text-sm text-parchment/60 mb-5">
        A plain-text log of every module you've run this session -- attack results, robustness curve, sensitivity
        ranking, hardening outcome, explainability, and fairness -- ready to attach to a model sign-off.
      </p>
      <a href={api.reportUrl(sessionId)} target="_blank" rel="noreferrer">
        <Button variant="ghost">Download report</Button>
      </a>
    </Card>
  );
}
