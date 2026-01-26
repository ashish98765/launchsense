import MainLayout from '../components/MainLayout';

export default function Home() {
  return (
    <MainLayout
      title="LaunchSense"
      description="Decision clarity for games and behavior-driven products"
    >
      <h1>
        Most products don’t fail at launch.<br />
        They fail quietly.
      </h1>

      <p className="sub">
        LaunchSense analyzes early behavior to surface hidden risk signals
        before months of development are committed.
      </p>

      <a className="cta" href="#">
        Analyze a test build
      </a>

      <section>
        <h2>How it works</h2>
        <ol>
          <li>Run a closed playtest</li>
          <li>Send session data</li>
          <li>Review risk signals</li>
          <li><strong>Decide early</strong></li>
        </ol>
      </section>
    </MainLayout>
  );
}
