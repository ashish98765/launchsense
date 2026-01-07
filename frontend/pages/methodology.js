import { useRouter } from "next/router";

export default function Methodology() {
  const router = useRouter();

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>How LaunchSense Makes Decisions</h1>

      <p style={{ fontSize: 18, color: "#444" }}>
        LaunchSense is a <strong>decision system</strong>, not an analytics dashboard.
        It analyzes early gameplay behavior to give a clear recommendation:
        <strong> GO, ITERATE, or KILL</strong>.
      </p>

      <hr />

      <h2>Signals We Analyze</h2>
      <ul>
        <li><strong>Playtime:</strong> Are players staying engaged?</li>
        <li><strong>Deaths:</strong> Is difficulty frustrating?</li>
        <li><strong>Restarts:</strong> Are players retrying willingly?</li>
        <li><strong>Early quits:</strong> Are players leaving too soon?</li>
      </ul>

      <h2>Risk Score (0–100)</h2>
      <p>
        Each session is converted into a <strong>risk score</strong>.
        Lower scores mean healthier engagement.
      </p>
      <ul>
        <li>0–39 → Low risk</li>
        <li>40–64 → Medium risk</li>
        <li>65–100 → High risk</li>
      </ul>

      <h2>Decision Logic</h2>
      <ul>
        <li><strong>GO:</strong> Majority low-risk sessions + stable engagement</li>
        <li><strong>ITERATE:</strong> Mixed signals, fix core issues and retest</li>
        <li><strong>KILL:</strong> High early risk patterns detected</li>
      </ul>

      <h2>Confidence & Limits</h2>
      <p>
        LaunchSense works best with <strong>real player sessions</strong>.
        Early results with very small samples should be treated as directional,
        not final.
      </p>

      <ul>
        <li>Not a predictor of long-term revenue</li>
        <li>Not a substitute for creative judgment</li>
        <li>Best used early to avoid sunk-cost traps</li>
      </ul>

      <h2>When NOT to Trust the Decision</h2>
      <ul>
        <li>Sample size is extremely small</li>
        <li>Test players are not representative</li>
        <li>Game core loop has changed recently</li>
      </ul>

      <p style={{ marginTop: 30, fontWeight: "bold" }}>
        LaunchSense does not replace founders. It protects them from bad timing.
      </p>

      <button
        onClick={() => router.back()}
        style={{
          marginTop: 30,
          padding: "10px 16px",
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        ← Back
      </button>
    </div>
  );
}
