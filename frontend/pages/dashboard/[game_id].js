import { useRouter } from "next/router";
import MainLayout from "../../components/layout/MainLayout";

export default function GameDetail() {
  const router = useRouter();
  const { game_id } = router.query;

  return (
    <MainLayout title={`Analysis – ${game_id}`}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-2">
          {game_id}
        </h1>

        <p className="text-muted-foreground mb-8">
          Observed signals from early sessions.
        </p>

        <div className="space-y-6">
          <div className="border border-border rounded-xl p-6">
            <h3 className="font-medium mb-2">Primary signal</h3>
            <p className="text-sm text-muted-foreground">
              Early abandonment detected before engagement stabilizes.
            </p>
          </div>

          <div className="border border-border rounded-xl p-6">
            <h3 className="font-medium mb-2">Confidence level</h3>
            <p className="text-sm text-muted-foreground">
              Medium — based on session consistency and replay variance.
            </p>
          </div>

          <div className="border border-border rounded-xl p-6">
            <h3 className="font-medium mb-2">Suggested focus</h3>
            <p className="text-sm text-muted-foreground">
              Review onboarding friction before scaling traffic.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
