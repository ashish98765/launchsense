import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function DemoAnalytics() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/demo/analytics`)
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <p style={page}>Loading demo…</p>;

  const decisionColor =
    data.health === "GO"
      ? "#16a34a"
      : data.health === "KILL"
      ? "#dc2626"
      : "#d97706";

  return (
    <div style={page}>
      <h1>LaunchSense Demo Analysis</h1>
      <p style={{ color: "#666" }}>
        This is a <strong>public demo</strong> using sample data.
      </p>

      <div style={{ ...card, border: `3px solid ${decisionColor}` }}>
        <h2 style={{ color: decisionColor }}>
          FINAL DECISION: {data.health}
        </h2>
      </div>

      <div style={card}>
        <p>Total Sessions: {data.total_sessions}</p>
        <p>Average Risk: {data.average_risk}</p>
        <p>GO: {data.go_percent}%</p>
        <p>ITERATE: {data.iterate_percent}%</p>
        <p>KILL: {data.kill_percent}%</p>
      </div>

      <button
        onClick={() => router.push("/dashboard")}
        style={primaryBtn}
      >
        Analyze Your Own Game →
      </button>
    </div>
  );
}

// ================= STYLES =================
const page = {
  padding: 40,
  maxWidth: 900,
};

const card = {
  marginTop: 24,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "#fafafa",
};

const primaryBtn = {
  marginTop: 30,
  padding: "12px 18px",
  background: "#000",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};
