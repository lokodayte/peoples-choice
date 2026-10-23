// Date formatting shared by server and browser code. Always shown in conference (New York) time.
const TZ = "America/New_York";

/** e.g. "Friday, Oct 30 at 4:00 PM" */
export function formatClosing(date: Date | string): string {
  const d = new Date(date);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} at ${time}`;
}

/** Value for an <input type="datetime-local">, in New York time: "2026-10-30T16:00" */
export function toNewYorkInputValue(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
