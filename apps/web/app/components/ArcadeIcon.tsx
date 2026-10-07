import type { SVGProps } from "react";

export type ArcadeIconName = "menu" | "calendar" | "stats" | "profile" | "ticket" | "help" | "sparkle" | "refresh" | "bolt" | "backspace" | "share" | "copy" | "clock" | "check" | "lock";

const paths: Record<ArcadeIconName, React.ReactNode> = {
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M7 18h2" /></>,
  stats: <><path d="M3 20V11h4v9M10 20V4h4v16M17 20v-7h4v7M2 20h20" /></>,
  profile: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20v-2a7 7 0 0 1 14 0v2H5Z" /></>,
  ticket: <><path d="M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6V4Z" /><path d="M12 4v3M12 10v4M12 17v3" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 1 1 4.5 2c-1.3 1-2 1.4-2 3M12 17.5h.01" /></>,
  sparkle: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 17l.6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 9a7 7 0 0 1 12-2l2 2M4 15l2 2a7 7 0 0 0 12-2" /></>,
  bolt: <><path d="m13 2-9 11h7l-1 9 10-12h-7l1-8Z" /></>,
  backspace: <><path d="M9 5H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9L2 12l7-7ZM11 9l6 6m0-6-6 6" /></>,
  share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
  copy: <><rect x="8" y="7" width="12" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
};

export default function ArcadeIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: ArcadeIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
