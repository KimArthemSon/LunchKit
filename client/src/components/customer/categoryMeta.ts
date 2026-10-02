import type { ProductCategory } from "../../api/products";

// Icon and one-line description per category — shared by category tiles and section subtitles
export const CATEGORY_META: Record<ProductCategory, { icon: string; blurb: string }> = {
  Mockups: { icon: "Smartphone", blurb: "Device frames & scenes" },
  Graphics: { icon: "Palette", blurb: "Icons, social & OG images" },
  Videos: { icon: "Video", blurb: "Overlays & demo edits" },
  Templates: { icon: "Presentation", blurb: "Pitch decks & docs" },
  Bundles: { icon: "Layers", blurb: "Save with curated packs" },
};
