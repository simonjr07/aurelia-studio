export function formatAppointmentDate(iso: string | Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatAppointmentTime(iso: string | Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatAppointmentDateTime(iso: string | Date, timezone: string) {
  return `${formatAppointmentDate(iso, timezone)} at ${formatAppointmentTime(iso, timezone)}`;
}

