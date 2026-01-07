import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function GameAnalytics() {
  const router = useRouter();
  const { game_id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!game_id) return;

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/game/${game_id}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load analytics");
        setLoading(false);
      });
  }, [game_id]);

  if (loading) return <p style={page}>Analyzing player behavior…</p>;
  if (error) return <p style={{ ...page, color: "red" }}>{error}</p>;

  const decisionColor =
    data.health === "GO"
      ? "#16a34a"
      : data.health === "KILL"
      ? "#dc2626"
      : "#d97706";

  // CONFIDENCE LOGIC
  let confidence = "Low";
  let confidenceNote =
    "Very small sample size. Treat this decision as directional.";

  if (data.total_sessions >= 20) {
    confidence = "Medium";
    confidenceNote =
      "Moderate sample size. Decision is reasonably reliable.";
  }

  if (data.total_sessions >= 50) {
    confidence = "High";
    confidenceNote =
      "Large enough sample size. Decision is statistically stable.";
  }

  const confidenceColor =
    confidence === "High"
      ? "#16a34a"
      : confidence === "Medium"
      ? "#d97706"
      : "#dc2626";

  return (
    <div style={page}>
      <h1>Game Decision Report</h1>
      <p style={{ color: "#666" }}>
        Game ID: <code>{game_id}</code>
      </p>

      {/* FINAL DECISION */}
      <div
        style={{
          border: `3px solid ${decisionColor}`,
          padding: 24,
          borderRadius: 12,
          marginTop: 30,
        }}
      >
        <h2 style={{ color: decisionColor }}>
          FINAL DECISION: {data.health}
        </h2>

        <p style={{ fontSize: 18, marginTop: 10 }}>
          {data.health === "GO" &&
            "Players are engaging well. Core loop shows promise."}
          {data.health === "ITERATE" &&
            "Mixed signals detected. Fix friction points before scaling."}
          {data.health === "KILL" &&
            "High early risk pattern detected. Continuing may waste resources."}
        </p>
      </div>

      {/* CONFIDENCE */}
      <div
        style={{
          marginTop: 24,
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 10,
          background: "#fafafa",
        }}
      >
        <h3>
          Decision Confidence:{" "}
          <span style={{ color: confidenceColor }}>{confidence}</span>
        </h3>
        <p style={{ marginTop: 8 }}>{confidenceNote}</p>
        <p style={{ fontSize: 14, color: "#666" }}>
          Based on {data.total_sessions} session(s).
        </p>
      </div>

      {/* METRICS */}
      <div style={{ display: "flex", gap: 20, marginTop: 30 }}>
        <Metric label="Total Sessions" value={data.total_sessions} />
        <Metric label="Average Risk" value={`${data.average_risk}/100`} />
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <Metric label="GO %" value={`${data.go_percent}%`} />
        <Metric label="ITERATE %" value={`${data.iterate_percent}%`} />
        <Metric label="KILL %" value={`${data.kill_percent}%`} />
      </div>

      <button
        onClick={() => router.push("/dashboard")}
        style={backBtn}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 14, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

const page = {
  padding: 40,
  maxWidth: 900,
};

const backBtn = {
  marginTop: 30,
  padding: "10px 16px",
  background: "#000",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};
