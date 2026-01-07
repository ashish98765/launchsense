// frontend/pages/result.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { submitDecision } from "../lib/api";

export default function Result() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;

    const {
      game_id,
      player_id,
      session_id,
      playtime,
      deaths,
      restarts,
      early_quit,
    } = router.query;

    async function runDecision() {
      try {
        const data = await submitDecision({
          game_id,
          player_id,
          session_id,
          playtime: Number(playtime),
          deaths: Number(deaths),
          restarts: Number(restarts),
          early_quit: early_quit === "true",
        });

        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    runDecision();
  }, [router.isReady]);

  if (loading) {
    return <div style={{ padding: 40 }}>⏳ Analyzing decision…</div>;
  }

  if (error) {
    return <div style={{ padding: 40, color: "red" }}>❌ {error}</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>LaunchSense Decision</h2>

      <p>
        <strong>Risk Score:</strong> {result.risk_score}
      </p>

      <p>
        <strong>Decision:</strong> {result.decision}
      </p>

      {result.decision === "KILL" && (
        <div style={{ color: "red", marginTop: 20 }}>
          <strong>⚠ Kill Mode Activated</strong>
          <p>This decision is irreversible.</p>
        </div>
      )}

      {result.decision === "ITERATE" && (
        <div style={{ color: "orange", marginTop: 20 }}>
          <strong>🔁 Iterate Required</strong>
          <p>Fix core issues before scaling.</p>
        </div>
      )}

      {result.decision === "GO" && (
        <div style={{ color: "green", marginTop: 20 }}>
          <strong>🚀 GO Decision</strong>
          <p>Product is healthy to move forward.</p>
        </div>
      )}
    </div>
  );
}
