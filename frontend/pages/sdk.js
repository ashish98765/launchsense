export default function SDKPage() {
  return (
    <div style={{ padding: 40, maxWidth: 800 }}>
      <h1>LaunchSense SDK</h1>
      <p>
        Connect your game or app with LaunchSense in minutes.
        Just send basic session data — we handle the decision.
      </p>

      <hr />

      <h2>1️⃣ Create a Project</h2>
      <p>
        First, create a project from the dashboard.
        You will get a <strong>game_id</strong>.
      </p>

      <pre style={codeStyle}>
{`Example:
game_id = "game_1700000000000"`}
      </pre>

      <h2>2️⃣ Send Session Data</h2>
      <p>
        Send this data after each play session.
      </p>

      <pre style={codeStyle}>
{`POST ${process.env.NEXT_PUBLIC_API_BASE_URL}/api/decision

{
  "game_id": "game_1700000000000",
  "player_id": "player_123",
  "session_id": "session_001",
  "playtime": 420,
  "deaths": 3,
  "restarts": 1,
  "early_quit": false
}`}
      </pre>

      <h2>3️⃣ Get Instant Decision</h2>
      <p>LaunchSense replies instantly:</p>

      <pre style={codeStyle}>
{`{
  "success": true,
  "risk_score": 55,
  "decision": "ITERATE"
}`}
      </pre>

      <h2>4️⃣ View Analytics</h2>
      <p>
        Open your project dashboard to see:
      </p>
      <ul>
        <li>Total sessions</li>
        <li>GO / ITERATE / KILL %</li>
        <li>Final recommendation</li>
      </ul>

      <h2>🎮 Unity / Game Engines</h2>
      <p>
        You can send the same JSON using UnityWebRequest,
        fetch, axios, or any HTTP client.
      </p>

      <pre style={codeStyle}>
{`Unity example (pseudo):

UnityWebRequest.Post(
  "https://your-api/api/decision",
  jsonPayload
);`}
      </pre>

      <hr />

      <p style={{ fontWeight: "bold" }}>
        That’s it. No SDK install. No heavy tracking. Just decisions.
      </p>
    </div>
  );
}

const codeStyle = {
  background: "#f4f4f4",
  padding: 16,
  borderRadius: 6,
  overflowX: "auto",
};
