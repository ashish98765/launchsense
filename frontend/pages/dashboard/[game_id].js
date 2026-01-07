import { useRouter } from "next/router";
import { useState } from "react";

export default function Dashboard() {
  const router = useRouter();
  const { game_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (!game_id) return null;

  const sendTestEvent = async () => {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id,
            player_id: "test_player",
            session_id: "test_session_" + Date.now(),
            playtime: 300,
            deaths: 3,
            restarts: 1,
            early_quit: false,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Test failed");

      setMsg(
        `Risk: ${json.risk_score} | Decision: ${json.decision}`
      );
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1>Project Dashboard</h1>

      <p>
        <strong>Game ID:</strong> <code>{game_id}</code>
      </p>

      <hr />

      <h3>API Endpoint</h3>
      <code>
        POST {process.env.NEXT_PUBLIC_API_BASE_URL}/api/decision
      </code>

      <h3>Example Payload</h3>
      <pre style={{ background: "#f4f4f4", padding: 10 }}>
{JSON.stringify(
  {
    game_id,
    player_id: "player_123",
    session_id: "session_001",
    playtime: 420,
    deaths: 6,
    restarts: 2,
    early_quit: false,
  },
  null,
  2
)}
      </pre>

      <button onClick={sendTestEvent} disabled={loading}>
        {loading ? "Sending..." : "Send Test Session"}
      </button>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}

      <hr />

      <button onClick={() => router.push(`/result?game_id=${game_id}`)}>
        View Analysis
      </button>
    </div>
  );
}
