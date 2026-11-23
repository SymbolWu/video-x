import * as SelectPrimitive from "@radix-ui/react-select";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { api, unwrap, type Schemas } from "@video-x/sdk-ts";
export function Brand() {
  return (
    <a className="brand" href="#media">
      <b>v×</b>video—x
    </a>
  );
}
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
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
  }, []);
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-backdrop">
          <DialogPrimitive.Content
            className="dialog"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnFocus.current?.focus();
            }}
          >
            <header>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button type="button" aria-label="关闭">
                  ×
                </button>
              </DialogPrimitive.Close>
            </header>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export type SelectOption = { value: string; label: string; disabled?: boolean };
const EMPTY_SELECT_VALUE = "__video_x_empty__";
/** Shared themed select. Radix owns keyboard navigation, focus and form association. */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  name,
  required,
  disabled,
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const encode = (value: string) => value || EMPTY_SELECT_VALUE;
  return (
    <SelectPrimitive.Root
      name={name}
      required={required}
      disabled={disabled}
      value={value === undefined ? undefined : encode(value)}
      defaultValue={
        defaultValue === undefined ? undefined : encode(defaultValue)
      }
      onValueChange={(next) =>
        onValueChange?.(next === EMPTY_SELECT_VALUE ? "" : next)
      }
    >
      <SelectPrimitive.Trigger className="select-trigger" aria-label={label}>
        <SelectPrimitive.Value placeholder="请选择" />
        <SelectPrimitive.Icon className="select-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="select-content"
          position="popper"
          sideOffset={7}
          collisionPadding={12}
        >
          <SelectPrimitive.ScrollUpButton className="select-scroll">
            ⌃
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="select-item"
                key={option.value}
                value={encode(option.value)}
                disabled={option.disabled}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="select-check">
                  ✓
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="select-scroll">
            ⌄
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
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
export function Pager({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      <span>
        第 {page} 页 · 共 {total} 条
      </span>
      <button
        disabled={page * pageSize >= total}
        onClick={() => onChange(page + 1)}
      >
        下一页
      </button>
    </div>
  );
}
