export default function Rules({ rules }) {
  return (
    <div className="p-6">
      <h1 className="font-bold">Rules</h1>

      {rules.map(r => (
        <div key={r.id} className="border p-2 mt-2">
          <div>{r.rule_key}</div>
          <div>Decision: {r.decision}</div>
          <div>Priority: {r.priority}</div>
          <input
            type="checkbox"
            checked={r.active}
            readOnly
          />
        </div>
      ))}
    </div>
  );
}
