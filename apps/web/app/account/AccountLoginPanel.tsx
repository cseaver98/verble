"use client";

import { useState } from "react";
import Link from "next/link";
import AuthDialog from "../components/AuthDialog";
import VerbleWordmark from "../components/VerbleWordmark";

export default function AccountLoginPanel() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <>
      <section className="arcade-login-panel mx-auto max-w-2xl rounded-[2rem] border border-[#d8dce2] bg-white p-8 text-center shadow-[0_20px_40px_rgba(44,47,49,0.06)] sm:p-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em]">
          <VerbleWordmark className="text-[1.15em]" /> <span className="arcade-login-accent">Account</span>
        </p>
        <h1 className="font-headline mt-3 text-4xl font-extrabold leading-tight text-[#2c2f31] sm:text-5xl">
          Save your stats and streaks
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-relaxed text-[#595c5e] sm:text-lg">
          Create an account to keep your progress across devices and unlock your <VerbleWordmark className="text-[1em]" /> stats.
        </p>
        <button
          type="button"
          onClick={() => setIsAuthOpen(true)}
          className="arcade-login-button font-headline mt-7 inline-flex h-12 w-full max-w-sm items-center justify-center rounded-full px-5 text-sm font-extrabold transition"
        >
          Create or log in
        </button>
        <Link
          href="/"
          className="mt-4 block text-sm font-bold text-[#595c5e] underline decoration-[#abadb0] underline-offset-4 transition hover:text-[#2c2f31]"
        >
          Back to game
        </Link>
      </section>
      <AuthDialog isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
