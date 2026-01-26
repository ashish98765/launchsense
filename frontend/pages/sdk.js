import MainLayout from "../components/layout/MainLayout";

export default function SDK() {
  return (
    <MainLayout title="SDK – LaunchSense">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold mb-4">
          LaunchSense SDK
        </h1>

        <p className="text-muted-foreground max-w-2xl mb-10">
          Send early gameplay session data to LaunchSense.
          Get risk signals, confidence levels, and decision guidance —
          before launch damage becomes permanent.
        </p>

        {/* STEP 1 */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-2">
            1. Install
          </h2>

          <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
            npm install launchsense-sdk
          </pre>
        </section>

        {/* STEP 2 */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-2">
            2. Initialize
          </h2>

          <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`import { LaunchSense } from "launchsense-sdk";

const ls = new LaunchSense({
  apiKey: "YOUR_API_KEY",
  gameId: "my-game-id"
});`}
          </pre>
        </section>

        {/* STEP 3 */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-2">
            3. Track signals
          </h2>

          <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`ls.track("session_end", {
  duration: 142,
  deaths: 6,
  completedTutorial: false
});`}
          </pre>

          <p className="text-sm text-muted-foreground mt-3">
            LaunchSense automatically aggregates patterns across sessions
            and detects early risk.
          </p>
        </section>

        {/* OUTPUT */}
        <section className="border-t border-border pt-10">
          <h2 className="text-xl font-medium mb-2">
            What you get
          </h2>

          <ul className="space-y-3 text-muted-foreground text-sm">
            <li>• Early abandonment detection</li>
            <li>• Difficulty spike signals</li>
            <li>• Confidence level per build</li>
            <li>• Clear “iterate / refine / pause” guidance</li>
          </ul>
        </section>
      </div>
    </MainLayout>
  );
}
