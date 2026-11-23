import { config as dotenv } from "dotenv";
import { fileURLToPath } from "node:url";
dotenv({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
  quiet: true,
});
export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  artRoot:
    process.env.VIDEO_X_ART_ROOT ??
    fileURLToPath(new URL("../../../../.runtime/artwork/", import.meta.url)),
  mediaRoot:
    process.env.VIDEO_X_MEDIA_ROOT ??
    fileURLToPath(new URL("../../../../.runtime/media-inbox", import.meta.url)),
  port: Number(process.env.PORT ?? 5120),
  host: process.env.HOST ?? "127.0.0.1",
  secureCookie: process.env.COOKIE_SECURE === "true",
  allowedOrigins: new Set(
    (
      process.env.ALLOWED_ORIGINS ??
      "http://127.0.0.1:5180,http://localhost:5180,http://127.0.0.1:5181,http://localhost:5181"
    ).split(","),
  ),
};
export const migrationsPath = fileURLToPath(
  new URL("../../migrations", import.meta.url),
);
