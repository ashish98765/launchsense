export default function Home() {
  return (
    <div style={styles.page}>
      {/* NAVBAR */}
      <header style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo}>LaunchSense</div>
          <nav style={styles.menu}>
            <a href="#product" style={styles.navLink}>Product</a>
            <a href="#example" style={styles.navLink}>Example</a>
            <a href="#pricing" style={styles.navLink}>Pricing</a>
            <a href="/signup" style={styles.ctaNav}>Analyze a build</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          Some games are already failing.
          <br />
          <span style={styles.heroMuted}>
            You just don’t see it yet.
          </span>
        </h1>

        <p style={styles.heroSub}>
          LaunchSense inspects early gameplay behaviour from test builds
          and surfaces risk patterns — so teams decide before time, money,
          and morale are locked in.
        </p>

        <div style={styles.heroCta}>
          <a href="/signup" style={styles.primaryBtn}>
            Analyze a test build
          </a>
          <a href="#example" style={styles.secondaryBtn}>
            View example output →
          </a>
        </div>
      </section>

      {/* WHAT IT DETECTS */}
      <section id="product" style={styles.section}>
        <h2 style={styles.sectionTitle}>
          What LaunchSense actually detects
        </h2>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>Early abandonment</h3>
            <p>
              Players leaving before the core loop establishes.
            </p>
          </div>

          <div style={styles.card}>
            <h3>Difficulty spikes</h3>
            <p>
              Friction that causes repeated deaths or restarts.
            </p>
          </div>

          <div style={styles.card}>
            <h3>False engagement</h3>
            <p>
              Playtime that looks healthy but signals confusion.
            </p>
          </div>
        </div>
      </section>

      {/* EXAMPLE */}
      <section id="example" style={styles.sectionAlt}>
        <h2 style={styles.sectionTitle}>
          Example: early gameplay signal
        </h2>

        <div style={styles.output}>
          <div style={styles.outputHeader}>
            <span style={styles.riskHigh}>HIGH RISK</span>
            <span style={styles.confidence}>Confidence: Medium</span>
          </div>

          <ul style={styles.outputList}>
            <li>Players exit within first 2–3 minutes</li>
            <li>Death rate spikes before tutorial completion</li>
            <li>No session-to-session improvement</li>
          </ul>

          <p style={styles.outputNote}>
            Interpretation: core loop friction detected early.
            Iteration recommended before scaling development.
          </p>
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Who this is for
        </h2>

        <div style={styles.split}>
          <div>
            <h4>Good fit</h4>
            <ul>
              <li>Indie studios validating ideas</li>
              <li>Small teams before full production</li>
              <li>Mobile & PC developers running playtests</li>
            </ul>
          </div>

          <div>
            <h4>Not for</h4>
            <ul>
              <li>Finished, live games</li>
              <li>Marketing analytics</li>
              <li>Guaranteed success predictions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW TEAMS USE IT */}
      <section style={styles.sectionAlt}>
        <h2 style={styles.sectionTitle}>
          How teams use LaunchSense
        </h2>

        <ol style={styles.steps}>
          <li>Run a closed playtest</li>
          <li>Upload session data</li>
          <li>Review detected risk signals</li>
          <li>
            Decide to iterate, pause, or rethink —
            <b> before commitment</b>
          </li>
        </ol>
      </section>

      {/* CTA */}
      <section style={styles.finalCta}>
        <h2>
          Don’t let intuition decide months of work.
        </h2>
        <a href="/signup" style={styles.primaryBtnLarge}>
          Try LaunchSense on a test build
        </a>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div>
          <a href="/methodology">Methodology</a>
          <a href="/sdk">SDK</a>
          <a href="/pricing">Pricing</a>
        </div>
        <p>
          LaunchSense highlights risk. Decisions always stay with you.
        </p>
      </footer>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    background: "#F9FAFB",
    color: "#0F172A",
  },

  nav: {
    position: "sticky",
    top: 0,
    background: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
    zIndex: 10,
  },
  navInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontWeight: 700,
    fontSize: 18,
  },
  menu: {
    display: "flex",
    gap: 20,
    alignItems: "center",
  },
  navLink: {
    textDecoration: "none",
    color: "#475569",
    fontSize: 14,
  },
  ctaNav: {
    background: "#2563EB",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 14,
  },

  hero: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "96px 24px 72px",
  },
  heroTitle: {
    fontSize: 48,
    lineHeight: 1.1,
    marginBottom: 20,
  },
  heroMuted: {
    color: "#64748B",
  },
  heroSub: {
    fontSize: 18,
    color: "#475569",
    maxWidth: 720,
    marginBottom: 36,
  },
  heroCta: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },

  section: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "72px 24px",
  },
  sectionAlt: {
    background: "#F1F5F9",
    padding: "72px 24px",
  },
  sectionTitle: {
    fontSize: 28,
    marginBottom: 24,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
    gap: 20,
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
  },

  output: {
    maxWidth: 520,
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 24,
  },
  outputHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  riskHigh: {
    color: "#D97706",
    fontWeight: 700,
  },
  confidence: {
    fontSize: 13,
    color: "#64748B",
  },
  outputList: {
    paddingLeft: 20,
    color: "#475569",
  },
  outputNote: {
    marginTop: 12,
    fontSize: 14,
    color: "#475569",
  },

  split: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32,
  },

  steps: {
    maxWidth: 640,
    lineHeight: 1.9,
    color: "#475569",
  },

  finalCta: {
    textAlign: "center",
    padding: "96px 24px",
  },

  primaryBtn: {
    background: "#2563EB",
    color: "#fff",
    padding: "14px 24px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 16,
  },
  primaryBtnLarge: {
    background: "#2563EB",
    color: "#fff",
    padding: "16px 32px",
    borderRadius: 12,
    textDecoration: "none",
    fontSize: 18,
    display: "inline-block",
    marginTop: 20,
  },
  secondaryBtn: {
    border: "1px solid #CBD5E1",
    padding: "14px 20px",
    borderRadius: 10,
    textDecoration: "none",
    color: "#334155",
    fontSize: 16,
  },

  footer: {
    borderTop: "1px solid #E5E7EB",
    padding: "40px 24px",
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
  },
};
