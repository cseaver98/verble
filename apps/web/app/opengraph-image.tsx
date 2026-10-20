import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";

export const alt = "Verble.fun — a fresh daily phrase game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [mark, wordmark] = await Promise.all([
    readFile(new URL("../public/verble-social-mark.png", import.meta.url)),
    readFile(new URL("../public/verble-email-wordmark.png", import.meta.url)),
  ]);
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  const wordmarkSrc = `data:image/png;base64,${wordmark.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "76px 80px",
        background: "radial-gradient(circle at 85% 18%, #dcd4ff 0%, transparent 38%), linear-gradient(135deg, #fcf8ff 0%, #efebff 100%)",
        border: "12px solid #5a4ff3",
        color: "#181445",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 675 }}>
        <img alt="" src={wordmarkSrc} width={430} height={96} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: "-0.055em",
            lineHeight: 1.05,
          }}
        >
          <span>A fresh phrase.</span>
          <span>Every day.</span>
        </div>
        <div style={{ display: "flex", marginTop: 28, color: "#464555", fontSize: 29, fontWeight: 600 }}>
          Guess one word at a time.
        </div>
      </div>
      <div
        style={{
          width: 382,
          height: 382,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 88,
          background: "#e6e0ff",
          boxShadow: "0 24px 70px rgba(64, 48, 218, 0.16)",
        }}
      >
        <img alt="" src={markSrc} width={350} height={350} />
      </div>
    </div>,
    size,
  );
}
