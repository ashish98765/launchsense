import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const [busy, setBusy] = useState(null);

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

  const revokeKey = async (game_id) => {
    if (!confirm("This will disable the current API key. Continue?")) return;
    setBusy(game_id);
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/api-keys/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id }),
    });
    alert("API key revoked");
    setBusy(null);
  };

  const regenerateKey = async (game_id) => {
    if (!confirm("Generate a new API key? Old key will stop working.")) return;
    setBusy(game_id);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/api-keys/regenerate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id }),
      }
    );
    const json = await res.json();
    alert("New API Key:\n\n" + json.api_key);
    setBusy(null);
  };

  if (loading) return <p style={{ padding: 40 }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  const used = projects.length;
  const usagePercent = Math.round((used / MAX_PROJECTS) * 100);

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>Your Projects</h1>
      <p style={{ color: "#666" }}>
        Use the API key inside your game to send sessions.
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
        <strong>
          Free plan usage: {used}/{MAX_PROJECTS} projects ({usagePercent}%)
        </strong>
        {usagePercent >= 80 && (
          <p style={{ marginTop: 8, color: "#d97706" }}>
            ⚠ You are close to the free limit.
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

          <p style={{ fontSize: 13 }}>
            <strong>Game ID:</strong> <code>{p.game_id}</code>
          </p>

          <p style={{ fontSize: 13 }}>
            <strong>API Key:</strong>{" "}
            <code style={{ background: "#f4f4f4", padding: "4px 6px" }}>
              ************
            </code>
          </p>

          <button
            onClick={() => copyKey(p.api_key, p.game_id)}
            style={{ marginRight: 8 }}
          >
            Copy API Key
          </button>

          <button
            onClick={() => revokeKey(p.game_id)}
            disabled={busy === p.game_id}
            style={{ marginRight: 8, color: "red" }}
          >
            Revoke
          </button>

          <button
            onClick={() => regenerateKey(p.game_id)}
            disabled={busy === p.game_id}
          >
            Regenerate
          </button>

          {copied === p.game_id && (
            <span style={{ marginLeft: 10, color: "green" }}>✓ Copied</span>
          )}

          <br />
          <br />

          <button
            onClick={() => router.push(`/dashboard/${p.game_id}`)}
            style={{
              padding: "8px 14px",
              background: "#eee",
              border: "1px solid #ccc",
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
