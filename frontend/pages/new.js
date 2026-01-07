import { useState } from "react";
import { useRouter } from "next/router";

export default function NewProject() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const createProject = async () => {
    if (!name) return setError("Project name required");

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/project`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      // 🔴 IMPORTANT REDIRECT
      router.push(`/dashboard/${json.game_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 500 }}>
      <h1>Create New Project</h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={createProject} disabled={loading}>
        {loading ? "Creating..." : "Create Project"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
