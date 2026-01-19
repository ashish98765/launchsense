export default function Home() {
  return (
    <main
      style={{
        padding: "72px 20px",
        maxWidth: 720,
        margin: "0 auto",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, Inter, Segoe UI, Roboto, sans-serif",
        color: "#111",
      }}
    >
      {/* HERO */}
      <section style={{ marginBottom: 72 }}>
        <h1
          style={{
            fontSize: 44,
            lineHeight: 1.15,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}
        >
          Detect unviable games
          <br />
          <strong>before you waste months building them</strong>
        </h1>

        <p style={{ fontSize: 18, color: "#555", marginBottom: 36 }}>
          LaunchSense analyzes early gameplay behaviour from test builds
          and highlights risk patterns — so studios know when to iterate,
          pause, or kill a game <strong>early</strong>.
        </p>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <a
            href="/signup"
            style={{
              padding: "14px 22px",
              background: "#000",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Analyze a test build
          </a>

          <a
            href="/demo"
            style={{
              padding: "14px 22px",
              border: "1px solid #ccc",
              borderRadius: 8,
              textDecoration: "none",
              color: "#111",
            }}
          >
            See example analysis →
          </a>
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>Built for</h2>
        <ul style={{ color: "#444", lineHeight: 1.8 }}>
          <li>Indie game studios</li>
          <li>Small & mid-size game teams</li>
          <li>Mobile & PC game developers</li>
        </ul>
      </section>

      {/* THE REAL PROBLEM */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>
          The problem with game development
        </h2>
        <p style={{ color: "#555", lineHeight: 1.7 }}>
          Most games rely on instinct and hope.
          <br />
          After months of work, teams realise too late that a game
          is not viable.
        </p>
        <p style={{ color: "#555", lineHeight: 1.7 }}>
          LaunchSense exists to reduce that risk — <strong>early</strong>,
          when decisions are still cheap.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 26, marginBottom: 16 }}>
          How LaunchSense works
        </h2>

        <ol style={{ color: "#444", lineHeight: 1.8 }}>
          <li>Run early playtests on a test build</li>
          <li>Send session data to LaunchSense</li>
          <li>
            We detect risk patterns from player behaviour
          </li>
          <li>
            <strong>You decide</strong> what to fix, pause, or rethink
          </li>
        </ol>
      </section>

      {/* EXAMPLE CARD */}
      <section style={{ marginBottom: 72 }}>
        <h2 style={{ fontSize: 26, marginBottom: 16 }}>
          Example: early gameplay analysis
        </h2>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
            background: "#fafafa",
            maxWidth: 420,
          }}
        >
          <p>
            <strong>Risk level:</strong> High
          </p>
          <p>
            <strong>Pattern strength:</strong> Medium
          </p>

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

      {/* WHAT IT DOES NOT DO */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>
          What LaunchSense does not do
        </h2>
        <ul style={{ color: "#444", lineHeight: 1.8 }}>
          <li>It does not predict guaranteed success or failure</li>
          <li>It does not replace creative judgement</li>
          <li>It does not force decisions on your team</li>
        </ul>

        <p style={{ color: "#555", marginTop: 12 }}>
          LaunchSense highlights early risk — decisions always stay with you.
        </p>
      </section>

      {/* PRICING HINT */}
      <section style={{ marginBottom: 72 }}>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>
          Simple pricing
        </h2>
        <p style={{ color: "#555" }}>
          Start free. Upgrade only when you need deeper analysis.
        </p>
        <p style={{ color: "#666", fontSize: 14 }}>
          No long-term contracts. No forced decisions.
        </p>
      </section>

      {/* FINAL CTA */}
      <section style={{ marginBottom: 72 }}>
        <a
          href="/signup"
          style={{
            display: "inline-block",
            padding: "16px 26px",
            background: "#000",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Try LaunchSense on a test build
        </a>

        <div style={{ marginTop: 14 }}>
          <a
            href="/demo"
            style={{ color: "#555", textDecoration: "underline" }}
          >
            See how decisions work →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #eee", paddingTop: 24 }}>
        <p style={{ fontSize: 14, color: "#666" }}>
          <a href="/methodology" style={{ marginRight: 16 }}>
            Methodology
          </a>
          <a href="/sdk" style={{ marginRight: 16 }}>
            SDK
          </a>
          <a href="/pricing">Pricing</a>
        </p>

        <p style={{ fontSize: 13, color: "#888", marginTop: 12 }}>
          LaunchSense supports decisions. It never replaces creative judgement.
        </p>
      </footer>
    </main>
  );
}
