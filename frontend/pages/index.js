import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <div style={{ padding: 50, maxWidth: 800 }}>
      <h1>LaunchSense</h1>

      <p style={{ fontSize: 18 }}>
        Decide before you burn time, money, and team morale.
      </p>

      <h3>What is LaunchSense?</h3>
      <p>
        LaunchSense analyzes early user behavior from games and apps to tell you
        one thing clearly:
        <strong> GO, ITERATE, or KILL</strong>.
      </p>

      <h3>Who is it for?</h3>
      <ul>
        <li>🎮 Indie game developers & studios</li>
        <li>📱 App & SaaS founders (pre-launch)</li>
        <li>🚀 Teams who want data, not opinions</li>
      </ul>

      <h3>How it works</h3>
      <ol>
        <li>Create a project</li>
        <li>Add a few real user sessions</li>
        <li>Get a cold decision</li>
      </ol>

      <div style={{ marginTop: 30 }}>
        <button
          onClick={() => router.push("/demo")}
          style={{
            padding: "12px 20px",
            marginRight: 15,
            background: "#000",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try Demo (No Signup)
        </button>

        <button
          onClick={() => router.push("/signup")}
          style={{
            padding: "12px 20px",
            background: "#eee",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Start Free
        </button>
      </div>
    </div>
  );
}
