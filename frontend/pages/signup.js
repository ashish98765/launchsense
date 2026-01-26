import MainLayout from "../components/layout/MainLayout";

export default function Signup() {
  return (
    <MainLayout title="Get started – LaunchSense">
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold mb-2">
          Get started
        </h1>

        <p className="text-muted-foreground mb-8">
          Create an account to analyze your first test build.
        </p>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-border rounded-lg px-4 py-3"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-border rounded-lg px-4 py-3"
          />

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium"
          >
            Create account
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-6">
          No spam. No dark patterns. Cancel anytime.
        </p>
      </div>
    </MainLayout>
  );
}
