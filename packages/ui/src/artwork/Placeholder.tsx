export function Placeholder({ title }: { title: string }) {
  return (
    <div
      className="hero-placeholder"
      role="img"
      aria-label={title + " · 暂无封面"}
    >
      <small>VIDEO—X / LIBRARY</small>
      <strong>{title}</strong>
    </div>
  );
}
