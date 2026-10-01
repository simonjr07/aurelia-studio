import type { BookingStatus } from "@/generated/prisma/enums";
import { bookingStatusLabels } from "@/server/appointments/status-transitions";

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className="inline-flex rounded-full border border-ink/15 bg-cream px-3 py-1 text-xs font-bold uppercase tracking-[0.1em]">
      {bookingStatusLabels[status]}
    </span>
  );
}

