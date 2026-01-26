import Head from "next/head";
import Link from "next/link";

export default function MainLayout({
  title = "LaunchSense",
  description = "Decision clarity for games & behavior-driven products",
  children,
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="font-semibold text-base tracking-tight"
          >
            LaunchSense
          </Link>

          {/* Nav (desktop only) */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="/product"
              className="hover:text-foreground transition"
            >
              Product
            </Link>
            <Link
              href="/example"
              className="hover:text-foreground transition"
            >
              Example
            </Link>
            <Link
              href="/pricing"
              className="hover:text-foreground transition"
            >
              Pricing
            </Link>
          </nav>

          {/* Primary CTA */}
          <Link
            href="/signup"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:shadow-md transition"
          >
            Analyze a build
          </Link>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="min-h-screen">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border mt-24">
        <div className="max-w-6xl mx-auto px-6 py-16 text-sm text-muted-foreground">
          <div className="grid gap-10 md:grid-cols-3">
            {/* Column 1 */}
            <div>
              <p className="font-medium text-foreground mb-3">
                LaunchSense
              </p>
              <p className="leading-relaxed">
                Early risk signals for games and
                behavior-driven products.
                <br />
                Calm analysis. No hype.
              </p>
            </div>

            {/* Column 2 */}
            <div>
              <p className="font-medium text-foreground mb-3">
                Product
              </p>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-foreground transition"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sdk"
                    className="hover:text-foreground transition"
                  >
                    SDK
                  </Link>
                </li>
                <li>
                  <Link
                    href="/demo"
                    className="hover:text-foreground transition"
                  >
                    Demo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div>
              <p className="font-medium text-foreground mb-3">
                Principles
              </p>
              <ul className="space-y-2">
                <li>No urgency manufacturing</li>
                <li>No success guarantees</li>
                <li>Decisions stay human</li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-6 border-t border-border text-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <p>
              © {new Date().getFullYear()} LaunchSense
            </p>
            <p>
              LaunchSense highlights risk.
              Final decisions always stay with you.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
