import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function GameDashboard() {
  const router = useRouter();
  const { game_id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!game_id) return;

    const fetchAnalytics = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/game/${game_id}`
        );
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [game_id]);

  if (loading) return <p style={{ padding: 40 }}>Analyzing data…</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  const color =
    data.health === "GO"
      ? "green"
      : data.health === "KILL"
      ? "red"
      : "orange";

  return (
    <div style={{ padding: 40, maxWidth: 720 }}>
      <h1>Game Analytics</h1>
      <p>
        <strong>Game ID:</strong> {game_id}
      </p>
      <hr />

      {data.total_sessions === 0 && (
        <div style={{ border: "1px dashed #aaa", padding: 20 }}>
          <p>No data yet. Run a demo to see how LaunchSense works.</p>
          <button
            onClick={async () => {
              await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/demo/${game_id}`,
                { method: "POST" }
              );
              location.reload();
            }}
            style={{
              padding: "10px 16px",
              background: "black",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Run Demo Analysis
          </button>
        </div>
      )}

      <p>
        <strong>Total Sessions:</strong> {data.total_sessions}
      </p>
      <p>
        <strong>Average Risk:</strong> {data.average_risk}/100
      </p>
      <p>
        <strong>GO %:</strong> {data.go_percent}%
      </p>
      <p>
        <strong>ITERATE %:</strong> {data.iterate_percent}%
      </p>
      <p>
        <strong>KILL %:</strong> {data.kill_percent}%
      </p>

      <h2 style={{ color, marginTop: 30 }}>
        Decision: {data.health}
      </h2>

      <p>
        {data.health === "GO" &&
          "Strong early signals detected. Safe to move forward."}
        {data.health === "ITERATE" &&
          "Mixed signals. Fix fundamentals before scaling."}
        {data.health === "KILL" &&
          "High risk pattern. Stop and rethink the idea."}
      </p>

      <button
        onClick={() => router.push("/dashboard")}
        style={{
          marginTop: 30,
          padding: "10px 16px",
          background: "#eee",
          border: "1px solid #ccc",
          cursor: "pointer",
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
