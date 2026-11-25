import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
import { Brand } from "../brand/Brand";
export function AuthGate({
  children,
}: {
  children: (
    profile: Schemas["Profile"],
    logout: () => Promise<void>,
  ) => ReactNode;
}) {
  const [profile, setProfile] = useState<Schemas["Profile"] | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .GET("/api/auth/me")
      .then((r) => {
        if (!active) return;
        if (r.data) setProfile(r.data);
        else if (r.response.status !== 401) setError("暂时无法连接服务器");
      })
      .catch(() => {
        if (active) setError("暂时无法连接服务器");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    setError("");
    setSaving(true);
    try {
      let installationId = localStorage.getItem("video-x-installation");
      if (!installationId) {
        installationId = crypto.randomUUID();
        localStorage.setItem("video-x-installation", installationId);
      }
      const r = await unwrap(
        api.POST("/api/auth/login", {
          body: {
            username: String(form.get("username")),
            password: String(form.get("password")),
            clientKind: "web",
            deviceName: "Web 浏览器",
            installationId,
          },
        }),
      );
      setProfile(r.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <main className="login-shell">
        <p>正在连接片库…</p>
      </main>
    );
  if (profile)
    return children(profile, async () => {
      await unwrap(api.POST("/api/auth/logout"));
      setProfile(null);
    });
  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <Brand />
        <div>
          <h1>回到你的片库</h1>
          <p>登录后继续浏览和整理自己的影视资料。</p>
        </div>
        <label>
          账号
          <input
            name="username"
            autoComplete="username"
            required
            maxLength={80}
          />
        </label>
        <label>
          密码
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={saving}>
          {saving ? "正在登录…" : "登录"}
        </button>
      </form>
    </main>
  );
}
