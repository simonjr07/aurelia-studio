import type { BookingStatus } from "@/generated/prisma/enums";
import { bookingStatusLabels } from "@/server/appointments/status-transitions";

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className="admin-status" data-status={status}>
      {bookingStatusLabels[status]}
    </span>
  );
}

