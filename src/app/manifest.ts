import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inkinspire",
    short_name: "Inkinspire",
    description: "Stories, poetry and reflections by Xenia, the Storyteller.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF6EF",
    theme_color: "#FAF6EF",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
