import Head from 'next/head';

export default function MainLayout({ title, description, children }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <header className="header">LaunchSense</header>
        <main>{children}</main>
        <footer className="footer">
          © {new Date().getFullYear()} LaunchSense
        </footer>
      </div>
    </>
  );
}
