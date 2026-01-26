import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          LaunchSense
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/product">Product</Link>
          <Link href="/example">Example</Link>
          <Link href="/pricing">Pricing</Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Analyze a build
          </Link>
        </nav>
      </div>
    </header>
  );
}
