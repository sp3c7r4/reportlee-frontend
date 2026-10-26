/**
 * Reportlee monogram: three report bars in a rounded tile.
 * Paths come from the designer's source SVG and are used unmodified.
 *
 * The tile is the brand orange in every theme, and the three bars inside it are white
 * in every theme. They were tokens, which made them follow the surface: in the dark
 * scene `--surface-alt` is nearly black, so the bars inside the mark turned dark and the
 * logo inverted itself. A mark is an asset, not a surface, so it does not follow the
 * theme. Only the wordmark's letters do, through `currentColor`.
 */
const BAR = "#FFFFFF";
type MonogramProps = {
  className?: string;
  tone?: "brand" | "ink";
};

export function Monogram({ className, tone = "brand" }: MonogramProps) {
  return (
    <svg viewBox="0 0 689 689" fill="none" role="img" aria-label="Reportlee" className={className}>
      <path
        d="M496.08 0H192.92C86.3732 0 0 86.3732 0 192.92V496.08C0 602.627 86.3732 689 192.92 689H496.08C602.627 689 689 602.627 689 496.08V192.92C689 86.3732 602.627 0 496.08 0Z"
        fill={tone === "ink" ? "var(--ink, #0F0F0F)" : "var(--brand, #FF6B2C)"}
      />
      <path d="M91 304.678L220.958 271.406L275.711 485.266L164.5 464.904L91 304.678Z" fill={BAR} />
      <path d="M259 182.893L392.706 172L416.001 485.91L310.781 465.877L259 182.893Z" fill={BAR} />
      <path
        d="M464.5 226.395L597.678 242.508L569.177 486.672L471.031 467.971L464.5 226.395Z"
        fill={BAR}
      />
    </svg>
  );
}
