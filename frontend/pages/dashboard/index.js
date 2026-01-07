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

        setProjects(json.projects);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return <p style={{ padding: 40 }}>Loading dashboard...</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 40, maxWidth: 800 }}>
      <h1>Your Projects</h1>
      <p>Click a project to view analytics.</p>

      <hr />

      {projects.length === 0 && <p>No projects yet.</p>}

      {projects.map((p) => (
        <div
          key={p.game_id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 12,
            borderRadius: 6,
          }}
        >
          <h3>{p.name}</h3>
          <p style={{ fontSize: 14, color: "#666" }}>
            Created: {new Date(p.created_at).toLocaleDateString()}
          </p>

          <button
            onClick={() => router.push(`/dashboard/${p.game_id}`)}
            style={{
              marginTop: 10,
              padding: "8px 14px",
              background: "#000",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            View Analytics
          </button>
        </div>
      ))}

      <button
        onClick={() => router.push("/new")}
        style={{
          marginTop: 30,
          padding: "10px 18px",
          background: "#eee",
          border: "1px solid #ccc",
          cursor: "pointer",
        }}
      >
        + Create New Project
      </button>
    </div>
  );
}
