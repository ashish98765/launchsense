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

    </main>
  );
}
