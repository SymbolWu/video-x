export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p className="error" role="alert">
      {typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "请求失败，请重试"}
    </p>
  ) : null;
}
