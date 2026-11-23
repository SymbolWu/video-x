import createClient from "openapi-fetch";
import type { paths, components } from "./generated.js";
export type Schemas = components["schemas"];
export const api = createClient<paths>({
  baseUrl: "",
  credentials: "same-origin",
});
export async function unwrap<T>(
  result: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const r = await result;
  if (r.error || !r.response.ok) {
    const err = r.error as { message?: string } | undefined;
    throw new Error(err?.message ?? "请求失败，请稍后重试");
  }
  if (r.data === undefined) throw new Error("服务没有返回资料");
  return r.data;
}
