import { ImageResponse } from "next/og";
import { mark } from "@/components/brand/logo-data";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF6EF" }}>
        <svg width={112} height={112} viewBox="0 0 32 32">
          <path d={`${mark.drop} ${mark.nib}`} fill="#7A1F2B" fillRule="evenodd" />
          <circle cx={mark.dot.cx} cy={mark.dot.cy} r={mark.dot.r} fill="#B08A3E" />
        </svg>
      </div>
    ),
    size,
  );
}
