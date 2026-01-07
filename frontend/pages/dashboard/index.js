import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Usage limits
  const MAX_PROJECTS = 3;

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  if (loading) return <p style={{ padding: 40 }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  const used = projects.length;
  const usagePercent = Math.round((used / MAX_PROJECTS) * 100);

  // Dynamic color
  const usageColor =
    usagePercent >= 90
      ? "#dc2626" // red
      : usagePercent >= 70
      ? "#d97706" // orange
      : "#16a34a"; // green

  // If no projects exist yet — onboarding screen
  if (projects.length === 0) {
    return (
      <div style={{ padding: 40, maxWidth: 900 }}>
        <h1>Welcome to LaunchSense</h1>
        <p style={{ fontSize: 18, color: "#555" }}>
          LaunchSense helps you decide whether a game idea should be{" "}
          <strong>launched, iterated, or killed</strong> — early.
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

  // Normal dashboard view (projects exist)
  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>My Projects</h1>
      <p style={{ color: "#666" }}>
        Click a project to view analytics and decisions.
      </p>

      {/* USAGE BAR */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 30,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 10,
          background: "#fafafa",
        }}
      >
        <strong>Free Plan Usage:</strong>
        <p style={{ color: usageColor }}>
          {used} / {MAX_PROJECTS} projects used ({usagePercent}%)
        </p>
        {usagePercent >= 70 && (
          <p style={{ color: usageColor }}>
            ⚠️ You’re close to your free limit.
            {usagePercent >= 90 ? (
              <>
                {" "}
                <br />
                <a href="/pricing">Upgrade to continue →</a>
              </>
            ) : (
              " Keep growing — consider upgrading soon."
            )}
          </p>
        )}
      </div>

      {/* CREATE PROJECT BUTTON */}
      <button
        onClick={() =>
          used >= MAX_PROJECTS
            ? router.push("/pricing")
            : router.push("/new")
        }
        style={{
          marginBottom: 30,
          padding: "10px 16px",
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        + Create New Project
      </button>

      {/* PROJECT LIST */}
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
              background: "#000",
              color: "#fff",
              border: "none",
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
