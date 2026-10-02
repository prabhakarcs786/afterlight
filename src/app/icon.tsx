import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", background: "#243e36", color: "#f2efb5", fontFamily: "serif", fontSize: 48 }}>a+</div>, size);
}