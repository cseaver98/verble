"use client";

import { VerbleNav } from "@verble/ui";
import AccountNav from "../../components/AccountNav";
import Link from "next/link";
import ArcadeIcon from "../../components/ArcadeIcon";

export default function MainNav({ label = "Verble" }) {
  return (
    <VerbleNav
      label={label}
      labelId="challengeDate"
      labelClassName="subtle nav-date"
      homeHref="/"
      leftContent={<Link href="/archive" className="arcade-nav-icon" aria-label="Past days"><ArcadeIcon name="calendar" /></Link>}
      rightContent={<><Link href="/account/stats" className="arcade-nav-icon" aria-label="Stats"><ArcadeIcon name="stats" /></Link><AccountNav /></>}
    />
  );
}
