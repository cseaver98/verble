"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DisplayNameDialogProps = {
  isOpen: boolean;
  suggestedDisplayName: string | null;
  onComplete: (displayName: string) => void;
};

export default function DisplayNameDialog({ isOpen, suggestedDisplayName, onComplete }: DisplayNameDialogProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [displayName, setDisplayName] = useState(suggestedDisplayName ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPortalRoot(document.body);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Could not save display name.");
      }

      const savedName = typeof payload.profile?.displayName === "string" ? payload.profile.displayName : displayName.trim();
      onComplete(savedName);
      window.dispatchEvent(new Event("verble:profile-updated"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save display name.");
    } finally {
      setSaving(false);
    }
  };

  if (!portalRoot || !isOpen) return null;

  return createPortal(
    <div className="arcade-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-[#2c2f31]/45 px-4 backdrop-blur-sm">
      <section
        className="arcade-modal-panel relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[#d8dce2] bg-white p-6 shadow-[0_28px_80px_rgba(44,47,49,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="display-name-dialog-title"
      >
        <div className="relative">
          <p className="dd-brand-word mb-4 inline-block !text-2xl">Verble<span className="dd-brand-dot">.</span>fun</p>
          <p className="font-headline text-sm font-extrabold uppercase tracking-[0.16em] text-[#2f672d]">Welcome</p>
          <h2 id="display-name-dialog-title" className="font-headline mt-3 text-4xl font-extrabold leading-tight text-[#2c2f31]">
            Choose your display name
          </h2>
          <p className="mt-4 text-base font-semibold leading-relaxed text-[#595c5e]">
            This is how your name will appear in Verble. You can change it later.
          </p>

          <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#75777a]" htmlFor="welcomeDisplayName">
                Display name
              </label>
              <input
                id="welcomeDisplayName"
                type="text"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setError("");
                }}
                minLength={2}
                maxLength={32}
                autoComplete="nickname"
                autoFocus
                placeholder="Your display name"
                className="mt-2 h-[3.25rem] w-full rounded-full border border-[#d8dce2] bg-[#f5f6f9] px-5 text-base font-extrabold text-[#2c2f31] outline-none transition focus:border-[#2f672d] focus:bg-white focus:ring-4 focus:ring-[#b6f6ab]/45"
              />
              <p className="mt-2 text-xs font-semibold text-[#75777a]">2-32 characters. Letters, numbers, spaces, periods, apostrophes, or hyphens.</p>
            </div>

            <button
              type="submit"
              disabled={saving || displayName.trim().length < 2}
              className="font-headline h-[3.25rem] rounded-full bg-[#5a4ff3] px-6 text-sm font-extrabold text-white shadow-[0_3px_0_#4030da] transition hover:bg-[#4030da] hover:shadow-[0_3px_0_#2d20b0] disabled:cursor-not-allowed disabled:bg-[#abadb0] disabled:text-white disabled:shadow-none"
            >
              {saving ? "Saving..." : "Continue"}
            </button>

            {error ? <p className="text-sm font-bold text-[#b02500]">{error}</p> : null}
          </form>
        </div>
      </section>
    </div>,
    portalRoot,
  );
}
