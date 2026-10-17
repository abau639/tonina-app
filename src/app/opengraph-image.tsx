import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Share card for LinkedIn, X and messaging previews. Theme A: navy band, pink only on the wordmark dot.
export const alt = "Tonina.me: Learn finance the way it's actually used";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // Sora ExtraBold (SIL Open Font License) so the card matches the site headings.
  const sora = await readFile(join(process.cwd(), "src/app/_fonts/Sora-ExtraBold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f1b2d",
          color: "#ffffff",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 44, fontFamily: "Sora" }}>
          Tonina<span style={{ color: "#f472b6" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 72, fontFamily: "Sora", lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: 980 }}>
            Learn finance the way it&apos;s actually used.
          </div>
          <div style={{ fontSize: 32, color: "#b7c2d6", maxWidth: 900, lineHeight: 1.35 }}>
            Plan your path, learn how money works, and think like a finance professional.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#b7c2d6" }}>
          <span>tonina.me</span>
          <span>Join me as I learn</span>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Sora", data: sora, weight: 800, style: "normal" }] },
  );
}
