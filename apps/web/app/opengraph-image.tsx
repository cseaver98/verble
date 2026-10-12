import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const icon = await readFile(new URL("../public/verble-mark-v6.png", import.meta.url));
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 80% 15%, #ddd4ff 0%, transparent 34%), linear-gradient(145deg, #ffffff 0%, #f5f2ff 100%)",
        color: "#2c2f31",
        padding: "72px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "52px" }}>
        <div
          style={{
            width: "210px",
            height: "210px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "52px",
            background: "#ede9fe",
            boxShadow: "0 26px 70px rgba(90, 64, 203, 0.18)",
          }}
        >
          <img alt="" height={165} src={iconSrc} width={165} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", color: "#5a40cb", fontSize: "92px", fontWeight: 900, letterSpacing: "-0.06em" }}>
            Verble
          </div>
          <div style={{ display: "flex", maxWidth: "660px", fontSize: "38px", fontWeight: 700, lineHeight: 1.2 }}>
            Reveal the daily phrase one word at a time.
          </div>
          <div style={{ display: "flex", color: "#6d44c5", fontSize: "26px", fontWeight: 700 }}>
            verble.fun
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
