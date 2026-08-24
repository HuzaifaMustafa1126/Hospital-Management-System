export const printDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";

export const printTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(value))
    : "—";

export const printDateTime = (value) =>
  value ? `${printDate(value)} · ${printTime(value)}` : "—";

export const readableStatus = (value) => value?.replaceAll("_", " ") || "—";
