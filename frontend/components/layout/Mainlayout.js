import Head from "next/head";
import Link from "next/link";

export default function MainLayout({
  title,
  description,
  children,
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="font-semibold text-lg">
            LaunchSense
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/product" className="hover:text-foreground">
              Product
            </Link>
            <Link href="/example" className="hover:text-foreground">
              Example
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
          </nav>

          {/* CTA */}
          <Link
            href="/signup"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-sm"
          >
            Analyze a build
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <main>{children}</main>
    </>
  );
}
