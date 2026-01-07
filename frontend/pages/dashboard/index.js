import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/projects`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load projects");
        setProjects(json.projects || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const sendDemoData = async (game_id) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/demo/${game_id}`,
        { method: "POST" }
      );
      alert("Demo data sent. Open analytics now.");
    } catch {
      alert("Failed to send demo data");
    }
  };

  const copyGameId = (id) => {
    navigator.clipboard.writeText(id);
    alert("Game ID copied");
  };

  if (loading) return <p style={{ padding: 40 }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>Dashboard</h1>
      <p>Your projects and early decision signals</p>

      <hr />

      {projects.length === 0 && (
        <p>No projects yet. Create your first one.</p>
      )}

      {projects.map((p) => (
        <div
          key={p.game_id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h3>{p.name}</h3>

          <p style={{ fontSize: 13, color: "#666" }}>
            Game ID: <code>{p.game_id}</code>
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => copyGameId(p.game_id)}
              style={btnOutline}
            >
              Copy Game ID
            </button>

            <button
              onClick={() => router.push(`/dashboard/${p.game_id}`)}
              style={btnPrimary}
            >
              View Analytics
            </button>

            <button
              onClick={() => sendDemoData(p.game_id)}
              style={btnWarn}
            >
              Send Demo Data
            </button>
          </div>
        </div>
      ))}

      <hr />

      <button
        onClick={() => router.push("/new")}
        style={{
          marginTop: 20,
          padding: "12px 18px",
          border: "1px solid #000",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        + Create New Project
      </button>
    </div>
  );
}

const btnPrimary = {
  padding: "8px 14px",
  background: "#000",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

const btnOutline = {
  padding: "8px 14px",
  background: "#fff",
  border: "1px solid #aaa",
  cursor: "pointer",
};

const btnWarn = {
  padding: "8px 14px",
  background: "#f5f5f5",
  border: "1px solid #999",
  cursor: "pointer",
};
