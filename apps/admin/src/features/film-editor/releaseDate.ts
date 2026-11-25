export const earliestReleaseYear = 1800;
export const latestReleaseYear = 2500;

export function releaseDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function validReleaseDate(value?: string | null) {
  return (
    !!value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= "1800-01-01" &&
    value <= "2500-12-31" &&
    Number.isFinite(Date.parse(value)) &&
    releaseDateValue(new Date(value)) === value
  );
}

export function normalizeReleaseDate(value: string) {
  const parts = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(value.trim());
  if (!parts) return value;
  const normalized = [
    parts[1],
    parts[3]!.padStart(2, "0"),
    parts[4]!.padStart(2, "0"),
  ].join("-");
  return validReleaseDate(normalized) ? normalized : value;
}
