// Convert JSON Schema unions to valid OpenAPI 3.0 nullable/enums before SDK generation.
export function openApi30(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(openApi30);
  if (value && typeof value === "object") {
    const o = Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, openApi30(v)]),
    ) as Record<string, unknown>;
    if (Array.isArray(o.anyOf)) {
      const branches = o.anyOf as Record<string, unknown>[];
      if (branches.length === 2 && branches.some((x) => x.type === "null")) {
        const nonNull = branches.find((x) => x.type !== "null")!;
        delete o.anyOf;
        return { ...o, ...nonNull, nullable: true };
      }
      if (branches.every((x) => x.type === "string" && Array.isArray(x.enum))) {
        delete o.anyOf;
        return {
          ...o,
          type: "string",
          enum: branches.flatMap((x) => x.enum as unknown[]),
        };
      }
    }
    return o;
  }
  return value;
}
