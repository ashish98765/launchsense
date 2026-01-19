export default function Home() {
  return (
    <div style={styles.page}>
      {/* NAV */}
      <header style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo}>LaunchSense</div>
          <nav style={styles.navLinks}>
            <a href="#product">Product</a>
            <a href="#example">Example</a>
            <a href="#pricing">Pricing</a>
            <a href="/signup" style={styles.navCta}>Analyze a build</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={styles.hero}>
        <h1 style={styles.h1}>
          Most games don’t fail at launch.<br />
          <span style={styles.h1Muted}>They fail silently in the first few minutes.</span>
        </h1>

        <p style={styles.heroText}>
          LaunchSense inspects early gameplay behaviour from test builds
          and surfaces risk patterns — so teams decide <b>before</b> time,
          money, and morale are locked in.
        </p>

        <div style={styles.heroActions}>
          <a href="/signup" style={styles.primaryBtn}>Analyze a test build</a>
          <a href="#example" style={styles.secondaryBtn}>View example output →</a>
        </div>
      </section>

      {/* EXAMPLE */}
      <section id="example" style={styles.sectionAlt}>
        <h2 style={styles.h2}>Example: early gameplay signal</h2>

        <div style={styles.card}>
          <div style={styles.riskRow}>
            <span style={styles.riskHigh}>HIGH RISK</span>
            <span style={styles.confidence}>Confidence: Medium</span>
          </div>

          <ul style={styles.list}>
            <li>Players exit within first 2–3 minutes</li>
            <li>Death rate spikes before tutorial completion</li>
            <li>No session-to-session improvement</li>
          </ul>

          <p style={styles.cardNote}>
            Interpretation: core loop friction detected early.
            Iteration recommended before scaling development.
          </p>
        </div>
      </section>

      {/* WHAT IT DETECTS */}
      <section id="product" style={styles.section}>
        <h2 style={styles.h2}>What LaunchSense actually detects</h2>

        <div style={styles.grid}>
          <div style={styles.miniCard}>
            <h3>Early abandonment</h3>
            <p>Players leaving before the core loop stabilises.</p>
          </div>

          <div style={styles.miniCard}>
            <h3>Difficulty spikes</h3>
            <p>Repeated deaths, restarts, or friction signals.</p>
          </div>

          <div style={styles.miniCard}>
            <h3>False engagement</h3>
            <p>Playtime that looks healthy but signals confusion.</p>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={styles.sectionAlt}>
        <h2 style={styles.h2}>Who this is for</h2>

        <div style={styles.split}>
          <div>
            <h4>Good fit</h4>
            <ul style={styles.list}>
              <li>Indie studios validating ideas</li>
              <li>Small teams before full production</li>
              <li>Mobile & PC playtests</li>
            </ul>
          </div>

          <div>
            <h4>Not for</h4>
            <ul style={styles.listMuted}>
              <li>Finished live games</li>
              <li>Marketing analytics</li>
              <li>Guaranteed success predictions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <h2 style={styles.h2}>How teams use LaunchSense</h2>
        <ol style={styles.steps}>
          <li>Run a closed playtest</li>
          <li>Send session data to LaunchSense</li>
          <li>Review detected risk signals</li>
          <li><b>Decide to iterate, pause, or rethink — before commitment</b></li>
        </ol>
      </section>

      {/* PRICING */}
      <section id="pricing" style={styles.sectionAlt}>
        <h2 style={styles.h2}>Simple pricing</h2>
        <p style={styles.text}>
          Start free. Upgrade only when you need deeper analysis.<br />
          No long-term contracts. No forced decisions.
        </p>

        <a href="/signup" style={styles.primaryBtnLarge}>
          Try LaunchSense on a test build
        </a>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerLinks}>
          <a href="/methodology">Methodology</a>
          <a href="/sdk">SDK</a>
          <a href="/pricing">Pricing</a>
        </div>
        <p style={styles.footerNote}>
          LaunchSense highlights risk. Decisions always stay with you.
        </p>
      </footer>
    </div>
  );
}

/* STYLES */

const styles = {
  page: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#0f172a",
    background: "#ffffff",
  },

  nav: {
    position: "sticky",
    top: 0,
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    zIndex: 10,
  },
  navInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { fontWeight: 700, fontSize: 18 },
  navLinks: { display: "flex", gap: 20, alignItems: "center" },
  navCta: {
    padding: "8px 14px",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
  },

  hero: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "72px 20px",
  },
  h1: { fontSize: 42, lineHeight: 1.2, marginBottom: 20 },
  h1Muted: { color: "#64748b" },
  heroText: { fontSize: 18, color: "#475569", maxWidth: 700 },
  heroActions: { marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap" },

  primaryBtn: {
    background: "#2563eb",
    color: "#fff",
    padding: "14px 22px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 600,
  },
  secondaryBtn: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600,
    padding: "14px 10px",
  },

  section: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "72px 20px",
  },
  sectionAlt: {
    background: "#f8fafc",
    padding: "72px 20px",
  },

  h2: { fontSize: 28, marginBottom: 28 },

  card: {
    maxWidth: 520,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 24,
  },
  riskRow: { display: "flex", justifyContent: "space-between", marginBottom: 12 },
  riskHigh: { color: "#d97706", fontWeight: 700 },
  confidence: { color: "#64748b" },

  list: { paddingLeft: 20 },
  listMuted: { paddingLeft: 20, color: "#64748b" },
  cardNote: { marginTop: 12, fontSize: 14, color: "#64748b" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
  },
  miniCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
    background: "#fff",
  },

  split: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 40,
  },

  steps: { paddingLeft: 20, fontSize: 16 },

  text: { color: "#475569", marginBottom: 24 },

  primaryBtnLarge: {
    display: "inline-block",
    background: "#2563eb",
    color: "#fff",
    padding: "16px 28px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 700,
  },

  footer: {
    borderTop: "1px solid #e5e7eb",
    padding: "40px 20px",
    textAlign: "center",
  },
  footerLinks: { display: "flex", gap: 16, justifyContent: "center" },
  footerNote: { marginTop: 12, color: "#64748b", fontSize: 14 },
};
