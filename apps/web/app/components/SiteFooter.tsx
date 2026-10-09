import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="arcade-site-footer">
      <span>© {new Date().getFullYear()} Verble.fun</span>
      <nav aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
