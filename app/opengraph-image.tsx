import { ImageResponse } from "next/og";

/** Social-share card for CTRL. Rendered at build/request time — no external assets. */
export const runtime = "nodejs";
export const alt = "CTRL — Technical assessments built around real work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          padding: "72px",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: "12px",
              background: "#fafafa",
              color: "#0a0a0a",
              fontSize: "34px",
              fontWeight: 800,
              letterSpacing: "0.16em",
            }}
          >
            CTRL
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#34d399",
            }}
          >
            Technical assessments built around real work
          </span>
          <span style={{ fontSize: "60px", fontWeight: 800, lineHeight: 1.1, maxWidth: "900px" }}>
            See how candidates would keep operations moving.
          </span>
          <span style={{ fontSize: "26px", lineHeight: 1.4, color: "#a1a1aa", maxWidth: "940px" }}>
            Applicants solve realistic scenarios based on your company&apos;s work — see how
            they think, what they prioritise, and how their solution performs.
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
