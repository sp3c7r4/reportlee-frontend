import { cn } from "@/lib/utils";

const TILE = 104;
const COLS = 20;
const ROWS = 12;
const DENSITY = 18; // percent of the grid that carries a tile

/** Scatter rule for a grid of any shape: no two neighbours ever both fill. */
function scatter(columns: number, rows: number): Array<[number, number]> {
  /**
   * Deterministic scatter: a sparse field of report-sized blocks with no two
   * neighbours filled, so the texture reads as placed rather than generated.
   * Stable across renders, which keeps server and client markup identical.
   */
  const cells: Array<[number, number]> = [];
  const taken = new Set<string>();
  const has = (c: number, r: number) => taken.has(`${c},${r}`);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const hash = Math.abs(Math.imul(column + 1, 0x9e3779b1) ^ Math.imul(row + 1, 0x85ebca6b));
      const keep = ((hash >>> 8) % 1000) / 10 < DENSITY;
      if (!keep || has(column - 1, row) || has(column, row - 1) || has(column - 1, row - 1))
        continue;
      taken.add(`${column},${row}`);
      cells.push([column, row]);
    }
  }

  return cells;
}

const FILLED_TILES = scatter(COLS, ROWS);

type MosaicProps = {
  tone?: "light" | "dark";
  /** "slice" crops the field to the box so tiles stay square; default fits it whole. */
  fit?: "fit" | "slice";
  /** Grid shape: match the box's own aspect so tiles keep their scale. */
  columns?: number;
  rows?: number;
  /** The clearing behind centred type. Off when the surface masks the field itself. */
  fade?: boolean;
  className?: string;
};

/** Report-sized blocks: the page's one recurring texture, cleared behind type. */
export function Mosaic({
  tone = "light",
  fit = "fit",
  fade = true,
  columns = COLS,
  rows = ROWS,
  className,
}: MosaicProps) {
  const tiles = columns === COLS && rows === ROWS ? FILLED_TILES : scatter(columns, rows);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${columns * TILE} ${rows * TILE}`}
        preserveAspectRatio={fit === "slice" ? "xMidYMid slice" : "xMidYMid meet"}
        className={cn("absolute inset-0 h-full w-full", fade && "mosaic-fade")}
      >
        <g className={tone === "dark" ? "fill-white/[0.042]" : "fill-ink/[0.042]"}>
          {tiles.map(([column, row]) => (
            <rect
              key={`${column}-${row}`}
              data-mosaic-tile
              x={column * TILE}
              y={row * TILE}
              width={TILE}
              height={TILE}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
