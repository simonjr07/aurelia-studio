"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BookingStatus } from "@/generated/prisma/enums";
import {
  BOOKING_STATUS_TRANSITIONS,
  bookingStatusLabels,
} from "@/server/appointments/status-transitions";

const actionLabels: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: "Confirm appointment",
  COMPLETED: "Complete appointment",
  CANCELLED: "Cancel appointment",
  NO_SHOW: "Mark as no-show",
};

export function StatusActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null);
  const [message, setMessage] = useState("");
  const targets = BOOKING_STATUS_TRANSITIONS[status];

  if (targets.length === 0) {
    return <p className="text-sm text-ink/55">This appointment is in a terminal state.</p>;
  }

  async function changeStatus(targetStatus: BookingStatus) {
    if (pendingStatus) return;
    setPendingStatus(targetStatus);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/appointments/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedStatus: status, status: targetStatus, note }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error || "The appointment could not be updated.");
        return;
      }
      setMessage(`Status changed to ${bookingStatusLabels[targetStatus]}.`);
      setNote("");
      router.refresh();
    } catch {
      setMessage("The appointment could not be updated.");
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <div>
      <label className="block font-semibold" htmlFor="status-note">
        Internal status note <span className="font-normal text-ink/45">(optional)</span>
      </label>
      <textarea
        className="admin-field mt-2 min-h-24 p-4"
        id="status-note"
        maxLength={1000}
        onChange={(event) => setNote(event.target.value)}
        value={note}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        {targets.map((target) => (
          <button
            className={target === "CANCELLED" ? "admin-button-danger" : "admin-button-primary"}
            disabled={Boolean(pendingStatus)}
            key={target}
            onClick={() => changeStatus(target)}
            type="button"
          >
            {pendingStatus === target ? "Updating…" : actionLabels[target]}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-4 text-sm font-semibold text-clay">
        {message}
      </p>
    </div>
  );
}

