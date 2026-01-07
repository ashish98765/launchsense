import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();

  const handleAnalyze = () => {
    router.push("/result");
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>LaunchSense Dashboard</h2>

      <p>Your project is ready for analysis.</p>

      <button
        onClick={handleAnalyze}
        style={{
          padding: "10px 20px",
          fontSize: 16,
          cursor: "pointer",
          marginTop: 20
        }}
      >
        Analyze Project
      </button>
    </div>
  );
}
