import MainLayout from "../components/layout/MainLayout";

export default function Demo() {
  return (
    <MainLayout title="Demo – LaunchSense">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold mb-4">
          Demo output
        </h1>

        <p className="text-muted-foreground max-w-2xl mb-12">
          Example of what LaunchSense surfaces after analyzing early
          playtest sessions.
        </p>

        <div className="grid gap-8 sm:grid-cols-2">
          {/* SIGNAL CARD */}
          <div className="border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-1">
              Signal
            </p>
            <h3 className="text-lg font-medium mb-3">
              Early Abandonment Risk
            </h3>

            <p className="text-sm text-muted-foreground mb-4">
              62% of players exited before 3 minutes.
            </p>

            <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted">
              Confidence: Medium
            </span>
          </div>

          {/* DECISION CARD */}
          <div className="border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-1">
              Recommendation
            </p>

            <h3 className="text-lg font-medium mb-3">
              Refine onboarding
            </h3>

            <p className="text-sm text-muted-foreground">
              Players struggle before understanding core mechanics.
              Iteration recommended before scaling traffic.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
