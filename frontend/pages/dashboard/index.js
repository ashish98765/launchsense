import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/projects`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load projects");
        setProjects(json.projects || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p style={{ padding: 40 }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  // EMPTY STATE — FIRST TIME USER
  if (projects.length === 0) {
    return (
      <div style={{ padding: 40, maxWidth: 900 }}>
        <h1>Welcome to LaunchSense</h1>
        <p style={{ fontSize: 18, color: "#555" }}>
          LaunchSense helps you decide whether a game idea should be
          <strong> launched, iterated, or killed</strong> — early.
        </p>

        <div
          style={{
            marginTop: 30,
            padding: 24,
            border: "1px solid #ddd",
            borderRadius: 12,
            background: "#fafafa",
          }}
        >
          <h3>Your first decision takes 3 steps:</h3>
          <ol style={{ lineHeight: 1.8 }}>
            <li>Create your first project</li>
            <li>Send a few gameplay sessions (or use demo data)</li>
            <li>Get a clear GO / ITERATE / KILL decision</li>
          </ol>

          <button
            onClick={() => router.push("/new")}
            style={{
              marginTop: 20,
              padding: "12px 18px",
              background: "#000",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Create First Project →
          </button>
        </div>
      </div>
    );
  }

  // NORMAL DASHBOARD
  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>My Projects</h1>
      <p style={{ color: "#666" }}>
        Click a project to view analytics and decisions.
      </p>

      <button
        onClick={() => router.push("/new")}
        style={{
          marginBottom: 30,
          padding: "10px 16px",
          background: "#000",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        + Create New Project
      </button>

      {projects.map((p) => (
        <div
          key={p.game_id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <h3>{p.name}</h3>
          <p>
            <strong>Game ID:</strong> <code>{p.game_id}</code>
          </p>

          <button
            onClick={() => router.push(`/dashboard/${p.game_id}`)}
            style={{
              marginTop: 10,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            View Analytics →
          </button>
        </div>
      ))}
    </div>
  );
}
