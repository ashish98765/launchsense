import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardHome() {
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

  if (loading) {
    return <p style={{ padding: 40 }}>Loading your projects…</p>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "red" }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1>📊 Your Projects</h1>

      <p>
        These are the games / apps you’re currently analyzing with
        LaunchSense.
      </p>

      <br />

      {projects.length === 0 && (
        <p>
          No projects yet. <br />
          <Link href="/new">➕ Create your first project</Link>
        </p>
      )}

      {projects.map((project) => (
        <div
          key={project.game_id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 12
          }}
        >
          <h3>{project.name}</h3>
          <p style={{ fontSize: 14, color: "#555" }}>
            Game ID: <code>{project.game_id}</code>
          </p>

          <Link href={`/dashboard/${project.game_id}`}>
            <button style={{ marginTop: 8 }}>
              Open Dashboard →
            </button>
          </Link>
        </div>
      ))}
    </div>
  );
}
