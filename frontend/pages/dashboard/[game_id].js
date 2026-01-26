import { useRouter } from "next/router";
import MainLayout from "../../components/layout/MainLayout";

export default function GameDetail() {
  const { game_id } = useRouter().query;

  return (
    <MainLayout title={`Analysis – ${game_id}`}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-2">
          {game_id}
        </h1>

        <p className="text-muted-foreground mb-10">
          Analysis based on early session behavior.
        </p>

        {/* SUMMARY */}
        <section className="border border-border rounded-2xl p-6 mb-8">
          <h2 className="font-medium mb-2">Summary</h2>
          <p className="text-sm text-muted-foreground">
            Players are exiting before core mechanics are understood.
            Patterns suggest onboarding friction rather than difficulty.
          </p>
        </section>

        {/* SIGNALS */}
        <section className="mb-8">
          <h2 className="font-medium mb-4">Observed signals</h2>

          <div className="space-y-4">
            <div className="border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium mb-1">
                Early abandonment
              </h3>
              <p className="text-sm text-muted-foreground">
                60% of sessions end within the first 3 minutes.
              </p>
            </div>

            <div className="border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium mb-1">
                Retry concentration
              </h3>
              <p className="text-sm text-muted-foreground">
                Repeated failures occur before tutorial completion.
              </p>
            </div>
          </div>
        </section>

        {/* CONFIDENCE */}
        <section className="border border-border rounded-2xl p-6">
          <h2 className="font-medium mb-2">Confidence</h2>
          <p className="text-sm text-muted-foreground">
            Medium — patterns are consistent, but sample size is still growing.
          </p>
        </section>
      </div>
    </MainLayout>
  );
}
