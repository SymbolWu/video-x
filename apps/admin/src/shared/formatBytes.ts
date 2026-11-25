export function formatBytes(n: number) {
  if (n === 0) return "0 B";
  const k = Math.min(4, Math.floor(Math.log10(Math.max(1, n)) / 3));
  return (
    new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(
      n / 1000 ** k,
    ) +
    " " +
    ["B", "KB", "MB", "GB", "TB"][k]
  );
}
