"use client";

import Link from "next/link";
import ArcadeIcon from "./ArcadeIcon";

type ResultDialogActionsProps = {
  currentGameSlug: string;
  onShare: () => void | Promise<void>;
  onReplay?: () => void;
};

export default function ResultDialogActions({ onShare, onReplay }: ResultDialogActionsProps) {
  return <div className="result-modal-actions arcade-result-actions">
    <button className="arcade-result-share" type="button" onClick={() => void onShare()}><ArcadeIcon name="share" /> Share your result</button>
    {onReplay ? <button type="button" onClick={onReplay}><ArcadeIcon name="refresh" /> Replay archive</button> : <Link href="/account/stats"><ArcadeIcon name="stats" /> View Full Stats</Link>}
    <Link href="/archive"><ArcadeIcon name="calendar" /> Past Days</Link>
  </div>;
}
