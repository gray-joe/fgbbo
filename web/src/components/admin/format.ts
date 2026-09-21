/** ISO timestamp -> the value a `datetime-local` input expects, in the browser's zone. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

/** `datetime-local` value (browser zone) -> ISO timestamp. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
