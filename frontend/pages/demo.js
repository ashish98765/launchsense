import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Demo() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/demo/analytics`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ padding: 40 }}>Loading demo...</p>;

  const color =
    data.health === "GO"
      ? "green"
      : data.health === "KILL"
      ? "red"
      : "orange";

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1>LaunchSense Demo</h1>
      <p>This is a simulated project using real decision logic.</p>

      <hr />

      <p><strong>Project:</strong> {data.project_name}</p>
      <p><strong>Total Sessions:</strong> {data.total_sessions}</p>
      <p><strong>Average Risk:</strong> {data.average_risk}/100</p>

      <p>GO %: {data.go_percent}%</p>
      <p>ITERATE %: {data.iterate_percent}%</p>
      <p>KILL %: {data.kill_percent}%</p>

      <h2 style={{ color, marginTop: 30 }}>
        Decision: {data.health}
      </h2>

      <p>
        {data.health === "GO" && "Strong early signals. Safe to scale."}
        {data.health === "ITERATE" && "Mixed signals. Improve core mechanics."}
        {data.health === "KILL" && "High risk pattern. Stop and rethink."}
      </p>

      <button
        onClick={() => router.push("/signup")}
        style={{
          marginTop: 30,
          padding: "10px 18px",
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Start Free Analysis
      </button>
    </div>
  );
}
