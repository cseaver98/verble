import { trackEvent } from "@/lib/analytics-client";

type ShareResult = "shared" | "copied" | "failed" | "aborted";

const trackSuccessfulShare = (method: "native" | "clipboard", text: string) => {
  const urlMatch = text.match(/https?:\/\/[^\s]+/g)?.at(-1);
  let gameSlug: string | undefined;
  let isArchive = false;

  if (urlMatch) {
    try {
      const url = new URL(urlMatch);
      gameSlug = "verble";
      isArchive = url.pathname.includes("/archive");
    } catch {
      // The share still succeeded even if its URL cannot be parsed.
    }
  }

  trackEvent({ eventName: "result_shared", gameSlug, isArchive, metadata: { method } });
};

export const shareResultText = async (_title: string, text: string): Promise<ShareResult> => {
  if (!text) {
    return "failed";
  }

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      trackSuccessfulShare("native", text);
      return "shared";
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return "aborted";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    trackSuccessfulShare("clipboard", text);
    return "copied";
  } catch {
    return "failed";
  }
};
