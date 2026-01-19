export default function Home() {
  return (
    <main style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* HERO */}
      <h1 style={{ fontSize: 42, marginBottom: 16 }}>
        Make game decisions with data, not hope.
      </h1>

      <p style={{ fontSize: 18, color: "#555", marginBottom: 32 }}>
        LaunchSense analyzes early gameplay behaviour and highlights risk
        so studios can decide what to build next — calmly and early.
      </p>

      {/* PRIMARY CTA */}
      <div style={{ marginBottom: 48 }}>
        <a
          href="/signup"
          style={{
            padding: "12px 20px",
            background: "#000",
            color: "#fff",
            borderRadius: 6,
            marginRight: 12,
            textDecoration: "none",
          }}
        >
          Analyze a test build
        </a>

        <a
          href="/demo"
          style={{ color: "#555", textDecoration: "underline" }}
        >
          See how decisions work →
        </a>
      </div>

      {/* WHO IT IS FOR */}
      <section style={{ marginBottom: 48 }}>
        <h2>Built for</h2>
        <ul>
          <li>Indie game studios</li>
          <li>Small & mid-size game teams</li>
          <li>Mobile & PC game developers</li>
        </ul>
      </section>

      {/* PROBLEM */}
      <section style={{ marginBottom: 48 }}>
        <h2>The problem</h2>
        <p style={{ color: "#555" }}>
          Most games rely on instinct and hope.
          After months of work, teams realise too late that a game is not viable.
        </p>
        <p style={{ color: "#555" }}>
          LaunchSense exists to reduce that risk — early.
        </p>
      </section>

      {/* WHAT IT DOES */}
      <section style={{ marginBottom: 48 }}>
        <h2>What LaunchSense does</h2>
        <ul>
          <li>Reads early gameplay behaviour</li>
          <li>Highlights risk patterns before scaling</li>
          <li>Supports calm, data-driven decisions</li>
        </ul>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ marginBottom: 80 }}>
        <h2>How it works</h2>
        <ol style={{ color: "#555" }}>
          <li>Share early gameplay behaviour from test builds</li>
          <li>LaunchSense analyzes patterns that indicate risk</li>
          <li>
            <strong>You decide</strong> what to fix, pause, or rethink — early
          </li>
        </ol>
      </section>

      {/* WHAT IT DOES NOT DO */}
      <section style={{ marginBottom: 48 }}>
        <h2>What LaunchSense does not do</h2>
        <ul style={{ color: "#555" }}>
          <li>It does not predict guaranteed success or failure</li>
          <li>It does not replace creative design judgment</li>
          <li>It does not force decisions on your team</li>
        </ul>
        <p style={{ marginTop: 12, color: "#666" }}>
          LaunchSense highlights early risk — decisions always stay with your team.
        </p>
      </section>

      {/* WHY EARLY DATA */}
      <section style={{ marginBottom: 48 }}>
        <h2>Why early data matters</h2>
        <p style={{ color: "#555" }}>
          Early player behaviour reveals issues long before revenue,
          ratings, or reviews appear.
        </p>
        <p style={{ color: "#555" }}>
          Catching risk early saves months of work — and team morale.
        </p>
      </section>

      {/* SAMPLE ANALYSIS */}
      <section style={{ marginBottom: 48 }}>
        <h2>Example: early gameplay analysis</h2>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            maxWidth: 500,
            background: "#fafafa",
          }}
        >
          <p><strong>Risk level:</strong> High</p>
          <p><strong>Pattern strength:</strong> Medium</p>

          <p style={{ marginTop: 12 }}>
            <strong>Key signals:</strong>
          </p>
          <ul>
            <li>Short play sessions</li>
            <li>High early deaths</li>
            <li>Early exits</li>
          </ul>

          <p style={{ fontSize: 14, color: "#666", marginTop: 12 }}>
            This is an example. Real analysis depends on your own test data.
          </p>
        </div>
      </section>

      {/* HOW TEAMS USE THIS */}
      <section style={{ marginBottom: 48 }}>
        <h2>How teams use LaunchSense</h2>
        <ul style={{ color: "#555" }}>
          <li>Run early playtests</li>
          <li>Detect risk before scaling</li>
          <li>Decide what to fix first</li>
        </ul>
      </section>

      {/* SAFE CTA */}
      <section style={{ marginBottom: 48 }}>
        <a
          href="/demo"
          style={{
            padding: "10px 16px",
            border: "1px solid #000",
            borderRadius: 6,
            marginRight: 12,
            textDecoration: "none",
            color: "#000",
          }}
        >
          View a sample analysis →
        </a>

        <a
          href="/methodology"
          style={{ color: "#555", textDecoration: "underline" }}
        >
          Read the methodology
        </a>
      </section>

      {/* PRICING HINT */}
      <section style={{ marginBottom: 48 }}>
        <h2>Simple pricing</h2>
        <p style={{ color: "#555" }}>
          Start free. Upgrade only when you need deeper analysis.
        </p>
        <p style={{ fontSize: 14, color: "#666" }}>
          No long-term contracts. No forced decisions.
        </p>
      </section>

      {/* FINAL CTA */}
      <section style={{ marginBottom: 64 }}>
        <a
          href="/signup"
          style={{
            padding: "12px 20px",
            background: "#000",
            color: "#fff",
            borderRadius: 6,
            marginRight: 12,
            textDecoration: "none",
          }}
        >
          Try LaunchSense on a test build
        </a>

        <a
          href="/demo"
          style={{ color: "#555", textDecoration: "underline" }}
        >
          See how decisions work
        </a>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #eee", paddingTop: 24 }}>
        <p style={{ fontSize: 14, color: "#666" }}>
          <a href="/methodology" style={{ marginRight: 16 }}>Methodology</a>
          <a href="/sdk" style={{ marginRight: 16 }}>SDK</a>
          <a href="/pricing">Pricing</a>
        </p>

        <p style={{ fontSize: 14, color: "#666", marginTop: 12 }}>
          LaunchSense supports decisions. It never replaces creative judgment.
        </p>
      </footer>
    </main>
  );
}
