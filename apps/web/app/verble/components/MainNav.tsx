"use client";

import { VerbleNav } from "@verble/ui";
import AccountNav from "../../components/AccountNav";
import Link from "next/link";
import Image from "next/image";
import ArcadeIcon from "../../components/ArcadeIcon";

export default function MainNav({ label = "Verble" }) {
  return (
    <VerbleNav
      label={label}
      labelId="challengeDate"
      labelClassName="subtle nav-date"
      homeHref="/"
      leftContent={<><Link href="/" className="arcade-nav-icon arcade-nav-logo" aria-label="Today's Verble"><Image src="/icon.png?v=transparent" alt="" width={40} height={40} unoptimized /></Link><Link href="/archive" className="arcade-nav-icon" aria-label="Past days"><ArcadeIcon name="calendar" /></Link></>}
      rightContent={<><Link href="/account/stats" className="arcade-nav-icon arcade-nav-stats" aria-label="Stats"><ArcadeIcon name="stats" /></Link><AccountNav /></>}
    />
  );
}
