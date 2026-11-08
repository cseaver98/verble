import VerbleGameClient from "./verble/components/VerbleGameClient";
import GameSeoContent from "./components/GameSeoContent";
import { buildGameMetadata } from "@/lib/game-seo";

export const metadata = {
  ...buildGameMetadata("verble"),
  other: { "alldle-verify": "NVQW9yzeh7vAIUvz6l4OGQc23JryX1sC" },
};

export default function HomePage() {
  return (
    <>
      <VerbleGameClient apiUrl="/api/verble/puzzle/today" navLabel="" lockDailyCompletion />
      <GameSeoContent slug="verble" />
    </>
  );
}
