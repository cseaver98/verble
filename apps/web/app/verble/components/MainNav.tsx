"use client";

import { VerbleNav } from "@verble/ui";
import GameMenu from "../../components/GameMenu";
import AccountNav from "../../components/AccountNav";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ArcadeIcon from "../../components/ArcadeIcon";

export default function MainNav({ label = "Verble", hideToday = false }) {
  const pathname = usePathname();
  const isOnTodaysGame = pathname === "/";
  const hideTodayOption = hideToday || isOnTodaysGame;

  return (
    <VerbleNav
      label={label}
      labelId="challengeDate"
      labelClassName="subtle nav-date"
      homeHref="/"
      leftContent={<><GameMenu todayHref="/" archiveHref="/archive" hideToday={hideTodayOption} /><Link href="/archive" className="arcade-nav-icon" aria-label="Past days"><ArcadeIcon name="calendar" /></Link></>}
      rightContent={<><Link href="/account/stats" className="arcade-nav-icon" aria-label="Stats"><ArcadeIcon name="stats" /></Link><AccountNav /></>}
    />
  );
}
