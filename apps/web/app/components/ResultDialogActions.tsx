"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";

type ResultDialogActionsProps = {
  currentGameSlug: string;
  onShare: () => void | Promise<void>;
};

const gameButtonThemes: Record<string, { start: string; end: string; shadow: string }> = {
  verble: { start: "#7a5af8", end: "#5a40cb", shadow: "rgba(90, 64, 203, 0.28)" },
};

const statsButtonTheme = { start: "#2f672d", end: "#225b22", shadow: "rgba(34, 91, 34, 0.24)" };

const getPrimaryButtonStyle = (gameSlug: string | undefined, isHovered: boolean): CSSProperties => {
  const theme = gameSlug ? gameButtonThemes[gameSlug] : statsButtonTheme;
  return {
    background: isHovered
      ? `linear-gradient(135deg, ${theme.end}, ${theme.end})`
      : `linear-gradient(135deg, ${theme.start}, ${theme.end})`,
    boxShadow: isHovered ? `0 12px 24px ${theme.shadow}` : `0 10px 20px ${theme.shadow}`,
  };
};

export default function ResultDialogActions({ currentGameSlug, onShare }: ResultDialogActionsProps) {
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const primaryHref = "/account/stats";
  const primaryLabel = "Stats";

  return (
    <div className="result-modal-actions">
      <button className="admin-btn-like" type="button" onClick={() => void onShare()}>
        Share
      </button>
      <Link className="admin-btn-like" href="/">
        Home
      </Link>
      <Link
        className="admin-btn-like primary"
        href={primaryHref}
        onMouseEnter={() => setIsPrimaryHovered(true)}
        onMouseLeave={() => setIsPrimaryHovered(false)}
        onFocus={() => setIsPrimaryHovered(true)}
        onBlur={() => setIsPrimaryHovered(false)}
        style={{
          ...getPrimaryButtonStyle(currentGameSlug, isPrimaryHovered),
          whiteSpace: "nowrap",
          fontSize: primaryLabel.length >= 13 ? "0.8rem" : undefined,
          paddingInline: primaryLabel.length >= 13 ? "0.65rem" : undefined,
        }}
      >
        {primaryLabel}
      </Link>
    </div>
  );
}
