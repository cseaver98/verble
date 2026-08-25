"use client";

import { VerbleNav } from "@verble/ui";
import GameMenu from "../../components/GameMenu";
import AccountNav from "../../components/AccountNav";
import { usePathname } from "next/navigation";

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
      leftContent={<GameMenu todayHref="/" archiveHref="/archive" hideToday={hideTodayOption} />}
      rightContent={<AccountNav />}
    />
  );
}
