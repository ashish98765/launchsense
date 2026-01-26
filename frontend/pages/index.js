import MainLayout from "../components/layout/MainLayout";
import Link from "next/link";

export default function Home() {
  return (
    <MainLayout
      title="LaunchSense — Decision clarity for games & behavior-driven products"
      description="Detect early risk signals in gameplay and product behavior before launch decisions are locked."
    >
      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-32 pb-24 text-center">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
          Most products don’t fail at launch.
          <br />
          <span className="text-primary">
            They fail quietly in the first few minutes.
          </span>
        </h1>

        <p className="mt-8 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          LaunchSense analyzes early gameplay and product behavior from test
          builds to surface hidden risk patterns — before months of development
          are committed.
        </p>

        <div className="mt-12 flex flex-col items-center gap-4">
          <Link
            href="/signup"
            className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-medium shadow-md hover:shadow-lg transition"
          >
            Analyze a test build
          </Link>

          <Link
            href="/example"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            View example output →
          </Link>
        </div>
      </section>

      {/* EXAMPLE SIGNAL */}
      <section className="bg-muted/40 py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-medium mb-6">
            Example: early risk signal
          </h2>

          <div className="rounded-xl border border-border bg-card p-7 space-y-4 shadow-sm">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-red-600">HIGH RISK</span>
              <span className="text-muted-foreground">
                Confidence: Medium
              </span>
            </div>

            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>67% of players quit before 3 minutes</li>
              <li>Death spikes before tutorial completion</li>
              <li>No session-to-session improvement</li>
            </ul>

            <p className="text-sm text-muted-foreground pt-2">
              Interpretation: Core gameplay loop friction detected. Iteration
              recommended before scaling production.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT IT DETECTS */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-medium mb-10">
            What LaunchSense detects
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Early abandonment",
                desc: "Players exiting before engagement stabilizes.",
              },
              {
                title: "Difficulty spikes",
                desc: "Deaths, restarts, and frustration signals.",
              },
              {
                title: "False engagement",
                desc: "Playtime that hides confusion, not fun.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card p-7 shadow-sm"
              >
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT’S FOR */}
      <section className="bg-muted/40 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-medium mb-10">Who this is for</h2>

          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h4 className="font-medium mb-3">Good fit</h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Indie & small studios validating ideas</li>
                <li>Teams before full production</li>
                <li>Mobile & PC playtests</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3">Not for</h4>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Live, shipped games</li>
                <li>Marketing analytics</li>
                <li>Guaranteed success prediction</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-medium mb-8">
            How teams use LaunchSense
          </h2>

          <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-2">
            <li>Run a closed playtest</li>
            <li>Send session data to LaunchSense</li>
            <li>Review detected risk signals</li>
            <li>
              <strong>
                Decide to iterate, pause, or rethink — early
              </strong>
            </li>
          </ol>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-muted/40 py-28 px-6 text-center">
        <h2 className="text-2xl font-medium mb-4">Simple pricing</h2>
        <p className="text-muted-foreground mb-8">
          Start free. Upgrade when deeper analysis is required.
          <br />
          No long-term contracts. No forced decisions.
        </p>

        <Link
          href="/signup"
          className="inline-block px-8 py-3 rounded-md bg-primary text-primary-foreground font-medium shadow-md hover:shadow-lg transition"
        >
          Try LaunchSense on a test build
        </Link>
      </section>

      {/* FOOTER NOTE */}
      <footer className="py-16 text-center text-sm text-muted-foreground leading-relaxed">
        LaunchSense highlights risk. Final decisions always stay with you.
      </footer>
    </MainLayout>
  );
}
