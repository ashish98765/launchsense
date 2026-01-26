export default function Footer() {
  return (
    <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
      <p>LaunchSense highlights risk. Final decisions always stay with you.</p>
      <p className="mt-2">© {new Date().getFullYear()} LaunchSense</p>
    </footer>
  );
}
