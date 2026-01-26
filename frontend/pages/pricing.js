import MainLayout from "../components/layout/MainLayout";
import Link from "next/link";

export default function Pricing() {
  return (
    <MainLayout title="Pricing – LaunchSense">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold mb-4">
          Simple, honest pricing
        </h1>

        <p className="text-muted-foreground mb-12 max-w-2xl">
          Start free. Upgrade only when deeper analysis is useful.
          No long-term contracts. Decisions stay with you.
        </p>

        <div className="grid gap-8 sm:grid-cols-2">
          {/* FREE */}
          <div className="border border-border rounded-2xl p-8">
            <h2 className="text-xl font-medium mb-2">Free</h2>
            <p className="text-muted-foreground mb-6">
              For early playtests and validation.
            </p>

            <p className="text-3xl font-semibold mb-6">$0</p>

            <ul className="space-y-3 text-sm text-muted-foreground mb-8">
              <li>• One test build</li>
              <li>• Early risk signals</li>
              <li>• Confidence indicators</li>
              <li>• Basic dashboard</li>
            </ul>

            <Link
              href="/signup"
              className="inline-block w-full text-center rounded-lg px-6 py-3 bg-primary text-primary-foreground font-medium"
            >
              Start free
            </Link>
          </div>

          {/* PRO */}
          <div className="border border-primary rounded-2xl p-8">
            <h2 className="text-xl font-medium mb-2">Pro</h2>
            <p className="text-muted-foreground mb-6">
              For teams preparing to scale.
            </p>

            <p className="text-3xl font-semibold mb-6">
              $49 <span className="text-sm text-muted-foreground">/ test</span>
            </p>

            <ul className="space-y-3 text-sm text-muted-foreground mb-8">
              <li>• Multiple test builds</li>
              <li>• Session-level intelligence</li>
              <li>• Trend confidence tracking</li>
              <li>• Priority signal explanations</li>
            </ul>

            <Link
              href="/signup"
              className="inline-block w-full text-center rounded-lg px-6 py-3 border border-border font-medium hover:bg-muted transition"
            >
              Upgrade when ready
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
