export default function Home() {
  const baseBg = "#FAFAF8";
  const textDark = "#111111";
  const textMuted = "#555555";
  const accent = "#C89B3C";
  const border = "#E5E5E5";

  return (
    <main
      style={{
        background: baseBg,
        color: textDark,
        padding: "72px 20px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* HERO */}
        <section style={{ marginBottom: 80 }}>
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
            <span style={{ color: textMuted, fontWeight: 500 }}>
              before months are wasted
            </span>
          </h1>

          <p
            style={{
              fontSize: 18,
              color: textMuted,
              maxWidth: 640,
              marginBottom: 32,
            }}
          >
            LaunchSense analyzes early gameplay behaviour from test builds and
            highlights risk — so teams decide{" "}
            <strong>early</strong>, not emotionally.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a
              href="/signup"
              style={{
                padding: "14px 26px",
                background: textDark,
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Analyze a test build
            </a>

            <a
              href="/demo"
              style={{
                padding: "14px 22px",
                border: `1px solid ${border}`,
                borderRadius: 8,
                textDecoration: "none",
                color: textDark,
              }}
            >
              See example analysis →
            </a>
          </div>
        </section>

        {/* BUILT FOR */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>Built for</h2>
          <ul style={{ color: textMuted, lineHeight: 1.8 }}>
            <li>Indie game studios</li>
            <li>Small & mid-size game teams</li>
            <li>Mobile & PC game developers</li>
          </ul>
        </section>

        {/* PROBLEM */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>
            The problem with game development
          </h2>
          <p style={{ color: textMuted, maxWidth: 620 }}>
            Most games rely on instinct and hope. After months of work, teams
            realise too late that a game is not viable.
          </p>
          <p style={{ color: textMuted }}>
            LaunchSense exists to reduce that risk —{" "}
            <span style={{ color: accent, fontWeight: 600 }}>early</span>, when
            decisions are still cheap.
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>
            How LaunchSense works
          </h2>
          <ol style={{ color: textMuted, lineHeight: 1.9 }}>
            <li>Run early playtests on a test build</li>
            <li>Send session data to LaunchSense</li>
            <li>We detect risk patterns from player behaviour</li>
            <li>
              <strong style={{ color: textDark }}>
                You decide
              </strong>{" "}
              what to fix, pause, or rethink
            </li>
          </ol>
        </section>

        {/* EXAMPLE */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>
            Example: early gameplay analysis
          </h2>

          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: 24,
              maxWidth: 520,
              background: "#FFFFFF",
            }}
          >
            <p>
              <strong>Risk level:</strong>{" "}
              <span style={{ color: accent, fontWeight: 600 }}>High</span>
            </p>
            <p>
              <strong>Pattern confidence:</strong> Medium
            </p>

            <p style={{ marginTop: 12 }}>
              <strong>Key signals detected:</strong>
            </p>
            <ul style={{ color: textMuted, lineHeight: 1.8 }}>
              <li>Players exit within first 3 minutes</li>
              <li>Repeated early deaths</li>
              <li>No improvement across sessions</li>
            </ul>

            <p style={{ fontSize: 13, color: "#777", marginTop: 12 }}>
              Example only. Real analysis depends on your own test data.
            </p>
          </div>
        </section>

        {/* WHAT IT DOES NOT DO */}
        <section style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>
            What LaunchSense does not do
          </h2>
          <ul style={{ color: textMuted, lineHeight: 1.8 }}>
            <li>It does not predict guaranteed success or failure</li>
            <li>It does not replace creative judgement</li>
            <li>It does not force decisions on your team</li>
          </ul>
          <p style={{ fontSize: 14, color: "#777", marginTop: 12 }}>
            LaunchSense highlights early risk — decisions always stay with you.
          </p>
        </section>

        {/* PRICING */}
        <section style={{ marginBottom: 96 }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>
            Simple pricing
          </h2>
          <p style={{ color: textMuted }}>
            Start free. Upgrade only when you need deeper analysis.
          </p>
          <p style={{ color: textMuted }}>
            No long-term contracts. No forced decisions.
          </p>

          <a
            href="/signup"
            style={{
              display: "inline-block",
              marginTop: 24,
              padding: "14px 28px",
              background: textDark,
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Try LaunchSense on a test build
          </a>
        </section>

        {/* FOOTER */}
        <footer
          style={{
            borderTop: `1px solid ${border}`,
            paddingTop: 24,
            fontSize: 14,
            color: "#777",
          }}
        >
          <p>
            <a href="/methodology" style={{ marginRight: 16 }}>
              Methodology
            </a>
            <a href="/sdk" style={{ marginRight: 16 }}>
              SDK
            </a>
            <a href="/pricing">Pricing</a>
          </p>
          <p style={{ marginTop: 8 }}>
            LaunchSense supports decisions. It never replaces creative
            judgement.
          </p>
        </footer>
      </div>
    </main>
  );
}
