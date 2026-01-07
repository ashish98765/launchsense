import { useState } from "react";
import { useRouter } from "next/router";

export default function NewProject() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const createProject = async () => {
    if (!name.trim()) {
      setError("Project name required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/project`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      router.push(`/project/${json.game_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 60, maxWidth: 600, margin: "0 auto" }}>
      <h1>Create New Project</h1>

      <p style={{ color: "#555", marginBottom: 20 }}>
        Add your game or app to start analyzing real user behavior.
      </p>

      <input
        placeholder="Project name (e.g. Space Runner)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 16,
          marginBottom: 20
        }}
      />

      {error && (
        <p style={{ color: "red", marginBottom: 10 }}>{error}</p>
      )}

      <button
        onClick={createProject}
        disabled={loading}
        style={{
          padding: "12px 24px",
          fontSize: 16,
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer"
        }}
      >
        {loading ? "Creating..." : "Create Project"}
      </button>
    </div>
  );
}
