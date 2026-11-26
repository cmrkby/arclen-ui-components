export const glyphs={
  Home:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>',
  Grid:'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  Sparkle:'<path d="M12 2.5c1.1 5.6 3.9 8.4 9.5 9.5-5.6 1.1-8.4 3.9-9.5 9.5C10.9 15.9 8.1 13.1 2.5 12c5.6-1.1 8.4-3.9 9.5-9.5z"/>',
  Pencil:'<path d="m5 15 11-11c1.6-1.6 5.6 2.4 4 4L9 19l-5 1zM14 6l4 4"/>',
  Profile:'<circle cx="12" cy="7.5" r="3.6"/><path d="M4.3 20c.9-7.5 14.5-7.5 15.4 0"/>',
  Mail:'<rect x="2.8" y="5" width="18.4" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
  Search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  Folder:'<path d="M3 6h7l2 3h9v11H3z"/>',
  Bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  Globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
} as const;
export type IslandIcon=keyof typeof glyphs;
