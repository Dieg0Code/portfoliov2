import type { ComponentPropsWithoutRef } from "react";

export type ArchiveGlyphName =
  | "software"
  | "agents"
  | "mobile"
  | "teaching"
  | "process"
  | "communication"
  | "delivery"
  | "systems";

type ArchiveGlyphProps = Omit<
  ComponentPropsWithoutRef<"svg">,
  "children" | "viewBox"
> & {
  name: ArchiveGlyphName;
};

function renderPath(name: ArchiveGlyphName) {
  switch (name) {
    case "software":
      return (
        <>
          <rect x="4.5" y="5.5" width="15" height="13" rx="0" />
          <path d="m9 10-2.5 2.5L9 15" />
          <path d="m15 10 2.5 2.5L15 15" />
          <path d="m11.5 16 1.5-7" />
        </>
      );
    case "agents":
      return (
        <>
          <circle cx="7.5" cy="8" r="1.75" />
          <circle cx="16.5" cy="8" r="1.75" />
          <circle cx="12" cy="16" r="1.75" />
          <path d="M9.2 8h5.6" />
          <path d="m8.8 9.4 2.2 4.6" />
          <path d="m15.2 9.4-2.2 4.6" />
        </>
      );
    case "mobile":
      return (
        <>
          <rect x="7" y="3.5" width="10" height="17" rx="0" />
          <path d="M10.5 6h3" />
          <path d="M11.5 17.5h1" />
          <path d="M9.5 9.5h5" />
          <path d="M9.5 12.5h5" />
        </>
      );
    case "teaching":
      return (
        <>
          <path d="M4.5 7.5 12 4l7.5 3.5L12 11 4.5 7.5Z" />
          <path d="M7 10.2v3.2c0 1.3 2.2 2.6 5 2.6s5-1.3 5-2.6v-3.2" />
          <path d="M19.5 8v5" />
        </>
      );
    case "process":
      return (
        <>
          <rect x="4" y="5" width="6" height="4" rx="0" />
          <rect x="14" y="10" width="6" height="4" rx="0" />
          <rect x="4" y="15" width="6" height="4" rx="0" />
          <path d="M10 7h3.5l2 3" />
          <path d="M10 17h3.5l2-3" />
        </>
      );
    case "communication":
      return (
        <>
          <path d="M5 6.5h9v6H8.5L5 15v-2.5Z" />
          <path d="M10 10.5h9V16h-4L10 18.5V16Z" />
        </>
      );
    case "delivery":
      return (
        <>
          <path d="M5 8h10" />
          <path d="M13 5.5 18 8l-5 2.5" />
          <rect x="5" y="12" width="10" height="6" rx="0" />
          <path d="M8 15h4" />
        </>
      );
    case "systems":
      return (
        <>
          <rect x="4.5" y="5" width="15" height="4" rx="0" />
          <rect x="4.5" y="10.5" width="15" height="4" rx="0" />
          <rect x="4.5" y="16" width="15" height="3" rx="0" />
          <path d="M8 7h2" />
          <path d="M8 12.5h2" />
          <path d="M8 17.5h2" />
        </>
      );
    default:
      return null;
  }
}

export function ArchiveGlyph({ name, ...props }: ArchiveGlyphProps) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      {renderPath(name)}
    </svg>
  );
}
