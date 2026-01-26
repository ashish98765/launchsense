import MainLayout from "../components/layout/MainLayout";
import Link from "next/link";

export default function Dashboard() {
  const games = [
    {
      id: "alpha-test",
      name: "Alpha Playtest",
      status: "Refinement suggested",
      confidence: "Medium",
    },
    {
      id: "soft-launch",
      name: "Soft Launch v0.9",
      status: "Ready to proceed",
      confidence: "High",
    },
  ];

  return (
    <MainLayout title="Dashboard – LaunchSense">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-10">
          Review early signals and decide your next move with clarity.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/dashboard/${game.id}`}
              className="border border-border rounded-xl p-6 hover:border-primary transition"
            >
              <h2 className="font-medium text-lg">{game.name}</h2>

              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">State:</span>{" "}
                  {game.status}
                </p>
                <p>
                  <span className="font-medium">Confidence:</span>{" "}
                  {game.confidence}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
