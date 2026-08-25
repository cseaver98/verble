import VerbleGameClient from "../../verble/components/VerbleGameClient";

type ArchivePageProps = { params: Promise<{ date?: string }> | { date?: string } };

export default async function ArchivePuzzlePage({ params }: ArchivePageProps) {
  const resolvedParams = await params;
  const date = resolvedParams?.date || "";
  const encoded = encodeURIComponent(date || "");

  return (
    <VerbleGameClient
      apiUrl={`/api/verble/puzzle/by-date?date=${encoded}`}
      navLabel=""
      archiveHref="/archive"
      storagePrefix={`verble:v1:archive:${date}`}
      completionPrefix="verble:v1:archive-completed"
      lockDailyCompletion={false}
    />
  );
}
