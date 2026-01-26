import Head from "next/head";
import Header from "../common/Header";
import Footer from "../common/Footer";

export default function MainLayout({
  children,
  title,
  description,
}) {
  return (
    <>
      <Head>
        <title>{title || "LaunchSense"}</title>
        <meta
          name="description"
          content={description || "Decision clarity before launch"}
        />
      </Head>

      <Header />

      <main className="min-h-screen bg-background text-foreground">
        {children}
      </main>

      <Footer />
    </>
  );
}
