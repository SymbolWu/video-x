import { useState } from "react";
export async function uploadArtwork(file: File): Promise<string> {
  if (file.size > 6 * 1024 * 1024) throw Error("图片最多 6 MiB");
  const r = await fetch("/api/art", {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
    credentials: "same-origin",
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.message || "上传失败");
  return data.id;
}
export function Artwork({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (id: string | null) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="art-field">
      <span>{label}</span>
      {value && <img src={"/api/art/" + value} alt={label} />}
      <label className="art-upload">
        {busy ? "读取中…" : "选择图片"}
        <input
          type="file"
          accept="image/jpeg,image/png"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              onChange(await uploadArtwork(file));
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {value && (
        <button type="button" onClick={() => onChange(null)}>
          移除
        </button>
      )}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
