export default function Result() {
  const riskScore = 72;
  const decision = "ITERATE"; // GO | ITERATE | KILL

  return (
    <div style={{ padding: 40 }}>
      <h2>LaunchSense Decision</h2>

      <p><strong>Risk Score:</strong> {riskScore}/100</p>
      <p><strong>Decision:</strong> {decision}</p>

      {decision === "KILL" && (
        <div style={{ color: "red", marginTop: 20 }}>
          <strong>⚠ Kill Mode Locked</strong>
          <p>This decision is irreversible.</p>
        </div>
      )}
    </div>
  );
}
