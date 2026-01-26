// frontend/components/layout/MainLayout.js

import Head from "next/head";

export default function MainLayout({ 
  title = "LaunchSense",
  description = "Decision clarity for behavior-driven products",
  children 
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>

      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    </>
  );
}
