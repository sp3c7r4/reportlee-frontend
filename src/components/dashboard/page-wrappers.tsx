import { cn } from "@/lib/utils";

/**
 * A data page fills the window from the left, because a table pinned to a 1440 column
 * wastes a wide screen. A reading page stays a column: a paragraph that runs the width
 * of a monitor is unreadable.
 */
export function DataPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full px-4 py-6 sm:px-6", className)}>{children}</div>
  );
}

export function ReadingPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
