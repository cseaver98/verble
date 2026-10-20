import type { Metadata } from "next";

export const siteUrl = "https://verble.fun";
export type GameSeoSlug = "verble";

export const gameSeo = {
  verble: {
    name: "Verble",
    path: "/",
    title: "Verble.fun: Free Daily Phrase Guessing Game",
    heading: "Verble: a free daily phrase guessing game",
    description:
      "Play Verble free every day. Guess one word at a time to reveal a familiar phrase, with six guesses and one risky shot at the full answer.",
    intro:
      "Verble is a daily word game where every correct guess reveals part of a familiar phrase. Work through the phrase one word at a time and solve it in six guesses or fewer.",
    details:
      "Think you know the answer early? You can attempt the full phrase at any time, but a wrong full-phrase guess ends the game. A fresh Verble puzzle is available every day.",
    howToPlay: [
      "Choose a hidden word and enter your guess.",
      "Use the letter feedback and revealed words to narrow down the phrase.",
      "Solve every word or risk a full-phrase guess before your six attempts run out.",
    ],
    iconSrc: "/verble-mark-v6.png",
  },
} as const;

export const buildGameMetadata = (slug: GameSeoSlug): Metadata => {
  const game = gameSeo[slug];

  return {
    title: game.title,
    description: game.description,
    alternates: { canonical: game.path },
    openGraph: {
      title: game.title,
      description: game.description,
      url: game.path,
      siteName: "Verble.fun",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: game.title,
      description: game.description,
    },
  };
};
