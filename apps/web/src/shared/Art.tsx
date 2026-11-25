import { useState } from "react";
import { Icon } from "./Icon";
const asset = (id?: string | null) => (id ? "/api/art/" + id : undefined);
export function Art({
  id,
  alt,
  className,
  fallback = "film",
}: {
  id?: string | null;
  alt: string;
  className?: string;
  fallback?: "film" | "user";
}) {
  const [failed, setFailed] = useState<string>();
  return id && failed !== id ? (
    <img
      className={className}
      src={asset(id)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(id)}
    />
  ) : (
    <span
      className={"vx-art-empty " + (className ?? "")}
      role={alt ? "img" : undefined}
      aria-hidden={alt ? undefined : true}
      aria-label={alt ? alt + " · 暂无图片" : undefined}
    >
      <Icon name={fallback} size={24} />
    </span>
  );
}
