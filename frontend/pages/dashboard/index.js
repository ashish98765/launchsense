import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/projects?user_id=demo_user`
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

  if (loading) return <p style={{ padding: 40 }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1>Dashboard</h1>
      <hr />

      {projects.length === 0 && (
        <p>No projects yet. Create your first project.</p>
      )}

      {projects.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #ddd",
            padding: 20,
            marginBottom: 15,
          }}
        >
          <h3>{p.name}</h3>
          <p>
            <strong>Game ID:</strong> {p.id}
          </p>

          <button
            onClick={() => router.push(`/dashboard/${p.id}`)}
            style={{
              padding: "10px 16px",
              background: "black",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            View Analytics
          </button>
        </div>
      ))}
    </div>
  );
}
