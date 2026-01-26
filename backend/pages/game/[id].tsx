export default function Game({ history }) {
  return (
    <div className="p-6">
      <h1 className="text-lg font-bold">Game History</h1>

      {history.map(h => (
        <div key={h.created_at} className="border p-2 mt-2">
          <div>Decision: {h.decision}</div>
          <div>Confidence: {h.confidence}</div>
          <div>Trend: {h.trend}</div>
        </div>
      ))}
    </div>
  );
}
