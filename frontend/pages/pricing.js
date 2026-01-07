import { useRouter } from "next/router";

export default function Pricing() {
  const router = useRouter();

  return (
    <div style={{ padding: 40, maxWidth: 900 }}>
      <h1>LaunchSense Pricing</h1>
      <p style={{ fontSize: 18, color: "#444" }}>
        Start free. Pay only when decisions start saving you real money.
      </p>

      <div style={{ display: "flex", gap: 20, marginTop: 30 }}>
        {/* FREE */}
        <Plan
          title="Free"
          price="₹0"
          features={[
            "Up to 3 game projects",
            "Up to 100 sessions per project",
            "GO / ITERATE / KILL decisions",
            "Basic fix suggestions",
          ]}
        />

        {/* PRO */}
        <Plan
          title="Pro"
          price="₹4,999 / month"
          highlight
          features={[
            "Unlimited projects",
            "Unlimited sessions",
            "Advanced fix suggestions",
            "Decision confidence history",
            "Priority support",
          ]}
        />
      </div>

      <button
        onClick={() => router.push("/dashboard")}
        style={{
          marginTop: 40,
          padding: "10px 16px",
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}

function Plan({ title, price, features, highlight }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 24,
        border: highlight ? "2px solid #000" : "1px solid #ddd",
        borderRadius: 12,
        background: highlight ? "#fafafa" : "#fff",
      }}
    >
      <h2>{title}</h2>
      <p style={{ fontSize: 24, fontWeight: "bold" }}>{price}</p>
      <ul>
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </div>
  );
}
