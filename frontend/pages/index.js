export default function Home() {
  return (
    <div style={styles.page}>
      {/* NAVBAR */}
      <header style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo}>LaunchSense</div>
          <nav style={styles.menu}>
            <a href="#how" style={styles.navLink}>How it works</a>
            <a href="#example" style={styles.navLink}>Example</a>
            <a href="#pricing" style={styles.navLink}>Pricing</a>
            <a href="/demo" style={styles.primaryBtn}>Try demo</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          Detect unviable games <span style={styles.muted}>before months are wasted</span>
        </h1>

        <p style={styles.heroSub}>
          LaunchSense analyzes early gameplay behaviour from test builds
          and highlights risk patterns — so teams decide <b>early</b>, not emotionally.
        </p>

        <div style={styles.heroCta}>
          <a href="/signup" style={styles.primaryBtnLarge}>
            Analyze a test build
          </a>
          <a href="#example" style={styles.secondaryBtn}>
            See example analysis →
          </a>
        </div>
      </section>

      {/* BUILT FOR */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Built for</h2>
        <ul style={styles.list}>
          <li>Indie game studios</li>
          <li>Small & mid-size game teams</li>
          <li>Mobile & PC game developers</li>
        </ul>
      </section>

      {/* PROBLEM */}
      <section style={styles.sectionAlt}>
        <h2 style={styles.sectionTitle}>The problem with game development</h2>
        <p style={styles.text}>
          Most games rely on instinct and hope.  
          After months of work, teams realise too late that a game is not viable.
        </p>
        <p style={styles.text}>
          LaunchSense exists to reduce that risk — <b style={{color:"#c58a2c"}}>early</b>,
          when decisions are still cheap.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={styles.section}>
        <h2 style={styles.sectionTitle}>How LaunchSense works</h2>
        <ol style={styles.steps}>
          <li>Run early playtests on a test build</li>
          <li>Send session data to LaunchSense</li>
          <li>We detect risk patterns from player behaviour</li>
          <li><b>You decide</b> what to fix, pause, or rethink</li>
        </ol>
      </section>

      {/* EXAMPLE */}
      <section id="example" style={styles.sectionAlt}>
        <h2 style={styles.sectionTitle}>Example: early gameplay analysis</h2>

        <div style={styles.card}>
          <p><b>Risk level:</b> <span style={{color:"#c0392b"}}>High</span></p>
          <p><b>Pattern confidence:</b> Medium</p>

          <p style={{marginTop:12}}><b>Key signals detected:</b></p>
          <ul style={styles.cardList}>
            <li>Players exit within first 3 minutes</li>
            <li>Repeated early deaths</li>
            <li>No improvement across sessions</li>
          </ul>

          <p style={styles.cardNote}>
            Example only. Real analysis depends on your own test data.
          </p>
        </div>
      </section>

      {/* WHAT IT DOES NOT DO */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>What LaunchSense does not do</h2>
        <ul style={styles.list}>
          <li>It does not predict guaranteed success or failure</li>
          <li>It does not replace creative judgement</li>
          <li>It does not force decisions on your team</li>
        </ul>
        <p style={styles.note}>
          LaunchSense highlights early risk — decisions always stay with you.
        </p>
      </section>

      {/* PRICING */}
      <section id="pricing" style={styles.sectionAlt}>
        <h2 style={styles.sectionTitle}>Simple pricing</h2>
        <p style={styles.text}>
          Start free. Upgrade only when you need deeper analysis.
        </p>
        <p style={styles.text}>
          No long-term contracts. No forced decisions.
        </p>

        <a href="/signup" style={styles.primaryBtnLarge}>
          Try LaunchSense on a test build
        </a>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div>
          <a href="/methodology" style={styles.footerLink}>Methodology</a>
          <a href="/sdk" style={styles.footerLink}>SDK</a>
          <a href="/pricing" style={styles.footerLink}>Pricing</a>
        </div>
        <p style={styles.footerNote}>
          LaunchSense supports decisions. It never replaces creative judgement.
        </p>
      </footer>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  page: {
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#111",
    background: "#fafafa"
  },

  nav: {
    position: "sticky",
    top: 0,
    background: "#fafafa",
    borderBottom: "1px solid #eee",
    zIndex: 10
  },
  navInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  logo: {
    fontWeight: 700,
    fontSize: 18
  },
  menu: {
    display: "flex",
    gap: 20,
    alignItems: "center"
  },
  navLink: {
    textDecoration: "none",
    color: "#555",
    fontSize: 14
  },

  hero: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "80px 24px 64px"
  },
  heroTitle: {
    fontSize: 48,
    lineHeight: 1.1,
    marginBottom: 16
  },
  muted: {
    color: "#666"
  },
  heroSub: {
    fontSize: 18,
    color: "#555",
    maxWidth: 700,
    marginBottom: 32
  },
  heroCta: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap"
  },

  section: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "64px 24px"
  },
  sectionAlt: {
    background: "#f3f3f3",
    padding: "64px 24px"
  },
  sectionTitle: {
    fontSize: 28,
    marginBottom: 16
  },

  list: {
    color: "#444",
    lineHeight: 1.8
  },
  steps: {
    color: "#444",
    lineHeight: 1.8,
    paddingLeft: 20
  },

  card: {
    maxWidth: 500,
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    border: "1px solid #e5e5e5"
  },
  cardList: {
    paddingLeft: 20,
    color: "#444"
  },
  cardNote: {
    fontSize: 13,
    color: "#777",
    marginTop: 12
  },

  text: {
    color: "#444",
    maxWidth: 700,
    marginBottom: 12
  },
  note: {
    fontSize: 14,
    color: "#666",
    marginTop: 12
  },

  primaryBtn: {
    background: "#111",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 14
  },
  primaryBtnLarge: {
    display: "inline-block",
    background: "#111",
    color: "#fff",
    padding: "14px 24px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 16,
    marginTop: 16
  },
  secondaryBtn: {
    padding: "14px 20px",
    border: "1px solid #ccc",
    borderRadius: 10,
    textDecoration: "none",
    color: "#333",
    fontSize: 16
  },

  footer: {
    borderTop: "1px solid #eee",
    padding: "32px 24px",
    textAlign: "center",
    color: "#666"
  },
  footerLink: {
    margin: "0 12px",
    textDecoration: "none",
    color: "#555"
  },
  footerNote: {
    fontSize: 13,
    marginTop: 12
  }
};
