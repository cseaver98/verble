export type Game = {
  slug: "verble";
  name: "Verble";
  href: "/";
  description: string;
  iconSrc: string;
  iconAlt: string;
  iconBackground: string;
  availability: "daily";
};

export const games: Game[] = [
  {
    slug: "verble",
    name: "Verble",
    href: "/",
    description: "Guess the daily phrase one word at a time.",
    iconSrc: "/verble-mark-v5.png",
    iconAlt: "Verble logo",
    iconBackground: "#ede9fe",
    availability: "daily",
  },
];

export const dailyGames = games;
export const archiveOnlyGames: Game[] = [];
export const dailyGameSlugs = new Set<string>(games.map((game) => game.slug));
export const archiveOnlyGameSlugs = new Set<string>();
export const getGamePlayHref = (game: Game) => game.href;
export const allowedGameSlugs = new Set<string>(games.map((game) => game.slug));
