const paths = {
  activity: "M2 12h5l3-9 4 18 3-9h5",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  edit: "m15 4 5 5M4 20l4-1L21 6l-5-5L3 14l1 6Z",
  film: "M4 3h16v18H4zM4 8h16M4 16h16M8 3v18M16 3v18",
  folder: "M3 5h6l2 3h10v12H3V5Z",
  globe:
    "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0ZM2 12h20M12 2c6 5 6 15 0 20-6-5-6-15 0-20Z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  list: "M4 6h2m3 0h11M4 12h2m3 0h11M4 18h2m3 0h11",
  library: "M4 4h5v16H4zM13 4h5v16h-5zM21 5v14",
  play: "m9 5 11 7-11 7V5Z",
  plus: "M12 5v14M5 12h14",
  refresh: "M20 8V3l-4 4a8 8 0 1 0 3 9M20 3h-5",
  search: "m21 21-5-5M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z",
  settings:
    "m9 3-1 3-3 1-2 3 2 2v3l2 3h3l2 3 3-2 3-1v-3l3-2-2-3V7l-3-1-2-3H9Zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  user: "M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
} as const;
export const studioNavIcons = {
  intake: "upload",
  media: "library",
  people: "user",
  franchises: "library",
  categories: "grid",
  collections: "bookmark",
  tags: "bookmark",
  organizations: "film",
  enrich: "refresh",
  jobs: "activity",
  archive: "folder",
  settings: "settings",
} as const;
export function StudioIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      aria-hidden="true"
      className="icon sm"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
