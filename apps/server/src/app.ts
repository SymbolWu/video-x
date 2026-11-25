import Fastify from "fastify";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import type { Static } from "@sinclair/typebox";
import * as C from "@video-x/contracts";
import { Database, AppError, sql } from "./platform/db.js";
import { config } from "./platform/config.js";
import { login, authenticate } from "./modules/identity/service.js";
import { Dictionary } from "./modules/catalog/dictionary.js";
import { Catalog } from "./modules/catalog/service.js";
import { Imports } from "./modules/imports/service.js";
import { providers } from "./modules/sources/providers.js";
import { acceptLookup, enqueueLookup } from "./modules/sources/service.js";
import { startScan, manualFile } from "./modules/imports/scan.js";
import { selectInbox, browse, setTargets } from "./modules/imports/layout.js";
import { readStatus } from "./modules/operations/status.js";
import { registerArt } from "./modules/catalog/art.js";
import { registerPlayback } from "./modules/playback/routes.js";
import { Personal } from "./modules/personal/service.js";
declare module "fastify" {
  interface FastifyRequest {
    viewer: C.ProfileDto & { sessionId: string; deviceId: string };
  }
}
export async function createApp(
  db: Database,
  logger = false,
  mediaRoot = config.mediaRoot,
) {
  const app = Fastify({
    logger: logger
      ? {
          redact: [
            "req.headers.authorization",
            "req.headers.cookie",
            'res.headers["set-cookie"]',
            "password",
            "token",
          ],
        }
      : false,
    bodyLimit: 128 * 1024,
    ajv: { customOptions: { removeAdditional: false } },
  });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  await app.register(swagger, {
    refResolver: { buildLocalReference: (json) => String(json.$id) },
    openapi: {
      info: { title: "video-x API", version: "0.1.0" },
      servers: [{ url: "http://127.0.0.1:5120" }],
      components: {
        securitySchemes: {
          sessionCookie: { type: "apiKey", in: "cookie", name: "vx_session" },
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
    },
  });
  C.schemas.forEach((s) => app.addSchema(s));
  const bodyValidator = new Ajv({
    coerceTypes: false,
    useDefaults: true,
    allErrors: false,
  });
  addFormats(bodyValidator);
  C.schemas.forEach((s) => bodyValidator.addSchema(s));
  const queryValidator = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    allErrors: false,
  });
  addFormats(queryValidator);
  C.schemas.forEach((s) => queryValidator.addSchema(s));
  app.setValidatorCompiler(({ schema, httpPart }) =>
    (httpPart === "body" ? bodyValidator : queryValidator).compile(
      schema as object,
    ),
  );
  const errors = {
    400: C.T.Ref(C.ErrorResponse),
    401: C.T.Ref(C.ErrorResponse),
    403: C.T.Ref(C.ErrorResponse),
    404: C.T.Ref(C.ErrorResponse),
    409: C.T.Ref(C.ErrorResponse),
    413: C.T.Ref(C.ErrorResponse),
    415: C.T.Ref(C.ErrorResponse),
    429: C.T.Ref(C.ErrorResponse),
    500: C.T.Ref(C.ErrorResponse),
  };
  const response = (s: Parameters<typeof C.T.Ref>[0]) => ({
    200: C.T.Ref(s),
    ...errors,
  });
  const catalog = new Catalog(db),
    personal = new Personal(db);
  app.decorateRequest("viewer");
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (
      request.url.startsWith("/api/health/") ||
      request.url.split("?")[0] === "/api/auth/login"
    )
      return;
    const bearer = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    const token = bearer ?? request.cookies.vx_session;
    if (!token) throw new AppError(401, "UNAUTHENTICATED", "请先登录");
    const viewer = await authenticate(db, token);
    if (!viewer)
      throw new AppError(401, "UNAUTHENTICATED", "登录已失效，请重新登录");
    request.viewer = viewer;
    if (
      !bearer &&
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      !config.allowedOrigins.has(request.headers.origin ?? "")
    )
      throw new AppError(403, "INVALID_ORIGIN", "请求来源不被允许");
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError)
      return reply
        .code(error.statusCode)
        .send({ code: error.code, message: error.message });
    const err = error as {
      code?: string;
      cause?: { code?: string };
      validation?: unknown;
      statusCode?: number;
    };
    const code = err.code ?? err.cause?.code;
    if (code === "VX409")
      return reply.code(409).send({
        code: "MOVE_BUSY",
        message: "草稿已提交移动发布，请等待或重试任务。",
      });
    if (err.validation)
      return reply
        .code(400)
        .send({ code: "INVALID_INPUT", message: "输入参数不符合接口要求" });
    if (["23505", "23503", "23514", "22001"].includes(code ?? ""))
      return reply.code(code === "23505" ? 409 : 400).send({
        code: "DATA_CONSTRAINT",
        message:
          code === "23505"
            ? "资料已存在或操作重复"
            : "资料不符合约束，请检查关联和字段",
      });
    if (err.statusCode === 429)
      return reply
        .code(429)
        .send({ code: "RATE_LIMITED", message: "请求过于频繁，请稍后再试" });
    // Parser failures are client errors, not server crashes. Keep details private.
    if (
      code?.startsWith("FST_ERR_CTP_") &&
      err.statusCode &&
      err.statusCode >= 400 &&
      err.statusCode < 500
    )
      return reply.code(err.statusCode).send({
        code: "INVALID_REQUEST_BODY",
        message: "请求内容格式或大小不符合接口要求",
      });
    request.log.error({ err: error }, "request failed");
    return reply
      .code(500)
      .send({ code: "INTERNAL_ERROR", message: "服务暂时无法完成请求" });
  });
  app.get(
    "/api/health/live",
    {
      schema: {
        operationId: "healthLive",
        tags: ["Health"],
        response: response(C.Health),
      },
    },
    async () => ({ status: "ok" }),
  );
  app.get(
    "/api/health/ready",
    {
      schema: {
        operationId: "healthReady",
        tags: ["Health"],
        response: { ...response(C.Health), 503: C.T.Ref(C.Health) },
      },
    },
    async (_req, reply) => {
      try {
        await db.query(sql`SELECT id FROM video_x.media_items LIMIT 1`);
        await db.query(sql`SELECT version FROM pgboss.version LIMIT 1`);
        return { status: "ok" };
      } catch {
        return reply.code(503).send({ status: "unavailable" });
      }
    },
  );
  app.post<{ Body: Static<typeof C.Login> }>(
    "/api/auth/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        operationId: "login",
        tags: ["Identity"],
        body: C.T.Ref(C.Login),
        response: response(C.LoginResult),
      },
    },
    async (req, reply) => {
      if (req.headers.origin && !config.allowedOrigins.has(req.headers.origin))
        throw new AppError(403, "INVALID_ORIGIN", "请求来源不被允许");
      const result = await login(db, req.body);
      if (req.body.clientKind === "web")
        reply.setCookie("vx_session", result.token, {
          httpOnly: true,
          sameSite: "strict",
          secure: config.secureCookie,
          path: "/api",
          maxAge: 7 * 86400,
        });
      return {
        ...result,
        token: req.body.clientKind === "android" ? result.token : null,
      };
    },
  );
  const authSchema: { security: Record<string, string[]>[] } = {
    security: [{ sessionCookie: [] }, { bearerAuth: [] }],
  };
  app.get(
    "/api/auth/me",
    {
      schema: {
        ...authSchema,
        operationId: "getProfile",
        tags: ["Identity"],
        response: response(C.Profile),
      },
    },
    async (req) => ({
      id: req.viewer.id,
      username: req.viewer.username,
      displayName: req.viewer.displayName,
    }),
  );
  app.post(
    "/api/auth/logout",
    {
      schema: {
        ...authSchema,
        operationId: "logout",
        tags: ["Identity"],
        response: response(C.Health),
      },
    },
    async (req, reply) => {
      await db.query(
        sql`UPDATE video_x.auth_sessions SET revoked_at=now() WHERE id=${req.viewer.sessionId}`,
      );
      reply.clearCookie("vx_session", { path: "/api" });
      return { status: "ok" };
    },
  );
  app.get(
    "/api/categories",
    {
      schema: {
        ...authSchema,
        operationId: "listCategories",
        tags: ["Catalog"],
        response: { 200: C.T.Array(C.T.Ref(C.Category)), ...errors },
      },
    },
    () => catalog.categories(),
  );
  app.patch<{
    Params: { id: string };
    Body: Static<typeof C.CategoryVisibility>;
  }>(
    "/api/categories/:id/visibility",
    {
      schema: {
        ...authSchema,
        operationId: "setCategoryVisibility",
        tags: ["Catalog"],
        params: C.IdParams,
        body: C.T.Ref(C.CategoryVisibility),
        response: response(C.Category),
      },
    },
    (req) =>
      catalog.categoryVisibility(
        req.params.id,
        req.body.expectedRevision,
        req.body.isVisible,
      ),
  );
  app.patch<{ Params: { id: string }; Body: Static<typeof C.CollectionPatch> }>(
    "/api/collections/:id",
    {
      schema: {
        ...authSchema,
        operationId: "editCollection",
        tags: ["Personal"],
        params: C.IdParams,
        body: C.T.Ref(C.CollectionPatch),
        response: response(C.Collection),
      },
    },
    (req) => personal.renameCollection(req.viewer.id, req.params.id, req.body),
  );
  app.post<{ Body: Static<typeof C.ManualFile> }>(
    "/api/imports/manual",
    {
      schema: {
        ...authSchema,
        operationId: "manualFile",
        tags: ["Imports"],
        body: C.T.Ref(C.ManualFile),
        response: response(C.ScanResult),
      },
    },
    (req) =>
      manualFile(
        db,
        mediaRoot,
        req.viewer.id,
        req.body.relativePath,
        undefined,
        req.body.expectedInbox,
      ),
  );
  app.post<{ Body: Static<typeof C.CategoryCreate> }>(
    "/api/categories",
    {
      schema: {
        ...authSchema,
        operationId: "createCategory",
        tags: ["Catalog"],
        body: C.T.Ref(C.CategoryCreate),
        response: response(C.Category),
      },
    },
    (req) => catalog.createCategory(req.body.name),
  );
  app.get<{ Querystring: C.Query }>(
    "/api/media",
    {
      schema: {
        ...authSchema,
        operationId: "listMedia",
        tags: ["Catalog"],
        querystring: C.MediaListQuery,
        response: response(C.MediaPage),
      },
    },
    (req) => catalog.listMedia(req.viewer.id, req.query),
  );
  app.get<{ Querystring: C.ManagementMediaQuery }>(
    "/api/manage/media",
    {
      schema: {
        ...authSchema,
        operationId: "listManagementMedia",
        tags: ["Catalog"],
        querystring: C.ManagementMediaListQuery,
        response: response(C.ManagementMediaPage),
      },
    },
    (req) => catalog.listManagementMedia(req.viewer.id, req.query),
  );
  app.get<{ Params: { id: string } }>(
    "/api/media/:id",
    {
      schema: {
        ...authSchema,
        operationId: "getMedia",
        tags: ["Catalog"],
        params: C.IdParams,
        response: response(C.MediaDetail),
      },
    },
    (req) => catalog.detail(req.viewer.id, req.params.id),
  );
  app.patch<{ Params: { id: string }; Body: Static<typeof C.MediaPatch> }>(
    "/api/media/:id",
    {
      schema: {
        ...authSchema,
        operationId: "updateMedia",
        tags: ["Catalog"],
        params: C.IdParams,
        body: C.T.Ref(C.MediaPatch),
        response: response(C.MediaDetail),
      },
    },
    (req) => catalog.patchMedia(req.viewer.id, req.params.id, req.body),
  );
  app.patch<{ Params: { id: string }; Body: Static<typeof C.MediaStatePatch> }>(
    "/api/media/:id/state",
    {
      schema: {
        ...authSchema,
        operationId: "updateMediaState",
        tags: ["Personal"],
        params: C.IdParams,
        body: C.T.Ref(C.MediaStatePatch),
        response: response(C.MediaDetail),
      },
    },
    async (req) => {
      await personal.state(req.viewer.id, req.params.id, req.body);
      return catalog.detail(req.viewer.id, req.params.id);
    },
  );
  app.get<{ Querystring: C.Query }>(
    "/api/people",
    {
      schema: {
        ...authSchema,
        operationId: "listPeople",
        tags: ["Catalog"],
        querystring: C.RelatedListQuery,
        response: response(C.PersonPage),
      },
    },
    (req) => catalog.listPeople(req.viewer.id, req.query),
  );
  app.post<{ Body: Static<typeof C.PersonCreate> }>(
    "/api/people",
    {
      schema: {
        ...authSchema,
        operationId: "createPerson",
        tags: ["Catalog"],
        body: C.T.Ref(C.PersonCreate),
        response: response(C.Person),
      },
    },
    (req) => catalog.createPerson(req.viewer.id, req.body),
  );
  app.get<{ Params: { id: string } }>(
    "/api/people/:id",
    {
      schema: {
        ...authSchema,
        operationId: "getPersonProfile",
        tags: ["Catalog"],
        params: C.IdParams,
        response: response(C.PersonProfile),
      },
    },
    async (req) => ({
      record: await catalog.person(req.viewer.id, req.params.id),
      ...(await catalog.filmographyFacts("person", req.params.id)),
    }),
  );
  app.patch<{ Params: { id: string }; Body: Static<typeof C.PersonPatch> }>(
    "/api/people/:id",
    {
      schema: {
        ...authSchema,
        operationId: "updatePerson",
        tags: ["Catalog"],
        params: C.IdParams,
        body: C.T.Ref(C.PersonPatch),
        response: response(C.Person),
      },
    },
    (req) => catalog.patchPerson(req.viewer.id, req.params.id, req.body),
  );
  app.get<{ Querystring: C.Query }>(
    "/api/franchises",
    {
      schema: {
        ...authSchema,
        operationId: "listFranchises",
        tags: ["Catalog"],
        querystring: C.RelatedListQuery,
        response: response(C.FranchisePage),
      },
    },
    (req) => catalog.listFranchises(req.query),
  );
  app.post<{ Body: Static<typeof C.FranchiseCreate> }>(
    "/api/franchises",
    {
      schema: {
        ...authSchema,
        operationId: "createFranchise",
        tags: ["Catalog"],
        body: C.T.Ref(C.FranchiseCreate),
        response: response(C.Franchise),
      },
    },
    (req) => catalog.createFranchise(req.body),
  );
  app.get<{ Params: { id: string } }>(
    "/api/franchises/:id",
    {
      schema: {
        ...authSchema,
        operationId: "getFranchiseProfile",
        tags: ["Catalog"],
        params: C.IdParams,
        response: response(C.FranchiseProfile),
      },
    },
    async (req) => ({
      record: await catalog.franchise(req.params.id),
      ...(await catalog.filmographyFacts("franchise", req.params.id)),
    }),
  );
  app.patch<{ Params: { id: string }; Body: Static<typeof C.FranchisePatch> }>(
    "/api/franchises/:id",
    {
      schema: {
        ...authSchema,
        operationId: "updateFranchise",
        tags: ["Catalog"],
        params: C.IdParams,
        body: C.T.Ref(C.FranchisePatch),
        response: response(C.Franchise),
      },
    },
    (req) => catalog.patchFranchise(req.params.id, req.body),
  );
  app.get(
    "/api/collections",
    {
      schema: {
        ...authSchema,
        operationId: "listCollections",
        tags: ["Personal"],
        response: { 200: C.T.Array(C.T.Ref(C.Collection)), ...errors },
      },
    },
    (req) => personal.collections(req.viewer.id),
  );
  app.post<{ Body: Static<typeof C.CollectionCreate> }>(
    "/api/collections",
    {
      schema: {
        ...authSchema,
        operationId: "createCollection",
        tags: ["Personal"],
        body: C.T.Ref(C.CollectionCreate),
        response: response(C.Collection),
      },
    },
    (req) => personal.createCollection(req.viewer.id, req.body),
  );
  app.put<{ Params: { id: string }; Body: Static<typeof C.CollectionItems> }>(
    "/api/collections/:id/items",
    {
      schema: {
        ...authSchema,
        operationId: "setCollectionItems",
        tags: ["Personal"],
        params: C.IdParams,
        body: C.T.Ref(C.CollectionItems),
        response: response(C.Collection),
      },
    },
    (req) =>
      personal.setCollectionItems(req.viewer.id, req.params.id, req.body),
  );
  const status = readStatus(db, mediaRoot);
  app.get(
    "/api/system/status",
    {
      schema: {
        operationId: "readRuntimeStatus",
        tags: ["Operations"],
        response: response(C.RuntimeStatus),
      },
    },
    async () => status(),
  );
  const imports = new Imports(db, mediaRoot);
  const operation = (operationId: string) => ({
    ...authSchema,
    operationId,
    tags: ["Imports"],
  });
  app.get<{ Querystring: Static<typeof C.BrowseDirectory> }>(
    "/api/storage/browse",
    {
      schema: {
        ...operation("browseStorageDirectory"),
        querystring: C.BrowseDirectory,
        response: response(C.DirectoryView),
      },
    },
    (r) => browse(db, mediaRoot, r.query),
  );
  app.put<{ Body: Static<typeof C.DownloadDirectory> }>(
    "/api/storage/inbox",
    {
      schema: {
        ...operation("setDownloadDirectory"),
        body: C.T.Ref(C.DownloadDirectory),
        response: response(C.DirectoryView),
      },
    },
    (r) => selectInbox(db, mediaRoot, r.body.dir, r.body.expected),
  );
  app.post<{ Body: Static<typeof C.TargetPlan> }>(
    "/api/imports/targets",
    {
      schema: {
        ...operation("planStorageTargets"),
        body: C.T.Ref(C.TargetPlan),
        response: response(C.PlanCount),
      },
    },
    (r) => setTargets(db, mediaRoot, r.body),
  );
  app.get(
    "/api/sources",
    {
      schema: {
        ...operation("listSourceProviders"),
        response: { 200: C.T.Array(C.T.Ref(C.SourceProvider)), ...errors },
      },
    },
    async () =>
      [...providers.values()].map(({ code, name }) => ({ code, name })),
  );
  app.post<{ Body: Static<typeof C.NewDraft> }>(
    "/api/imports/drafts",
    {
      schema: {
        ...operation("createFilelessDraft"),
        body: C.T.Ref(C.NewDraft),
        response: response(C.ImportRow),
      },
    },
    (r) => imports.createDraft(r.viewer.id, r.body),
  );
  app.post<{ Params: { id: string }; Body: Static<typeof C.BindFile> }>(
    "/api/imports/:id/file",
    {
      schema: {
        ...operation("bindDraftFile"),
        params: C.IdParams,
        body: C.T.Ref(C.BindFile),
        response: response(C.ImportRow),
      },
    },
    async (r) => {
      await manualFile(
        db,
        mediaRoot,
        r.viewer.id,
        r.body.relativePath,
        {
          id: r.params.id,
          revision: r.body.expectedRevision,
        },
        r.body.expectedInbox,
      );
      return imports.get(r.params.id);
    },
  );
  app.post<{ Params: { id: string }; Body: Static<typeof C.RunLookup> }>(
    "/api/imports/:id/lookup",
    {
      schema: {
        ...operation("lookupDraftMetadata"),
        params: C.IdParams,
        body: C.T.Ref(C.RunLookup),
        response: response(C.ScanResult),
      },
    },
    (r) => enqueueLookup(db, r.params.id, r.body),
  );
  app.post<{ Params: { id: string }; Body: Static<typeof C.ApplyLookup> }>(
    "/api/imports/:id/lookup/apply",
    {
      schema: {
        ...operation("applyDraftCandidate"),
        params: C.IdParams,
        body: C.T.Ref(C.ApplyLookup),
        response: response(C.ImportRow),
      },
    },
    async (r) => {
      await acceptLookup(db, r.params.id, r.body);
      return imports.get(r.params.id);
    },
  );
  app.post<{ Body: Static<typeof C.GroupInput> }>(
    "/api/imports/groups",
    {
      schema: {
        ...operation("groupDrafts"),
        body: C.T.Ref(C.GroupInput),
        response: response(C.ScanResult),
      },
    },
    (r) => imports.group(r.body),
  );
  app.put<{ Params: { id: string }; Body: Static<typeof C.GroupInput> }>(
    "/api/imports/groups/:id",
    {
      schema: {
        ...operation("updateDraftGroup"),
        params: C.IdParams,
        body: C.T.Ref(C.GroupInput),
        response: response(C.ScanResult),
      },
    },
    (r) => imports.group(r.body, r.params.id),
  );
  app.delete<{ Params: { id: string } }>(
    "/api/imports/groups/:id",
    {
      schema: {
        ...operation("ungroupDrafts"),
        params: C.IdParams,
        response: response(C.ScanResult),
      },
    },
    (r) => imports.ungroup(r.params.id),
  );
  app.get<{ Querystring: Static<typeof C.ImportQuery> }>(
    "/api/imports",
    {
      schema: {
        ...operation("listImports"),
        querystring: C.ImportQuery,
        response: response(C.ImportQueue),
      },
    },
    (req) => imports.list(req.query),
  );
  app.post(
    "/api/imports/scan",
    {
      schema: {
        ...operation("scanLocalFiles"),
        response: response(C.ScanResult),
      },
    },
    (req) => startScan(db, mediaRoot, req.viewer.id),
  );
  app.get<{ Params: { id: string } }>(
    "/api/imports/:id",
    {
      schema: {
        ...operation("getImport"),
        params: C.IdParams,
        response: response(C.ImportRow),
      },
    },
    (req) => imports.get(req.params.id),
  );
  app.put<{ Params: { id: string }; Body: Static<typeof C.ImportEdit> }>(
    "/api/imports/:id",
    {
      schema: {
        ...operation("editImport"),
        params: C.IdParams,
        body: C.T.Ref(C.ImportEdit),
        response: response(C.ImportRow),
      },
    },
    (req) => imports.edit(req.params.id, req.body),
  );
  app.post<{ Params: { id: string }; Body: Static<typeof C.RevisionInput> }>(
    "/api/imports/:id/review",
    {
      schema: {
        ...operation("reviewImport"),
        params: C.IdParams,
        body: C.T.Ref(C.RevisionInput),
        response: response(C.ImportRow),
      },
    },
    (req) =>
      imports.decide(
        req.params.id,
        req.body.expectedRevision,
        req.viewer.id,
        false,
      ),
  );
  app.post<{ Params: { id: string }; Body: Static<typeof C.RevisionInput> }>(
    "/api/imports/:id/publish",
    {
      schema: {
        ...operation("publishImport"),
        params: C.IdParams,
        body: C.T.Ref(C.RevisionInput),
        response: response(C.ImportRow),
      },
    },
    (req) =>
      imports.decide(
        req.params.id,
        req.body.expectedRevision,
        req.viewer.id,
        true,
      ),
  );
  app.get(
    "/api/browse/facts",
    {
      schema: {
        ...authSchema,
        operationId: "getBrowseFacts",
        tags: ["Catalog"],
        response: response(C.BrowseFacts),
      },
    },
    (req) => catalog.facts(req.viewer.id),
  );
  app.post<{ Params: { id: string }; Body: Static<typeof C.PublishEdition> }>(
    "/api/imports/:id/publish-edition",
    {
      schema: {
        ...operation("publishImportAsEdition"),
        params: C.IdParams,
        body: C.T.Ref(C.PublishEdition),
        response: response(C.ImportRow),
      },
    },
    (r) =>
      imports.decide(
        r.params.id,
        r.body.expectedRevision,
        r.viewer.id,
        true,
        r.body,
      ),
  );
  registerArt(app, db);
  registerPlayback(app, db, mediaRoot, authSchema);
  app.get(
    "/api/catalog/archive",
    {
      schema: {
        ...authSchema,
        operationId: "listArchive",
        tags: ["Catalog"],
        response: { 200: C.T.Array(C.T.Ref(C.ArchiveEntry)), ...errors },
      },
    },
    (req) => catalog.archive(req.viewer.id),
  );
  const dictionary = new Dictionary(db);
  app.get<{ Querystring: Static<typeof C.DictionaryChoiceQuery> }>(
    "/api/dictionary/choices",
    {
      schema: {
        ...authSchema,
        operationId: "listDictionaryChoices",
        tags: ["Catalog"],
        querystring: C.DictionaryChoiceQuery,
        response: response(C.DictionaryChoicePage),
      },
    },
    (r) => dictionary.choices(r.query),
  );
  app.get(
    "/api/dictionary",
    {
      schema: {
        ...authSchema,
        operationId: "listDictionary",
        tags: ["Catalog"],
        response: { 200: C.T.Array(C.T.Ref(C.DictionaryEntry)), ...errors },
      },
    },
    () => dictionary.list(),
  );
  app.post<{ Body: Static<typeof C.DictionaryWrite> }>(
    "/api/dictionary",
    {
      schema: {
        ...authSchema,
        operationId: "createDictionaryEntry",
        tags: ["Catalog"],
        body: C.T.Ref(C.DictionaryWrite),
        response: response(C.ScanResult),
      },
    },
    (req) => dictionary.save(req.body),
  );
  app.patch<{ Params: { id: string }; Body: Static<typeof C.DictionaryEdit> }>(
    "/api/dictionary/:id",
    {
      schema: {
        ...authSchema,
        operationId: "editDictionaryEntry",
        tags: ["Catalog"],
        params: C.IdParams,
        body: C.T.Ref(C.DictionaryEdit),
        response: response(C.ScanResult),
      },
    },
    (req) =>
      dictionary.save(req.body, req.params.id, req.body.expectedRevision),
  );
  await app.ready();
  return app;
}
