import { NextRequest, NextResponse } from "next/server";
import { archiveOnlyGameSlugs } from "@/lib/games";

export const ARCHIVE_UNLOCK_COOKIE = "verble_archive_game_one_unlock";
const ARCHIVE_UNLOCK_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const getArchiveUnlockPassword = (): string => process.env.ARCHIVE_GAME_ONE_PASSWORD?.trim() || "";

export const isArchiveLockEnabled = (gameSlug?: string): boolean =>
  !gameSlug || !archiveOnlyGameSlugs.has(gameSlug)
    ? getArchiveUnlockPassword().length > 0
    : false;

export const isLockedArchiveGameNumber = (archiveGameNumber?: number | null, gameSlug?: string): boolean =>
  isArchiveLockEnabled(gameSlug) && archiveGameNumber === 1;

export const hasArchiveUnlockCookie = (request: Pick<NextRequest, "cookies">): boolean =>
  request.cookies.get(ARCHIVE_UNLOCK_COOKIE)?.value === "1";

export const isArchivePasswordValid = (password: string): boolean =>
  Boolean(password) && password.trim() === getArchiveUnlockPassword();

export const applyArchiveUnlockCookie = (response: NextResponse): NextResponse => {
  response.cookies.set(ARCHIVE_UNLOCK_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ARCHIVE_UNLOCK_MAX_AGE_SECONDS,
  });

  return response;
};

export const createArchiveLockedResponse = () =>
  NextResponse.json(
    {
      locked: true,
      lockTitle: "Archive Game #1 is locked",
      lockDescription: "",
    },
    { status: 423 },
  );

export function getArchivePuzzleLockState({
  request,
  archiveGameNumber,
  gameSlug,
}: {
  request: Pick<NextRequest, "cookies">;
  archiveGameNumber?: number | null;
  gameSlug?: string;
}) {
  const locked = isLockedArchiveGameNumber(archiveGameNumber, gameSlug) && !hasArchiveUnlockCookie(request);
  return { locked };
}
