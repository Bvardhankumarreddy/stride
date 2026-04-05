import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Stride — AI-Native Project Management";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f0f13 0%, #1a1025 50%, #0f0f13 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />

        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            boxShadow: "0 0 60px rgba(124,58,237,0.5)",
          }}
        >
          <svg width="52" height="52" viewBox="0 0 24 24" fill="white">
            <path d="M19 2H5a2 2 0 00-2 2v14a2 2 0 002 2h4l3 3 3-3h4a2 2 0 002-2V4a2 2 0 00-2-2zm-7 12l-4-4 1.41-1.41L12 11.17l6.59-6.58L20 6l-8 8z"/>
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "white",
            letterSpacing: "-3px",
            marginBottom: 16,
          }}
        >
          Stride
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.55)",
            fontWeight: 400,
            letterSpacing: "-0.5px",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          AI-native project management for teams that ship
        </div>

        {/* Pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          {["Issue Tracking", "Sprint Planning", "Team Docs", "AI Digest"].map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 18px",
                borderRadius: 100,
                border: "1px solid rgba(124,58,237,0.4)",
                background: "rgba(124,58,237,0.15)",
                color: "rgba(196,168,255,0.9)",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
