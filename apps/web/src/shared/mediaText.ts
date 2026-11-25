export function filmMetadata(
  ...fields: (string | number | null | undefined)[]
) {
  return fields
    .filter((value) => value != null && value !== "" && value !== "未分类")
    .join(" · ");
}

export function playTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

export function runtime(ms?: number | null) {
  if (ms == null || ms <= 0) return "";
  return ms < 60000
    ? Math.floor(ms / 1000) + " 秒"
    : Math.round(ms / 60000) + " 分钟";
}
