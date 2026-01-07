import Link from "next/link";

export default function Home() {
  return (
    <div style={{ padding: 60, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <h1 style={{ fontSize: 42, marginBottom: 10 }}>
        LaunchSense
      </h1>

      <p style={{ fontSize: 20, color: "#555", marginBottom: 40 }}>
        Decide before you burn time, money, and team morale.
      </p>

      {/* What it does */}
      <section style={{ marginBottom: 40 }}>
        <h2>What is LaunchSense?</h2>
        <p style={{ fontSize: 16, lineHeight: 1.6 }}>
          LaunchSense is a decision SaaS that analyzes early user behavior
          from games and apps to tell you one thing clearly:
          <b> should you launch, iterate, or kill the idea.</b>
        </p>
      </section>

      {/* Who it is for */}
      <section style={{ marginBottom: 40 }}>
        <h2>Who is it for?</h2>
        <ul style={{ fontSize: 16, lineHeight: 1.8 }}>
          <li>🎮 Indie game developers & studios</li>
          <li>📱 App & SaaS founders (pre-launch / beta)</li>
          <li>🚀 Teams who want data, not opinions</li>
        </ul>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: 40 }}>
        <h2>How it works</h2>
        <ol style={{ fontSize: 16, lineHeight: 1.8 }}>
          <li>Create a project</li>
          <li>Add a few real user sessions</li>
          <li>Get a clear GO / ITERATE / KILL decision</li>
        </ol>
      </section>

      {/* CTA */}
      <div style={{ marginTop: 50 }}>
        <Link href="/new">
          <button
            style={{
              padding: "14px 28px",
              fontSize: 18,
              cursor: "pointer",
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 4
            }}
          >
            Start Free Analysis
          </button>
        </Link>
      </div>
    </div>
  );
}
