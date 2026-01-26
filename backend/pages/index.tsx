export default function Home({ data }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">LaunchSense Dashboard</h1>

      <table className="mt-4 w-full">
        <thead>
          <tr>
            <th>Game</th>
            <th>Decision</th>
            <th>Confidence</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.game_id}>
              <td>{d.game_id}</td>
              <td>{d.decision}</td>
              <td>{d.confidence}</td>
              <td>{d.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
