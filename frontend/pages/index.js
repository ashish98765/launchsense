export default function Home() {
  return (
    <div style={styles.page}>
      {/* NAVBAR */}
      <header style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo}>LaunchSense</div>
          <nav style={styles.navLinks}>
            <a href="#product">Product</a>
            <a href="#example">Example</a>
            <a href="#pricing">Pricing</a>
            <a href="/signup" style={styles.navCta}>Analyze a Build</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={styles.hero}>
        <h1 style={styles.h1}>
          Most games don’t fail at launch.
          <span style={styles.h1Accent}>
            They fail quietly in the first few minutes.
          </span>
        </h1>

        <p style={styles.heroText}>
          LaunchSense analyzes early gameplay behaviour from test builds
          and exposes risk patterns — so teams decide <b>before</b> months
          of development are committed.
        </p>

        <div style={styles.heroActions}>
          <a href="/signup" style={styles.primaryBtn}>
            Analyze a test build
          </a>
          <a href="#example" style={styles.secondaryBtn}>
            View example output →
          </a>
        </div>
      </section>

      {/* EXAMPLE */}
      <section id="example" style={styles.sectionAlt}>
        <h2 style={styles.h2}>Example: early risk signal</h2>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.riskHigh}>HIGH RISK</span>
            <span style={styles.confidence}>Confidence: Medium</span>
          </div>

          <ul style={styles.list}>
            <li>67% of players quit before 3 minutes</li>
            <li>Death spikes before tutorial completion</li>
            <li>No session-to-session improvement</li>
          </ul>

          <p style={styles.cardNote}>
            Interpretation: core gameplay loop friction detected.
            Iteration recommended before scaling production.
          </p>
        </div>
      </section>

      {/* WHAT IT DETECTS */}
      <section id="product" style={styles.section}>
        <h2 style={styles.h2}>What LaunchSense detects</h2>

        <div style={styles.grid}>
          <div style={styles.miniCard}>
            <h3>Early abandonment</h3>
            <p>Players exiting before engagement stabilizes.</p>
          </div>

          <div style={styles.miniCard}>
            <h3>Difficulty spikes</h3>
            <p>Deaths, restarts, and frustration signals.</p>
          </div>

          <div style={styles.miniCard}>
            <h3>False engagement</h3>
            <p>Playtime that hides confusion, not fun.</p>
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
              <li>Indie & small studios validating ideas</li>
              <li>Teams before full production</li>
              <li>Mobile & PC playtests</li>
            </ul>
          </div>

          <div>
            <h4>Not for</h4>
            <ul style={styles.listMuted}>
              <li>Live, shipped games</li>
              <li>Marketing analytics</li>
              <li>Guaranteed success prediction</li>
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
          <li>
            <b>Decide to iterate, pause, or rethink — early</b>
          </li>
        </ol>
      </section>

      {/* PRICING */}
      <section id="pricing" style={styles.sectionAlt}>
        <h2 style={styles.h2}>Simple pricing</h2>
        <p style={styles.text}>
          Start free. Upgrade when deeper analysis is required.
          <br />
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
          LaunchSense highlights risk. Final decisions always stay with you.
        </p>
      </footer>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "#F9FAFB",
    color: "#0F172A",
  },

  nav: {
    position: "sticky",
    top: 0,
    background: "#ffffff",
    borderBottom: "1px solid #E5E7EB",
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
    background: "#2563EB",
    color: "#fff",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
  },

  hero: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "90px 20px",
  },
  h1: {
    fontSize: 44,
    lineHeight: 1.15,
    marginBottom: 20,
  },
  h1Accent: {
    display: "block",
    color: "#64748B",
    marginTop: 6,
  },
  heroText: {
    fontSize: 18,
    color: "#475569",
    maxWidth: 720,
  },
  heroActions: {
    marginTop: 32,
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },

  primaryBtn: {
    background: "#2563EB",
    color: "#fff",
    padding: "14px 24px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 600,
  },
  secondaryBtn: {
    color: "#2563EB",
    textDecoration: "none",
    fontWeight: 600,
    padding: "14px 10px",
  },

  section: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "80px 20px",
  },
  sectionAlt: {
    background: "#F1F5F9",
    padding: "80px 20px",
  },

  h2: { fontSize: 28, marginBottom: 28 },

  card: {
    maxWidth: 540,
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: 18,
    padding: 24,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  riskHigh: {
    color: "#D97706",
    fontWeight: 700,
  },
  confidence: {
    color: "#64748B",
  },

  list: { paddingLeft: 20 },
  listMuted: { paddingLeft: 20, color: "#64748B" },
  cardNote: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
  },
  miniCard: {
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    padding: 20,
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
    background: "#2563EB",
    color: "#fff",
    padding: "16px 30px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 700,
  },

  footer: {
    borderTop: "1px solid #E5E7EB",
    padding: "40px 20px",
    textAlign: "center",
  },
  footerLinks: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
  },
  footerNote: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
};
