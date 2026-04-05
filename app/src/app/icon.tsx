import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M19 2H5a2 2 0 00-2 2v14a2 2 0 002 2h4l3 3 3-3h4a2 2 0 002-2V4a2 2 0 00-2-2zm-7 12l-4-4 1.41-1.41L12 11.17l6.59-6.58L20 6l-8 8z"/>
        </svg>
      </div>
    ),
    { ...size }
  );
}
