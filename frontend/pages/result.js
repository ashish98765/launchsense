import { useEffect, useState } from "react";

export default function Result() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/game/game_001`
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to fetch result");
        }

        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, []);

  if (loading) {
    return <p style={{ padding: 40 }}>Analyzing project risk...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "red" }}>
        ❌ {error}
      </div>
    );
  }

  /* ---------- Decision mapping ---------- */

  let decisionText = "ITERATE";
  let decisionColor = "orange";
  let decisionMessage = "Core issues detected. Fix fundamentals before scaling.";

  if (data.health === "GOOD") {
    decisionText = "GO";
    decisionColor = "green";
    decisionMessage = "Project shows strong execution signals. Safe to scale.";
  }

  if (data.health === "BAD") {
    decisionText = "KILL";
    decisionColor = "red";
    decisionMessage =
      "High risk pattern detected. Stop and rethink the idea.";
  }

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h1>LaunchSense Decision</h1>
      <hr />

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

      <h2 style={{ color: decisionColor, marginTop: 30 }}>
        Decision: {decisionText}
      </h2>

      <p style={{ fontSize: 16 }}>{decisionMessage}</p>
    </div>
  );
}
