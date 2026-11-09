import type { ReactNode } from "react";

export type GlyphName =
  | "search"
  | "graph"
  | "plus"
  | "spark"
  | "book"
  | "flip"
  | "share"
  | "copy"
  | "trash"
  | "left"
  | "right"
  | "theme"
  | "carry"
  | "hands"
  | "close"
  | "pulse";

export function Glyph({ name, live = false }: { name: GlyphName; live?: boolean }) {
  return (
    <svg className={live ? "glyph live" : "glyph"} viewBox="0 0 24 24" aria-hidden="true">
      {paths(name)}
    </svg>
  );
}

export function IconButton({
  name,
  label,
  onClick,
  tone = "quiet",
}: {
  name: GlyphName;
  label: string;
  onClick: () => void;
  tone?: "quiet" | "brass";
}) {
  return (
    <button type="button" className={tone === "brass" ? "icon-btn brass" : "icon-btn"} aria-label={label} onClick={onClick}>
      <Glyph name={name} />
    </button>
  );
}

function S({ d }: { d: string }) {
  return <path className="g-stroke" d={d} />;
}

function paths(name: GlyphName): ReactNode {
  switch (name) {
    case "search":
      return (
        <>
          <circle className="g-stroke" cx="11" cy="11" r="6" />
          <S d="M16 16.5 20 20.5" />
        </>
      );
    case "graph":
      return (
        <>
          <circle className="g-stroke" cx="6" cy="14" r="2.2" />
          <circle className="g-stroke" cx="17" cy="6" r="2.2" />
          <circle className="g-stroke" cx="18" cy="17.5" r="2.2" />
          <S d="M8 13.2 15 7.4M8.1 15.2 16 17" />
        </>
      );
    case "plus":
      return <S d="M12 5v14M5 12h14" />;
    case "spark":
      return <S d="M12 3.8 13.3 9.1 18.6 10.4 13.3 11.7 12 17 10.7 11.7 5.4 10.4 10.7 9.1 12 3.8z" />;
    case "book":
      return (
        <S d="M4 5.5h5.2A3.2 3.2 0 0 1 12.2 8.5V19a2.4 2.4 0 0 0-2.2-1.6H4zM20 5.5h-5.2A3.2 3.2 0 0 0 11.8 8.5V19a2.4 2.4 0 0 1 2.2-1.6H20z" />
      );
    case "flip":
      return <S d="M4 9.5h9.2a3 3 0 0 1 3 3V15M7 6.5 4 9.5 7 12.5M20 14.5H10.8a3 3 0 0 1-3-3V9M17 17.5 20 14.5 17 11.5" />;
    case "share":
      return (
        <>
          <circle className="g-stroke" cx="7" cy="12" r="2.1" />
          <circle className="g-stroke" cx="17" cy="7" r="2.1" />
          <circle className="g-stroke" cx="17" cy="17" r="2.1" />
          <S d="M9 11.2 14.8 8.2M9.1 13 14.8 16" />
        </>
      );
    case "copy":
      return <S d="M9 9h9.2v10.2H9zM6 15.2V5.8h9.2" />;
    case "trash":
      return <S d="M5 7.5h14M9.5 7.4V5.8h5V7.4M7.2 7.5l.7 11h8.2l.7-11" />;
    case "left":
      return <S d="M14.5 6 8.5 12l6 6" />;
    case "right":
      return <S d="M9.5 6 15.5 12l-6 6" />;
    case "theme":
      return (
        <S d="M12 4.2v1.8M12 18v1.8M4.2 12H6M18 12h1.8M6.6 6.6l1.2 1.2M16.2 16.2l1.2 1.2M17.4 6.6l-1.2 1.2M7.8 16.2 6.6 17.4M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8z" />
      );
    case "carry":
      return <S d="M8 10.2V7.6A4 4 0 0 1 12 3.6a4 4 0 0 1 4 4v2.6M6.2 10.2h11.6V19H6.2z" />;
    case "hands":
      return <S d="M8.2 14.2c-2-2.2-2.2-4.8-.4-6.2 1.3-.9 2.6-.3 3.2.9.6-1.2 1.9-1.8 3.2-.9 1.8 1.4 1.6 4-.4 6.2L12 17.8z" />;
    case "close":
      return <S d="M7 7l10 10M17 7 7 17" />;
    case "pulse":
      return <S d="M3.8 13h3.4l1.8-4.4 2.7 8.4 2.1-5.2 1.5 1.2H20.2" />;
    default:
      return null;
  }
}
