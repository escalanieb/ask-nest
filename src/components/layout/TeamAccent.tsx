import { useEffect } from "react";
import { useAuthStore } from "../../stores/useAuthStore";

export default function TeamAccent() {
  const color = useAuthStore((state) => state.user?.team?.accent_color);
  useEffect(() => {
    const value = color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#475569";
    document.documentElement.style.setProperty("--team-accent", value);
    const channels = [1, 3, 5].map((offset) => {
      const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    document.documentElement.style.setProperty(
      "--team-on-accent",
      luminance > 0.179 ? "#000000" : "#ffffff",
    );
    return () => {
      document.documentElement.style.removeProperty("--team-accent");
      document.documentElement.style.removeProperty("--team-on-accent");
    };
  }, [color]);
  return null;
}
