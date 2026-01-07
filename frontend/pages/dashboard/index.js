import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

  // FREE PLAN LIMIT
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
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copyKey = async (key, id) => {
    await navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <p style={{ padding: 40 }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  const used = projects.length;
  const usagePercent = Math.round((used / MAX_PROJECTS) * 100);

  let usageColor =
    usagePercent >= 90 ? "#dc2626" :
    usagePercent >= 70 ? "#f59e0b" :
    "#16a34a";

  /* ---------------- EMPTY STATE ---------------- */
  if (projects.length === 0) {
    return (
      <div style={{ padding: 40, maxWidth: 900 }}>
        <h1>Welcome to LaunchSense</h1>
        <p style={{ color: "#555", fontSize: 18 }}>
          Decide whether your game idea should be{" "}
          <strong>GO, ITERATE, or KILL</strong> — early.
        </p>

        <div
          style={{
            marginTop: 30,
            padding: 24,
            border: "1px solid #ddd",
            borderRadius: 12,
            background: "#fafafa"
          }}
        >
          <h3>Your first decision takes 3 steps:</h3>
          <ol style={{ lineHeight: 1.8 }}>
            <li>Create your first project</li>
            <li>Send a few gameplay sessions (or demo data)</li>
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
              cursor: "pointer"
            }}
          >
            Create First Project →
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- NORMAL DASHBOARD ---------------- */
  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>Your Projects</h1>
      <p style={{ color: "#666" }}>
        Click a project to view analytics. Use the API key inside your game.
      </p>

      {/* USAGE BAR */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 30,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 10,
          background: "#fafafa"
        }}
      >
        <strong style={{ color: usageColor }}>
          Free plan usage: {used}/{MAX_PROJECTS} projects ({usagePercent}%)
        </strong>

        {usagePercent >= 70 && (
          <p style={{ marginTop: 8, color: usageColor }}>
            ⚠️ You are close to your free limit.
            {usagePercent >= 90 && (
              <>
                <br />
                <a href="/pricing">Upgrade to continue →</a>
              </>
            )}
          </p>
        )}
      </div>

      {/* CREATE BUTTON */}
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
          cursor: "pointer"
        }}
      >
        + Create New Project
      </button>

      {/* PROJECT LIST */}
      {projects.map(p => (
        <div
          key={p.game_id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 18,
            marginBottom: 18
          }}
        >
          <h3>{p.name}</h3>

          <p style={{ fontSize: 13 }}>
            <strong>Game ID:</strong> <code>{p.game_id}</code>
          </p>

          <p style={{ fontSize: 13 }}>
            <strong>API Key:</strong>{" "}
            <code style={{ background: "#f4f4f4", padding: "4px 6px" }}>
              {p.api_key || "Hidden"}
            </code>
          </p>

          <button
            onClick={() => copyKey(p.api_key, p.game_id)}
            style={{
              marginRight: 10,
              padding: "6px 12px",
              cursor: "pointer"
            }}
          >
            Copy API Key
          </button>

          {copied === p.game_id && (
            <span style={{ color: "green" }}>✓ Copied</span>
          )}

          <br /><br />

          <button
            onClick={() => router.push(`/dashboard/${p.game_id}`)}
            style={{
              padding: "8px 14px",
              background: "#eee",
              border: "1px solid #ccc",
              cursor: "pointer"
            }}
          >
            View Analytics →
          </button>
        </div>
      ))}
    </div>
  );
}
