"use client";

import { SAMPLE_NOTIFICATIONS } from "@/data/notifications";
import { badgeLabel, unreadCount } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/**
 * The bell from the supplied artwork, with its count as a red badge.
 *
 * The drawing is two filled shapes rather than a stroke, so it keeps its two tones:
 * the body at 60% and the clapper solid, both in `currentColor` so it follows the
 * theme instead of carrying a hard-coded black.
 *
 * The popover arrives with UI-11, so the control is disabled and says why. The count
 * is the real unread number from the sample list, not a decorative dot.
 */
export function NotificationBell({ className }: { className?: string }) {
  const unread = unreadCount(SAMPLE_NOTIFICATIONS);
  const label = badgeLabel(unread);

  return (
    <button
      type="button"
      disabled
      title="Notifications arrive with UI-11"
      aria-label={
        unread > 0
          ? `Notifications, ${unread} unread`
          : "Notifications, nothing unread"
      }
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink/75",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-5"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.802 19.8317c.6164-.0618 1.0329.5925.7417 1.1222a3.7522 3.7522 0 0 1-1.0948.9669 3.9 3.9 0 0 1-3.3569 0 3.752 3.752 0 0 1-1.0948-.9669c-.2912-.5297.1253-1.184.7417-1.1222.1923.0193 1.6969.1664 2.6778.1664.9809 0 2.4855-.1471 2.6778-.1664Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.52901 2.08755c2.26419-1.0831 4.91749-1.119948 7.21329-.100178l.2052.09114c2.4057 1.06856 3.9459 3.38369 3.9459 5.93109v1.26337c0 1.0155.2302 2.0188.6747 2.94l.2654.5502c1.219 2.5268-.3685 5.4803-3.2179 5.9866l-.1606.0285c-3.525.6263-7.1396.6263-10.66456 0-2.8877-.513-4.41542-3.584-3.01805-6.0668l.22704-.4033a6.6906 6.6906 0 0 0 .85392-3.24224V7.79233c0-2.41793 1.42369-4.62755 3.67566-5.70478Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>

      {label ? (
        <span
          aria-hidden="true"
          className={cn(
            // Punched out of the bell with a ring in the surface colour, so the badge
            // reads as a badge and not as part of the drawing.
            // Neutral, not red: unread is not an error. Ink on the surface colour reads
            // in both themes without borrowing the destructive tone.
            "absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-surface leading-4 ring-2 ring-surface",
            "tabular-nums",
          )}
        >
          {label}
        </span>
      ) : null}
    </button>
  );
}
