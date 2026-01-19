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

      {/* CTA */}
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

      {/* WHO IS THIS FOR */}
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
          Most game teams rely on instinct and hope.
          After months of work, they realize too late that a game is not viable.
          LaunchSense exists to reduce that risk — early.
        </p>
      </section>

      {/* WHAT IT DOES */}
      <section>
        <h2>What LaunchSense does</h2>
        <ul>
          <li>Reads early gameplay behaviour</li>
          <li>Highlights risk patterns before scaling</li>
          <li>Supports calm, data-driven decisions</li>
        </ul>
      </section>

        {/* HOW IT WORKS */}
      <section style={{ marginTop: 80, marginBottom: 48 }}>
        <h2>How LaunchSense works</h2>
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
          <li>It does not replace creative or design judgment</li>
          <li>It does not force decisions on your team</li>
        </ul>
        <p style={{ marginTop: 12, color: "#666" }}>
          LaunchSense highlights early risk — decisions always stay with your team.
        </p>
      </section>

      {/* WHY EARLY DATA MATTERS */}
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

    </main>
  );
}
