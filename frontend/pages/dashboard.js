import MainLayout from "../components/layout/MainLayout";
import Link from "next/link";

const games = [
  {
    id: "alpha-test",
    name: "Alpha Playtest",
    state: "Needs refinement",
    confidence: "Medium",
    note: "Early exits before engagement stabilizes",
  },
  {
    id: "soft-launch",
    name: "Soft Launch v0.9",
    state: "Ready to proceed",
    confidence: "High",
    note: "Stable session patterns across cohorts",
  },
];

function StateBadge({ state }) {
  const map = {
    "Ready to proceed": "bg-green-100 text-green-800",
    "Needs refinement": "bg-yellow-100 text-yellow-800",
    "High risk": "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-block text-xs px-3 py-1 rounded-full ${
        map[state] || "bg-muted"
      }`}
    >
      {state}
    </span>
  );
}

export default function Dashboard() {
  return (
    <MainLayout title="Dashboard – LaunchSense">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Review early signals and understand where attention is needed.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/dashboard/${game.id}`}
              className="border border-border rounded-2xl p-6 hover:shadow-sm transition"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-medium text-lg">{game.name}</h2>
                <StateBadge state={game.state} />
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {game.note}
              </p>

              <p className="text-xs text-muted-foreground">
                Confidence:{" "}
                <span className="font-medium">{game.confidence}</span>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
