export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatResolution(width?: number, height?: number) {
  if (!width || !height) {
    return "NO PAGE";
  }

  return `${width} x ${height}`;
}
